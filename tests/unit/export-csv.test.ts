import { describe, expect, it } from "vitest";

import {
  ORDER_CSV_COLUMNS,
  csvEscape,
  itemSummary,
  jakartaTimestamp,
  ordersToCsv,
  withBom,
} from "../../scripts/lib/csv.mjs";

function order(overrides: Record<string, unknown> = {}) {
  return {
    receipt_number: "NYB-20261027-0001",
    created_at: "2026-10-27T06:13:20.000Z",
    channel: "DINE_IN",
    payment_method: "QRIS",
    payment_status: "LUNAS",
    total_amount: 40000,
    is_edited: false,
    cashier: { name: "Rizky" },
    order_items: [
      {
        quantity: 2,
        price_at_transaction: 20000,
        notes: "Pedas",
        product: { name: "Thai Basil Chicken" },
      },
      { quantity: 1, price_at_transaction: 4000, notes: null, product: { name: "Es Teh Manis" } },
    ],
    ...overrides,
  };
}

describe("csvEscape", () => {
  it("leaves plain values alone", () => {
    expect(csvEscape("Thai Basil Chicken")).toBe("Thai Basil Chicken");
    expect(csvEscape(40000)).toBe("40000");
  });

  it("quotes delimiters, quotes and newlines", () => {
    expect(csvEscape("nasi, ayam")).toBe('"nasi, ayam"');
    expect(csvEscape('extra "pedas"')).toBe('"extra ""pedas"""');
    expect(csvEscape("baris 1\nbaris 2")).toBe('"baris 1\nbaris 2"');
  });

  it("renders null and undefined as empty cells", () => {
    expect(csvEscape(null)).toBe("");
    expect(csvEscape(undefined)).toBe("");
  });
});

describe("jakartaTimestamp", () => {
  it("converts UTC to Asia/Jakarta (UTC+7)", () => {
    expect(jakartaTimestamp("2026-10-27T06:13:20.000Z")).toBe("2026-10-27 13:13");
    expect(jakartaTimestamp("2026-10-27T17:05:00.000Z")).toBe("2026-10-28 00:05");
  });

  it("returns an empty cell for missing or invalid values", () => {
    expect(jakartaTimestamp(null)).toBe("");
    expect(jakartaTimestamp("not-a-date")).toBe("");
  });
});

describe("itemSummary", () => {
  it("joins quantity, product name and notes", () => {
    expect(itemSummary(order().order_items)).toBe(
      "2x Thai Basil Chicken (Pedas); 1x Es Teh Manis",
    );
  });

  it("handles missing items", () => {
    expect(itemSummary(undefined)).toBe("");
    expect(itemSummary([])).toBe("");
  });
});

describe("ordersToCsv", () => {
  it("writes the documented header", () => {
    expect(ordersToCsv([])).toBe(`${ORDER_CSV_COLUMNS.join(",")}\r\n`);
  });

  it("writes one row per order with human-readable labels", () => {
    const csv = ordersToCsv([order()]);
    const [header, row] = csv.trimEnd().split("\r\n");

    expect(header).toBe(ORDER_CSV_COLUMNS.join(","));
    expect(row).toBe(
      [
        "NYB-20261027-0001",
        "2026-10-27 13:13",
        "Dine-in",
        "QRIS",
        "Lunas",
        "40000",
        "Rizky",
        '"2x Thai Basil Chicken (Pedas); 1x Es Teh Manis"',
        "TIDAK",
      ].join(","),
    );
  });

  it("marks edited orders", () => {
    const csv = ordersToCsv([order({ is_edited: true })]);
    expect(csv.trimEnd().split("\r\n")[1].endsWith(",YA")).toBe(true);
  });

  it("uses CRLF line endings and escapes notes with commas", () => {
    const csv = ordersToCsv([
      order({
        order_items: [
          { quantity: 1, notes: "tanpa sambal, extra nasi", product: { name: "Ayam" } },
        ],
      }),
    ]);
    expect(csv).toContain(',"1x Ayam (tanpa sambal, extra nasi)",TIDAK');
  });
});

describe("withBom", () => {
  it("prefixes the UTF-8 BOM for Excel", () => {
    expect(withBom("a,b\r\n")).toBe("\uFEFFa,b\r\n");
  });
});
