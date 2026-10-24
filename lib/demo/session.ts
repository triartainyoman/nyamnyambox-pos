import { DEMO_PROFILES } from "@/lib/demo/profiles";
import type { Profile } from "@/lib/types";

/**
 * Server-side demo credentials. This module must only be imported from
 * server code (server actions / server components) so the password never
 * reaches the production client bundle.
 */
export const DEMO_PASSWORD = "demo123";

/**
 * Demo-only credential check. Real username authentication happens in the
 * server action against Supabase; this lets the demo be explored end-to-end.
 * Owners must use their email — their username is intentionally not accepted.
 */
export function demoLogin(identifier: string, password: string): Profile | null {
  if (password !== DEMO_PASSWORD) return null;
  const value = identifier.trim().toLowerCase();

  return (
    DEMO_PROFILES.find((profile) => {
      if (!profile.is_active) return false;
      if (profile.email.toLowerCase() === value) return true;
      return profile.role === "EMPLOYEE" && profile.username === value;
    }) ?? null
  );
}
