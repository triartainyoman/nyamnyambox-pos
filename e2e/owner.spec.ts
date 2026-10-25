import { expect, test } from "@playwright/test";

import { loginAsOwner } from "./helpers";

test("owner melihat dashboard, menambah menu, dan menambah kasir", async ({ page }) => {
  await loginAsOwner(page);
  await expect(page.getByText("Owner Analytics")).toBeVisible();
  await expect(page.getByText("Omzet Hari Ini")).toBeVisible();

  // Menu management.
  await page.getByRole("link", { name: "Menu & Promo" }).click();
  await expect(page.getByRole("heading", { name: "Menu & Promo" })).toBeVisible();

  await page.getByRole("button", { name: "Tambah Menu", exact: true }).click();
  const productDialog = page.getByRole("dialog", { name: "Tambah Menu" });
  await expect(productDialog).toBeVisible();

  await productDialog.getByLabel("Nama Menu").fill("E2E Es Kopi");
  await productDialog.getByLabel("Harga (Rp)").fill("18000");
  await productDialog.getByRole("button", { name: "Tambah Menu", exact: true }).click();

  await expect(page.getByText("Menu baru berhasil ditambahkan")).toBeVisible();
  await expect(page.getByText("E2E Es Kopi", { exact: true })).toBeVisible();
  await expect(page.getByText("Rp 18.000", { exact: true })).toBeVisible();

  // Employee management (demo mode stores the account locally).
  await page.getByRole("link", { name: "Kelola Karyawan" }).click();
  await expect(page.getByRole("heading", { name: "Kelola Karyawan" })).toBeVisible();

  await page.getByRole("button", { name: "Tambah Kasir", exact: true }).click();
  const employeeDialog = page.getByRole("dialog", { name: "Tambah Akun Kasir" });
  await expect(employeeDialog).toBeVisible();

  await employeeDialog.getByLabel("Nama Lengkap").fill("E2E Barista");
  await employeeDialog.getByLabel("Username").fill("e2ebarista");
  await employeeDialog.getByLabel("Email").fill("e2e-barista@nyamnyambox.demo");
  await employeeDialog.getByLabel("Password Awal").fill("rahasia123");
  await employeeDialog.getByRole("button", { name: "Buat Akun" }).click();

  await expect(page.getByText("Akun kasir @e2ebarista berhasil dibuat")).toBeVisible();
  await expect(page.getByText("E2E Barista", { exact: true })).toBeVisible();
  await expect(page.getByText("e2ebarista", { exact: true })).toBeVisible();
});
