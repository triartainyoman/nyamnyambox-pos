"use client";

import { useRef, useState } from "react";
import {
  ClipboardList,
  Loader2,
  MessageCircle,
  Minus,
  Plus,
  ReceiptText,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { ChannelBadge, EditedBadge, PaymentBadge } from "@/components/order-badges";
import { Receipt } from "@/components/receipt/receipt";
import { ReceiptSizeToggle } from "@/components/receipt/receipt-size-toggle";
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
import { PAYMENT_METHODS } from "@/lib/constants";
import { friendlyError } from "@/lib/errors";
import { useProducts } from "@/lib/hooks/use-products";
import { useReceiptSize } from "@/lib/hooks/use-receipt-size";
import { useUpdateOrder } from "@/lib/hooks/use-orders";
import type { Order, PaymentMethod, PaymentStatus } from "@/lib/types";
import { formatDate, formatRupiah } from "@/lib/utils";

interface EditableItem {
  product_id: string;
  name: string;
  price: number;
  quantity: number;
  notes: string;
}

export function OrderDetailSheet({
  order,
  open,
  onOpenChange,
  onUpdated,
}: {
  order: Order;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: (order: Order) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [items, setItems] = useState<EditableItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(order.payment_method);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(order.payment_status);
  const [phone, setPhone] = useState(order.customer_phone ?? "");
  const [addProductId, setAddProductId] = useState("");

  const { data: products } = useProducts(true);
  const updateOrder = useUpdateOrder();
  // `disabled` only applies after React re-renders; guard the same-tick double
  // click so one save cannot run twice.
  const savingRef = useRef(false);
  const [receiptSize, setReceiptSize] = useReceiptSize();

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  function startEditing() {
    setItems(
      (order.order_items ?? []).map((item) => ({
        product_id: item.product_id,
        name: item.product?.name ?? "Produk",
        price: item.price_at_transaction,
        quantity: item.quantity,
        notes: item.notes ?? "",
      })),
    );
    setPaymentMethod(order.payment_method);
    setPaymentStatus(order.payment_status);
    setPhone(order.customer_phone ?? "");
    setEditing(true);
  }

  function cancelEditing() {
    setEditing(false);
    setAddProductId("");
  }

  function addProduct() {
    if (!addProductId) return;
    const product = products?.find((candidate) => candidate.id === addProductId);
    if (!product) return;
    setItems((current) => {
      const existing = current.find((item) => item.product_id === product.id);
      if (existing) {
        return current.map((item) =>
          item.product_id === product.id ? { ...item, quantity: item.quantity + 1 } : item,
        );
      }
      return [
        ...current,
        {
          product_id: product.id,
          name: product.name,
          price: product.price,
          quantity: 1,
          notes: "",
        },
      ];
    });
    setAddProductId("");
  }

  function updateQuantity(productId: string, delta: number) {
    setItems((current) =>
      current
        .map((item) =>
          item.product_id === productId
            ? { ...item, quantity: item.quantity + delta }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );
  }

  function updateNotes(productId: string, notes: string) {
    setItems((current) =>
      current.map((item) => (item.product_id === productId ? { ...item, notes } : item)),
    );
  }

  async function save() {
    if (!items.length) {
      toast.error("Pesanan harus memiliki minimal satu item.");
      return;
    }
    if (savingRef.current) return;
    savingRef.current = true;
    try {
      const updated = await updateOrder.mutateAsync({
        order_id: order.id,
        payment_method: paymentMethod,
        payment_status: paymentStatus,
        customer_phone: phone.trim() || null,
        items: items.map((item) => ({
          product_id: item.product_id,
          quantity: item.quantity,
          notes: item.notes.trim() || null,
        })),
      });
      toast.success("Transaksi berhasil diperbarui");
      onUpdated(updated);
      setEditing(false);
    } catch (error) {
      toast.error(friendlyError(error, "Gagal memperbarui transaksi"));
    } finally {
      savingRef.current = false;
    }
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent>
        <SheetHeader>
          <SheetTitle className="flex flex-wrap items-center gap-2">
            {order.receipt_number}
            <PaymentBadge status={order.payment_status} />
            {order.is_edited && <EditedBadge />}
          </SheetTitle>
          <SheetDescription>
            {formatDate(order.created_at)} · {order.cashier?.name ?? "-"}
          </SheetDescription>
        </SheetHeader>

        <SheetBody className="space-y-4">
          {!editing ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <ChannelBadge channel={order.channel} />
                <span className="text-xs text-muted-foreground">
                  {order.order_items?.length ?? 0} jenis item ·{" "}
                  {order.order_items?.reduce((sum, item) => sum + item.quantity, 0) ?? 0} pcs
                </span>
                <ReceiptSizeToggle
                  value={receiptSize}
                  onChange={setReceiptSize}
                  className="ml-auto"
                />
              </div>

              <div className="rounded-2xl bg-stone-100 p-3">
                <Receipt order={order} />
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Item Pesanan</Label>
                <div className="space-y-2">
                  {items.map((item) => (
                    <div key={item.product_id} className="rounded-xl border border-border bg-card p-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="line-clamp-2 text-xs font-semibold">{item.name}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {formatRupiah(item.price)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setItems((current) =>
                              current.filter((entry) => entry.product_id !== item.product_id),
                            )
                          }
                          className="rounded-md p-1 text-stone-400 hover:bg-red-50 hover:text-red-600"
                          aria-label="Hapus item"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <div className="flex items-center gap-1 rounded-full border border-border bg-muted/40 p-0.5">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            className="size-6 rounded-full"
                            onClick={() => updateQuantity(item.product_id, -1)}
                          >
                            <Minus className="size-3" />
                          </Button>
                          <span className="min-w-5 text-center text-xs font-bold">
                            {item.quantity}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            className="size-6 rounded-full"
                            onClick={() => updateQuantity(item.product_id, 1)}
                          >
                            <Plus className="size-3" />
                          </Button>
                        </div>
                        <p className="text-xs font-bold">
                          {formatRupiah(item.price * item.quantity)}
                        </p>
                      </div>
                      <Input
                        value={item.notes}
                        onChange={(event) => updateNotes(item.product_id, event.target.value)}
                        placeholder="Catatan item (opsional)"
                        className="mt-2 h-8 text-[11px]"
                      />
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Select value={addProductId} onValueChange={setAddProductId}>
                    <SelectTrigger className="h-9 flex-1 text-xs">
                      <SelectValue placeholder="Tambah item..." />
                    </SelectTrigger>
                    <SelectContent>
                      {products?.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name.replace(/^\[PROMO\]\s*/, "")} · {formatRupiah(product.price)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button type="button" variant="outline" size="sm" onClick={addProduct}>
                    <Plus className="size-3.5" /> Tambah
                  </Button>
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
                      className={
                        paymentMethod === option.value
                          ? "rounded-xl border border-orange-500 bg-orange-50 px-3 py-2 text-xs font-semibold text-orange-700"
                          : "rounded-xl border border-border px-3 py-2 text-xs font-semibold text-stone-600"
                      }
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
                    className={
                      paymentStatus === "LUNAS"
                        ? "rounded-xl border border-emerald-500 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700"
                        : "rounded-xl border border-border px-3 py-2 text-xs font-semibold text-stone-600"
                    }
                  >
                    Lunas
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentStatus("BELUM_LUNAS")}
                    className={
                      paymentStatus === "BELUM_LUNAS"
                        ? "rounded-xl border border-amber-500 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700"
                        : "rounded-xl border border-border px-3 py-2 text-xs font-semibold text-stone-600"
                    }
                  >
                    Belum Lunas
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-phone">Nomor WhatsApp Pelanggan</Label>
                <Input
                  id="edit-phone"
                  inputMode="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="0812xxxxxxx"
                  className="h-10"
                />
              </div>

              <div className="flex items-center justify-between rounded-xl bg-muted/60 px-3 py-2.5">
                <span className="text-xs font-medium text-muted-foreground">Total baru</span>
                <span className="text-base font-extrabold">{formatRupiah(total)}</span>
              </div>
            </div>
          )}
        </SheetBody>

        <SheetFooter>
          {!editing ? (
            <div className="grid grid-cols-3 gap-2">
              <Button variant="outline" size="sm" onClick={() => window.print()}>
                <ReceiptText className="size-3.5" /> Cetak
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={startEditing}
              >
                <ClipboardList className="size-3.5" /> Edit
              </Button>
              <Button
                size="sm"
                onClick={async () => {
                  const { openReceiptWhatsApp } = await import("@/lib/whatsapp");
                  openReceiptWhatsApp(order);
                }}
              >
                <MessageCircle className="size-3.5" /> Kirim WA
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={cancelEditing}>
                Batal
              </Button>
              <Button className="flex-1" onClick={save} disabled={updateOrder.isPending}>
                {updateOrder.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                {updateOrder.isPending ? "Menyimpan..." : "Simpan Perubahan"}
              </Button>
            </div>
          )}
        </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Print-only copy, outside the sheet so nothing clips it. */}
      {open ? (
        <>
          <style>{`@media print { @page { size: ${receiptSize}mm auto; margin: 2mm; } }`}</style>
          <div className="hidden print:block">
            <Receipt order={order} className={`receipt-print receipt-${receiptSize}`} />
          </div>
        </>
      ) : null}
    </>
  );
}
