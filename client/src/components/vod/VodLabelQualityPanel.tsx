import type { VodTeamLabelWarning } from "@shared/vod/labels";
import { VodDetailPill } from "./VodDetailPill";

export function VodLabelQualityPanel({
  totalEvents,
  teamLabeledEventCount,
  uniqueTeamLabelCount,
  warnings,
}: {
  totalEvents: number;
  teamLabeledEventCount: number;
  uniqueTeamLabelCount: number;
  warnings: VodTeamLabelWarning[];
}) {
  return (
    <div className="rounded-lg border border-neon-gold/20 bg-black/30 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-mono text-lg font-bold uppercase tracking-widest text-neon-gold">
            Label Quality
          </h3>
          <p className="mt-1 font-mono text-xs uppercase tracking-widest text-white/45">
            Manual label consistency checks.
          </p>
        </div>
        <span className="rounded border border-white/10 px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-white/40">
          No auto-merge
        </span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <VodDetailPill label="Manual" value={String(totalEvents)} />
        <VodDetailPill
          label="Team tagged"
          value={String(teamLabeledEventCount)}
        />
        <VodDetailPill label="Teams" value={String(uniqueTeamLabelCount)} />
      </div>

      {warnings.length === 0 ? (
        <p className="mt-4 rounded border border-emerald-400/20 bg-emerald-950/20 p-3 font-mono text-xs text-emerald-100/80">
          Team labels look consistent. Keep reusing the same casing and spacing
          so Team Summary and Team Insights stay grouped correctly.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          <p className="rounded border border-neon-gold/30 bg-neon-gold/10 p-3 font-mono text-xs text-neon-gold">
            Suspicious team label variants can split Team Summary and Team
            Insights. Review these manually; this panel does not merge or mutate
            existing events.
          </p>
          {warnings.map(warning => (
            <div
              key={warning.normalizedKey}
              className="rounded border border-white/10 bg-black/30 p-3"
            >
              <div className="font-mono text-[10px] uppercase tracking-widest text-white/40">
                Normalized as “{warning.normalizedKey}” • {warning.totalCount}
                events
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {warning.variants.map(variant => (
                  <span
                    key={variant.label}
                    className="rounded-full border border-neon-gold/40 px-2 py-1 font-mono text-[10px] text-neon-gold"
                  >
                    “{variant.label}” × {variant.count}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
