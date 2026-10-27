import {
  AlertTriangle,
  Flame,
  ReceiptText,
  TrendingUp,
  UtensilsCrossed,
} from "lucide-react";

import { LoginForm } from "@/components/auth/login-form";
import { Brand } from "@/components/brand";
import { DEMO_PASSWORD } from "@/lib/demo/session";
import { isAuthConfigured, isDemoMode } from "@/lib/env";

const HIGHLIGHTS = [
  { icon: ReceiptText, title: "Checkout kilat", text: "Kanal, pembayaran, dan nota dalam satu layar." },
  { icon: TrendingUp, title: "Analitik harian", text: "Omzet, AOV, kanal, dan menu terlaris." },
  { icon: Flame, title: "Mobile-first", text: "Dirancang untuk dipakai cepat dari HP kasir." },
];

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  // Signed-in visitors never reach this render: the Proxy checks the JWT and
  // redirects to `/`, which resolves the role. Keeping the auth check out of
  // the page removes a profile query from the most-visited cold entry point.
  const { next } = await searchParams;

  return (
    <div className="flex min-h-dvh flex-col bg-background lg:grid lg:grid-cols-[1.05fr_1fr]">
      <section className="relative hidden overflow-hidden bg-gradient-to-br from-orange-600 via-orange-500 to-red-600 p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -top-24 -right-16 size-72 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-24 -left-10 size-80 rounded-full bg-amber-300/20 blur-3xl" />

        <div className="relative flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
            <UtensilsCrossed className="size-6" />
          </span>
          <div>
            <p className="text-lg font-extrabold tracking-tight">Nyamnyambox</p>
            <p className="text-xs uppercase tracking-[0.18em] text-white/70">Ricebowl &amp; Snacks</p>
          </div>
        </div>

        <div className="relative max-w-md">
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight">
            Satu aplikasi untuk semua pesanan.
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-white/80">
            Catat order dine-in, takeaway, GrabFood, ShopeeFood, dan WhatsApp tanpa nota kertas.
            Cetak struk, kirim rincian, dan pantau omzet dari mana saja.
          </p>

          <div className="mt-8 space-y-3">
            {HIGHLIGHTS.map(({ icon: Icon, title, text }) => (
              <div key={title} className="flex items-start gap-3 rounded-2xl bg-white/10 p-3.5 backdrop-blur">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white/15">
                  <Icon className="size-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold">{title}</p>
                  <p className="text-xs text-white/75">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-xs text-white/60">
          © {new Date().getFullYear()} Nyamnyambox · POS v1.0
        </p>
      </section>

      <section className="flex flex-1 flex-col items-center justify-center px-5 py-10">
        <div className="w-full max-w-sm">
          <div className="mb-7 flex flex-col items-center text-center lg:items-start lg:text-left">
            <div className="mb-4 lg:hidden">
              <Brand />
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight">Selamat datang kembali 👋</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Masuk untuk mulai mencatat pesanan hari ini.
            </p>
          </div>

          <div className="rounded-3xl border border-border bg-card p-5 shadow-xl shadow-orange-900/5">
            {isAuthConfigured ? (
              <LoginForm
                demoMode={isDemoMode}
                demoPassword={isDemoMode ? DEMO_PASSWORD : undefined}
              />
            ) : (
              <div className="space-y-3 py-2 text-center">
                <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
                  <AlertTriangle className="size-6" />
                </div>
                <h3 className="text-base font-bold">Konfigurasi belum lengkap</h3>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Server belum terhubung ke database. Hubungi admin toko untuk menyelesaikan
                  konfigurasi sebelum aplikasi digunakan.
                </p>
                {process.env.NODE_ENV !== "production" ? (
                  <p className="rounded-xl bg-stone-100 px-3 py-2 text-xs leading-relaxed text-stone-600">
                    Mode pengembangan: isi <code className="font-semibold">.env.local</code> dengan
                    kredensial Supabase, atau set{" "}
                    <code className="font-semibold">NEXT_PUBLIC_DEMO_MODE=true</code> untuk mencoba
                    mode demo lokal.
                  </p>
                ) : null}
              </div>
            )}
          </div>

          {next ? (
            <p className="mt-4 text-center text-xs text-muted-foreground">
              Anda akan diarahkan ke halaman yang diminta setelah masuk.
            </p>
          ) : null}

          {isAuthConfigured ? (
            <p className="mt-6 text-center text-xs leading-relaxed text-muted-foreground">
              Kasir masuk dengan username, Owner dengan email. Hubungi admin jika lupa password.
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
