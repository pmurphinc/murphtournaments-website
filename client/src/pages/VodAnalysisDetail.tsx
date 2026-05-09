import { FormEvent, useMemo, useState } from "react";
import GlitchText from "@/components/GlitchText";
import NeonCard from "@/components/NeonCard";
import { trpc } from "@/lib/trpc";
import {
  formatVodEventTimestamp,
  getVodEventTargetKind,
  parseVodEventTimestamp,
  VOD_ANALYSIS_EVENT_LABELS,
  VOD_ANALYSIS_EVENT_REQUIRED_FIELDS,
  VOD_ANALYSIS_EVENT_TYPES,
  VOD_CASHOUT_LABELS,
  VOD_VAULT_LABELS,
  type VodAnalysisEventType,
} from "@shared/vod/events";
import {
  formatCaptureReadinessLabel,
  formatVodCaptureJobStatus,
  getVodCaptureJobProgress,
  getVodCaptureJobStatusTone,
  getVodCaptureReadiness,
} from "@shared/vod/frame-sampling";
import {
  buildVodTeamLabelOptions,
  getVodEventLabelSuggestions,
  getVodTeamLabelWarnings,
  normalizeVodLabelKey,
  type VodTeamLabelWarning,
} from "@shared/vod/labels";
import {
  buildVodEmbedConfig,
  buildVodTimestampUrl,
  formatVodSourceType,
  getVodSourceLabel,
  type VodEmbedConfig,
} from "@shared/vod/source";
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

const SUGGESTED_EVENT_FILTERS = [
  "all",
  "pending",
  "approved",
  "rejected",
] as const;
type SuggestedEventFilter = (typeof SUGGESTED_EVENT_FILTERS)[number];

type SuggestedEventStatus = Exclude<SuggestedEventFilter, "all">;

type SuggestedEventEditState = {
  id: number;
  eventType: VodAnalysisEventType;
  timestampInput: string;
  actorLabel: string;
  targetLabel: string;
  teamLabel: string;
  confidence: number | null;
};

const suggestedEventFilterLabels: Record<SuggestedEventFilter, string> = {
  all: "All",
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
};

const suggestedEventFieldLabels: Record<
  VodAnalysisEventType,
  Partial<Record<"actorLabel" | "targetLabel" | "teamLabel", string>>
> = {
  death: {
    actorLabel: "Eliminating Player",
    targetLabel: "Eliminated Player",
    teamLabel: "Victim Team",
  },
  tap: {
    actorLabel: "Tapping Player",
    targetLabel: "Vault",
    teamLabel: "Tapping Team",
  },
  plug: {
    actorLabel: "Plugging Player",
    targetLabel: "Cashout",
    teamLabel: "Plugging Team",
  },
  cashout: {
    targetLabel: "Cashout",
    teamLabel: "Cashing Team",
  },
  steal_flip: {
    targetLabel: "Cashout",
    teamLabel: "Stealing Team / New Owner",
  },
  team_wipe: {
    actorLabel: "Attacking Team",
    teamLabel: "Wiped Team",
  },
  team_spawn: {
    teamLabel: "Spawning Team",
  },
  revive: {
    actorLabel: "Reviving Player",
    targetLabel: "Revived Player",
    teamLabel: "Team",
  },
  defib: {
    actorLabel: "Defib Player",
    targetLabel: "Revived Player",
    teamLabel: "Team",
  },
};

const metadataPreviewLimit = 120;

function truncateMetadataPreview(value: string) {
  return value.length > metadataPreviewLimit
    ? `${value.slice(0, metadataPreviewLimit - 1)}…`
    : value;
}

function formatUnknownMetadataValue(value: unknown): string {
  if (value === null) return "null";
  if (["string", "number", "boolean"].includes(typeof value)) {
    return String(value);
  }
  if (Array.isArray(value)) {
    return `[${value.length} items]`;
  }
  if (typeof value === "object") {
    return "{…}";
  }

  return String(value);
}

function formatSuggestedEventMetadataPreview(metadata: string | null) {
  if (!metadata) return null;

  try {
    const parsed: unknown = JSON.parse(metadata);

    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const entries = Object.entries(parsed as Record<string, unknown>);
      if (entries.length === 0) return "{}";

      const preview = entries
        .slice(0, 3)
        .map(([key, value]) => `${key}: ${formatUnknownMetadataValue(value)}`)
        .join(" • ");
      const suffix = entries.length > 3 ? " • …" : "";

      return truncateMetadataPreview(`${preview}${suffix}`);
    }

    return truncateMetadataPreview(formatUnknownMetadataValue(parsed));
  } catch {
    return truncateMetadataPreview(metadata);
  }
}

type SuggestedEventDisplayField = {
  key: "actorLabel" | "targetLabel" | "teamLabel";
  label: string;
  value: string;
};

function getSuggestedEventDisplayFields(suggestion: {
  eventType: VodAnalysisEventType;
  actorLabel: string | null;
  targetLabel: string | null;
  teamLabel: string | null;
}): SuggestedEventDisplayField[] {
  const labels = suggestedEventFieldLabels[suggestion.eventType];
  const fields: SuggestedEventDisplayField[] = [];

  if (labels.actorLabel && suggestion.actorLabel) {
    fields.push({
      key: "actorLabel",
      label: labels.actorLabel,
      value: suggestion.actorLabel,
    });
  }

  if (labels.teamLabel && suggestion.teamLabel) {
    fields.push({
      key: "teamLabel",
      label: labels.teamLabel,
      value: suggestion.teamLabel,
    });
  }

  if (labels.targetLabel && suggestion.targetLabel) {
    fields.push({
      key: "targetLabel",
      label: labels.targetLabel,
      value: formatVodTargetDisplayLabel(
        suggestion.eventType,
        suggestion.targetLabel
      ),
    });
  }

  return fields;
}

