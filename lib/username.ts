/** Lowercase letters/numbers, with dots, underscores, or hyphens in the middle. */
export const USERNAME_PATTERN = /^[a-z0-9](?:[a-z0-9._-]{1,28}[a-z0-9])$/;

export const USERNAME_HINT =
  "3–30 karakter: huruf kecil, angka, titik, garis bawah, atau strip. Diawali dan diakhiri huruf/angka.";

export function normalizeUsername(value: string) {
  return value.trim().toLowerCase();
}

export function validateUsername(value: string): string | null {
  const username = normalizeUsername(value);
  if (!username) return "Username wajib diisi.";
  if (username.length < 3) return "Username minimal 3 karakter.";
  if (username.length > 30) return "Username maksimal 30 karakter.";
  if (!USERNAME_PATTERN.test(username)) return `Format username tidak valid. ${USERNAME_HINT}`;
  return null;
}
