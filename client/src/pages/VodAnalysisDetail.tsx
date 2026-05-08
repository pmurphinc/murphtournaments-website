import { FormEvent, useMemo, useState } from "react";
import GlitchText from "@/components/GlitchText";
import NeonCard from "@/components/NeonCard";
import { trpc } from "@/lib/trpc";
import {
  formatVodEventTimestamp,
  parseVodEventTimestamp,
  VOD_ANALYSIS_EVENT_LABELS,
  VOD_ANALYSIS_EVENT_REQUIRED_FIELDS,
  VOD_ANALYSIS_EVENT_TYPES,
  type VodAnalysisEventType,
} from "@shared/vod/events";
import { getVodSourceLabel } from "@shared/vod/source";
import {
  buildVodTeamSummaries,
  type VodTeamSummary,
} from "@shared/vod/team-summary";
import { Link } from "wouter";

type RouteParams = {
  id: string;
};

type EventFormErrors = Partial<
  Record<
    "timestamp" | "actorLabel" | "targetLabel" | "teamLabel" | "form",
    string
  >
>;

const EVENT_FILTERS = ["all", ...VOD_ANALYSIS_EVENT_TYPES] as const;
type EventFilter = (typeof EVENT_FILTERS)[number];

const povLabel = (value: "player" | "spectator") =>
  value === "player" ? "Player POV" : "Spectator POV";

const eventFieldLabels = {
  actorLabel: "Actor",
  targetLabel: "Target",
  teamLabel: "Team",
} as const;

const eventFieldHelp: Record<
  VodAnalysisEventType,
  Partial<Record<keyof typeof eventFieldLabels, string>>
> = {
  death: {
    actorLabel: "Eliminating player",
    targetLabel: "Eliminated player",
    teamLabel: "Victim team (optional)",
  },
  tap: {
    actorLabel: "Player tapping",
    targetLabel: "Objective/cashout",
    teamLabel: "Team tapping",
  },
  plug: {
    actorLabel: "Player plugging",
    targetLabel: "Objective/cashout",
    teamLabel: "Team plugging",
  },
  cashout: {
    teamLabel: "Cashing team",
  },
  team_wipe: {
    actorLabel: "Attacking team",
    teamLabel: "Wiped team",
  },
  team_spawn: {
    teamLabel: "Spawning team",
  },
  revive: {
    actorLabel: "Reviving player",
    targetLabel: "Revived player",
    teamLabel: "Team",
  },
  defib: {
    actorLabel: "Defib player",
    targetLabel: "Revived player",
    teamLabel: "Team",
  },
};

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

const formatDuration = (durationSeconds: number | null) => {
  if (!durationSeconds || durationSeconds <= 0) return null;

  const hours = Math.floor(durationSeconds / 3600);
  const minutes = Math.floor((durationSeconds % 3600) / 60);
  const seconds = durationSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }

  return `${seconds}s`;
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

const formatAverageSeconds = (value: number | null) => {
  if (value === null) return null;
  return `${Math.round(value)}s`;
};

function TeamSummarySection({ summaries }: { summaries: VodTeamSummary[] }) {
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
                {summary.firstDeathToWipeAvgSeconds !== null ? (
                  <span className="rounded border border-neon-gold/40 px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-neon-gold">
                    FD→Wipe avg{" "}
                    {formatAverageSeconds(summary.firstDeathToWipeAvgSeconds)}
                  </span>
                ) : null}
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6 lg:grid-cols-3 xl:grid-cols-6">
                <DetailPill label="Deaths" value={String(summary.deaths)} />
                <DetailPill label="Wipes" value={String(summary.teamWipes)} />
                <DetailPill label="Spawns" value={String(summary.teamSpawns)} />
                <DetailPill label="Cashouts" value={String(summary.cashouts)} />
                <DetailPill label="Revives" value={String(summary.revives)} />
                <DetailPill label="Defibs" value={String(summary.defibs)} />
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="mt-4 font-mono text-xs text-white/35">
        Detailed team insights coming later.
      </p>
    </div>
  );
}

function WorkflowPlaceholder({ title }: { title: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/30 p-5 opacity-75">
      <h3 className="font-mono text-lg font-bold uppercase tracking-widest text-white/70">
        {title}
      </h3>
      <p className="mt-2 font-mono text-sm text-white/45">
        Coming in a later build.
      </p>
    </div>
  );
}

