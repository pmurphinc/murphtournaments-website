import { Trophy } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  PublicEmptyState,
  PublicErrorState,
  PublicLoadingCards,
} from "@/components/public/PublicStates";
import { useArcadeLeaderboard } from "@/lib/arcadeLeaderboard";
import { ARCADE_PUBLIC_URL } from "@shared/arcade";
import CtaButton from "@/components/public/CtaButton";

const RANK_TONE = [
  "text-[var(--mt-gold-bright)]",
  "text-[var(--mt-off-white)]",
  "text-[var(--mt-off-white)]",
];

function initials(name: string) {
  return name.trim().slice(0, 2).toUpperCase() || "??";
}

/**
 * Top saved runs. Only signed-in players appear here — guest bests stay on the
 * guest's own device and are never uploaded.
 */
export default function ArcadeLeaderboard({ limit = 10 }: { limit?: number }) {
  const { data, isLoading, error } = useArcadeLeaderboard(limit);

  if (isLoading)
    return <PublicLoadingCards count={3} label="Loading leaderboard" />;
  if (error) {
    return (
      <PublicErrorState message="The arcade leaderboard could not be loaded right now." />
    );
  }

  if (!data || data.length === 0) {
    return (
      <PublicEmptyState
        title="No saved runs yet"
        description="Play a run, then sign in with Discord at the end to put the first score on the board."
        action={
          <a href={ARCADE_PUBLIC_URL} target="_blank" rel="noopener noreferrer">
            <CtaButton tone="gold">Play Wormhole Arcade</CtaButton>
          </a>
        }
      />
    );
  }

  return (
    <ol className="mt-panel divide-y divide-[var(--mt-steel-line)]">
      {data.map(entry => (
        <li
          key={`${entry.rank}-${entry.displayName}`}
          className="flex items-center gap-3 p-3 sm:gap-4 sm:p-4"
        >
          <span
            className={`w-8 shrink-0 text-center font-mono text-sm font-black tabular-nums ${
              RANK_TONE[entry.rank - 1] ?? "text-[var(--mt-muted)]"
            }`}
          >
            {entry.rank === 1 ? (
              <Trophy className="mx-auto size-4" aria-label="First place" />
            ) : (
              entry.rank
            )}
          </span>
          <Avatar className="size-8 shrink-0 border border-[var(--mt-steel-line)]">
            <AvatarImage src={entry.discordAvatarUrl ?? undefined} alt="" />
            <AvatarFallback className="bg-[var(--mt-black)] font-mono text-[11px] text-[var(--mt-muted)]">
              {initials(entry.displayName)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-[var(--mt-off-white)]">
              {entry.displayName}
            </p>
            <p className="truncate font-mono text-[11px] uppercase tracking-widest text-[var(--mt-muted)]">
              {entry.runs} {entry.runs === 1 ? "run" : "runs"} saved
            </p>
          </div>
          <span className="shrink-0 font-mono text-base font-black tabular-nums text-[var(--mt-gold-bright)] sm:text-lg">
            {entry.bestScore.toLocaleString()}
          </span>
        </li>
      ))}
    </ol>
  );
}
