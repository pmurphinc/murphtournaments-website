import NeonCard from './NeonCard';

/**
 * PlayerSpotlight Component
 * Cyberpunk Neon Rebellion Design
 * - Featured player/team showcase
 * - Rotating spotlights
 * - Stats and achievements
 */

interface PlayerSpotlightProps {
  name: string;
  role: string;
  rank: string;
  achievements: string[];
  stats?: {
    label: string;
    value: string;
  }[];
  variant?: 'magenta' | 'cyan' | 'gold' | 'lime';
}

export default function PlayerSpotlight({
  name,
  role,
  rank,
  achievements,
  stats,
  variant = 'magenta',
}: PlayerSpotlightProps) {
  return (
    <NeonCard variant={variant}>
      <div className="space-y-4">
        {/* Header */}
        <div className="border-b border-white/10 pb-4">
          <div className="text-xs font-mono text-white/50 uppercase tracking-widest mb-2">
            Player Spotlight
          </div>
          <h3 className="text-2xl font-bold font-mono text-white mb-1">{name}</h3>
          <p className="text-sm font-mono text-white/60">{role}</p>
          <div className="mt-2 inline-block px-3 py-1 bg-white/10 rounded-sm">
            <p className="text-xs font-mono text-white/80 uppercase tracking-widest">{rank}</p>
          </div>
        </div>

        {/* Achievements */}
        {achievements.length > 0 && (
          <div>
            <p className="text-xs font-mono text-white/50 uppercase tracking-widest mb-2">
              Achievements
            </p>
            <ul className="space-y-1">
              {achievements.map((achievement, idx) => (
                <li key={idx} className="text-sm font-mono text-white/70">
                  • {achievement}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Stats */}
        {stats && stats.length > 0 && (
          <div className="border-t border-white/10 pt-4">
            <p className="text-xs font-mono text-white/50 uppercase tracking-widest mb-3">
              Stats
            </p>
            <div className="grid grid-cols-2 gap-3">
              {stats.map((stat, idx) => (
                <div key={idx}>
                  <p className="text-xs text-white/50 font-mono mb-1">{stat.label}</p>
                  <p className="text-lg font-bold font-mono text-white">{stat.value}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </NeonCard>
  );
}
