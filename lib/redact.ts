/**
 * PII redaction for logs.
 *
 * Everything that leaves the app through a log line goes through this module:
 * server errors (via `lib/logging.ts`) and client error reports (via
 * `lib/client-logging.ts`). It is intentionally dependency-free and runs on
 * both the Node.js and the Edge runtime.
 *
 * Two layers of protection:
 *  1. Sensitive field names (`password`, `email`, `phone`, `token`, …) are
 *     replaced wholesale, regardless of their value.
 *  2. Free text (messages, stacks, URLs, user agents) is scrubbed for e-mail
 *     addresses, Indonesian phone numbers, bearer tokens, JWTs, Supabase keys
 *     and database URLs.
 */

const REDACTED = "[redacted]";

/** Field names whose value must never be logged. */
const SENSITIVE_KEY =
  /pass(word|phrase|code)?|secret|token|api[-_]?key|apikey|authorization|cookie|session|jwt|otp|credential|email|phone|whatsapp|username/i;

const PATTERNS: Array<[RegExp, string]> = [
  // postgres://user:password@host/db
  [/\b(?:postgres|postgresql|mysql|redis):\/\/[^\s"'<>]+/gi, "[redacted-database-url]"],
  // Authorization: Bearer <token>
  [/\bBearer\s+[A-Za-z0-9._~+/=-]{8,}/gi, "Bearer [redacted-token]"],
  // Supabase API keys (new format).
  [/\bsb_(?:secret|publishable)_[A-Za-z0-9_-]{6,}/g, "[redacted-supabase-key]"],
  // JWTs (header.payload.signature).
  [/\beyJ[A-Za-z0-9_-]{4,}\.[A-Za-z0-9_-]{4,}\.[A-Za-z0-9_-]{4,}/g, "[redacted-jwt]"],
  // E-mail addresses.
  [/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "[redacted-email]"],
  // Indonesian mobile numbers: 08xx, 628xx, +62 8xx with optional separators.
  [/(?:\+?62|0)[\s.-]?8(?:[\s.-]?\d){7,11}/g, "[redacted-phone]"],
];

const MAX_DEPTH = 5;
const MAX_ARRAY_ITEMS = 20;
const MAX_OBJECT_KEYS = 40;
const MAX_STRING = 800;

/** Scrub a single string and truncate it to a sane log length. */
export function redactString(value: string, maxLength = MAX_STRING): string {
  let output = value;
  for (const [pattern, replacement] of PATTERNS) {
    output = output.replace(pattern, replacement);
  }
  if (output.length > maxLength) {
    output = `${output.slice(0, maxLength)}…[truncated ${output.length - maxLength} chars]`;
  }
  return output;
}

export function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEY.test(key);
}

/**
 * Deep-redact an arbitrary value so it can be serialised into a log line.
 * Depth, array length and key count are capped to keep log lines bounded.
 */
export function redactValue(
  value: unknown,
  depth = 0,
  seen: WeakSet<object> = new WeakSet(),
): unknown {
  if (value === null) return null;

  switch (typeof value) {
    case "string":
      return redactString(value);
    case "number":
    case "boolean":
      return value;
    case "bigint":
      return value.toString();
    case "undefined":
      return undefined;
    case "function":
    case "symbol":
      return undefined;
    default:
      break;
  }

  const object = value as object;

  if (depth >= MAX_DEPTH) return "[truncated]";
  if (seen.has(object)) return "[circular]";
  seen.add(object);

  if (Array.isArray(value)) {
    const items = value
      .slice(0, MAX_ARRAY_ITEMS)
      .map((item) => redactValue(item, depth + 1, seen));
    if (value.length > MAX_ARRAY_ITEMS) {
      items.push(`[+${value.length - MAX_ARRAY_ITEMS} more]`);
    }
    return items;
  }

  if (value instanceof Date) return value.toISOString();
  if (value instanceof Error) return redactError(value);

  const output: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>).slice(
    0,
    MAX_OBJECT_KEYS,
  )) {
    output[key] = isSensitiveKey(key) ? REDACTED : redactValue(entry, depth + 1, seen);
  }
  return output;
}

export interface RedactedError {
  name?: string;
  message: string;
  stack?: string;
  digest?: string;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
}

/**
 * Turn any thrown value into a redacted, loggable shape. Works for real
 * `Error` instances, Supabase error objects, plain objects and strings.
 */
export function redactError(error: unknown): RedactedError {
  if (typeof error === "string") {
    return { message: redactString(error, 500) };
  }

  if (error instanceof Error) {
    const digest = asRecord(error)?.digest;
    return {
      name: redactString(error.name, 60),
      message: redactString(error.message, 500),
      stack: error.stack ? redactString(error.stack, 2000) : undefined,
      digest: typeof digest === "string" ? redactString(digest, 80) : undefined,
    };
  }

  const record = asRecord(error);
  if (!record) {
    return { message: redactString(String(error), 500) };
  }

  const message =
    typeof record.message === "string"
      ? record.message
      : typeof record.error_description === "string"
        ? record.error_description
        : null;

  return {
    name: typeof record.name === "string" ? redactString(record.name, 60) : undefined,
    message: redactString(message ?? safeStringify(record), 500),
    stack: typeof record.stack === "string" ? redactString(record.stack, 2000) : undefined,
    digest: typeof record.digest === "string" ? redactString(record.digest, 80) : undefined,
  };
}

/** `JSON.stringify` that never throws (circular structures, bigint, …). */
export function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
