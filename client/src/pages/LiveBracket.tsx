import NeonCard from '@/components/NeonCard';
import GlitchText from '@/components/GlitchText';
import { Link } from 'wouter';
import { useState } from 'react';

/**
 * Live Bracket Page - Development Division
 * Cyberpunk Neon Rebellion Design
 * - Registered teams with player rosters
 * - 3-Cycle Development Division format
 * - Stage 1 (Cashout) and Stage 2 (Finals) structure
 * - FRP (Final Round Points) scoring system
 */

interface Team {
  id: number;
  name: string;
  players: string[];
}

const APPROVED_TEAMS: Team[] = [
  {
    id: 1,
    name: "EkaZo's Kittens",
    players: ["44turnips#0802", "Droowings#1811", "Captain#8153", "chezzcakee#5108"]
  },
  {
    id: 2,
    name: "Three Deadly Sins",
    players: ["StrmWRLD#3588", "SWAGGYTLOL#2499", "TwoCeez#1054"]
  },
  {
    id: 3,
    name: "LIQR",
    players: ["2sikk#2681", "MisterBirdy#5602", "Lionxec#0714"]
  },
  {
    id: 4,
    name: "The Baiters",
    players: ["PLUTO#8051", "SteelSabbath#1024", "MrThirdParty#3398"]
  }
];

