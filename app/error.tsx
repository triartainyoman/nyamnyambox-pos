"use client";

import { useEffect } from "react";

import { ErrorScreen } from "@/components/error-screen";

export default function RootError({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return <ErrorScreen error={error} retry={retry} />;
}
