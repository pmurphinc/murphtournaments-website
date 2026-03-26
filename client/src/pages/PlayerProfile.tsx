'use client';

import NeonCard from '@/components/NeonCard';
import GlitchText from '@/components/GlitchText';
import { useRoute, useLocation } from 'wouter';
import { ArrowLeft, Trophy, TrendingUp } from 'lucide-react';

// Player data from the archive
const PLAYER_DATA: Record<string, any> = {
  'pluto': { name: 'PLUTO', kd: 2.10, winRate: 59.2, level: 123, matches: 4478 },
  'proto': { name: 'PROTO', kd: 1.73, winRate: 50.5, level: 122, matches: 3554 },
  '44turnips': { name: '44TURNIPS', kd: 1.55, winRate: 58.8, level: 133, matches: 4069 },
  'mrthirdparty': { name: 'MRTHIRDPARTY', kd: 1.48, winRate: 49.8, level: 116, matches: 3429 },
  'droowings': { name: 'DROOWINGS', kd: 1.47, winRate: 59.2, level: 124, matches: 6438 },
  'bizu': { name: 'BIZU', kd: 1.43, winRate: 49.8, level: 109, matches: 2992 },
  '2sikk': { name: '2SIKK', kd: 1.42, winRate: 49.8, level: 136, matches: 5864 },
  'getbonkednerd': { name: 'GETBONKEDNERD', kd: 1.41, winRate: 42.3, level: 130, matches: 7780 },
  'tenyan': { name: 'TENYAN', kd: 1.35, winRate: 53.6, level: 75, matches: 1475 },
  'opt1ss': { name: 'OPT1SS', kd: 1.34, winRate: 55.5, level: 127, matches: 3900 },
  'captain': { name: 'CAPTAIN', kd: 1.24, winRate: 59.4, level: 167, matches: 10603 },
  'lionxec': { name: 'LIONXEC', kd: 1.24, winRate: 50.4, level: 129, matches: 4300 },
  'twoceez': { name: 'TWOCEEZ', kd: 1.17, winRate: 48.9, level: 156, matches: 12126 },
  'swaggytlol': { name: 'SWAGGYTLOL', kd: 1.14, winRate: 54.5, level: 123, matches: 9269 },
  'mococo': { name: 'MOCOCO', kd: 1.09, winRate: 54.0, level: 120, matches: 6396 },
  'antho': { name: 'ANTHO', kd: 1.04, winRate: 51.8, level: 113, matches: 3545 },
  'strmwrld': { name: 'STRMWRLD', kd: 1.02, winRate: 48.5, level: 151, matches: 13154 },
  '877-cashnow': { name: '877-CASHNOW', kd: 1.00, winRate: 49.3, level: 86, matches: 1614 },
  'drexor': { name: 'DREXOR', kd: 0.97, winRate: 46.6, level: 133, matches: 4036 },
  'misterbirdy': { name: 'MISTERBIRDY', kd: 0.94, winRate: 46.7, level: 130, matches: 5740 },
  'steelsabbath': { name: 'STEELSABBATH', kd: 0.89, winRate: 47.1, level: 138, matches: 5206 },
};

