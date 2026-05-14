import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { formatVodEventTimestamp } from "@shared/vod/events";
import type { VodHudZoneId } from "@shared/vod/hud-zones";
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
  const [queueCaptureJobMessage, setQueueCaptureJobMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);
  const [processCaptureJobMessage, setProcessCaptureJobMessage] = useState<{
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
  const framePreviewQuery =
    trpc.vodAnalysis.getLatestCaptureFramePreview.useQuery(
      { vodAnalysisId },
      { staleTime: 1000 * 10 }
    );
  const createCaptureJobMutation =
    trpc.vodAnalysis.createCaptureJob.useMutation({
      onMutate: () => {
        setQueueCaptureJobMessage(null);
        setProcessCaptureJobMessage(null);
      },
      onSuccess: async result => {
        await Promise.all([
          utils.vodAnalysis.getAutomationStatus.invalidate(vodAnalysisId),
          utils.vodAnalysis.getLatestCaptureJob.invalidate(vodAnalysisId),
          utils.vodAnalysis.listCaptureJobs.invalidate(vodAnalysisId),
          utils.vodAnalysis.getLatestCaptureFramePreview.invalidate({
            vodAnalysisId,
          }),
        ]);

        switch (result.status) {
          case "created":
            setQueueCaptureJobMessage({
              type: "success",
              text: "Capture job queued.",
            });
            break;
          case "not_ready":
            setQueueCaptureJobMessage({
              type: "info",
              text: result.readiness.reason,
            });
            break;
          case "not_found":
            setQueueCaptureJobMessage({
              type: "error",
              text: "VOD analysis was not found.",
            });
            break;
          default: {
            const _exhaustiveResult: never = result;
            return _exhaustiveResult;
          }
        }
      },
      onError: error => {
        setQueueCaptureJobMessage({ type: "error", text: error.message });
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
  const processCaptureJobMutation =
    trpc.vodAnalysis.processCaptureJob.useMutation({
      onMutate: () => {
        setQueueCaptureJobMessage(null);
        setProcessCaptureJobMessage(null);
      },
      onSuccess: async result => {
        await Promise.all([
          utils.vodAnalysis.getAutomationStatus.invalidate(vodAnalysisId),
          utils.vodAnalysis.getLatestCaptureJob.invalidate(vodAnalysisId),
          utils.vodAnalysis.listCaptureJobs.invalidate(vodAnalysisId),
          utils.vodAnalysis.listSuggestedEvents.invalidate(vodAnalysisId),
          utils.vodAnalysis.list.invalidate(),
          utils.vodAnalysis.getLatestCaptureFramePreview.invalidate({
            vodAnalysisId,
          }),
        ]);

        if (result.status === "complete") {
          setProcessCaptureJobMessage({
            type: "success",
            text: `Processed ${result.processedSamples} samples, failed ${result.failedSamples} samples, and created ${result.createdSuggestionCount} pending suggestions.${result.errorMessage ? ` ${result.errorMessage}` : ""}`,
          });
        } else {
          setProcessCaptureJobMessage({
            type: "error",
            text:
              result.errorMessage ??
              `Capture job processing returned ${result.status}.`,
          });
        }
      },
      onError: error => {
        setProcessCaptureJobMessage({ type: "error", text: error.message });
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
  const frameCaptureBinaries = automationStatus?.frameCaptureBinaries ?? null;
  const isFfmpegAvailable = frameCaptureBinaries
    ? !frameCaptureBinaries.missing.includes("ffmpeg")
    : false;
  const isYtDlpAvailable = frameCaptureBinaries
    ? !frameCaptureBinaries.missing.includes("yt-dlp")
    : false;
  const areFrameCaptureBinariesAvailable =
    frameCaptureBinaries?.available ?? false;
  const missingBinaryNames = frameCaptureBinaries?.missing.length
    ? ["ffmpeg", "yt-dlp"]
        .filter(binaryName =>
          frameCaptureBinaries.missing.includes(
            binaryName as "ffmpeg" | "yt-dlp"
          )
        )
        .join(" and ")
    : "ffmpeg and yt-dlp";
  const binaryStatusLabel = frameCaptureBinaries
    ? areFrameCaptureBinariesAvailable
      ? "Ready"
      : "Missing"
    : "Checking";
  const ocrEnabled = automationStatus?.ocrEnabled ?? false;
  const ocrConfidenceThreshold = automationStatus?.ocrConfidenceThreshold ?? 70;
  const captureJobProgress = latestCaptureJob
    ? getVodCaptureJobProgress(latestCaptureJob)
    : null;
  const latestCaptureJobTone = latestCaptureJob
    ? getVodCaptureJobStatusTone(latestCaptureJob.status)
    : null;
  const isCaptureJobAlreadyQueued = latestCaptureJob?.status === "queued";
  const isCaptureJobProcessing = latestCaptureJob?.status === "processing";
  const captureJobDisabledReason = !readiness.isReady
    ? readiness.reason
    : isCaptureJobAlreadyQueued
      ? "A capture job is already queued."
      : isCaptureJobProcessing
        ? "A capture job is already processing."
        : null;
  const queueCaptureButtonLabel = createCaptureJobMutation.isPending
    ? "Queueing capture job…"
    : isCaptureJobAlreadyQueued
      ? "Capture job already queued"
      : isCaptureJobProcessing
        ? "Capture job processing"
        : "Queue capture job";
  const actionHint = isCaptureJobAlreadyQueued
    ? frameCaptureBinaries && !areFrameCaptureBinariesAvailable
      ? "A job is queued, but processing is disabled until ffmpeg and yt-dlp are available."
      : areFrameCaptureBinariesAvailable
        ? "A job is queued. Process it to scan frames."
        : "A capture job is already queued. Process it when runtime binaries are ready."
    : isCaptureJobProcessing
      ? "A capture job is processing frame samples now."
      : readiness.isReady
        ? "Queue a capture job to prepare frame sampling."
        : readiness.reason;
  const processCaptureJobDisabledReason = !latestCaptureJob
    ? "Queue a capture job first."
    : !frameCaptureBinaries
      ? "Checking runtime binaries."
      : !areFrameCaptureBinariesAvailable
        ? "Twitch frame extraction needs ffmpeg and yt-dlp in the Railway runtime."
        : latestCaptureJob.status === "processing"
          ? "This capture job is already processing."
          : latestCaptureJob.status === "complete"
            ? "This capture job is already complete."
            : latestCaptureJob.status !== "queued"
              ? "Only queued capture jobs can be processed."
              : null;
  const sourceTypeLabel =
    vod.sourceType === "twitch" ||
    vod.sourceType === "youtube" ||
    vod.sourceType === "google_drive" ||
    vod.sourceType === "generic"
      ? formatVodSourceType(vod.sourceType)
      : "Unknown";
  const framePreview = framePreviewQuery.data;
  const zoneToneClasses: Record<VodHudZoneId, string> = {
    scoreboard: "border-neon-gold bg-neon-gold/15 text-neon-gold",
    kill_feed: "border-neon-magenta bg-neon-magenta/15 text-neon-magenta",
    objective_hud: "border-neon-cyan bg-neon-cyan/15 text-neon-cyan",
    center_event_text: "border-white/80 bg-white/10 text-white",
    player_team_hud: "border-emerald-300 bg-emerald-400/15 text-emerald-200",
  };
  const legendZoneOrder: VodHudZoneId[] = [
    "scoreboard",
    "kill_feed",
    "objective_hud",
    "center_event_text",
    "player_team_hud",
  ];
  const previewZones =
    framePreview?.zones
      .slice()
      .sort(
        (left, right) =>
          legendZoneOrder.indexOf(left.id) - legendZoneOrder.indexOf(right.id)
      ) ?? [];

  const captureStatusLabel = latestCaptureJob
    ? latestCaptureJob.status === "processing"
      ? "Processing"
      : latestCaptureJob.status === "complete"
        ? "Complete"
        : !readiness.isReady ||
            (frameCaptureBinaries && !areFrameCaptureBinariesAvailable)
          ? "Blocked"
          : "Ready"
    : !readiness.isReady ||
        (frameCaptureBinaries && !areFrameCaptureBinariesAvailable)
      ? "Blocked"
      : "Ready";
  const captureSummary = latestCaptureJob
    ? latestCaptureJob.status === "complete"
      ? "Capture job complete. Review pending suggestions below."
      : latestCaptureJob.status === "processing"
        ? "A capture job is processing frame samples now."
        : latestCaptureJob.status === "queued"
          ? frameCaptureBinaries && !areFrameCaptureBinariesAvailable
            ? "Capture job queued. Processing is blocked until Railway exposes ffmpeg and yt-dlp at runtime."
            : "A capture job is queued and ready to process."
          : !readiness.isReady
            ? readiness.reason
            : "This Twitch VOD is ready for frame capture and OCR review."
    : frameCaptureBinaries && !areFrameCaptureBinariesAvailable
      ? "Frame capture is blocked until the Railway runtime has ffmpeg and yt-dlp."
      : !readiness.isReady
        ? readiness.reason
        : "This Twitch VOD is ready for frame capture and OCR review.";
  const pendingSuggestionLabel = automationStatus
    ? String(automationStatus.pendingSuggestedCount)
    : "—";
  const processedAndFailedSamples = captureJobProgress
    ? captureJobProgress.processedSamples + captureJobProgress.failedSamples
    : 0;
  const progressLine = captureJobProgress
    ? `${processedAndFailedSamples} / ${captureJobProgress.plannedSamples} samples processed`
    : null;
  const isProcessingDisabledByBinaries =
    Boolean(latestCaptureJob) &&
    Boolean(frameCaptureBinaries) &&
    !areFrameCaptureBinariesAvailable;

  return (
    <section className="rounded-lg border border-neon-cyan/25 bg-black/35 p-4 shadow-[0_0_32px_rgba(0,229,255,0.08)] sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="font-mono text-lg font-bold uppercase tracking-widest text-neon-cyan">
            Automation Status
          </h3>
          <p className="mt-2 font-mono text-sm text-white/65">
            {captureSummary}
          </p>
        </div>
        <span className="shrink-0 rounded border border-neon-cyan/40 bg-neon-cyan/10 px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-neon-cyan">
          {captureStatusLabel}
        </span>
      </div>

      <div className="mt-4 space-y-4 border-t border-white/10 pt-4">
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <VodDetailPill label="Capture" value={captureStatusLabel} compact />
          <VodDetailPill label="Binaries" value={binaryStatusLabel} compact />
          <VodDetailPill
            label="OCR"
            value={ocrEnabled ? "Enabled" : "Disabled"}
            compact
          />
          <VodDetailPill
            label="Suggestions"
            value={pendingSuggestionLabel}
            compact
          />
        </div>

        {frameCaptureBinaries && !areFrameCaptureBinariesAvailable ? (
          <div className="rounded border border-neon-gold/35 bg-neon-gold/10 p-3 font-mono text-sm text-neon-gold">
            <p className="font-bold">
              Processing is blocked until ffmpeg and yt-dlp are available in
              the Railway runtime.
            </p>
            <p className="mt-1 text-neon-gold/80">
              Redeploy after the Docker runtime binary fix, then refresh this
              page.
            </p>
          </div>
        ) : null}

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(420px,0.85fr)] xl:items-start">
          {automationStatusQuery.isLoading ? (
            <div className="rounded border border-white/10 bg-black/30 p-3 font-mono text-sm text-white/50">
              Loading automation status…
            </div>
          ) : latestCaptureJob && captureJobProgress ? (
            <div className="rounded border border-white/10 bg-black/30 p-3">
              <div className="font-mono text-[10px] font-bold uppercase tracking-widest text-white/45">
                Latest capture job
              </div>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                <VodDetailPill
                  label="Job status"
                  value={formatVodCaptureJobStatus(latestCaptureJob.status)}
                  compact
                />
                <VodDetailPill
                  label="Progress"
                  value={progressLine ?? "No samples planned"}
                  compact
                />
                <VodDetailPill
                  label="Source"
                  value={latestCaptureJob.source}
                  compact
                />
                <VodDetailPill
                  label="Created"
                  value={formatDateTime(latestCaptureJob.createdAt)}
                  compact
                />
              </div>
              {latestCaptureJob.errorMessage ? (
                <p className="mt-3 rounded border border-red-500/40 bg-red-950/30 p-3 font-mono text-sm text-red-100">
                  {latestCaptureJob.errorMessage}
                </p>
              ) : null}
            </div>
          ) : (
            <div className="rounded border border-white/10 bg-black/30 p-3 font-mono text-sm text-white/50">
              No capture jobs have been recorded for this VOD yet.
            </div>
          )}

          <div className="rounded border border-neon-cyan/20 bg-black/40 p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="font-mono text-[10px] font-bold uppercase tracking-widest text-neon-cyan">
                  Debug frame
                </div>
                <p className="mt-1 font-mono text-xs text-white/55">
                  Latest captured frame with HUD detector zones overlaid.
                </p>
              </div>
              {framePreview?.status === "available" &&
              framePreview.timestampSeconds !== null ? (
                <span className="rounded border border-neon-gold/40 bg-neon-gold/10 px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-neon-gold">
                  {formatVodEventTimestamp(framePreview.timestampSeconds)}
                </span>
              ) : null}
            </div>

            {framePreviewQuery.isLoading ? (
              <div className="mt-3 rounded border border-white/10 bg-black/30 p-3 font-mono text-sm text-white/50">
                Loading debug frame preview…
              </div>
            ) : framePreview?.status === "available" ? (
              <div className="mt-3 space-y-3">
                <div className="relative overflow-hidden rounded border border-white/10 bg-black shadow-[0_0_24px_rgba(0,229,255,0.12)]">
                  <img
                    src={framePreview.frameUrl}
                    alt="Latest captured VOD debug frame with HUD detection zones"
                    className="block h-auto w-full"
                    loading="lazy"
                  />
                  <div className="absolute inset-0">
                    {previewZones.map(zone => (
                      <div
                        key={zone.id}
                        className={`absolute border-2 ${zoneToneClasses[zone.id]} shadow-[0_0_14px_currentColor]`}
                        style={{
                          left: `${zone.rect.x * 100}%`,
                          top: `${zone.rect.y * 100}%`,
                          width: `${zone.rect.width * 100}%`,
                          height: `${zone.rect.height * 100}%`,
                        }}
                        title={zone.purpose}
                      >
                        <span className="absolute left-1 top-1 rounded bg-black/75 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-widest sm:text-[10px]">
                          {zone.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <p className="font-mono text-[10px] text-white/45">
                  {framePreview.fileName}
                </p>
              </div>
            ) : (
              <div className="mt-3 rounded border border-white/10 bg-black/30 p-3 font-mono text-sm text-white/50">
                No debug frame captured yet.
              </div>
            )}
          </div>
        </div>

        {!readiness.isReady ? (
          <p className="rounded border border-neon-gold/30 bg-neon-gold/10 p-3 font-mono text-sm text-neon-gold">
            {readiness.reason}
          </p>
        ) : null}
        {isProcessingDisabledByBinaries ? (
          <p className="rounded border border-neon-gold/30 bg-neon-gold/10 p-3 font-mono text-sm text-neon-gold">
            Processing disabled: {missingBinaryNames} unavailable in the Railway
            runtime.
          </p>
        ) : null}
        {processCaptureJobDisabledReason && !isProcessingDisabledByBinaries ? (
          <p className="font-mono text-xs text-white/45">
            Processing disabled: {processCaptureJobDisabledReason}
          </p>
        ) : null}
        {captureJobDisabledReason ? (
          <p className="font-mono text-xs text-white/45">
            Capture job creation is disabled: {captureJobDisabledReason}
          </p>
        ) : null}

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <p className="rounded border border-neon-cyan/25 bg-neon-cyan/10 p-3 font-mono text-sm text-neon-cyan">
            {actionHint}
          </p>

          <div className="grid gap-2 sm:grid-cols-2 lg:min-w-[460px]">
            <button
              type="button"
              onClick={() =>
                createCaptureJobMutation.mutate({
                  vodAnalysisId,
                  source: "manual_debug",
                })
              }
              disabled={
                !readiness.isReady ||
                isCaptureJobAlreadyQueued ||
                isCaptureJobProcessing ||
                createCaptureJobMutation.isPending
              }
              title={captureJobDisabledReason ?? undefined}
              className="rounded-sm border-2 border-neon-cyan px-4 py-2 font-mono text-xs font-bold uppercase tracking-widest text-neon-cyan transition hover:bg-neon-cyan/10 hover-glow-cyan disabled:cursor-not-allowed disabled:border-white/15 disabled:text-white/35 disabled:hover:bg-transparent"
            >
              {queueCaptureButtonLabel}
            </button>
            <button
              type="button"
              onClick={() => {
                if (!latestCaptureJob) return;
                processCaptureJobMutation.mutate({
                  vodAnalysisId,
                  captureJobId: latestCaptureJob.id,
                });
              }}
              disabled={
                !latestCaptureJob ||
                !areFrameCaptureBinariesAvailable ||
                latestCaptureJob.status !== "queued" ||
                processCaptureJobMutation.isPending
              }
              title={processCaptureJobDisabledReason ?? undefined}
              className="rounded-sm border-2 border-neon-gold px-4 py-2 font-mono text-xs font-bold uppercase tracking-widest text-neon-gold transition hover:bg-neon-gold/10 disabled:cursor-not-allowed disabled:border-white/15 disabled:text-white/35 disabled:hover:bg-transparent"
            >
              {processCaptureJobMutation.isPending
                ? "Processing capture job…"
                : "Process latest capture job"}
            </button>
          </div>
        </div>

        {queueCaptureJobMessage ? (
          <p
            className={`rounded border p-3 font-mono text-sm ${
              queueCaptureJobMessage.type === "success"
                ? "border-neon-cyan/30 bg-neon-cyan/10 text-neon-cyan"
                : queueCaptureJobMessage.type === "info"
                  ? "border-neon-gold/30 bg-neon-gold/10 text-neon-gold"
                  : "border-red-500/40 bg-red-950/30 text-red-100"
            }`}
          >
            {queueCaptureJobMessage.text}
          </p>
        ) : null}

        {processCaptureJobMessage ? (
          <p
            className={`rounded border p-3 font-mono text-sm ${
              processCaptureJobMessage.type === "success"
                ? "border-neon-cyan/30 bg-neon-cyan/10 text-neon-cyan"
                : "border-red-500/40 bg-red-950/30 text-red-100"
            }`}
          >
            {processCaptureJobMessage.text}
          </p>
        ) : null}

        <details className="rounded border border-white/10 bg-black/30 p-3">
          <summary className="cursor-pointer font-mono text-[10px] font-bold uppercase tracking-widest text-white/55">
            Advanced diagnostics
          </summary>
          <div className="mt-3 space-y-3">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
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
              <VodDetailPill
                label="OCR threshold"
                value={`${ocrConfidenceThreshold}%`}
              />
              <VodDetailPill
                label="ffmpeg"
                value={
                  frameCaptureBinaries
                    ? isFfmpegAvailable
                      ? "Available"
                      : "Missing"
                    : "Checking"
                }
              />
              <VodDetailPill
                label="yt-dlp"
                value={
                  frameCaptureBinaries
                    ? isYtDlpAvailable
                      ? "Available"
                      : "Missing"
                    : "Checking"
                }
              />
              <VodDetailPill
                label="Status tone"
                value={latestCaptureJobTone ?? "neutral"}
              />
              <VodDetailPill
                label="Remaining samples"
                value={
                  captureJobProgress
                    ? String(captureJobProgress.remainingSamples)
                    : "—"
                }
              />
              <VodDetailPill
                label="Created date"
                value={
                  latestCaptureJob
                    ? formatDateTime(latestCaptureJob.createdAt)
                    : "—"
                }
              />
              {automationStatus ? (
                <>
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
                </>
              ) : null}
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

            <p className="rounded border border-neon-magenta/30 bg-neon-magenta/10 p-3 font-mono text-xs text-white/60">
              Capture jobs plan frame-sampling work and can run a conservative
              first-pass processor when yt-dlp and ffmpeg are available. OCR is
              currently {ocrEnabled ? "enabled" : "disabled"}, and the detector
              creates pending suggestions when center-event text meets the
              configured confidence threshold.
            </p>
          </div>
        </details>

        {import.meta.env.DEV ? (
          <details className="rounded border border-neon-gold/30 bg-neon-gold/10 p-3">
            <summary className="cursor-pointer font-mono text-[10px] font-bold uppercase tracking-widest text-neon-gold">
              Dev automation controls
            </summary>
            <div className="mt-3 space-y-3">
              {latestCaptureJob ? (
                <div className="rounded border border-neon-cyan/25 bg-neon-cyan/10 p-3">
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

              <div>
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
                  disabled={
                    !latestCaptureJob || mockAutomationMutation.isPending
                  }
                  className="mt-3 rounded-sm border border-neon-gold/70 px-3 py-2 font-mono text-xs font-bold uppercase tracking-widest text-neon-gold transition hover:bg-neon-gold/10 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {mockAutomationMutation.isPending
                    ? "Running mock automation…"
                    : "Run mock automation detections"}
                </button>
              </div>
            </div>
          </details>
        ) : null}
      </div>
    </section>
  );
}
