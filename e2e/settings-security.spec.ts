import { expect, test } from "@playwright/test";

import { loginAsDeveloper, loginAsOwner } from "./helpers";

test("owner membuka halaman keamanan; form terkunci di mode demo", async ({ page }) => {
  await loginAsOwner(page);

  await page.getByRole("link", { name: "Keamanan Akun" }).click();
  await expect(page).toHaveURL(/\/settings\/security$/);
  await expect(page.getByRole("heading", { name: "Keamanan Akun" })).toBeVisible();

  await expect(page.getByLabel("Password saat ini", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Password baru", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Ulangi password baru", { exact: true })).toBeVisible();

  // Demo mode has a fixed password, so the form explains and disables itself.
  await expect(page.getByText(/Mode demo memakai password tetap/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Simpan Password Baru" })).toBeDisabled();
});

test("developer juga boleh membuka halaman keamanan", async ({ page }) => {
  await loginAsDeveloper(page);
  await page.goto("/settings/security");

  await expect(page.getByRole("heading", { name: "Keamanan Akun" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Simpan Password Baru" })).toBeDisabled();
});
