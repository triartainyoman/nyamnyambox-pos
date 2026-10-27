"use client";

import { useEffect } from "react";

import { ErrorScreen } from "@/components/error-screen";
import { reportClientError } from "@/lib/client-logging";

export default function RootError({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  useEffect(() => {
    reportClientError(error, "error-boundary");
  }, [error]);

  return <ErrorScreen error={error} retry={retry} />;
}
