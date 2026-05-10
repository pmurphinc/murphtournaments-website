import { Link } from "wouter";
import type { VodTeamSummary } from "@shared/vod/team-summary";
import { VodDetailPill } from "./VodDetailPill";
import { formatAverageSeconds } from "./vod-detail-helpers";

export function VodTeamSummaryPanel({
  summaries,
  vodAnalysisId,
}: {
  summaries: VodTeamSummary[];
  vodAnalysisId: number;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/30 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-mono text-lg font-bold uppercase tracking-widest text-neon-cyan">
            Team Summary
          </h3>
          <p className="mt-1 font-mono text-xs uppercase tracking-widest text-white/45">
            Manual-event breakdown by team.
          </p>
        </div>
        <span className="rounded border border-white/10 px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-white/40">
          Derived
        </span>
      </div>

      {summaries.length === 0 ? (
        <p className="mt-4 rounded border border-white/10 bg-black/30 p-3 font-mono text-sm text-white/50">
          Add team-labeled events to unlock Team Summary.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {summaries.map(summary => (
            <div
              key={summary.teamName}
              className="rounded border border-white/10 bg-black/30 p-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="font-mono text-sm font-bold uppercase tracking-widest text-white">
                  {summary.teamName}
                </h4>
                <Link
                  href={`/vod/${vodAnalysisId}/team-summary/${encodeURIComponent(
                    summary.teamName
                  )}`}
                  className="rounded border border-neon-cyan/50 px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-neon-cyan transition-all hover:bg-neon-cyan/10"
                >
                  View insights
                </Link>
                {summary.firstDeathToWipeAvgSeconds !== null ? (
                  <span className="rounded border border-neon-gold/40 px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-neon-gold">
                    FD→Wipe avg{" "}
                    {formatAverageSeconds(summary.firstDeathToWipeAvgSeconds)}
                  </span>
                ) : null}
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6 lg:grid-cols-3 xl:grid-cols-6">
                <VodDetailPill label="Deaths" value={String(summary.deaths)} />
                <VodDetailPill
                  label="Wipes"
                  value={String(summary.teamWipes)}
                />
                <VodDetailPill
                  label="Spawns"
                  value={String(summary.teamSpawns)}
                />
                <VodDetailPill
                  label="Cashouts"
                  value={String(summary.cashouts)}
                />
                <VodDetailPill
                  label="Steal / Flip"
                  value={String(summary.stealFlips)}
                />
                <VodDetailPill
                  label="Revives"
                  value={String(summary.revives)}
                />
                <VodDetailPill label="Defibs" value={String(summary.defibs)} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
