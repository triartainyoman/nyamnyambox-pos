import { DEMO_EMPLOYEE_ID, DEMO_OWNER_ID } from "@/lib/demo/constants";
import type { Profile } from "@/lib/types";

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
  {
    id: "demo-developer",
    username: "developer",
    name: "Developer",
    email: "developer@nyamnyambox.demo",
    role: "DEVELOPER",
    is_active: true,
    created_at: "2026-01-01T02:00:00.000Z",
  },
];

export function demoProfileForRole(role: string | undefined): Profile | null {
  if (role === "OWNER") {
    return DEMO_PROFILES.find((profile) => profile.role === "OWNER") ?? null;
  }
  if (role === "DEVELOPER") {
    return DEMO_PROFILES.find((profile) => profile.role === "DEVELOPER") ?? null;
  }
  if (role === "EMPLOYEE") {
    return DEMO_PROFILES.find((profile) => profile.role === "EMPLOYEE") ?? null;
  }
  return null;
}
