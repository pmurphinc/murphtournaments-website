import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { formatVodEventTimestamp } from "@shared/vod/events";
import {
  formatCaptureReadinessLabel,
  formatVodCaptureJobStatus,
  getVodCaptureJobProgress,
  getVodCaptureJobStatusTone,
  getVodCaptureReadiness,
} from "@shared/vod/frame-sampling";
import { formatVodSourceType } from "@shared/vod/source";
import { VodDetailPill } from "./VodDetailPill";
import { formatDateTime, formatDuration } from "./vod-detail-helpers";

export function VodAutomationStatusPanel({
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
          <VodDetailPill
            label="Status"
            value={formatCaptureReadinessLabel(readiness.status)}
          />
          <VodDetailPill label="Source type" value={sourceTypeLabel} />
          <VodDetailPill label="Duration" value={durationLabel} />
          <VodDetailPill
            label="Sample interval"
            value={`${samplePlan.intervalSeconds}s`}
          />
          <VodDetailPill
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
            <VodDetailPill
              label="Pending suggestions"
              value={String(automationStatus.pendingSuggestedCount)}
            />
            <VodDetailPill
              label="Approved suggestions"
              value={String(automationStatus.approvedSuggestedCount)}
            />
            <VodDetailPill
              label="Rejected suggestions"
              value={String(automationStatus.rejectedSuggestedCount)}
            />
            <VodDetailPill
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
              <VodDetailPill
                label="Status"
                value={formatVodCaptureJobStatus(latestCaptureJob.status)}
              />
              <VodDetailPill
                label="Status tone"
                value={latestCaptureJobTone ?? "neutral"}
              />
              <VodDetailPill label="Source" value={latestCaptureJob.source} />
              <VodDetailPill
                label="Planned samples"
                value={String(captureJobProgress.plannedSamples)}
              />
              <VodDetailPill
                label="Processed samples"
                value={String(captureJobProgress.processedSamples)}
              />
              <VodDetailPill
                label="Failed samples"
                value={String(captureJobProgress.failedSamples)}
              />
              <VodDetailPill
                label="Percent complete"
                value={`${captureJobProgress.percentComplete}%`}
              />
              <VodDetailPill
                label="Remaining samples"
                value={String(captureJobProgress.remainingSamples)}
              />
              <VodDetailPill
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
