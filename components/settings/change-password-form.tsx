"use client";

import { useActionState, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Eye, EyeOff, KeyRound, Loader2 } from "lucide-react";

import { changePasswordAction } from "@/app/actions/security";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PASSWORD_MIN_LENGTH } from "@/lib/password";
import type { ActionResult } from "@/lib/types";

export function ChangePasswordForm({ demoMode }: { demoMode: boolean }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [visible, setVisible] = useState(false);

  // Reset the fields only after a successful change. Keeping this in the
  // action wrapper avoids a setState-in-effect and never clears a failed form.
  const [state, formAction, pending] = useActionState(
    async (previous: ActionResult, formData: FormData) => {
      const result = await changePasswordAction(previous, formData);
      if (result?.success) formRef.current?.reset();
      return result;
    },
    undefined,
  );

  const inputType = visible ? "text" : "password";

  return (
    <form
      ref={formRef}
      action={formAction}
      className="space-y-4 rounded-2xl border border-border/70 bg-card p-4 shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-bold">
            <KeyRound className="size-4 text-orange-700" /> Ganti password
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Minimal {PASSWORD_MIN_LENGTH} karakter dan berbeda dari password saat ini.
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

      {demoMode ? (
        <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800">
          Mode demo memakai password tetap dan tidak menyimpan perubahan. Ganti password
          hanya tersedia di mode production.
        </p>
      ) : null}

      <div>
        <Label htmlFor="current-password">Password saat ini</Label>
        <Input
          id="current-password"
          name="current_password"
          type={inputType}
          autoComplete="current-password"
          disabled={demoMode || pending}
          required
        />
      </div>

      <div>
        <Label htmlFor="new-password">Password baru</Label>
        <Input
          id="new-password"
          name="new_password"
          type={inputType}
          autoComplete="new-password"
          minLength={PASSWORD_MIN_LENGTH}
          disabled={demoMode || pending}
          required
        />
      </div>

      <div>
        <Label htmlFor="confirm-password">Ulangi password baru</Label>
        <Input
          id="confirm-password"
          name="confirm_password"
          type={inputType}
          autoComplete="new-password"
          minLength={PASSWORD_MIN_LENGTH}
          disabled={demoMode || pending}
          required
        />
      </div>

      {state?.error ? (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-red-700"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          {state.error}
        </p>
      ) : null}

      {state?.success ? (
        <p
          role="status"
          className="flex items-start gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700"
        >
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          {state.success}
        </p>
      ) : null}

      <Button type="submit" disabled={demoMode || pending} className="w-full sm:w-auto">
        {pending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <KeyRound className="size-4" />
        )}
        {pending ? "Menyimpan..." : "Simpan Password Baru"}
      </Button>
    </form>
  );
}
