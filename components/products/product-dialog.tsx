"use client";

import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { ProductImageField } from "@/components/products/product-image-field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { friendlyError } from "@/lib/errors";
import { useCreateProduct, useUpdateProduct } from "@/lib/hooks/use-products";
import { deleteProductImageByUrl } from "@/lib/storage/product-images";
import type { Product } from "@/lib/types";
import { formatRupiah } from "@/lib/utils";

export function ProductDialog({
  open,
  onOpenChange,
  product,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
}) {
  const isEdit = Boolean(product);
  const rawName = product?.name ?? "";
  const [name, setName] = useState(rawName.replace(/^\[PROMO\]\s*/, ""));
  const [price, setPrice] = useState(product ? String(product.price) : "");
  const [imageUrl, setImageUrl] = useState(product?.image_url ?? "");
  const [isPromo, setIsPromo] = useState(rawName.startsWith("[PROMO]"));
  const [isActive, setIsActive] = useState(product?.is_active ?? true);
  const [error, setError] = useState<string | null>(null);

  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const pending = createProduct.isPending || updateProduct.isPending;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();
    const numericPrice = Number(price);

    if (!trimmedName) {
      setError("Nama menu wajib diisi.");
      return;
    }
    if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
      setError("Harga harus lebih dari 0.");
      return;
    }

    const payload = {
      name: isPromo ? `[PROMO] ${trimmedName}` : trimmedName,
      price: numericPrice,
      image_url: imageUrl.trim() || null,
      is_active: isActive,
    };

    try {
      if (product) {
        const previousImage = product.image_url ?? "";
        await updateProduct.mutateAsync({ id: product.id, input: payload });
        if (previousImage && previousImage !== (payload.image_url ?? "")) {
          // Best-effort: a stale object is harmless, a failed save is not.
          void deleteProductImageByUrl(previousImage);
        }
        toast.success("Menu berhasil diperbarui");
      } else {
        await createProduct.mutateAsync(payload);
        toast.success("Menu baru berhasil ditambahkan");
      }
      onOpenChange(false);
    } catch (submitError) {
      const message = friendlyError(submitError, "Gagal menyimpan menu");
      setError(message);
      toast.error(message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Menu" : "Tambah Menu"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Perbarui nama, harga, gambar, atau status ketersediaan."
              : "Menu baru langsung tampil di layar kasir jika aktif."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <DialogBody className="space-y-4">
            <ProductImageField value={imageUrl} onChange={setImageUrl} />

            <div>
              <Label htmlFor="product-name">Nama Menu</Label>
              <Input
                id="product-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Contoh: Thai Basil Chicken"
                maxLength={80}
                required
              />
            </div>

            <div>
              <Label htmlFor="product-price">Harga (Rp)</Label>
              <div className="relative">
                <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                  Rp
                </span>
                <Input
                  id="product-price"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={500}
                  value={price}
                  onChange={(event) => setPrice(event.target.value)}
                  placeholder="20000"
                  className="pl-8"
                  required
                />
              </div>
              {price ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  Tampil sebagai {formatRupiah(Number(price))}
                </p>
              ) : null}
            </div>

            <div className="flex items-center justify-between rounded-xl border border-border bg-muted/30 px-3 py-2.5">
              <div>
                <p className="flex items-center gap-1.5 text-xs font-semibold">
                  <Sparkles className="size-3.5 text-orange-500" /> Promo Bundling
                </p>
                <p className="text-xs text-muted-foreground">
                  Nama diberi label [PROMO] otomatis.
                </p>
              </div>
              <Switch checked={isPromo} onCheckedChange={setIsPromo} />
            </div>

            <div className="flex items-center justify-between rounded-xl border border-border bg-muted/30 px-3 py-2.5">
              <div>
                <p className="text-xs font-semibold">Menu Aktif</p>
                <p className="text-xs text-muted-foreground">
                  Jika nonaktif, menu disembunyikan dari kasir.
                </p>
              </div>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>

            {error ? (
              <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                {error}
              </p>
            ) : null}
          </DialogBody>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              {isEdit ? "Simpan Perubahan" : "Tambah Menu"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
