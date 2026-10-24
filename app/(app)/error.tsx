"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, Home, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { friendlyError } from "@/lib/errors";

/**
 * Error boundary for the authenticated app shell. It renders inside the app
 * layout so the user keeps their navigation, and `retry()` refetches the
 * failed segment.
 */
export default function AppError({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-6 text-center shadow-sm">
        <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
          <AlertTriangle className="size-6" />
        </div>
        <h1 className="text-lg font-bold">Terjadi kesalahan</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Halaman ini gagal dimuat. Coba muat ulang; data yang tersimpan tetap aman.
        </p>
        <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
          {friendlyError(error)}
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <Button onClick={() => retry()}>
            <RotateCcw className="size-4" /> Coba lagi
          </Button>
          <Button variant="outline" asChild>
            <Link href="/pos">
              <Home className="size-4" /> Kembali ke Kasir
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
