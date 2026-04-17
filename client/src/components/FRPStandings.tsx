import React from 'react';
import NeonCard from '@/components/NeonCard';

interface Standing {
  teamName: string;
  frp: number;
  rank?: number;
}

interface FRPStandingsProps {
  standings: Standing[];
  isLoading?: boolean;
  variant?: 'magenta' | 'cyan' | 'gold' | 'lime';
}

export default function FRPStandings({
  standings,
  isLoading = false,
  variant = 'cyan',
}: FRPStandingsProps) {
  if (isLoading) {
    return (
      <NeonCard variant={variant} className="p-6">
        <h3 className="text-lg font-bold text-white mb-4 font-mono uppercase">FRP Standings</h3>
        <div className="flex justify-center py-4">
          <img
            src="https://d2xsxph8kpxj0f.cloudfront.net/310519663462787524/GzitzUSk3snQMAtW4LnLnQ/murph_profile2_52a2b30d.png"
            alt=""
            className="w-12 h-12 object-contain"
            style={{ animation: 'throb 1.2s ease-in-out infinite' }}
          />
        </div>
      </NeonCard>
    );
  }

  if (!standings || standings.length === 0) {
    return (
      <NeonCard variant={variant} className="p-6">
        <h3 className="text-lg font-bold text-white mb-4 font-mono uppercase">FRP Standings</h3>
        <div className="text-center text-white/60 font-mono">No standings available</div>
      </NeonCard>
    );
  }

  return (
    <NeonCard variant={variant} className="p-6">
      <h3 className="text-lg font-bold text-white mb-4 font-mono uppercase">FRP Standings</h3>
      
      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm font-mono">
          <thead>
            <tr className="border-b border-white/20">
              <th className="text-left py-2 px-2 text-white/80">Rank</th>
              <th className="text-left py-2 px-2 text-white/80">Team</th>
              <th className="text-right py-2 px-2 text-white/80">FRP</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((standing, idx) => (
              <tr key={idx} className="border-b border-white/10 hover:bg-white/5 transition-colors">
                <td className="py-2 px-2 text-white/80">#{idx + 1}</td>
                <td className="py-2 px-2 text-white">{standing.teamName}</td>
                <td className="py-2 px-2 text-right font-bold text-neon-cyan">{standing.frp}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Stack */}
      <div className="md:hidden space-y-2">
        {standings.map((standing, idx) => (
          <div
            key={idx}
            className="flex justify-between items-center p-3 bg-white/5 rounded border border-white/10 hover:bg-white/10 transition-colors"
          >
            <div className="flex-1">
              <div className="text-xs text-white/60 font-mono mb-1">#{idx + 1}</div>
              <div className="text-sm text-white font-mono">{standing.teamName}</div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-neon-cyan font-mono">{standing.frp}</div>
              <div className="text-xs text-white/60 font-mono">FRP</div>
            </div>
          </div>
        ))}
      </div>
    </NeonCard>
  );
}
