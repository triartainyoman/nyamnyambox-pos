"use client";

import { useQuery } from "@tanstack/react-query";

import { getDashboard } from "@/lib/data/dashboard";

export function useDashboard() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: getDashboard,
    refetchInterval: 60_000,
  });
}
