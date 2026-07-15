import type { ReactNode } from "react";

/**
 * Lightweight header band for interior pages (discovery, archive, tournament
 * detail) — distinct from the full brand `Hero` used only on the homepage.
 */
export default function PageHero({ children }: { children: ReactNode }) {
  return (
    <div className="border-b border-[var(--mt-steel-line)] py-12 sm:py-16">
      <div className="container">{children}</div>
    </div>
  );
}
