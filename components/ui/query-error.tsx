"use client";

import { AlertCircle, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { friendlyError } from "@/lib/errors";

/**
 * Inline error state for failed data queries (POS menu, history, dashboard,
 * products, employees). Always shows a safe message and an optional retry.
 */
export function QueryError({
  error,
  title = "Gagal memuat data",
  fallback,
  onRetry,
}: {
  error: unknown;
  title?: string;
  fallback?: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-red-200 bg-red-50/50 px-4 py-12 text-center"
    >
      <AlertCircle className="size-8 text-red-500" />
      <div>
        <p className="text-sm font-semibold text-red-700">{title}</p>
        <p className="mt-0.5 text-xs text-red-700">{friendlyError(error, fallback)}</p>
      </div>
      {onRetry ? (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw className="size-3.5" /> Coba lagi
        </Button>
      ) : null}
    </div>
  );
}
