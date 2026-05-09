import { useMemo } from "react";
import GlitchText from "@/components/GlitchText";
import NeonCard from "@/components/NeonCard";
import { trpc } from "@/lib/trpc";
import {
  formatVodEventTimestamp,
  VOD_ANALYSIS_EVENT_LABELS,
} from "@shared/vod/events";
import { buildVodTimestampUrl, getVodSourceLabel } from "@shared/vod/source";
import {
  buildVodTeamSummaries,
  getVodTeamAttributedEvents,
  getVodTeamInsightCallouts,
  type VodTeamSummary,
} from "@shared/vod/team-summary";
import { Link } from "wouter";

type RouteParams = {
  id: string;
  teamName: string;
};

const povLabel = (value: "player" | "spectator") =>
  value === "player" ? "Player POV" : "Spectator POV";

const formatDateTime = (value: Date | string) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown date";

  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const formatAverageSeconds = (value: number | null) => {
  if (value === null) return "No pairs yet";
  return `${Math.round(value)}s`;
};

const safeDecodeURIComponent = (value: string) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

function DetailPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-white/10 bg-black/30 px-3 py-2">
      <div className="font-mono text-[10px] uppercase tracking-widest text-white/45">
        {label}
      </div>
      <div className="mt-1 font-mono text-sm text-white/85">{value}</div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/40 p-4">
      <p className="font-mono text-[10px] uppercase tracking-widest text-white/45">
        {label}
      </p>
      <p className="mt-2 font-mono text-2xl font-black text-white">{value}</p>
    </div>
  );
}

type ComparisonMetric = {
  key: string;
  label: string;
  value: (summary: VodTeamSummary) => number | null;
};

const comparisonMetrics: ComparisonMetric[] = [
  { key: "deaths", label: "Deaths", value: summary => summary.deaths },
  {
    key: "teamWipes",
    label: "Team wipes",
    value: summary => summary.teamWipes,
  },
  { key: "cashouts", label: "Cashouts", value: summary => summary.cashouts },
  {
    key: "stealFlips",
    label: "Steal / Flip",
    value: summary => summary.stealFlips,
  },
  {
    key: "recovery",
    label: "Revives + defibs",
    value: summary => summary.revives + summary.defibs,
  },
  {
    key: "firstDeathToWipeAvgSeconds",
    label: "FD→Wipe avg",
    value: summary => summary.firstDeathToWipeAvgSeconds,
  },
];