function formatVodTargetDisplayLabel(
  eventType: VodAnalysisEventType,
  targetLabel: string
) {
  const targetKind = getVodEventTargetKind(eventType);

  if (targetKind === "cashout") return `Cashout ${targetLabel}`;
  if (targetKind === "vault") return `Vault ${targetLabel}`;

  return targetLabel;
}

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
    teamLabel: "Victim Team",
  },
  tap: {
    actorLabel: "Player tapping",
    targetLabel: "Vault",
    teamLabel: "Team Tapping",
  },
  plug: {
    actorLabel: "Player plugging",
    targetLabel: "Cashout",
    teamLabel: "Team Plugging",
  },
  cashout: {
    targetLabel: "Cashout",
    teamLabel: "Cashing Team",
  },
  team_wipe: {
    actorLabel: "Attacking Team",
    teamLabel: "Wiped Team",
  },
  team_spawn: {
    teamLabel: "Spawning Team",
  },
  steal_flip: {
    targetLabel: "Cashout",
    teamLabel: "Stealing Team / New Owner",
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

function ReviewPlayerSection({
  embedConfig,
  sourceHref,
  durationLabel,
}: {
  embedConfig: VodEmbedConfig;
  sourceHref: string | null | undefined;
  durationLabel: string | null;
}) {
  const providerLabel = embedConfig.embeddable
    ? embedConfig.label
    : embedConfig.provider === "generic"
      ? "VIDEO LINK"
      : "UNKNOWN SOURCE";

  return (
    <NeonCard variant="cyan" className="h-full">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-mono text-xl font-bold uppercase text-neon-cyan">
            Review Player
          </h2>
          <p className="mt-1 font-mono text-xs uppercase tracking-widest text-white/45">
            {providerLabel}
          </p>
        </div>
        {durationLabel ? (
          <span className="rounded border border-neon-gold/50 px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-neon-gold">
            Duration {durationLabel}
          </span>
        ) : null}
      </div>

      {embedConfig.embeddable ? (
        <div className="overflow-hidden rounded-lg border border-neon-cyan/30 bg-black shadow-[0_0_24px_rgba(0,243,255,0.12)]">
          <iframe
            src={embedConfig.embedUrl}
            title="Review Player"
            className="aspect-video w-full"
            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            sandbox="allow-same-origin allow-scripts allow-presentation allow-popups"
            allowFullScreen
          />
        </div>
      ) : (
        <div className="flex aspect-video w-full items-center justify-center rounded-lg border border-white/10 bg-black/50 p-6 text-center">
          <div>
            <div className="font-mono text-sm font-bold uppercase tracking-widest text-white/70">
              Embed unavailable
            </div>
            <p className="mt-3 max-w-xl font-mono text-sm text-white/50">
              {embedConfig.reason}
            </p>
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="font-mono text-xs uppercase tracking-widest text-white/40">
          Log manual events beside the playback station. Playback time is not
          auto-synced yet.
        </p>
        {sourceHref ? (
          <a
            href={sourceHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block rounded-sm border border-neon-cyan/70 px-3 py-2 font-mono text-xs font-bold uppercase tracking-widest text-neon-cyan transition-all hover:bg-neon-cyan/10"
          >
            Open source
          </a>
        ) : null}
      </div>
    </NeonCard>
  );
}

const formatAverageSeconds = (value: number | null) => {
  if (value === null) return null;
  return `${Math.round(value)}s`;
};

function LabelQualityPanel({
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
        <DetailPill label="Manual" value={String(totalEvents)} />
        <DetailPill label="Team tagged" value={String(teamLabeledEventCount)} />
        <DetailPill label="Teams" value={String(uniqueTeamLabelCount)} />
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

function TeamSummarySection({
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
                <DetailPill label="Deaths" value={String(summary.deaths)} />
                <DetailPill label="Wipes" value={String(summary.teamWipes)} />
                <DetailPill label="Spawns" value={String(summary.teamSpawns)} />
                <DetailPill label="Cashouts" value={String(summary.cashouts)} />
                <DetailPill
                  label="Steal / Flip"
                  value={String(summary.stealFlips)}
                />
                <DetailPill label="Revives" value={String(summary.revives)} />
                <DetailPill label="Defibs" value={String(summary.defibs)} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CaptureReadinessPanel({
  vodAnalysisId,
  vod,
}: {
  vodAnalysisId: number;
  vod: {
    sourceType: string;
    sourceUrl: string | null;
    normalizedSourceUrl: string | null;
    durationSeconds: number | null;
  };
}) {
  const utils = trpc.useUtils();
  const [mockAutomationMessage, setMockAutomationMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [captureJobStatusMessage, setCaptureJobStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const readiness = getVodCaptureReadiness(vod);
  const samplePlan = readiness.samplePlan;
  const firstTimestamps = samplePlan.timestamps.slice(0, 5);
  const durationLabel = formatDuration(vod.durationSeconds) ?? "Unavailable";
  const automationStatusQuery = trpc.vodAnalysis.getAutomationStatus.useQuery(
    vodAnalysisId,
    {
      staleTime: 1000 * 10,
    }
  );
  const createCaptureJobMutation =
    trpc.vodAnalysis.createCaptureJob.useMutation({
      onSuccess: async () => {
        await utils.vodAnalysis.getAutomationStatus.invalidate(vodAnalysisId);
      },
    });
  const updateCaptureJobStatusMutation =
    trpc.vodAnalysis.updateCaptureJobStatus.useMutation({
      onMutate: () => {
        setCaptureJobStatusMessage(null);
      },
      onSuccess: async result => {
        await Promise.all([
          utils.vodAnalysis.getAutomationStatus.invalidate(vodAnalysisId),
          utils.vodAnalysis.getLatestCaptureJob.invalidate(vodAnalysisId),
          utils.vodAnalysis.listCaptureJobs.invalidate(vodAnalysisId),
        ]);
        setCaptureJobStatusMessage({
          type: "success",
          text: `Marked capture job ${result.id} ${result.update.status}.`,
        });
      },
      onError: error => {
        setCaptureJobStatusMessage({ type: "error", text: error.message });
      },
    });
  const mockAutomationMutation =
    trpc.vodAnalysis.runMockAutomationDetections.useMutation({
      onMutate: () => {
        setMockAutomationMessage(null);
      },
      onSuccess: async result => {
        await Promise.all([
          utils.vodAnalysis.listSuggestedEvents.invalidate(vodAnalysisId),
          utils.vodAnalysis.getAutomationStatus.invalidate(vodAnalysisId),
          utils.vodAnalysis.list.invalidate(),
        ]);
        setMockAutomationMessage({
          type: "success",
          text: `Created ${result.createdCount} pending mock suggestions.`,
        });
      },
      onError: error => {
        setMockAutomationMessage({ type: "error", text: error.message });
      },
    });
  const automationStatus = automationStatusQuery.data;
  const latestCaptureJob = automationStatus?.latestCaptureJob ?? null;
  const captureJobProgress = latestCaptureJob
    ? getVodCaptureJobProgress(latestCaptureJob)
    : null;
  const latestCaptureJobTone = latestCaptureJob
    ? getVodCaptureJobStatusTone(latestCaptureJob.status)
    : null;
  const captureJobDisabledReason = readiness.isReady ? null : readiness.reason;
  const sourceTypeLabel =
    vod.sourceType === "twitch" ||
    vod.sourceType === "youtube" ||
    vod.sourceType === "google_drive" ||
    vod.sourceType === "generic"
      ? formatVodSourceType(vod.sourceType)
      : "Unknown";

  return (
    <details className="group rounded-lg border border-neon-cyan/20 bg-black/30 p-5">
      <summary className="flex cursor-pointer list-none items-start justify-between gap-3">
        <div>
          <h3 className="font-mono text-lg font-bold uppercase tracking-widest text-neon-cyan">
            Automation Status
          </h3>
          <p className="mt-2 font-mono text-sm text-white/50">
            Frame scanning is not active yet. Future scanner output will enter
            this review queue as pending suggestions.
          </p>
        </div>
        <span className="rounded border border-white/10 px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-white/50">
          {formatCaptureReadinessLabel(readiness.status)}
        </span>
      </summary>

      <div className="mt-4 space-y-4 border-t border-white/10 pt-4">
        <div className="grid gap-2 sm:grid-cols-2">
          <DetailPill
            label="Status"
            value={formatCaptureReadinessLabel(readiness.status)}
          />
          <DetailPill label="Source type" value={sourceTypeLabel} />
          <DetailPill label="Duration" value={durationLabel} />
          <DetailPill
            label="Sample interval"
            value={`${samplePlan.intervalSeconds}s`}
          />
          <DetailPill
            label="Planned samples"
            value={String(samplePlan.timestamps.length)}
          />
        </div>

        <div className="rounded border border-white/10 bg-black/30 p-3">
          <div className="font-mono text-[10px] uppercase tracking-widest text-white/45">
            First 5 timestamps
          </div>
          {firstTimestamps.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {firstTimestamps.map(timestamp => (
                <span
                  key={timestamp}
                  className="rounded border border-neon-cyan/30 px-2 py-1 font-mono text-xs text-neon-cyan"
                >
                  {formatVodEventTimestamp(timestamp)}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-2 font-mono text-sm text-white/50">
              No timestamps planned until duration metadata is available.
            </p>
          )}
        </div>

        <div className="rounded border border-neon-magenta/30 bg-neon-magenta/10 p-3 font-mono text-sm text-white/70">
          Capture jobs plan frame-sampling work. Suggested events are the review
          queue output. Confirmed manual events are the approved output used by
          Team Summary and Team Insights.
        </div>

        {automationStatus ? (
          <div className="grid gap-2 sm:grid-cols-4">
            <DetailPill
              label="Pending suggestions"
              value={String(automationStatus.pendingSuggestedCount)}
            />
            <DetailPill
              label="Approved suggestions"
              value={String(automationStatus.approvedSuggestedCount)}
            />
            <DetailPill
              label="Rejected suggestions"
              value={String(automationStatus.rejectedSuggestedCount)}
            />
            <DetailPill
              label="Confirmed events"
              value={String(automationStatus.confirmedManualEventCount)}
            />
          </div>
        ) : null}

        {automationStatusQuery.isLoading ? (
          <div className="rounded border border-white/10 bg-black/30 p-3 font-mono text-sm text-white/50">
            Loading automation status…
          </div>
        ) : latestCaptureJob && captureJobProgress ? (
          <div className="rounded border border-white/10 bg-black/30 p-3">
            <div className="font-mono text-[10px] uppercase tracking-widest text-white/45">
              Latest capture job
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <DetailPill
                label="Status"
                value={formatVodCaptureJobStatus(latestCaptureJob.status)}
              />
              <DetailPill
                label="Status tone"
                value={latestCaptureJobTone ?? "neutral"}
              />
              <DetailPill label="Source" value={latestCaptureJob.source} />
              <DetailPill
                label="Planned samples"
                value={String(captureJobProgress.plannedSamples)}
              />
              <DetailPill
                label="Processed samples"
                value={String(captureJobProgress.processedSamples)}
              />
              <DetailPill
                label="Failed samples"
                value={String(captureJobProgress.failedSamples)}
              />
              <DetailPill
                label="Percent complete"
                value={`${captureJobProgress.percentComplete}%`}
              />
              <DetailPill
                label="Remaining samples"
                value={String(captureJobProgress.remainingSamples)}
              />
              <DetailPill
                label="Created"
                value={formatDateTime(latestCaptureJob.createdAt)}
              />
            </div>
            {latestCaptureJob.errorMessage ? (
              <p className="mt-3 rounded border border-red-500/40 bg-red-950/30 p-3 font-mono text-sm text-red-100">
                {latestCaptureJob.errorMessage}
              </p>
            ) : null}
            {import.meta.env.DEV ? (
              <div className="mt-3 rounded border border-neon-cyan/25 bg-neon-cyan/10 p-3">
                <div className="font-mono text-[10px] font-bold uppercase tracking-widest text-neon-cyan">
                  Dev capture lifecycle
                </div>
                <p className="mt-1 font-mono text-xs text-white/60">
                  Dev only. Simulates capture job lifecycle. No frames are
                  processed.
                </p>
                {captureJobStatusMessage ? (
                  <p
                    className={`mt-2 rounded border p-2 font-mono text-xs ${
                      captureJobStatusMessage.type === "success"
                        ? "border-neon-cyan/30 bg-neon-cyan/10 text-neon-cyan"
                        : "border-red-500/40 bg-red-950/30 text-red-100"
                    }`}
                  >
                    {captureJobStatusMessage.text}
                  </p>
                ) : null}
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {[
                    {
                      label: "Mark processing",
                      status: "processing" as const,
                      errorMessage: undefined,
                    },
                    {
                      label: "Mark complete",
                      status: "complete" as const,
                      errorMessage: undefined,
                    },
                    {
                      label: "Mark failed",
                      status: "failed" as const,
                      errorMessage: "Mock capture failure.",
                    },
                    {
                      label: "Cancel job",
                      status: "cancelled" as const,
                      errorMessage: undefined,
                    },
                  ].map(action => (
                    <button
                      key={action.status}
                      type="button"
                      onClick={() =>
                        updateCaptureJobStatusMutation.mutate({
                          id: latestCaptureJob.id,
                          vodAnalysisId,
                          status: action.status,
                          errorMessage: action.errorMessage,
                        })
                      }
                      disabled={updateCaptureJobStatusMutation.isPending}
                      className="rounded-sm border border-neon-cyan/60 px-3 py-2 font-mono text-xs font-bold uppercase tracking-widest text-neon-cyan transition hover:bg-neon-cyan/10 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="rounded border border-white/10 bg-black/30 p-3 font-mono text-sm text-white/50">
            No capture jobs have been recorded for this VOD yet.
          </div>
        )}

        {!readiness.isReady ? (
          <p className="rounded border border-neon-gold/30 bg-neon-gold/10 p-3 font-mono text-sm text-neon-gold">
            {readiness.reason}
          </p>
        ) : null}

        {createCaptureJobMutation.isError ? (
          <p className="rounded border border-red-500/40 bg-red-950/30 p-3 font-mono text-sm text-red-100">
            {createCaptureJobMutation.error.message}
          </p>
        ) : null}

        <button
          type="button"
          onClick={() =>
            createCaptureJobMutation.mutate({
              vodAnalysisId,
              source: "manual_debug",
            })
          }
          disabled={!readiness.isReady || createCaptureJobMutation.isPending}
          title={captureJobDisabledReason ?? undefined}
          className="w-full rounded-sm border-2 border-neon-cyan px-4 py-2 font-mono text-xs font-bold uppercase tracking-widest text-neon-cyan transition hover:bg-neon-cyan/10 hover-glow-cyan disabled:cursor-not-allowed disabled:border-white/15 disabled:text-white/35 disabled:hover:bg-transparent"
        >
          {createCaptureJobMutation.isPending
            ? "Queueing capture job…"
            : "Queue capture job"}
        </button>
        <p className="font-mono text-xs text-white/45">
          This records planned sampling work. Actual frame processing will be
          added later.
        </p>
        {captureJobDisabledReason ? (
          <p className="font-mono text-xs text-white/45">
            Capture job creation is disabled: {captureJobDisabledReason}
          </p>
        ) : null}

        {import.meta.env.DEV ? (
          <div className="rounded border border-neon-gold/30 bg-neon-gold/10 p-3">
            <div className="font-mono text-[10px] font-bold uppercase tracking-widest text-neon-gold">
              Dev mock automation
            </div>
            <p className="mt-1 font-mono text-xs text-white/60">
              Dev only. Creates deterministic pending suggestions. No video
              frames are scanned.
            </p>
            {!latestCaptureJob ? (
              <p className="mt-2 font-mono text-xs text-white/45">
                Queue a capture job first.
              </p>
            ) : null}
            {mockAutomationMessage ? (
              <p
                className={`mt-2 rounded border p-2 font-mono text-xs ${
                  mockAutomationMessage.type === "success"
                    ? "border-neon-cyan/30 bg-neon-cyan/10 text-neon-cyan"
                    : "border-red-500/40 bg-red-950/30 text-red-100"
                }`}
              >
                {mockAutomationMessage.text}
              </p>
            ) : null}
            <button
              type="button"
              onClick={() => {
                if (!latestCaptureJob) return;
                mockAutomationMutation.mutate({
                  vodAnalysisId,
                  captureJobId: latestCaptureJob.id,
                });
              }}
              disabled={!latestCaptureJob || mockAutomationMutation.isPending}
              className="mt-3 rounded-sm border border-neon-gold/70 px-3 py-2 font-mono text-xs font-bold uppercase tracking-widest text-neon-gold transition hover:bg-neon-gold/10 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {mockAutomationMutation.isPending
                ? "Running mock automation…"
                : "Run mock automation detections"}
            </button>
          </div>
        ) : null}
      </div>
    </details>
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
  const [editingEventId, setEditingEventId] = useState<number | null>(null);
  const [deletingEventId, setDeletingEventId] = useState<number | null>(null);
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [suggestedEventsOpen, setSuggestedEventsOpen] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return (
      new URLSearchParams(window.location.search).get("review") ===
      "suggestions"
    );
  });
  const [activeSuggestedEventId, setActiveSuggestedEventId] = useState<
    number | null
  >(null);
  const [suggestedEventError, setSuggestedEventError] = useState<string | null>(
    null
  );
  const [suggestedEventActionError, setSuggestedEventActionError] = useState<{
    id: number;
    message: string;
  } | null>(null);
  const [editingSuggestedEvent, setEditingSuggestedEvent] =
    useState<SuggestedEventEditState | null>(null);
  const [suggestedEventEditError, setSuggestedEventEditError] = useState<{
    id: number;
    message: string;
  } | null>(null);
  const [suggestedEventFilter, setSuggestedEventFilter] =
    useState<SuggestedEventFilter | null>(null);
  const [metadataRefreshMessage, setMetadataRefreshMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [eventFilter, setEventFilter] = useState<EventFilter>("all");
  const [teamFilter, setTeamFilter] = useState<string | null>(null);

  const query = trpc.vodAnalysis.getById.useQuery(vodAnalysisId, {
    enabled: isValidId,
    staleTime: 1000 * 30,
  });
  const eventsQuery = trpc.vodAnalysis.listEvents.useQuery(vodAnalysisId, {
    enabled: isValidId,
    staleTime: 1000 * 10,
  });
  const suggestedEventsQuery = trpc.vodAnalysis.listSuggestedEvents.useQuery(
    vodAnalysisId,
    {
      enabled: isValidId,
      staleTime: 1000 * 10,
    }
  );
  const automationStatusQuery = trpc.vodAnalysis.getAutomationStatus.useQuery(
    vodAnalysisId,
    {
      enabled: isValidId,
      staleTime: 1000 * 10,
    }
  );

  const refreshSuggestedEventReview = async () => {
    await Promise.all([
      utils.vodAnalysis.listSuggestedEvents.invalidate(vodAnalysisId),
      utils.vodAnalysis.listEvents.invalidate(vodAnalysisId),
      utils.vodAnalysis.getAutomationStatus.invalidate(vodAnalysisId),
    ]);
  };

  const resetEventForm = () => {
    setSelectedEventType("death");
    setTimestampInput("");
    setActorLabel("");
    setTargetLabel("");
    setTeamLabel("");
    setEventErrors({});
    setEditingEventId(null);
  };

  const createEventMutation = trpc.vodAnalysis.createEvent.useMutation({
    onSuccess: async () => {
      resetEventForm();
      await Promise.all([
        utils.vodAnalysis.listEvents.invalidate(vodAnalysisId),
        utils.vodAnalysis.getAutomationStatus.invalidate(vodAnalysisId),
      ]);
    },
    onError: error => {
      setEventErrors({ form: error.message });
    },
  });

  const updateEventMutation = trpc.vodAnalysis.updateEvent.useMutation({
    onSuccess: async () => {
      resetEventForm();
      await Promise.all([
        utils.vodAnalysis.listEvents.invalidate(vodAnalysisId),
        utils.vodAnalysis.getAutomationStatus.invalidate(vodAnalysisId),
      ]);
    },
    onError: error => {
      setEventErrors({ form: error.message });
    },
  });

  const deleteEventMutation = trpc.vodAnalysis.deleteEvent.useMutation({
    onMutate: input => {
      setDeletingEventId(input.id);
      setEventErrors({});
    },
    onSuccess: async deletedEvent => {
      if (editingEventId === deletedEvent.id) {
        resetEventForm();
      }
      await Promise.all([
        utils.vodAnalysis.listEvents.invalidate(vodAnalysisId),
        utils.vodAnalysis.getAutomationStatus.invalidate(vodAnalysisId),
      ]);
    },
    onError: error => {
      setEventErrors({ form: error.message });
    },
    onSettled: () => {
      setDeletingEventId(null);
    },
  });

  const createSuggestedEventMutation =
    trpc.vodAnalysis.createSuggestedEvent.useMutation({
      onSuccess: async () => {
        setSuggestedEventError(null);
        setSuggestedEventActionError(null);
        setSuggestedEventsOpen(true);
        await Promise.all([
          utils.vodAnalysis.listSuggestedEvents.invalidate(vodAnalysisId),
          utils.vodAnalysis.getAutomationStatus.invalidate(vodAnalysisId),
        ]);
      },
      onError: error => {
        setSuggestedEventError(error.message);
      },
    });

  const refreshTwitchMetadataMutation =
    trpc.vodAnalysis.refreshTwitchMetadata.useMutation({
      onMutate: () => {
        setMetadataRefreshMessage(null);
      },
      onSuccess: async result => {
        if (result.status === "updated") {
          setMetadataRefreshMessage({
            type: "success",
            text: "Twitch metadata refreshed.",
          });
          await Promise.all([
            utils.vodAnalysis.getById.invalidate(vodAnalysisId),
            utils.vodAnalysis.list.invalidate(),
          ]);
          return;
        }

        const messages: Record<typeof result.status, string> = {
          credentials_missing:
            "Twitch credentials are not configured on the server.",
          not_twitch: "This VOD is not a Twitch VOD.",
          not_found: "Twitch metadata was not found for this VOD.",
          fetch_failed:
            "Twitch metadata could not be refreshed right now. Please try again later.",
        };

        setMetadataRefreshMessage({
          type: "error",
          text: messages[result.status],
        });
      },
      onError: error => {
        setMetadataRefreshMessage({ type: "error", text: error.message });
      },
    });

  const approveSuggestedEventMutation =
    trpc.vodAnalysis.approveSuggestedEvent.useMutation({
      onMutate: id => {
        setActiveSuggestedEventId(id);
        setSuggestedEventError(null);
        setSuggestedEventActionError(null);
      },
      onSuccess: async () => {
        setSuggestedEventActionError(null);
        await refreshSuggestedEventReview();
      },
      onError: (error, id) => {
        setSuggestedEventActionError({ id, message: error.message });
      },
      onSettled: () => {
        setActiveSuggestedEventId(null);
      },
    });

  const rejectSuggestedEventMutation =
    trpc.vodAnalysis.rejectSuggestedEvent.useMutation({
      onMutate: id => {
        setActiveSuggestedEventId(id);
        setSuggestedEventError(null);
        setSuggestedEventActionError(null);
      },
      onSuccess: async () => {
        setSuggestedEventActionError(null);
        await refreshSuggestedEventReview();
      },
      onError: (error, id) => {
        setSuggestedEventActionError({ id, message: error.message });
      },
      onSettled: () => {
        setActiveSuggestedEventId(null);
      },
    });

  const updateSuggestedEventMutation =
    trpc.vodAnalysis.updateSuggestedEvent.useMutation({
      onMutate: input => {
        setActiveSuggestedEventId(input.id);
        setSuggestedEventError(null);
        setSuggestedEventActionError(null);
        setSuggestedEventEditError(null);
      },
      onSuccess: async () => {
        setEditingSuggestedEvent(null);
        setSuggestedEventEditError(null);
        await Promise.all([
          utils.vodAnalysis.listSuggestedEvents.invalidate(vodAnalysisId),
          utils.vodAnalysis.getAutomationStatus.invalidate(vodAnalysisId),
        ]);
      },
      onError: (error, input) => {
        setSuggestedEventEditError({ id: input.id, message: error.message });
      },
      onSettled: () => {
        setActiveSuggestedEventId(null);
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

  const isEditingEvent = editingEventId !== null;
  const isEventSubmitPending =
    createEventMutation.isPending || updateEventMutation.isPending;
  const isSubmitDisabled =
    isEventSubmitPending || Object.keys(currentFormErrors).length > 0;

  const vod = query.data;
  const durationLabel = vod ? formatDuration(vod.durationSeconds) : null;
  const showTwitchMetadataRefresh = vod?.sourceType === "twitch";
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
  const parentHostname =
    typeof window === "undefined" ? null : window.location.hostname;
  const embedConfig = vod
    ? buildVodEmbedConfig(
        {
          sourceType: vod.sourceType,
          sourceId: vod.sourceId,
          sourceRef: vod.sourceRef,
          normalizedSourceUrl: vod.normalizedSourceUrl,
          sourceUrl: vod.sourceUrl,
        },
        { parentHostname }
      )
    : null;
  const events = eventsQuery.data ?? [];
  const automationStatus = automationStatusQuery.data;
  const suggestedEvents = suggestedEventsQuery.data ?? [];
  const suggestedEventCounts: Record<SuggestedEventStatus, number> = {
    pending: 0,
    approved: 0,
    rejected: 0,
  };

  for (const suggestion of suggestedEvents) {
    suggestedEventCounts[suggestion.status] += 1;
  }

  const pendingSuggestedEventCount = suggestedEventCounts.pending;
  const activeSuggestedEventFilter =
    suggestedEventFilter ??
    (pendingSuggestedEventCount > 0 ? "pending" : "all");
  const visibleSuggestedEvents = suggestedEvents.filter(
    suggestion =>
      activeSuggestedEventFilter === "all" ||
      suggestion.status === activeSuggestedEventFilter
  );
  const teamSummaries = useMemo(() => buildVodTeamSummaries(events), [events]);
  const labelSuggestions = useMemo(
    () => getVodEventLabelSuggestions(events),
    [events]
  );
  const teamLabelWarnings = useMemo(
    () => getVodTeamLabelWarnings(events),
    [events]
  );
  const savedTeamLabels = useMemo(() => {
    const labelsByNormalizedKey = new Map<string, string>();

    for (const event of events) {
      const label = event.teamLabel?.trim();
      if (!label) continue;

      const normalizedKey = normalizeVodLabelKey(label);
      if (!labelsByNormalizedKey.has(normalizedKey)) {
        labelsByNormalizedKey.set(normalizedKey, label);
      }
    }

    return Array.from(labelsByNormalizedKey.entries())
      .sort((left, right) => left[0].localeCompare(right[0]))
      .map(([, label]) => label);
  }, [events]);
  const teamLabeledEventCount = useMemo(
    () => events.filter(event => event.teamLabel?.trim()).length,
    [events]
  );
  const filteredEvents = events.filter(event => {
    const matchesEventType =
      eventFilter === "all" || event.eventType === eventFilter;
    const matchesTeam =
      teamFilter === null ||
      normalizeVodLabelKey(event.teamLabel ?? "") ===
        normalizeVodLabelKey(teamFilter);

    return matchesEventType && matchesTeam;
  });

  const handleTimestampNudge = (deltaSeconds: number) => {
    const currentTimestamp = parseVodEventTimestamp(timestampInput) ?? 0;
    const nextTimestamp = Math.max(0, currentTimestamp + deltaSeconds);
    setTimestampInput(formatVodEventTimestamp(nextTimestamp));
  };

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

  const validateEventForm = () => {
    setEventErrors(currentFormErrors);
    return Object.keys(currentFormErrors).length === 0;
  };

  const handleEventSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validateEventForm() || parsedTimestamp === null) return;

    const eventPayload = {
      vodAnalysisId,
      eventType: selectedEventType,
      timestampSeconds: parsedTimestamp,
      actorLabel: requiredFields.includes("actorLabel") ? actorLabel : "",
      targetLabel: requiredFields.includes("targetLabel") ? targetLabel : "",
      teamLabel,
    };

    if (editingEventId !== null) {
      updateEventMutation.mutate({
        id: editingEventId,
        ...eventPayload,
      });
      return;
    }

    createEventMutation.mutate(eventPayload);
  };

  const handleEditEvent = (event: {
    id: number;
    eventType: VodAnalysisEventType;
    timestampSeconds: number;
    actorLabel: string | null;
    targetLabel: string | null;
    teamLabel: string | null;
  }) => {
    setEditingEventId(event.id);
    setSelectedEventType(event.eventType);
    setTimestampInput(formatVodEventTimestamp(event.timestampSeconds));
    setActorLabel(event.actorLabel ?? "");
    setTargetLabel(event.targetLabel ?? "");
    setTeamLabel(event.teamLabel ?? "");
    setEventErrors({});
  };

  const handleDeleteEvent = (event: { id: number }) => {
    const confirmed = window.confirm(
      "Delete this manual VOD event? Team Summary and Team Insights will update after it is removed."
    );

    if (!confirmed) return;

    deleteEventMutation.mutate({
      id: event.id,
      vodAnalysisId,
    });
  };

  const handleCreateTestSuggestion = () => {
    createSuggestedEventMutation.mutate({
      vodAnalysisId,
      eventType: "death",
      timestampSeconds: Math.max(
        0,
        events.length * 15 + suggestedEvents.length
      ),
      actorLabel: "Test Eliminator",
      targetLabel: "Test Contestant",
      teamLabel: "Test Team",
      source: "manual_test",
      confidence: 75,
      metadata: { note: "Development-only suggested event seed." },
    });
  };

  const startSuggestedEventEdit = (suggestion: {
    id: number;
    eventType: VodAnalysisEventType;
    timestampSeconds: number;
    actorLabel: string | null;
    targetLabel: string | null;
    teamLabel: string | null;
    confidence: number | null;
  }) => {
    setEditingSuggestedEvent({
      id: suggestion.id,
      eventType: suggestion.eventType,
      timestampInput: formatVodEventTimestamp(suggestion.timestampSeconds),
      actorLabel: suggestion.actorLabel ?? "",
      targetLabel: suggestion.targetLabel ?? "",
      teamLabel: suggestion.teamLabel ?? "",
      confidence: suggestion.confidence,
    });
    setSuggestedEventEditError(null);
    setSuggestedEventActionError(null);
  };

  const updateSuggestedEventEdit = (
    updates: Partial<Omit<SuggestedEventEditState, "id">>
  ) => {
    setEditingSuggestedEvent(current =>
      current ? { ...current, ...updates } : current
    );
  };

  const getSuggestedEventEditErrors = (edit: SuggestedEventEditState) => {
    const nextErrors: EventFormErrors = {};
    const editRequiredFields =
      VOD_ANALYSIS_EVENT_REQUIRED_FIELDS[edit.eventType];
    const editTimestamp = parseVodEventTimestamp(edit.timestampInput);

    if (!edit.timestampInput.trim()) {
      nextErrors.timestamp = "Timestamp is required.";
    } else if (editTimestamp === null) {
      nextErrors.timestamp = "Use whole seconds or m:ss format.";
    }

    if (editRequiredFields.includes("actorLabel") && !edit.actorLabel.trim()) {
      nextErrors.actorLabel = "Actor is required for this event type.";
    }

    if (
      editRequiredFields.includes("targetLabel") &&
      !edit.targetLabel.trim()
    ) {
      nextErrors.targetLabel = "Target is required for this event type.";
    }

    if (editRequiredFields.includes("teamLabel") && !edit.teamLabel.trim()) {
      nextErrors.teamLabel = "Team is required for this event type.";
    }

    return { errors: nextErrors, timestampSeconds: editTimestamp };
  };

  const handleSuggestedEventEditSubmit = (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    if (!editingSuggestedEvent) return;

    const { errors, timestampSeconds } = getSuggestedEventEditErrors(
      editingSuggestedEvent
    );

    if (Object.keys(errors).length > 0 || timestampSeconds === null) {
      setSuggestedEventEditError({
        id: editingSuggestedEvent.id,
        message: Object.values(errors)[0] ?? "Correct the highlighted fields.",
      });
      return;
    }

    const editRequiredFields =
      VOD_ANALYSIS_EVENT_REQUIRED_FIELDS[editingSuggestedEvent.eventType];

    updateSuggestedEventMutation.mutate({
      id: editingSuggestedEvent.id,
      eventType: editingSuggestedEvent.eventType,
      timestampSeconds,
      actorLabel: editRequiredFields.includes("actorLabel")
        ? editingSuggestedEvent.actorLabel
        : "",
      targetLabel: editRequiredFields.includes("targetLabel")
        ? editingSuggestedEvent.targetLabel
        : "",
      teamLabel: editRequiredFields.includes("teamLabel")
        ? editingSuggestedEvent.teamLabel
        : "",
      confidence: editingSuggestedEvent.confidence,
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
    const isTeamSelector =
      field === "teamLabel" ||
      (field === "actorLabel" && selectedEventType === "team_wipe");
    const suggestions =
      field === "actorLabel"
        ? labelSuggestions.actors
        : field === "targetLabel"
          ? labelSuggestions.targets
          : [];
    const datalistId = `vod-${selectedEventType}-${field}-suggestions`;
    const targetKind = getVodEventTargetKind(selectedEventType);
    const objectiveOptions =
      field === "targetLabel" && targetKind === "cashout"
        ? VOD_CASHOUT_LABELS
        : field === "targetLabel" && targetKind === "vault"
          ? VOD_VAULT_LABELS
          : null;
    const teamOptions = isTeamSelector ? buildVodTeamLabelOptions([value]) : [];

    return (
      <label className="block" key={field}>
        <span className="font-mono text-xs uppercase tracking-widest text-white/60">
          {helper}{" "}
          {isRequired ? <span className="text-neon-gold">*</span> : null}
        </span>
        {objectiveOptions ? (
          <select
            value={
              (objectiveOptions as readonly string[]).includes(value)
                ? value
                : ""
            }
            onChange={event => setValue(event.target.value)}
            className="mt-2 w-full rounded border border-white/15 bg-black/40 px-3 py-2 font-mono text-sm text-white outline-none transition focus:border-neon-cyan"
          >
            <option value="">
              Select {targetKind === "cashout" ? "cashout" : "vault"}
            </option>
            {objectiveOptions.map(option => (
              <option key={option} value={option}>
                {targetKind === "cashout" ? "Cashout" : "Vault"} {option}
              </option>
            ))}
          </select>
        ) : isTeamSelector ? (
          <select
            value={teamOptions.includes(value) ? value : ""}
            onChange={event => setValue(event.target.value)}
            className="mt-2 w-full rounded border border-white/15 bg-black/40 px-3 py-2 font-mono text-sm text-white outline-none transition focus:border-neon-cyan"
          >
            <option value="">Select team</option>
            {teamOptions.map(option => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        ) : (
          <>
            <input
              value={value}
              onChange={event => setValue(event.target.value)}
              placeholder={eventFieldLabels[field]}
              list={datalistId}
              className="mt-2 w-full rounded border border-white/15 bg-black/40 px-3 py-2 font-mono text-sm text-white outline-none transition focus:border-neon-cyan"
            />
            <datalist id={datalistId}>
              {suggestions.map(suggestion => (
                <option key={suggestion} value={suggestion} />
              ))}
            </datalist>
          </>
        )}
        {!objectiveOptions && !isTeamSelector && suggestions.length > 0 ? (
          <div className="mt-2 flex max-h-16 flex-wrap gap-1 overflow-hidden">
            {suggestions.slice(0, 4).map(suggestion => (
              <button
                key={suggestion}
                type="button"
                onClick={() => setValue(suggestion)}
                className="rounded-full border border-white/15 px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-white/55 transition hover:border-neon-cyan hover:text-neon-cyan"
              >
                {suggestion}
              </button>
            ))}
          </div>
        ) : null}
        {eventErrors[field] ? (
          <span className="mt-1 block font-mono text-xs text-red-300">
            {eventErrors[field]}
          </span>
        ) : null}
      </label>
    );
  };

  const renderSuggestedEventEditInput = (
    edit: SuggestedEventEditState,
    field: "actorLabel" | "targetLabel" | "teamLabel",
    errors: EventFormErrors
  ) => {
    const editRequiredFields =
      VOD_ANALYSIS_EVENT_REQUIRED_FIELDS[edit.eventType];
    const value = edit[field];
    const helper =
      eventFieldHelp[edit.eventType][field] ?? eventFieldLabels[field];
    const isRequired = editRequiredFields.includes(field);
    const isTeamSelector =
      field === "teamLabel" ||
      (field === "actorLabel" && edit.eventType === "team_wipe");
    const targetKind = getVodEventTargetKind(edit.eventType);
    const objectiveOptions =
      field === "targetLabel" && targetKind === "cashout"
        ? VOD_CASHOUT_LABELS
        : field === "targetLabel" && targetKind === "vault"
          ? VOD_VAULT_LABELS
          : null;
    const suggestions =
      field === "actorLabel"
        ? labelSuggestions.actors
        : field === "targetLabel"
          ? labelSuggestions.targets
          : [];
    const datalistId = `suggested-${edit.id}-${edit.eventType}-${field}`;
    const teamOptions = isTeamSelector
      ? buildVodTeamLabelOptions([value, ...labelSuggestions.teams])
      : [];
    const setValue = (nextValue: string) =>
      updateSuggestedEventEdit({ [field]: nextValue });

    return (
      <label key={field} className="block">
        <span className="font-mono text-[10px] uppercase tracking-widest text-white/55">
          {helper}{" "}
          {isRequired ? <span className="text-neon-gold">*</span> : null}
        </span>
        {objectiveOptions ? (
          <select
            value={
              (objectiveOptions as readonly string[]).includes(value)
                ? value
                : ""
            }
            onChange={event => setValue(event.target.value)}
            className="mt-1 w-full rounded border border-white/15 bg-black/45 px-2 py-2 font-mono text-xs text-white outline-none transition focus:border-neon-cyan"
          >
            <option value="">
              Select {targetKind === "cashout" ? "cashout" : "vault"}
            </option>
            {objectiveOptions.map(option => (
              <option key={option} value={option}>
                {targetKind === "cashout" ? "Cashout" : "Vault"} {option}
              </option>
            ))}
          </select>
        ) : isTeamSelector ? (
          <select
            value={teamOptions.includes(value) ? value : ""}
            onChange={event => setValue(event.target.value)}
            className="mt-1 w-full rounded border border-white/15 bg-black/45 px-2 py-2 font-mono text-xs text-white outline-none transition focus:border-neon-cyan"
          >
            <option value="">Select team</option>
            {teamOptions.map(option => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        ) : (
          <>
            <input
              value={value}
              onChange={event => setValue(event.target.value)}
              placeholder={eventFieldLabels[field]}
              list={datalistId}
              className="mt-1 w-full rounded border border-white/15 bg-black/45 px-2 py-2 font-mono text-xs text-white outline-none transition focus:border-neon-cyan"
            />
            <datalist id={datalistId}>
              {suggestions.map(suggestion => (
                <option key={suggestion} value={suggestion} />
              ))}
            </datalist>
          </>
        )}
        {errors[field] ? (
          <span className="mt-1 block font-mono text-[10px] text-red-300">
            {errors[field]}
          </span>
        ) : null}
      </label>
    );
  };

  const renderSuggestedEventEditor = (edit: SuggestedEventEditState) => {
    const editRequiredFields =
      VOD_ANALYSIS_EVENT_REQUIRED_FIELDS[edit.eventType];
    const { errors } = getSuggestedEventEditErrors(edit);
    const isSavingEdit =
      activeSuggestedEventId === edit.id &&
      updateSuggestedEventMutation.isPending;

    return (
      <form
        onSubmit={handleSuggestedEventEditSubmit}
        className="mt-4 space-y-3 rounded border border-neon-cyan/25 bg-black/30 p-3"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-mono text-xs font-bold uppercase tracking-widest text-neon-cyan">
            Correct suggestion
          </span>
          <button
            type="button"
            onClick={() => {
              setEditingSuggestedEvent(null);
              setSuggestedEventEditError(null);
            }}
            className="font-mono text-[10px] font-bold uppercase tracking-widest text-white/55 transition hover:text-neon-cyan"
          >
            Cancel
          </button>
        </div>

        <div className="grid gap-3 md:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]">
          <label className="block">
            <span className="font-mono text-[10px] uppercase tracking-widest text-white/55">
              Event Type *
            </span>
            <select
              value={edit.eventType}
              onChange={event => {
                const nextEventType = event.target
                  .value as VodAnalysisEventType;
                const nextRequiredFields =
                  VOD_ANALYSIS_EVENT_REQUIRED_FIELDS[nextEventType];
                updateSuggestedEventEdit({
                  eventType: nextEventType,
                  actorLabel: nextRequiredFields.includes("actorLabel")
                    ? edit.actorLabel
                    : "",
                  targetLabel: nextRequiredFields.includes("targetLabel")
                    ? edit.targetLabel
                    : "",
                  teamLabel: nextRequiredFields.includes("teamLabel")
                    ? edit.teamLabel
                    : "",
                });
              }}
              className="mt-1 w-full rounded border border-white/15 bg-black/45 px-2 py-2 font-mono text-xs text-white outline-none transition focus:border-neon-cyan"
            >
              {VOD_ANALYSIS_EVENT_TYPES.map(eventType => (
                <option key={eventType} value={eventType}>
                  {VOD_ANALYSIS_EVENT_LABELS[eventType]}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="font-mono text-[10px] uppercase tracking-widest text-white/55">
              Timestamp *
            </span>
            <input
              value={edit.timestampInput}
              onChange={event =>
                updateSuggestedEventEdit({ timestampInput: event.target.value })
              }
              placeholder="90 or 1:30"
              className="mt-1 w-full rounded border border-white/15 bg-black/45 px-2 py-2 font-mono text-xs text-white outline-none transition focus:border-neon-cyan"
            />
            {errors.timestamp ? (
              <span className="mt-1 block font-mono text-[10px] text-red-300">
                {errors.timestamp}
              </span>
            ) : null}
          </label>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {editRequiredFields.includes("actorLabel")
            ? renderSuggestedEventEditInput(edit, "actorLabel", errors)
            : null}
          {editRequiredFields.includes("targetLabel")
            ? renderSuggestedEventEditInput(edit, "targetLabel", errors)
            : null}
          {editRequiredFields.includes("teamLabel")
            ? renderSuggestedEventEditInput(edit, "teamLabel", errors)
            : null}
        </div>

        {suggestedEventEditError?.id === edit.id ? (
          <div className="rounded border border-red-500/40 bg-red-950/30 p-2 font-mono text-xs text-red-100">
            {suggestedEventEditError.message}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={isSavingEdit || Object.keys(errors).length > 0}
            className="rounded-sm border border-neon-gold/70 px-3 py-2 font-mono text-xs font-bold uppercase tracking-widest text-neon-gold transition hover:bg-neon-gold/10 disabled:cursor-not-allowed disabled:opacity-35"
          >
            {isSavingEdit ? "Saving…" : "Save correction"}
          </button>
          <button
            type="button"
            onClick={() => {
              setEditingSuggestedEvent(null);
              setSuggestedEventEditError(null);
            }}
            className="rounded-sm border border-white/20 px-3 py-2 font-mono text-xs font-bold uppercase tracking-widest text-white/65 transition hover:border-neon-cyan hover:text-neon-cyan"
          >
            Cancel
          </button>
        </div>
      </form>
    );
  };

  const renderManualEventCard = () => (
    <NeonCard variant="cyan" className="h-full">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-mono text-xl font-bold uppercase text-neon-cyan">
            {isEditingEvent ? "Edit Manual Event" : "Manual Event"}
          </h2>
          <p className="mt-1 font-mono text-xs uppercase tracking-widest text-white/45">
            Review station logger. No event-level POV required.
          </p>
          {isEditingEvent ? (
            <p className="mt-1 font-mono text-xs uppercase tracking-widest text-neon-gold">
              Editing event #{editingEventId}. Submit to save changes.
            </p>
          ) : null}
        </div>
        {isEditingEvent ? (
          <button
            type="button"
            onClick={resetEventForm}
            className="rounded-sm border border-white/20 px-3 py-2 font-mono text-xs font-bold uppercase tracking-widest text-white/65 transition hover:border-neon-cyan hover:text-neon-cyan"
          >
            Cancel edit
          </button>
        ) : null}
      </div>
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
                  setTargetLabel("");
                  setActorLabel(currentActorLabel =>
                    VOD_ANALYSIS_EVENT_REQUIRED_FIELDS[eventType].includes(
                      "actorLabel"
                    )
                      ? currentActorLabel
                      : ""
                  );
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
            onChange={event => setTimestampInput(event.target.value)}
            placeholder="90 or 1:30"
            className="mt-2 w-full rounded border border-white/15 bg-black/40 px-3 py-2 font-mono text-sm text-white outline-none transition focus:border-neon-cyan"
          />
          <div className="mt-2 flex flex-wrap gap-2">
            {[-10, -5, 5, 10].map(deltaSeconds => (
              <button
                key={deltaSeconds}
                type="button"
                onClick={() => handleTimestampNudge(deltaSeconds)}
                className="rounded-sm border border-white/15 px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-white/60 transition hover:border-neon-cyan hover:text-neon-cyan"
              >
                {deltaSeconds > 0 ? `+${deltaSeconds}s` : `${deltaSeconds}s`}
              </button>
            ))}
          </div>
          {eventErrors.timestamp ? (
            <span className="mt-1 block font-mono text-xs text-red-300">
              {eventErrors.timestamp}
            </span>
          ) : (
            <span className="mt-1 block font-mono text-xs text-white/35">
              Use whole seconds or m:ss. Nudge controls snap to m:ss.
            </span>
          )}
        </label>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          {requiredFields.includes("actorLabel")
            ? renderEventInput("actorLabel")
            : null}
          {requiredFields.includes("targetLabel")
            ? renderEventInput("targetLabel")
            : null}
          {renderEventInput("teamLabel")}
        </div>

        {eventErrors.form ? (
          <div className="rounded border border-red-500/40 bg-red-950/30 p-3 font-mono text-sm text-red-100">
            {eventErrors.form}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={isSubmitDisabled}
            className="rounded-sm border-2 border-neon-gold px-5 py-2 font-mono text-sm font-bold uppercase tracking-widest text-neon-gold transition-all hover:bg-neon-gold/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isEventSubmitPending
              ? "Saving…"
              : isEditingEvent
                ? "Save Event"
                : "Add Event"}
          </button>
          {isEditingEvent ? (
            <button
              type="button"
              onClick={resetEventForm}
              className="rounded-sm border border-white/20 px-4 py-2 font-mono text-xs font-bold uppercase tracking-widest text-white/65 transition hover:border-neon-cyan hover:text-neon-cyan"
            >
              Clear edit
            </button>
          ) : null}
        </div>
      </form>
    </NeonCard>
  );

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

                  <div className="mt-6 flex flex-wrap items-center gap-3">
                    {sourceHref ? (
                      <a
                        href={sourceHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block rounded-sm border-2 border-neon-cyan px-5 py-2 font-mono text-sm font-bold uppercase tracking-widest text-neon-cyan transition-all hover:bg-neon-cyan/10 hover-glow-cyan"
                      >
                        Open source
                      </a>
                    ) : null}
                    {showTwitchMetadataRefresh ? (
                      <button
                        type="button"
                        onClick={() =>
                          refreshTwitchMetadataMutation.mutate(vodAnalysisId)
                        }
                        disabled={refreshTwitchMetadataMutation.isPending}
                        className="rounded-sm border border-white/20 px-4 py-2 font-mono text-xs font-bold uppercase tracking-widest text-white/70 transition hover:border-neon-magenta hover:text-neon-magenta disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {refreshTwitchMetadataMutation.isPending
                          ? "Refreshing…"
                          : "Refresh Twitch metadata"}
                      </button>
                    ) : null}
                  </div>

                  {metadataRefreshMessage ? (
                    <div
                      className={`mt-4 rounded border p-3 font-mono text-sm ${
                        metadataRefreshMessage.type === "success"
                          ? "border-emerald-500/40 bg-emerald-950/30 text-emerald-100"
                          : "border-red-500/40 bg-red-950/30 text-red-100"
                      }`}
                    >
                      {metadataRefreshMessage.text}
                    </div>
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

            {embedConfig ? (
              <section className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)] lg:items-stretch">
                <ReviewPlayerSection
                  embedConfig={embedConfig}
                  sourceHref={sourceHref}
                  durationLabel={durationLabel}
                />
                {renderManualEventCard()}
              </section>
            ) : null}

            <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="space-y-4 lg:col-span-2">
                <NeonCard variant="cyan">
                  <button
                    type="button"
                    onClick={() => setSuggestedEventsOpen(open => !open)}
                    className="flex w-full items-center justify-between gap-4 text-left"
                  >
                    <span>
                      <span className="block font-mono text-xl font-bold uppercase text-neon-cyan">
                        Automation Suggestions
                      </span>
                      <span className="mt-1 block font-mono text-xs uppercase tracking-widest text-white/45">
                        {suggestedEvents.length} loaded •{" "}
                        {automationStatus?.pendingSuggestedCount ??
                          pendingSuggestedEventCount}{" "}
                        pending •{" "}
                        {automationStatus?.approvedSuggestedCount ??
                          suggestedEventCounts.approved}{" "}
                        approved •{" "}
                        {automationStatus?.rejectedSuggestedCount ??
                          suggestedEventCounts.rejected}{" "}
                        rejected
                      </span>
                    </span>
                    <span className="font-mono text-sm uppercase tracking-widest text-neon-cyan">
                      {suggestedEventsOpen ? "Collapse" : "Expand"}
                    </span>
                  </button>

                  <div className="mt-3 space-y-2 font-mono text-sm text-white/65">
                    <p>
                      Frame scanning is not active yet. Future scanner output
                      will enter this review queue as pending suggestions.
                    </p>
                    <p className="rounded border border-neon-magenta/25 bg-neon-magenta/10 p-3 text-xs text-white/60">
                      Capture jobs plan frame-sampling work; suggested events
                      are the review queue output; approved suggestions create
                      confirmed manual events for Team Summary and Team
                      Insights.
                    </p>
                  </div>

                  {import.meta.env.DEV ? (
                    <div className="mt-4 rounded border border-neon-gold/30 bg-neon-gold/10 p-3">
                      <div className="font-mono text-[10px] font-bold uppercase tracking-widest text-neon-gold">
                        Dev only suggestion seed
                      </div>
                      <p className="mt-1 font-mono text-xs text-white/55">
                        Hidden outside local development so the public review
                        queue does not expose test tooling.
                      </p>
                      <button
                        type="button"
                        onClick={handleCreateTestSuggestion}
                        disabled={createSuggestedEventMutation.isPending}
                        className="mt-3 rounded-sm border border-neon-gold/70 px-3 py-2 font-mono text-xs font-bold uppercase tracking-widest text-neon-gold transition hover:bg-neon-gold/10 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {createSuggestedEventMutation.isPending
                          ? "Creating…"
                          : "Create dev test suggestion"}
                      </button>
                    </div>
                  ) : null}

                  {suggestedEventError ? (
                    <div className="mt-4 rounded border border-red-500/40 bg-red-950/30 p-3 font-mono text-sm text-red-100">
                      {suggestedEventError}
                    </div>
                  ) : null}

                  {suggestedEventsOpen ? (
                    <div className="mt-5 space-y-4">
                      <div className="flex flex-wrap items-center gap-2">
                        {SUGGESTED_EVENT_FILTERS.map(filter => {
                          const count =
                            filter === "all"
                              ? suggestedEvents.length
                              : suggestedEventCounts[filter];
                          const isActive =
                            filter === activeSuggestedEventFilter;

                          return (
                            <button
                              key={filter}
                              type="button"
                              onClick={() => setSuggestedEventFilter(filter)}
                              className={`rounded-full border px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-widest transition ${
                                isActive
                                  ? "border-neon-cyan bg-neon-cyan/10 text-neon-cyan"
                                  : "border-white/15 text-white/50 hover:border-neon-cyan/60 hover:text-neon-cyan"
                              }`}
                            >
                              {suggestedEventFilterLabels[filter]} ({count})
                            </button>
                          );
                        })}
                      </div>

                      {suggestedEventsQuery.isLoading ? (
                        <div className="rounded border border-white/10 bg-black/30 p-4 font-mono text-sm text-white/50">
                          Loading suggested events…
                        </div>
                      ) : suggestedEvents.length === 0 ? (
                        <div className="rounded border border-white/10 bg-black/30 p-4 font-mono text-sm text-white/50">
                          No automation suggestions have been recorded yet.
                        </div>
                      ) : visibleSuggestedEvents.length === 0 ? (
                        <div className="rounded border border-white/10 bg-black/30 p-4 font-mono text-sm text-white/50">
                          No{" "}
                          {suggestedEventFilterLabels[
                            activeSuggestedEventFilter
                          ].toLowerCase()}{" "}
                          suggestions match this filter.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {visibleSuggestedEvents.map(suggestion => {
                            const isPendingAction =
                              activeSuggestedEventId === suggestion.id &&
                              (approveSuggestedEventMutation.isPending ||
                                rejectSuggestedEventMutation.isPending ||
                                updateSuggestedEventMutation.isPending);
                            const canReview = suggestion.status === "pending";
                            const editState =
                              editingSuggestedEvent?.id === suggestion.id
                                ? editingSuggestedEvent
                                : null;
                            const timestampUrl = getEventTimestampUrl(
                              suggestion.timestampSeconds
                            );
                            const metadataPreview =
                              formatSuggestedEventMetadataPreview(
                                suggestion.metadata
                              );
                            const displayFields =
                              getSuggestedEventDisplayFields(suggestion);
                            const isDeemphasized =
                              suggestion.status !== "pending";

                            return (
                              <div
                                key={suggestion.id}
                                className={`rounded border p-4 transition ${
                                  isDeemphasized
                                    ? "border-white/10 bg-black/20 opacity-65"
                                    : "border-neon-cyan/25 bg-black/35"
                                }`}
                              >
                                <div className="flex flex-wrap items-center gap-3">
                                  <span className="rounded border border-neon-cyan/50 px-2 py-1 font-mono text-xs font-bold text-neon-cyan">
                                    {formatVodEventTimestamp(
                                      suggestion.timestampSeconds
                                    )}
                                  </span>
                                  <span className="font-mono text-sm font-bold uppercase tracking-widest text-white">
                                    {
                                      VOD_ANALYSIS_EVENT_LABELS[
                                        suggestion.eventType
                                      ]
                                    }
                                  </span>
                                  <span className="rounded border border-white/10 px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-white/55">
                                    {suggestion.status}
                                  </span>
                                  {timestampUrl ? (
                                    <a
                                      href={timestampUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="font-mono text-[10px] font-bold uppercase tracking-widest text-neon-cyan underline-offset-4 hover:underline"
                                    >
                                      Open at timestamp
                                    </a>
                                  ) : null}
                                </div>

                                <div className="mt-3 grid gap-2 font-mono text-xs text-white/65 sm:grid-cols-2">
                                  {displayFields.map(field => (
                                    <span key={field.key}>
                                      {field.label}: {field.value}
                                    </span>
                                  ))}
                                  {suggestion.confidence !== null ? (
                                    <span>
                                      Confidence: {suggestion.confidence}%
                                    </span>
                                  ) : null}
                                  <span>Source: {suggestion.source}</span>
                                  {suggestion.confirmedVodEventId ? (
                                    <span>
                                      Confirmed manual event id:{" "}
                                      {suggestion.confirmedVodEventId}
                                    </span>
                                  ) : null}
                                </div>

                                {metadataPreview ? (
                                  <div className="mt-3 rounded border border-white/10 bg-black/30 p-2 font-mono text-xs text-white/50">
                                    Metadata: {metadataPreview}
                                  </div>
                                ) : null}

                                {editState
                                  ? renderSuggestedEventEditor(editState)
                                  : null}

                                {suggestedEventActionError?.id ===
                                suggestion.id ? (
                                  <div className="mt-3 rounded border border-red-500/40 bg-red-950/30 p-2 font-mono text-xs text-red-100">
                                    {suggestedEventActionError.message}
                                  </div>
                                ) : null}

                                {canReview ? (
                                  <div className="mt-4 flex flex-wrap gap-2">
                                    <button
                                      type="button"
                                      disabled={isPendingAction}
                                      onClick={() =>
                                        startSuggestedEventEdit(suggestion)
                                      }
                                      className="rounded-sm border border-neon-cyan/60 px-3 py-2 font-mono text-xs font-bold uppercase tracking-widest text-neon-cyan transition hover:bg-neon-cyan/10 disabled:cursor-not-allowed disabled:opacity-35"
                                    >
                                      {editState ? "Editing" : "Edit"}
                                    </button>
                                    <button
                                      type="button"
                                      disabled={isPendingAction}
                                      onClick={() =>
                                        approveSuggestedEventMutation.mutate(
                                          suggestion.id
                                        )
                                      }
                                      className="rounded-sm border border-neon-gold/70 px-3 py-2 font-mono text-xs font-bold uppercase tracking-widest text-neon-gold transition hover:bg-neon-gold/10 disabled:cursor-not-allowed disabled:opacity-35"
                                    >
                                      {isPendingAction &&
                                      approveSuggestedEventMutation.isPending
                                        ? "Approving…"
                                        : "Approve"}
                                    </button>
                                    <button
                                      type="button"
                                      disabled={isPendingAction}
                                      onClick={() =>
                                        rejectSuggestedEventMutation.mutate(
                                          suggestion.id
                                        )
                                      }
                                      className="rounded-sm border border-white/20 px-3 py-2 font-mono text-xs font-bold uppercase tracking-widest text-white/65 transition hover:border-red-300/70 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-35"
                                    >
                                      {isPendingAction &&
                                      rejectSuggestedEventMutation.isPending
                                        ? "Rejecting…"
                                        : "Reject"}
                                    </button>
                                  </div>
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ) : null}
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
                      <div className="space-y-3">
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

                        {savedTeamLabels.length > 0 ? (
                          <div>
                            <div className="mb-2 font-mono text-[10px] uppercase tracking-widest text-white/40">
                              Team filter
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {savedTeamLabels.map(team => (
                                <button
                                  key={team}
                                  type="button"
                                  onClick={() => setTeamFilter(team)}
                                  className={`rounded-full border px-3 py-1 font-mono text-xs font-bold uppercase tracking-widest transition ${
                                    teamFilter === team
                                      ? "border-neon-cyan bg-neon-cyan/15 text-neon-cyan"
                                      : "border-white/15 text-white/60 hover:border-white/35 hover:text-white"
                                  }`}
                                >
                                  {team}
                                </button>
                              ))}
                              {teamFilter ? (
                                <button
                                  type="button"
                                  onClick={() => setTeamFilter(null)}
                                  className="rounded-full border border-white/15 px-3 py-1 font-mono text-xs font-bold uppercase tracking-widest text-white/60 transition hover:border-neon-gold hover:text-neon-gold"
                                >
                                  Clear team
                                </button>
                              ) : null}
                            </div>
                          </div>
                        ) : null}
                      </div>

                      <p className="rounded border border-white/10 bg-black/30 p-3 font-mono text-xs text-white/45">
                        Review links open the source video at the selected event
                        time when supported by the provider.
                      </p>

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
                          No events match the selected event type/team filters.
                        </div>
                      ) : (
                        <ol className="space-y-3">
                          {filteredEvents.map(event => {
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
                                    <span className="rounded border border-neon-cyan/50 px-2 py-1 font-mono text-xs font-bold text-neon-cyan">
                                      {formatVodEventTimestamp(
                                        event.timestampSeconds
                                      )}
                                    </span>
                                    <span className="font-mono text-sm font-bold uppercase tracking-widest text-white">
                                      {
                                        VOD_ANALYSIS_EVENT_LABELS[
                                          event.eventType
                                        ]
                                      }
                                    </span>
                                    {editingEventId === event.id ? (
                                      <span className="rounded border border-neon-gold/50 px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-neon-gold">
                                        Editing
                                      </span>
                                    ) : null}
                                  </div>
                                  <div className="flex flex-wrap gap-2">
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
                                    <button
                                      type="button"
                                      onClick={() => handleEditEvent(event)}
                                      disabled={isEventSubmitPending}
                                      className="rounded-sm border border-neon-cyan/60 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-neon-cyan transition hover:bg-neon-cyan/10 disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteEvent(event)}
                                      disabled={deletingEventId === event.id}
                                      className="rounded-sm border border-red-400/60 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-red-200 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                      {deletingEventId === event.id
                                        ? "Deleting…"
                                        : "Delete"}
                                    </button>
                                  </div>
                                </div>
                                <div className="mt-3 flex flex-wrap gap-2 font-mono text-xs text-white/65">
                                  {event.actorLabel ? (
                                    <span>Actor: {event.actorLabel}</span>
                                  ) : null}
                                  {event.targetLabel ? (
                                    <span>
                                      {suggestedEventFieldLabels[
                                        event.eventType
                                      ].targetLabel ?? "Target"}
                                      :{" "}
                                      {formatVodTargetDisplayLabel(
                                        event.eventType,
                                        event.targetLabel
                                      )}
                                    </span>
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
                    </div>
                  ) : null}
                </NeonCard>
              </div>

              <div className="space-y-4">
                <LabelQualityPanel
                  totalEvents={events.length}
                  teamLabeledEventCount={teamLabeledEventCount}
                  uniqueTeamLabelCount={savedTeamLabels.length}
                  warnings={teamLabelWarnings}
                />
                <TeamSummarySection
                  summaries={teamSummaries}
                  vodAnalysisId={vodAnalysisId}
                />
                {vod ? (
                  <CaptureReadinessPanel
                    vodAnalysisId={vodAnalysisId}
                    vod={vod}
                  />
                ) : null}
                <WorkflowPlaceholder title="Auto-capture Setup" />
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
