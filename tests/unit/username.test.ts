import { describe, expect, it } from "vitest";

import { normalizeUsername, validateUsername } from "@/lib/username";

describe("normalizeUsername", () => {
  it("trims surrounding whitespace and lowercases", () => {
    expect(normalizeUsername("  Rizky.Pagi  ")).toBe("rizky.pagi");
  });

  it("keeps dots, underscores, and hyphens", () => {
    expect(normalizeUsername("kasir_01-pagi")).toBe("kasir_01-pagi");
  });

  it("returns an empty string for blank input", () => {
    expect(normalizeUsername("   ")).toBe("");
  });
});

describe("validateUsername", () => {
  it.each(["rizky", "kasir.01", "kasir_01", "kasir-01", "a1b", "Rizky"])(
    "accepts %s",
    (value) => {
      expect(validateUsername(value)).toBeNull();
    },
  );

  it("accepts a 30-character username and rejects 31", () => {
    expect(validateUsername("a".repeat(30))).toBeNull();
    expect(validateUsername("a".repeat(31))).toBe("Username maksimal 30 karakter.");
  });

  it("rejects blank input", () => {
    expect(validateUsername("")).toBe("Username wajib diisi.");
    expect(validateUsername("   ")).toBe("Username wajib diisi.");
  });

  it("rejects usernames shorter than 3 characters", () => {
    expect(validateUsername("ab")).toBe("Username minimal 3 karakter.");
  });

  it.each([".rizky", "rizky.", "-rizky", "rizky-", "_rizky", "rizky_"])(
    "rejects leading/trailing separators in %s",
    (value) => {
      expect(validateUsername(value)).toContain("Format username tidak valid.");
    },
  );

  it.each(["riz ky", "rizky@mail", "rizky!", "rìzky"])("rejects unsupported characters in %s", (value) => {
    expect(validateUsername(value)).toContain("Format username tidak valid.");
  });

  it("normalizes before validating", () => {
    expect(validateUsername("  KASIR.01 ")).toBeNull();
  });
});
