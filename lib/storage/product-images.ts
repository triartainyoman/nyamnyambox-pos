import { isDemoMode } from "@/lib/env";
import { CONFIG_ERROR, friendlyError, UserFacingError } from "@/lib/errors";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export const PRODUCT_IMAGE_BUCKET = "product-images";
export const PRODUCT_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const PRODUCT_IMAGE_MAX_DIMENSION = 1200;
export const PRODUCT_IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/avif";
export const PRODUCT_IMAGE_FORMATS_HINT = "JPG, PNG, WebP, atau AVIF (maks 5 MB).";

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
]);

/** Returns a user-facing error message, or `null` when the file is acceptable. */
export function validateProductImageFile(file: File): string | null {
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return `Format gambar tidak didukung. Gunakan ${PRODUCT_IMAGE_FORMATS_HINT}`;
  }
  if (file.size > PRODUCT_IMAGE_MAX_BYTES) {
    return "Ukuran gambar maksimal 5 MB.";
  }
  return null;
}

/**
 * Extracts the object path from a public Supabase Storage URL for this bucket.
 * Returns `null` for seeded local assets (`/images/...`) and any other host.
 */
export function productImagePathFromUrl(url: string): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const marker = `/storage/v1/object/public/${PRODUCT_IMAGE_BUCKET}/`;
    const index = parsed.pathname.indexOf(marker);
    if (index === -1) return null;
    const path = parsed.pathname.slice(index + marker.length);
    return path ? decodeURIComponent(path) : null;
  } catch {
    return null;
  }
}

/**
 * Downscales the image to at most 1200 px and re-encodes it as WebP (older
 * Safari may fall back to PNG). This strips EXIF data, keeps uploads small
 * (~80–250 KB), and avoids storing multi-megabyte phone photos that would slow
 * the POS grid.
 */
export async function prepareProductImage(file: File): Promise<File> {
  if (typeof document === "undefined") {
    throw new UserFacingError("Gambar hanya dapat diproses di browser.");
  }

  const bitmap = await loadBitmap(file);
  try {
    const scale = Math.min(
      1,
      PRODUCT_IMAGE_MAX_DIMENSION / Math.max(bitmap.width, bitmap.height),
    );
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) throw new UserFacingError("Browser tidak dapat memproses gambar.");

    // White background so transparent PNGs do not turn black in WebP.
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/webp", 0.85);
    });
    if (!blob) throw new UserFacingError("Gagal mengompres gambar. Coba file lain.");

    // Older Safari may silently fall back to PNG when asked for WebP.
    const type = blob.type === "image/png" ? "image/png" : "image/webp";
    const extension = type === "image/png" ? "png" : "webp";

    return new File([blob], `${file.name.replace(/\.[^.]+$/, "") || "gambar"}.${extension}`, {
      type,
      lastModified: Date.now(),
    });
  } finally {
    bitmap.close?.();
  }
}

/** Uploads a prepared image and returns its public URL. */
export async function uploadProductImage(file: File): Promise<string> {
  if (isDemoMode) {
    throw new UserFacingError(
      "Upload gambar hanya tersedia di mode production (butuh Supabase Storage).",
    );
  }

  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new UserFacingError(CONFIG_ERROR);

  const validation = validateProductImageFile(file);
  if (validation) throw new UserFacingError(validation);

  const prepared = await prepareProductImage(file);
  const extension = prepared.type === "image/png" ? "png" : "webp";
  const path = `${crypto.randomUUID()}.${extension}`;

  const { error } = await supabase.storage
    .from(PRODUCT_IMAGE_BUCKET)
    .upload(path, prepared, {
      contentType: prepared.type,
      cacheControl: "31536000",
      upsert: false,
    });

  if (error) {
    throw new UserFacingError(friendlyError(error, "Gagal mengunggah gambar. Coba lagi."));
  }

  return supabase.storage.from(PRODUCT_IMAGE_BUCKET).getPublicUrl(path).data.publicUrl;
}

/**
 * Best-effort cleanup when an image is replaced or removed. Failures are
 * swallowed: a stale object is harmless, while a failed save is not.
 */
export async function deleteProductImageByUrl(url: string): Promise<boolean> {
  if (isDemoMode) return false;

  const path = productImagePathFromUrl(url);
  if (!path) return false;

  const supabase = getSupabaseBrowserClient();
  if (!supabase) return false;

  const { error } = await supabase.storage.from(PRODUCT_IMAGE_BUCKET).remove([path]);
  return !error;
}

async function loadBitmap(file: File): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file);
  } catch {
    return loadBitmapWithImageElement(file);
  }
}

function loadBitmapWithImageElement(file: File): Promise<ImageBitmap> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      createImageBitmap(image).then(resolve, reject);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(
        new UserFacingError(
          `Gambar tidak dapat dibaca. Gunakan ${PRODUCT_IMAGE_FORMATS_HINT}`,
        ),
      );
    };
    image.src = objectUrl;
  });
}
