"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { businessDayRange } from "@/lib/utils";
import { createOrder, listOrders, updateOrder } from "@/lib/data/orders";
import type { CreateOrderInput, UpdateOrderInput } from "@/lib/types";

export function useOrders(dateISO: string) {
  const { startISO, endISO } = businessDayRange(dateISO);
  return useQuery({
    queryKey: ["orders", dateISO],
    queryFn: () => listOrders(startISO, endISO),
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateOrderInput) => createOrder(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useUpdateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateOrderInput) => updateOrder(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
