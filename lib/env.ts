export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/**
 * When the Supabase environment variables are missing the app runs in
 * "Demo Mode" using a local, localStorage-backed dataset. This keeps the UI
 * fully explorable before a Supabase project is provisioned.
 */
export const isSupabaseConfigured =
  SUPABASE_URL.startsWith("http") && SUPABASE_ANON_KEY.length > 20;
