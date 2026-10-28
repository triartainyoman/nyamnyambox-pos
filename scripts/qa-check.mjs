#!/usr/bin/env node
/**
 * Automated half of the manual QA matrix (T12).
 *
 * Runs against the demo-mode dev server, so it never touches production data:
 *
 *   NEXT_DIST_DIR=.next-qa NEXT_PUBLIC_DEMO_MODE=true \
 *   NEXT_PUBLIC_SUPABASE_URL= NEXT_PUBLIC_SUPABASE_ANON_KEY= SUPABASE_SERVICE_ROLE_KEY= \
 *   npm run dev -- --port 3210 --hostname 127.0.0.1
 *
 *   npm run qa:check
 *
 * It checks responsive layouts for horizontal overflow, console errors, empty
 * states, slow-network behaviour, double-submit, keyboard order, receipt print
 * widths (58/80mm), and the WhatsApp share link. Screenshots land in
 * `qa-artifacts/`. Physical checks (real printer, WhatsApp app, iOS Safari)
 * still need a human — see docs/QA_MATRIX.md.
 */

import fs from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";

const BASE = process.env.QA_BASE_URL ?? "http://127.0.0.1:3210";
const OUT = path.resolve("qa-artifacts");
const DEMO_DB_KEY = "nyb-demo-db-v2";
const PASSWORD = "demo123";
const CASHIER = "rizky";
const OWNER = "owner@nyamnyambox.demo";

const VIEWPORTS = [
  { name: "mobile-360", width: 360, height: 800 },
  { name: "mobile-390", width: 390, height: 844 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "tablet-820", width: 820, height: 1180 },
  { name: "tablet-1024", width: 1024, height: 768 },
  { name: "laptop-1180", width: 1180, height: 820 },
  { name: "desktop-1280", width: 1280, height: 800 },
];

const findings = [];
let checks = 0;

function ok(message) {
  checks += 1;
  console.log(`  \u2713 ${message}`);
}

function bad(message, detail) {
  checks += 1;
  findings.push({ message, detail });
  console.log(`  \u2717 ${message}${detail ? ` — ${detail}` : ""}`);
}

function section(title) {
  console.log(`\n## ${title}`);
}

async function login(page, identifier) {
  await page.goto(`${BASE}/login`);
  await page.getByLabel("Username atau Email").fill(identifier);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await page.waitForURL(/\/(pos|dashboard)$/);
}

async function shot(page, viewport, name) {
  const dir = path.join(OUT, viewport);
  fs.mkdirSync(dir, { recursive: true });
  await page.screenshot({ path: path.join(dir, `${name}.png`), fullPage: true });
}

async function checkOverflow(page, label) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  if (overflow > 1) bad(`${label}: horizontal overflow`, `${overflow}px`);
  else ok(`${label}: no horizontal overflow`);
}

async function newPage(browser, viewport, errors) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  return { context, page };
}

async function responsive(browser) {
  for (const viewport of VIEWPORTS) {
    section(`Responsive — ${viewport.name} (${viewport.width}px)`);
    const errors = [];
    const { context, page } = await newPage(browser, viewport, errors);

    // Cashier pages.
    await login(page, CASHIER);
    for (const [url, heading] of [
      ["/pos", "Halo,"],
      ["/history", "Riwayat Transaksi"],
    ]) {
      await page.goto(`${BASE}${url}`);
      await page.getByRole("heading", { name: heading, exact: false }).first().waitFor();
      await checkOverflow(page, `${url} @ ${viewport.width}px`);

      if (url === "/pos") {
        const panel = page.getByRole("complementary", { name: "Ringkasan pesanan" });
        if (viewport.width >= 768) {
          if (await panel.isVisible()) {
            ok(`${viewport.width}px: cart panel is persistent`);
          } else {
            bad(`${viewport.width}px: persistent cart panel is missing`);
          }
          const columns = await page.evaluate(() => {
            const grid = document.querySelector("section div.grid");
            return grid
              ? getComputedStyle(grid).gridTemplateColumns.split(" ").filter(Boolean).length
              : 0;
          });
          if (columns >= 3) ok(`${viewport.width}px: product grid has ${columns} columns`);
          else bad(`${viewport.width}px: product grid has only ${columns} columns`);
        } else if (await panel.isVisible()) {
          bad(`${viewport.width}px: cart panel should stay a bottom sheet`);
        } else {
          ok(`${viewport.width}px: cart stays a bottom sheet`);
        }
      }

      await shot(page, viewport.name, url.replace("/", "") || "root");
    }

    // Owner pages.
    await context.clearCookies();
    await login(page, OWNER);
    for (const [url, heading] of [
      ["/dashboard", "Dashboard"],
      ["/products", "Menu & Promo"],
      ["/employees", "Kelola Karyawan"],
      ["/settings/security", "Keamanan Akun"],
    ]) {
      await page.goto(`${BASE}${url}`);
      await page.getByRole("heading", { name: heading, exact: false }).first().waitFor();
      // Recharts animates its line in; let it finish so screenshots are readable.
      if (url === "/dashboard") await page.waitForTimeout(1200);
      await checkOverflow(page, `${url} @ ${viewport.width}px`);
      await shot(page, viewport.name, url.replace("/", "") || "root");
    }

    // Login screen at this width.
    await context.clearCookies();
    await page.goto(`${BASE}/login`);
    await page.getByRole("button", { name: "Masuk", exact: true }).waitFor();
    await checkOverflow(page, `/login @ ${viewport.width}px`);
    await shot(page, viewport.name, "login");

    if (errors.length) bad(`console errors @ ${viewport.name}`, errors.slice(0, 3).join(" | "));
    else ok(`no console errors @ ${viewport.name}`);

    await context.close();
  }
}

