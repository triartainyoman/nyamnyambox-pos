import { expect, test } from "@playwright/test";

import { loginAsCashier } from "./helpers";

test.describe("tablet portrait (820px)", () => {
  test.use({ viewport: { width: 820, height: 1180 } });

  test("keranjang persisten, grid 3 kolom, dan checkout tetap bisa dibuka", async ({
    page,
  }) => {
    await loginAsCashier(page);

    // The sidebar collapses to an icon rail, but links keep their names.
    await expect(page.getByRole("link", { name: "Kasir" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Riwayat Transaksi" })).toBeVisible();

    // Cart is a persistent panel instead of the phone floating bar.
    const panel = page.getByRole("complementary", { name: "Ringkasan pesanan" });
    await expect(panel).toBeVisible();
    await expect(panel.getByText("Keranjang kosong.")).toBeVisible();

    await page.getByRole("button").filter({ hasText: "Thai Basil Chicken" }).first().click();
    await expect(panel.getByText("1 item")).toBeVisible();

    const columns = await page.evaluate(() => {
      const grid = document.querySelector("section div.grid");
      if (!grid) return 0;
      return getComputedStyle(grid).gridTemplateColumns.split(" ").filter(Boolean).length;
    });
    expect(columns).toBe(3);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);

    // The sheet still opens for the full cart and the checkout form.
    await panel.getByRole("button", { name: /Lihat Pesanan/ }).click();
    const sheet = page.getByRole("dialog", { name: /Pesanan/ });
    await expect(sheet).toBeVisible();
    await expect(
      sheet.getByRole("button", { name: /Konfirmasi & Proses Pesanan/ }),
    ).toBeVisible();
  });
});

test.describe("phone (390px)", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("sidebar dan panel keranjang tetap tersembunyi, bottom bar tetap ada", async ({
    page,
  }) => {
    await loginAsCashier(page);

    await expect(page.locator("aside").first()).toBeHidden();
    await expect(page.getByRole("complementary", { name: "Ringkasan pesanan" })).toBeHidden();

    const bottomNav = page.locator("nav").last();
    await expect(bottomNav.getByRole("link", { name: "Kasir" })).toBeVisible();

    await page.getByRole("button").filter({ hasText: "Thai Basil Chicken" }).first().click();
    await expect(page.getByRole("button", { name: /Checkout/ })).toBeVisible();
  });
});