export default function PlayerProfile() {
  const [match, params] = useRoute('/player/:id');
  const [, navigate] = useLocation();
  
  if (!match || !params) {
    return (
      <div className="min-h-screen bg-dark-charcoal py-12 px-4 flex items-center justify-center">
        <p className="text-neon-cyan font-mono">Player not found</p>
      </div>
    );
  }

  const playerId = params?.id?.toLowerCase() || '';
  const player = PLAYER_DATA[playerId];

  if (!player || !playerId) {
    return (
      <div className="min-h-screen bg-dark-charcoal py-12 px-4 flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-neon-magenta font-mono text-lg">Player not found</p>
          <button
            onClick={() => navigate('/players')}
            className="inline-block px-4 py-2 border-2 border-neon-cyan text-neon-cyan hover:bg-neon-cyan/10 transition-colors font-mono text-sm uppercase"
          >
            ← Back to Archive
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-charcoal py-12 px-4">
      <div className="container max-w-3xl space-y-8">
        {/* Header with Back Button */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/players')}
            className="flex items-center gap-2 px-4 py-2 border-2 border-neon-cyan text-neon-cyan hover:bg-neon-cyan/10 transition-colors font-mono text-sm uppercase"
          >
            <ArrowLeft size={16} />
            Back to Archive
          </button>
        </div>

        {/* Player Header */}
        <div className="text-center space-y-4">
          <GlitchText size="2xl" variant="magenta">
            {player.name}
          </GlitchText>
          <p className="text-neon-cyan font-mono">Competitive Player Profile</p>
        </div>

        {/* Main Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <NeonCard variant="gold" className="p-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <TrendingUp size={20} className="text-neon-gold" />
            </div>
            <p className="text-neon-gold text-xs uppercase font-mono mb-2">K/D Ratio</p>
            <p className="text-3xl font-bold text-white font-mono">{player.kd.toFixed(2)}</p>
          </NeonCard>

          <NeonCard variant="cyan" className="p-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Trophy size={20} className="text-neon-cyan" />
            </div>
            <p className="text-neon-cyan text-xs uppercase font-mono mb-2">Win Rate</p>
            <p className="text-3xl font-bold text-white font-mono">{player.winRate.toFixed(1)}%</p>
          </NeonCard>

          <NeonCard variant="magenta" className="p-6 text-center">
            <p className="text-neon-magenta text-xs uppercase font-mono mb-2">Level</p>
            <p className="text-3xl font-bold text-white font-mono">{player.level}</p>
          </NeonCard>

          <NeonCard variant="lime" className="p-6 text-center">
            <p className="text-neon-lime text-xs uppercase font-mono mb-2">Matches</p>
            <p className="text-3xl font-bold text-white font-mono">{player.matches.toLocaleString()}</p>
          </NeonCard>
        </div>

        {/* Career Stats */}
        <NeonCard variant="cyan" className="p-8">
          <h2 className="text-2xl font-bold text-neon-cyan mb-6 font-mono uppercase">Career Statistics</h2>
          
          <div className="space-y-4 font-mono text-white/80">
            <div className="flex justify-between items-center pb-4 border-b border-neon-cyan/30">
              <span>Total Matches Played</span>
              <span className="text-neon-cyan font-bold">{player.matches.toLocaleString()}</span>
            </div>
            
            <div className="flex justify-between items-center pb-4 border-b border-neon-cyan/30">
              <span>Win Rate</span>
              <span className="text-neon-cyan font-bold">{player.winRate.toFixed(1)}%</span>
            </div>
            
            <div className="flex justify-between items-center pb-4 border-b border-neon-cyan/30">
              <span>K/D Ratio</span>
              <span className="text-neon-cyan font-bold">{player.kd.toFixed(2)}</span>
            </div>
            
            <div className="flex justify-between items-center pb-4 border-b border-neon-cyan/30">
              <span>Current Level</span>
              <span className="text-neon-cyan font-bold">{player.level}</span>
            </div>

            <div className="flex justify-between items-center pt-4">
              <span>Status</span>
              <span className="text-neon-lime font-bold">ACTIVE</span>
            </div>
          </div>
        </NeonCard>

        {/* Achievements Section */}
        <NeonCard variant="magenta" className="p-8">
          <h2 className="text-2xl font-bold text-neon-magenta mb-6 font-mono uppercase">Achievements</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-dark-charcoal/50 p-4 rounded border border-neon-magenta/50">
              <p className="text-neon-magenta text-sm uppercase font-mono mb-2">🏆 Competitive Player</p>
              <p className="text-white/70 text-xs">Maintains competitive ranking and active tournament participation</p>
            </div>
            
            <div className="bg-dark-charcoal/50 p-4 rounded border border-neon-magenta/50">
              <p className="text-neon-magenta text-sm uppercase font-mono mb-2">⭐ High Win Rate</p>
              <p className="text-white/70 text-xs">Demonstrates consistent performance above 50% win rate</p>
            </div>

            <div className="bg-dark-charcoal/50 p-4 rounded border border-neon-magenta/50">
              <p className="text-neon-magenta text-sm uppercase font-mono mb-2">🎯 Experienced</p>
              <p className="text-white/70 text-xs">Extensive match history with thousands of competitive games</p>
            </div>

            <div className="bg-dark-charcoal/50 p-4 rounded border border-neon-magenta/50">
              <p className="text-neon-magenta text-sm uppercase font-mono mb-2">🚀 Rising Star</p>
              <p className="text-white/70 text-xs">Recognized talent in the competitive THE FINALS community</p>
            </div>
          </div>
        </NeonCard>
      </div>
    </div>
  );
}