export default function VodAnalysisDetail({ params }: { params: RouteParams }) {
  const utils = trpc.useUtils();
  const vodAnalysisId = Number(params.id);
  const isValidId = Number.isInteger(vodAnalysisId) && vodAnalysisId > 0;
  const [selectedEventType, setSelectedEventType] =
    useState<VodAnalysisEventType>("death");
  const [timestampInput, setTimestampInput] = useState("");
  const [actorLabel, setActorLabel] = useState("");
  const [targetLabel, setTargetLabel] = useState("");
  const [teamLabel, setTeamLabel] = useState("");
  const [eventErrors, setEventErrors] = useState<EventFormErrors>({});
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [eventFilter, setEventFilter] = useState<EventFilter>("all");

  const query = trpc.vodAnalysis.getById.useQuery(vodAnalysisId, {
    enabled: isValidId,
    staleTime: 1000 * 30,
  });
  const eventsQuery = trpc.vodAnalysis.listEvents.useQuery(vodAnalysisId, {
    enabled: isValidId,
    staleTime: 1000 * 10,
  });

  const createEventMutation = trpc.vodAnalysis.createEvent.useMutation({
    onSuccess: async () => {
      setTimestampInput("");
      setActorLabel("");
      setTargetLabel("");
      setTeamLabel("");
      setEventErrors({});
      await utils.vodAnalysis.listEvents.invalidate(vodAnalysisId);
    },
    onError: error => {
      setEventErrors({ form: error.message });
    },
  });

  const requiredFields = VOD_ANALYSIS_EVENT_REQUIRED_FIELDS[selectedEventType];
  const parsedTimestamp = parseVodEventTimestamp(timestampInput);

  const currentFormErrors = useMemo(() => {
    const nextErrors: EventFormErrors = {};

    if (!timestampInput.trim()) {
      nextErrors.timestamp = "Timestamp is required.";
    } else if (parsedTimestamp === null) {
      nextErrors.timestamp = "Use whole seconds or m:ss format.";
    }

    if (requiredFields.includes("actorLabel") && !actorLabel.trim()) {
      nextErrors.actorLabel = "Actor is required for this event type.";
    }

    if (requiredFields.includes("targetLabel") && !targetLabel.trim()) {
      nextErrors.targetLabel = "Target is required for this event type.";
    }

    if (requiredFields.includes("teamLabel") && !teamLabel.trim()) {
      nextErrors.teamLabel = "Team is required for this event type.";
    }

    return nextErrors;
  }, [
    actorLabel,
    parsedTimestamp,
    requiredFields,
    targetLabel,
    teamLabel,
    timestampInput,
  ]);

  const isSubmitDisabled =
    createEventMutation.isPending || Object.keys(currentFormErrors).length > 0;

  const vod = query.data;
  const durationLabel = vod ? formatDuration(vod.durationSeconds) : null;
  const sourceHref = vod?.normalizedSourceUrl || vod?.sourceUrl;
  const sourceLabel = vod
    ? getVodSourceLabel({
        valid: true,
        sourceType: vod.sourceType,
        normalizedUrl: vod.normalizedSourceUrl,
        sourceId: vod.sourceId ?? undefined,
        sourceRef: vod.sourceRef ?? undefined,
      })
    : null;
  const events = eventsQuery.data ?? [];
  const teamSummaries = useMemo(() => buildVodTeamSummaries(events), [events]);
  const filteredEvents =
    eventFilter === "all"
      ? events
      : events.filter(event => event.eventType === eventFilter);

  const validateEventForm = () => {
    setEventErrors(currentFormErrors);
    return Object.keys(currentFormErrors).length === 0;
  };

  const handleEventSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validateEventForm() || parsedTimestamp === null) return;

    createEventMutation.mutate({
      vodAnalysisId,
      eventType: selectedEventType,
      timestampSeconds: parsedTimestamp,
      actorLabel: actorLabel || undefined,
      targetLabel: targetLabel || undefined,
      teamLabel: teamLabel || undefined,
    });
  };

  const renderEventInput = (
    field: "actorLabel" | "targetLabel" | "teamLabel"
  ) => {
    const value =
      field === "actorLabel"
        ? actorLabel
        : field === "targetLabel"
          ? targetLabel
          : teamLabel;
    const setValue =
      field === "actorLabel"
        ? setActorLabel
        : field === "targetLabel"
          ? setTargetLabel
          : setTeamLabel;
    const isRequired = requiredFields.includes(field);
    const helper =
      eventFieldHelp[selectedEventType][field] ?? eventFieldLabels[field];

    return (
      <label className="block" key={field}>
        <span className="font-mono text-xs uppercase tracking-widest text-white/60">
          {helper}{" "}
          {isRequired ? <span className="text-neon-gold">*</span> : null}
        </span>
        <input
          value={value}
          onChange={event => setValue(event.target.value)}
          placeholder={eventFieldLabels[field]}
          className="mt-2 w-full rounded border border-white/15 bg-black/40 px-3 py-2 font-mono text-sm text-white outline-none transition focus:border-neon-cyan"
        />
        {eventErrors[field] ? (
          <span className="mt-1 block font-mono text-xs text-red-300">
            {eventErrors[field]}
          </span>
        ) : null}
      </label>
    );
  };

  return (
    <div className="min-h-screen bg-dark-charcoal py-20">
      <div className="container space-y-8">
        <Link
          href="/vod"
          className="inline-flex items-center rounded-sm border-2 border-neon-cyan px-4 py-2 font-mono text-sm font-bold uppercase tracking-widest text-neon-cyan transition-all hover:bg-neon-cyan/10 hover-glow-cyan"
        >
          ← Back to VOD Analysis
        </Link>

        {!isValidId ? (
          <div className="rounded-lg border border-red-500/40 bg-red-950/30 p-8 text-center font-mono text-red-100">
            Invalid VOD analysis id.
          </div>
        ) : query.isError ? (
          <div className="rounded-lg border border-red-500/40 bg-red-950/30 p-8 text-center font-mono text-red-100">
            VOD analysis could not be loaded. {query.error.message}
          </div>
        ) : query.isLoading ? (
          <div className="h-96 animate-pulse rounded-lg border border-white/10 bg-black/40" />
        ) : !vod ? (
          <div className="rounded-lg border border-white/10 bg-black/40 p-8 text-center font-mono text-white/70">
            VOD analysis not found.
          </div>
        ) : (
          <>
            <NeonCard variant="magenta">
              <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
                <div>
                  <div className="mb-4 flex flex-wrap items-center gap-3">
                    <span className="rounded border border-neon-gold/60 px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-neon-gold">
                      {vod.status}
                    </span>
                    <span className="font-mono text-sm text-neon-cyan">
                      {sourceLabel}
                    </span>
                  </div>

                  <GlitchText size="lg" variant="cyan" className="mb-5">
                    {vod.title}
                  </GlitchText>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    <DetailPill
                      label="Video POV"
                      value={povLabel(vod.videoPov)}
                    />
                    <DetailPill
                      label="Created"
                      value={formatDateTime(vod.createdAt)}
                    />
                    <DetailPill
                      label="Updated"
                      value={formatDateTime(vod.updatedAt)}
                    />
                    {durationLabel ? (
                      <DetailPill label="Duration" value={durationLabel} />
                    ) : null}
                  </div>

                  {sourceHref ? (
                    <a
                      href={sourceHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-6 inline-block rounded-sm border-2 border-neon-cyan px-5 py-2 font-mono text-sm font-bold uppercase tracking-widest text-neon-cyan transition-all hover:bg-neon-cyan/10 hover-glow-cyan"
                    >
                      Open source
                    </a>
                  ) : null}
                </div>

                {vod.thumbnailUrl ? (
                  <img
                    src={vod.thumbnailUrl}
                    alt={`${vod.title} thumbnail`}
                    className="aspect-video w-full rounded-lg border border-white/10 bg-black/40 object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex aspect-video w-full items-center justify-center rounded-lg border border-white/10 bg-black/40 font-mono text-sm uppercase tracking-widest text-white/35">
                    No thumbnail
                  </div>
                )}
              </div>
            </NeonCard>

            <NeonCard variant="cyan">
              <h2 className="font-mono text-xl font-bold uppercase text-neon-cyan">
                Shareability guidance
              </h2>
              <p className="mt-3 font-mono text-sm text-white/70">
                Make sure the video link is viewable to reviewers with the
                required permissions.
              </p>
            </NeonCard>

            <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="space-y-4 lg:col-span-2">
                <NeonCard variant="cyan">
                  <h2 className="font-mono text-xl font-bold uppercase text-neon-cyan">
                    Manual Event
                  </h2>
                  <form className="mt-5 space-y-5" onSubmit={handleEventSubmit}>
                    <div>
                      <div className="font-mono text-xs uppercase tracking-widest text-white/60">
                        Event type
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {VOD_ANALYSIS_EVENT_TYPES.map(eventType => (
                          <button
                            key={eventType}
                            type="button"
                            onClick={() => {
                              setSelectedEventType(eventType);
                              setEventErrors({});
                            }}
                            className={`rounded-full border px-3 py-1 font-mono text-xs font-bold uppercase tracking-widest transition ${
                              selectedEventType === eventType
                                ? "border-neon-cyan bg-neon-cyan/15 text-neon-cyan"
                                : "border-white/15 text-white/60 hover:border-white/35 hover:text-white"
                            }`}
                          >
                            {VOD_ANALYSIS_EVENT_LABELS[eventType]}
                          </button>
                        ))}
                      </div>
                    </div>

                    <label className="block">
                      <span className="font-mono text-xs uppercase tracking-widest text-white/60">
                        Timestamp *
                      </span>
                      <input
                        value={timestampInput}
                        onChange={event =>
                          setTimestampInput(event.target.value)
                        }
                        placeholder="90 or 1:30"
                        className="mt-2 w-full rounded border border-white/15 bg-black/40 px-3 py-2 font-mono text-sm text-white outline-none transition focus:border-neon-cyan"
                      />
                      {eventErrors.timestamp ? (
                        <span className="mt-1 block font-mono text-xs text-red-300">
                          {eventErrors.timestamp}
                        </span>
                      ) : (
                        <span className="mt-1 block font-mono text-xs text-white/35">
                          Enter whole seconds or m:ss / mm:ss.
                        </span>
                      )}
                    </label>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      {renderEventInput("actorLabel")}
                      {renderEventInput("targetLabel")}
                      {renderEventInput("teamLabel")}
                    </div>

                    {eventErrors.form ? (
                      <div className="rounded border border-red-500/40 bg-red-950/30 p-3 font-mono text-sm text-red-100">
                        {eventErrors.form}
                      </div>
                    ) : null}

                    <button
                      type="submit"
                      disabled={isSubmitDisabled}
                      className="rounded-sm border-2 border-neon-gold px-5 py-2 font-mono text-sm font-bold uppercase tracking-widest text-neon-gold transition-all hover:bg-neon-gold/10 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {createEventMutation.isPending ? "Saving…" : "Add Event"}
                    </button>
                  </form>
                </NeonCard>

                <NeonCard variant="magenta">
                  <button
                    type="button"
                    onClick={() => setTimelineOpen(open => !open)}
                    className="flex w-full items-center justify-between gap-4 text-left"
                  >
                    <span>
                      <span className="block font-mono text-xl font-bold uppercase text-neon-pink">
                        Event Timeline
                      </span>
                      <span className="mt-1 block font-mono text-xs uppercase tracking-widest text-white/45">
                        {events.length}{" "}
                        {events.length === 1 ? "event" : "events"}
                      </span>
                    </span>
                    <span className="font-mono text-sm uppercase tracking-widest text-neon-cyan">
                      {timelineOpen ? "Collapse" : "Expand"}
                    </span>
                  </button>

                  {timelineOpen ? (
                    <div className="mt-5 space-y-4">
                      <div className="flex flex-wrap gap-2">
                        {EVENT_FILTERS.map(filter => (
                          <button
                            key={filter}
                            type="button"
                            onClick={() => setEventFilter(filter)}
                            className={`rounded-full border px-3 py-1 font-mono text-xs font-bold uppercase tracking-widest transition ${
                              eventFilter === filter
                                ? "border-neon-pink bg-neon-pink/15 text-neon-pink"
                                : "border-white/15 text-white/60 hover:border-white/35 hover:text-white"
                            }`}
                          >
                            {filter === "all"
                              ? "All"
                              : VOD_ANALYSIS_EVENT_LABELS[filter]}
                          </button>
                        ))}
                      </div>

                      {eventsQuery.isLoading ? (
                        <div className="rounded border border-white/10 bg-black/30 p-4 font-mono text-sm text-white/50">
                          Loading events…
                        </div>
                      ) : events.length === 0 ? (
                        <div className="rounded border border-white/10 bg-black/30 p-4 font-mono text-sm text-white/50">
                          No events yet. Add a manual event above to start the
                          timeline.
                        </div>
                      ) : filteredEvents.length === 0 ? (
                        <div className="rounded border border-white/10 bg-black/30 p-4 font-mono text-sm text-white/50">
                          No events for this filter.
                        </div>
                      ) : (
                        <ol className="space-y-3">
                          {filteredEvents.map(event => (
                            <li
                              key={event.id}
                              className="rounded border border-white/10 bg-black/30 p-4"
                            >
                              <div className="flex flex-wrap items-center gap-3">
                                <span className="rounded border border-neon-cyan/50 px-2 py-1 font-mono text-xs font-bold text-neon-cyan">
                                  {formatVodEventTimestamp(
                                    event.timestampSeconds
                                  )}
                                </span>
                                <span className="font-mono text-sm font-bold uppercase tracking-widest text-white">
                                  {VOD_ANALYSIS_EVENT_LABELS[event.eventType]}
                                </span>
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
                          ))}
                        </ol>
                      )}
                    </div>
                  ) : null}
                </NeonCard>
              </div>

              <div className="space-y-4">
                <TeamSummarySection summaries={teamSummaries} />
                <WorkflowPlaceholder title="Auto-capture Setup" />
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
