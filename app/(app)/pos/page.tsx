import type { Metadata } from "next";

import { PosClient } from "@/components/pos/pos-client";
import { requireProfile } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Kasir",
};

export default async function PosPage() {
  const profile = await requireProfile();
  return <PosClient cashierName={profile.name} />;
}
