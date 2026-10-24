import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { DEMO_COOKIE } from "@/lib/demo/constants";
import { demoProfileForRole } from "@/lib/demo/profiles";
import { isDemoMode, isSupabaseConfigured } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export async function getCurrentProfile(): Promise<Profile | null> {
  // Only trust the unsigned demo cookie in explicit, non-production demo mode.
  if (isDemoMode) {
    const role = (await cookies()).get(DEMO_COOKIE)?.value;
    return demoProfileForRole(role);
  }

  if (!isSupabaseConfigured) return null;

  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  if (data) return data as Profile;

  // The profile trigger should always run, but never lock the user out if it
  // is missing — fall back to a minimal employee profile.
  return {
    id: user.id,
    username: user.user_metadata?.username ?? user.email?.split("@")[0] ?? "kasir",
    name: user.user_metadata?.name ?? user.email?.split("@")[0] ?? "Kasir",
    email: user.email ?? "",
    role: "EMPLOYEE",
    is_active: true,
    created_at: user.created_at ?? new Date().toISOString(),
  };
}

export async function requireProfile(): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  return profile;
}
