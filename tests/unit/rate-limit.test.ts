import { beforeEach, describe, expect, it } from "vitest";

import {
  CLIENT_ERROR_LIMIT,
  CLIENT_ERROR_WINDOW_MS,
  LOGIN_IDENTIFIER_LIMIT,
  LOGIN_WINDOW_MS,
  checkRateLimit,
  clearRateLimit,
  clientErrorRateLimitRules,
  clientIpFromHeaders,
  loginRateLimitRules,
  rateLimitMessage,
  recordRateLimitFailure,
  resetRateLimitsForTests,
} from "@/lib/rate-limit";

const T0 = 1_760_000_000_000;

function rules(identifier = "rizky", ip = "203.0.113.7") {
  return loginRateLimitRules(ip, identifier);
}

describe("login rate limit", () => {
  beforeEach(() => resetRateLimitsForTests());

  it("allows attempts below the identifier limit", () => {
    for (let i = 0; i < LOGIN_IDENTIFIER_LIMIT - 1; i += 1) {
      recordRateLimitFailure(rules(), T0 + i);
    }
    expect(checkRateLimit(rules(), T0).limited).toBe(false);
  });

  it("blocks once the identifier limit is reached", () => {
    for (let i = 0; i < LOGIN_IDENTIFIER_LIMIT; i += 1) {
      recordRateLimitFailure(rules(), T0 + i);
    }
    const status = checkRateLimit(rules(), T0 + 1000);
    expect(status.limited).toBe(true);
    expect(status.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("matches identifiers case-insensitively and trims whitespace", () => {
    for (let i = 0; i < LOGIN_IDENTIFIER_LIMIT; i += 1) {
      recordRateLimitFailure(rules("Rizky"), T0 + i);
    }
    expect(checkRateLimit(rules("  rizky  "), T0).limited).toBe(true);
  });

  it("keeps different identifiers independent", () => {
    for (let i = 0; i < LOGIN_IDENTIFIER_LIMIT; i += 1) {
      recordRateLimitFailure(rules("rizky"), T0 + i);
    }
    expect(checkRateLimit(rules("sari"), T0).limited).toBe(false);
  });

  it("keeps IP counters separate from the identifier counter", () => {
    for (let i = 0; i < LOGIN_IDENTIFIER_LIMIT; i += 1) {
      recordRateLimitFailure(rules("rizky", "203.0.113.7"), T0 + i);
    }
    // Same identifier from a new IP is still limited (identifier rule), but the
    // IP rule itself must not leak to the new address.
    const otherIdentifier = checkRateLimit(rules("sari", "203.0.113.8"), T0);
    expect(otherIdentifier.limited).toBe(false);
  });

  it("expires the window after 15 minutes", () => {
    for (let i = 0; i < LOGIN_IDENTIFIER_LIMIT; i += 1) {
      recordRateLimitFailure(rules(), T0 + i);
    }
    expect(checkRateLimit(rules(), T0).limited).toBe(true);
    expect(checkRateLimit(rules(), T0 + LOGIN_WINDOW_MS + 1).limited).toBe(false);
  });

  it("clears counters after a successful login", () => {
    for (let i = 0; i < LOGIN_IDENTIFIER_LIMIT; i += 1) {
      recordRateLimitFailure(rules(), T0 + i);
    }
    clearRateLimit(rules());
    expect(checkRateLimit(rules(), T0).limited).toBe(false);
  });

  it("blocks after 20 failures from one IP even across identifiers", () => {
    for (let i = 0; i < 20; i += 1) {
      recordRateLimitFailure(rules(`user-${i}`, "198.51.100.9"), T0 + i);
    }
    expect(checkRateLimit(rules("fresh-user", "198.51.100.9"), T0).limited).toBe(true);
    expect(checkRateLimit(rules("fresh-user", "198.51.100.10"), T0).limited).toBe(false);
  });

  it("formats a retry message in whole minutes", () => {
    expect(rateLimitMessage(30)).toBe("Terlalu banyak percobaan masuk. Coba lagi dalam 1 menit.");
    expect(rateLimitMessage(15 * 60)).toBe(
      "Terlalu banyak percobaan masuk. Coba lagi dalam 15 menit.",
    );
  });
});

describe("client error rate limit", () => {
  beforeEach(() => resetRateLimitsForTests());

  it("allows reports below the limit", () => {
    for (let i = 0; i < CLIENT_ERROR_LIMIT - 1; i += 1) {
      recordRateLimitFailure(clientErrorRateLimitRules("203.0.113.7"), T0 + i, CLIENT_ERROR_WINDOW_MS);
    }
    expect(checkRateLimit(clientErrorRateLimitRules("203.0.113.7"), T0).limited).toBe(false);
  });

  it("blocks after the limit is reached", () => {
    for (let i = 0; i < CLIENT_ERROR_LIMIT; i += 1) {
      recordRateLimitFailure(clientErrorRateLimitRules("203.0.113.7"), T0 + i, CLIENT_ERROR_WINDOW_MS);
    }
    expect(checkRateLimit(clientErrorRateLimitRules("203.0.113.7"), T0).limited).toBe(true);
  });

  it("expires after ten minutes", () => {
    for (let i = 0; i < CLIENT_ERROR_LIMIT; i += 1) {
      recordRateLimitFailure(clientErrorRateLimitRules("203.0.113.7"), T0 + i, CLIENT_ERROR_WINDOW_MS);
    }
    expect(
      checkRateLimit(clientErrorRateLimitRules("203.0.113.7"), T0 + CLIENT_ERROR_WINDOW_MS + 1)
        .limited,
    ).toBe(false);
  });

  it("does not share counters with login throttling", () => {
    for (let i = 0; i < LOGIN_IDENTIFIER_LIMIT; i += 1) {
      recordRateLimitFailure(loginRateLimitRules("203.0.113.7", "rizky"), T0 + i);
    }
    expect(checkRateLimit(clientErrorRateLimitRules("203.0.113.7"), T0).limited).toBe(false);
    expect(checkRateLimit(loginRateLimitRules("203.0.113.7", "rizky"), T0).limited).toBe(true);
  });
});

describe("clientIpFromHeaders", () => {
  it("uses the first x-forwarded-for hop", () => {
    const headers = new Headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" });
    expect(clientIpFromHeaders(headers)).toBe("203.0.113.7");
  });

  it("falls back to x-real-ip", () => {
    expect(clientIpFromHeaders(new Headers({ "x-real-ip": "198.51.100.4" }))).toBe("198.51.100.4");
  });

  it("returns a stable placeholder when no header is present", () => {
    expect(clientIpFromHeaders(new Headers())).toBe("unknown");
  });
});
