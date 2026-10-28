"use server";

import { headers } from "next/headers";

import { getCurrentProfile } from "@/lib/auth";
import { isOwnerRole } from "@/lib/constants";
import { isDemoMode } from "@/lib/env";
import { friendlyError } from "@/lib/errors";
import { logInfo, logWarn } from "@/lib/logging";
import { validatePasswordChange } from "@/lib/password";
import {
  checkRateLimit,
  clearRateLimit,
  clientIpFromHeaders,
  passwordChangeRateLimitRules,
  rateLimitMessage,
  recordRateLimitFailure,
} from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";

/**
 * Change the signed-in Owner/Developer password.
 *
 * The current password is re-verified with a fresh `signInWithPassword` before
 * `updateUser`, so a stolen session alone cannot lock the real owner out.
 * Cashiers are rejected here as well as in the page guard.
 */
export async function changePasswordAction(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const profile = await getCurrentProfile();
  if (!profile || !profile.is_active || !isOwnerRole(profile.role)) {
    return { error: "Hanya Owner dan Developer yang dapat mengganti password." };
  }

  const validation = validatePasswordChange({
    currentPassword: String(formData.get("current_password") ?? ""),
    newPassword: String(formData.get("new_password") ?? ""),
    confirmPassword: String(formData.get("confirm_password") ?? ""),
  });
  if (validation) return { error: validation };

  if (isDemoMode) {
    return { error: "Ganti password hanya tersedia di mode production." };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: "Koneksi Supabase tidak tersedia." };

  const rules = passwordChangeRateLimitRules(
    profile.id,
    clientIpFromHeaders(await headers()),
  );
  const limit = checkRateLimit(rules);
  if (limit.limited) {
    return { error: rateLimitMessage(limit.retryAfterSeconds) };
  }

  const currentPassword = String(formData.get("current_password") ?? "");
  const newPassword = String(formData.get("new_password") ?? "");

  // Re-authenticate with the current password before rotating it. This also
  // refreshes the session cookies, which `updateUser` then uses.
  const { error: authError } = await supabase.auth.signInWithPassword({
    email: profile.email,
    password: currentPassword,
  });
  if (authError) {
    recordRateLimitFailure(rules);
    logWarn("auth.password.reauth_failed", { userId: profile.id, role: profile.role });
    return { error: "Password saat ini salah." };
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) {
    logWarn("auth.password.update_failed", { userId: profile.id, error });
    return { error: friendlyError(error, "Gagal mengganti password. Coba lagi.") };
  }

  clearRateLimit(rules);
  logInfo("auth.password.changed", { userId: profile.id, role: profile.role });
  return {
    success: "Password berhasil diganti. Gunakan password baru pada login berikutnya.",
  };
}
