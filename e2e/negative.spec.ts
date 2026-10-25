import { expect, test } from "@playwright/test";

import { DEMO_PASSWORD, gotoLogin, loginAsCashier } from "./helpers";

test("owner tidak dapat masuk memakai username", async ({ page }) => {
  await gotoLogin(page);
  await page.getByLabel("Username atau Email").fill("owner");
  await page.getByLabel("Password", { exact: true }).fill(DEMO_PASSWORD);
  await page.getByRole("button", { name: "Masuk", exact: true }).click();

  await expect(page.getByText("Username/email atau password salah.")).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
});

test("kasir dialihkan dari halaman khusus owner", async ({ page }) => {
  await loginAsCashier(page);

  for (const path of ["/dashboard", "/products", "/employees"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/pos$/);
    await expect(page.getByRole("heading", { name: "Halo, Rizky 👋" })).toBeVisible();
  }
});

test("halaman terproteksi mengarah ke login tanpa sesi", async ({ page }) => {
  await page.goto("/pos");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("button", { name: "Masuk", exact: true })).toBeVisible();
});
