"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { homePathForRole } from "@/lib/constants";
import { DEMO_COOKIE } from "@/lib/demo/constants";
import { demoLogin } from "@/lib/demo/session";
import { isAuthConfigured, isDemoMode, isSupabaseConfigured } from "@/lib/env";
import { friendlyError, UNAVAILABLE_ERROR } from "@/lib/errors";
import {
  checkRateLimit,
  clearRateLimit,
  clientIpFromHeaders,
  loginRateLimitRules,
  rateLimitMessage,
  recordRateLimitFailure,
} from "@/lib/rate-limit";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";
import { normalizeUsername, validateUsername } from "@/lib/username";

export async function loginAction(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const identifier = String(formData.get("identifier") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!isAuthConfigured) {
    return {
      error: "Aplikasi belum dikonfigurasi. Hubungi admin untuk menyelesaikan setup server.",
    };
  }

  if (!identifier || !password) {
    return { error: "Username/email dan password wajib diisi." };
  }

  // Throttle before doing any work: repeated wrong passwords should not reach
  // Supabase Auth, and the message must not reveal whether the account exists.
  const rules = loginRateLimitRules(clientIpFromHeaders(await headers()), identifier);
  const limit = checkRateLimit(rules);
  if (limit.limited) {
    return { error: rateLimitMessage(limit.retryAfterSeconds) };
  }

  if (isDemoMode) {
    const profile = demoLogin(identifier, password);
    if (!profile) {
      recordRateLimitFailure(rules);
      return { error: "Username/email atau password salah." };
    }

    clearRateLimit(rules);
    (await cookies()).set(DEMO_COOKIE, profile.role, {
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
      sameSite: "lax",
    });
    redirect(homePathForRole(profile.role));
  }

  let email = identifier;

  // Cashiers sign in with a username. Owners (and other roles) must use email,
  // so only active EMPLOYEE profiles can be resolved by username.
  if (!identifier.includes("@")) {
    const username = normalizeUsername(identifier);
    if (validateUsername(username)) {
      recordRateLimitFailure(rules);
      return { error: "Username atau password salah." };
    }

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey) {
      return {
        error:
          "Login username belum tersedia. Hubungi Owner untuk menyelesaikan konfigurasi server.",
      };
    }

    const admin = createSupabaseAdminClient(serviceKey);
    const { data: profile, error: lookupError } = await admin
      .from("profiles")
      .select("email, is_active, role")
      .eq("username", username)
      .maybeSingle();

    if (lookupError) {
      const code = (lookupError as { code?: string }).code;
      if (code === "42P01" || code === "42703") {
        return {
          error: "Gagal memproses login. Pastikan migrasi database sudah dijalankan.",
        };
      }
      return { error: friendlyError(lookupError, "Gagal memproses login. Coba lagi.") };
    }
    if (!profile || !profile.is_active || profile.role !== "EMPLOYEE") {
      recordRateLimitFailure(rules);
      return { error: "Username atau password salah." };
    }

    email = profile.email;
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: "Koneksi Supabase tidak tersedia." };

  const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    const status = typeof error.status === "number" ? error.status : 0;
    const detail = `${error.name} ${error.message}`.toLowerCase();
    const infrastructureFailure =
      status === 0 ||
      status >= 500 ||
      detail.includes("fetch") ||
      detail.includes("network") ||
      detail.includes("timeout");

    if (infrastructureFailure) {
      return { error: friendlyError(error, UNAVAILABLE_ERROR) };
    }

    recordRateLimitFailure(rules);
    return { error: "Username/email atau password salah. Silakan coba lagi." };
  }

  clearRateLimit(rules);

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", authData.user.id)
    .maybeSingle();

  redirect(homePathForRole(profile?.role));
}

export async function logoutAction(): Promise<void> {
  if (isDemoMode) {
    (await cookies()).delete(DEMO_COOKIE);
  }

  if (isSupabaseConfigured) {
    const supabase = await createSupabaseServerClient();
    await supabase?.auth.signOut();
  }
  redirect("/login");
}
