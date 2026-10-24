"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  ShieldCheck,
  Store,
  UserRound,
} from "lucide-react";

import { loginAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DEMO_COOKIE } from "@/lib/demo/constants";

export function LoginForm({
  demoMode,
  demoPassword,
}: {
  demoMode: boolean;
  demoPassword?: string;
}) {
  const [state, formAction, pending] = useActionState(loginAction, undefined);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  function enterDemo(role: "OWNER" | "EMPLOYEE") {
    document.cookie = `${DEMO_COOKIE}=${role}; path=/; max-age=${60 * 60 * 24 * 7}; samesite=lax`;
    router.push("/pos");
  }

  return (
    <div className="space-y-5">
      <form action={formAction} className="space-y-4">
        <div>
          <Label htmlFor="identifier">Username atau Email</Label>
          <div className="relative">
            <UserRound className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="identifier"
              name="identifier"
              type="text"
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              placeholder="kasir atau owner@email.com"
              className="pl-9"
              required
            />
          </div>
          <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
            Kasir masuk dengan username. Owner masuk dengan email.
          </p>
        </div>

        <div>
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Lock className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••"
              className="pr-10 pl-9"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute top-1/2 right-2 -translate-y-1/2 rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
              aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </div>

        {state?.error && (
          <p className="flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            {state.error}
          </p>
        )}

        <Button type="submit" className="w-full" size="lg" disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
          {pending ? "Memeriksa..." : "Masuk ke Kasir"}
        </Button>
      </form>

      {demoMode && (
        <div className="space-y-3 border-t border-dashed border-border pt-5">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">
              Mode Demo
            </span>
            <span className="text-[11px] text-muted-foreground">
              Supabase belum dikonfigurasi
            </span>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Coba seluruh fitur tanpa backend. Data contoh tersimpan di perangkat ini.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant="outline" onClick={() => enterDemo("OWNER")}>
              <Store className="size-4" /> Owner
            </Button>
            <Button type="button" variant="outline" onClick={() => enterDemo("EMPLOYEE")}>
              <ShieldCheck className="size-4" /> Kasir
            </Button>
          </div>
          {demoPassword ? (
            <div className="rounded-xl bg-stone-100 p-2.5 text-[10px] leading-relaxed text-stone-600">
              <p className="font-semibold text-stone-700">Akun demo</p>
              <p>
                Kasir: <span className="font-semibold">rizky</span> / {demoPassword}
              </p>
              <p>
                Owner: <span className="font-semibold">owner@nyamnyambox.demo</span> /{" "}
                {demoPassword}
              </p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
