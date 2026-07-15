import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  TOURNAMENT_STATUS_LABEL,
  type TournamentDiscoveryStatus,
} from "@/lib/communityDirectory";

const STATUS_DOT_CLASS: Record<TournamentDiscoveryStatus, string> = {
  live: "bg-red-500",
  "registration-open": "bg-emerald-400",
  upcoming: "bg-sky-400",
  completed: "bg-[var(--mt-muted)]",
};

interface StatusBadgeProps {
  status: TournamentDiscoveryStatus;
  className?: string;
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1.5 border-[var(--mt-steel-line)] bg-[var(--mt-charcoal-raised)] font-mono text-[11px] uppercase tracking-widest text-[var(--mt-off-white)]",
        className
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "size-1.5 rounded-full",
          STATUS_DOT_CLASS[status],
          status === "live" && "animate-pulse"
        )}
      />
      {TOURNAMENT_STATUS_LABEL[status]}
    </Badge>
  );
}
