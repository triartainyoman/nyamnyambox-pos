"use client";

import type { ReceiptSize } from "@/lib/hooks/use-receipt-size";
import { cn } from "@/lib/utils";

const SIZES: ReceiptSize[] = ["58", "80"];

export function ReceiptSizeToggle({
  value,
  onChange,
  className,
}: {
  value: ReceiptSize;
  onChange: (size: ReceiptSize) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "no-print inline-flex items-center gap-0.5 rounded-full border border-border bg-muted/50 p-0.5",
        className,
      )}
      role="group"
      aria-label="Ukuran kertas nota"
    >
      {SIZES.map((size) => (
        <button
          key={size}
          type="button"
          onClick={() => onChange(size)}
          aria-pressed={value === size}
          className={cn(
            "rounded-full px-2 py-0.5 text-xs font-semibold transition-colors",
            value === size
              ? "bg-white text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {size}mm
        </button>
      ))}
    </div>
  );
}
