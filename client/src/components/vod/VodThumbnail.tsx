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

  useEffect(() => {
    setHasImageError(false);
  }, [vodId, thumbnailUrl]);

  if (thumbnailUrl && !hasImageError) {
    return (
      <img
        src={thumbnailUrl}
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
        <div>No thumbnail</div>
        {showUnavailableText && hasImageError ? (
          <div className="mt-2 text-[10px] normal-case tracking-normal text-white/30">
            Thumbnail unavailable.
          </div>
        ) : null}
      </div>
    </div>
  );
}
