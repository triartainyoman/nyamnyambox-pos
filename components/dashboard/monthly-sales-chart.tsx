"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { DashboardSummary } from "@/lib/types";
import { formatRupiah } from "@/lib/utils";

type ChartPoint = DashboardSummary["monthly"][number];

function compactRupiah(value: number) {
  const compact = new Intl.NumberFormat("id-ID", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
  return `Rp${compact}`;
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value?: number; payload?: ChartPoint }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload;
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2 shadow-lg">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="text-sm font-extrabold text-stone-900">
        {formatRupiah(Number(payload[0]?.value ?? 0))}
      </p>
      <p className="text-xs text-muted-foreground">{point?.orders ?? 0} transaksi</p>
    </div>
  );
}

export function MonthlySalesChart({ data }: { data: ChartPoint[] }) {
  const hasData = data.some((point) => point.revenue > 0);

  return (
    <div className="h-[230px] w-full">
      {hasData ? (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 4, left: -12, bottom: 0 }}>
            <defs>
              <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f97316" stopOpacity={0.32} />
                <stop offset="100%" stopColor="#f97316" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e7e5e4" />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: "#78716c" }}
              dy={6}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              width={54}
              tick={{ fontSize: 10, fill: "#a8a29e" }}
              tickFormatter={(value: number) => compactRupiah(value).replace("Rp", "")}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: "#fdba74", strokeDasharray: "4 4" }} />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#ea580c"
              strokeWidth={2.5}
              fill="url(#revenueFill)"
              activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border bg-muted/20">
          <p className="text-sm font-semibold text-stone-600">Belum ada data penjualan</p>
          <p className="text-xs text-muted-foreground">Grafik muncul setelah transaksi tercatat.</p>
        </div>
      )}
    </div>
  );
}
