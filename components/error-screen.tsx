"use client";

import Link from "next/link";
import { AlertTriangle, Home, RotateCcw } from "lucide-react";

import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { friendlyError } from "@/lib/errors";

/**
 * Full-page fallback used by `app/error.tsx` and `app/global-error.tsx`.
 * Renders safely even when the app shell failed to load.
 */
export function ErrorScreen({
  error,
  retry,
  title = "Terjadi kesalahan",
  description = "Halaman ini gagal dimuat. Data Anda tetap aman.",
}: {
  error: unknown;
  retry?: () => void;
  title?: string;
  description?: string;
}) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-5 py-10">
      <Brand href="/" />
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 text-center shadow-lg">
        <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
          <AlertTriangle className="size-6" />
        </div>
        <h1 className="text-lg font-bold">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
          {friendlyError(error)}
        </p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
          {retry ? (
            <Button onClick={() => retry()}>
              <RotateCcw className="size-4" /> Coba lagi
            </Button>
          ) : null}
          <Button variant="outline" asChild>
            <Link href="/pos">
              <Home className="size-4" /> Ke Halaman Utama
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
