#!/usr/bin/env node
/**
 * Export transaksi ke CSV untuk pembukuan bulanan.
 *
 * Reads `orders` + `order_items` straight from Supabase with the service-role
 * key (read-only usage) and writes a CSV that opens cleanly in Excel/Sheets.
 * The app itself is untouched; this is an ops tool.
 *
 * Usage:
 *   npm run export:orders -- --from 2026-10-01 --to 2026-10-31
 *   npm run export:orders -- --month 2026-09 --out september.csv
 *
 * Env: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 *      (read from the environment, or from .env.local).
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { ordersToCsv, withBom } from "./lib/csv.mjs";

const PAGE_SIZE = 1000;
const HELP = `Export transaksi Nyamnyambox ke CSV.

Pemakaian:
  node scripts/export-orders.mjs --from 2026-10-01 --to 2026-10-31 [--out file.csv]
  node scripts/export-orders.mjs --month 2026-10 [--out file.csv]

Opsi:
  --from YYYY-MM-DD   Tanggal awal (Asia/Jakarta, inklusif)
  --to YYYY-MM-DD     Tanggal akhir (Asia/Jakarta, inklusif)
  --month YYYY-MM     Shorthand untuk satu bulan penuh
  --out FILE          File tujuan (default: orders-<from>_<to>.csv)
  --env FILE          File env alternatif (default: .env.local)
  --help              Tampilkan bantuan ini
`;

function parseArgs(argv) {
  const args = { env: ".env.local" };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") args.help = true;
    else if (arg === "--from") args.from = argv[++i];
    else if (arg === "--to") args.to = argv[++i];
    else if (arg === "--month") args.month = argv[++i];
    else if (arg === "--out") args.out = argv[++i];
    else if (arg === "--env") args.env = argv[++i];
    else throw new Error(`Argumen tidak dikenal: ${arg}`);
  }
  return args;
}

function loadEnvFile(file) {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (!match) continue;
    const [, key, raw] = match;
    if (process.env[key] !== undefined) continue;
    process.env[key] = raw.replace(/^["']|["']$/g, "");
  }
}

/** Today's date in Asia/Jakarta as YYYY-MM-DD. */
function jakartaDate(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function resolveRange(args) {
  if (args.month) {
    if (!/^\d{4}-\d{2}$/.test(args.month)) {
      throw new Error("--month harus berformat YYYY-MM");
    }
    const [year, month] = args.month.split("-").map(Number);
    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
    return {
      from: `${args.month}-01`,
      to: `${args.month}-${String(lastDay).padStart(2, "0")}`,
    };
  }

  const today = jakartaDate();
  const from = args.from ?? `${today.slice(0, 7)}-01`;
  const to = args.to ?? today;

  for (const value of [from, to]) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      throw new Error(`Tanggal tidak valid: ${value} (pakai YYYY-MM-DD)`);
    }
  }
  if (from > to) throw new Error(`--from (${from}) harus sebelum --to (${to})`);
  return { from, to };
}

async function fetchOrders({ url, key, from, to }) {
  const orders = [];

  for (let offset = 0; ; offset += PAGE_SIZE) {
    const query = new URLSearchParams();
    query.set(
      "select",
      [
        "receipt_number",
        "created_at",
        "channel",
        "payment_method",
        "payment_status",
        "total_amount",
        "is_edited",
        "cashier:profiles(name)",
        "order_items(quantity,price_at_transaction,notes,product:products(name))",
      ].join(","),
    );
    // Asia/Jakarta is UTC+7 all year, so a fixed offset is exact.
    query.append("created_at", `gte.${from}T00:00:00+07:00`);
    query.append("created_at", `lt.${addDay(to)}T00:00:00+07:00`);
    query.set("order", "created_at.asc");
    query.set("limit", String(PAGE_SIZE));
    query.set("offset", String(offset));

    const response = await fetch(`${url}/rest/v1/orders?${query.toString()}`, {
      headers: {
        apikey: key,
        authorization: `Bearer ${key}`,
        accept: "application/json",
      },
    });

    if (!response.ok) {
      const detail = (await response.text()).slice(0, 300);
      throw new Error(`Supabase menolak permintaan (HTTP ${response.status}): ${detail}`);
    }

    const page = await response.json();
    orders.push(...page);
    if (page.length < PAGE_SIZE) break;
  }

  return orders;
}

function addDay(dateString) {
  const date = new Date(`${dateString}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

function summarize(orders) {
  const total = orders.reduce((sum, order) => sum + Number(order.total_amount ?? 0), 0);
  const byMethod = new Map();
  for (const order of orders) {
    byMethod.set(order.payment_method, (byMethod.get(order.payment_method) ?? 0) + 1);
  }
  return { total, byMethod };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write(HELP);
    return;
  }

  loadEnvFile(args.env);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY wajib diisi " +
        `(environment atau ${args.env}).`,
    );
  }

  const { from, to } = resolveRange(args);
  const out = args.out ?? `orders-${from}_${to}.csv`;

  process.stderr.write(`Mengambil transaksi ${from} → ${to} (Asia/Jakarta)…\n`);
  const orders = await fetchOrders({ url, key, from, to });

  writeFileSync(resolve(process.cwd(), out), withBom(ordersToCsv(orders)), "utf8");

  const { total, byMethod } = summarize(orders);
  process.stderr.write(
    [
      `${orders.length} transaksi, total Rp${total.toLocaleString("id-ID")}`,
      [...byMethod].map(([method, count]) => `${method}: ${count}`).join(" · "),
      `Ditulis ke ${out}`,
      "",
    ].join("\n"),
  );
}

main().catch((error) => {
  process.stderr.write(`Gagal: ${error.message}\n`);
  process.exit(1);
});
