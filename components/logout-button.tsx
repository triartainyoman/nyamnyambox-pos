"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Loader2 } from "lucide-react";

import { logoutAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { DEMO_COOKIE } from "@/lib/demo/session";
import { isSupabaseConfigured } from "@/lib/env";
import { cn } from "@/lib/utils";

export function LogoutButton({
  className,
  variant = "ghost",
  showLabel = false,
}: {
  className?: string;
  variant?: "ghost" | "outline" | "secondary";
  showLabel?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleLogout() {
    if (!isSupabaseConfigured) {
      document.cookie = `${DEMO_COOKIE}=; path=/; max-age=0; samesite=lax`;
      router.push("/login");
      return;
    }
    startTransition(async () => {
      await logoutAction();
    });
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={showLabel ? "sm" : "icon-sm"}
      onClick={handleLogout}
      disabled={pending}
      className={cn("text-muted-foreground hover:text-foreground", className)}
      aria-label="Keluar"
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : <LogOut className="size-4" />}
      {showLabel && <span>Keluar</span>}
    </Button>
  );
}
