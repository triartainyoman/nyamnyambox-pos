import type { Profile } from "@/lib/types";

export interface Identity {
  id: string;
  email?: string | null;
  userMetadata?: Record<string, unknown> | null;
  createdAt?: string | null;
}

/**
 * Minimal profile used when the `profiles` row is missing (for example when
 * the signup trigger failed). It deliberately grants the least privilege:
 * EMPLOYEE, active, so the user can work but cannot reach owner screens.
 *
 * Kept dependency-free so it can be unit tested without Next.js or Supabase.
 */
export function fallbackProfileFromIdentity(identity: Identity): Profile {
  const email = identity.email ?? "";
  const emailName = email.split("@")[0] || "kasir";
  const metadata = identity.userMetadata ?? {};

  const username = typeof metadata.username === "string" ? metadata.username : emailName;
  const name = typeof metadata.name === "string" ? metadata.name : emailName;

  return {
    id: identity.id,
    username,
    name,
    email,
    role: "EMPLOYEE",
    is_active: true,
    created_at: identity.createdAt ?? new Date().toISOString(),
  };
}
