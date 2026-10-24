import { AppShell } from "@/components/layout/app-shell";
import { Brand } from "@/components/brand";
import { LogoutButton } from "@/components/logout-button";
import { requireProfile } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/constants";
import type { Profile } from "@/lib/types";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile();

  if (!profile.is_active) {
    return <InactiveAccount profile={profile} />;
  }

  return <AppShell profile={profile}>{children}</AppShell>;
}

function InactiveAccount({ profile }: { profile: Profile }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-5">
      <Brand href="/login" />
      <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-6 text-center shadow-lg">
        <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
          <span className="text-xl">!</span>
        </div>
        <h1 className="text-lg font-bold">Akun dinonaktifkan</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Halo {profile.name}, akun {ROLE_LABELS[profile.role].toLowerCase()} Anda sedang tidak
          aktif. Hubungi Owner untuk mengaktifkan kembali.
        </p>
        <div className="mt-5 flex justify-center">
          <LogoutButton variant="outline" showLabel />
        </div>
      </div>
    </div>
  );
}
