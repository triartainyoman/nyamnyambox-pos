import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { EmployeesClient } from "@/components/employees/employees-client";
import { requireProfile } from "@/lib/auth";
import { isOwnerRole } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Kelola Karyawan",
};

export default async function EmployeesPage() {
  const profile = await requireProfile();
  if (!isOwnerRole(profile.role)) redirect("/pos");

  return <EmployeesClient currentProfileId={profile.id} />;
}