async function emptyStates(browser) {
  section("Empty states (no orders)");
  const errors = [];
  const { context, page } = await newPage(browser, VIEWPORTS[1], errors);
  await login(page, OWNER);

  // Make sure the demo database has been seeded before emptying it.
  await page.goto(`${BASE}/pos`);
  await page.getByRole("button").filter({ hasText: "Thai Basil Chicken" }).first().waitFor();

  // Wipe orders but keep menus and staff.
  await page.evaluate((key) => {
    const raw = window.localStorage.getItem(key);
    if (!raw) return;
    const db = JSON.parse(raw);
    db.orders = [];
    db.receiptCounter = 0;
    window.localStorage.setItem(key, JSON.stringify(db));
  }, DEMO_DB_KEY);

  await page.goto(`${BASE}/history`);
  await page.getByText("Belum ada transaksi").waitFor();
  ok("history shows the empty state");
  await shot(page, "empty", "history-empty");

  await page.goto(`${BASE}/dashboard`);
  await page.getByText("Belum ada transaksi hari ini.").waitFor();
  ok("dashboard shows the empty state");
  await shot(page, "empty", "dashboard-empty");

  await context.close();
}

async function checkoutFlow(browser) {
  section("Checkout: double submit, receipt sizes, WhatsApp link");
  const errors = [];
  const { context, page } = await newPage(browser, VIEWPORTS[1], errors);
  await login(page, CASHIER);

  // Count today's orders before checkout so a duplicate is detectable.
  await page.goto(`${BASE}/history`);
  await page.getByRole("heading", { name: "Riwayat Transaksi" }).waitFor();
  const cards = page.getByRole("button").filter({ hasText: /NYB-\d{8}-\d{4}/ });
  await cards.first().waitFor({ timeout: 15_000 });
  const before = await cards.count();

  await page.goto(`${BASE}/pos`);
  await page.getByRole("button").filter({ hasText: "Thai Basil Chicken" }).first().click();
  await page.getByRole("button", { name: /Checkout/ }).click();
  const cart = page.getByRole("dialog", { name: /Pesanan/ });
  await cart.waitFor();
  await cart.getByRole("button", { name: "Takeaway", exact: true }).click();

  // Fire two clicks in the same tick: the handler must only create one order.
  await page.evaluate(() => {
    const button = Array.from(document.querySelectorAll("button")).find((candidate) =>
      /Konfirmasi & Proses Pesanan/.test(candidate.textContent ?? ""),
    );
    if (!button) throw new Error("checkout button not found");
    button.click();
    button.click();
  });

  const receipt = page.getByRole("dialog", { name: "Nota Transaksi" });
  await receipt.waitFor();
  const description = await receipt.getByText(/Pesanan #NYB-/).innerText();
  const receiptNumber = description.match(/NYB-\d{8}-\d{4}/)?.[0];
  if (!receiptNumber) bad("receipt number rendered");
  else ok(`order created with ${receiptNumber}`);

  await page.getByRole("button", { name: "Pesanan Baru" }).click();
  await page.goto(`${BASE}/history`);
  await page.getByText(receiptNumber, { exact: true }).first().waitFor();
  const after = await cards.count();
  if (after === before + 1) ok(`double click created exactly one order (${before} -> ${after})`);
  else bad("double submit created extra orders", `${before} -> ${after}`);

  // Re-open the receipt to test print sizes and the WhatsApp link.
  await cards.first().click();
  const detail = page.getByRole("dialog", { name: new RegExp(receiptNumber) });
  await detail.waitFor();
  await detail.getByRole("button", { name: "Tutup" }).click();

  await page.goto(`${BASE}/pos`);
  await page.getByRole("button").filter({ hasText: "Thai Basil Chicken" }).first().click();
  await page.getByRole("button", { name: /Checkout/ }).click();
  await page.getByRole("button", { name: /Konfirmasi & Proses Pesanan/ }).click();
  await receipt.waitFor();

  await page.evaluate(() => {
    window.__opened = [];
    window.open = (url) => {
      window.__opened.push(url);
      return null;
    };
  });
  const secondDescription = await receipt.getByText(/Pesanan #NYB-/).innerText();
  const secondReceipt = secondDescription.match(/NYB-\d{8}-\d{4}/)?.[0] ?? "";
  await receipt.getByRole("button", { name: /Kirim WA/ }).click();
  const waUrl = await page.evaluate(() => window.__opened?.[0] ?? "");
  if (waUrl.startsWith("https://wa.me/") && waUrl.includes(secondReceipt)) {
    ok("WhatsApp share builds a wa.me link with the receipt");
  } else {
    bad("WhatsApp share link is wrong", waUrl.slice(0, 120));
  }

  fs.mkdirSync(path.join(OUT, "print"), { recursive: true });
  for (const [size, maxWidth] of [
    ["58", 210],
    ["80", 320],
  ]) {
    await receipt.getByRole("group", { name: "Ukuran kertas nota" }).getByRole("button", { name: `${size}mm` }).click();
    await page.emulateMedia({ media: "print" });
    // Cards use `transition-all`, which keeps `visibility: visible` for the
    // duration of the transition. Let it settle before asserting/screenshotting.
    await page.waitForTimeout(400);
    const printCopy = page.locator(`.receipt-print.receipt-${size}`);
    const visible = await printCopy.isVisible();
    const box = visible ? await printCopy.boundingBox() : null;
    const pageRule = await page.evaluate(() => {
      const styles = Array.from(document.querySelectorAll("style"));
      return styles.map((style) => style.textContent ?? "").join("\n");
    });
    if (!visible) bad(`print copy ${size}mm is not rendered`);
    else if (!box || box.width > maxWidth) bad(`print copy ${size}mm is too wide`, `${Math.round(box?.width ?? 0)}px`);
    else ok(`print copy ${size}mm fits (${Math.round(box.width)}px)`);
    if (!pageRule.includes(`size: ${size}mm auto`)) bad(`@page size ${size}mm missing`);
    else ok(`@page size ${size}mm applied`);
    await page.screenshot({ path: path.join(OUT, "print", `receipt-${size}mm.png`), fullPage: false });
    await page.emulateMedia({ media: "screen" });
  }

  if (errors.length) bad("console errors during checkout", errors.slice(0, 3).join(" | "));
  else ok("no console errors during checkout");

  await context.close();
}

async function slowNetwork(browser) {
  section("Slow network (Slow 3G)");
  const errors = [];
  const { context, page } = await newPage(browser, VIEWPORTS[1], errors);
  await login(page, CASHIER);

  const cdp = await context.newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: 400,
    downloadThroughput: (400 * 1024) / 8,
    uploadThroughput: (400 * 1024) / 8,
  });

  const start = Date.now();
  await page.goto(`${BASE}/history`, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "Riwayat Transaksi" }).waitFor({ timeout: 30_000 });
  const elapsed = Date.now() - start;
  if (errors.length) bad("slow network surfaced an error", errors.slice(0, 2).join(" | "));
  else ok(`history rendered on Slow 3G in ${elapsed} ms`);

  await cdp.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: 0,
    downloadThroughput: -1,
    uploadThroughput: -1,
  });
  await context.close();
}

