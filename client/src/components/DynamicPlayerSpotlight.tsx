import { useMemo } from "react";
import PlayerSpotlight from "./PlayerSpotlight";
import spotlightData from "@/data/playerSpotlights.json";

/**
 * DynamicPlayerSpotlight Component
 * Automatically rotates player spotlights based on the current week
 * - Fetches data from playerSpotlights.json
 * - Calculates current week based on startDate
 * - Displays 3 featured players
 * - Falls back to latest week if no future week exists
 */

interface SpotlightPlayer {
  playerName: string;
  titleTagline: string;
  level: number;
  hours: number;
  kd: number;
  winRate: number;
  achievement1: string;
  achievement2: string;
  achievement3: string;
  accentColor: "magenta" | "cyan" | "gold" | "lime";
  profileSlug: string;
}

interface SpotlightWeek {
  week: number;
  startDate: string;
  label: string;
  players: SpotlightPlayer[];
}

/**
 * Parses a `YYYY-MM-DD` spotlight start date as a LOCAL calendar date.
 *
 * `new Date("2026-04-13")` parses as UTC midnight, so in any timezone behind
 * UTC that instant falls on April 12 locally and the rotation advances a day
 * early. Building the date from its parts keeps it anchored to the local day.
 */
function parseLocalStartDate(startDate: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(startDate.trim());
  if (!match) {
    const fallback = new Date(startDate);
    fallback.setHours(0, 0, 0, 0);
    return fallback;
  }
  const [, year, month, day] = match;
  return new Date(Number(year), Number(month) - 1, Number(day));
}

/**
 * Picks the spotlight week active on `today`.
 *
 * Falls back to the first week before the rotation starts and holds on the
 * last week once it has begun.
 */
export function calculateCurrentWeek(
  today: Date,
  weeks: SpotlightWeek[]
): SpotlightWeek {
  const normalizedToday = new Date(today);
  normalizedToday.setHours(0, 0, 0, 0);

  let activeWeek = weeks[0]; // Default to first week until the rotation starts

  for (let i = 0; i < weeks.length; i++) {
    const weekStartDate = parseLocalStartDate(weeks[i].startDate);
    if (normalizedToday < weekStartDate) continue;

    const nextWeek = weeks[i + 1];
    if (!nextWeek) {
      activeWeek = weeks[i];
      break;
    }
    if (normalizedToday < parseLocalStartDate(nextWeek.startDate)) {
      activeWeek = weeks[i];
      break;
    }
  }

  return activeWeek;
}

export default function DynamicPlayerSpotlight() {
  const { currentWeek, players } = useMemo(() => {
    const activeWeek = calculateCurrentWeek(
      new Date(),
      spotlightData.weeks as SpotlightWeek[]
    );

    return {
      currentWeek: activeWeek.week,
      players: activeWeek.players,
    };
  }, []);

  // Safely map color names to variant types
  const getVariant = (color: string): "magenta" | "cyan" | "gold" | "lime" => {
    const validVariants: Record<string, "magenta" | "cyan" | "gold" | "lime"> =
      {
        magenta: "magenta",
        cyan: "cyan",
        gold: "gold",
        lime: "lime",
      };
    return validVariants[color] || "magenta";
  };

  if (!players || players.length === 0) {
    return null; // Gracefully handle missing data
  }

  return (
    <section className="py-16 md:py-24 border-t border-neon-magenta/20">
      <div className="container">
        <h2 className="text-4xl font-bold font-mono text-neon-gold mb-12 uppercase tracking-widest">
          Player Spotlight — Week {currentWeek}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {players.map((player, idx) => (
            <PlayerSpotlight
              key={idx}
              name={player.playerName}
              role={player.titleTagline}
              rank={`Lvl ${player.level} • ${player.hours} hrs`}
              achievements={[
                player.achievement1,
                player.achievement2,
                player.achievement3,
              ]}
              stats={[
                { label: "K/D", value: player.kd.toFixed(2) },
                { label: "Win Rate", value: `${player.winRate}%` },
                { label: "Level", value: player.level.toString() },
                { label: "Hours", value: player.hours.toString() },
              ]}
              variant={getVariant(player.accentColor)}
              href={`/player/${player.profileSlug}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
