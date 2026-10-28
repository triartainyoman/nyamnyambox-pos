"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createEmployeeAction, resetEmployeePasswordAction, updateEmployeeAction } from "@/app/actions/employees";
import { listProfiles, updateProfile } from "@/lib/data/profiles";
import { isDemoMode } from "@/lib/env";
import { UserFacingError } from "@/lib/errors";
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
    mutationFn: async (input: {
      name: string;
      username: string;
      email: string;
      password: string;
    }) => {
      if (isDemoMode) {
        const { demoCreateEmployee } = await import("@/lib/demo/api");
        return demoCreateEmployee({
          name: input.name,
          username: input.username,
          email: input.email,
        });
      }

      const formData = new FormData();
      formData.set("name", input.name);
      formData.set("username", input.username);
      formData.set("email", input.email);
      formData.set("password", input.password);

      const result = await createEmployeeAction(formData);
      if (result?.error) throw new UserFacingError(result.error);
      return null;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
  });
}

/** Edit a cashier's name and username (Owner only). */
export function useUpdateEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; name: string; username: string }) => {
      if (isDemoMode) {
        const { demoUpdateEmployee } = await import("@/lib/demo/api");
        return demoUpdateEmployee(input);
      }

      const formData = new FormData();
      formData.set("id", input.id);
      formData.set("name", input.name);
      formData.set("username", input.username);

      const result = await updateEmployeeAction(formData);
      if (result?.error) throw new UserFacingError(result.error);
      return null;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
  });
}

/** Reset a cashier's password with a temporary password (Owner only). */
export function useResetEmployeePassword() {
  return useMutation({
    mutationFn: async (input: {
      id: string;
      password: string;
      confirmPassword: string;
    }) => {
      if (isDemoMode) {
        throw new UserFacingError("Reset password hanya tersedia di mode production.");
      }

      const formData = new FormData();
      formData.set("id", input.id);
      formData.set("password", input.password);
      formData.set("confirm_password", input.confirmPassword);

      const result = await resetEmployeePasswordAction(formData);
      if (result?.error) throw new UserFacingError(result.error);
      return null;
    },
  });
}
