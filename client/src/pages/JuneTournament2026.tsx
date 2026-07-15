import { Link } from "wouter";
import SectionHeading from "@/components/public/SectionHeading";
import StatDisplay from "@/components/public/StatDisplay";
import ChampionCard from "@/components/public/ChampionCard";
import CtaButton from "@/components/public/CtaButton";

interface PrizeImage {
  src: string;
  alt: string;
  label: string;
}

interface FormatRound {
  title: string;
  flow: string;
  description: string;
}

export const discordUrl = "https://discord.gg/kcmdxmBgnC";

const infoCards = [
  { label: "Event Date", value: "June 28, 2026" },
  { label: "Time", value: "5 PM Pacific / 8 PM Eastern" },
  { label: "Entry", value: "Free" },
  { label: "Prize", value: "1st Place 3D Prints" },
  { label: "Format", value: "Cashout Elim → BO5 Final" },
  { label: "Field", value: "16 Teams" },
  { label: "Champion", value: "Seismic" },
  { label: "Runtime", value: "Approx. 2 Hours" },
];

const formatRounds: FormatRound[] = [
  {
    title: "Cashout Round 1",
    flow: "16 Teams → 8 Teams",
    description:
      "4 lobbies ran at once. The top 2 teams from each lobby advanced; the bottom 2 were eliminated.",
  },
  {
    title: "Cashout Round 2",
    flow: "8 Teams → 4 Teams",
    description:
      "2 lobbies ran at once. The top 2 teams from each lobby advanced; the bottom 2 were eliminated.",
  },
  {
    title: "Cashout Round 3",
    flow: "4 Teams → 2 Teams",
    description:
      "1 Cashout lobby remained. The top 2 teams advanced to the Grand Final; the bottom 2 were eliminated.",
  },
  {
    title: "Grand Final",
    flow: "BO5 Final Round Championship Series",
    description:
      "Final Round 3v3 BO5. First team to 3 map wins took the tournament.",
  },
];

const championRoster = ["Kzoe#0633", "NiceBoy#1697", "Pluto#8051"];

const firstPlacePrizes = [
  "3D printed M11",
  "Alien Nade",
  "Cashbox with vault and cashout station",
  "Assortment of sponsor keychains",
];

const prizeImages: PrizeImage[] = [
  {
    src: "/images/prints/june-2026/m11-display.jpg",
    alt: "3D printed M11 prize displayed outdoors for the June 2026 Murph Tournaments event",
    label: "3D Printed M11",
  },
  {
    src: "/images/prints/june-2026/m11-handheld.jpg",
    alt: "Handheld 3D printed M11 prize with sponsor keychain for the June 2026 tournament",
    label: "M11 Detail",
  },
  {
    src: "/images/prints/june-2026/alien-nade.jpg",
    alt: "Green Alien Nade 3D printed prize for the June 2026 Murph Tournaments event",
    label: "Alien Nade",
  },
  {
    src: "/images/prints/june-2026/cashbox-vault-cashout.jpg",
    alt: "Yellow cashbox with vault and cashout station 3D printed prize",
    label: "Cashbox, Vault, Cashout",
  },
  {
    src: "/images/prints/june-2026/cashbox-alien-bundle.jpg",
    alt: "3D printed cashbox, vault, cashout station, and Alien Nade prize bundle",
    label: "Physical Prize Bundle",
  },
  {
    src: "/images/prints/june-2026/sponsor-keychains.jpg",
    alt: "Assorted sponsor keychains printed for the June 2026 Murph Tournaments prize package",
    label: "Sponsor Keychains",
  },
];

const QUICK_NAV = [
  { href: "#overview", label: "Overview" },
  { href: "#format", label: "Format & Rules" },
  { href: "#prizes", label: "Prizes" },
];

