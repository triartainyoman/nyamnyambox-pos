import type { Cell, SheetData } from "write-excel-file/browser";

import { PAYMENT_STATUSES, channelMeta, paymentMethodLabel } from "@/lib/constants";
import type { Order } from "@/lib/types";
import { toBusinessDate } from "@/lib/utils";

export const MONTH_NAMES = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
] as const;

export interface ExportSheet {
  data: SheetData;
  sheet: string;
  columns: Array<{ width: number }>;
  stickyRowsCount: number;
}

const HEADER_BACKGROUND = "#FDE8D7";
const TITLE_BACKGROUND = "#F97316";

// `id-ID` formats times as "13.13"; a spreadsheet reads better with a colon.
const CLOCK_FORMAT = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Jakarta",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function clockTime(iso: string) {
  return CLOCK_FORMAT.format(new Date(iso));
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

/** Inclusive start / exclusive end ISO range for one Jakarta month. */
export function monthRange(year: number, month: number) {
  const start = new Date(`${year}-${pad(month)}-01T00:00:00+07:00`);
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  const end = new Date(`${nextYear}-${pad(nextMonth)}-01T00:00:00+07:00`);
  return { startISO: start.toISOString(), endISO: end.toISOString() };
}

export function monthLabel(year: number, month: number) {
  return `${MONTH_NAMES[month - 1] ?? month} ${year}`;
}

export function monthPeriodLabel(year: number, month: number) {
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `1–${days} ${monthLabel(year, month)} (WIB)`;
}

export function exportFileName(year: number, month: number) {
  return `Nyamnyambox-${year}-${pad(month)}.xlsx`;
}

function headerCell(value: string): Cell {
  return {
    value,
    fontWeight: "bold",
    backgroundColor: HEADER_BACKGROUND,
    align: "center",
    alignVertical: "center",
    wrap: true,
  };
}

function titleCell(value: string): Cell {
  return {
    value,
    fontWeight: "bold",
    fontSize: 14,
    backgroundColor: TITLE_BACKGROUND,
    textColor: "#FFFFFF",
    alignVertical: "center",
    height: 24,
  };
}

function moneyCell(value: number): Cell {
  return { value, type: Number, format: "#,##0" };
}

function statusLabel(status: Order["payment_status"]) {
  return PAYMENT_STATUSES.find((item) => item.value === status)?.label ?? status;
}

/** `2x Thai Basil Chicken (Pedas); 1x Es Teh Manis` */
export function itemSummary(items: Order["order_items"]) {
  if (!items?.length) return "";
  return items
    .map((item) => {
      const name = item.product?.name ?? "Item";
      const notes = item.notes ? ` (${item.notes})` : "";
      return `${item.quantity}x ${name}${notes}`;
    })
    .join("; ");
}

export function orderItemCount(order: Order) {
  return order.order_items?.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
}

export function buildTransactionSheet(orders: Order[]): SheetData {
  const header = [
    "No",
    "No. Nota",
    "Tanggal",
    "Jam",
    "Kasir",
    "Kanal",
    "Metode Bayar",
    "Status",
    "Jumlah Item",
    "Total (Rp)",
    "Diedit",
    "Rincian Item",
  ].map(headerCell);

  const rows = orders.map((order, index) => [
    index + 1,
    order.receipt_number,
    toBusinessDate(order.created_at),
    clockTime(order.created_at),
    order.cashier?.name ?? "-",
    channelMeta(order.channel).label,
    paymentMethodLabel(order.payment_method),
    statusLabel(order.payment_status),
    orderItemCount(order),
    moneyCell(order.total_amount),
    order.is_edited ? "Ya" : "-",
    itemSummary(order.order_items),
  ]);

  return [header, ...rows];
}