function ComparisonBars({
  summaries,
  selectedTeamName,
}: {
  summaries: VodTeamSummary[];
  selectedTeamName: string;
}) {
  return (
    <div className="space-y-6">
      {comparisonMetrics.map(metric => {
        const values = summaries
          .map(summary => metric.value(summary))
          .filter((value): value is number => value !== null);
        const maxValue = Math.max(1, ...values);
        const hasData = values.length > 0 && values.some(value => value > 0);

        return (
          <div key={metric.key}>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="font-mono text-sm font-bold uppercase tracking-widest text-neon-cyan">
                {metric.label}
              </h3>
              {!hasData ? (
                <span className="font-mono text-xs uppercase tracking-widest text-white/35">
                  No data
                </span>
              ) : null}
            </div>
            <div className="space-y-2">
              {summaries.map(summary => {
                const rawValue = metric.value(summary);
                const value = rawValue ?? 0;
                const percentage = hasData
                  ? Math.max(5, (value / maxValue) * 100)
                  : 0;
                const isSelected = summary.teamName === selectedTeamName;

                return (
                  <div key={`${metric.key}-${summary.teamName}`}>
                    <div className="mb-1 flex justify-between gap-3 font-mono text-xs">
                      <span
                        className={
                          isSelected ? "text-neon-gold" : "text-white/65"
                        }
                      >
                        {summary.teamName}
                      </span>
                      <span className="text-white/60">
                        {rawValue === null
                          ? "—"
                          : metric.key === "firstDeathToWipeAvgSeconds"
                            ? formatAverageSeconds(rawValue)
                            : rawValue}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/10">
                      <div
                        className={`h-full rounded-full ${
                          isSelected ? "bg-neon-gold" : "bg-neon-cyan/60"
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function VodTeamInsights({ params }: { params: RouteParams }) {
  const vodAnalysisId = Number(params.id);
  const isValidId = Number.isInteger(vodAnalysisId) && vodAnalysisId > 0;
  const selectedTeamName = safeDecodeURIComponent(params.teamName).trim();

  const query = trpc.vodAnalysis.getById.useQuery(vodAnalysisId, {
    enabled: isValidId,
    staleTime: 1000 * 30,
  });
  const eventsQuery = trpc.vodAnalysis.listEvents.useQuery(vodAnalysisId, {
    enabled: isValidId,
    staleTime: 1000 * 10,
  });

  const events = eventsQuery.data ?? [];
  const teamSummaries = useMemo(() => buildVodTeamSummaries(events), [events]);
  const selectedSummary = teamSummaries.find(
    summary => summary.teamName === selectedTeamName
  );
  const selectedEvents = useMemo(
    () => getVodTeamAttributedEvents(selectedTeamName, events),
    [events, selectedTeamName]
  );
  const callouts = selectedSummary
    ? getVodTeamInsightCallouts(selectedSummary, teamSummaries)
    : [];

  const vod = query.data;
  const getEventTimestampUrl = (timestampSeconds: number) =>
    vod
      ? buildVodTimestampUrl(
          {
            sourceType: vod.sourceType,
            sourceId: vod.sourceId,
            sourceRef: vod.sourceRef,
            normalizedSourceUrl: vod.normalizedSourceUrl,
            sourceUrl: vod.sourceUrl,
          },
          timestampSeconds
        )
      : null;

  const sourceLabel = vod
    ? getVodSourceLabel({
        valid: true,
        sourceType: vod.sourceType,
        normalizedUrl: vod.normalizedSourceUrl,
        sourceId: vod.sourceId ?? undefined,
        sourceRef: vod.sourceRef ?? undefined,
      })
    : null;

  if (!isValidId || !selectedTeamName) {
    return (
      <div className="min-h-screen bg-dark-charcoal py-20">
        <div className="container">
          <NeonCard variant="magenta">
            <GlitchText size="lg" variant="magenta" className="mb-4">
              Invalid team insights link
            </GlitchText>
            <p className="font-mono text-white/70">
              Check the VOD id and selected team name, then try again.
            </p>
            <Link
              href="/vod"
              className="mt-6 inline-block rounded-sm border-2 border-neon-cyan px-5 py-2 font-mono text-sm font-bold uppercase tracking-widest text-neon-cyan transition-all hover:bg-neon-cyan/10 hover-glow-cyan"
            >
              Back to VOD Analysis
            </Link>
          </NeonCard>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-charcoal py-20">
      <div className="container space-y-6">
        <div className="flex flex-wrap gap-3">
          <Link
            href={`/vod/${vodAnalysisId}`}
            className="rounded-sm border border-neon-cyan/60 px-4 py-2 font-mono text-xs font-bold uppercase tracking-widest text-neon-cyan transition-all hover:bg-neon-cyan/10"
          >
            Back to VOD Detail
          </Link>
          <Link
            href="/vod"
            className="rounded-sm border border-white/20 px-4 py-2 font-mono text-xs font-bold uppercase tracking-widest text-white/70 transition-all hover:border-neon-magenta hover:text-neon-magenta"
          >
            Back to VOD Analysis
          </Link>
        </div>

        {query.isLoading || eventsQuery.isLoading ? (
          <NeonCard variant="cyan">
            <p className="font-mono text-white/70">Loading team insights...</p>
          </NeonCard>
        ) : query.isError || eventsQuery.isError ? (
          <NeonCard variant="magenta">
            <GlitchText size="lg" variant="magenta" className="mb-4">
              Team insights unavailable
            </GlitchText>
            <p className="font-mono text-white/70">
              {(query.error ?? eventsQuery.error)?.message ??
                "Unable to load this VOD."}
            </p>
          </NeonCard>
        ) : !vod ? (
          <NeonCard variant="magenta">
            <GlitchText size="lg" variant="magenta" className="mb-4">
              VOD not found
            </GlitchText>
            <p className="font-mono text-white/70">
              This VOD analysis does not exist or is no longer available.
            </p>
          </NeonCard>
        ) : !selectedSummary ? (
          <NeonCard variant="gold">
            <GlitchText size="lg" variant="gold" className="mb-4">
              Team not found
            </GlitchText>
            <p className="font-mono text-white/70">
              No manual-event team summary exists for {selectedTeamName}. Add
              team-labeled events on the VOD detail page to unlock this view.
            </p>
          </NeonCard>
        ) : (
          <>
            <NeonCard variant="cyan">
              <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
                <div>
                  <p className="mb-3 font-mono text-xs uppercase tracking-[0.35em] text-neon-cyan/70">
                    VOD Team Insights
                  </p>
                  <GlitchText size="xl" variant="cyan" className="mb-4">
                    {selectedSummary.teamName}
                  </GlitchText>
                  <h1 className="font-mono text-2xl font-black uppercase tracking-widest text-white">
                    {vod.title}
                  </h1>
                </div>
                <span className="w-fit rounded border border-neon-gold/40 px-3 py-2 font-mono text-xs uppercase tracking-widest text-neon-gold">
                  Manual-event derived
                </span>
              </div>
              <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <DetailPill label="Source" value={sourceLabel ?? "Unknown"} />
                <DetailPill label="Video POV" value={povLabel(vod.videoPov)} />
                <DetailPill label="Status" value={vod.status} />
                <DetailPill
                  label="Created"
                  value={formatDateTime(vod.createdAt)}
                />
                <DetailPill
                  label="Events"
                  value={String(selectedEvents.length)}
                />
              </div>
            </NeonCard>

            <section className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
              <StatCard label="Deaths" value={String(selectedSummary.deaths)} />
              <StatCard
                label="Team wipes"
                value={String(selectedSummary.teamWipes)}
              />
              <StatCard
                label="Team spawns"
                value={String(selectedSummary.teamSpawns)}
              />
              <StatCard
                label="Cashouts"
                value={String(selectedSummary.cashouts)}
              />
              <StatCard
                label="Steal / Flip"
                value={String(selectedSummary.stealFlips)}
              />
              <StatCard
                label="Revives"
                value={String(selectedSummary.revives)}
              />
              <StatCard label="Defibs" value={String(selectedSummary.defibs)} />
              <StatCard
                label="FD→Wipe avg"
                value={formatAverageSeconds(
                  selectedSummary.firstDeathToWipeAvgSeconds
                )}
              />
            </section>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
              <div className="space-y-6">
                <NeonCard variant="cyan">
                  <h2 className="font-mono text-xl font-bold uppercase tracking-widest text-neon-cyan">
                    Team comparison
                  </h2>
                  <p className="mt-2 font-mono text-sm text-white/55">
                    Selected team is highlighted against the other teams from
                    this VOD.
                  </p>
                  <div className="mt-6">
                    <ComparisonBars
                      summaries={teamSummaries}
                      selectedTeamName={selectedSummary.teamName}
                    />
                  </div>
                </NeonCard>

                <NeonCard variant="gold">
                  <h2 className="font-mono text-xl font-bold uppercase tracking-widest text-neon-gold">
                    Selected team timeline
                  </h2>
                  {selectedEvents.length === 0 ? (
                    <p className="mt-4 rounded border border-white/10 bg-black/30 p-4 font-mono text-sm text-white/50">
                      No attributed events for this team yet.
                    </p>
                  ) : (
                    <ol className="mt-5 space-y-3">
                      {selectedEvents.map(event => {
                        const timestampUrl = getEventTimestampUrl(
                          event.timestampSeconds
                        );

                        return (
                          <li
                            key={event.id}
                            className="rounded border border-white/10 bg-black/30 p-4"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div className="flex flex-wrap items-center gap-3">
                                <span className="rounded border border-neon-gold/50 px-2 py-1 font-mono text-xs font-bold text-neon-gold">
                                  {formatVodEventTimestamp(
                                    event.timestampSeconds
                                  )}
                                </span>
                                <span className="font-mono text-sm font-bold uppercase tracking-widest text-white">
                                  {VOD_ANALYSIS_EVENT_LABELS[event.eventType]}
                                </span>
                              </div>
                              {timestampUrl ? (
                                <a
                                  href={timestampUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="rounded-sm border border-neon-gold/60 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-neon-gold transition hover:bg-neon-gold/10"
                                >
                                  Open at timestamp
                                </a>
                              ) : null}
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2 font-mono text-xs text-white/65">
                              {event.actorLabel ? (
                                <span>Actor: {event.actorLabel}</span>
                              ) : null}
                              {event.targetLabel ? (
                                <span>Target: {event.targetLabel}</span>
                              ) : null}
                              {event.teamLabel ? (
                                <span>Team: {event.teamLabel}</span>
                              ) : null}
                            </div>
                          </li>
                        );
                      })}
                    </ol>
                  )}
                </NeonCard>
              </div>

              <div className="space-y-6">
                <NeonCard variant="magenta">
                  <h2 className="font-mono text-xl font-bold uppercase tracking-widest text-neon-magenta">
                    Event breakdown
                  </h2>
                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <DetailPill
                      label="Deaths"
                      value={String(selectedSummary.deaths)}
                    />
                    <DetailPill
                      label="Team wipes"
                      value={String(selectedSummary.teamWipes)}
                    />
                    <DetailPill
                      label="Team spawns"
                      value={String(selectedSummary.teamSpawns)}
                    />
                    <DetailPill
                      label="Cashouts"
                      value={String(selectedSummary.cashouts)}
                    />
                    <DetailPill
                      label="Steal / Flip"
                      value={String(selectedSummary.stealFlips)}
                    />
                    <DetailPill
                      label="Revives"
                      value={String(selectedSummary.revives)}
                    />
                    <DetailPill
                      label="Defibs"
                      value={String(selectedSummary.defibs)}
                    />
                  </div>
                </NeonCard>

                <NeonCard variant="lime">
                  <h2 className="font-mono text-xl font-bold uppercase tracking-widest text-neon-lime">
                    Coaching callouts
                  </h2>
                  <ul className="mt-5 space-y-3">
                    {callouts.map(callout => (
                      <li
                        key={callout}
                        className="rounded border border-neon-lime/30 bg-neon-lime/5 p-3 font-mono text-sm text-white/75"
                      >
                        {callout}
                      </li>
                    ))}
                  </ul>
                </NeonCard>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
