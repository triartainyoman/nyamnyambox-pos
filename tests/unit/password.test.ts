import { describe, expect, it } from "vitest";

import { PASSWORD_MIN_LENGTH, validatePasswordChange, validatePasswordReset } from "@/lib/password";

function input(overrides: Partial<Parameters<typeof validatePasswordChange>[0]> = {}) {
  return {
    currentPassword: "lama12345",
    newPassword: "baru12345",
    confirmPassword: "baru12345",
    ...overrides,
  };
}

describe("validatePasswordChange", () => {
  it("accepts a valid change", () => {
    expect(validatePasswordChange(input())).toBeNull();
  });

  it("accepts exactly the minimum length", () => {
    const password = "a".repeat(PASSWORD_MIN_LENGTH);
    expect(
      validatePasswordChange(
        input({ newPassword: password, confirmPassword: password }),
      ),
    ).toBeNull();
  });

  it("requires the current password", () => {
    expect(validatePasswordChange(input({ currentPassword: "" }))).toBe(
      "Password saat ini wajib diisi.",
    );
  });

  it("rejects a short new password", () => {
    expect(
      validatePasswordChange(
        input({ newPassword: "pendek", confirmPassword: "pendek" }),
      ),
    ).toBe(`Password baru minimal ${PASSWORD_MIN_LENGTH} karakter.`);
  });

  it("rejects reusing the current password", () => {
    expect(
      validatePasswordChange(
        input({ newPassword: "lama12345", confirmPassword: "lama12345" }),
      ),
    ).toBe("Password baru harus berbeda dari password saat ini.");
  });

  it("requires matching confirmation", () => {
    expect(validatePasswordChange(input({ confirmPassword: "beda12345" }))).toBe(
      "Konfirmasi password tidak sama.",
    );
  });
});

describe("validatePasswordReset", () => {
  it("accepts a matching password", () => {
    expect(
      validatePasswordReset({ password: "baru12345", confirmPassword: "baru12345" }),
    ).toBeNull();
  });

  it("rejects a short password", () => {
    expect(
      validatePasswordReset({ password: "pendek", confirmPassword: "pendek" }),
    ).toBe(`Password baru minimal ${PASSWORD_MIN_LENGTH} karakter.`);
  });

  it("requires matching confirmation", () => {
    expect(
      validatePasswordReset({ password: "baru12345", confirmPassword: "beda12345" }),
    ).toBe("Konfirmasi password tidak sama.");
  });
});
