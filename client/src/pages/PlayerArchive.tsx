'use client';

import NeonCard from '@/components/NeonCard';
import GlitchText from '@/components/GlitchText';
import { useState, useMemo } from 'react';
import { ChevronDown, TrendingUp } from 'lucide-react';
import { Link } from 'wouter';

interface PlayerStats {
  name: string;
  level: number;
  hours: number;
  matches: number;
  wins: number;
  losses: number;
  elims: number;
  deaths: number;
  revives: number;
  cashout: number;
  damage: number;
  kd: number;
  winRate: number;
}

const PLAYERS: PlayerStats[] = [
  { name: 'PLUTO', level: 123, hours: 732, matches: 4478, wins: 2649, losses: 1829, elims: 41492, deaths: 19753, revives: 6401, cashout: 135573420, damage: 13076273, kd: 2.10, winRate: 59.2 },
  { name: '44TURNIPS', level: 133, hours: 560, matches: 4069, wins: 2391, losses: 1678, elims: 38215, deaths: 24619, revives: 3142, cashout: 89884712, damage: 10766666, kd: 1.55, winRate: 58.8 },
  { name: 'TWOCEEZ', level: 156, hours: 1955, matches: 12126, wins: 5933, losses: 6193, elims: 72493, deaths: 62003, revives: 24956, cashout: 332624067, damage: 24399976, kd: 1.17, winRate: 48.9 },
  { name: 'STRMWRLD', level: 151, hours: 2165, matches: 13154, wins: 6384, losses: 6770, elims: 75645, deaths: 74378, revives: 17491, cashout: 334784725, damage: 25599392, kd: 1.02, winRate: 48.5 },
  { name: 'STEELSABBATH', level: 138, hours: 860, matches: 5206, wins: 2451, losses: 2755, elims: 27728, deaths: 31061, revives: 9079, cashout: 129729437, damage: 9871503, kd: 0.89, winRate: 47.1 },
  { name: '2SIKK', level: 136, hours: 953, matches: 5864, wins: 2921, losses: 2943, elims: 38677, deaths: 27291, revives: 7003, cashout: 154284780, damage: 11790709, kd: 1.42, winRate: 49.8 },
  { name: 'CAPTAIN', level: 167, hours: 1483, matches: 10603, wins: 6297, losses: 4306, elims: 72356, deaths: 58114, revives: 11610, cashout: 244999711, damage: 22180938, kd: 1.24, winRate: 59.4 },
  { name: 'SWAGGYTLOL', level: 123, hours: 1498, matches: 9269, wins: 5050, losses: 4219, elims: 57178, deaths: 49973, revives: 14675, cashout: 272391715, damage: 20620182, kd: 1.14, winRate: 54.5 },
  { name: 'DROOWINGS', level: 124, hours: 1031, matches: 6438, wins: 3809, losses: 2629, elims: 42707, deaths: 28973, revives: 12508, cashout: 178457097, damage: 14053673, kd: 1.47, winRate: 59.2 },
  { name: 'MISTERBIRDY', level: 130, hours: 943, matches: 5740, wins: 2680, losses: 3060, elims: 32664, deaths: 34619, revives: 6625, cashout: 143098675, damage: 11811352, kd: 0.94, winRate: 46.7 },
  { name: 'LIONXEC', level: 129, hours: 706, matches: 4300, wins: 2166, losses: 2134, elims: 29530, deaths: 23782, revives: 7514, cashout: 117550815, damage: 11145440, kd: 1.24, winRate: 50.4 },
  { name: 'MRTHIRDPARTY', level: 116, hours: 574, matches: 3429, wins: 1709, losses: 1720, elims: 25976, deaths: 17531, revives: 5381, cashout: 89864716, damage: 9961347, kd: 1.48, winRate: 49.8 },
  { name: 'MOCOCO', level: 120, hours: 1036, matches: 6396, wins: 3452, losses: 2944, elims: 38291, deaths: 35253, revives: 10768, cashout: 188122233, damage: 11394928, kd: 1.09, winRate: 54.0 },
  { name: 'PROTO', level: 122, hours: 600, matches: 3554, wins: 1796, losses: 1758, elims: 31562, deaths: 18219, revives: 5428, cashout: 92183333, damage: 10100060, kd: 1.73, winRate: 50.5 },
  { name: 'ANTHO', level: 113, hours: 571, matches: 3545, wins: 1838, losses: 1707, elims: 20085, deaths: 19290, revives: 6521, cashout: 98101128, damage: 6744045, kd: 1.04, winRate: 51.8 },
  { name: 'BIZU', level: 109, hours: 477, matches: 2992, wins: 1490, losses: 1502, elims: 22195, deaths: 15475, revives: 5421, cashout: 61234928, damage: 6858047, kd: 1.43, winRate: 49.8 },
  { name: 'DREXOR', level: 133, hours: 670, matches: 4036, wins: 1883, losses: 2153, elims: 25094, deaths: 25751, revives: 4245, cashout: 81354288, damage: 7947477, kd: 0.97, winRate: 46.6 },
  { name: 'OPT1SS', level: 127, hours: 628, matches: 3900, wins: 2164, losses: 1736, elims: 25906, deaths: 19291, revives: 6589, cashout: 111793920, damage: 9015252, kd: 1.34, winRate: 55.5 },
  { name: '877-CASHNOW', level: 86, hours: 260, matches: 1614, wins: 796, losses: 818, elims: 8095, deaths: 8092, revives: 1883, cashout: 39719076, damage: 3084509, kd: 1.00, winRate: 49.3 },
  { name: 'GETBONKEDNERD', level: 130, hours: 1340, matches: 7780, wins: 3292, losses: 4488, elims: 73716, deaths: 52286, revives: 10635, cashout: 127578636, damage: 20156502, kd: 1.41, winRate: 42.3 },
  { name: 'TENYAN', level: 75, hours: 246, matches: 1475, wins: 790, losses: 685, elims: 12616, deaths: 9315, revives: 2599, cashout: 36004078, damage: 4339936, kd: 1.35, winRate: 53.6 },
];

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
