import { Skeleton } from "@/components/ui/skeleton";

/**
 * Route-level fallback for the authenticated app.
 *
 * It renders inside `AppShell`, so the navigation stays usable while the next
 * segment streams in. The layout is intentionally generic (header + cards)
 * because it is shared by POS, history, dashboard, menu and employees.
 */
export default function AppLoading() {
  return (
    <div className="space-y-5" role="status" aria-live="polite">
      <span className="sr-only">Memuat halaman…</span>

      <header className="flex items-start justify-between gap-3">
        <div className="w-full max-w-xs space-y-2">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-7 w-52" />
          <Skeleton className="h-3 w-64 max-w-full" />
        </div>
        <Skeleton className="h-6 w-24 shrink-0 rounded-full" />
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-20 rounded-2xl" />
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton key={index} className="h-44 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