export default function JuneTournament2026() {
  return (
    <div>
      <div className="relative overflow-hidden border-b border-[var(--mt-steel-line)] py-16 sm:py-20">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 15% 20%, rgba(201,169,74,0.08), transparent 45%), radial-gradient(circle at 85% 0%, rgba(201,169,74,0.05), transparent 40%)",
          }}
        />
        <div className="container relative z-10">
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
            <div className="max-w-2xl space-y-6">
              <SectionHeading
                level="h1"
                eyebrow="Murph Tournaments Presents"
                title="June 2026 Tournament"
                description="Archived results for the June 28, 2026 THE FINALS tournament: Cashout elimination lobbies, a Final Round BO5 Championship Series, and Seismic crowned as champions."
              />
              <p className="font-mono text-sm font-bold uppercase tracking-widest text-[var(--mt-gold-bright)]">
                June 28, 2026 — 5:00 PM Pacific / 8:00 PM Eastern
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <a href={discordUrl} target="_blank" rel="noopener noreferrer">
                  <CtaButton tone="gold">Join Discord</CtaButton>
                </a>
                <Link href="/tournaments/june-2026/roster">
                  <CtaButton tone="outline">View Event Roster</CtaButton>
                </Link>
              </div>
              <nav
                aria-label="Jump to section"
                className="flex flex-wrap gap-2 pt-2"
              >
                {QUICK_NAV.map(item => (
                  <a
                    key={item.href}
                    href={item.href}
                    className="rounded-md border border-[var(--mt-steel-line)] px-3 py-2 font-mono text-xs uppercase tracking-widest text-[var(--mt-muted)] hover:border-[var(--mt-gold)] hover:text-[var(--mt-gold-bright)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--mt-gold-bright)]"
                  >
                    {item.label}
                  </a>
                ))}
              </nav>
            </div>

            <ChampionCard
              champion={{
                teamName: "Seismic",
                members: championRoster,
                eventName: "June 2026",
              }}
            />
          </div>
        </div>
      </div>

      <section
        id="overview"
        className="scroll-mt-20 border-b border-[var(--mt-steel-line)] py-12 sm:py-16"
      >
        <div className="container">
          <h2 className="mb-4 text-xl font-bold uppercase tracking-wide text-[var(--mt-off-white)]">
            Overview
          </h2>
          <p className="mb-8 max-w-3xl text-sm leading-relaxed text-[var(--mt-muted)]">
            The June Tournament used Cashout elimination lobbies to narrow the
            field from 16 teams to the final 2. Each Cashout lobby eliminated
            the bottom 2 teams, while the top 2 advanced. The final two teams
            then faced off in a Final Round 3v3 Best-of-5 Championship Series.
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {infoCards.map(card => (
              <StatDisplay
                key={card.label}
                label={card.label}
                value={card.value}
              />
            ))}
          </div>
        </div>
      </section>

      <section
        id="format"
        className="scroll-mt-20 border-b border-[var(--mt-steel-line)] py-12 sm:py-16"
      >
        <div className="container">
          <h2 className="mb-4 text-xl font-bold uppercase tracking-wide text-[var(--mt-off-white)]">
            Format &amp; Rules
          </h2>
          <p className="mb-8 max-w-3xl text-sm leading-relaxed text-[var(--mt-muted)]">
            Cashout phase lobbies were 3v3v3v3. Each Cashout lobby eliminated
            the bottom 2 teams, while the top 2 teams advanced. Once a team
            finished bottom 2 in a Cashout lobby, they were eliminated from the
            tournament.
          </p>
          <ol className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {formatRounds.map((round, index) => (
              <li key={round.title} className="mt-panel p-5">
                <p className="font-mono text-xs uppercase tracking-widest text-[var(--mt-gold-bright)]">
                  Stage {index + 1}
                </p>
                <h3 className="mt-1 font-bold uppercase tracking-wide text-[var(--mt-off-white)]">
                  {round.title}
                </h3>
                <p className="mt-1 font-mono text-xs text-[var(--mt-muted)]">
                  {round.flow}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-[var(--mt-muted)]">
                  {round.description}
                </p>
              </li>
            ))}
          </ol>

          <div className="mt-panel mt-6 border-[var(--mt-gold)]/40 p-5">
            <p className="font-mono text-xs font-bold uppercase tracking-widest text-[var(--mt-gold-bright)]">
              Important Format Note
            </p>
            <p className="mt-3 text-sm leading-relaxed text-[var(--mt-muted)]">
              This was not a double-elimination bracket. Once a team finished
              bottom 2 in a Cashout lobby, they were eliminated. The final two
              teams played a Final Round 3v3 Best-of-5 Championship Series.
              First team to 3 map wins became champion. There was no bracket
              reset.
            </p>
          </div>
        </div>
      </section>

      <section id="prizes" className="scroll-mt-20 py-12 sm:py-16">
        <div className="container">
          <h2 className="mb-4 text-xl font-bold uppercase tracking-wide text-[var(--mt-off-white)]">
            Prizes
          </h2>
          <p className="mb-6 max-w-3xl text-sm leading-relaxed text-[var(--mt-muted)]">
            1st place took home the 3D printed prize bundle: M11, Alien Nade,
            Cashbox/Vault/Cashout display pieces, and sponsor keychains.
          </p>
          <div className="mb-10 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {firstPlacePrizes.map(prize => (
              <div
                key={prize}
                className="mt-panel px-4 py-3 text-sm text-[var(--mt-off-white)]"
              >
                {prize}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {prizeImages.map(image => (
              <figure key={image.src} className="mt-panel overflow-hidden">
                <div className="aspect-[4/3] overflow-hidden bg-[var(--mt-black)]">
                  <img
                    src={image.src}
                    alt={image.alt}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </div>
                <figcaption className="px-5 py-4 font-mono text-xs font-bold uppercase tracking-widest text-[var(--mt-gold-bright)]">
                  {image.label}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
