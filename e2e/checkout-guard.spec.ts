import { expect, test } from "@playwright/test";

import { loginAsCashier } from "./helpers";

// The floating "Checkout" bar only renders on mobile widths.
test.use({ viewport: { width: 390, height: 844 } });

test("double click checkout hanya membuat satu pesanan", async ({ page }) => {
  await loginAsCashier(page);

  // Today's orders before checkout (the demo seed already has some).
  await page.goto("/history");
  const cards = page.getByRole("button").filter({ hasText: /NYB-\d{8}-\d{4}/ });
  await cards.first().waitFor();
  const before = await cards.count();

  await page.goto("/pos");
  await page.getByRole("button").filter({ hasText: "Thai Basil Chicken" }).first().click();
  await page.getByRole("button", { name: /Checkout/ }).click();
  const cart = page.getByRole("dialog", { name: /Pesanan/ });
  await expect(cart).toBeVisible();

  // Two clicks in the same tick: React has not re-rendered the disabled state
  // yet, so only the in-handler guard prevents a duplicate order.
  await page.evaluate(() => {
    const button = Array.from(document.querySelectorAll("button")).find((candidate) =>
      /Konfirmasi & Proses Pesanan/.test(candidate.textContent ?? ""),
    );
    if (!button) throw new Error("checkout button not found");
    button.click();
    button.click();
  });

  const receipt = page.getByRole("dialog", { name: "Nota Transaksi" });
  await expect(receipt).toBeVisible();

  const description = await receipt.getByText(/Pesanan #NYB-/).innerText();
  const receiptNumber = description.match(/NYB-\d{8}-\d{4}/)?.[0];
  expect(receiptNumber).toBeTruthy();

  await receipt.getByRole("button", { name: "Pesanan Baru" }).click();
  await page.goto("/history");
  await expect(page.getByText(receiptNumber!, { exact: true })).toBeVisible();
  await expect(cards).toHaveCount(before + 1);
});
