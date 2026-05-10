import NeonCard from "@/components/NeonCard";
import type { VodEmbedConfig } from "@shared/vod/source";

export function VodReviewPlayer({
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
