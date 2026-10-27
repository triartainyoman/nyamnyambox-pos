"use client";

import { useState } from "react";
import { AtSign, Mail, ShieldCheck, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";

import { EmployeeDialog } from "@/components/employees/employee-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { QueryError } from "@/components/ui/query-error";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { friendlyError } from "@/lib/errors";
import { useEmployees, useUpdateProfile } from "@/lib/hooks/use-employees";
import { ROLE_LABELS, isOwnerRole } from "@/lib/constants";
import type { Profile, UserRole } from "@/lib/types";
import { formatDate, formatNumber, initials } from "@/lib/utils";

const ROLE_VARIANT: Record<UserRole, "default" | "info" | "secondary"> = {
  MASTER_ADMIN: "info",
  OWNER: "default",
  EMPLOYEE: "secondary",
};

export function EmployeesClient({ currentProfileId }: { currentProfileId: string }) {
  const { data: employees, isLoading, isError, error, refetch } = useEmployees();
  const updateProfile = useUpdateProfile();
  const [dialogOpen, setDialogOpen] = useState(false);

  const activeCount = (employees ?? []).filter((employee) => employee.is_active).length;

  async function toggle(employee: Profile, nextValue: boolean) {
    try {
      await updateProfile.mutateAsync({
        id: employee.id,
        patch: { is_active: nextValue },
      });
      toast.success(
        nextValue ? `${employee.name} diaktifkan` : `${employee.name} dinonaktifkan`,
      );
    } catch (error) {
      toast.error(friendlyError(error, "Gagal mengubah status akun"));
    }
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-orange-700">
            Akses &amp; Tim
          </p>
          <h1 className="mt-0.5 text-xl font-extrabold tracking-tight md:text-2xl">
            Kelola Karyawan
          </h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Tambah akun kasir (login dengan username) atau nonaktifkan akses yang tidak digunakan.
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="w-full sm:w-auto">
          <UserPlus className="size-4" /> Tambah Kasir
        </Button>
      </header>

      <div className="grid grid-cols-3 gap-2.5">
        <div className="rounded-2xl border border-border/70 bg-card p-3 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Total Akun
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-lg font-extrabold">
            <Users className="size-4 text-stone-400" />
            {formatNumber(employees?.length ?? 0)}
          </p>
        </div>
        <div className="rounded-2xl border border-border/70 bg-card p-3 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Aktif
          </p>
          <p className="mt-1 text-lg font-extrabold text-emerald-600">
            {formatNumber(activeCount)}
          </p>
        </div>
        <div className="rounded-2xl border border-border/70 bg-card p-3 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Nonaktif
          </p>
          <p className="mt-1 text-lg font-extrabold text-stone-400">
            {formatNumber((employees?.length ?? 0) - activeCount)}
          </p>
        </div>
      </div>

      <section className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-bold">
            <ShieldCheck className="size-4 text-orange-700" /> Daftar Akun
          </h2>
          <span className="text-xs text-muted-foreground">
            Owner tidak dapat dinonaktifkan
          </span>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-[70px] w-full" />
            ))}
          </div>
        ) : isError ? (
          <QueryError
            error={error}
            title="Gagal memuat data karyawan"
            fallback="Daftar akun belum dapat dimuat."
            onRetry={() => refetch()}
          />
        ) : employees?.length ? (
          <div className="space-y-2">
            {employees.map((employee) => {
              const isSelf = employee.id === currentProfileId;
              const locked = isSelf || isOwnerRole(employee.role);
              return (
                <div
                  key={employee.id}
                  className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card p-3 shadow-sm"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-orange-100 text-xs font-bold text-orange-700">
                    {initials(employee.name)}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="truncate text-[13px] font-bold">{employee.name}</p>
                      <Badge variant={ROLE_VARIANT[employee.role]} className="px-1.5 py-0 text-xs">
                        {ROLE_LABELS[employee.role]}
                      </Badge>
                      {isSelf && (
                        <Badge variant="outline" className="px-1.5 py-0 text-xs">
                          Anda
                        </Badge>
                      )}
                    </div>
                    {employee.role === "EMPLOYEE" ? (
                      <p className="mt-0.5 flex items-center gap-1 truncate text-xs font-medium text-stone-600">
                        <AtSign className="size-3" />
                        {employee.username}
                      </p>
                    ) : null}
                    <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
                      <Mail className="size-3" />
                      {employee.email}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Bergabung {formatDate(employee.created_at, false)}
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <Switch
                      checked={employee.is_active}
                      disabled={locked || updateProfile.isPending}
                      onCheckedChange={(value) => toggle(employee, value)}
                      aria-label={`Status ${employee.name}`}
                    />
                    <span className="text-xs font-medium text-muted-foreground">
                      {employee.is_active ? "Aktif" : "Nonaktif"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-card/50 py-14 text-center">
            <Users className="size-8 text-stone-300" />
            <p className="text-sm font-semibold">Belum ada akun karyawan</p>
            <p className="text-xs text-muted-foreground">
              Tambahkan akun kasir agar tim dapat mulai mencatat pesanan.
            </p>
          </div>
        )}
      </section>

      {dialogOpen && <EmployeeDialog open={dialogOpen} onOpenChange={setDialogOpen} />}
    </div>
  );
}
