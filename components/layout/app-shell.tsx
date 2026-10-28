"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ReceiptText,
  ShoppingBag,
  TriangleAlert,
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
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-20 flex-col border-r border-border/80 bg-card md:flex lg:w-64">
        <div className="flex items-center justify-center px-2 py-5 lg:justify-start lg:px-5">
          <span className="lg:hidden">
            <Brand compact />
          </span>
          <span className="hidden lg:inline-flex">
            <Brand />
          </span>
        </div>

        <nav className="flex flex-1 flex-col gap-1 px-2 lg:px-3">
          {items.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                aria-label={item.label}
                className={cn(
                  "flex items-center justify-center gap-3 rounded-xl p-3 text-sm font-medium transition-colors lg:justify-start lg:px-3 lg:py-2.5",
                  active
                    ? "bg-orange-50 text-orange-700"
                    : "text-stone-600 hover:bg-muted hover:text-stone-900",
                )}
              >
                <item.icon className={cn("size-[18px] shrink-0", active && "text-orange-700")} />
                <span className="hidden lg:inline">{item.label}</span>
                {active && (
                  <span className="ml-auto hidden size-1.5 rounded-full bg-orange-500 lg:block" />
                )}
              </Link>
            );
          })}
        </nav>

        {isDemoMode && (
          <>
            <div
              role="note"
              aria-label="Mode demo — data disimpan di browser ini."
              title="Mode demo — data disimpan di browser ini."
              className="mx-auto mb-3 flex size-9 items-center justify-center rounded-xl bg-amber-50 text-amber-800 lg:hidden"
            >
              <TriangleAlert className="size-4" />
            </div>
            <div className="mx-3 mb-3 hidden rounded-xl bg-amber-50 px-3 py-2 text-xs leading-snug text-amber-800 lg:block">
              <span className="font-bold">Mode demo</span> — data disimpan di browser ini.
            </div>
          </>
        )}

        <div className="border-t border-border/80 p-2 lg:p-3">
          <div className="flex flex-col items-center gap-1 rounded-xl py-1 lg:flex-row lg:gap-3 lg:px-2 lg:py-2">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-orange-100 text-xs font-bold text-orange-700">
              {initials(profile.name)}
            </span>
            <div className="hidden min-w-0 flex-1 lg:block">
              <p className="truncate text-sm font-semibold">{profile.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {ROLE_LABELS[profile.role]}
              </p>
            </div>
            <LogoutButton />
          </div>
        </div>
      </aside>

      <div className="flex min-h-dvh flex-col md:pl-20 lg:pl-64">
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

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-4 pb-28 md:px-6 md:pt-6 md:pb-8 lg:px-8">
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
