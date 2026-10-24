import type { Profile } from "@/lib/types";

export const DEMO_COOKIE = "nyb_demo_role";
export const DEMO_PASSWORD = "demo123";

export const DEMO_OWNER_ID = "demo-owner";
export const DEMO_EMPLOYEE_ID = "demo-employee";

export const DEMO_PROFILES: Profile[] = [
  {
    id: DEMO_OWNER_ID,
    username: "owner",
    name: "Nadia Putri",
    email: "owner@nyamnyambox.demo",
    role: "OWNER",
    is_active: true,
    created_at: "2026-01-04T02:00:00.000Z",
  },
  {
    id: DEMO_EMPLOYEE_ID,
    username: "rizky",
    name: "Rizky Pratama",
    email: "kasir@nyamnyambox.demo",
    role: "EMPLOYEE",
    is_active: true,
    created_at: "2026-02-11T02:00:00.000Z",
  },
  {
    id: "demo-employee-2",
    username: "sari",
    name: "Sari Wulandari",
    email: "sari@nyamnyambox.demo",
    role: "EMPLOYEE",
    is_active: true,
    created_at: "2026-03-19T02:00:00.000Z",
  },
  {
    id: "demo-employee-3",
    username: "dimas",
    name: "Dimas Saputra",
    email: "dimas@nyamnyambox.demo",
    role: "EMPLOYEE",
    is_active: false,
    created_at: "2026-04-02T02:00:00.000Z",
  },
];

export function demoProfileForRole(role: string | undefined): Profile | null {
  if (role === "OWNER") return DEMO_PROFILES[0];
  if (role === "EMPLOYEE") return DEMO_PROFILES[1];
  return null;
}

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
