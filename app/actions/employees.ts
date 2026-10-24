"use server";

import { revalidatePath } from "next/cache";

import { getCurrentProfile } from "@/lib/auth";
import { isOwnerRole } from "@/lib/constants";
import { isDemoMode, isSupabaseConfigured } from "@/lib/env";
import { friendlyError } from "@/lib/errors";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { ActionResult } from "@/lib/types";
import { normalizeUsername, validateUsername } from "@/lib/username";

export async function createEmployeeAction(formData: FormData): Promise<ActionResult> {
  const current = await getCurrentProfile();
  if (!current || !isOwnerRole(current.role)) {
    return { error: "Hanya Owner yang dapat menambah akun karyawan." };
  }

  const name = String(formData.get("name") ?? "").trim();
  const username = normalizeUsername(String(formData.get("username") ?? ""));
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (name.length < 2) return { error: "Nama minimal 2 karakter." };

  const usernameValidation = validateUsername(username);
  if (usernameValidation) return { error: usernameValidation };

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Format email tidak valid." };
  }
  if (password.length < 6) {
    return { error: "Password minimal 6 karakter." };
  }

  if (isDemoMode) {
    return { error: "Mode demo tidak membuat akun server. Gunakan mode demo untuk mencoba." };
  }

  if (!isSupabaseConfigured) {
    return {
      error:
        "Aplikasi belum dikonfigurasi. Hubungi admin untuk menyelesaikan setup server sebelum membuat akun.",
    };
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return {
      error:
        "SUPABASE_SERVICE_ROLE_KEY belum diatur. Tambahkan service role key di environment agar Owner dapat membuat akun kasir.",
    };
  }

  const admin = createSupabaseAdminClient(serviceKey);

  const { data: existing, error: lookupError } = await admin
    .from("profiles")
    .select("id")
    .eq("username", username)
    .maybeSingle();

  if (lookupError) {
    return { error: friendlyError(lookupError, "Gagal memeriksa username. Coba lagi.") };
  }
  if (existing) return { error: "Username sudah dipakai. Pilih username lain." };

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name, username },
  });

  if (error) {
    if (error.message.toLowerCase().includes("already")) {
      return { error: "Email sudah terdaftar." };
    }
    return { error: friendlyError(error, "Gagal membuat akun kasir. Coba lagi.") };
  }

  const { error: profileError } = await admin.from("profiles").upsert({
    id: data.user.id,
    username,
    name,
    email,
    role: "EMPLOYEE",
    is_active: true,
  });

  if (profileError) {
    await admin.auth.admin.deleteUser(data.user.id);
    return {
      error: friendlyError(
        profileError,
        "Akun dibuat tetapi profil gagal disimpan. Hubungi admin.",
      ),
    };
  }

  revalidatePath("/employees");
  return {};
}
