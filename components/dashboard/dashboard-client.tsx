"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  Banknote,
  Clock,
  ReceiptText,
  ShoppingBag,
  TrendingUp,
  Trophy,
  Users,
} from "lucide-react";

import { MonthlySalesChart } from "@/components/dashboard/monthly-sales-chart";
import { ChannelBadge, PaymentBadge } from "@/components/order-badges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QueryError } from "@/components/ui/query-error";
import { Skeleton } from "@/components/ui/skeleton";
import { channelMeta } from "@/lib/constants";
import { useDashboard } from "@/lib/hooks/use-dashboard";
import type { OrderChannel } from "@/lib/types";
import { cn, formatRupiah, formatTime, formatNumber } from "@/lib/utils";

const CHANNEL_COLORS: Record<OrderChannel, string> = {
  DINE_IN: "bg-emerald-500",
  TAKEAWAY: "bg-sky-500",
  GRABFOOD: "bg-green-500",
  SHOPEEFOOD: "bg-orange-500",
  WHATSAPP: "bg-teal-500",
};

const ALL_CHANNELS: OrderChannel[] = [
  "DINE_IN",
  "TAKEAWAY",
  "GRABFOOD",
  "SHOPEEFOOD",
  "WHATSAPP",
];

export function DashboardClient({ ownerName }: { ownerName: string }) {
  const { data, isLoading, isError, error, refetch } = useDashboard();

  const channels = ALL_CHANNELS.map((channel) => {
    const found = data?.channels.find((entry) => entry.channel === channel);
    return {
      channel,
      revenue: found?.revenue ?? 0,
      orders: found?.orders ?? 0,
    };
  });
  const channelTotal = channels.reduce((sum, entry) => sum + entry.revenue, 0);

  const metrics = [
    {
      label: "Omzet Hari Ini",
      value: formatRupiah(data?.today.revenue ?? 0),
      hint: `${data?.today.paid_orders ?? 0} transaksi lunas`,
      icon: Banknote,
      tone: "bg-emerald-50 text-emerald-600",
    },
    {
      label: "Transaksi Hari Ini",
      value: formatNumber(data?.today.orders ?? 0),
      hint: "Semua kanal",
      icon: ReceiptText,
      tone: "bg-sky-50 text-sky-600",
    },
    {
      label: "Rata-rata / Order",
      value: formatRupiah(data?.today.aov ?? 0),
      hint: "Average order value",
      icon: TrendingUp,
      tone: "bg-violet-50 text-violet-600",
    },
    {
      label: "Belum Lunas",
      value: formatNumber(data?.today.unpaid_orders ?? 0),
      hint: "Perlu konfirmasi kasir",
      icon: Clock,
      tone: "bg-amber-50 text-amber-600",
    },
  ];

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-orange-700">
            Owner Analytics
          </p>
          <h1 className="mt-0.5 text-xl font-extrabold tracking-tight md:text-2xl">
            Dashboard
          </h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Selamat datang, {ownerName.split(" ")[0]}. Ringkasan performa toko hari ini.
          </p>
        </div>
        <Badge variant="outline" className="mt-1 w-fit gap-1.5 px-2.5 py-1 text-xs">
          <span className="size-1.5 rounded-full bg-emerald-500" />
          Live · diperbarui otomatis
        </Badge>
      </header>

      {isError ? (
        <QueryError
          error={error}
          title="Gagal memuat analitik"
          fallback="Ringkasan penjualan belum dapat dimuat."
          onRetry={() => refetch()}
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
            {metrics.map((metric) => (
              <div
                key={metric.label}
                className="rounded-2xl border border-border/70 bg-card p-3.5 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {metric.label}
                  </p>
                  <span className={cn("flex size-7 items-center justify-center rounded-lg", metric.tone)}>
                    <metric.icon className="size-3.5" />
                  </span>
                </div>
                {isLoading ? (
                  <Skeleton className="mt-2 h-6 w-24" />
                ) : (
                  <p className="mt-1.5 text-lg font-extrabold tracking-tight md:text-xl">
                    {metric.value}
                  </p>
                )}
                <p className="mt-0.5 text-xs text-muted-foreground">{metric.hint}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader className="flex-row items-start justify-between">
                <div>
                  <CardTitle>Penjualan Bulanan</CardTitle>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Tren pendapatan lunas 6 bulan terakhir
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Bulan ini
                  </p>
                  {isLoading ? (
                    <Skeleton className="mt-1 h-5 w-20" />
                  ) : (
                    <p className="text-sm font-extrabold text-orange-700">
                      {formatRupiah(data?.monthRevenue ?? 0)}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {formatNumber(data?.monthOrders ?? 0)} transaksi
                  </p>
                </div>
              </CardHeader>
              <CardContent className="pb-3">
                {isLoading ? (
                  <Skeleton className="h-[230px] w-full" />
                ) : (
                  <MonthlySalesChart data={data?.monthly ?? []} />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Breakdown Kanal</CardTitle>
                <p className="text-xs text-muted-foreground">Kontribusi omzet bulan ini</p>
              </CardHeader>
              <CardContent className="space-y-3 pb-4">
                {isLoading
                  ? Array.from({ length: 5 }).map((_, index) => (
                      <div key={index} className="space-y-1.5">
                        <Skeleton className="h-3 w-24" />
                        <Skeleton className="h-2 w-full" />
                      </div>
                    ))
                  : channels.map((entry) => {
                      const percentage = channelTotal
                        ? Math.round((entry.revenue / channelTotal) * 100)
                        : 0;
                      return (
                        <div key={entry.channel}>
                          <div className="flex items-center justify-between text-xs">
                            <span className="flex items-center gap-1.5 font-medium">
                              <span
                                className={cn("size-2 rounded-full", CHANNEL_COLORS[entry.channel])}
                              />
                              {channelMeta(entry.channel).label}
                            </span>
                            <span className="font-semibold text-stone-700">
                              {percentage}%
                            </span>
                          </div>
                          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                            <div
                              className={cn("h-full rounded-full", CHANNEL_COLORS[entry.channel])}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <div className="mt-0.5 flex justify-between text-xs text-muted-foreground">
                            <span>{entry.orders} order</span>
                            <span>{formatRupiah(entry.revenue)}</span>
                          </div>
                        </div>
                      );
                    })}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="size-4 text-amber-500" /> Produk Terlaris
                  </CardTitle>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Berdasarkan kuantitas bulan ini
                  </p>
                </div>
              </CardHeader>
              <CardContent className="pb-4">
                {isLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 4 }).map((_, index) => (
                      <Skeleton key={index} className="h-9 w-full" />
                    ))}
                  </div>
                ) : data?.top_products.length ? (
                  <div className="space-y-1.5">
                    {data.top_products.map((product, index) => (
                      <div
                        key={product.product_id}
                        className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 hover:bg-muted/50"
                      >
                        <span
                          className={cn(
                            "flex size-6 shrink-0 items-center justify-center rounded-lg text-xs font-extrabold",
                            index === 0
                              ? "bg-amber-100 text-amber-700"
                              : index === 1
                                ? "bg-stone-200 text-stone-600"
                                : index === 2
                                  ? "bg-orange-100 text-orange-700"
                                  : "bg-muted text-muted-foreground",
                          )}
                        >
                          {index + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold">
                            {product.name.replace(/^\[PROMO\]\s*/, "")}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatNumber(product.quantity)} terjual
                          </p>
                        </div>
                        <p className="shrink-0 text-xs font-bold">{formatRupiah(product.revenue)}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1 rounded-xl border border-dashed border-border py-8 text-center">
                    <ShoppingBag className="size-6 text-stone-300" />
                    <p className="text-xs text-muted-foreground">Belum ada penjualan bulan ini.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="size-4 text-sky-500" /> Transaksi Terakhir
                  </CardTitle>
                  <p className="mt-0.5 text-xs text-muted-foreground">Pesanan hari ini</p>
                </div>
                <Button asChild variant="ghost" size="sm" className="h-8 text-xs">
                  <Link href="/history">
                    Lihat semua <ArrowUpRight className="size-3" />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent className="pb-4">
                {isLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 4 }).map((_, index) => (
                      <Skeleton key={index} className="h-12 w-full" />
                    ))}
                  </div>
                ) : data?.recent_orders.length ? (
                  <div className="space-y-1.5">
                    {data.recent_orders.map((order) => (
                      <Link
                        href="/history"
                        key={order.id}
                        className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 transition-colors hover:bg-muted/50"
                      >
                        <div className="flex h-9 w-12 shrink-0 flex-col items-center justify-center rounded-lg bg-stone-100 text-xs font-bold text-stone-600">
                          {formatTime(order.created_at)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-bold">{order.receipt_number}</p>
                          <div className="mt-0.5 flex items-center gap-1">
                            <ChannelBadge
                              channel={order.channel}
                              className="px-1.5 py-0 text-xs"
                            />
                            <PaymentBadge
                              status={order.payment_status}
                              className="px-1.5 py-0 text-xs"
                            />
                          </div>
                        </div>
                        <p className="shrink-0 text-xs font-extrabold">
                          {formatRupiah(order.total_amount)}
                        </p>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1 rounded-xl border border-dashed border-border py-8 text-center">
                    <Users className="size-6 text-stone-300" />
                    <p className="text-xs text-muted-foreground">Belum ada transaksi hari ini.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
