import { Link } from "wouter";
import PageHero from "@/components/public/PageHero";
import SectionHeading from "@/components/public/SectionHeading";
import ChampionCard from "@/components/public/ChampionCard";
import ResultCard, {
  type ResultCardData,
} from "@/components/public/ResultCard";
import { fclReplays } from "@/data/fclReplays";

const fclReplayRoutes = {
  day3: `/watch/fcl/${fclReplays[0].slug}`,
  day4: `/watch/fcl/${fclReplays[1].slug}`,
  day5: `/watch/fcl/${fclReplays[2].slug}`,
  day6: `/watch/fcl/${fclReplays[3].slug}`,
};

/** The June 2026 event lives on its own dedicated page/roster (real content,
 * not duplicated here) but chronologically it's the most recent completed
 * tournament, so it's cross-linked at the top of the archive list. */
const juneEntry: ResultCardData = {
  name: "June 2026 Tournament",
  dateLabel: "June 28, 2026",
  winners: "Seismic — Kzoe#0633, NiceBoy#1697, Pluto#8051",
  format: "Cashout Elim → BO5 Final",
  teams: 16,
  prizePool: "3D Printed Prize Bundle",
  actions: [
    { label: "View Tournament Details", href: "/tournaments/june-2026" },
    {
      label: "Watch Replay",
      href: "https://www.twitch.tv/videos/2807784152",
    },
  ],
};

