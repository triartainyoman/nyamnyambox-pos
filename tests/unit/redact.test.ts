import { describe, expect, it } from "vitest";

import {
  isSensitiveKey,
  redactError,
  redactString,
  redactValue,
  safeStringify,
} from "@/lib/redact";

describe("redactString", () => {
  it("replaces e-mail addresses", () => {
    expect(redactString("login failed for owner@nyamnyambox.demo")).toBe(
      "login failed for [redacted-email]",
    );
  });

  it("replaces Indonesian phone numbers in every common format", () => {
    for (const phone of ["081234567890", "0812-3456-7890", "+62 812 3456 7890", "6281234567890"]) {
      expect(redactString(`chat ${phone} selesai`)).toBe("chat [redacted-phone] selesai");
    }
  });

  it("replaces bearer tokens, JWTs and Supabase keys", () => {
    expect(redactString("Authorization: Bearer abcdefghijklmnop")).toContain(
      "Bearer [redacted-token]",
    );

    const jwt =
      "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U";
    expect(redactString(`token=${jwt}`)).toBe("token=[redacted-jwt]");

    expect(redactString("key sb_secret_abcdefgh12345678")).toBe(
      "key [redacted-supabase-key]",
    );
  });

  it("replaces database URLs with credentials", () => {
    expect(
      redactString("postgresql://postgres:supersecret@db.example.co:5432/postgres"),
    ).toBe("[redacted-database-url]");
  });

  it("truncates long values and marks the cut", () => {
    const result = redactString("x".repeat(900), 100);
    expect(result.startsWith("x".repeat(100))).toBe(true);
    expect(result).toContain("…[truncated 800 chars]");
  });

  it("leaves ordinary text untouched", () => {
    expect(redactString("Transaksi hanya dapat diedit pada hari yang sama")).toBe(
      "Transaksi hanya dapat diedit pada hari yang sama",
    );
  });
});

describe("isSensitiveKey", () => {
  it("flags credentials, identifiers and contact data", () => {
    for (const key of [
      "password",
      "newPassword",
      "secret",
      "access_token",
      "authorization",
      "cookie",
      "apiKey",
      "api_key",
      "session",
      "email",
      "customer_phone",
      "whatsapp",
      "username",
    ]) {
      expect(isSensitiveKey(key), key).toBe(true);
    }
  });

  it("does not flag operational fields", () => {
    for (const key of ["path", "method", "routePath", "status", "latencyMs", "event", "commit"]) {
      expect(isSensitiveKey(key), key).toBe(false);
    }
  });
});

describe("redactValue", () => {
  it("blanks sensitive fields and keeps the rest", () => {
    const redacted = redactValue({
      event: "login.attempt",
      path: "/login",
      email: "owner@nyamnyambox.demo",
      password: "demo123",
      nested: { customer_phone: "081234567890", status: 401 },
    }) as Record<string, unknown>;

    expect(redacted.event).toBe("login.attempt");
    expect(redacted.path).toBe("/login");
    expect(redacted.email).toBe("[redacted]");
    expect(redacted.password).toBe("[redacted]");
    expect(redacted.nested).toEqual({ customer_phone: "[redacted]", status: 401 });
  });

  it("scrubs free text inside values", () => {
    const redacted = redactValue({ note: "hubungi 081234567890" }) as Record<string, unknown>;
    expect(redacted.note).toBe("hubungi [redacted-phone]");
  });

  it("caps arrays and object depth", () => {
    const redacted = redactValue({ items: Array.from({ length: 25 }, (_, i) => i) }) as {
      items: unknown[];
    };
    expect(redacted.items).toHaveLength(21);
    expect(redacted.items[20]).toBe("[+5 more]");

    let deep: Record<string, unknown> = { value: "end" };
    for (let i = 0; i < 8; i += 1) deep = { next: deep };
    expect(JSON.stringify(redactValue(deep))).toContain("[truncated]");
  });

  it("survives circular references", () => {
    const circular: Record<string, unknown> = { name: "root" };
    circular.self = circular;
    expect(() => JSON.stringify(redactValue(circular))).not.toThrow();
    expect(JSON.stringify(redactValue(circular))).toContain("[circular]");
  });

  it("drops functions and symbols instead of failing", () => {
    const redacted = redactValue({ fn: () => 1, sym: Symbol("x"), keep: true }) as Record<
      string,
      unknown
    >;
    expect(redacted).toEqual({ keep: true });
  });
});

describe("redactError", () => {
  it("normalises a real Error and scrubs its message", () => {
    const error = new Error("cannot sign in owner@nyamnyambox.demo");
    error.stack = "Error: cannot sign in owner@nyamnyambox.demo\n    at login (auth.ts:1:1)";

    const redacted = redactError(error);
    expect(redacted.name).toBe("Error");
    expect(redacted.message).toBe("cannot sign in [redacted-email]");
    expect(redacted.stack).toContain("[redacted-email]");
  });

  it("normalises a Supabase-style error object", () => {
    const redacted = redactError({
      code: "42501",
      message: "permission denied for table profiles",
      details: null,
    });
    expect(redacted.message).toBe("permission denied for table profiles");
  });

  it("keeps the React digest when present", () => {
    const redacted = redactError({ message: "boom", digest: "1234567890" });
    expect(redacted.digest).toBe("1234567890");
  });

  it("handles strings and unknown values", () => {
    expect(redactError("plain failure").message).toBe("plain failure");
    expect(redactError(null).message).toBe("null");
  });
});

describe("safeStringify", () => {
  it("never throws on circular input", () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(safeStringify(circular)).toBe("[object Object]");
  });
});
