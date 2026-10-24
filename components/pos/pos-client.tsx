"use client";

import { useState } from "react";
import { AlertCircle, ArrowRight, RefreshCw, ShoppingBag, Sparkles } from "lucide-react";

import { ProductCard } from "@/components/pos/product-card";
import { CartSheet } from "@/components/pos/cart-sheet";
import { ReceiptModal } from "@/components/receipt/receipt-modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useProducts } from "@/lib/hooks/use-products";
import { formatRupiah, todayLabel } from "@/lib/utils";
import type { Order } from "@/lib/types";
import { useCartStore } from "@/stores/useCartStore";

export function PosClient({ cashierName }: { cashierName: string }) {
  const { data: products, isLoading, isError, error, refetch } = useProducts(true);
  const [cartOpen, setCartOpen] = useState(false);
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null);

  const items = useCartStore((state) => state.items);
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const firstName = cashierName.split(" ")[0];

  return (
    <div className="space-y-5">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-orange-600">
            {todayLabel()}
          </p>
          <h1 className="mt-0.5 text-xl font-extrabold tracking-tight md:text-2xl">
            Halo, {firstName} 👋
          </h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Pilih menu untuk mulai mencatat pesanan baru.
          </p>
        </div>
        <Badge variant="success" className="mt-1 shrink-0">
          <Sparkles className="size-3" />
          {isLoading ? "Memuat..." : `${products?.length ?? 0} menu aktif`}
        </Badge>
      </header>

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-6">
        <section>
          <div className="mb-2.5 flex items-end justify-between">
            <h2 className="text-sm font-bold">Menu Hari Ini</h2>
            <span className="text-[11px] text-muted-foreground">Ketuk menu untuk menambah</span>
          </div>

          {isError ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-red-200 bg-red-50/50 py-12 text-center">
              <AlertCircle className="size-8 text-red-500" />
              <div>
                <p className="text-sm font-semibold text-red-700">Gagal memuat menu</p>
                <p className="text-xs text-red-600/80">
                  {error instanceof Error ? error.message : "Terjadi kesalahan"}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="size-3.5" /> Coba lagi
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4">
              {isLoading
                ? Array.from({ length: 8 }).map((_, index) => (
                    <div key={index} className="rounded-2xl border border-border/70 bg-card p-2">
                      <Skeleton className="aspect-square w-full" />
                      <Skeleton className="mt-2 h-3.5 w-4/5" />
                      <Skeleton className="mt-1.5 h-4 w-1/2" />
                    </div>
                  ))
                : products?.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
            </div>
          )}

          {!isLoading && !isError && products?.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border py-12 text-center">
              <p className="text-sm font-semibold">Belum ada menu aktif</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Aktifkan menu dari halaman Menu &amp; Promo.
              </p>
            </div>
          )}
        </section>

        <aside className="sticky top-6 hidden lg:block">
          <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-bold">
                <ShoppingBag className="size-4 text-orange-600" /> Pesanan
              </h2>
              <Badge variant="secondary">{totalItems} item</Badge>
            </div>

            {items.length === 0 ? (
              <div className="mt-6 flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-8 text-center">
                <ShoppingBag className="size-7 text-stone-300" />
                <p className="text-xs text-muted-foreground">
                  Keranjang kosong.
                  <br />
                  Pilih menu di samping.
                </p>
              </div>
            ) : (
              <div className="mt-3 space-y-2">
                {items.slice(0, 4).map((item) => (
                  <div key={item.productId} className="flex items-start justify-between gap-2 text-xs">
                    <span className="min-w-0">
                      <span className="font-semibold text-orange-600">{item.quantity}x</span>{" "}
                      <span className="line-clamp-1 font-medium">{item.name}</span>
                      {item.notes ? (
                        <span className="block text-[10px] text-muted-foreground">
                          {item.notes}
                        </span>
                      ) : null}
                    </span>
                    <span className="shrink-0 font-semibold">
                      {formatRupiah(item.price * item.quantity)}
                    </span>
                  </div>
                ))}
                {items.length > 4 && (
                  <p className="text-[10px] text-muted-foreground">
                    +{items.length - 4} item lainnya
                  </p>
                )}
              </div>
            )}

            <div className="mt-4 border-t border-dashed border-border pt-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Total</span>
                <span className="text-lg font-extrabold">{formatRupiah(totalPrice)}</span>
              </div>
              <Button
                className="mt-3 w-full"
                disabled={totalItems === 0}
                onClick={() => setCartOpen(true)}
              >
                Lihat Pesanan <ArrowRight className="size-4" />
              </Button>
            </div>
          </div>
        </aside>
      </div>

      {totalItems > 0 && (
        <div className="fixed inset-x-3 bottom-[calc(4.9rem+env(safe-area-inset-bottom))] z-30 md:hidden">
          <button
            type="button"
            onClick={() => setCartOpen(true)}
            className="animate-slide-up flex w-full items-center gap-3 rounded-2xl bg-stone-900 px-4 py-3 text-left text-white shadow-xl shadow-stone-900/25 active:scale-[0.99]"
          >
            <span className="relative flex size-10 items-center justify-center rounded-xl bg-white/10">
              <ShoppingBag className="size-5" />
              <span className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-orange-500 text-[10px] font-bold">
                {totalItems}
              </span>
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[10px] uppercase tracking-wide text-white/60">
                Total pesanan
              </span>
              <span className="block text-base font-extrabold">{formatRupiah(totalPrice)}</span>
            </span>
            <span className="flex items-center gap-1 text-xs font-semibold text-orange-300">
              Checkout <ArrowRight className="size-4" />
            </span>
          </button>
        </div>
      )}

      <CartSheet open={cartOpen} onOpenChange={setCartOpen} onCreated={setReceiptOrder} />

      <ReceiptModal
        order={receiptOrder}
        open={Boolean(receiptOrder)}
        onOpenChange={(open) => {
          if (!open) setReceiptOrder(null);
        }}
      />
    </div>
  );
}
