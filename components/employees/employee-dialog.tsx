"use client";

import { useState } from "react";
import { AtSign, Loader2, UserPlus } from "lucide-react";
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
import { useCreateEmployee } from "@/lib/hooks/use-employees";
import { isDemoMode } from "@/lib/env";
import { normalizeUsername, USERNAME_HINT, validateUsername } from "@/lib/username";

export function EmployeeDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const createEmployee = useCreateEmployee();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const normalizedUsername = normalizeUsername(username);
    if (name.trim().length < 2) {
      setError("Nama minimal 2 karakter.");
      return;
    }
    const usernameValidation = validateUsername(normalizedUsername);
    if (usernameValidation) {
      setError(usernameValidation);
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Format email tidak valid.");
      return;
    }
    if (password.length < 6) {
      setError("Password minimal 6 karakter.");
      return;
    }

    try {
      await createEmployee.mutateAsync({
        name: name.trim(),
        username: normalizedUsername,
        email: email.trim(),
        password,
      });
      toast.success(`Akun kasir @${normalizedUsername} berhasil dibuat`);
      onOpenChange(false);
    } catch (submitError) {
      const message =
        submitError instanceof Error ? submitError.message : "Gagal membuat akun kasir";
      setError(message);
      toast.error(message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tambah Akun Kasir</DialogTitle>
          <DialogDescription>
            Buat akun login untuk karyawan. Kasir masuk dengan username dan password.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <DialogBody className="space-y-4">
            <div>
              <Label htmlFor="employee-name">Nama Lengkap</Label>
              <Input
                id="employee-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Contoh: Rizky Pratama"
                autoComplete="off"
                required
              />
            </div>
            <div>
              <Label htmlFor="employee-username">Username</Label>
              <div className="relative">
                <AtSign className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="employee-username"
                  value={username}
                  onChange={(event) =>
                    setUsername(event.target.value.toLowerCase().replace(/\s/g, ""))
                  }
                  placeholder="rizky"
                  autoComplete="off"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  className="pl-9"
                  minLength={3}
                  maxLength={30}
                  required
                />
              </div>
              <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
                {USERNAME_HINT}
              </p>
            </div>
            <div>
              <Label htmlFor="employee-email">Email</Label>
              <Input
                id="employee-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="kasir@nyamnyambox.com"
                autoComplete="off"
                required
              />
              <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
                Tetap wajib untuk akun Supabase dan pemulihan password.
              </p>
            </div>
            <div>
              <Label htmlFor="employee-password">Password Awal</Label>
              <Input
                id="employee-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Minimal 6 karakter"
                autoComplete="new-password"
                required
              />
            </div>

            {isDemoMode && (
              <p className="rounded-xl bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-800">
                Mode demo: akun hanya ditambahkan ke data lokal browser dan belum bisa dipakai
                login. Gunakan akun demo rizky / sari untuk mencoba login kasir.
              </p>
            )}

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
            <Button type="submit" disabled={createEmployee.isPending}>
              {createEmployee.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <UserPlus className="size-4" />
              )}
              {createEmployee.isPending ? "Menyimpan..." : "Buat Akun"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
