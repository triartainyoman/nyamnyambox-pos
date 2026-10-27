import { NextResponse, type NextRequest } from "next/server";

import { logError } from "@/lib/logging";
import {
  checkRateLimit,
  clientErrorRateLimitRules,
  clientIpFromHeaders,
  recordRateLimitFailure,
} from "@/lib/rate-limit";
import { redactString } from "@/lib/redact";

/**
 * Client error sink for `lib/client-logging.ts`.
 *
 * Public by design: errors also happen on the login screen, before a session
 * exists. Nothing is stored beyond the log line, the body is size-capped, and
 * reports are rate limited per IP so the endpoint cannot be used to flood logs.
 */

export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 8 * 1024;
const MAX_MESSAGE = 500;
const MAX_STACK = 800;

function text(value: unknown, maxLength: number): string | undefined {
  return typeof value === "string" && value.trim()
    ? redactString(value, maxLength)
    : undefined;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
}

/** Short, non-reversible IP fingerprint: groups reports without storing the IP. */
async function hashIp(ip: string): Promise<string | undefined> {
  try {
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(ip));
    return Array.from(new Uint8Array(digest).slice(0, 6), (byte) =>
      byte.toString(16).padStart(2, "0"),
    ).join("");
  } catch {
    return undefined;
  }
}

export async function POST(request: NextRequest) {
  const ip = clientIpFromHeaders(request.headers);
  const rules = clientErrorRateLimitRules(ip);

  if (checkRateLimit(rules).limited) {
    // Silent drop: the browser must not retry a log report.
    return new NextResponse(null, { status: 204 });
  }

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "payload too large" }, { status: 413 });
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const record = asRecord(body);
  const message = text(record?.message, MAX_MESSAGE);
  if (!message) {
    return NextResponse.json({ error: "message required" }, { status: 400 });
  }

  recordRateLimitFailure(rules);

  logError(
    "client.error",
    { message, stack: text(record?.stack, MAX_STACK) },
    {
      kind: text(record?.kind, 40) ?? "unknown",
      url: text(record?.url, 300),
      digest: text(record?.digest, 80),
      userAgent: text(record?.userAgent, 200),
      ipHash: await hashIp(ip),
    },
  );

  return new NextResponse(null, { status: 204 });
}
