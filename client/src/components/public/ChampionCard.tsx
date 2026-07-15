import { Crown } from "lucide-react";

export interface ChampionCardData {
  teamName: string;
  members: readonly string[];
  eventName: string;
}

export default function ChampionCard({
  champion,
}: {
  champion: ChampionCardData;
}) {
  return (
    <div className="mt-panel-raised relative overflow-hidden p-6">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at top right, rgba(232,199,102,0.12), transparent 55%)",
        }}
      />
      <div className="relative z-10">
        <div className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-[var(--mt-gold-bright)]">
          <Crown className="size-4" aria-hidden="true" />
          Champions — {champion.eventName}
        </div>
        {/* A callout, not a document section — kept out of the heading
            hierarchy since it appears in varying contexts (hero areas
            before any h2, mid-page after one) where a fixed heading level
            would sometimes skip a level. */}
        <p className="mt-3 text-2xl font-bold uppercase tracking-wide text-[var(--mt-off-white)]">
          {champion.teamName}
        </p>
        <ul className="mt-4 space-y-2">
          {champion.members.map(member => (
            <li
              key={member}
              className="rounded border border-[var(--mt-steel-line)] bg-[var(--mt-charcoal)] px-3 py-2 font-mono text-sm text-[var(--mt-off-white)]"
            >
              {member}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
