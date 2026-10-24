"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createEmployeeAction } from "@/app/actions/employees";
import { demoCreateEmployee } from "@/lib/demo/api";
import { listProfiles, updateProfile } from "@/lib/data/profiles";
import { isSupabaseConfigured } from "@/lib/env";
import type { Profile } from "@/lib/types";

export function useEmployees() {
  return useQuery({
    queryKey: ["employees"],
    queryFn: listProfiles,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      patch,
    }: {
      id: string;
      patch: Partial<Pick<Profile, "name" | "role" | "is_active">>;
    }) => updateProfile(id, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
  });
}

export function useCreateEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; email: string; password: string }) => {
      if (!isSupabaseConfigured) {
        return demoCreateEmployee({ name: input.name, email: input.email });
      }

      const formData = new FormData();
      formData.set("name", input.name);
      formData.set("email", input.email);
      formData.set("password", input.password);

      const result = await createEmployeeAction(formData);
      if (result?.error) throw new Error(result.error);
      return null;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
  });
}
