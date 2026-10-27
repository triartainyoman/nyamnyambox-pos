#!/usr/bin/env node
/**
 * Restore drill for the Nyamnyambox database.
 *
 * Proves that a dump actually restores: it boots a throwaway Postgres (PGlite),
 * recreates the minimal Supabase surface (`anon` / `authenticated` /
 * `service_role` roles, `auth.users`, `auth.uid()`), applies the dump, and then
 * runs `supabase/verify.sql` against it. A dump that is missing a table, RLS
 * policy, grant or RPC fails the drill.
 *
 * Usage:
 *   node scripts/restore-drill.mjs --from-db "$SUPABASE_DB_URL"
 *   node scripts/restore-drill.mjs --from-db "$SUPABASE_DB_URL" --include-products
 *   node scripts/restore-drill.mjs --dump backup.sql
 *
 * `--from-db` needs `pg_dump` (17.x) in PATH or in a Homebrew libpq install.
 * The password is passed via PGPASSWORD, never on the command line.
 *
 * See docs/RUNBOOK.md for the full backup and restore procedure.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { PGlite } from "@electric-sql/pglite";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const HELP = `Restore drill Nyamnyambox.

Pemakaian:
  node scripts/restore-drill.mjs --from-db <postgres-url> [--include-products]
  node scripts/restore-drill.mjs --dump <file.sql|file.dump> [--data <file.sql>]

Opsi:
  --from-db URL        Ambil dump langsung dari database (butuh pg_dump 17).
  --dump FILE          Pakai dump yang sudah ada (plain SQL atau custom format).
  --data FILE          Terapkan data dump tambahan (INSERT/plain SQL).
  --include-products   Saat memakai --from-db, ikutkan data tabel products.
  --strict-owner       Anggap "active owner exists" FAIL sebagai kegagalan.
  --keep               Jangan hapus file dump sementara.
  --help               Tampilkan bantuan ini.
`;

// ---------------------------------------------------------------------------
// Arguments
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const args = { includeProducts: false, strictOwner: false, keep: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") args.help = true;
    else if (arg === "--from-db") args.fromDb = argv[++i];
    else if (arg === "--dump") args.dump = argv[++i];
    else if (arg === "--data") args.data = argv[++i];
    else if (arg === "--include-products") args.includeProducts = true;
    else if (arg === "--strict-owner") args.strictOwner = true;
    else if (arg === "--keep") args.keep = true;
    else throw new Error(`Argumen tidak dikenal: ${arg}`);
  }
  return args;
}

// ---------------------------------------------------------------------------
// pg_dump / pg_restore discovery
// ---------------------------------------------------------------------------

function postgresBinDirs() {
  const dirs = [
    "/opt/homebrew/opt/libpq/bin",
    "/usr/local/opt/libpq/bin",
    "/opt/homebrew/bin",
    "/usr/local/bin",
  ];

  for (const base of ["/usr/lib/postgresql", "/usr/local/pgsql"]) {
    if (!existsSync(base)) continue;
    for (const version of readdirSync(base)) dirs.push(join(base, version, "bin"));
  }

  return dirs;
}

function findBinary(name) {
  const candidates = [name, ...postgresBinDirs().map((dir) => join(dir, name))];
  for (const candidate of candidates) {
    try {
      execFileSync(candidate, ["--version"], { stdio: "ignore" });
      return candidate;
    } catch {
      // Try the next location.
    }
  }
  throw new Error(
    `${name} tidak ditemukan. Pasang PostgreSQL client 17 ` +
      "(macOS: `brew install libpq`) lalu jalankan ulang.",
  );
}

/**
 * Split a connection URL so the password can go through PGPASSWORD.
 *
 * Supabase-generated passwords often contain `/`, `+` or `@`, which makes a
 * raw connection string unparseable. `URL` is tried first (properly encoded
 * strings); otherwise the string is split on the last `@` and the password is
 * used verbatim.
 */
