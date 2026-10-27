/**
 * Client-side error reporting.
 *
 * Browser errors are POSTed to `/api/log-error`, which normalises them into the
 * same structured log line as server errors. The reporter is deliberately
 * defensive:
 *
 *  - it never throws (a failed report must not break the app),
 *  - it redacts before sending, so PII does not travel to our own endpoint,
 *  - it de-duplicates and caps reports per session so an error loop cannot
 *    flood the server,
 *  - it ignores known-benign browser noise.
 */

import { redactError, redactString } from "@/lib/redact";

export type ClientErrorKind =
  | "window.error"
  | "unhandledrejection"
  | "error-boundary"
  | "global-error";

export interface ClientErrorPayload {
  kind: ClientErrorKind;
  message: string;
  stack?: string;
  digest?: string;
  url?: string;
  userAgent?: string;
}

export const MAX_REPORTS_PER_SESSION = 12;

/** Browser noise that is not actionable and would only add log volume. */
const IGNORED_MESSAGES = [
  /ResizeObserver loop/i,
  // Chrome extension / injected-script noise.
  /^Script error\.?$/i,
];

const reported = new Set<string>();

export function shouldReportClientError(message: string): boolean {
  const trimmed = message.trim();
  if (!trimmed) return false;
  return !IGNORED_MESSAGES.some((pattern) => pattern.test(trimmed));
}

export function buildClientErrorPayload(error: unknown, kind: ClientErrorKind): ClientErrorPayload {
  const redacted = redactError(error);

  return {
    kind,
    message: redacted.message,
    stack: redacted.stack,
    digest: redacted.digest,
    url: typeof window === "undefined" ? undefined : redactString(window.location.href, 300),
    userAgent:
      typeof navigator === "undefined" ? undefined : redactString(navigator.userAgent, 200),
  };
}

/** Report a client error once per session (same kind + message + digest). */
export function reportClientError(error: unknown, kind: ClientErrorKind = "error-boundary") {
  if (typeof window === "undefined") return;

  const payload = buildClientErrorPayload(error, kind);
  if (!shouldReportClientError(payload.message)) return;

  const key = `${payload.kind}:${payload.message}:${payload.digest ?? ""}`;
  if (reported.has(key) || reported.size >= MAX_REPORTS_PER_SESSION) return;
  reported.add(key);

  void send(payload);
}

async function send(payload: ClientErrorPayload) {
  try {
    await fetch("/api/log-error", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
      // Keeps the request alive if the page is unloading.
      keepalive: true,
    });
  } catch {
    // Logging must never surface a second error to the user.
  }
}

/** Test helper: forget the de-duplication state. */
export function resetClientErrorReportsForTests() {
  reported.clear();
}
