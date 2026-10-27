"use client";

import { useEffect } from "react";

import { reportClientError } from "@/lib/client-logging";

/**
 * Installs global listeners for errors that never reach a React error boundary
 * (event handlers, timers, failed dynamic imports, unhandled promise
 * rejections). Rendered once from `Providers`.
 */
export function ErrorReporter() {
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      // Resource load failures (`<img>`, `<script>`) have no `error` object and
      // would only add noise.
      if (event.error) reportClientError(event.error, "window.error");
    };

    const onRejection = (event: PromiseRejectionEvent) => {
      reportClientError(event.reason, "unhandledrejection");
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);

    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
}
