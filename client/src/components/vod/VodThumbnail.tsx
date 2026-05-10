import { useEffect, useMemo, useState } from "react";
import { buildVodFallbackThumbnailLabels } from "@shared/vod/fallback-thumbnail";
import { buildClientTwitchThumbnailCandidates } from "@shared/vod/twitch-thumbnail-candidates";

type VodThumbnailProps = {
  vodId: number;
  title: string;
  thumbnailUrl: string | null | undefined;
  className: string;
  fallbackClassName: string;
  sourceType?: string | null;
  sourceRef?: string | null;
  sourceId?: string | null;
  videoPov?: "player" | "spectator" | string | null;
  durationLabel?: string | null;
  durationSeconds?: number | null;
  showUnavailableText?: boolean;
};

export function VodThumbnail({
  vodId,
  title,
  thumbnailUrl,
  className,
  fallbackClassName,
  sourceType,
  sourceRef,
  sourceId,
  videoPov,
  durationLabel,
  durationSeconds,
  showUnavailableText = false,
}: VodThumbnailProps) {
  const [hasImageError, setHasImageError] = useState(false);
  const [candidateIndex, setCandidateIndex] = useState(0);
  const usableThumbnailUrl = thumbnailUrl?.trim();
  const thumbnailCandidates = useMemo(
    () => buildClientTwitchThumbnailCandidates(usableThumbnailUrl),
    [usableThumbnailUrl]
  );
  const currentThumbnailUrl = thumbnailCandidates[candidateIndex];
  const isDev = import.meta.env.DEV;
  const fallbackLabels = buildVodFallbackThumbnailLabels({
    sourceType,
    sourceRef,
    sourceId,
    videoPov,
    durationLabel,
    durationSeconds,
  });
  const fallbackMeta = [
    fallbackLabels.sourceLabel,
    fallbackLabels.povLabel,
    fallbackLabels.durationLabel,
  ].filter(Boolean);
  const showDiagnostic =
    Boolean(usableThumbnailUrl && hasImageError) && (showUnavailableText || isDev);

  useEffect(() => {
    setHasImageError(false);
    setCandidateIndex(0);
  }, [vodId, usableThumbnailUrl]);

  if (currentThumbnailUrl && !hasImageError) {
    return (
      <img
        src={currentThumbnailUrl}
        alt={`${title} thumbnail`}
        className={className}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => {
          if (candidateIndex < thumbnailCandidates.length - 1) {
            setCandidateIndex(candidateIndex + 1);
            return;
          }

          setHasImageError(true);
        }}
      />
    );
  }

  return (
    <div
      className={`${fallbackClassName} relative isolate overflow-hidden border-neon-cyan/40 bg-slate-950 p-4 text-left shadow-[0_0_28px_rgba(0,229,255,0.16)]`}
      role="img"
      aria-label={`${title} VOD analysis fallback thumbnail`}
    >
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_20%,rgba(0,229,255,0.24),transparent_30%),radial-gradient(circle_at_88%_18%,rgba(255,42,213,0.24),transparent_28%),linear-gradient(135deg,rgba(3,7,18,0.98),rgba(15,23,42,0.94)_46%,rgba(2,6,23,0.98))]" />
      <div className="absolute inset-0 -z-10 opacity-35 [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:28px_28px]" />
      <div className="absolute -left-10 top-5 h-24 w-36 -rotate-12 border-y border-neon-cyan/30" />
      <div className="absolute -bottom-8 right-6 h-24 w-24 rounded-full border border-neon-magenta/30 shadow-[0_0_32px_rgba(255,42,213,0.28)]" />

      <div className="flex h-full w-full flex-col justify-between gap-3">
        <div className="flex items-center justify-between gap-3 font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-neon-cyan">
          <span className="rounded border border-neon-cyan/40 bg-black/35 px-2 py-1 shadow-[0_0_14px_rgba(0,229,255,0.18)]">
            Murph Tournaments
          </span>
          <span className="h-px min-w-8 flex-1 bg-gradient-to-r from-neon-cyan/60 to-neon-magenta/60" />
        </div>

        <div className="space-y-2">
          <div className="font-mono text-2xl font-black uppercase leading-none tracking-[0.12em] text-white drop-shadow-[0_0_12px_rgba(0,229,255,0.35)] sm:text-3xl">
            VOD Analysis
          </div>
          <div className="line-clamp-2 max-w-[90%] font-mono text-sm font-bold normal-case leading-snug tracking-normal text-white/85 sm:text-base">
            {title}
          </div>
        </div>

        <div className="space-y-2">
          {fallbackMeta.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {fallbackMeta.map(label => (
                <span
                  key={label}
                  className="rounded border border-white/15 bg-black/40 px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-white/70"
                >
                  {label}
                </span>
              ))}
            </div>
          ) : null}
          {showDiagnostic ? (
            <div className="font-mono text-[10px] normal-case tracking-normal text-white/35">
              Provider thumbnail unavailable.
              <a
                href={usableThumbnailUrl}
                target="_blank"
                rel="noreferrer"
                title={usableThumbnailUrl}
                className="ml-2 text-neon-cyan/70 underline decoration-neon-cyan/40 underline-offset-2"
              >
                Open thumbnail URL
              </a>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
