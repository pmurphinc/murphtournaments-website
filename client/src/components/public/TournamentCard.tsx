import { Link } from "wouter";
import { ArrowUpRight } from "lucide-react";
import StatusBadge from "./StatusBadge";
import type { TournamentDiscoveryStatus } from "@/lib/communityDirectory";

export interface TournamentCardData {
  id: number;
  name: string;
  status: TournamentDiscoveryStatus;
  dateLabel?: string;
  format?: string;
  teamsLabel?: string;
  note?: string;
  href: string;
  actionLabel: string;
}

export default function TournamentCard({
  tournament,
}: {
  tournament: TournamentCardData;
}) {
  return (
    <Link
      href={tournament.href}
      className="mt-panel mt-hover-lift group flex flex-col gap-4 p-5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--mt-gold-bright)]"
    >
      <StatusBadge status={tournament.status} />

      <div>
        <h3 className="text-lg font-bold uppercase tracking-wide text-[var(--mt-off-white)] group-hover:text-[var(--mt-gold-bright)]">
          {tournament.name}
        </h3>
        {tournament.dateLabel ? (
          <p className="mt-1 font-mono text-xs text-[var(--mt-muted)]">
            {tournament.dateLabel}
          </p>
        ) : null}
      </div>

      {tournament.note ? (
        <p className="line-clamp-2 text-sm leading-relaxed text-[var(--mt-muted)]">
          {tournament.note}
        </p>
      ) : null}

      <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-[var(--mt-steel-line)] pt-3 font-mono text-xs uppercase tracking-widest text-[var(--mt-muted)]">
        {tournament.format ? <span>{tournament.format}</span> : null}
        {tournament.teamsLabel ? <span>{tournament.teamsLabel}</span> : null}
      </div>

      <span className="inline-flex items-center gap-1 font-mono text-xs font-bold uppercase tracking-widest text-[var(--mt-gold-bright)]">
        {tournament.actionLabel}
        <ArrowUpRight className="size-3.5" aria-hidden="true" />
      </span>
    </Link>
  );
}
