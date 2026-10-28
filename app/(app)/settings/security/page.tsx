import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Mail, ShieldCheck, UserRound } from "lucide-react";

import { ChangePasswordForm } from "@/components/settings/change-password-form";
import { Badge } from "@/components/ui/badge";
import { requireProfile } from "@/lib/auth";
import { ROLE_LABELS, isOwnerRole } from "@/lib/constants";
import { isDemoMode } from "@/lib/env";
import { initials } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Keamanan Akun",
};

export default async function SecurityPage() {
  const profile = await requireProfile();

  // Route-level guard: cashiers never see this page, even by typing the URL.
  if (!isOwnerRole(profile.role)) redirect("/pos");

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wide text-orange-700">
          Pengaturan
        </p>
        <h1 className="mt-0.5 flex items-center gap-2 text-xl font-extrabold tracking-tight md:text-2xl">
          <ShieldCheck className="size-5 text-orange-700" /> Keamanan Akun
        </h1>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Ganti password akun {ROLE_LABELS[profile.role]} Anda. Fitur ini hanya tersedia
          untuk Owner dan Developer.
        </p>
      </header>

      <section
        aria-label="Akun yang sedang masuk"
        className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card p-3.5 shadow-sm"
      >
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-orange-100 text-sm font-bold text-orange-700">
          {initials(profile.name)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="truncate text-sm font-bold">{profile.name}</p>
            <Badge variant="default" className="px-1.5 py-0 text-xs">
              {ROLE_LABELS[profile.role]}
            </Badge>
          </div>
          <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
            <UserRound className="size-3" />
            {profile.username}
          </p>
          <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
            <Mail className="size-3" />
            {profile.email}
          </p>
        </div>
      </section>

      <ChangePasswordForm demoMode={isDemoMode} />
    </div>
  );
}
