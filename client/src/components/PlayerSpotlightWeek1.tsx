import React from 'react';

interface PlayerCardProps {
  name: string;
  level: number;
  hours: number;
  kd: number;
  winRate: number;
  tag: string;
  description: string;
}

export default function PlayerSpotlightWeek1({ name, level, hours, kd, winRate, tag, description }: PlayerCardProps) {
  return (
    <div className="group relative">
      {/* Card Container */}
      <div className="relative bg-dark-charcoal border border-neon-gold/40 rounded-sm p-6 transition-all duration-300 hover:border-neon-gold hover:shadow-lg hover:shadow-neon-gold/20 hover:scale-105">
        {/* Subtle glow on hover */}
        <div className="absolute inset-0 bg-gradient-to-br from-neon-gold/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-sm" />

        {/* Content */}
        <div className="relative z-10 space-y-4">
          {/* Player Name */}
          <h3 className="text-2xl font-bold font-mono text-neon-gold uppercase tracking-wider">
            {name}
          </h3>

          {/* Level & Hours */}
          <p className="text-sm text-white/70 font-mono">
            Lvl {level} • {hours} hrs
          </p>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4 py-4 border-y border-neon-gold/20">
            <div>
              <p className="text-xs text-white/50 font-mono uppercase tracking-widest mb-1">K/D</p>
              <p className="text-lg font-bold text-neon-cyan font-mono">{kd.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-white/50 font-mono uppercase tracking-widest mb-1">Win Rate</p>
              <p className="text-lg font-bold text-neon-magenta font-mono">{winRate}%</p>
            </div>
          </div>

          {/* Role Tag */}
          <div className="inline-block">
            <span className="px-3 py-1 bg-neon-gold/10 border border-neon-gold/50 text-neon-gold text-xs font-bold font-mono uppercase tracking-widest rounded-sm">
              {tag}
            </span>
          </div>

          {/* Description */}
          <p className="text-sm text-white/80 font-mono leading-relaxed">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}
