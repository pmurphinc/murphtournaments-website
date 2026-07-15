import type { ReactNode } from "react";

export interface MediaCardData {
  title: string;
  description: string;
  href: string;
  platformLabel: string;
  icon: ReactNode;
}

export default function MediaCard({ media }: { media: MediaCardData }) {
  return (
    <a
      href={media.href}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-panel mt-hover-lift group flex items-center gap-4 p-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--mt-gold-bright)]"
    >
      <div
        aria-hidden="true"
        className="flex size-12 shrink-0 items-center justify-center rounded border border-[var(--mt-steel-line)] bg-[var(--mt-black)] text-[var(--mt-gold-bright)]"
      >
        {media.icon}
      </div>
      <div className="min-w-0">
        <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--mt-muted)]">
          {media.platformLabel}
        </p>
        <h3 className="truncate text-sm font-bold text-[var(--mt-off-white)] group-hover:text-[var(--mt-gold-bright)]">
          {media.title}
        </h3>
        <p className="truncate text-xs text-[var(--mt-muted)]">
          {media.description}
        </p>
      </div>
    </a>
  );
}
