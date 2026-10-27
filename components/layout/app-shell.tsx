"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ReceiptText,
  ShoppingBag,
  Users,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";

import { Brand } from "@/components/brand";
import { LogoutButton } from "@/components/logout-button";
import { Badge } from "@/components/ui/badge";
import { ROLE_LABELS, isOwnerRole } from "@/lib/constants";
import { isDemoMode } from "@/lib/env";
import type { Profile } from "@/lib/types";
import { cn, initials } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
  ownerOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/pos", label: "Kasir", shortLabel: "Kasir", icon: ShoppingBag },
  { href: "/history", label: "Riwayat Transaksi", shortLabel: "Riwayat", icon: ReceiptText },
  { href: "/dashboard", label: "Dashboard Analitik", shortLabel: "Dashboard", icon: LayoutDashboard, ownerOnly: true },
  { href: "/products", label: "Menu & Promo", shortLabel: "Menu", icon: UtensilsCrossed, ownerOnly: true },
  { href: "/employees", label: "Kelola Karyawan", shortLabel: "Tim", icon: Users, ownerOnly: true },
];

export function AppShell({ profile, children }: { profile: Profile; children: React.ReactNode }) {
  const pathname = usePathname();
  const owner = isOwnerRole(profile.role);
  const items = NAV_ITEMS.filter((item) => !item.ownerOnly || owner);

  return (
    <div className="min-h-dvh bg-background">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-border/80 bg-card md:flex">
        <div className="px-5 py-5">
          <Brand />
        </div>

        <nav className="flex flex-1 flex-col gap-1 px-3">
          {items.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-orange-50 text-orange-700"
                    : "text-stone-600 hover:bg-muted hover:text-stone-900",
                )}
              >
                <item.icon className={cn("size-[18px]", active && "text-orange-700")} />
                {item.label}
                {active && <span className="ml-auto size-1.5 rounded-full bg-orange-500" />}
              </Link>
            );
          })}
        </nav>

        {isDemoMode && (
          <div className="mx-3 mb-3 rounded-xl bg-amber-50 px-3 py-2 text-xs leading-snug text-amber-800">
            <span className="font-bold">Mode demo</span> — data disimpan di browser ini.
          </div>
        )}

        <div className="border-t border-border/80 p-3">
          <div className="flex items-center gap-3 rounded-xl px-2 py-2">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-orange-100 text-xs font-bold text-orange-700">
              {initials(profile.name)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{profile.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {ROLE_LABELS[profile.role]}
              </p>
            </div>
            <LogoutButton />
          </div>
        </div>
      </aside>

      <div className="flex min-h-dvh flex-col md:pl-64">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border/70 bg-background/85 px-4 backdrop-blur-md md:hidden">
          <Brand compact />
          <div className="flex items-center gap-2">
            {isDemoMode && (
              <Badge variant="warning" className="text-xs">
                Demo
              </Badge>
            )}
            <div className="flex items-center gap-2 rounded-full border border-border bg-card py-1 pr-1 pl-2.5">
              <span className="text-xs font-semibold text-stone-700">
                {profile.name.split(" ")[0]}
              </span>
              <span className="flex size-7 items-center justify-center rounded-full bg-orange-100 text-xs font-bold text-orange-700">
                {initials(profile.name)}
              </span>
            </div>
            <LogoutButton />
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-4 pb-28 md:px-8 md:pt-6 md:pb-8">
          {children}
        </main>
      </div>

      <nav
        className={cn(
          "fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-card/95 pb-[max(0.4rem,env(safe-area-inset-bottom))] backdrop-blur-md md:hidden",
        )}
      >
        <div
          className="grid"
          style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
        >
          {items.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 text-xs font-semibold transition-colors",
                  active ? "text-orange-700" : "text-stone-500",
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-11 items-center justify-center rounded-full transition-colors",
                    active && "bg-orange-100",
                  )}
                >
                  <item.icon className="size-[18px]" />
                </span>
                {item.shortLabel}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
