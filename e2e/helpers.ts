import { expect, type Page } from "@playwright/test";

export const DEMO_PASSWORD = "demo123";

export async function gotoLogin(page: Page) {
  await page.goto("/login");
  // Guards against accidentally running E2E against a Supabase-backed server.
  await expect(page.getByText("Mode Demo")).toBeVisible();
}

export async function login(page: Page, identifier: string, password = DEMO_PASSWORD) {
  await gotoLogin(page);
  await page.getByLabel("Username atau Email").fill(identifier);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
}

export async function loginAsCashier(page: Page) {
  await login(page, "rizky");
  await expect(page).toHaveURL(/\/pos$/);
  await expect(page.getByRole("heading", { name: "Halo, Rizky 👋" })).toBeVisible();
}

export async function loginAsOwner(page: Page) {
  await login(page, "owner@nyamnyambox.demo");
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
}
