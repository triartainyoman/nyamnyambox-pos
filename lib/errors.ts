/**
 * Central error mapping.
 *
 * Supabase/PostgREST errors contain internal details (table names, SQL,
 * constraint names, stack traces). Those must never reach the UI. This module
 * converts anything we catch into a short, safe Indonesian message.
 *
 * Business rules raised by our own RPCs/triggers (`raise exception '...'`) are
 * allowed through only when they match the whitelist below. Everything else
 * becomes a generic message plus a context-specific fallback.
 */

export class UserFacingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UserFacingError";
  }
}

export const GENERIC_ERROR = "Terjadi kesalahan. Silakan coba lagi.";
export const NETWORK_ERROR = "Koneksi internet bermasalah. Periksa jaringan lalu coba lagi.";
export const SESSION_ERROR = "Sesi Anda berakhir. Silakan masuk kembali.";
export const PERMISSION_ERROR = "Anda tidak memiliki akses untuk tindakan ini.";
export const NOT_FOUND_ERROR = "Data tidak ditemukan.";
export const DUPLICATE_ERROR = "Data sudah ada. Gunakan nilai lain.";
export const INVALID_DATA_ERROR = "Data yang dikirim tidak valid.";
export const UNAVAILABLE_ERROR = "Layanan sedang tidak tersedia. Coba lagi sebentar.";
export const CONFIG_ERROR = "Aplikasi belum siap digunakan. Hubungi admin.";
export const TIMEOUT_ERROR = "Permintaan memakan waktu terlalu lama. Coba lagi.";

/**
 * Messages authored by this app (RPC raises, triggers, demo backend). They are
 * already written for end users, so they may pass through unchanged.
 */
const SAFE_MESSAGES = new Set([
  "Akun tidak aktif atau tidak terautentikasi",
  "Akses ditolak",
  "Keranjang pesanan kosong",
  "Keranjang masih kosong",
  "Kuantitas item tidak valid",
  "Pesanan tidak ditemukan",
  "Transaksi tidak ditemukan",
  "Produk tidak ditemukan",
  "Akun tidak ditemukan",
  "Tanggal bisnis tidak valid",
  "Pesanan harus memiliki minimal satu item",
  "Pesanan harus memiliki minimal satu item.",
  "Transaksi hanya dapat diedit pada hari yang sama",
  "Transaksi tersimpan tetapi gagal dimuat",
  "Username sudah dipakai",
  "Username sudah dipakai. Pilih username lain.",
  "Email sudah terdaftar",
  "Email sudah terdaftar.",
  "Minimal harus ada satu Owner aktif",
  "Akun Owner tidak dapat menonaktifkan atau menurunkan role dirinya sendiri",
]);

/** Prefixes that carry a non-sensitive identifier, e.g. a product UUID. */
const SAFE_PREFIXES = ["Produk tidak tersedia:"];

function safeMessage(message: string): string | null {
  const trimmed = message.trim();
  if (!trimmed || trimmed.length > 180) return null;
  if (SAFE_MESSAGES.has(trimmed)) return trimmed;

  for (const prefix of SAFE_PREFIXES) {
    if (trimmed.startsWith(prefix) && trimmed.length <= prefix.length + 80) {
      return trimmed;
    }
  }

  return null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
}

/**
 * Convert any thrown value into a safe message.
 *
 * @param error    The caught value (Error, Supabase error object, string, …).
 * @param fallback Context-specific message used when nothing safe is known.
 */
export function friendlyError(error: unknown, fallback = GENERIC_ERROR): string {
  if (error instanceof UserFacingError) return error.message;

  if (typeof error === "string") {
    return safeMessage(error) ?? fallback;
  }

  const record = asRecord(error);
  if (!record) return fallback;

  const code = typeof record.code === "string" ? record.code : "";
  const status = typeof record.status === "number" ? record.status : 0;
  const rawMessage = typeof record.message === "string" ? record.message : "";

  // Session / auth
  if (
    code === "PGRST301" ||
    code === "PGRST302" ||
    status === 401 ||
    /jwt expired|invalid claim|auth session missing|session (is )?missing/i.test(rawMessage)
  ) {
    return SESSION_ERROR;
  }

  // Postgres / PostgREST codes
  if (code === "42501" || /permission denied|row-level security/i.test(rawMessage)) {
    return PERMISSION_ERROR;
  }
  if (code === "23505") return DUPLICATE_ERROR;
  if (code === "23503" || code === "PGRST116") return NOT_FOUND_ERROR;
  if (code === "23514" || code === "22001" || code === "22P02" || code === "22003") {
    return INVALID_DATA_ERROR;
  }
  if (code === "42P01" || code === "42703" || code === "42883" || code === "PGRST202") {
    return CONFIG_ERROR;
  }
  if (code === "57014") return TIMEOUT_ERROR;

  // Network / infrastructure
  if (
    /failed to fetch|network ?error|load failed|fetch failed|err_internet|err_network/i.test(
      rawMessage,
    )
  ) {
    return NETWORK_ERROR;
  }
  if (status >= 500) return UNAVAILABLE_ERROR;

  return safeMessage(rawMessage) ?? fallback;
}
