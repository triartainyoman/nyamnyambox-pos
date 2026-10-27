// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  MAX_REPORTS_PER_SESSION,
  buildClientErrorPayload,
  reportClientError,
  resetClientErrorReportsForTests,
  shouldReportClientError,
} from "@/lib/client-logging";

function jsonBody(fetchMock: ReturnType<typeof vi.fn>, index = 0) {
  return JSON.parse(String(fetchMock.mock.calls[index]?.[1]?.body));
}

beforeEach(() => {
  resetClientErrorReportsForTests();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("client error reporting", () => {
  it("redacts PII before sending", () => {
    const payload = buildClientErrorPayload(
      new Error("checkout failed for owner@nyamnyambox.demo / 081234567890"),
      "error-boundary",
    );

    expect(payload.message).toBe(
      "checkout failed for [redacted-email] / [redacted-phone]",
    );
    expect(payload.kind).toBe("error-boundary");
    expect(payload.url).toBe(window.location.href);
  });

  it("posts the payload to /api/log-error with keepalive", () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    reportClientError(new Error("boom"), "window.error");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/log-error");
    expect(init.method).toBe("POST");
    expect(init.keepalive).toBe(true);
    expect(jsonBody(fetchMock)).toMatchObject({
      kind: "window.error",
      message: "boom",
    });
  });

  it("de-duplicates the same error within a session", () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    reportClientError(new Error("same failure"), "error-boundary");
    reportClientError(new Error("same failure"), "error-boundary");

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("caps the number of reports per session", () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    for (let i = 0; i < MAX_REPORTS_PER_SESSION + 5; i += 1) {
      reportClientError(new Error(`failure ${i}`), "unhandledrejection");
    }

    expect(fetchMock).toHaveBeenCalledTimes(MAX_REPORTS_PER_SESSION);
  });

  it("never throws when the report request fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

    expect(() => reportClientError(new Error("boom"), "window.error")).not.toThrow();
    // Let the rejected promise settle so the catch branch runs.
    await Promise.resolve();
    await Promise.resolve();
  });

  it("ignores empty messages and known browser noise", () => {
    expect(shouldReportClientError("   ")).toBe(false);
    expect(shouldReportClientError("ResizeObserver loop completed with undelivered notifications")).toBe(
      false,
    );
    expect(shouldReportClientError("Script error.")).toBe(false);
    expect(shouldReportClientError("TypeError: cannot read properties of null")).toBe(true);
  });

  it("does nothing when there is no browser window", () => {
    // `reportClientError` bails out during SSR; simulate by removing `window`.
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("window", undefined);

    expect(() => reportClientError(new Error("ssr"), "window.error")).not.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
