'use client';

import NeonCard from '@/components/NeonCard';
import GlitchText from '@/components/GlitchText';
import { useState, useMemo } from 'react';
import { ChevronDown, TrendingUp } from 'lucide-react';
import { Link } from 'wouter';
import { PLAYERS } from '@/data/players';

type SortKey = 'name' | 'level' | 'hours' | 'kd' | 'winRate' | 'matches';

export default function PlayerArchive() {
  const [expandedPlayers, setExpandedPlayers] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<SortKey>('kd');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const sortedPlayers = useMemo(() => {
    const sorted = [...PLAYERS].sort((a, b) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];
      
      if (typeof aVal === 'string') {
        aVal = (aVal as string).toLowerCase();
        bVal = (bVal as string).toLowerCase();
      }
      
      if (sortOrder === 'desc') {
        return (bVal as any) - (aVal as any);
      } else {
        return (aVal as any) - (bVal as any);
      }
    });
    return sorted;
  }, [sortBy, sortOrder]);

  const toggleSort = (key: SortKey) => {
    if (sortBy === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(key);
      setSortOrder('desc');
    }
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString();
  };

  return (
    <div className="min-h-screen bg-dark-charcoal py-12 px-4">
      <div className="container max-w-6xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <GlitchText size="2xl" variant="cyan">
            PLAYER ARCHIVE
          </GlitchText>
          <p className="text-neon-magenta font-mono">Competitive Player Statistics & Career Records</p>
        </div>

        {/* Sort Controls */}
        <div className="flex flex-wrap gap-2 justify-center overflow-x-auto pb-2">
          <button
            onClick={() => toggleSort('kd')}
            className={`px-3 sm:px-4 py-2 font-mono text-xs sm:text-sm uppercase border-2 transition-colors whitespace-nowrap ${
              sortBy === 'kd'
                ? 'border-neon-cyan bg-neon-cyan text-dark-charcoal'
                : 'border-neon-cyan text-neon-cyan hover:bg-neon-cyan/10'
            }`}
          >
            K/D {sortBy === 'kd' && (sortOrder === 'desc' ? '↓' : '↑')}
          </button>
          <button
            onClick={() => toggleSort('winRate')}
            className={`px-3 sm:px-4 py-2 font-mono text-xs sm:text-sm uppercase border-2 transition-colors whitespace-nowrap ${
              sortBy === 'winRate'
                ? 'border-neon-magenta bg-neon-magenta text-dark-charcoal'
                : 'border-neon-magenta text-neon-magenta hover:bg-neon-magenta/10'
            }`}
          >
            Win% {sortBy === 'winRate' && (sortOrder === 'desc' ? '↓' : '↑')}
          </button>
          <button
            onClick={() => toggleSort('matches')}
            className={`px-3 sm:px-4 py-2 font-mono text-xs sm:text-sm uppercase border-2 transition-colors whitespace-nowrap ${
              sortBy === 'matches'
                ? 'border-neon-gold bg-neon-gold text-dark-charcoal'
                : 'border-neon-gold text-neon-gold hover:bg-neon-gold/10'
            }`}
          >
            Matches {sortBy === 'matches' && (sortOrder === 'desc' ? '↓' : '↑')}
          </button>
          <button
            onClick={() => toggleSort('level')}
            className={`px-3 sm:px-4 py-2 font-mono text-xs sm:text-sm uppercase border-2 transition-colors whitespace-nowrap ${
              sortBy === 'level'
                ? 'border-neon-lime bg-neon-lime text-dark-charcoal'
                : 'border-neon-lime text-neon-lime hover:bg-neon-lime/10'
            }`}
          >
            Level {sortBy === 'level' && (sortOrder === 'desc' ? '↓' : '↑')}
          </button>
        </div>

        {/* Player List */}
        <div className="space-y-2">
          {sortedPlayers.map((player) => {
            const isExpanded = expandedPlayers.has(player.name);
            return (
              <NeonCard key={player.name} variant="magenta" className="p-0 overflow-hidden">
                <button
                  onClick={() => {
                    const newExpanded = new Set(expandedPlayers);
                    if (newExpanded.has(player.name)) {
                      newExpanded.delete(player.name);
                    } else {
                      newExpanded.add(player.name);
                    }
                    setExpandedPlayers(newExpanded);
                  }}
                  className="w-full p-3 sm:p-4 flex items-center justify-between hover:bg-neon-magenta/10 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 flex-1 text-left">
                    <Link href={`/player/${player.name.toLowerCase()}`}>
                      <span className="font-bold text-white font-mono text-lg hover:text-neon-magenta hover-glow-magenta transition-colors cursor-pointer">{player.name}</span>
                    </Link>
                    <div className="flex flex-wrap gap-3 sm:gap-6 text-xs sm:text-sm font-mono text-white/80">
                      <div>
                        <span className="text-neon-cyan">K/D:</span> {player.kd.toFixed(2)}
                      </div>
                      <div>
                        <span className="text-neon-gold">Win:</span> {player.winRate.toFixed(1)}%
                      </div>
                      <div>
                        <span className="text-neon-lime">Level:</span> {player.level}
                      </div>
                      <div className="hidden sm:block">
                        <span className="text-neon-magenta">Matches:</span> {formatNumber(player.matches)}
                      </div>
                    </div>
                  </div>
                  <ChevronDown
                    size={20}
                    className={`text-neon-magenta transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`}
                  />
                </button>

                {isExpanded && (
                  <div className="bg-dark-charcoal/50 p-4 sm:p-6 border-t border-neon-magenta/50 space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 text-xs sm:text-sm font-mono">
                      <div>
                        <p className="text-neon-cyan text-xs uppercase mb-1">Level</p>
                        <p className="text-white text-base sm:text-lg font-bold">{player.level}</p>
                      </div>
                      <div>
                        <p className="text-neon-magenta text-xs uppercase mb-1">Hours</p>
                        <p className="text-white text-base sm:text-lg font-bold">{formatNumber(player.hours)}</p>
                      </div>
                      <div>
                        <p className="text-neon-gold text-xs uppercase mb-1">Matches</p>
                        <p className="text-white text-base sm:text-lg font-bold">{formatNumber(player.matches)}</p>
                      </div>
                      <div>
                        <p className="text-neon-lime text-xs uppercase mb-1">Win %</p>
                        <p className="text-white text-base sm:text-lg font-bold">{player.winRate.toFixed(1)}%</p>
                      </div>
                    </div>

                    <div className="border-t border-neon-magenta/30 pt-4 grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 text-xs sm:text-sm font-mono">
                      <div>
                        <p className="text-white/60 text-xs uppercase mb-1">Wins / Losses</p>
                        <p className="text-white">{formatNumber(player.wins)} / {formatNumber(player.losses)}</p>
                      </div>
                      <div>
                        <p className="text-white/60 text-xs uppercase mb-1">Eliminations</p>
                        <p className="text-white">{formatNumber(player.elims)}</p>
                      </div>
                      <div>
                        <p className="text-white/60 text-xs uppercase mb-1">Deaths</p>
                        <p className="text-white">{formatNumber(player.deaths)}</p>
                      </div>
                      <div>
                        <p className="text-white/60 text-xs uppercase mb-1">Revives</p>
                        <p className="text-white">{formatNumber(player.revives)}</p>
                      </div>
                      <div>
                        <p className="text-white/60 text-xs uppercase mb-1">Cashout</p>
                        <p className="text-white">${formatNumber(player.cashout)}</p>
                      </div>
                      <div>
                        <p className="text-white/60 text-xs uppercase mb-1">Damage</p>
                        <p className="text-white">{formatNumber(player.damage)}</p>
                      </div>
                    </div>
                  </div>
                )}
              </NeonCard>
            );
          })}
        </div>

        {/* Stats Summary */}
        <NeonCard variant="cyan" className="p-4 sm:p-8">
          <h2 className="text-xl sm:text-2xl font-bold text-neon-cyan mb-4 sm:mb-6 font-mono">COMMUNITY STATS</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 font-mono">
            <div>
              <p className="text-white/60 text-xs sm:text-sm uppercase mb-2">Total Players</p>
              <p className="text-2xl sm:text-3xl font-bold text-neon-cyan">{PLAYERS.length}</p>
            </div>
            <div>
              <p className="text-white/60 text-xs sm:text-sm uppercase mb-2">Avg K/D</p>
              <p className="text-2xl sm:text-3xl font-bold text-neon-magenta">
                {(PLAYERS.reduce((sum, p) => sum + p.kd, 0) / PLAYERS.length).toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-white/60 text-xs sm:text-sm uppercase mb-2">Avg Win %</p>
              <p className="text-2xl sm:text-3xl font-bold text-neon-gold">
                {(PLAYERS.reduce((sum, p) => sum + p.winRate, 0) / PLAYERS.length).toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-white/60 text-xs sm:text-sm uppercase mb-2">Total Matches</p>
              <p className="text-2xl sm:text-3xl font-bold text-neon-lime">
                {formatNumber(PLAYERS.reduce((sum, p) => sum + p.matches, 0))}
              </p>
            </div>
          </div>
        </NeonCard>
      </div>
    </div>
  );
}
