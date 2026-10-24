import { isDemoMode } from "@/lib/env";
import { CONFIG_ERROR, friendlyError, UserFacingError } from "@/lib/errors";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { businessDayRange, formatMonthLabel, toBusinessDate } from "@/lib/utils";
import type { DashboardData, DashboardSummary, Order } from "@/lib/types";

import { listOrders } from "./orders";

const EMPTY_SUMMARY: DashboardSummary = {
  today: { revenue: 0, orders: 0, paid_orders: 0, unpaid_orders: 0, aov: 0 },
  monthly: [],
  channels: [],
  top_products: [],
};

function client() {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new UserFacingError(CONFIG_ERROR);
  return supabase;
}

export async function getDashboard(): Promise<DashboardData> {
  const today = toBusinessDate(new Date());
  const { startISO, endISO } = businessDayRange(today);

  if (isDemoMode) {
    const { demoDashboard } = await import("@/lib/demo/api");
    const summary = demoDashboard();
    const recent = await listOrders(startISO, endISO);
    return {
      ...summary,
      recent_orders: recent.slice(0, 5),
      monthRevenue: summary.monthly.at(-1)?.revenue ?? 0,
      monthOrders: summary.monthly.at(-1)?.orders ?? 0,
    };
  }

  const { data, error } = await client().rpc("dashboard_summary");
  if (error) throw new UserFacingError(friendlyError(error, "Gagal memuat analitik."));

  const raw = (data ?? EMPTY_SUMMARY) as unknown as Partial<DashboardSummary>;
  const summary: DashboardSummary = {
    today: raw.today ?? EMPTY_SUMMARY.today,
    monthly: (raw.monthly ?? []).map((point) => ({
      ...point,
      label: point.label || formatMonthLabel(point.month),
    })),
    channels: raw.channels ?? [],
    top_products: raw.top_products ?? [],
  };

  let recent: Order[] = [];
  try {
    recent = await listOrders(startISO, endISO);
  } catch {
    // Dashboard should still render even if the recent list fails.
  }

  return {
    ...summary,
    recent_orders: recent.slice(0, 5),
    monthRevenue: summary.monthly.at(-1)?.revenue ?? 0,
    monthOrders: summary.monthly.at(-1)?.orders ?? 0,
  };
}
