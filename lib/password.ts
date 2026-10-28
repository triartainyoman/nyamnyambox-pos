/**
 * Password rules for `/settings/security` and owner-initiated cashier resets.
 *
 * Kept in a pure module so the server actions and the unit tests share the
 * exact same validation. Supabase only enforces a minimum length, so the
 * extra checks (confirmation, different from current) live here.
 */

export const PASSWORD_MIN_LENGTH = 8;

export interface PasswordChangeInput {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

/** Returns a user-facing Indonesian error, or `null` when the input is valid. */
export function validatePasswordChange({
  currentPassword,
  newPassword,
  confirmPassword,
}: PasswordChangeInput): string | null {
  if (!currentPassword) return "Password saat ini wajib diisi.";
  if (newPassword.length < PASSWORD_MIN_LENGTH) {
    return `Password baru minimal ${PASSWORD_MIN_LENGTH} karakter.`;
  }
  if (newPassword === currentPassword) {
    return "Password baru harus berbeda dari password saat ini.";
  }
  if (newPassword !== confirmPassword) {
    return "Konfirmasi password tidak sama.";
  }
  return null;
}

export interface PasswordResetInput {
  password: string;
  confirmPassword: string;
}

/** Owner-initiated reset for a cashier: no current password to compare. */
export function validatePasswordReset({
  password,
  confirmPassword,
}: PasswordResetInput): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Password baru minimal ${PASSWORD_MIN_LENGTH} karakter.`;
  }
  if (password !== confirmPassword) {
    return "Konfirmasi password tidak sama.";
  }
  return null;
}
