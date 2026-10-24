"use client";

import { useMemo, useState } from "react";
import { ImageIcon, Pencil, Plus, Search, Sparkles, UtensilsCrossed } from "lucide-react";
import { toast } from "sonner";

import { ProductDialog } from "@/components/products/product-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QueryError } from "@/components/ui/query-error";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { friendlyError } from "@/lib/errors";
import { useProducts, useSetProductActive } from "@/lib/hooks/use-products";
import type { Product } from "@/lib/types";
import { formatNumber, formatRupiah } from "@/lib/utils";

export function ProductsClient() {
  const { data: products, isLoading, isError, error, refetch } = useProducts(false);
  const setActive = useSetProductActive();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return products ?? [];
    return (products ?? []).filter((product) => product.name.toLowerCase().includes(query));
  }, [products, search]);

  const activeCount = (products ?? []).filter((product) => product.is_active).length;
  const promoCount = (products ?? []).filter((product) => product.name.startsWith("[PROMO]")).length;

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(product: Product) {
    setEditing(product);
    setDialogOpen(true);
  }

  async function toggle(product: Product, nextValue: boolean) {
    try {
      await setActive.mutateAsync({ id: product.id, isActive: nextValue });
      toast.success(nextValue ? `${product.name} diaktifkan` : `${product.name} dinonaktifkan`);
    } catch (error) {
      toast.error(friendlyError(error, "Gagal mengubah status menu"));
    }
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-orange-600">
            Katalog
          </p>
          <h1 className="mt-0.5 text-xl font-extrabold tracking-tight md:text-2xl">
            Menu &amp; Promo
          </h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Kelola harga, gambar, dan ketersediaan menu.
          </p>
        </div>
        <Button onClick={openCreate} className="w-full sm:w-auto">
          <Plus className="size-4" /> Tambah Menu
        </Button>
      </header>

      <div className="grid grid-cols-3 gap-2.5">
        <div className="rounded-2xl border border-border/70 bg-card p-3 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Total Menu
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-lg font-extrabold">
            <UtensilsCrossed className="size-4 text-stone-400" />
            {formatNumber(products?.length ?? 0)}
          </p>
        </div>
        <div className="rounded-2xl border border-border/70 bg-card p-3 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Aktif
          </p>
          <p className="mt-1 text-lg font-extrabold text-emerald-600">
            {formatNumber(activeCount)}
          </p>
        </div>
        <div className="rounded-2xl border border-border/70 bg-card p-3 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Promo
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-lg font-extrabold text-orange-600">
            <Sparkles className="size-4" />
            {formatNumber(promoCount)}
          </p>
        </div>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Cari menu..."
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="grid gap-2.5 md:grid-cols-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-[86px] w-full" />
          ))}
        </div>
      ) : isError ? (
        <QueryError
          error={error}
          title="Gagal memuat menu"
          fallback="Daftar menu belum dapat dimuat."
          onRetry={() => refetch()}
        />
      ) : filtered.length ? (
        <div className="grid gap-2.5 md:grid-cols-2">
          {filtered.map((product) => {
            const isPromo = product.name.startsWith("[PROMO]");
            return (
              <div
                key={product.id}
                className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card p-2.5 shadow-sm"
              >
                <div className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-orange-50">
                  {product.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-stone-400">
                      <ImageIcon className="size-5" />
                    </div>
                  )}
                  {isPromo && (
                    <span className="absolute top-1 left-1 rounded-full bg-orange-500 px-1.5 py-0.5 text-[8px] font-extrabold text-white">
                      PROMO
                    </span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-[13px] font-semibold leading-snug">
                    {product.name.replace(/^\[PROMO\]\s*/, "")}
                  </p>
                  <p className="mt-0.5 text-sm font-extrabold text-orange-600">
                    {formatRupiah(product.price)}
                  </p>
                  <Badge
                    variant={product.is_active ? "success" : "secondary"}
                    className="mt-1 px-1.5 py-0 text-[9px]"
                  >
                    {product.is_active ? "Tersedia" : "Nonaktif"}
                  </Badge>
                </div>

                <div className="flex shrink-0 flex-col items-end gap-2">
                  <Switch
                    checked={product.is_active}
                    disabled={setActive.isPending}
                    onCheckedChange={(value) => toggle(product, value)}
                    aria-label={`Aktifkan ${product.name}`}
                  />
                  <Button
                    variant="outline"
                    size="icon-sm"
                    onClick={() => openEdit(product)}
                    aria-label={`Edit ${product.name}`}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-card/50 py-14 text-center">
          <UtensilsCrossed className="size-8 text-stone-300" />
          <p className="text-sm font-semibold">
            {search ? "Menu tidak ditemukan" : "Belum ada menu"}
          </p>
          <p className="text-xs text-muted-foreground">
            {search ? "Coba kata kunci lain." : "Tambahkan menu pertama untuk mulai berjualan."}
          </p>
          {!search && (
            <Button size="sm" className="mt-1" onClick={openCreate}>
              <Plus className="size-3.5" /> Tambah Menu
            </Button>
          )}
        </div>
      )}

      {dialogOpen && (
        <ProductDialog
          key={editing?.id ?? "new"}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          product={editing}
        />
      )}
    </div>
  );
}
