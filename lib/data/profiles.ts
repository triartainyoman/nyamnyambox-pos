import { isDemoMode } from "@/lib/env";
import { CONFIG_ERROR, friendlyError, UserFacingError } from "@/lib/errors";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Profile, UserRole } from "@/lib/types";

function client() {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new UserFacingError(CONFIG_ERROR);
  return supabase;
}

export async function listProfiles(): Promise<Profile[]> {
  if (isDemoMode) {
    const { demoListProfiles } = await import("@/lib/demo/api");
    return demoListProfiles();
  }

  const { data, error } = await client()
    .from("profiles")
    .select("*")
    // The hidden DEVELOPER account is never part of the staff listing. RLS
    // already hides it from non-developers; this keeps the intent explicit.
    .neq("role", "DEVELOPER")
    .order("name", { ascending: true });

  if (error) throw new UserFacingError(friendlyError(error, "Gagal memuat data karyawan."));
  return (data ?? []) as Profile[];
}

export async function updateProfile(
  id: string,
  patch: Partial<Pick<Profile, "name" | "role" | "is_active">>,
): Promise<Profile> {
  if (isDemoMode) {
    const { demoUpdateProfile } = await import("@/lib/demo/api");
    return demoUpdateProfile(id, patch);
  }

  const { data, error } = await client()
    .from("profiles")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw new UserFacingError(friendlyError(error, "Gagal memperbarui akun karyawan."));
  return data as Profile;
}

export type { UserRole };
