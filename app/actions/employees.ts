"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";

import { getCurrentProfile } from "@/lib/auth";
import { isOwnerRole } from "@/lib/constants";
import { isSupabaseConfigured, SUPABASE_URL } from "@/lib/env";
import type { ActionResult } from "@/lib/types";

export async function createEmployeeAction(formData: FormData): Promise<ActionResult> {
  const current = await getCurrentProfile();
  if (!current || !isOwnerRole(current.role)) {
    return { error: "Hanya Owner yang dapat menambah akun karyawan." };
  }

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (name.length < 2) return { error: "Nama minimal 2 karakter." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Format email tidak valid." };
  }
  if (password.length < 6) return { error: "Password minimal 6 karakter." };

  if (!isSupabaseConfigured) {
    return { error: "Mode demo tidak membuat akun server. Gunakan mode demo untuk mencoba." };
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return {
      error:
        "SUPABASE_SERVICE_ROLE_KEY belum diatur. Tambahkan service role key di environment agar Owner dapat membuat akun kasir.",
    };
  }

  const admin = createClient(SUPABASE_URL, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name },
  });

  if (error) {
    if (error.message.toLowerCase().includes("already")) {
      return { error: "Email sudah terdaftar." };
    }
    return { error: error.message };
  }

  const { error: profileError } = await admin.from("profiles").upsert({
    id: data.user.id,
    name,
    email,
    role: "EMPLOYEE",
    is_active: true,
  });

  if (profileError) return { error: profileError.message };

  revalidatePath("/employees");
  return {};
}
