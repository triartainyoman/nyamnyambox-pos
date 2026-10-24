import { demoListProfiles, demoUpdateProfile } from "@/lib/demo/api";
import { isSupabaseConfigured } from "@/lib/env";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Profile, UserRole } from "@/lib/types";

function client() {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new Error("Supabase belum dikonfigurasi");
  return supabase;
}

export async function listProfiles(): Promise<Profile[]> {
  if (!isSupabaseConfigured) return demoListProfiles();

  const { data, error } = await client()
    .from("profiles")
    .select("*")
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as Profile[];
}

export async function updateProfile(
  id: string,
  patch: Partial<Pick<Profile, "name" | "role" | "is_active">>,
): Promise<Profile> {
  if (!isSupabaseConfigured) return demoUpdateProfile(id, patch);

  const { data, error } = await client()
    .from("profiles")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as Profile;
}

export type { UserRole };
