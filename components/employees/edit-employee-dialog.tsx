"use client";

import { useState } from "react";
import { AtSign, Loader2, Save } from "lucide-react";
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
import { useUpdateEmployee } from "@/lib/hooks/use-employees";
import { normalizeUsername, USERNAME_HINT, validateUsername } from "@/lib/username";
import type { Profile } from "@/lib/types";

export function EditEmployeeDialog({
  employee,
  open,
  onOpenChange,
}: {
  employee: Profile;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [name, setName] = useState(employee.name);
  const [username, setUsername] = useState(employee.username);
  const [error, setError] = useState<string | null>(null);

  const updateEmployee = useUpdateEmployee();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    const normalizedUsername = normalizeUsername(username);

    if (trimmedName.length < 2) {
      setError("Nama minimal 2 karakter.");
      return;
    }
    const usernameValidation = validateUsername(normalizedUsername);
    if (usernameValidation) {
      setError(usernameValidation);
      return;
    }

    try {
      await updateEmployee.mutateAsync({
        id: employee.id,
        name: trimmedName,
        username: normalizedUsername,
      });
      toast.success(`Data @${normalizedUsername} berhasil diperbarui`);
      onOpenChange(false);
    } catch (submitError) {
      const message = friendlyError(submitError, "Gagal memperbarui akun kasir");
      setError(message);
      toast.error(message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Akun Kasir</DialogTitle>
          <DialogDescription>
            Ubah nama tampilan dan username login kasir. Email tidak dapat diubah dari sini.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <DialogBody className="space-y-4">
            <div>
              <Label htmlFor="edit-employee-name">Nama Lengkap</Label>
              <Input
                id="edit-employee-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Contoh: Rizky Pratama"
                autoComplete="off"
                required
              />
            </div>
            <div>
              <Label htmlFor="edit-employee-username">Username</Label>
              <div className="relative">
                <AtSign className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="edit-employee-username"
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
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {USERNAME_HINT}
              </p>
            </div>
            <div>
              <Label htmlFor="edit-employee-email">Email</Label>
              <Input id="edit-employee-email" value={employee.email} disabled />
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Email dipakai Supabase sebagai identitas akun. Perubahan email hanya lewat
                dashboard Supabase.
              </p>
            </div>

            {isDemoMode && (
              <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800">
                Mode demo: perubahan hanya tersimpan di browser ini dan tidak mengubah akun
                login demo.
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
            <Button type="submit" disabled={updateEmployee.isPending}>
              {updateEmployee.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              {updateEmployee.isPending ? "Menyimpan..." : "Simpan Perubahan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