function splitDatabaseUrl(raw) {
  try {
    const url = new URL(raw);
    const suspicious =
      (raw.match(/@/g) ?? []).length > 1 ||
      url.pathname.includes("@") ||
      url.pathname.split("/").length > 2;

    if (!suspicious) {
      const auth = url.username ? `${url.username}@` : "";
      return {
        dbname: `postgresql://${auth}${url.host}${url.pathname}${url.search}`,
        password: decodeURIComponent(url.password),
        host: url.host,
      };
    }
  } catch {
    // Fall through to the manual split below.
  }

  const match = /^(postgres(?:ql)?):\/\/([^:/@]+):(.*)@([^/]+)\/([^?]*)/.exec(raw);
  if (!match) {
    throw new Error(
      "Connection string tidak valid. Format: postgresql://user:password@host:5432/postgres",
    );
  }

  const [, , user, password, host, database] = match;
  return {
    dbname: `postgresql://${user}@${host}/${database}`,
    password,
    host,
  };
}

// ---------------------------------------------------------------------------
// Dump helpers
// ---------------------------------------------------------------------------

function dumpSchema(url) {
  const { dbname, password } = splitDatabaseUrl(url);
  const dir = mkdtempSync(join(tmpdir(), "nyb-drill-"));
  const file = join(dir, "schema.sql");

  process.stderr.write("Menjalankan pg_dump --schema-only…\n");
  execFileSync(
    findBinary("pg_dump"),
    [dbname, "--schema=public", "--no-owner", "--schema-only", "--file", file],
    { env: { ...process.env, PGPASSWORD: password }, stdio: ["ignore", "ignore", "inherit"] },
  );

  return { dir, schemaFile: file };
}

function dumpProducts(url) {
  const { dbname, password } = splitDatabaseUrl(url);
  const dir = mkdtempSync(join(tmpdir(), "nyb-drill-"));
  const file = join(dir, "products.sql");
  process.stderr.write("Menjalankan pg_dump --data-only --inserts (products)…\n");
  execFileSync(
    findBinary("pg_dump"),
    [
      dbname,
      "--schema=public",
      "--no-owner",
      "--data-only",
      "--inserts",
      "--table=public.products",
      "--file",
      file,
    ],
    { env: { ...process.env, PGPASSWORD: password }, stdio: ["ignore", "ignore", "inherit"] },
  );

  return { dir, file };
}
/** Read a dump, converting a custom-format archive to plain SQL when needed. */
function readDump(file) {
  const buffer = readFileSync(file);

  if (buffer.subarray(0, 5).toString("latin1") === "PGDMP") {
    process.stderr.write("Dump dalam custom format: mengonversi dengan pg_restore…\n");
    const plain = `${file}.sql`;
    execFileSync(findBinary("pg_restore"), ["--file", plain, "--no-owner", file], {
      stdio: ["ignore", "ignore", "inherit"],
    });
    return readFileSync(plain, "utf8");
  }

  return buffer.toString("utf8");
}

/**
 * Adapt a Supabase dump to a scratch database:
 *  - `public` already exists, so make the CREATE SCHEMA idempotent,
 *  - pgcrypto is built in on modern Postgres and not shipped by PGlite.
 */
function normalize(sql) {
  return sql
    .replace(/^\s*create extension if not exists pgcrypto;.*$/gim, "-- pgcrypto omitted")
    .replace(/^CREATE SCHEMA public;$/gm, "CREATE SCHEMA IF NOT EXISTS public;")
    .replace(/^COMMENT ON SCHEMA public.*$/gm, "");
}

/** Roles referenced by GRANT/REVOKE statements, so the restore does not fail. */
function rolesInDump(sql) {
  const roles = new Set();
  for (const line of sql.split("\n")) {
    const match = /^(?:GRANT|REVOKE)\b.*\b(?:TO|FROM)\s+([a-z_][a-z0-9_]*)\s*;?\s*$/i.exec(
      line.trim(),
    );
    if (match) roles.add(match[1]);
  }
  return roles;
}

