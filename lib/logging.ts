/**
 * Structured server logging.
 *
 * Every line is a single JSON object so it can be filtered in Vercel's log
 * viewer (or piped anywhere else) without a parser:
 *
 *   {"level":"error","event":"request.error","time":"…","path":"/pos",…}
 *
 * Rules:
 *  - Always go through `redactValue` / `redactError`; never log raw errors.
 *  - `error` goes to `console.error` so the platform marks the line as an
 *    error; `warn` and `info` map to their console counterparts.
 *  - Log lines never contain secrets: the service-role key, cookies and
 *    authorization headers are not read here at all.
 */

import { redactValue } from "@/lib/redact";

export type LogLevel = "info" | "warn" | "error";
export type LogFields = Record<string, unknown>;

export const LOG_SERVICE = "nyamnyambox-pos";

export interface LogEntry {
  level: LogLevel;
  event: string;
  time: string;
  service: string;
  [key: string]: unknown;
}

function write(level: LogLevel, event: string, payload: Record<string, unknown>): LogEntry {
  const entry = redactValue({
    level,
    event,
    time: new Date().toISOString(),
    service: LOG_SERVICE,
    ...payload,
  }) as LogEntry;

  const line = JSON.stringify(entry);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);

  return entry;
}

export function logInfo(event: string, fields: LogFields = {}): LogEntry {
  return write("info", event, fields);
}

export function logWarn(event: string, fields: LogFields = {}): LogEntry {
  return write("warn", event, fields);
}

/**
 * Log a failure. `error` may be an `Error`, a Supabase error object, a string
 * or anything else that was thrown — `redactValue` normalises and redacts it
 * in a single pass (an `Error` becomes `{ name, message, stack, digest }`).
 */
export function logError(
  event: string,
  error: unknown,
  fields: LogFields = {},
): LogEntry & { error: unknown } {
  return write("error", event, { ...fields, error }) as LogEntry & { error: unknown };
}
