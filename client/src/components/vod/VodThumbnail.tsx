import { useEffect, useState } from "react";

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
  const usableThumbnailUrl = thumbnailUrl?.trim();

  useEffect(() => {
    setHasImageError(false);
  }, [vodId, usableThumbnailUrl]);

  if (usableThumbnailUrl && !hasImageError) {
    return (
      <img
        src={usableThumbnailUrl}
        alt={`${title} thumbnail`}
        className={className}
        loading="lazy"
        onError={() => setHasImageError(true)}
      />
    );
  }

  return (
    <div className={fallbackClassName}>
      <div>
        <div>
          {usableThumbnailUrl ? "Thumbnail unavailable" : "No thumbnail"}
        </div>
        {showUnavailableText && usableThumbnailUrl && hasImageError ? (
          <div className="mt-2 text-[10px] normal-case tracking-normal text-white/30">
            Image failed to load.
          </div>
        ) : null}
      </div>
    </div>
  );
}
