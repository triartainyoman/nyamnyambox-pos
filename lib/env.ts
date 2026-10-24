export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/**
 * Supabase is the real backend. When both public values are present the app
 * uses Supabase Auth + Postgres and demo mode is ignored.
 */
export const isSupabaseConfigured =
  SUPABASE_URL.startsWith("http") && SUPABASE_ANON_KEY.length > 20;

/**
 * Demo mode is a local-only convenience backed by localStorage.
 *
 * It requires an explicit opt-in (`NEXT_PUBLIC_DEMO_MODE=true`) and is
 * hard-disabled in production builds. This is deliberate: a missing Supabase
 * env in production must never silently become an unauthenticated demo where
 * a forged `nyb_demo_role` cookie grants Owner access.
 */
export const isDemoMode =
  !isSupabaseConfigured &&
  process.env.NEXT_PUBLIC_DEMO_MODE === "true" &&
  process.env.NODE_ENV !== "production";

/**
 * True when the app can authenticate users at all. When false, the login
 * screen shows a configuration notice instead of a form.
 */
export const isAuthConfigured = isSupabaseConfigured || isDemoMode;
