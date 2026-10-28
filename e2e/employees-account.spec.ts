import { expect, test } from "@playwright/test";

import { loginAsOwner } from "./helpers";

test("owner mengubah nama dan username kasir; reset password terkunci di demo", async ({
  page,
}) => {
  await loginAsOwner(page);
  await page.getByRole("link", { name: "Kelola Karyawan" }).click();
  await expect(page.getByRole("heading", { name: "Kelola Karyawan" })).toBeVisible();

  // Owner rows are not editable from this page.
  await expect(page.getByRole("button", { name: /Edit akun Nadia Putri/ })).toHaveCount(0);

  await page.getByRole("button", { name: "Edit akun Sari Wulandari" }).click();
  const editDialog = page.getByRole("dialog", { name: "Edit Akun Kasir" });
  await expect(editDialog).toBeVisible();
  await expect(editDialog.getByLabel("Email")).toBeDisabled();

  await editDialog.getByLabel("Nama Lengkap").fill("Sari Pagi");
  await editDialog.getByLabel("Username").fill("sari.pagi");
  await editDialog.getByRole("button", { name: "Simpan Perubahan" }).click();

  await expect(page.getByText("Data @sari.pagi berhasil diperbarui")).toBeVisible();
  await expect(page.getByText("Sari Pagi", { exact: true })).toBeVisible();
  await expect(page.getByText("sari.pagi", { exact: true })).toBeVisible();

  // Duplicate usernames are rejected before the write.
  await page.getByRole("button", { name: "Edit akun Sari Pagi" }).click();
  const duplicateDialog = page.getByRole("dialog", { name: "Edit Akun Kasir" });
  await duplicateDialog.getByLabel("Username").fill("rizky");
  await duplicateDialog.getByRole("button", { name: "Simpan Perubahan" }).click();
  await expect(
    duplicateDialog.getByText("Username sudah dipakai. Pilih username lain."),
  ).toBeVisible();
  await duplicateDialog.getByRole("button", { name: "Batal" }).click();

  // Password reset is production-only; demo explains and disables the form.
  await page.getByRole("button", { name: "Reset password Sari Pagi" }).click();
  const resetDialog = page.getByRole("dialog", { name: "Reset Password Kasir" });
  await expect(resetDialog).toBeVisible();
  await expect(resetDialog.getByText(/Reset password\s+hanya tersedia di mode production/)).toBeVisible();
  await expect(resetDialog.getByRole("button", { name: "Reset Password" })).toBeDisabled();
});
