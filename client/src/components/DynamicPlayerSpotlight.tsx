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
 * Whole days since the epoch for an instant, in UTC.
 *
 * The rotation has to be compared in a single time zone. A `startDate` like
 * "2026-04-06" is parsed by `new Date` as UTC midnight, so normalizing the
 * other side of the comparison with `setHours(0,0,0,0)` — which is local —
 * mixed the two: west of UTC the week start landed on the previous local day
 * and the spotlight rotated up to a day early. UTC for both sides also means
 * every viewer worldwide changes week at the same moment.
 */
function utcDayNumber(value: Date) {
  return Math.floor(value.getTime() / 86_400_000);
}

/**
 * The week whose window contains `today`, falling back to the first week
 * before the rotation starts and holding on the last week after it ends.
 * Exported so the rotation is tested directly rather than reimplemented.
 */
export function calculateCurrentWeek<T extends { startDate: string }>(
  today: Date,
  weeks: T[]
): T {
  const todayDay = utcDayNumber(today);
  let activeWeek = weeks[0]; // Default to first week until the rotation starts

  for (let i = 0; i < weeks.length; i++) {
    const weekStartDay = utcDayNumber(new Date(weeks[i].startDate));
    if (todayDay < weekStartDay) continue;

    const next = weeks[i + 1];
    if (!next) {
      activeWeek = weeks[i];
      break;
    }
    if (todayDay < utcDayNumber(new Date(next.startDate))) {
      activeWeek = weeks[i];
      break;
    }
  }

  return activeWeek;
}

export default function DynamicPlayerSpotlight() {
  const { currentWeek, players } = useMemo(() => {
    const weeks = spotlightData.weeks as SpotlightWeek[];
    const activeWeek = calculateCurrentWeek(new Date(), weeks);

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
