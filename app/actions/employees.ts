"use server";

import { revalidatePath } from "next/cache";

import { getCurrentProfile } from "@/lib/auth";
import { isOwnerRole } from "@/lib/constants";
import { isDemoMode, isSupabaseConfigured } from "@/lib/env";
import { friendlyError } from "@/lib/errors";
import { logInfo } from "@/lib/logging";
import { validatePasswordReset } from "@/lib/password";
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

/**
 * Edit a cashier's display name and login username.
 *
 * Only `EMPLOYEE` rows are accepted, and only `name` + `username` are read
 * from the form — role, active flag, and email can never be changed here.
 * The service-role client keeps the write server-side and bypasses the
 * `protect_profile_fields` trigger's owner-identity rules deliberately.
 */
export async function updateEmployeeAction(formData: FormData): Promise<ActionResult> {
  const current = await getCurrentProfile();
  if (!current || !current.is_active || !isOwnerRole(current.role)) {
    return { error: "Hanya Owner yang dapat mengubah akun kasir." };
  }

  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const username = normalizeUsername(String(formData.get("username") ?? ""));

  if (!id) return { error: "Akun tidak ditemukan." };
  if (name.length < 2) return { error: "Nama minimal 2 karakter." };

  const usernameValidation = validateUsername(username);
  if (usernameValidation) return { error: usernameValidation };

  if (isDemoMode) {
    return { error: "Mode demo menyimpan perubahan hanya di browser." };
  }
  if (!isSupabaseConfigured) {
    return {
      error:
        "Aplikasi belum dikonfigurasi. Hubungi admin untuk menyelesaikan setup server sebelum mengubah akun.",
    };
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return {
      error:
        "SUPABASE_SERVICE_ROLE_KEY belum diatur. Tambahkan service role key di environment agar Owner dapat mengubah akun kasir.",
    };
  }

  const admin = createSupabaseAdminClient(serviceKey);

  const { data: target, error: targetError } = await admin
    .from("profiles")
    .select("id, role")
    .eq("id", id)
    .maybeSingle();

  if (targetError) {
    return { error: friendlyError(targetError, "Gagal memuat akun kasir. Coba lagi.") };
  }
  if (!target) return { error: "Akun tidak ditemukan." };
  if (target.role !== "EMPLOYEE") {
    return { error: "Hanya akun kasir yang dapat diubah dari halaman ini." };
  }

  const { data: existing, error: lookupError } = await admin
    .from("profiles")
    .select("id")
    .eq("username", username)
    .neq("id", id)
    .maybeSingle();

  if (lookupError) {
    return { error: friendlyError(lookupError, "Gagal memeriksa username. Coba lagi.") };
  }
  if (existing) return { error: "Username sudah dipakai. Pilih username lain." };

  const { error: updateError } = await admin
    .from("profiles")
    .update({ name, username })
    .eq("id", id);

  if (updateError) {
    if ((updateError as { code?: string }).code === "23505") {
      return { error: "Username sudah dipakai. Pilih username lain." };
    }
    return { error: friendlyError(updateError, "Gagal memperbarui akun kasir. Coba lagi.") };
  }

  revalidatePath("/employees");
  logInfo("employees.updated", { userId: id, actorId: current.id });
  return { success: `Data @${username} berhasil diperbarui.` };
}

/** Reset a cashier's password with the Supabase service role. */
export async function resetEmployeePasswordAction(formData: FormData): Promise<ActionResult> {
  const current = await getCurrentProfile();
  if (!current || !current.is_active || !isOwnerRole(current.role)) {
    return { error: "Hanya Owner yang dapat mereset password kasir." };
  }

  const id = String(formData.get("id") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirm_password") ?? "");

  if (!id) return { error: "Akun tidak ditemukan." };

  const validation = validatePasswordReset({ password, confirmPassword });
  if (validation) return { error: validation };

  if (isDemoMode) {
    return { error: "Reset password hanya tersedia di mode production." };
  }
  if (!isSupabaseConfigured) {
    return {
      error:
        "Aplikasi belum dikonfigurasi. Hubungi admin untuk menyelesaikan setup server sebelum mereset password.",
    };
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return {
      error:
        "SUPABASE_SERVICE_ROLE_KEY belum diatur. Tambahkan service role key di environment agar Owner dapat mereset password kasir.",
    };
  }

  const admin = createSupabaseAdminClient(serviceKey);

  const { data: target, error: targetError } = await admin
    .from("profiles")
    .select("id, role, username")
    .eq("id", id)
    .maybeSingle();

  if (targetError) {
    return { error: friendlyError(targetError, "Gagal memuat akun kasir. Coba lagi.") };
  }
  if (!target) return { error: "Akun tidak ditemukan." };
  if (target.role !== "EMPLOYEE") {
    return { error: "Hanya akun kasir yang dapat direset dari halaman ini." };
  }

  const { error } = await admin.auth.admin.updateUserById(id, { password });
  if (error) {
    return { error: friendlyError(error, "Gagal mereset password. Coba lagi.") };
  }

  revalidatePath("/employees");
  logInfo("employees.password_reset", { userId: id, actorId: current.id });
  return { success: `Password @${target.username} berhasil direset.` };
}
