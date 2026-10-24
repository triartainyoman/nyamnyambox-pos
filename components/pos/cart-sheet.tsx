/* eslint-disable @next/next/no-img-element */
"use client";

import { useState } from "react";
import { Loader2, Minus, Phone, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ORDER_CHANNELS, PAYMENT_METHODS, SPICE_PRESETS } from "@/lib/constants";
import { friendlyError } from "@/lib/errors";
import { useCreateOrder } from "@/lib/hooks/use-orders";
import type { Order, OrderChannel, PaymentMethod, PaymentStatus } from "@/lib/types";
import { cn, formatRupiah } from "@/lib/utils";
import { useCartStore } from "@/stores/useCartStore";

export function CartSheet({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (order: Order) => void;
}) {
  const items = useCartStore((state) => state.items);
  const increment = useCartStore((state) => state.increment);
  const decrement = useCartStore((state) => state.decrement);
  const remove = useCartStore((state) => state.remove);
  const setNotes = useCartStore((state) => state.setNotes);
  const clear = useCartStore((state) => state.clear);

  const [channel, setChannel] = useState<OrderChannel>("DINE_IN");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("LUNAS");
  const [phone, setPhone] = useState("");
  const [notesFor, setNotesFor] = useState<string | null>(null);

  const createOrder = useCreateOrder();

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  async function handleSubmit() {
    if (!items.length) return;
    try {
      const order = await createOrder.mutateAsync({
        channel,
        payment_method: paymentMethod,
        payment_status: paymentStatus,
        customer_phone: phone.trim() || null,
        items: items.map((item) => ({
          product_id: item.productId,
          quantity: item.quantity,
          notes: item.notes.trim() || null,
        })),
      });

      toast.success(`Pesanan ${order.receipt_number} berhasil dibuat`);
      clear();
      setPhone("");
      setChannel("DINE_IN");
      setPaymentMethod("CASH");
      setPaymentStatus("LUNAS");
      onOpenChange(false);
      onCreated(order);
    } catch (error) {
      toast.error(friendlyError(error, "Gagal membuat pesanan"));
    }
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) setNotesFor(null);
        onOpenChange(nextOpen);
      }}
    >
      <SheetContent>
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ShoppingBag className="size-4 text-orange-600" />
            Pesanan
            {totalItems > 0 && (
              <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-bold text-orange-700">
                {totalItems} item
              </span>
            )}
          </SheetTitle>
          <SheetDescription>
            Periksa item, pilih kanal &amp; pembayaran, lalu konfirmasi.
          </SheetDescription>
        </SheetHeader>

        <SheetBody className="space-y-5">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border py-12 text-center">
              <ShoppingBag className="size-8 text-stone-300" />
              <p className="text-sm font-medium text-stone-600">Keranjang masih kosong</p>
              <p className="text-xs text-muted-foreground">Ketuk menu untuk menambahkan pesanan.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Item Pesanan
                </p>
                <button
                  type="button"
                  onClick={() => clear()}
                  className="flex items-center gap-1 text-[11px] font-medium text-red-600 hover:underline"
                >
                  <Trash2 className="size-3" /> Kosongkan
                </button>
              </div>

              {items.map((item) => (
                <div key={item.productId} className="rounded-2xl border border-border/80 bg-card p-2.5">
                  <div className="flex gap-2.5">
                    <img
                      src={item.imageUrl ?? "/images/placeholder.svg"}
                      alt={item.name}
                      className="size-14 shrink-0 rounded-xl bg-orange-50 object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="line-clamp-2 text-[13px] font-semibold leading-snug">
                          {item.name}
                        </p>
                        <button
                          type="button"
                          onClick={() => remove(item.productId)}
                          className="rounded-md p-1 text-stone-400 hover:bg-red-50 hover:text-red-600"
                          aria-label={`Hapus ${item.name}`}
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {formatRupiah(item.price)}
                      </p>

                      <div className="mt-2 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1 rounded-full border border-border bg-muted/40 p-0.5">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            className="size-6 rounded-full"
                            onClick={() => decrement(item.productId)}
                            aria-label="Kurangi"
                          >
                            <Minus className="size-3" />
                          </Button>
                          <span className="min-w-5 text-center text-xs font-bold">{item.quantity}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            className="size-6 rounded-full"
                            onClick={() => increment(item.productId)}
                            aria-label="Tambah"
                          >
                            <Plus className="size-3" />
                          </Button>
                        </div>
                        <p className="text-sm font-extrabold text-stone-900">
                          {formatRupiah(item.price * item.quantity)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {notesFor === item.productId ? (
                    <div className="mt-2.5 space-y-2 border-t border-dashed border-border pt-2.5">
                      <div className="flex flex-wrap gap-1.5">
                        {SPICE_PRESETS.map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() =>
                              setNotes(
                                item.productId,
                                item.notes === preset ? "" : preset,
                              )
                            }
                            className={cn(
                              "rounded-full border px-2.5 py-1 text-[10px] font-semibold transition-colors",
                              item.notes === preset
                                ? "border-orange-500 bg-orange-50 text-orange-700"
                                : "border-border text-stone-600 hover:border-orange-200",
                            )}
                          >
                            {preset}
                          </button>
                        ))}
                      </div>
                      <Input
                        value={item.notes}
                        onChange={(event) => setNotes(item.productId, event.target.value)}
                        placeholder="Catatan lain (mis. nasi tambah, tanpa sambal)"
                        className="h-9 text-xs"
                      />
                      <div className="flex justify-end">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-7 text-[11px]"
                          onClick={() => setNotesFor(null)}
                        >
                          Simpan catatan
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setNotesFor(item.productId)}
                      className="mt-2 flex w-full items-center justify-between gap-2 rounded-lg bg-muted/50 px-2 py-1.5 text-left text-[11px] text-muted-foreground hover:bg-muted"
                    >
                      <span className="truncate">
                        {item.notes ? `Catatan: ${item.notes}` : "Tambah catatan item"}
                      </span>
                      <Plus className="size-3 shrink-0" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2">
            <Label>Kanal Pesanan</Label>
            <div className="grid grid-cols-2 gap-1.5">
              {ORDER_CHANNELS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setChannel(option.value)}
                  className={cn(
                    "rounded-xl border px-3 py-2.5 text-xs font-semibold transition-colors",
                    channel === option.value
                      ? "border-orange-500 bg-orange-50 text-orange-700"
                      : "border-border bg-card text-stone-600 hover:border-orange-200",
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Metode Pembayaran</Label>
            <div className="grid grid-cols-2 gap-1.5">
              {PAYMENT_METHODS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setPaymentMethod(option.value)}
                  className={cn(
                    "rounded-xl border px-3 py-2.5 text-xs font-semibold transition-colors",
                    paymentMethod === option.value
                      ? "border-orange-500 bg-orange-50 text-orange-700"
                      : "border-border bg-card text-stone-600 hover:border-orange-200",
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Status Pembayaran</Label>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => setPaymentStatus("LUNAS")}
                className={cn(
                  "rounded-xl border px-3 py-2.5 text-xs font-semibold transition-colors",
                  paymentStatus === "LUNAS"
                    ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                    : "border-border bg-card text-stone-600",
                )}
              >
                Lunas
              </button>
              <button
                type="button"
                onClick={() => setPaymentStatus("BELUM_LUNAS")}
                className={cn(
                  "rounded-xl border px-3 py-2.5 text-xs font-semibold transition-colors",
                  paymentStatus === "BELUM_LUNAS"
                    ? "border-amber-500 bg-amber-50 text-amber-700"
                    : "border-border bg-card text-stone-600",
                )}
              >
                Belum Lunas
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="customer-phone">Nomor WhatsApp Pelanggan (opsional)</Label>
            <div className="relative">
              <Phone className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="customer-phone"
                inputMode="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="0812xxxxxxx"
                className="pl-9"
              />
            </div>
            <p className="text-[10px] text-muted-foreground">
              Dipakai untuk mengirim rincian nota lewat WhatsApp setelah pesanan dibuat.
            </p>
          </div>
        </SheetBody>

        <SheetFooter>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Total</p>
              <p className="text-xl font-extrabold text-stone-900">{formatRupiah(totalPrice)}</p>
            </div>
            <Select value={paymentStatus} onValueChange={(value) => setPaymentStatus(value as PaymentStatus)}>
              <SelectTrigger className="h-9 w-auto gap-2 border-dashed text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LUNAS">Lunas</SelectItem>
                <SelectItem value="BELUM_LUNAS">Belum Lunas</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            size="lg"
            className="w-full"
            disabled={!items.length || createOrder.isPending}
            onClick={handleSubmit}
          >
            {createOrder.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ShoppingBag className="size-4" />
            )}
            {createOrder.isPending ? "Menyimpan..." : "Konfirmasi & Proses Pesanan"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
