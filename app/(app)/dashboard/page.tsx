import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { DashboardClient } from "@/components/dashboard/dashboard-client";
import { requireProfile } from "@/lib/auth";
import { isOwnerRole } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const profile = await requireProfile();
  if (!isOwnerRole(profile.role)) redirect("/pos");

  return <DashboardClient ownerName={profile.name} />;
}