// ---------------------------------------------------------------------------
// Restore
// ---------------------------------------------------------------------------

const SUPABASE_STUBS = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  create role supabase_admin nologin;
  create role supabase_auth_admin nologin;
  create role supabase_storage_admin nologin;
  create role authenticator nologin;
  create role dashboard_user nologin;

  create schema if not exists auth;

  create table if not exists auth.users (
    id uuid primary key,
    email text unique not null,
    raw_user_meta_data jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
  );

  create or replace function auth.uid()
  returns uuid
  language sql
  stable
  as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;

  grant usage on schema auth to anon, authenticated, service_role;
  grant execute on function auth.uid() to anon, authenticated, service_role;
`;

async function restore({ schemaSql, dataSql }) {
  const db = new PGlite();
  await db.exec(SUPABASE_STUBS);

  for (const role of rolesInDump(schemaSql)) {
    if (["postgres", "public", "current_user", "session_user"].includes(role)) continue;
    await db.exec(`create role ${role} nologin`).catch(() => {});
  }

  await db.exec(schemaSql);
  if (dataSql) await db.exec(dataSql);
  return db;
}

async function verify(db) {
  const results = await db.exec(readFileSync(join(ROOT, "supabase", "verify.sql"), "utf8"));
  return results.at(-1).rows;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write(HELP);
    return;
  }

  const cleanup = [];
  let schemaSql;
  let dataSql;

  if (args.fromDb) {
    const { dir, schemaFile } = dumpSchema(args.fromDb);
    cleanup.push(dir);
    schemaSql = normalize(readDump(schemaFile));

    if (args.includeProducts) {
      const products = dumpProducts(args.fromDb);
      cleanup.push(products.dir);
      dataSql = readDump(products.file);
    }
  } else if (args.dump) {
    schemaSql = normalize(readDump(args.dump));
    if (args.data) dataSql = readDump(args.data);
  } else {
    throw new Error("Butuh --from-db <url> atau --dump <file>. Jalankan dengan --help.");
  }

  process.stderr.write("Memulihkan dump ke Postgres sementara (PGlite)…\n");
  const db = await restore({ schemaSql, dataSql });

  process.stderr.write("Menjalankan supabase/verify.sql…\n\n");
  const rows = await verify(db);

  const allowEmptyOwner = !args.strictOwner;
  let failed = 0;
  let expected = 0;

  for (const row of rows) {
    const ok = row.status === "OK";
    const isExpectedOwnerFail = !ok && row.check_name === "active owner exists" && allowEmptyOwner;

    if (isExpectedOwnerFail) expected += 1;
    else if (!ok) failed += 1;

    const label = ok ? "OK  " : isExpectedOwnerFail ? "SKIP" : "FAIL";
    process.stdout.write(`${label} ${row.check_name}: ${row.detail}\n`);
  }

  const passed = rows.length - failed - expected;
  process.stdout.write(
    `\n${passed}/${rows.length} checks OK` +
      (expected ? ` · ${expected} dilewati (dump tanpa data profil)` : "") +
      (failed ? ` · ${failed} GAGAL` : "") +
      "\n",
  );

  await db.close();

  for (const dir of cleanup) {
    if (!args.keep) rmSync(dir, { recursive: true, force: true });
    else process.stderr.write(`Dump sementara disimpan di ${dir}\n`);
  }

  if (failed > 0) {
    process.exitCode = 1;
    process.stderr.write("\nRestore drill GAGAL: dump tidak lengkap.\n");
  } else {
    process.stderr.write("\nRestore drill lulus.\n");
  }
}

main().catch((error) => {
  process.stderr.write(`Gagal: ${error.message}\n`);
  process.exit(1);
});
