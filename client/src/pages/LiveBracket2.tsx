'use client';

import NeonCard from '@/components/NeonCard';
import GlitchText from '@/components/GlitchText';
import { Link } from 'wouter';
import { useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { trpc } from '@/lib/trpc';

interface TeamRoster {
  teamName: string;
  players: string[];
}

const REGISTERED_TEAMS: TeamRoster[] = [
  {
    teamName: "ULT",
    players: ["opt1ss#0322", "Proto#1032", "Tenyan#2782"]
  },
  {
    teamName: "#BuffWinch",
    players: ["DREX0R#1294", "bizu#7380", "Getbonkednerd#3784"]
  },
  {
    teamName: "Opium label",
    players: ["Mococo#6113", "Antho2throwed#3461", "877-cashnow#2876"]
  },
  {
    teamName: "Register now",
    players: ["Join the tournament", "Click button below"]
  }
];

export default function LiveBracket2() {
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());
  const [eventStatus, setEventStatus] = useState('Awaiting Results');
  const [currentLeader, setCurrentLeader] = useState('Pending Results');
  const [eventWinner, setEventWinner] = useState('Pending Results');

  // Fetch tournament data from API
  const { data: tournament } = trpc.tournament.getSeventhCircle.useQuery(undefined, {
    refetchInterval: 2000,
  });

  // Update display when tournament data changes
  useEffect(() => {
    if (tournament) {
      const statusMap: Record<string, string> = {
        'not-live': 'Awaiting Results',
        'live': 'LIVE EVENT',
        'complete': 'TOURNAMENT COMPLETE',
      };
      setEventStatus(statusMap[tournament.eventStatus] || 'Awaiting Results');

      if (tournament.teams && tournament.teams.length > 0) {
        const maxFrp = Math.max(...tournament.teams.map((t: any) => t.frp || 0));
        if (maxFrp > 0) {
          const leader = tournament.teams.reduce((prev: any, current: any) => 
            (prev.frp > current.frp) ? prev : current
          );
          setCurrentLeader(leader.name || 'Pending Results');
        } else {
          setCurrentLeader('Pending Results');
        }
      }

      if (tournament.eventStatus === 'complete' && tournament.teams && tournament.teams.length > 0) {
        const winner = tournament.teams.reduce((prev: any, current: any) => 
          (prev.frp > current.frp) ? prev : current
        );
        setEventWinner(winner.name || 'Pending Results');
      }
    }
  }, [tournament]);

  return (
    <div className="min-h-screen bg-dark-charcoal py-12 px-4">
      <div className="container max-w-4xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div>
            <GlitchText size="2xl" variant="magenta">
              7TH CIRCLE
            </GlitchText>
          </div>
          <p className="text-neon-cyan font-mono">Live Tournament Bracket</p>
        </div>

        {/* Status Boxes */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <NeonCard variant="gold" className="p-4">
            <h3 className="text-sm font-bold text-neon-gold font-mono mb-2">EVENT WINNER</h3>
            <p className="text-white font-mono" data-testid="event-winner">{eventWinner}</p>
          </NeonCard>
          <NeonCard variant="cyan" className="p-4">
            <h3 className="text-sm font-bold text-neon-cyan font-mono mb-2">STATUS</h3>
            <p className="text-white font-mono" data-testid="event-status">{eventStatus}</p>
          </NeonCard>
          <NeonCard variant="magenta" className="p-4">
            <h3 className="text-sm font-bold text-neon-magenta font-mono mb-2">CURRENT LEADER</h3>
            <p className="text-white font-mono" data-testid="current-leader">{currentLeader}</p>
          </NeonCard>
        </div>

        {/* Registered Teams */}
        <NeonCard variant="magenta" className="p-8">
          <h2 className="text-2xl font-bold text-neon-magenta mb-6 font-mono">REGISTERED TEAMS</h2>
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
                    className="w-full p-4 flex items-center justify-between hover:bg-neon-magenta/10 transition-colors"
                  >
                    <span className="text-base md:text-lg font-bold text-neon-magenta hover:text-neon-cyan font-mono cursor-pointer transition-colors">{team.teamName}</span>
                    <ChevronDown
                      size={20}
                      className={`text-neon-magenta transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {isExpanded && (
                    <div className="bg-dark-charcoal/50 p-4 border-t border-neon-magenta/50 space-y-1 text-sm font-mono">
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
          
          {/* Registration Button */}
          <div className="mt-6 pt-6 border-t border-neon-magenta/50">
            <a
              href="https://forms.gle/RaPzBykYv58nRoav7"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-6 py-2 border-2 border-neon-magenta text-neon-magenta font-mono uppercase hover:bg-neon-magenta hover:text-dark-charcoal transition-colors"
            >
              Register Now
            </a>
          </div>
        </NeonCard>

        {/* Tournament Structure */}
        <NeonCard variant="gold" className="p-8">
          <h2 className="text-2xl font-bold text-neon-gold mb-6 font-mono">TOURNAMENT STRUCTURE</h2>
          
          {[1, 2, 3].map((cycleNum) => (
            <div key={cycleNum} className="mb-8 last:mb-0">
              <h3 className="text-lg font-bold text-white mb-4 font-mono">CYCLE {cycleNum}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Stage 1: Cashout */}
                <div className="border-2 border-neon-gold p-4 rounded">
                  <h4 className="font-bold text-neon-gold mb-3 font-mono">STAGE 1: CASHOUT</h4>
                  <div className="space-y-2 text-sm font-mono text-white/80">
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
                <div className="border-2 border-neon-magenta p-4 rounded">
                  <h4 className="font-bold text-neon-magenta mb-3 font-mono">STAGE 2: FINAL ROUND</h4>
                  <div className="space-y-2 text-sm font-mono text-white/80">
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

        {/* Back to Home */}
        <div className="flex justify-center">
          <Link href="/">
            <a className="px-6 py-2 border-2 border-neon-cyan text-neon-cyan font-mono uppercase hover:bg-neon-cyan hover:text-dark-charcoal transition-colors">
              Back to Home
            </a>
          </Link>
        </div>
      </div>
    </div>
  );
}
