import { useMemo } from 'react';
import PlayerSpotlight from './PlayerSpotlight';
import spotlightData from '@/data/playerSpotlights.json';

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
  accentColor: 'magenta' | 'cyan' | 'gold' | 'lime';
  profileSlug: string;
}

interface SpotlightWeek {
  week: number;
  startDate: string;
  label: string;
  players: SpotlightPlayer[];
}

export default function DynamicPlayerSpotlight() {
  const { currentWeek, players } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize to start of day

    const weeks = spotlightData.weeks as SpotlightWeek[];

    // Find the appropriate week based on current date
    let activeWeek = weeks[0]; // Default to first week until the rotation starts

    for (let i = 0; i < weeks.length; i++) {
      const weekStartDate = new Date(weeks[i].startDate);
      weekStartDate.setHours(0, 0, 0, 0);

      // Check if today is on or after this week's start date
      if (today >= weekStartDate) {
        // Check if there's a next week
        if (i + 1 < weeks.length) {
          const nextWeekStartDate = new Date(weeks[i + 1].startDate);
          nextWeekStartDate.setHours(0, 0, 0, 0);

          // If today is before next week's start, use current week
          if (today < nextWeekStartDate) {
            activeWeek = weeks[i];
            break;
          }
        } else {
          // This is the last week, use it
          activeWeek = weeks[i];
          break;
        }
      }
    }

    return {
      currentWeek: activeWeek.week,
      players: activeWeek.players,
    };
  }, []);

  // Safely map color names to variant types
  const getVariant = (color: string): 'magenta' | 'cyan' | 'gold' | 'lime' => {
    const validVariants: Record<string, 'magenta' | 'cyan' | 'gold' | 'lime'> = {
      magenta: 'magenta',
      cyan: 'cyan',
      gold: 'gold',
      lime: 'lime',
    };
    return validVariants[color] || 'magenta';
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
                { label: 'K/D', value: player.kd.toFixed(2) },
                { label: 'Win Rate', value: `${player.winRate}%` },
                { label: 'Level', value: player.level.toString() },
                { label: 'Hours', value: player.hours.toString() },
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
