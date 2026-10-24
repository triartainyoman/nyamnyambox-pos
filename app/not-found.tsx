import Link from "next/link";

import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-5">
      <Brand href="/" />
      <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-6 text-center shadow-lg">
        <p className="text-5xl font-extrabold tracking-tight text-orange-600">404</p>
        <h1 className="mt-2 text-lg font-bold">Halaman tidak ditemukan</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tautan mungkin salah atau halaman sudah dipindahkan.
        </p>
        <Button asChild className="mt-5 w-full">
          <Link href="/pos">Kembali ke Kasir</Link>
        </Button>
      </div>
    </div>
  );
}
