import { expect, test } from "@playwright/test";

import { loginAsDeveloper, loginAsOwner } from "./helpers";

function staffList(page: import("@playwright/test").Page) {
  return page.locator("section").filter({ hasText: "Daftar Akun" });
}

test("owner tidak melihat akun developer di daftar karyawan", async ({ page }) => {
  await loginAsOwner(page);
  await page.goto("/employees");
  await expect(page.getByRole("heading", { name: "Kelola Karyawan" })).toBeVisible();

  const list = staffList(page);

  // The regular staff list is visible…
  await expect(list.getByText("Nadia Putri")).toBeVisible();
  await expect(list.getByText("Rizky Pratama")).toBeVisible();

  // …but the hidden developer never appears, not even as a badge or email.
  await expect(list.getByText("developer@nyamnyambox.demo")).toHaveCount(0);
  await expect(list.getByText("Developer", { exact: true })).toHaveCount(0);
});

test("developer masuk sebagai super-owner dan tetap tersembunyi dari daftar", async ({
  page,
}) => {
  await loginAsDeveloper(page);

  // Developer is treated as an owner: owner-only pages stay reachable.
  await page.getByRole("link", { name: "Kelola Karyawan" }).click();
  await expect(page.getByRole("heading", { name: "Kelola Karyawan" })).toBeVisible();

  // Still hidden from the staff listing, including for the developer.
  const list = staffList(page);
  await expect(list.getByText("developer@nyamnyambox.demo")).toHaveCount(0);
  await expect(list.getByText("Developer", { exact: true })).toHaveCount(0);
});
