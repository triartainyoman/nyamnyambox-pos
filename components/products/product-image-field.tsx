"use client";

import { useRef, useState } from "react";
import { ImageIcon, Loader2, Trash2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isDemoMode } from "@/lib/env";
import { friendlyError } from "@/lib/errors";
import {
  PRODUCT_IMAGE_ACCEPT,
  PRODUCT_IMAGE_FORMATS_HINT,
  uploadProductImage,
  validateProductImageFile,
} from "@/lib/storage/product-images";
import { cn } from "@/lib/utils";

const IMAGE_PRESETS = [
  { url: "/images/thai-basil.svg", label: "Thai Basil" },
  { url: "/images/salted-egg.svg", label: "Salted Egg" },
  { url: "/images/bbq-cheese.svg", label: "BBQ Cheese" },
  { url: "/images/mac-cheese.svg", label: "Mac & Cheese" },
  { url: "/images/kentang-sosis.svg", label: "Kentang" },
  { url: "/images/popcorn.svg", label: "Popcorn" },
  { url: "/images/es-teh.svg", label: "Es Teh" },
  { url: "/images/promo-thai-basil.svg", label: "Promo" },
];

export function ProductImageField({
  value,
  onChange,
}: {
  value: string;
  onChange: (url: string) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;

    const validation = validateProductImageFile(file);
    if (validation) {
      setError(validation);
      return;
    }

    setError(null);
    setUploading(true);
    try {
      const url = await uploadProductImage(file);
      onChange(url);
    } catch (uploadError) {
      setError(friendlyError(uploadError, "Gagal mengunggah gambar."));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        <div className="relative size-20 shrink-0 overflow-hidden rounded-xl border border-border bg-orange-50">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="Pratinjau gambar menu" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-1 text-stone-400">
              <ImageIcon className="size-5" />
              <span className="text-xs">Tanpa gambar</span>
            </div>
          )}
          {uploading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-white/70">
              <Loader2 className="size-5 animate-spin text-orange-600" />
            </div>
          ) : null}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold">Foto Menu</p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            {PRODUCT_IMAGE_FORMATS_HINT} Foto otomatis dikecilkan ke 1200 px.
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept={PRODUCT_IMAGE_ACCEPT}
            className="sr-only"
            tabIndex={-1}
            disabled={uploading || isDemoMode}
            onChange={(event) => handleFile(event.target.files?.[0])}
            aria-label="Pilih foto menu"
          />

          <div className="mt-2 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploading || isDemoMode}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Upload className="size-3.5" />
              )}
              {value ? "Ganti Foto" : "Pilih Foto"}
            </Button>
            {value ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={uploading}
                onClick={() => {
                  setError(null);
                  onChange("");
                }}
              >
                <Trash2 className="size-3.5" /> Hapus
              </Button>
            ) : null}
          </div>

          {isDemoMode ? (
            <p className="mt-2 rounded-lg bg-amber-50 px-2 py-1.5 text-xs leading-relaxed text-amber-800">
              Upload foto hanya tersedia di mode production. Di mode demo, pakai URL
              gambar atau preset di bawah.
            </p>
          ) : null}

          {error ? (
            <p className="mt-2 rounded-lg bg-red-50 px-2 py-1.5 text-xs font-medium text-red-700">
              {error}
            </p>
          ) : null}
        </div>
      </div>

      <div>
        <Label htmlFor="product-image">URL Gambar (opsional)</Label>
        <Input
          id="product-image"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="/images/menu.svg atau https://…"
          className="h-10"
        />
        <div className="mt-2 flex gap-1 overflow-x-auto pb-1">
          {IMAGE_PRESETS.map((preset) => (
            <button
              key={preset.url}
              type="button"
              title={preset.label}
              onClick={() => onChange(preset.url)}
              className={cn(
                "size-8 shrink-0 overflow-hidden rounded-lg border-2",
                value === preset.url ? "border-orange-500" : "border-transparent",
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preset.url}
                alt={preset.label}
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Ganti foto akan menghapus file lama setelah menu disimpan.
        </p>
      </div>
    </div>
  );
}
