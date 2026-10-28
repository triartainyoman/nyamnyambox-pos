import { describe, expect, it } from "vitest";

import {
  PRODUCT_IMAGE_MAX_BYTES,
  productImagePathFromUrl,
  validateProductImageFile,
} from "@/lib/storage/product-images";

function fileOf(type: string, size: number) {
  return new File([new Uint8Array(size)], "foto", { type });
}

describe("validateProductImageFile", () => {
  it.each(["image/jpeg", "image/png", "image/webp", "image/avif"])(
    "accepts %s under the size limit",
    (type) => {
      expect(validateProductImageFile(fileOf(type, 1024))).toBeNull();
    },
  );

  it.each(["image/svg+xml", "image/gif", "image/heic", "application/pdf", ""])(
    "rejects %s",
    (type) => {
      expect(validateProductImageFile(fileOf(type, 1024))).toMatch(/Format gambar/);
    },
  );

  it("rejects files over 5 MB", () => {
    expect(validateProductImageFile(fileOf("image/jpeg", PRODUCT_IMAGE_MAX_BYTES + 1))).toMatch(
      /maksimal 5 MB/,
    );
  });

  it("accepts a file exactly at the limit", () => {
    expect(validateProductImageFile(fileOf("image/jpeg", PRODUCT_IMAGE_MAX_BYTES))).toBeNull();
  });
});

describe("productImagePathFromUrl", () => {
  it("extracts the object path from a public bucket URL", () => {
    expect(
      productImagePathFromUrl(
        "https://abcdefgh.supabase.co/storage/v1/object/public/product-images/0f8f-11.webp",
      ),
    ).toBe("0f8f-11.webp");
  });

  it("decodes URL-encoded path segments", () => {
    expect(
      productImagePathFromUrl(
        "https://abcdefgh.supabase.co/storage/v1/object/public/product-images/folder%20satu/foto%20menu.webp",
      ),
    ).toBe("folder satu/foto menu.webp");
  });

  it("ignores seeded local assets", () => {
    expect(productImagePathFromUrl("/images/thai-basil.svg")).toBeNull();
    expect(productImagePathFromUrl("")).toBeNull();
  });

  it("ignores URLs from other buckets", () => {
    expect(
      productImagePathFromUrl(
        "https://abcdefgh.supabase.co/storage/v1/object/public/avatars/me.webp",
      ),
    ).toBeNull();
  });

  it("returns null for malformed input", () => {
    expect(productImagePathFromUrl("not a url")).toBeNull();
  });
});
