import { describe, expect, it } from "vitest";

import type { Order } from "@/lib/types";
import { buildReceiptMessage, buildWhatsAppUrl, receiptItemLines } from "@/lib/whatsapp";

function makeOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: "order-1",
    receipt_number: "NYB-20261025-0001",
    cashier_id: "user-1",
    channel: "DINE_IN",
    payment_method: "CASH",
    payment_status: "LUNAS",
    total_amount: 40_000,
    is_edited: false,
    customer_phone: null,
    created_at: "2026-10-24T18:12:37.000Z",
    cashier: { name: "Rizky" },
    order_items: [
      {
        id: "item-1",
        order_id: "order-1",
        product_id: "product-1",
        quantity: 2,
        price_at_transaction: 20_000,
        notes: "Pedas",
        created_at: "2026-10-24T18:12:37.000Z",
        product: { name: "Thai Basil Chicken", image_url: null },
      },
    ],
    ...overrides,
  };
}

describe("receiptItemLines", () => {
  it("formats quantity, product name, line total, and notes", () => {
    expect(receiptItemLines(makeOrder())).toEqual([
      "2x Thai Basil Chicken — Rp 40.000\n   Catatan: Pedas",
    ]);
  });

  it("falls back to a generic product name", () => {
    const order = makeOrder({
      order_items: [
        {
          id: "item-1",
          order_id: "order-1",
          product_id: "product-1",
          quantity: 1,
          price_at_transaction: 15_000,
          notes: null,
          created_at: "2026-10-24T18:12:37.000Z",
          product: null,
        },
      ],
    });
    expect(receiptItemLines(order)).toEqual(["1x Produk — Rp 15.000"]);
  });

  it("omits the notes line when notes are empty", () => {
    const order = makeOrder({
      order_items: [
        {
          id: "item-1",
          order_id: "order-1",
          product_id: "product-1",
          quantity: 1,
          price_at_transaction: 20_000,
          notes: "",
          created_at: "2026-10-24T18:12:37.000Z",
          product: { name: "Thai Basil Chicken", image_url: null },
        },
      ],
    });
    expect(receiptItemLines(order)).toEqual(["1x Thai Basil Chicken — Rp 20.000"]);
  });

  it("handles orders without items", () => {
    expect(receiptItemLines(makeOrder({ order_items: undefined }))).toEqual([]);
  });
});

describe("buildReceiptMessage", () => {
  it("includes the receipt details and formatted Jakarta time", () => {
    const message = buildReceiptMessage(makeOrder());

    expect(message).toContain("Halo Kak, terima kasih sudah memesan di *Nyamnyambox*!");
    expect(message).toContain("No. Nota: #NYB-20261025-0001");
    expect(message).toContain("Tanggal: 25 Okt 2026, 01.12");
    expect(message).toContain("Kasir: Rizky");
    expect(message).toContain("Kanal: Dine-In");
    expect(message).toContain("2x Thai Basil Chicken — Rp 40.000");
    expect(message).toContain("Catatan: Pedas");
    expect(message).toContain("Total: Rp 40.000");
    expect(message).toContain("Metode: Cash (Lunas)");
  });

  it("uses the correct labels for unpaid non-cash orders", () => {
    const message = buildReceiptMessage(
      makeOrder({ payment_method: "QRIS", payment_status: "BELUM_LUNAS", channel: "GRABFOOD" }),
    );
    expect(message).toContain("Kanal: GrabFood");
    expect(message).toContain("Metode: QRIS (Belum Lunas)");
  });

  it("falls back to a dash when the cashier is unknown", () => {
    expect(buildReceiptMessage(makeOrder({ cashier: null }))).toContain("Kasir: -");
  });
});

describe("buildWhatsAppUrl", () => {
  it("normalizes a local 0-prefixed phone number", () => {
    const url = new URL(buildWhatsAppUrl(makeOrder({ customer_phone: "0812-3456-7890" })));
    expect(url.origin + url.pathname).toBe("https://wa.me/6281234567890");
    expect(url.searchParams.get("text")).toBe(
      buildReceiptMessage(makeOrder({ customer_phone: "0812-3456-7890" })),
    );
  });

  it("normalizes +62 and bare numbers", () => {
    const plus62 = new URL(buildWhatsAppUrl(makeOrder({ customer_phone: "+62 812 3456 7890" })));
    const bare = new URL(buildWhatsAppUrl(makeOrder({ customer_phone: "81234567890" })));
    expect(plus62.pathname).toBe("/6281234567890");
    expect(bare.pathname).toBe("/6281234567890");
  });

  it("keeps an existing 62 prefix without doubling it", () => {
    const url = new URL(buildWhatsAppUrl(makeOrder({ customer_phone: "6281234567890" })));
    expect(url.pathname).toBe("/6281234567890");
  });

  it("opens the contact picker when no phone is stored", () => {
    for (const phone of [null, "", "   "]) {
      const url = new URL(buildWhatsAppUrl(makeOrder({ customer_phone: phone })));
      expect(url.origin + url.pathname).toBe("https://wa.me/");
      expect(url.searchParams.get("text")).toContain("No. Nota: #NYB-20261025-0001");
    }
  });
});
