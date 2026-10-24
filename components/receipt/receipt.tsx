import { channelMeta, paymentMethodLabel } from "@/lib/constants";
import type { Order } from "@/lib/types";
import { cn, formatDate, formatRupiah } from "@/lib/utils";

export function Receipt({ order, className }: { order: Order; className?: string }) {
  const channel = channelMeta(order.channel);
  const items = order.order_items ?? [];

  return (
    <div
      className={cn(
        "mx-auto w-full max-w-[320px] rounded-xl bg-white p-4 font-mono text-[11px] leading-relaxed text-black shadow-sm",
        className,
      )}
    >
      <div className="text-center">
        <p className="text-[15px] font-extrabold tracking-tight">NYAMNYAMBOX</p>
        <p className="text-[10px]">Ricebowl &amp; Snacks</p>
        <p className="text-[10px]">Terima kasih sudah memesan 🙏</p>
      </div>

      <div className="my-3 border-t border-dashed border-black/40" />

      <div className="space-y-0.5 text-[10px]">
        <div className="flex justify-between gap-3">
          <span>No. Nota</span>
          <span className="font-bold">{order.receipt_number}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span>Tanggal</span>
          <span>{formatDate(order.created_at)}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span>Kasir</span>
          <span>{order.cashier?.name ?? "-"}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span>Kanal</span>
          <span>{channel.label}</span>
        </div>
      </div>

      <div className="my-3 border-t border-dashed border-black/40" />

      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id}>
            <div className="flex justify-between gap-2 font-semibold">
              <span className="min-w-0">
                {item.quantity}x {item.product?.name ?? "Produk"}
              </span>
              <span className="shrink-0">
                {formatRupiah(item.price_at_transaction * item.quantity)}
              </span>
            </div>
            <div className="flex justify-between gap-2 text-[10px] text-black/60">
              <span>@ {formatRupiah(item.price_at_transaction)}</span>
            </div>
            {item.notes ? (
              <p className="text-[10px] italic text-black/70">Catatan: {item.notes}</p>
            ) : null}
          </div>
        ))}
      </div>

      <div className="my-3 border-t border-dashed border-black/40" />

      <div className="flex justify-between text-[13px] font-extrabold">
        <span>TOTAL</span>
        <span>{formatRupiah(order.total_amount)}</span>
      </div>
      <div className="mt-1 space-y-0.5 text-[10px]">
        <div className="flex justify-between">
          <span>Metode</span>
          <span>{paymentMethodLabel(order.payment_method)}</span>
        </div>
        <div className="flex justify-between">
          <span>Status</span>
          <span className="font-bold">
            {order.payment_status === "LUNAS" ? "LUNAS" : "BELUM LUNAS"}
          </span>
        </div>
        {order.customer_phone ? (
          <div className="flex justify-between">
            <span>WhatsApp</span>
            <span>{order.customer_phone}</span>
          </div>
        ) : null}
        {order.is_edited ? (
          <p className="pt-1 text-center text-[9px] italic">* Transaksi telah diedit</p>
        ) : null}
      </div>

      <div className="my-3 border-t border-dashed border-black/40" />

      <div className="space-y-0.5 text-center text-[10px]">
        <p className="font-semibold">Pesanan sedang diproses 🍱</p>
        <p>Simpan nota ini sebagai bukti pembayaran.</p>
        <p className="pt-1 text-[9px]">nyamnyambox.com</p>
      </div>
    </div>
  );
}
