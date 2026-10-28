import { describe, expect, it } from "vitest";

import {
  buildItemSheet,
  buildSummarySheet,
  buildTransactionSheet,
  buildWorkbook,
  exportFileName,
  itemSummary,
  monthPeriodLabel,
  monthRange,
  orderItemCount,
} from "@/lib/export/excel";
import type { Order } from "@/lib/types";

function order(overrides: Partial<Order> = {}): Order {
  return {
    id: "order-1",
    receipt_number: "NYB-20261027-0001",
    cashier_id: "cashier-1",
    channel: "DINE_IN",
    payment_method: "QRIS",
    payment_status: "LUNAS",
    total_amount: 44000,
    is_edited: false,
    customer_phone: null,
    created_at: "2026-10-27T06:13:20.000Z",
    cashier: { name: "Rizky" },
    order_items: [
      {
        id: "item-1",
        order_id: "order-1",
        product_id: "product-1",
        quantity: 2,
        price_at_transaction: 20000,
        notes: "Pedas",
        created_at: "2026-10-27T06:13:20.000Z",
        product: { name: "Thai Basil Chicken", image_url: null },
      },
      {
        id: "item-2",
        order_id: "order-1",
        product_id: "product-2",
        quantity: 1,
        price_at_transaction: 4000,
        notes: null,
        created_at: "2026-10-27T06:13:20.000Z",
        product: { name: "Es Teh Manis", image_url: null },
      },
    ],
    ...overrides,
  };
}

function value(cell: unknown) {
  if (cell && typeof cell === "object" && "value" in cell) {
    return (cell as { value?: unknown }).value;
  }
  return cell;
}

function rowValue(row: unknown[] | undefined, index: number) {
  return value(row?.[index]);
}

describe("monthRange", () => {
  it("covers a full Jakarta month (UTC-7 offset)", () => {
    expect(monthRange(2026, 10)).toEqual({
      startISO: "2026-09-30T17:00:00.000Z",
      endISO: "2026-10-31T17:00:00.000Z",
    });
  });

  it("rolls December over to January of the next year", () => {
    expect(monthRange(2026, 12)).toEqual({
      startISO: "2026-11-30T17:00:00.000Z",
      endISO: "2026-12-31T17:00:00.000Z",
    });
  });
});

describe("labels and file name", () => {
  it("uses the Indonesian month name", () => {
    expect(monthPeriodLabel(2026, 10)).toBe("1–31 Oktober 2026 (WIB)");
  });

  it("handles leap-year February", () => {
    expect(monthPeriodLabel(2028, 2)).toBe("1–29 Februari 2028 (WIB)");
  });

  it("builds a sortable file name", () => {
    expect(exportFileName(2026, 10)).toBe("Nyamnyambox-2026-10.xlsx");
  });
});

describe("item helpers", () => {
  it("sums quantities across items", () => {
    expect(orderItemCount(order())).toBe(3);
  });

  it("summarises items with notes", () => {
    expect(itemSummary(order().order_items)).toBe(
      "2x Thai Basil Chicken (Pedas); 1x Es Teh Manis",
    );
  });

  it("returns an empty summary for orders without items", () => {
    expect(itemSummary(undefined)).toBe("");
    expect(orderItemCount(order({ order_items: [] }))).toBe(0);
  });
});

describe("buildTransactionSheet", () => {
  it("writes a header plus one row per order", () => {
    const sheet = buildTransactionSheet([order()]);
    expect(sheet).toHaveLength(2);
    expect(sheet[0]).toHaveLength(12);
    expect(rowValue(sheet[0], 0)).toBe("No");
    expect(rowValue(sheet[0], 9)).toBe("Total (Rp)");

    const row = sheet[1];
    expect(rowValue(row, 0)).toBe(1);
    expect(rowValue(row, 1)).toBe("NYB-20261027-0001");
    expect(rowValue(row, 2)).toBe("2026-10-27");
    expect(rowValue(row, 3)).toBe("13:13");
    expect(rowValue(row, 4)).toBe("Rizky");
    expect(rowValue(row, 5)).toBe("Dine-In");
    expect(rowValue(row, 6)).toBe("QRIS");
    expect(rowValue(row, 7)).toBe("Lunas");
    expect(rowValue(row, 8)).toBe(3);
    expect(value(row[9])).toBe(44000);
    expect(rowValue(row, 10)).toBe("-");
    expect(rowValue(row, 11)).toBe(
      "2x Thai Basil Chicken (Pedas); 1x Es Teh Manis",
    );
  });

  it("marks edited orders", () => {
    const sheet = buildTransactionSheet([order({ is_edited: true })]);
    expect(rowValue(sheet[1], 10)).toBe("Ya");
  });
});

describe("buildItemSheet", () => {
  it("writes one row per item with a subtotal", () => {
    const sheet = buildItemSheet([order()]);
    expect(sheet).toHaveLength(3);
    expect(rowValue(sheet[0], 0)).toBe("No. Nota");

    expect(rowValue(sheet[1], 0)).toBe("NYB-20261027-0001");
    expect(rowValue(sheet[1], 3)).toBe("Thai Basil Chicken");
    expect(rowValue(sheet[1], 4)).toBe(2);
    expect(value(sheet[1][5])).toBe(20000);
    expect(value(sheet[1][6])).toBe(40000);
    expect(rowValue(sheet[1], 7)).toBe("Pedas");

    expect(rowValue(sheet[2], 3)).toBe("Es Teh Manis");
    expect(value(sheet[2][6])).toBe(4000);
  });
});

describe("buildSummarySheet", () => {
  it("counts paid and unpaid orders separately", () => {
    const unpaid = order({
      id: "order-2",
      receipt_number: "NYB-20261027-0002",
      payment_status: "BELUM_LUNAS",
      payment_method: "CASH",
      channel: "TAKEAWAY",
      total_amount: 15000,
      order_items: [],
    });
    const sheet = buildSummarySheet([order(), unpaid], 2026, 10);

    const byLabel = new Map<string, unknown[]>();
    for (const row of sheet) {
      const label = rowValue(row, 0);
      if (typeof label === "string") byLabel.set(label, row);
    }

    expect(rowValue(sheet[0], 0)).toBe("Rekap Transaksi — Oktober 2026");
    expect(rowValue(byLabel.get("Jumlah transaksi"), 1)).toBe(2);
    expect(rowValue(byLabel.get("Transaksi lunas"), 1)).toBe(1);
    expect(rowValue(byLabel.get("Belum lunas"), 1)).toBe(1);
    expect(value(byLabel.get("Omzet (Lunas)")?.[1])).toBe(44000);
    expect(value(byLabel.get("Nilai belum lunas")?.[1])).toBe(15000);
    expect(rowValue(byLabel.get("Total item terjual"), 1)).toBe(3);
    expect(value(byLabel.get("Rata-rata per transaksi (Lunas)")?.[1])).toBe(44000);
    expect(byLabel.get("Dine-In")).toBeTruthy();
    expect(byLabel.get("Takeaway")).toBeTruthy();
  });
});

describe("buildWorkbook", () => {
  it("returns three named sheets with frozen headers", () => {
    const sheets = buildWorkbook([order()], 2026, 10);
    expect(sheets.map((sheet) => sheet.sheet)).toEqual([
      "Transaksi",
      "Item",
      "Ringkasan",
    ]);
    expect(sheets[0].stickyRowsCount).toBe(1);
    expect(sheets[0].columns).toHaveLength(12);
    expect(sheets[1].columns).toHaveLength(8);
    expect(sheets[2].stickyRowsCount).toBe(0);
  });
});
