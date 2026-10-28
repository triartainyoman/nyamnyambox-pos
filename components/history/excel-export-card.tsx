"use client";

import { useMemo, useState } from "react";
import { Download, FileSpreadsheet, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { listAllOrders } from "@/lib/data/orders";
import { friendlyError } from "@/lib/errors";
import {
  MONTH_NAMES,
  buildWorkbook,
  exportFileName,
  monthLabel,
  monthRange,
} from "@/lib/export/excel";
import { toBusinessDate } from "@/lib/utils";

const SELECT_CLASS =
  "h-9 rounded-lg border border-input bg-card px-2 text-xs font-medium shadow-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:opacity-50";

export function ExcelExportCard() {
  const today = toBusinessDate(new Date());
  const currentYear = Number(today.slice(0, 4));

  const [month, setMonth] = useState(Number(today.slice(5, 7)));
  const [year, setYear] = useState(currentYear);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const years = useMemo(
    () => Array.from({ length: 4 }, (_, index) => currentYear - index),
    [currentYear],
  );

  async function handleExport() {
    setBusy(true);
    setError(null);
    try {
      const { startISO, endISO } = monthRange(year, month);
      const orders = await listAllOrders(startISO, endISO);

      if (orders.length === 0) {
        setError(`Tidak ada transaksi pada ${monthLabel(year, month)}.`);
        return;
      }

      // Loaded on demand so the library stays out of the initial history bundle.
      const { default: writeExcelFile } = await import("write-excel-file/browser");
      await writeExcelFile(buildWorkbook(orders, year, month)).toFile(
        exportFileName(year, month),
      );
      toast.success(
        `Excel ${monthLabel(year, month)} diunduh (${orders.length} transaksi)`,
      );
    } catch (exportError) {
      const message = friendlyError(exportError, "Gagal membuat file Excel.");
      setError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      aria-labelledby="excel-export-title"
      className="rounded-2xl border border-border/70 bg-card p-3 shadow-sm"
    >
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
          <FileSpreadsheet className="size-5" />
        </div>

        <div className="min-w-0 flex-1">
          <h2 id="excel-export-title" className="text-sm font-bold">
            Ekspor Excel bulanan
          </h2>
          <p className="text-xs text-muted-foreground">
            Semua transaksi + rincian item untuk pembukuan.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Bulan"
            value={month}
            disabled={busy}
            onChange={(event) => {
              setMonth(Number(event.target.value));
              setError(null);
            }}
            className={SELECT_CLASS}
          >
            {MONTH_NAMES.map((name, index) => (
              <option key={name} value={index + 1}>
                {name}
              </option>
            ))}
          </select>

          <select
            aria-label="Tahun"
            value={year}
            disabled={busy}
            onChange={(event) => {
              setYear(Number(event.target.value));
              setError(null);
            }}
            className={SELECT_CLASS}
          >
            {years.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>

          <Button size="sm" onClick={handleExport} disabled={busy}>
            {busy ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Download className="size-3.5" />
            )}
            {busy ? "Menyiapkan..." : "Unduh Excel"}
          </Button>
        </div>
      </div>

      {error ? (
        <p role="alert" className="mt-2 text-xs font-medium text-amber-700">
          {error}
        </p>
      ) : null}
    </section>
  );
}
