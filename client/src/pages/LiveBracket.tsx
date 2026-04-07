'use client';

import NeonCard from '@/components/NeonCard';
import GlitchText from '@/components/GlitchText';
import FRPStandings from '@/components/FRPStandings';
import { Link } from 'wouter';
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useTournamentState } from '@/hooks/useTournamentState';

interface TeamRoster {
  teamName: string;
  players: string[];
}

const REGISTERED_TEAMS: TeamRoster[] = [
  {
    teamName: "EkaZo's Kittens",
    players: ["44turnips", "Droowings", "Captain"]
  },
  {
    teamName: "Goo Disciples",
    players: ["StrmWRLD", "DOOOKYBOOTYAHBOI", "TwoCeez", "Ospuze.Gooner"]
  },
  {
    teamName: "Dojo of Fao",
    players: ["WEI_FAOSTEST", "WEI_FAOSTER", "WEI_FAO", "WEI_FAOSTIFY"]
  },
  {
    teamName: "The Baiters",
    players: ["PLUTO", "SteelSabbath", "MrThirdParty"]
  }
];

const SHOW_LIVE_TOURNAMENT_BRACKET = false;

export default function LiveBracket() {
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());

  // Fetch live tournament state from webhook-updated server state
  const { state: liveState } = useTournamentState('dev-division');

  // Fetch team FRP data from tRPC (for team rosters and FRP)
  const { data: tournament } = trpc.tournament.getDevDivision.useQuery(undefined, {
    refetchInterval: 2000,
  });

  // Determine tournament state from bot data
  const isRegistration = liveState.status?.toUpperCase().includes('REGISTRATION') || liveState.status?.toUpperCase().includes('REGISTRATION READY');
  const isCompleted = liveState.status?.toUpperCase() === 'COMPLETED' || liveState.isComplete;
  const isLive = liveState.status?.toUpperCase().includes('LIVE_CYCLE');
  
  // Extract cycle number from status if available
  const cycleMatch = liveState.status?.match(/LIVE_CYCLE_(\d)/);
  const currentCycle = cycleMatch ? parseInt(cycleMatch[1]) : liveState.cycle || 1;
  
  // Format status display
  let eventStatus = 'Awaiting Update';
  if (isRegistration) {
    eventStatus = 'Pre-Checkin';
  } else if (isCompleted) {
    eventStatus = 'Completed';
  } else if (isLive) {
    eventStatus = `Cycle ${currentCycle} In Progress`;
  } else if (liveState.status && liveState.status !== 'Awaiting Update') {
    eventStatus = liveState.status;
  }
  
  // Current leader - show TBD for pre-tournament, otherwise use bot data
  const currentLeader = isRegistration ? 'TBD' : (liveState.currentLeader || 'TBD');
  
  // Event winner - only show if tournament is completed
  const eventWinner = isCompleted ? (liveState.eventWinner || 'TBD') : 'TBD';
  
  // Debug: log the state for troubleshooting
  if (typeof window !== 'undefined') {
    console.log('[LiveBracket] Tournament State:', { status: liveState.status, isRegistration, isCompleted, isLive, currentLeader, eventWinner });
  }

  return (
    <div className="min-h-screen bg-dark-charcoal py-8 sm:py-12 px-4">
      <div className="container max-w-4xl space-y-6 sm:space-y-8">
        {/* Live Tournament Bracket temporarily disabled - do not delete */}
        {SHOW_LIVE_TOURNAMENT_BRACKET && (
          <>
            {/* Header */}
            <div className="text-center space-y-2 sm:space-y-4">
              <div>
                <GlitchText size="xl" variant="magenta">
                  DEVELOPMENT DIVISION
                </GlitchText>
              </div>
              <p className="text-neon-cyan font-mono text-sm sm:text-base">Live Tournament Bracket</p>
            </div>

            {/* Status Boxes */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <NeonCard variant="gold" className="p-3 sm:p-4">
                <h3 className="text-xs sm:text-sm font-bold text-neon-gold font-mono mb-2">EVENT WINNER</h3>
                <p className="text-white font-mono text-sm sm:text-base" data-testid="event-winner">{eventWinner}</p>
                <p className="text-white/50 font-mono text-xs mt-2">Last updated: {new Date(liveState.updatedAt).toLocaleTimeString()}</p>
              </NeonCard>
              <NeonCard variant="cyan" className="p-3 sm:p-4">
                <h3 className="text-xs sm:text-sm font-bold text-neon-cyan font-mono mb-2">STATUS</h3>
                <p className="text-white font-mono text-sm sm:text-base" data-testid="event-status">{eventStatus}</p>
                {!isRegistration && <p className="text-white/50 font-mono text-xs mt-2">Cycle {currentCycle}</p>}
              </NeonCard>
              <NeonCard variant="magenta" className="p-3 sm:p-4">
                <h3 className="text-xs sm:text-sm font-bold text-neon-magenta font-mono mb-2">CURRENT LEADER</h3>
                <p className="text-white font-mono text-sm sm:text-base" data-testid="current-leader">{currentLeader}</p>
                <p className="text-white/50 font-mono text-xs mt-2">{isCompleted ? 'Completed' : (isRegistration ? 'Pre-Tournament' : 'In Progress')}</p>
              </NeonCard>
            </div>

            {/* FRP Standings */}
            {liveState.standings && liveState.standings.length > 0 && (
              <FRPStandings standings={liveState.standings} variant="cyan" />
            )}
          </>
        )}

        {/* Registered Teams */}
        <NeonCard variant="magenta" className="p-4 sm:p-8">
          <h2 className="text-xl sm:text-2xl font-bold text-neon-magenta mb-4 sm:mb-6 font-mono">REGISTERED TEAMS</h2>
          <div className="space-y-2">
            {REGISTERED_TEAMS.map((team) => {
              const isExpanded = expandedTeams.has(team.teamName);
              return (
                <div key={team.teamName} className="border border-neon-magenta/50 rounded overflow-hidden">
                  <button
                    onClick={() => {
                      const newExpanded = new Set(expandedTeams);
                      if (newExpanded.has(team.teamName)) {
                        newExpanded.delete(team.teamName);
                      } else {
                        newExpanded.add(team.teamName);
                      }
                      setExpandedTeams(newExpanded);
                    }}
                    className="w-full p-3 sm:p-4 flex items-center justify-between hover:bg-neon-magenta/10 transition-colors"
                  >
                    <span className="font-bold text-neon-magenta hover:text-neon-cyan font-mono cursor-pointer transition-colors text-sm sm:text-base">{team.teamName}</span>
                    <ChevronDown
                      size={20}
                      className={`text-neon-magenta transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {isExpanded && (
                    <div className="bg-dark-charcoal/50 p-3 sm:p-4 border-t border-neon-magenta/50 space-y-1 text-xs sm:text-sm font-mono">
                      {team.players.map((player) => {
                        const playerSlug = player.split('#')[0].toLowerCase();
                        return (
                          <div key={player} className="block">
                            <Link href={`/player/${playerSlug}`}>
                              <a className="text-neon-cyan hover:text-neon-magenta transition-colors cursor-pointer block py-1 hover-glow-cyan">
                                {player}
                              </a>
                            </Link>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </NeonCard>

        {/* Tournament Structure */}
        <NeonCard variant="gold" className="p-4 sm:p-8">
          <h2 className="text-xl sm:text-2xl font-bold text-neon-gold mb-4 sm:mb-6 font-mono">TOURNAMENT STRUCTURE</h2>
          
          {[1, 2, 3].map((cycleNum) => (
            <div key={cycleNum} className="mb-6 sm:mb-8 last:mb-0">
              <h3 className="text-base sm:text-lg font-bold text-white mb-3 sm:mb-4 font-mono">CYCLE {cycleNum}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {/* Stage 1: Cashout */}
                <div className="border-2 border-neon-gold p-3 sm:p-4 rounded">
                  <h4 className="font-bold text-neon-gold mb-2 sm:mb-3 font-mono text-sm sm:text-base">STAGE 1: CASHOUT</h4>
                  <div className="space-y-1 sm:space-y-2 text-xs sm:text-sm font-mono text-white/80">
                    <p><span className="font-bold">4 Teams Compete</span></p>
                    <p>All 4 teams play one round of Cashout</p>
                    <p className="font-bold mt-3">Placements</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>1st Place</li>
                      <li>2nd Place</li>
                      <li>3rd Place</li>
                      <li>4th Place</li>
                    </ul>
                  </div>
                </div>

                {/* Stage 2: Final Round */}
                <div className="border-2 border-neon-magenta p-3 sm:p-4 rounded">
                  <h4 className="font-bold text-neon-magenta mb-2 sm:mb-3 font-mono text-sm sm:text-base">STAGE 2: FINAL ROUND</h4>
                  <div className="space-y-1 sm:space-y-2 text-xs sm:text-sm font-mono text-white/80">
                    <p><span className="font-bold">Best of 3 Matches</span></p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>1st vs 2nd (BO3)</li>
                      <li>3rd vs 4th (BO3)</li>
                    </ul>
                    <p className="font-bold mt-3">1 FRP Per Round Win</p>
                    <p>Each victory = 1 FRP</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </NeonCard>

        {/* Win Condition */}
        <NeonCard variant="cyan" className="p-8">
          <h2 className="text-2xl font-bold text-neon-cyan mb-6 font-mono">WIN CONDITION</h2>
          <div className="space-y-4 font-mono text-white/80">
            <p>
              <span className="font-bold text-neon-cyan">Highest FRP After 3 Cycles:</span> The team with the most accumulated Final Round Points across all three cycles wins the tournament.
            </p>
            <p>
              <span className="font-bold text-neon-cyan">Tie Scenario:</span> If two or more teams are tied on FRP, a Sudden Death Final Round determines the champion.
            </p>
            <p>
              <span className="font-bold text-neon-cyan">FRP Tracking:</span> FRP is tracked cumulatively throughout the tournament. Every round win in Stage 2 contributes to your total.
            </p>
          </div>
        </NeonCard>

        {/* Tournament History Button */}
        <div className="flex justify-center">
          <Link href="/tournaments">
            <button className="px-8 py-3 border-2 border-neon-cyan text-neon-cyan font-bold font-mono uppercase tracking-widest hover-glow-cyan rounded-sm transition-all">
              TOURNAMENT HISTORY
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
