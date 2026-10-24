"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  ChevronRight,
  Clock,
  ReceiptText,
  RefreshCw,
  Wallet,
} from "lucide-react";

import { OrderDetailSheet } from "@/components/history/order-detail-sheet";
import { ChannelBadge, EditedBadge, PaymentBadge } from "@/components/order-badges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrders } from "@/lib/hooks/use-orders";
import type { Order } from "@/lib/types";
import { cn, formatNumber, formatRupiah, formatTime, toBusinessDate, todayLabel } from "@/lib/utils";

function shiftDate(dateISO: string, days: number) {
  const date = new Date(`${dateISO}T12:00:00+07:00`);
  date.setUTCDate(date.getUTCDate() + days);
  return toBusinessDate(date);
}

export function HistoryClient({ canViewAll }: { canViewAll: boolean }) {
  const today = toBusinessDate(new Date());
  const [dateISO, setDateISO] = useState(today);
  const [selected, setSelected] = useState<Order | null>(null);

  const { data: orders, isLoading, isError, error, refetch, isFetching } = useOrders(dateISO);

  const summary = useMemo(() => {
    const list = orders ?? [];
    const paid = list.filter((order) => order.payment_status === "LUNAS");
    return {
      count: list.length,
      revenue: paid.reduce((sum, order) => sum + order.total_amount, 0),
      unpaid: list.length - paid.length,
    };
  }, [orders]);

  const isToday = dateISO === today;
  const yesterday = shiftDate(today, -1);

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-orange-600">
            Histori
          </p>
          <h1 className="mt-0.5 text-xl font-extrabold tracking-tight md:text-2xl">
            Riwayat Transaksi
          </h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {isToday ? todayLabel() : `Transaksi tanggal ${dateISO}`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canViewAll && (
            <>
              <Button
                variant={isToday ? "default" : "outline"}
                size="sm"
                onClick={() => setDateISO(today)}
              >
                Hari ini
              </Button>
              <Button
                variant={dateISO === yesterday ? "default" : "outline"}
                size="sm"
                onClick={() => setDateISO(yesterday)}
              >
                Kemarin
              </Button>
            </>
          )}
          <div className="relative">
            <CalendarDays className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="date"
              value={dateISO}
              max={today}
              disabled={!canViewAll}
              onChange={(event) => event.target.value && setDateISO(event.target.value)}
              className="h-9 w-[10.5rem] pl-8 text-xs disabled:opacity-100"
            />
          </div>
        </div>
      </header>

      <div className="grid grid-cols-3 gap-2.5">
        <div className="rounded-2xl border border-border/70 bg-card p-3 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Transaksi
          </p>
          <p className="mt-1 text-lg font-extrabold">{formatNumber(summary.count)}</p>
        </div>
        <div className="rounded-2xl border border-border/70 bg-card p-3 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Omzet
          </p>
          <p className="mt-1 text-lg font-extrabold text-emerald-600">
            {formatRupiah(summary.revenue)}
          </p>
        </div>
        <div className="rounded-2xl border border-border/70 bg-card p-3 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Belum lunas
          </p>
          <p
            className={cn(
              "mt-1 text-lg font-extrabold",
              summary.unpaid > 0 ? "text-amber-600" : "text-stone-400",
            )}
          >
            {formatNumber(summary.unpaid)}
          </p>
        </div>
      </div>

      <section className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-bold">
            <ReceiptText className="size-4 text-orange-600" />
            Daftar Pesanan
          </h2>
          <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            {isFetching && <RefreshCw className="size-3 animate-spin" />}
            {summary.count} transaksi
          </span>
        </div>

        {isError ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-red-200 bg-red-50/50 py-12 text-center">
            <AlertCircle className="size-8 text-red-500" />
            <div>
              <p className="text-sm font-semibold text-red-700">Gagal memuat transaksi</p>
              <p className="text-xs text-red-600/80">
                {error instanceof Error ? error.message : "Terjadi kesalahan"}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="size-3.5" /> Coba lagi
            </Button>
          </div>
        ) : isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="rounded-2xl border border-border/70 bg-card p-3">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="mt-2 h-3 w-48" />
              </div>
            ))}
          </div>
        ) : orders?.length ? (
          <div className="space-y-2">
            {orders.map((order) => {
              const itemCount =
                order.order_items?.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
              return (
                <button
                  key={order.id}
                  type="button"
                  onClick={() => setSelected(order)}
                  className="group flex w-full items-center gap-3 rounded-2xl border border-border/70 bg-card p-3 text-left shadow-sm transition-all hover:border-orange-200 hover:shadow-md active:scale-[0.995]"
                >
                  <div className="flex size-11 shrink-0 flex-col items-center justify-center rounded-xl bg-orange-50 text-orange-700">
                    <Clock className="size-3" />
                    <span className="mt-0.5 text-[10px] font-bold">
                      {formatTime(order.created_at)}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-[13px] font-bold">{order.receipt_number}</p>
                      {order.is_edited && <EditedBadge />}
                    </div>
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                      {order.cashier?.name ?? "-"} · {itemCount} item
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <ChannelBadge channel={order.channel} className="px-1.5 py-0 text-[10px]" />
                      <PaymentBadge status={order.payment_status} className="px-1.5 py-0 text-[10px]" />
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    <div className="text-right">
                      <p className="text-sm font-extrabold">{formatRupiah(order.total_amount)}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {order.order_items?.length ?? 0} jenis
                      </p>
                    </div>
                    <ChevronRight className="size-4 text-stone-300 group-hover:text-orange-500" />
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-card/50 py-14 text-center">
            <Wallet className="size-8 text-stone-300" />
            <p className="text-sm font-semibold">Belum ada transaksi</p>
            <p className="text-xs text-muted-foreground">
              Pesanan yang dibuat di halaman kasir akan muncul di sini.
            </p>
          </div>
        )}
      </section>

      {selected && (
        <OrderDetailSheet
          key={selected.id}
          order={selected}
          open={Boolean(selected)}
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          onUpdated={setSelected}
        />
      )}
    </div>
  );
}
