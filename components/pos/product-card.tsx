/* eslint-disable @next/next/no-img-element */
"use client";

import { Plus } from "lucide-react";

import { formatRupiah } from "@/lib/utils";
import { useCartStore } from "@/stores/useCartStore";
import type { Product } from "@/lib/types";

export function ProductCard({ product }: { product: Product }) {
  const quantity = useCartStore(
    (state) => state.items.find((item) => item.productId === product.id)?.quantity ?? 0,
  );
  const addItem = useCartStore((state) => state.addItem);

  const isPromo = product.name.startsWith("[PROMO]");
  const displayName = product.name.replace(/^\[PROMO\]\s*/, "");

  return (
    <button
      type="button"
      onClick={() => addItem(product)}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-border/70 bg-card p-2 text-left shadow-sm transition-all hover:border-orange-200 hover:shadow-md active:scale-[0.985]"
    >
      <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-orange-50">
        <img
          src={product.image_url ?? "/images/placeholder.svg"}
          alt={displayName}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
        {isPromo && (
          <span className="absolute top-1.5 left-1.5 rounded-full bg-gradient-to-r from-orange-500 to-red-500 px-2 py-0.5 text-xs font-extrabold uppercase tracking-wide text-white shadow">
            Promo
          </span>
        )}
        {quantity > 0 && (
          <span className="animate-pop absolute top-1.5 right-1.5 flex size-6 items-center justify-center rounded-full bg-stone-900 text-xs font-bold text-white shadow-md">
            {quantity}
          </span>
        )}
        <span className="absolute right-1.5 bottom-1.5 flex size-7 items-center justify-center rounded-full bg-white/95 text-orange-700 shadow-sm transition-transform group-active:scale-90">
          <Plus className="size-4" strokeWidth={2.6} />
        </span>
      </div>

      <div className="flex flex-1 flex-col px-0.5 pt-2 pb-0.5">
        <p className="line-clamp-2 text-[13px] font-semibold leading-snug text-stone-800">
          {displayName}
        </p>
        <p className="mt-auto pt-1 text-sm font-extrabold text-orange-700">
          {formatRupiah(product.price)}
        </p>
      </div>
    </button>
  );
}
