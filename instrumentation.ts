/**
 * Next.js instrumentation: one startup log line plus server-side error capture.
 *
 * `onRequestError` fires for uncaught errors in Server Components, Route
 * Handlers, Server Actions and the Proxy. It is the single place where server
 * errors reach the structured logger, so every failure — including ones that
 * happen before a route's own try/catch — shows up as one JSON line with the
 * route, method and router context attached.
 *
 * See docs/RUNBOOK.md for how to read these logs in Vercel.
 */

import type { Instrumentation } from "next";

import { isSupabaseConfigured } from "@/lib/env";
import { logError, logInfo } from "@/lib/logging";

export function register() {
  logInfo("app.start", {
    runtime: process.env.NEXT_RUNTIME ?? "nodejs",
    environment: process.env.NODE_ENV ?? "development",
    // Presence flags only — never the values.
    supabaseConfigured: isSupabaseConfigured,
    demoModeRequested: process.env.NEXT_PUBLIC_DEMO_MODE === "true",
    commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
  });
}

export const onRequestError: Instrumentation.onRequestError = (error, request, context) => {
  logError("request.error", error, {
    path: request.path,
    method: request.method,
    routerKind: context.routerKind,
    routePath: context.routePath,
    routeType: context.routeType,
  });
};
