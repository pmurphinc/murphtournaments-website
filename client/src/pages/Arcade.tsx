import { Gamepad2, KeyRound, ShieldCheck, Smartphone } from "lucide-react";
import CtaButton from "@/components/public/CtaButton";
import PageHero from "@/components/public/PageHero";
import SectionHeading from "@/components/public/SectionHeading";
import ArcadeLeaderboard from "@/components/public/ArcadeLeaderboard";
import { ARCADE_PUBLIC_URL } from "@shared/arcade";

/**
 * Murph Tournaments — Wormhole Arcade landing page.
 *
 * The game itself is a separate deployment. This page exists to send people
 * there in one click and to show the global board; nothing here asks anyone to
 * sign in first, because the arcade never requires an account to play.
 */

const HOW_IT_WORKS = [
  {
    icon: Gamepad2,
    title: "Open and play",
    body: "The arcade loads straight into a playable run. No account, no lobby, no download — keyboard on desktop, touch sticks on a phone or tablet.",
  },
  {
    icon: Smartphone,
    title: "Your best stays on your device",
    body: "As a guest, your personal best is saved in that browser's local storage. It is never uploaded and never leaves the device.",
  },
  {
    icon: KeyRound,
    title: "Sign in afterwards to save it",
    body: "When a run ends you can sign in with Discord to store that score here on Murph Tournaments. Signing in is offered at the end of a run, never before one.",
  },
  {
    icon: ShieldCheck,
    title: "Saved runs make the board",
    body: "Every player who saves a run appears on the global leaderboard by their best score. One row per player, so a long session cannot crowd anyone out.",
  },
];

export default function Arcade() {
  return (
    <div>
      <PageHero>
        <SectionHeading
          level="h1"
          eyebrow="Murph Arcade"
          title="Wormhole Arcade"
          description="A fast browser space-combat game. Shoot the wormhole, collect the power-up it drops, and send it back through at your rival before they do the same to you. Free to play, instantly, with no sign-in."
          action={
            <a
              href={ARCADE_PUBLIC_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              <CtaButton tone="gold">Play Now</CtaButton>
            </a>
          }
        />
        <p className="font-mono text-xs uppercase tracking-widest text-[var(--mt-muted)]">
          {ARCADE_PUBLIC_URL.replace(/^https:\/\//, "")}
        </p>
      </PageHero>

      <section className="border-b border-[var(--mt-steel-line)] py-12 sm:py-16">
        <div className="container">
          <SectionHeading
            eyebrow="How It Works"
            title="Play First, Sign In Later"
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {HOW_IT_WORKS.map(({ icon: Icon, title, body }) => (
              <div key={title} className="mt-panel flex items-start gap-4 p-5">
                <div
                  aria-hidden="true"
                  className="flex size-12 shrink-0 items-center justify-center rounded border border-[var(--mt-steel-line)] bg-[var(--mt-black)] text-[var(--mt-gold-bright)]"
                >
                  <Icon className="size-5" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="font-bold text-[var(--mt-off-white)]">
                    {title}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-[var(--mt-muted)]">
                    {body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-[var(--mt-steel-line)] py-12 sm:py-16">
        <div className="container">
          <SectionHeading
            eyebrow="Global Board"
            title="Top Saved Runs"
            description="Best score per signed-in player. Guest runs are not shown here — they stay on the guest's own device."
            action={
              <a
                href={ARCADE_PUBLIC_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                <CtaButton tone="outline">Beat a Score</CtaButton>
              </a>
            }
          />
          <ArcadeLeaderboard limit={10} />
        </div>
      </section>
    </div>
  );
}
