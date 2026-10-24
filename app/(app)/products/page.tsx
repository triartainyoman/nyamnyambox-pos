import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ProductsClient } from "@/components/products/products-client";
import { requireProfile } from "@/lib/auth";
import { isOwnerRole } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Menu & Promo",
};

export default async function ProductsPage() {
  const profile = await requireProfile();
  if (!isOwnerRole(profile.role)) redirect("/pos");

  return <ProductsClient />;
}
