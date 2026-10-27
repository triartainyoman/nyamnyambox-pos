import { expect, test } from "@playwright/test";

import { loginAsCashier } from "./helpers";

test.use({ viewport: { width: 390, height: 844 } });

test("kasir membuat pesanan, melihat nota, lalu mengeditnya di riwayat", async ({ page }) => {
  await loginAsCashier(page);

  // Add a menu item and open the cart from the mobile floating bar.
  await page
    .getByRole("button")
    .filter({ hasText: "Thai Basil Chicken" })
    .first()
    .click();
  await expect(page.getByRole("button", { name: /Checkout/ })).toBeVisible();
  await page.getByRole("button", { name: /Checkout/ }).click();

  const cart = page.getByRole("dialog", { name: /Pesanan/ });
  await expect(cart).toBeVisible();

  // Per-item notes.
  await cart.getByRole("button", { name: "Tambah catatan item" }).click();
  await cart
    .getByPlaceholder("Catatan lain (mis. nasi tambah, tanpa sambal)")
    .fill("Pedas");
  await cart.getByRole("button", { name: "Simpan catatan" }).click();
  await expect(cart.getByText("Catatan: Pedas")).toBeVisible();

  // Channel, payment method, and customer phone.
  await cart.getByRole("button", { name: "Takeaway", exact: true }).click();
  await cart.getByRole("button", { name: "QRIS", exact: true }).click();
  await cart.getByLabel("Nomor WhatsApp Pelanggan (opsional)").fill("0812-3456-7890");

  await cart.getByRole("button", { name: /Konfirmasi & Proses Pesanan/ }).click();

  // Receipt modal.
  const receiptDialog = page.getByRole("dialog", { name: "Nota Transaksi" });
  await expect(receiptDialog).toBeVisible();
  await expect(receiptDialog).toContainText("Takeaway");
  await expect(receiptDialog).toContainText("QRIS");
  await expect(receiptDialog).toContainText("Catatan: Pedas");
  await expect(receiptDialog).toContainText("0812-3456-7890");

  const description = await receiptDialog.getByText(/Pesanan #NYB-/).innerText();
  const receiptNumber = description.match(/NYB-\d{8}-\d{4}/)?.[0];
  if (!receiptNumber) throw new Error(`Receipt number not found in: ${description}`);

  await receiptDialog.getByRole("button", { name: "Pesanan Baru" }).click();
  await expect(receiptDialog).toBeHidden();

  // The new order appears in history.
  await page.goto("/history");
  await expect(page.getByRole("heading", { name: "Riwayat Transaksi" })).toBeVisible();

  const orderCard = page.getByRole("button").filter({ hasText: receiptNumber });
  await expect(orderCard).toBeVisible();
  await orderCard.click();

  const detail = page.getByRole("dialog", { name: new RegExp(receiptNumber) });
  await expect(detail).toBeVisible();
  await expect(detail).toContainText("Catatan: Pedas");

  // Edit the order: change notes and payment status.
  await detail.getByRole("button", { name: "Edit", exact: true }).click();
  await expect(detail.getByRole("button", { name: "Simpan Perubahan" })).toBeVisible();

  await detail.getByPlaceholder("Catatan item (opsional)").fill("Pedas ekstra");
  await detail.getByRole("button", { name: "Belum Lunas", exact: true }).click();
  await detail.getByLabel("Nomor WhatsApp Pelanggan").fill("0899999999");
  await detail.getByRole("button", { name: "Simpan Perubahan" }).click();

  await expect(page.getByText("Transaksi berhasil diperbarui")).toBeVisible();
  await expect(detail).toContainText("Catatan: Pedas ekstra");
  await expect(detail).toContainText("BELUM LUNAS");
  await expect(detail).toContainText("* Transaksi telah diedit");
  await expect(detail).toContainText("0899999999");

  // Printing must show the receipt only: no sheet chrome, no website footer.
  await page.emulateMedia({ media: "print" });
  const printCopy = page.locator(".receipt-print").first();
  await expect(printCopy).toBeVisible();
  await expect(printCopy).not.toContainText("nyamnyambox.com");
  const visibleOutsideReceipt = await page.evaluate(() => {
    const receipt = document.querySelector(".receipt-print");
    return [...document.querySelectorAll("body *")].filter((element) => {
      if (receipt && (element === receipt || receipt.contains(element) || element.contains(receipt))) {
        return false;
      }
      if (["HTML", "BODY", "HEAD", "SCRIPT", "STYLE"].includes(element.tagName)) return false;
      const style = getComputedStyle(element);
      return (
        style.visibility === "visible" &&
        style.display !== "none" &&
        element.getBoundingClientRect().width > 0
      );
    }).length;
  });
  expect(visibleOutsideReceipt).toBe(0);
  await page.emulateMedia({ media: "screen" });

  await detail.getByRole("button", { name: "Tutup" }).click();
  await expect(orderCard.getByText("Diedit")).toBeVisible();
});
