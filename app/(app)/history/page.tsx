import type { Metadata } from "next";

import { HistoryClient } from "@/components/history/history-client";
import { requireProfile } from "@/lib/auth";
import { isOwnerRole } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Riwayat Transaksi",
};

export default async function HistoryPage() {
  const profile = await requireProfile();
  return <HistoryClient canViewAll={isOwnerRole(profile.role)} />;
}