const pastTournaments: ResultCardData[] = [
  {
    name: "FCL – Day 6 (Grand Finals)",
    dateLabel: "February 6, 2026",
    teams: 8,
    prizePool: "Community-funded",
    winners: "1 Up - EkaZo, KDKiller, JukerTTV",
    format: "Finals Contender League, Grand Finals",
    description:
      "The grand finals of the Finals Contender League. 1 Up claimed the championship title after 5 weeks of league play.",
    actions: [{ label: "Watch Replay", href: fclReplayRoutes.day6 }],
  },
  {
    name: "FCL – Day 5",
    dateLabel: "January 31, 2026",
    teams: 8,
    prizePool: "Community-funded",
    winners: "TBD",
    format: "Finals Contender League",
    description:
      "Day 5 of the Finals Contender League. League play week with no individual day winner.",
    actions: [{ label: "Watch Replay", href: fclReplayRoutes.day5 }],
  },
  {
    name: "FCL – Day 4",
    dateLabel: "January 24, 2026",
    teams: 8,
    prizePool: "Community-funded",
    winners: "TBD",
    format: "Finals Contender League",
    description:
      "Day 4 of the Finals Contender League. League play week with no individual day winner.",
    actions: [{ label: "Watch Replay", href: fclReplayRoutes.day4 }],
  },
  {
    name: "FCL – Day 3",
    dateLabel: "January 17, 2026",
    teams: 8,
    prizePool: "Community-funded",
    winners: "TBD",
    format: "Finals Contender League",
    description:
      "Day 3 of the Finals Contender League. League play week with no individual day winner.",
    actions: [{ label: "Watch Replay", href: fclReplayRoutes.day3 }],
  },
  {
    name: "FCL – Day 2",
    dateLabel: "January 10, 2026",
    teams: 8,
    prizePool: "Community-funded",
    winners: "TBD",
    format: "Finals Contender League",
    description:
      "Day 2 of the Finals Contender League. League play week with no individual day winner.",
  },
  {
    name: "FCL – Launch Day",
    dateLabel: "January 3, 2026",
    teams: 8,
    prizePool: "Community-funded",
    winners: "TBD",
    format: "Finals Contender League",
    description:
      "The inaugural day of the Finals Contender League. League play week with no individual day winner.",
  },
  {
    name: "Murph Monthly – September",
    dateLabel: "September 5, 2025",
    teams: 8,
    prizePool: "$175 cash + 3x $10 Embark codes",
    winners: "FAFO - n0rmalize, mojoflojo, brizz",
    format: "Invite Only, Final Round, Double Elimination (BO1)",
    description:
      "An exclusive event returning to the original style with invite-only slots.",
  },
  {
    name: "July Showdown",
    dateLabel: "July 26, 2025",
    teams: 8,
    prizePool: "Community-funded (starting at $100)",
    winners: "Deadlyalzheimers, greenhazard44, neoncey",
    format: "Final Round, Double Elimination, BO3",
    description:
      "Community-driven event introducing Best-of-3 by popular demand.",
  },
  {
    name: "Tournament XI – Coach vs. Coach",
    dateLabel: "June 27, 2025",
    teams: 4,
    prizePool: "$240 total ($60 per player on winning team)",
    winners:
      "Team Purestrafez - Pookie#6485, CronusToBronze#0913, lyonleadz#4172",
    format: "Final Round, Double Elimination, BO1",
    description:
      "Unique format where Ruby-ranked coaches led randomly drafted teams.",
  },
  {
    name: "Tournament X",
    dateLabel: "May 31, 2025",
    teams: 8,
    prizePool: "$180 (1st) + cosmetic reward (2nd)",
    winners: "Your Moms Fav - Brendy, Sponz, WhenImWinchU",
    format: "Cashout → Final Round, Double Elimination, BO1",
    description:
      "A milestone event, drawing one of the largest audiences to date.",
  },
  {
    name: "Murph Tournament IX",
    dateLabel: "May 10, 2025",
    teams: 10,
    prizePool: "$200 ($100 per winning duo)",
    winners: "Tiger, Honor",
    format: "2v2 Final Round, Double Elimination, BO1",
    description:
      "A special edition with custom rules, shifting focus to duo play.",
  },
  {
    name: "Murph Tournament VIII",
    dateLabel: "April 19, 2025",
    teams: 8,
    prizePool: "$150 (1st) + $120 (2nd)",
    winners:
      "Honorbound Aces - MuntMaster1108#6005, aidan1000p#0502, honor#3665",
    format: "Cashout → Final Round",
    description:
      "Featured solo-queue signups, creating diverse team compositions.",
  },
  {
    name: "Murph Tournament VII",
    dateLabel: "March 28, 2025",
    teams: 8,
    prizePool: "$225 (1st) + 1150 Multibucks (additional placement)",
    winners: "4th Party Cashbox - kafeneio, sirgnal, brutal_logic",
    format: "Cashout → Final Round, BO1",
    description:
      "Streamlined hybrid format with smooth progression from Cashout to Finals.",
  },
  {
    name: "Murph Tournament VI",
    dateLabel: "March 8, 2025",
    teams: 8,
    prizePool: "$165 (1st) + 1150 Multibucks (2nd each)",
    winners:
      "The Empty Mags — Moggyplays#9465, HeatTazz#5051, Naithehunter#1031",
    format: "Cashout → Final Round, Double Elimination, BO1",
    description:
      "Balanced hybrid event, combining Cashout with structured Finals.",
  },
  {
    name: "Murph Tournament V",
    dateLabel: "February 21, 2025",
    teams: 8,
    prizePool: "$120 (1st) + $50 (2nd)",
    winners: "TRAFFY#4065, purestrafez, MuntMaster1108#6005",
    format: "Final Round (3v3), Double Elimination, BO1",
    description:
      "The third consecutive Final Round-only tournament, heightening rivalries.",
  },
  {
    name: "Murph Tournament IV",
    dateLabel: "February 7, 2025",
    teams: 8,
    prizePool: "$180 (1st) + $60 (2nd)",
    winners: "pinhead, bongo#2748, Mydadbeetzmehrd#0813",
    format: "Final Round (3v3), Double Elimination, BO1",
    description: "Continued with the Final Round format, building consistency.",
  },
  {
    name: "Murph Tournament III",
    dateLabel: "January 24, 2025",
    teams: 6,
    prizePool: "$125 (1st place total)",
    winners: "purestrafez, xSuddenStarxTTV#6709, TRAFFY#4065",
    format: "Final Round (3v3), Double Elimination, BO1",
    description: "Focused exclusively on Final Round gameplay.",
  },
  {
    name: "Murph Tournament II",
    dateLabel: "January 17, 2025",
    teams: 8,
    prizePool: "$240 (1st) + $120 (2nd)",
    winners: "The High Notes — bongo#2748, Mydadbeetzmehrd#0813, pinhead",
    format: "Cashout → Final Round, Double Elimination, BO1",
    description: "Introduced a hybrid format modeled after ranked play.",
  },
  {
    name: "Murph Tournament I",
    dateLabel: "January 4, 2025",
    teams: 8,
    prizePool: "No Prize Pool",
    winners: "Murph, Lazerbladez",
    format: "Final Round (3v3), Double Elimination, BO1",
    description:
      "The first Murph Tournament, setting the foundation for competitive community events.",
  },
];

export default function TournamentHistory() {
  return (
    <div>
      <PageHero>
        <SectionHeading
          level="h1"
          eyebrow="Archive"
          title="Results &amp; Champions"
          description="Murph Tournaments has hosted the Finals Contender League (FCL) and 13 Murph Tournaments, establishing a track record of professional production, fair competition, and consistent prize pools."
        />
        <ChampionCard
          champion={{
            teamName: "Seismic",
            members: ["Kzoe#0633", "NiceBoy#1697", "Pluto#8051"],
            eventName: "June 2026 (Most Recent)",
          }}
        />
      </PageHero>

      <section className="py-12 sm:py-16">
        <div className="container">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-xl font-bold uppercase tracking-wide text-[var(--mt-off-white)]">
              Full Results History
            </h2>
            <Link href="/tournaments/community">
              <span className="font-mono text-xs font-bold uppercase tracking-widest text-[var(--mt-gold-bright)] hover:underline">
                Browse Live &amp; Upcoming Tournaments →
              </span>
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <ResultCard result={juneEntry} />
            {pastTournaments.map(tournament => (
              <ResultCard key={tournament.name} result={tournament} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
