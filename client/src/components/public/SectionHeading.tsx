import type { ReactNode } from "react";

interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  /** Use "h1" once per page for the primary heading; defaults to "h2" for section headings. */
  level?: "h1" | "h2";
}

export default function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  level = "h2",
}: SectionHeadingProps) {
  const Heading = level;
  const headingSize =
    level === "h1"
      ? "text-3xl sm:text-4xl lg:text-5xl"
      : "text-2xl sm:text-3xl";

  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        {eyebrow ? (
          <p className="mb-2 font-mono text-xs font-bold uppercase tracking-[0.3em] text-[var(--mt-gold-bright)]">
            {eyebrow}
          </p>
        ) : null}
        <Heading
          className={`font-bold uppercase tracking-wide text-[var(--mt-off-white)] ${headingSize}`}
        >
          {title}
        </Heading>
        {description ? (
          <p className="mt-3 text-sm leading-relaxed text-[var(--mt-muted)] sm:text-base">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
