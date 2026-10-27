/**
 * In-memory throttling (login failures and client error reports).
 *
 * Failed logins are counted per client IP and per identifier in a fixed
 * 15-minute window. A successful login clears both counters.
 *
 * This lives in module memory, so on Vercel it is per serverless instance:
 * it stops fast brute force against a warm instance, but a distributed attack
 * spread over many instances is not fully covered. That trade-off is
 * deliberate (T13 allows in-memory or Upstash); swap `buckets` for Upstash if
 * the app ever needs a shared counter.
 */

export const LOGIN_WINDOW_MS = 15 * 60 * 1000;
/** Wrong passwords allowed per username/email before the window is reset. */
export const LOGIN_IDENTIFIER_LIMIT = 5;
/** Wrong passwords allowed per IP. Higher because a shop can share one NAT IP. */
export const LOGIN_IP_LIMIT = 20;
/** Client error reports accepted per IP inside one window. */
export const CLIENT_ERROR_LIMIT = 30;
export const CLIENT_ERROR_WINDOW_MS = 10 * 60 * 1000;

/** Keeps the map from growing without bound on a long-lived instance. */
const MAX_BUCKETS = 5000;

export interface RateLimitRule {
  key: string;
  max: number;
}

export interface RateLimitStatus {
  limited: boolean;
  retryAfterSeconds: number;
}

interface Bucket {
  failures: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export function loginRateLimitRules(ip: string, identifier: string): RateLimitRule[] {
  return [
    { key: `ip:${ip}`, max: LOGIN_IP_LIMIT },
    { key: `id:${identifier.trim().toLowerCase()}`, max: LOGIN_IDENTIFIER_LIMIT },
  ];
}

/** Bucket for `POST /api/log-error`, kept separate from login counters. */
export function clientErrorRateLimitRules(ip: string): RateLimitRule[] {
  return [{ key: `client-error:${ip}`, max: CLIENT_ERROR_LIMIT }];
}

export function checkRateLimit(
  rules: RateLimitRule[],
  now = Date.now(),
): RateLimitStatus {
  let retryAfterSeconds = 0;

  for (const rule of rules) {
    const bucket = buckets.get(rule.key);
    if (!bucket) continue;
    if (bucket.resetAt <= now) {
      buckets.delete(rule.key);
      continue;
    }
    if (bucket.failures >= rule.max) {
      retryAfterSeconds = Math.max(
        retryAfterSeconds,
        Math.ceil((bucket.resetAt - now) / 1000),
      );
    }
  }

  return { limited: retryAfterSeconds > 0, retryAfterSeconds };
}

export function recordRateLimitFailure(
  rules: RateLimitRule[],
  now = Date.now(),
  windowMs = LOGIN_WINDOW_MS,
) {
  for (const rule of rules) {
    const bucket = buckets.get(rule.key);
    if (!bucket || bucket.resetAt <= now) {
      buckets.set(rule.key, { failures: 1, resetAt: now + windowMs });
      continue;
    }
    bucket.failures += 1;
  }

  if (buckets.size > MAX_BUCKETS) pruneExpired(now);
}

export function clearRateLimit(rules: RateLimitRule[]) {
  for (const rule of rules) buckets.delete(rule.key);
}

export function rateLimitMessage(retryAfterSeconds: number) {
  const minutes = Math.max(1, Math.ceil(retryAfterSeconds / 60));
  return `Terlalu banyak percobaan masuk. Coba lagi dalam ${minutes} menit.`;
}

/** First hop in `x-forwarded-for` is the client as seen by Vercel. */
export function clientIpFromHeaders(headers: {
  get(name: string): string | null;
}): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return headers.get("x-real-ip")?.trim() || "unknown";
}

function pruneExpired(now: number) {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

/** Test helper: forget every counter. */
export function resetRateLimitsForTests() {
  buckets.clear();
}
