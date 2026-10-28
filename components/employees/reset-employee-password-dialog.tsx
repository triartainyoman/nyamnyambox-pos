"use client";

import { useState } from "react";
import { Eye, EyeOff, KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isDemoMode } from "@/lib/env";
import { friendlyError } from "@/lib/errors";
import { useResetEmployeePassword } from "@/lib/hooks/use-employees";
import { PASSWORD_MIN_LENGTH, validatePasswordReset } from "@/lib/password";
import type { Profile } from "@/lib/types";

export function ResetEmployeePasswordDialog({
  employee,
  open,
  onOpenChange,
}: {
  employee: Profile;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetPassword = useResetEmployeePassword();
  const inputType = visible ? "text" : "password";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const validation = validatePasswordReset({ password, confirmPassword });
    if (validation) {
      setError(validation);
      return;
    }

    try {
      await resetPassword.mutateAsync({
        id: employee.id,
        password,
        confirmPassword,
      });
      toast.success(`Password @${employee.username} berhasil direset`);
      onOpenChange(false);
    } catch (submitError) {
      const message = friendlyError(submitError, "Gagal mereset password kasir");
      setError(message);
      toast.error(message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset Password Kasir</DialogTitle>
          <DialogDescription>
            Buat password baru untuk @{employee.username}. Sampaikan langsung ke kasir lewat
            pesan pribadi; hanya Owner yang dapat menggantinya lagi.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <DialogBody className="space-y-4">
            {isDemoMode ? (
              <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800">
                Mode demo memakai password tetap dan tidak menyimpan perubahan. Reset password
                hanya tersedia di mode production.
              </p>
            ) : null}

            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-bold">Password baru</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Minimal {PASSWORD_MIN_LENGTH} karakter dan cocok dengan konfirmasi.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setVisible((value) => !value)}
                className="flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted"
                aria-label={visible ? "Sembunyikan password" : "Tampilkan password"}
              >
                {visible ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                {visible ? "Sembunyikan" : "Tampilkan"}
              </button>
            </div>

            <div>
              <Label htmlFor="reset-employee-password">Password Baru</Label>
              <Input
                id="reset-employee-password"
                type={inputType}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
                minLength={PASSWORD_MIN_LENGTH}
                disabled={isDemoMode || resetPassword.isPending}
                required
              />
            </div>
            <div>
              <Label htmlFor="reset-employee-confirm">Ulangi Password Baru</Label>
              <Input
                id="reset-employee-confirm"
                type={inputType}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                autoComplete="new-password"
                minLength={PASSWORD_MIN_LENGTH}
                disabled={isDemoMode || resetPassword.isPending}
                required
              />
            </div>

            {error ? (
              <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                {error}
              </p>
            ) : null}
          </DialogBody>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={isDemoMode || resetPassword.isPending}>
              {resetPassword.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <KeyRound className="size-4" />
              )}
              {resetPassword.isPending ? "Menyimpan..." : "Reset Password"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