async function keyboard(browser) {
  section("Keyboard & focus");
  const errors = [];
  const { context, page } = await newPage(browser, VIEWPORTS[3], errors);
  await page.goto(`${BASE}/login`);

  // Focus the identifier with the keyboard so :focus-visible applies.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await page.keyboard.press("Tab");
    const focused = await page.evaluate(() => document.activeElement?.id ?? "");
    if (focused === "identifier") break;
  }

  const focusRing = await page.evaluate(() => {
    const el = document.getElementById("identifier");
    if (!el) return null;
    const style = getComputedStyle(el);
    return {
      focused: document.activeElement === el,
      focusVisible: el.matches(":focus-visible"),
      shadow: style.boxShadow,
      outline: `${style.outlineStyle} ${style.outlineWidth}`,
    };
  });

  const order = [];
  for (let i = 0; i < 6; i += 1) {
    await page.keyboard.press("Tab");
    order.push(
      await page.evaluate(() => {
        const el = document.activeElement;
        const label = el?.getAttribute("aria-label") || el?.id || el?.textContent?.trim().slice(0, 24);
        return label || "?";
      }),
    );
  }
  const passwordAt = order.indexOf("password");
  const toggleAt = order.indexOf("Tampilkan password");
  const submitAt = order.indexOf("Masuk");
  if (passwordAt >= 0 && toggleAt > passwordAt && submitAt > toggleAt) {
    ok(`tab order is identifier -> ${order.filter(Boolean).join(" -> ")}`);
  } else {
    bad("tab order is unexpected", order.join(" -> "));
  }

  if (!focusRing || !focusRing.focusVisible || focusRing.shadow === "none") {
    bad("focused input has no visible ring", JSON.stringify(focusRing));
  } else {
    ok("focused input has a visible ring");
  }

  await context.close();
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  try {
    await responsive(browser);
    await emptyStates(browser);
    await checkoutFlow(browser);
    await slowNetwork(browser);
    await keyboard(browser);
  } finally {
    await browser.close();
  }

  console.log(`\n${checks} checks, ${findings.length} finding(s)`);
  if (findings.length) {
    for (const finding of findings) {
      console.log(`- ${finding.message}${finding.detail ? `: ${finding.detail}` : ""}`);
    }
    process.exitCode = 1;
  }
  console.log(`Screenshots: ${OUT}`);
}

await main();
