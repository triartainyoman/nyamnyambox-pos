import { describe, expect, it } from "vitest";

import { fallbackProfileFromIdentity } from "@/lib/auth-profile";

describe("fallbackProfileFromIdentity", () => {
  it("uses JWT metadata for username and name", () => {
    const profile = fallbackProfileFromIdentity({
      id: "user-1",
      email: "rizky@example.com",
      userMetadata: { username: "rizky", name: "Rizky Pratama" },
    });

    expect(profile).toMatchObject({
      id: "user-1",
      username: "rizky",
      name: "Rizky Pratama",
      email: "rizky@example.com",
      role: "EMPLOYEE",
      is_active: true,
    });
  });

  it("falls back to the email prefix when metadata is missing", () => {
    const profile = fallbackProfileFromIdentity({
      id: "user-2",
      email: "owner@nyamnyambox.demo",
    });

    expect(profile.username).toBe("owner");
    expect(profile.name).toBe("owner");
    expect(profile.role).toBe("EMPLOYEE");
  });

  it("never grants owner access from a missing profile row", () => {
    const profile = fallbackProfileFromIdentity({
      id: "user-3",
      email: "owner@example.com",
      userMetadata: { role: "MASTER_ADMIN", name: "Owner" },
    });

    expect(profile.role).toBe("EMPLOYEE");
  });

  it("handles a missing email and created_at", () => {
    const profile = fallbackProfileFromIdentity({ id: "user-4" });

    expect(profile.email).toBe("");
    expect(profile.username).toBe("kasir");
    expect(profile.name).toBe("kasir");
    expect(Number.isNaN(Date.parse(profile.created_at))).toBe(false);
  });

  it("keeps an explicit created_at", () => {
    const profile = fallbackProfileFromIdentity({
      id: "user-5",
      createdAt: "2026-01-02T03:04:05.000Z",
    });

    expect(profile.created_at).toBe("2026-01-02T03:04:05.000Z");
  });
});
