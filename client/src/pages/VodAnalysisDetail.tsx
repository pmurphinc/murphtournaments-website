import GlitchText from "@/components/GlitchText";
import NeonCard from "@/components/NeonCard";
import { trpc } from "@/lib/trpc";
import { getVodSourceLabel } from "@shared/vod/source";
import { Link } from "wouter";

type RouteParams = {
  id: string;
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
  const vodAnalysisId = Number(params.id);
  const isValidId = Number.isInteger(vodAnalysisId) && vodAnalysisId > 0;

  const query = trpc.vodAnalysis.getById.useQuery(vodAnalysisId, {
    enabled: isValidId,
    staleTime: 1000 * 30,
  });

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
                    <DetailPill label="Video POV" value={povLabel(vod.videoPov)} />
                    <DetailPill label="Created" value={formatDateTime(vod.createdAt)} />
                    <DetailPill label="Updated" value={formatDateTime(vod.updatedAt)} />
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
                Make sure the video link is viewable to reviewers with the required permissions.
              </p>
            </NeonCard>

            <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <WorkflowPlaceholder title="Event Timeline" />
              <WorkflowPlaceholder title="Team Summary" />
              <WorkflowPlaceholder title="Auto-capture Setup" />
            </section>
          </>
        )}
      </div>
    </div>
  );
}