export default function LiveBracket() {
  const [expandedTeam, setExpandedTeam] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-dark-charcoal py-20">
      <div className="container">
        {/* Header */}
        <div className="mb-16">
          <GlitchText size="xl" variant="lime" className="mb-4">
            Development Division
          </GlitchText>
          <p className="text-lg text-white/80 font-mono max-w-2xl">
            3-Cycle tournament structure with Stage 1 (Cashout) and Stage 2 (Finals). Teams compete for the highest FRP (Final Round Points) across all cycles.
          </p>
        </div>

        {/* Tournament Info */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold font-mono text-neon-gold mb-6 uppercase">Tournament Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <NeonCard variant="gold">
              <p className="text-xs text-white/50 font-mono uppercase mb-2">Format</p>
              <p className="text-lg font-bold font-mono text-neon-gold">3 Cycles</p>
            </NeonCard>
            <NeonCard variant="gold">
              <p className="text-xs text-white/50 font-mono uppercase mb-2">Registered Teams</p>
              <p className="text-lg font-bold font-mono text-neon-gold">{APPROVED_TEAMS.length}</p>
            </NeonCard>
            <NeonCard variant="gold">
              <p className="text-xs text-white/50 font-mono uppercase mb-2">Team Size</p>
              <p className="text-lg font-bold font-mono text-neon-gold">3v3</p>
            </NeonCard>
            <NeonCard variant="gold">
              <p className="text-xs text-white/50 font-mono uppercase mb-2">Scoring</p>
              <p className="text-lg font-bold font-mono text-neon-gold">FRP Based</p>
            </NeonCard>
          </div>
        </div>

        {/* Registered Teams */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold font-mono text-neon-cyan mb-6 uppercase">Registered Teams ({APPROVED_TEAMS.length})</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {APPROVED_TEAMS.map((team) => (
              <div key={team.id}>
                <NeonCard 
                  variant="cyan"
                  className="cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => setExpandedTeam(expandedTeam === team.id ? null : team.id)}
                >
                  <div className="space-y-2">
                    <p className="text-lg font-bold font-mono text-neon-cyan uppercase">{team.name}</p>
                    <p className="text-xs text-white/60 font-mono">{team.players.length} Players</p>
                    {expandedTeam === team.id && (
                      <div className="mt-4 pt-4 border-t border-neon-cyan/30 space-y-2">
                        <p className="text-xs text-white/50 font-mono uppercase mb-2">Roster:</p>
                        {team.players.map((player, idx) => (
                          <p key={idx} className="text-xs text-white/70 font-mono">• {player}</p>
                        ))}
                      </div>
                    )}
                  </div>
                </NeonCard>
              </div>
            ))}
          </div>
          <p className="text-xs text-white/50 font-mono mt-4">Click on a team to view full roster</p>
        </div>

        {/* Tournament Structure */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold font-mono text-neon-magenta mb-6 uppercase">Tournament Structure</h2>
          
          {/* Cycle Breakdown */}
          <div className="space-y-8">
            {[1, 2, 3].map((cycle) => (
              <div key={cycle} className="space-y-4">
                <h3 className="text-xl font-bold font-mono text-neon-gold uppercase">Cycle {cycle}</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Stage 1: Cashout */}
                  <NeonCard variant="gold">
                    <h4 className="text-lg font-bold font-mono text-neon-gold mb-4 uppercase">Stage 1: Cashout</h4>
                    <div className="space-y-3 text-sm text-white/70 font-mono">
                      <div>
                        <p className="text-neon-gold font-bold mb-1">4 Teams Compete</p>
                        <p className="text-xs text-white/50">Top 4 teams from previous cycle or random draw</p>
                      </div>
                      <div>
                        <p className="text-neon-gold font-bold mb-1">Placements</p>
                        <ul className="space-y-1 text-xs text-white/60">
                          <li>• 1st Place: 4 FRP</li>
                          <li>• 2nd Place: 3 FRP</li>
                          <li>• 3rd Place: 2 FRP</li>
                          <li>• 4th Place: 1 FRP</li>
                        </ul>
                      </div>
                    </div>
                  </NeonCard>

                  {/* Stage 2: Finals */}
                  <NeonCard variant="magenta">
                    <h4 className="text-lg font-bold font-mono text-neon-magenta mb-4 uppercase">Stage 2: Finals</h4>
                    <div className="space-y-3 text-sm text-white/70 font-mono">
                      <div>
                        <p className="text-neon-magenta font-bold mb-1">Best of 3 Matches</p>
                        <ul className="space-y-1 text-xs text-white/60">
                          <li>• 1st vs 2nd (BO3)</li>
                          <li>• 3rd vs 4th (BO3)</li>
                        </ul>
                      </div>
                      <div>
                        <p className="text-neon-magenta font-bold mb-1">FRP Per Round Win</p>
                        <p className="text-xs text-white/50">Each round victory = 1 FRP</p>
                      </div>
                    </div>
                  </NeonCard>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Win Condition */}
        <div className="mb-16">
          <NeonCard variant="lime">
            <h2 className="text-2xl font-bold font-mono text-neon-lime mb-4 uppercase">Win Condition</h2>
            <div className="space-y-4 text-white/80 font-mono">
              <p>
                <span className="text-neon-lime font-bold">Highest FRP After 3 Cycles:</span> The team with the most accumulated Final Round Points across all three cycles wins the tournament.
              </p>
              <p>
                <span className="text-neon-lime font-bold">Tie Scenario:</span> If two or more teams are tied on FRP, a Sudden Death Final Round determines the champion.
              </p>
              <p className="text-sm text-white/60">
                FRP is tracked cumulatively throughout the tournament. Every placement in Stage 1 and every round win in Stage 2 contributes to your total.
              </p>
            </div>
          </NeonCard>
        </div>

        {/* Format Details */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold font-mono text-neon-cyan mb-6 uppercase">Format Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <NeonCard variant="cyan">
              <h3 className="text-lg font-bold font-mono text-neon-cyan mb-4 uppercase">Match Structure</h3>
              <ul className="space-y-2 text-sm text-white/70 font-mono">
                <li>• 3v3 Team Format</li>
                <li>• 3 Cycles Total</li>
                <li>• Stage 1: Cashout (4 teams)</li>
                <li>• Stage 2: Finals (BO3 matches)</li>
                <li>• FRP Scoring System</li>
              </ul>
            </NeonCard>

            <NeonCard variant="cyan">
              <h3 className="text-lg font-bold font-mono text-neon-cyan mb-4 uppercase">Prize Distribution</h3>
              <ul className="space-y-2 text-sm text-white/70 font-mono">
                <li>• Prize Pool: TBA</li>
                <li>• 1st Place: TBA</li>
                <li>• 2nd Place: TBA</li>
                <li>• 3rd Place: TBA</li>
                <li>• Streamed on Twitch</li>
              </ul>
            </NeonCard>
          </div>
        </div>

        {/* Watch Live */}
        <div className="text-center mb-16">
          <h2 className="text-2xl font-bold font-mono text-neon-magenta mb-6 uppercase">Watch Live</h2>
          <p className="text-lg text-white/80 font-mono mb-6 max-w-2xl mx-auto">
            Tune in to our Twitch channel for live Development Division coverage with professional commentary and real-time FRP tracking.
          </p>
          <a
            href="https://www.twitch.tv/pmurphinc"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-8 py-3 bg-neon-magenta text-dark-black font-bold font-mono uppercase tracking-widest hover-glow-magenta rounded-sm transition-all"
          >
            Watch on Twitch
          </a>
        </div>

        {/* Navigation */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/history">
            <button className="px-8 py-3 border-2 border-neon-cyan text-neon-cyan font-bold font-mono uppercase tracking-widest hover-glow-cyan rounded-sm transition-all">
              Tournament History
            </button>
          </Link>
          <a href="https://discord.gg/kcmdxmBgnC" target="_blank" rel="noopener noreferrer">
            <button className="px-8 py-3 border-2 border-neon-gold text-neon-gold font-bold font-mono uppercase tracking-widest hover-glow-magenta rounded-sm transition-all">
              Join Discord
            </button>
          </a>
        </div>
      </div>
    </div>
  );
}
