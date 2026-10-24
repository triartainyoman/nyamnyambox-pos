import { Badge } from "@/components/ui/badge";
import { channelMeta } from "@/lib/constants";
import type { OrderChannel, PaymentStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ChannelBadge({ channel, className }: { channel: OrderChannel; className?: string }) {
  const meta = channelMeta(channel);
  return (
    <Badge className={cn("border-transparent font-semibold", meta.tone, className)}>
      {meta.label}
    </Badge>
  );
}

export function PaymentBadge({
  status,
  className,
}: {
  status: PaymentStatus;
  className?: string;
}) {
  return (
    <Badge
      variant={status === "LUNAS" ? "success" : "warning"}
      className={cn("font-semibold", className)}
    >
      {status === "LUNAS" ? "Lunas" : "Belum Lunas"}
    </Badge>
  );
}

export function EditedBadge({ className }: { className?: string }) {
  return (
    <Badge variant="outline" className={cn("font-medium text-muted-foreground", className)}>
      Diedit
    </Badge>
  );
}
