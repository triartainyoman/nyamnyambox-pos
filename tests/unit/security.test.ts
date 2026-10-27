import { describe, expect, it } from "vitest";

import { SECURITY_HEADERS, buildCsp, createNonce } from "@/lib/security";

const SUPABASE = "https://exampleproject.supabase.co";

describe("buildCsp", () => {
  it("uses a nonce and strict-dynamic in production", () => {
    const csp = buildCsp({ nonce: "abc123", dev: false, supabaseUrl: SUPABASE, secure: true });
    expect(csp).toContain("script-src 'self' 'nonce-abc123' 'strict-dynamic'");
    expect(csp).not.toContain("'unsafe-eval'");
    expect(csp).not.toContain("script-src 'self' 'unsafe-inline'");
    expect(csp).toContain("upgrade-insecure-requests");
  });

  it("keeps inline styles allowed for Radix and Recharts", () => {
    const csp = buildCsp({ nonce: "abc123", dev: false, supabaseUrl: SUPABASE, secure: true });
    expect(csp).toContain("style-src 'self' 'unsafe-inline'");
  });

  it("allows the Supabase REST and realtime origins", () => {
    const csp = buildCsp({ nonce: "abc123", dev: false, supabaseUrl: SUPABASE, secure: true });
    expect(csp).toContain("connect-src 'self' https://exampleproject.supabase.co wss://exampleproject.supabase.co");
  });

  it("locks down framing and object embedding", () => {
    const csp = buildCsp({ nonce: "abc123", dev: false, supabaseUrl: "", secure: true });
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("form-action 'self'");
  });

  it("omits upgrade-insecure-requests when the document is not HTTPS", () => {
    const csp = buildCsp({ nonce: "abc123", dev: false, supabaseUrl: "", secure: false });
    expect(csp).not.toContain("upgrade-insecure-requests");
  });

  it("stays permissive in development so HMR works", () => {
    const csp = buildCsp({ nonce: "abc123", dev: true, supabaseUrl: "", secure: false });
    expect(csp).toContain("'unsafe-eval'");
    expect(csp).toContain("'unsafe-inline'");
    expect(csp).toContain("ws:");
    expect(csp).not.toContain("upgrade-insecure-requests");
  });

  it("ignores an invalid Supabase URL instead of emitting a broken directive", () => {
    const csp = buildCsp({ nonce: "abc123", dev: false, supabaseUrl: "not a url", secure: true });
    expect(csp).toContain("connect-src 'self'");
    expect(csp).not.toContain("not a url");
  });
});

describe("createNonce", () => {
  it("returns a different base64 value each time", () => {
    const a = createNonce();
    const b = createNonce();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[A-Za-z0-9+/]+={0,2}$/);
    expect(Buffer.from(a, "base64")).toHaveLength(16);
  });
});

describe("SECURITY_HEADERS", () => {
  it("covers transport, sniffing, framing, referrer, and permissions", () => {
    const keys = SECURITY_HEADERS.map((header) => header.key);
    expect(keys).toEqual(
      expect.arrayContaining([
        "Strict-Transport-Security",
        "X-Content-Type-Options",
        "X-Frame-Options",
        "Referrer-Policy",
        "Permissions-Policy",
      ]),
    );
    expect(keys).not.toContain("Content-Security-Policy");
  });
});
