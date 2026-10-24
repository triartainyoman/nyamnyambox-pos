import Link from "next/link";
import { UtensilsCrossed } from "lucide-react";

import { cn } from "@/lib/utils";

export function Brand({
  compact = false,
  className,
  href = "/pos",
}: {
  compact?: boolean;
  className?: string;
  href?: string;
}) {
  return (
    <Link href={href} className={cn("flex items-center gap-2.5", className)}>
      <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 text-white shadow-md shadow-orange-500/25">
        <UtensilsCrossed className="size-5" />
      </span>
      {!compact && (
        <span className="flex flex-col leading-tight">
          <span className="text-[15px] font-extrabold tracking-tight text-stone-900">
            Nyamnyambox
          </span>
          <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-stone-500">
            POS &amp; Orders
          </span>
        </span>
      )}
    </Link>
  );
}
