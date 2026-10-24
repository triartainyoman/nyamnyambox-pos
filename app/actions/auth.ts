"use server";

import { redirect } from "next/navigation";

import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";

export async function loginAction(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Email dan password wajib diisi." };
  }

  if (!isSupabaseConfigured) {
    return {
      error: "Supabase belum dikonfigurasi. Gunakan akses demo atau isi .env.local terlebih dahulu.",
    };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: "Koneksi Supabase tidak tersedia." };

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return { error: "Email atau password salah. Silakan coba lagi." };
  }

  redirect("/pos");
}

export async function logoutAction(): Promise<void> {
  if (isSupabaseConfigured) {
    const supabase = await createSupabaseServerClient();
    await supabase?.auth.signOut();
  }
  redirect("/login");
}
