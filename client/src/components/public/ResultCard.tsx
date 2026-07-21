import { Trophy } from "lucide-react";

export interface ResultCardData {
  name: string;
  dateLabel: string;
  winners: string;
  format: string;
  teams: number;
  prizePool: string;
  description?: string;
  /** e.g. a details page or VOD replay link for this specific event. */
  actions?: ResultCardAction[];
}

export interface ResultCardAction {
  label: string;
  /** Absolute (http) hrefs open in a new tab. */
  href: string;
}

const isExternal = (href: string) => /^https?:\/\//.test(href);

export default function ResultCard({ result }: { result: ResultCardData }) {
  return (
    <div className="mt-panel mt-hover-lift flex flex-col gap-3 p-5">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-bold uppercase tracking-wide text-[var(--mt-off-white)]">
          {result.name}
        </h3>
        <span className="shrink-0 font-mono text-xs text-[var(--mt-muted)]">
          {result.dateLabel}
        </span>
      </div>
      <div className="flex items-start gap-2 font-mono text-sm text-[var(--mt-gold-bright)]">
        <Trophy className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span className="line-clamp-2">{result.winners}</span>
      </div>
      {result.description ? (
        <p className="line-clamp-2 text-sm leading-relaxed text-[var(--mt-muted)]">
          {result.description}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-[var(--mt-steel-line)] pt-3 font-mono text-xs uppercase tracking-widest text-[var(--mt-muted)]">
        <span>{result.format}</span>
        <span>{result.teams} Teams</span>
        <span>{result.prizePool}</span>
      </div>
      {result.actions?.length ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {result.actions.map(action => (
            <a
              key={action.href}
              href={action.href}
              {...(isExternal(action.href)
                ? { target: "_blank", rel: "noopener noreferrer" }
                : {})}
              className="inline-flex w-fit items-center gap-1 font-mono text-xs font-bold uppercase tracking-widest text-[var(--mt-gold-bright)] hover:underline"
            >
              {action.label} →
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
}
