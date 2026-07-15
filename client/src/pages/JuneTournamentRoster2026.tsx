import { Link } from "wouter";
import SectionHeading from "@/components/public/SectionHeading";
import StatDisplay from "@/components/public/StatDisplay";
import CtaButton from "@/components/public/CtaButton";
import { discordUrl } from "./JuneTournament2026";

interface RosterTeam {
  id: number;
  name: string;
  captain: string;
  players: readonly string[];
  substitute?: string;
}

const rosterTeams: readonly RosterTeam[] = [
  {
    id: 1,
    name: "Daystar",
    captain: "Mike#2590",
    players: ["Jerahmeel#8692", "straightkix.ttv#5818"],
  },
  {
    id: 2,
    name: "Dojo Of Fao",
    captain: "Wei_Faostest#2505",
    players: ["Wei_Faoster#0592", "Wei_Fao#4674"],
    substitute: "Wei_Faostify#9907",
  },
  {
    id: 3,
    name: "Seismic",
    captain: "Kzoe#0633",
    players: ["NiceBoy#1697", "Pluto#8051"],
  },
  {
    id: 4,
    name: "SHOOTERZ ONLY",
    captain: "MISFIT_GM#5193",
    players: ["Boog2SmootgYFS#5600", "Alwayscapone#9684"],
  },
  {
    id: 5,
    name: "BTRR",
    captain: "SKIEZ#9272",
    players: ["twitch.dawnIGN#0574", "Zuex#2198"],
  },
  {
    id: 6,
    name: "Aura LLC",
    captain: "udrakoni#9522",
    players: ["joewoahseph#8833", "Spuze_TTV#1856"],
  },
  {
    id: 7,
    name: "Axoloto",
    captain: "ZeToniez#3134",
    players: ["Diamond#2842", "Rex#7110"],
  },
  {
    id: 8,
    name: "Auntie's Goo Bois",
    captain: "ekazo#5318",
    players: ["appoh#9173", "kdkiller6021#4000"],
  },
  {
    id: 9,
    name: "Team Obsidian",
    captain: "Prodigy#3252",
    players: ["Tron#8189", "Shinobi#3743"],
    substitute: "Heegoo#0606",
  },
  {
    id: 10,
    name: "spynix",
    captain: "Ronthedon.tt#0093",
    players: ["SkilfulPython10#1048", "Yaboiivo#1975"],
    substitute: "Femboy_enjoyer#8043",
  },
  {
    id: 11,
    name: "That one team",
    captain: "Merchant#0469",
    players: ["Sushi_noob#0598", "Ttvjiggypiggy#7424"],
  },
  {
    id: 12,
    name: "Opall Esports",
    captain: "INVINCIBLE#5854",
    players: ["NXT#8501", "TTV_Cloudy6166#9524"],
    substitute: "ImSleepy_ttv#0414",
  },
  {
    id: 13,
    name: "Sup3r Mario Bro's",
    captain: "BMvrph#7255",
    players: ["SUP3R#5259", "Mario_vmanTTV#9301"],
  },
  {
    id: 14,
    name: "Friends With Benefits",
    captain: "Naithehunter#1037",
    players: ["Sokudo#0731", "Stikythecreator#7704"],
  },
  {
    id: 15,
    name: "Paragon",
    captain: "DrownninYoAhh#0014",
    players: ["Kittkats#6384", "xsuddenstarxttv#9105"],
  },
  {
    id: 16,
    name: "PIKE",
    captain: "cooldude225#6846",
    players: ["Disposablethumbs#4624", "GabehornIII#8880"],
  },
];

const statCards = [
  { label: "Registered Teams", value: "16" },
  { label: "Starting Players", value: "48" },
  { label: "Registered Substitutes", value: "5" },
];

