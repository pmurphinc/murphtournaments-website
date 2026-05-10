import { useEffect, useMemo, useState } from "react";
import { buildClientTwitchThumbnailCandidates } from "@shared/vod/twitch-thumbnail-candidates";

type VodThumbnailProps = {
  vodId: number;
  title: string;
  thumbnailUrl: string | null | undefined;
  className: string;
  fallbackClassName: string;
  showUnavailableText?: boolean;
};

export function VodThumbnail({
  vodId,
  title,
  thumbnailUrl,
  className,
  fallbackClassName,
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
    <div className={fallbackClassName}>
      <div>
        <div>
          {usableThumbnailUrl ? "Thumbnail unavailable" : "No thumbnail"}
        </div>
        {showUnavailableText && usableThumbnailUrl && hasImageError && isDev ? (
          <div className="mt-2 text-[10px] normal-case tracking-normal text-white/30">
            Image failed to load.
            <a
              href={usableThumbnailUrl}
              target="_blank"
              rel="noreferrer"
              title={usableThumbnailUrl}
              className="mt-1 block break-all text-neon-cyan/70 underline decoration-neon-cyan/40 underline-offset-2"
            >
              Open thumbnail URL
            </a>
          </div>
        ) : null}
      </div>
    </div>
  );
}
