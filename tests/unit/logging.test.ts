import { afterEach, describe, expect, it, vi } from "vitest";

import { LOG_SERVICE, logError, logInfo, logWarn } from "@/lib/logging";

function lastLine(spy: ReturnType<typeof vi.spyOn>): Record<string, unknown> {
  const call = spy.mock.calls.at(-1);
  return JSON.parse(String(call?.[0]));
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("structured logging", () => {
  it("emits one JSON line with level, event, service and timestamp", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    logInfo("app.start", { runtime: "nodejs", supabaseConfigured: true });

    const entry = lastLine(spy);
    expect(entry.level).toBe("info");
    expect(entry.event).toBe("app.start");
    expect(entry.service).toBe(LOG_SERVICE);
    expect(entry.runtime).toBe("nodejs");
    expect(entry.supabaseConfigured).toBe(true);
    expect(new Date(String(entry.time)).toString()).not.toBe("Invalid Date");
  });

  it("routes warnings and errors to the matching console method", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const log = vi.spyOn(console, "log").mockImplementation(() => {});

    logWarn("quota.near", { used: 9 });
    logError("request.error", new Error("boom"));

    expect(lastLine(warn).event).toBe("quota.near");
    expect(lastLine(error).event).toBe("request.error");
    expect(log).not.toHaveBeenCalled();
  });

  it("redacts PII and credentials from the error and the fields", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const error = new Error("sign-in failed for owner@nyamnyambox.demo");
    error.stack = "Error: sign-in failed for owner@nyamnyambox.demo\n    at login";

    logError("request.error", error, {
      path: "/login?email=owner@nyamnyambox.demo",
      token: "sb_secret_abcdefgh12345678",
      ipHash: "a1b2c3d4e5f6",
    });

    const entry = lastLine(spy);
    const errorEntry = entry.error as Record<string, unknown>;

    expect(errorEntry.message).toBe("sign-in failed for [redacted-email]");
    expect(String(errorEntry.stack)).not.toContain("owner@nyamnyambox.demo");
    expect(entry.path).toBe("/login?email=[redacted-email]");
    expect(entry.token).toBe("[redacted]");
    expect(entry.ipHash).toBe("a1b2c3d4e5f6");
  });

  it("keeps a Supabase error readable while staying safe", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    logError("db.error", { code: "42501", message: "permission denied for table orders" });

    const entry = lastLine(spy);
    const errorEntry = entry.error as Record<string, unknown>;
    expect(errorEntry.code).toBe("42501");
    expect(errorEntry.message).toBe("permission denied for table orders");
  });

  it("truncates very long messages", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    logError("request.error", new Error("x".repeat(2000)));

    const entry = lastLine(spy);
    const errorEntry = entry.error as Record<string, unknown>;
    expect(String(errorEntry.message)).toContain("[truncated");
    expect(String(errorEntry.message).length).toBeLessThan(900);
  });
});