export default function JuneTournamentRoster2026() {
  return (
    <div>
      <div className="border-b border-[var(--mt-steel-line)] py-16 sm:py-20">
        <div className="container">
          <div className="max-w-4xl space-y-6">
            <SectionHeading
              level="h1"
              eyebrow="Murph Tournaments Presents"
              title="June 2026 Event Roster"
              description="The full 16-team field for the completed June Tournament, archived for public reference alongside event results."
            />
            <p className="font-mono text-sm font-bold uppercase tracking-widest text-[var(--mt-gold-bright)]">
              June 28, 2026 — 5 PM Pacific / 8 PM Eastern
            </p>
            <div className="grid max-w-2xl grid-cols-3 gap-3">
              {statCards.map(stat => (
                <StatDisplay
                  key={stat.label}
                  label={stat.label}
                  value={stat.value}
                />
              ))}
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/tournaments/june-2026">
                <CtaButton tone="outline">Back to Tournament Details</CtaButton>
              </Link>
              <a href={discordUrl} target="_blank" rel="noopener noreferrer">
                <CtaButton tone="gold">Join Discord</CtaButton>
              </a>
            </div>
          </div>
        </div>
      </div>

      <section className="py-12 sm:py-16">
        <div className="container">
          <h2 className="mb-2 text-xl font-bold uppercase tracking-wide text-[var(--mt-off-white)]">
            Tournament Roster
          </h2>
          <p className="mb-8 max-w-2xl text-sm text-[var(--mt-muted)]">
            Teams are listed in registration order. This display is not
            tournament seeding.
          </p>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {rosterTeams.map(team => (
              <div key={team.id} className="mt-panel flex h-full flex-col p-5">
                <p className="mb-2 font-mono text-[11px] uppercase tracking-widest text-[var(--mt-muted)]">
                  Registered Team {String(team.id).padStart(2, "0")}
                </p>
                <h3 className="mb-4 text-lg font-bold text-[var(--mt-off-white)]">
                  {team.name}
                </h3>
                <ul
                  className="flex-1 space-y-2"
                  aria-label={`${team.name} starting players`}
                >
                  <li className="rounded border border-[var(--mt-gold)]/25 bg-[var(--mt-charcoal-raised)] px-3 py-2">
                    <p className="mb-0.5 font-mono text-[10px] font-bold uppercase tracking-widest text-[var(--mt-gold-bright)]">
                      Team Leader
                    </p>
                    <p className="break-words text-sm text-[var(--mt-off-white)]">
                      {team.captain}
                    </p>
                  </li>
                  {team.players.map(player => (
                    <li
                      key={`${team.id}-${player}`}
                      className="rounded border border-[var(--mt-steel-line)] bg-[var(--mt-charcoal)] px-3 py-2"
                    >
                      <p className="mb-0.5 font-mono text-[10px] uppercase tracking-widest text-[var(--mt-muted)]">
                        Starting Player
                      </p>
                      <p className="break-words text-sm text-[var(--mt-off-white)]">
                        {player}
                      </p>
                    </li>
                  ))}
                </ul>
                {team.substitute ? (
                  <div className="mt-4 border-t border-[var(--mt-steel-line)] pt-4">
                    <div className="rounded border border-[var(--mt-steel-line)] bg-[var(--mt-charcoal-raised)] px-3 py-2">
                      <p className="mb-0.5 font-mono text-[10px] uppercase tracking-widest text-[var(--mt-muted)]">
                        Substitute
                      </p>
                      <p className="break-words text-sm text-[var(--mt-off-white)]">
                        {team.substitute}
                      </p>
                    </div>
                  </div>
                ) : null}
              </div>
            ))}
          </div>

          <div className="mt-panel mt-10 flex flex-col items-start gap-4 p-6 lg:flex-row lg:items-center lg:justify-between">
            <p className="max-w-3xl text-sm leading-relaxed text-[var(--mt-muted)]">
              Registration and standby entries for the June 2026 event are
              closed. This roster remains available as an archive of the
              completed tournament field.
            </p>
            <a
              href={discordUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0"
            >
              <CtaButton tone="outline">Join Discord for Updates</CtaButton>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
