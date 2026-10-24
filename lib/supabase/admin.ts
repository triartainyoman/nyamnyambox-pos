import { createClient } from "@supabase/supabase-js";

import { SUPABASE_URL } from "@/lib/env";
import type { Database } from "@/lib/supabase/types";

/**
 * Server-only Supabase client. Never import this from a client component —
 * the service role key bypasses Row Level Security.
 */
export function createSupabaseAdminClient(serviceKey: string) {
  return createClient<Database>(SUPABASE_URL, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
