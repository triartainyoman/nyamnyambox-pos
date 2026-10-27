import { NextResponse } from "next/server";

import { isSupabaseConfigured, SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/env";

/**
 * Liveness + dependency health for uptime monitors and the on-call runbook.
 *
 * `200` means the app can serve requests and reach Supabase; `503` means at
 * least one critical dependency is down (or production is missing its Supabase
 * configuration). The body never contains secrets — only states and timings.
 */

export const dynamic = "force-dynamic";

const TIMEOUT_MS = 5000;

type CheckState = "ok" | "down" | "not_configured";

interface Check {
  state: CheckState;
  status?: number;
  latencyMs: number;
  detail?: string;
}

async function probe(
  url: string,
  headers: Record<string, string> = {},
  detail?: string,
): Promise<Check> {
  const started = Date.now();
  try {
    const response = await fetch(url, {
      headers,
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    return {
      state: response.ok ? "ok" : "down",
      status: response.status,
      latencyMs: Date.now() - started,
      detail,
    };
  } catch {
    return { state: "down", latencyMs: Date.now() - started, detail };
  }
}

function unconfigured(): Check {
  // In a production build a missing Supabase config is a deployment mistake,
  // not a demo. Report it as down so the monitor catches it.
  return {
    state: process.env.NODE_ENV === "production" ? "down" : "not_configured",
    latencyMs: 0,
    detail: "NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY are not set",
  };
}

export async function GET() {
  const started = Date.now();

  const [database, auth] = isSupabaseConfigured
    ? await Promise.all([
        // A real PostgREST query proves the gateway can reach Postgres.
        // `/rest/v1/` (OpenAPI root) is not usable: it rejects publishable keys.
        probe(
          `${SUPABASE_URL}/rest/v1/products?select=id&limit=1`,
          { apikey: SUPABASE_ANON_KEY, accept: "application/json" },
          "postgrest",
        ),
        probe(`${SUPABASE_URL}/auth/v1/health`, { apikey: SUPABASE_ANON_KEY }, "auth"),
      ])
    : [unconfigured(), unconfigured()];

  const checks = {
    app: { state: "ok" as CheckState, latencyMs: 0 },
    database,
    auth,
  };

  const healthy = database.state !== "down" && auth.state !== "down";

  return NextResponse.json(
    {
      status: healthy ? "ok" : "down",
      checks,
      commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
      environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "unknown",
      timestamp: new Date().toISOString(),
      totalLatencyMs: Date.now() - started,
    },
    {
      status: healthy ? 200 : 503,
      headers: { "cache-control": "no-store" },
    },
  );
}
