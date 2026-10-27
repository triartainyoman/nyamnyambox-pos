/**
 * CSV helpers for the bookkeeping export (`scripts/export-orders.mjs`).
 *
 * Kept in plain ESM so the script can run with bare `node` (no build step),
 * and unit-tested from `tests/unit/export-csv.test.ts`.
 */

export const ORDER_CSV_COLUMNS = [
  "receipt_number",
  "created_at_local",
  "channel",
  "payment_method",
  "payment_status",
  "total_amount",
  "cashier",
  "items",
  "is_edited",
];

const CHANNEL_LABELS = {
  DINE_IN: "Dine-in",
  TAKEAWAY: "Takeaway",
  GRABFOOD: "GrabFood",
  SHOPEEFOOD: "ShopeeFood",
  WHATSAPP: "WhatsApp",
};

const PAYMENT_LABELS = {
  CASH: "Cash",
  TRANSFER: "Transfer",
  QRIS: "QRIS",
  E_WALLET: "E-Wallet",
};

const STATUS_LABELS = {
  LUNAS: "Lunas",
  BELUM_LUNAS: "Belum Lunas",
};

const JAKARTA_FORMAT = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Asia/Jakarta",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** RFC 4180 escaping: quote when the value contains a delimiter or newline. */
export function csvEscape(value) {
  const text = value === null || value === undefined ? "" : String(value);
  if (/[",\r\n;]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

/** `2026-10-27T06:13:20.000Z` → `2026-10-27 13:13` (Asia/Jakarta). */
export function jakartaTimestamp(iso) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return JAKARTA_FORMAT.format(date).replace("T", " ");
}

export function itemSummary(items) {
  if (!Array.isArray(items) || items.length === 0) return "";
  return items
    .map((item) => {
      const name = item?.product?.name ?? "Item";
      const quantity = Number(item?.quantity ?? 0);
      const notes = item?.notes ? ` (${item.notes})` : "";
      return `${quantity}x ${name}${notes}`;
    })
    .join("; ");
}

function cell(order, column) {
  switch (column) {
    case "receipt_number":
      return order.receipt_number ?? "";
    case "created_at_local":
      return jakartaTimestamp(order.created_at);
    case "channel":
      return CHANNEL_LABELS[order.channel] ?? order.channel ?? "";
    case "payment_method":
      return PAYMENT_LABELS[order.payment_method] ?? order.payment_method ?? "";
    case "payment_status":
      return STATUS_LABELS[order.payment_status] ?? order.payment_status ?? "";
    case "total_amount":
      // Plain integer rupiah: Excel/Sheets read it as a number.
      return Number(order.total_amount ?? 0);
    case "cashier":
      return order.cashier?.name ?? "";
    case "items":
      return itemSummary(order.order_items);
    case "is_edited":
      return order.is_edited ? "YA" : "TIDAK";
    default:
      return "";
  }
}

/** Build the CSV text (CRLF line endings, no BOM). */
export function ordersToCsv(orders) {
  const lines = [ORDER_CSV_COLUMNS.join(",")];
  for (const order of orders) {
    lines.push(ORDER_CSV_COLUMNS.map((column) => csvEscape(cell(order, column))).join(","));
  }
  return `${lines.join("\r\n")}\r\n`;
}

/** Excel on Windows needs a BOM to detect UTF-8. */
export function withBom(csv) {
  return `\uFEFF${csv}`;
}
