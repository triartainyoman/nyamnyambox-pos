import { stat } from "node:fs/promises";

import { expect, test } from "@playwright/test";

import { loginAsCashier, loginAsOwner } from "./helpers";

test("owner mengunduh rekap Excel bulanan dari riwayat transaksi", async ({ page }) => {
  await loginAsOwner(page);
  await page.goto("/history");
  await expect(page.getByRole("heading", { name: "Riwayat Transaksi" })).toBeVisible();

  // The export card is owner-only and defaults to the current Jakarta month.
  await expect(page.getByRole("heading", { name: "Ekspor Excel bulanan" })).toBeVisible();
  await expect(page.getByLabel("Bulan", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Tahun", { exact: true })).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Unduh Excel" }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toMatch(/^Nyamnyambox-\d{4}-\d{2}\.xlsx$/);

  const filePath = await download.path();
  expect(filePath).toBeTruthy();
  const file = await stat(filePath!);
  // A real workbook (three sheets) is far bigger than an empty stub.
  expect(file.size).toBeGreaterThan(1000);

  await expect(page.getByText(/Excel .* diunduh \(\d+ transaksi\)/)).toBeVisible();
});

test("kasir tidak melihat kartu ekspor Excel", async ({ page }) => {
  await loginAsCashier(page);
  await page.goto("/history");
  await expect(page.getByRole("heading", { name: "Riwayat Transaksi" })).toBeVisible();

  await expect(page.getByRole("heading", { name: "Ekspor Excel bulanan" })).toBeHidden();
  await expect(page.getByRole("button", { name: "Unduh Excel" })).toHaveCount(0);
});
