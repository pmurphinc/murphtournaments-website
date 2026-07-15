import type { ReactNode } from "react";

interface HeroProps {
  eyebrow: string;
  title: ReactNode;
  description: string;
  actions?: ReactNode;
  aside?: ReactNode;
}

export default function Hero({
  eyebrow,
  title,
  description,
  actions,
  aside,
}: HeroProps) {
  return (
    <section className="relative overflow-hidden border-b border-[var(--mt-steel-line)] py-16 sm:py-20 lg:py-24">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 15% 20%, rgba(201,169,74,0.08), transparent 45%), radial-gradient(circle at 85% 0%, rgba(201,169,74,0.05), transparent 40%)",
        }}
      />
      <div className="container relative z-10">
        <div
          className={`grid grid-cols-1 items-center gap-10 ${aside ? "lg:grid-cols-[1.1fr_0.9fr] lg:gap-16" : ""}`}
        >
          <div className="max-w-2xl space-y-6">
            <p className="font-mono text-xs font-bold uppercase tracking-[0.35em] text-[var(--mt-gold-bright)]">
              {eyebrow}
            </p>
            <h1 className="text-4xl font-bold uppercase leading-tight tracking-wide text-[var(--mt-off-white)] sm:text-5xl lg:text-6xl">
              {title}
            </h1>
            <p className="max-w-xl text-base leading-relaxed text-[var(--mt-muted)] sm:text-lg">
              {description}
            </p>
            {actions ? (
              <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                {actions}
              </div>
            ) : null}
          </div>
          {aside ? (
            <div className="lg:justify-self-end lg:self-stretch">{aside}</div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