export function buildItemSheet(orders: Order[]): SheetData {
  const header = [
    "No. Nota",
    "Tanggal",
    "Jam",
    "Produk",
    "Qty",
    "Harga Satuan (Rp)",
    "Subtotal (Rp)",
    "Catatan",
  ].map(headerCell);

  const rows: SheetData = [];
  for (const order of orders) {
    const date = toBusinessDate(order.created_at);
    const time = clockTime(order.created_at);
    for (const item of order.order_items ?? []) {
      rows.push([
        order.receipt_number,
        date,
        time,
        item.product?.name ?? "Item",
        item.quantity,
        moneyCell(item.price_at_transaction),
        moneyCell(item.quantity * item.price_at_transaction),
        item.notes ?? "",
      ]);
    }
  }

  return [header, ...rows];
}

export function buildSummarySheet(orders: Order[], year: number, month: number): SheetData {
  const paid = orders.filter((order) => order.payment_status === "LUNAS");
  const unpaid = orders.filter((order) => order.payment_status !== "LUNAS");
  const revenue = paid.reduce((sum, order) => sum + order.total_amount, 0);
  const unpaidValue = unpaid.reduce((sum, order) => sum + order.total_amount, 0);
  const itemCount = orders.reduce((sum, order) => sum + orderItemCount(order), 0);
  const edited = orders.filter((order) => order.is_edited).length;
  const average = paid.length ? Math.round(revenue / paid.length) : 0;

  const channelRows: SheetData = [];
  const channels = new Map<string, { orders: number; revenue: number }>();
  for (const order of orders) {
    const label = channelMeta(order.channel).label;
    const current = channels.get(label) ?? { orders: 0, revenue: 0 };
    current.orders += 1;
    if (order.payment_status === "LUNAS") current.revenue += order.total_amount;
    channels.set(label, current);
  }
  for (const [label, value] of [...channels.entries()].sort((a, b) =>
    a[0].localeCompare(b[0]),
  )) {
    channelRows.push([label, value.orders, moneyCell(value.revenue)]);
  }

  return [
    [titleCell(`Rekap Transaksi — ${monthLabel(year, month)}`)],
    [`Periode: ${monthPeriodLabel(year, month)}`],
    [],
    ["Ringkasan", "Nilai"],
    ["Jumlah transaksi", orders.length],
    ["Transaksi lunas", paid.length],
    ["Belum lunas", unpaid.length],
    ["Omzet (Lunas)", moneyCell(revenue)],
    ["Nilai belum lunas", moneyCell(unpaidValue)],
    ["Total item terjual", itemCount],
    ["Rata-rata per transaksi (Lunas)", moneyCell(average)],
    ["Transaksi diedit", edited],
    [],
    ["Per kanal", "Transaksi", "Omzet (Lunas)"].map(headerCell),
    ...channelRows,
  ];
}

/**
 * Workbook shape for `write-excel-file/browser`. The library is imported
 * dynamically by the UI so it never lands in the initial bundle.
 */
export function buildWorkbook(orders: Order[], year: number, month: number): ExportSheet[] {
  return [
    {
      data: buildTransactionSheet(orders),
      sheet: "Transaksi",
      columns: [
        { width: 5 },
        { width: 20 },
        { width: 12 },
        { width: 7 },
        { width: 16 },
        { width: 12 },
        { width: 14 },
        { width: 13 },
        { width: 12 },
        { width: 13 },
        { width: 8 },
        { width: 46 },
      ],
      stickyRowsCount: 1,
    },
    {
      data: buildItemSheet(orders),
      sheet: "Item",
      columns: [
        { width: 20 },
        { width: 12 },
        { width: 7 },
        { width: 30 },
        { width: 6 },
        { width: 16 },
        { width: 15 },
        { width: 24 },
      ],
      stickyRowsCount: 1,
    },
    {
      data: buildSummarySheet(orders, year, month),
      sheet: "Ringkasan",
      columns: [{ width: 32 }, { width: 14 }, { width: 18 }],
      stickyRowsCount: 0,
    },
  ];
}
