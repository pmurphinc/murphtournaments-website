import { Link } from 'wouter';

/**
 * NextEventBanner Component
 * Cyberpunk Neon Rebellion Design
 * - Prominent next event announcement
 * - Sticky or prominent placement
 * - Call-to-action for tournament signup
 */

interface NextEventBannerProps {
  eventName: string;
  date: string;
  time: string;
  format: string;
  prizePool: string;
}

export default function NextEventBanner({
  eventName,
  date,
  time,
  format,
  prizePool,
}: NextEventBannerProps) {
  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-dark-purple via-dark-charcoal to-dark-purple border-2 border-neon-magenta/50 rounded-sm p-6 md:p-8">
      {/* Animated background scan lines */}
      <div className="absolute inset-0 scan-lines opacity-5 pointer-events-none" />

      {/* Content */}
      <div className="relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          {/* Left: Event Info */}
          <div className="flex-1">
            <div className="inline-block px-3 py-1 bg-neon-magenta/20 border border-neon-magenta rounded-sm mb-3">
              <p className="text-xs font-mono text-neon-magenta uppercase tracking-widest font-bold">
                Next Event
              </p>
            </div>

            <h3 className="text-3xl md:text-4xl font-bold font-mono text-neon-magenta mb-4">
              {eventName}
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div>
                <p className="text-xs text-white/50 font-mono uppercase tracking-widest mb-1">
                  Date
                </p>
                <p className="text-sm font-bold font-mono text-neon-cyan">{date}</p>
              </div>
              <div>
                <p className="text-xs text-white/50 font-mono uppercase tracking-widest mb-1">
                  Time
                </p>
                <p className="text-sm font-bold font-mono text-neon-cyan">{time}</p>
              </div>
              <div>
                <p className="text-xs text-white/50 font-mono uppercase tracking-widest mb-1">
                  Format
                </p>
                <p className="text-sm font-bold font-mono text-neon-gold">{format}</p>
              </div>
              <div>
                <p className="text-xs text-white/50 font-mono uppercase tracking-widest mb-1">
                  Prize Pool
                </p>
                <p className="text-sm font-bold font-mono text-neon-lime">{prizePool}</p>
              </div>
            </div>
          </div>

          {/* Right: CTA */}
          <div className="flex flex-col gap-3 w-full md:w-auto">
            <a href="https://discord.gg/kcmdxmBgnC" target="_blank" rel="noopener noreferrer">
              <button className="w-full md:w-auto px-8 py-3 bg-neon-magenta text-dark-black font-bold font-mono uppercase tracking-widest hover-glow-magenta rounded-sm transition-all">
                Join Discord
              </button>
            </a>
            <Link href="/tournaments">
              <button className="w-full md:w-auto px-8 py-3 border-2 border-neon-magenta text-neon-magenta font-bold font-mono uppercase tracking-widest hover-glow-magenta rounded-sm transition-all">
                View Details
              </button>
            </Link>
          </div>
        </div>
      </div>

      {/* Decorative corner elements */}
      <div className="absolute top-0 right-0 w-32 h-32 border-2 border-neon-magenta/10 rounded-bl-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-24 h-24 border-2 border-neon-cyan/10 rounded-tr-full pointer-events-none" />
    </div>
  );
}
