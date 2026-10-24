import { channelMeta, paymentMethodLabel } from "@/lib/constants";
import { formatRupiah } from "@/lib/utils";
import { formatDate } from "@/lib/utils";
import type { Order } from "@/lib/types";

export function receiptItemLines(order: Order) {
  return (order.order_items ?? []).map((item) => {
    const name = item.product?.name ?? "Produk";
    const line = `${item.quantity}x ${name} — ${formatRupiah(
      item.price_at_transaction * item.quantity,
    )}`;
    return item.notes ? `${line}\n   Catatan: ${item.notes}` : line;
  });
}

export function buildReceiptMessage(order: Order) {
  const items = receiptItemLines(order).join("\n");
  const status = order.payment_status === "LUNAS" ? "Lunas" : "Belum Lunas";

  return [
    "Halo Kak, terima kasih sudah memesan di *Nyamnyambox*! 🙏",
    "Berikut rincian pesanan Kakak:",
    "",
    `No. Nota: #${order.receipt_number}`,
    `Tanggal: ${formatDate(order.created_at)}`,
    `Kasir: ${order.cashier?.name ?? "-"}`,
    `Kanal: ${channelMeta(order.channel).label}`,
    "",
    "Detail Pesanan:",
    items,
    "--------------------------------",
    `Total: ${formatRupiah(order.total_amount)}`,
    `Metode: ${paymentMethodLabel(order.payment_method)} (${status})`,
    "",
    "Pesanan sedang diproses. Selamat menikmati! 🍱",
  ].join("\n");
}

export function buildWhatsAppUrl(order: Order) {
  const text = encodeURIComponent(buildReceiptMessage(order));
  const phone = order.customer_phone?.replace(/[^\d]/g, "");
  const normalized = phone
    ? phone.startsWith("0")
      ? `62${phone.slice(1)}`
      : phone.startsWith("62")
        ? phone
        : `62${phone}`
    : "";
  return normalized ? `https://wa.me/${normalized}?text=${text}` : `https://wa.me/?text=${text}`;
}

export function openReceiptWhatsApp(order: Order) {
  window.open(buildWhatsAppUrl(order), "_blank", "noopener,noreferrer");
}
