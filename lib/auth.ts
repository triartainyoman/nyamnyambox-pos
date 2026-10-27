import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";

import { fallbackProfileFromIdentity, type Identity } from "@/lib/auth-profile";
import { DEMO_COOKIE } from "@/lib/demo/constants";
import { demoProfileForRole } from "@/lib/demo/profiles";
import { isDemoMode, isSupabaseConfigured } from "@/lib/env";
import { logWarn } from "@/lib/logging";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import type { Profile } from "@/lib/types";

async function resolveProfile(
  supabase: SupabaseClient<Database>,
  identity: Identity,
): Promise<Profile> {
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", identity.id)
    .maybeSingle();
  if (data) return data as Profile;

  // The profile trigger should always run, but never lock the user out if it
  // is missing — fall back to a minimal employee profile built from the token.
  return fallbackProfileFromIdentity(identity);
}

/**
 * Resolve the signed-in profile once per request.
 *
 * `cache()` deduplicates the work between `app/(app)/layout.tsx` and the page
 * that both call `requireProfile()` — without it every page render made four
 * network round trips (two `getUser` + two `profiles`).
 *
 * `getClaims()` verifies the access token locally against the cached JWKS for
 * asymmetric (ES256/RS256) signing keys, which removes one Auth round trip per
 * navigation. Symmetric projects transparently fall back to a server check.
 */
const loadCurrentProfile = cache(async (): Promise<Profile | null> => {
  // Only trust the unsigned demo cookie in explicit, non-production demo mode.
  if (isDemoMode) {
    const role = (await cookies()).get(DEMO_COOKIE)?.value;
    return demoProfileForRole(role);
  }

  if (!isSupabaseConfigured) return null;

  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const { data, error } = await supabase.auth.getClaims();

  if (error) {
    // A JWKS fetch/verification failure must not lock the whole store out.
    // Fall back to the Auth server for this request.
    logWarn("auth.claims.failed", { error });
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;
    return resolveProfile(supabase, {
      id: user.id,
      email: user.email,
      userMetadata: user.user_metadata,
      createdAt: user.created_at,
    });
  }

  const claims = data?.claims;
  if (!claims?.sub) return null;

  return resolveProfile(supabase, {
    id: claims.sub,
    email: claims.email,
    userMetadata: claims.user_metadata,
  });
});

export function getCurrentProfile(): Promise<Profile | null> {
  return loadCurrentProfile();
}

export async function requireProfile(): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  return profile;
}
