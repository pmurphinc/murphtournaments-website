import NeonCard from '@/components/NeonCard';
import GlitchText from '@/components/GlitchText';
import { Link } from 'wouter';
import { useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { trpc } from '@/lib/trpc';

/**
 * Live Bracket Page - Development Division
 * Uses DD Scorekeeper 2.0 Google Sheet as single source of truth
 * - Smart data fetching from multiple tabs via Sheets API
 * - Intelligent visibility logic based on event state
 * - Collapsible cycle sections
 * - Real-time standings leaderboard
 * - Team rosters from Team Members sheet
 */

interface CashoutResult {
  team: string;
  placement: number;
}

interface MatchResult {
  winner: string;
  loser: string;
}

interface CycleData {
  cashout: CashoutResult[];
  matches: MatchResult[];
  leader: string;
  hasData: boolean;
}

interface TeamRoster {
  teamName: string;
  teamLeader: string;
  player1: string;
  player2: string;
  player3: string;
  sub: string;
}

interface PageState {
  eventWinner: string;
  status: string;
  currentLeader: string;
  registeredTeams: string[];
  teamRosters: Record<string, TeamRoster>;
  standings: Array<{ name: string; frp: number; rank: number }>;
  cycles: CycleData[];
  isPreEvent: boolean;
  isLiveEvent: boolean;
  isEventComplete: boolean;
  dataAvailable: boolean;
}

const NEW_SHEET_ID = '1-e00pcvQOPZIAyYsIjmmRQbniWzgHxyOVO68fv-X2gs';

// Helper to build sheet range strings
const buildRange = (tabName: string, startRow: number, endRow: number, col: string): string => {
  return `${tabName}!${col}${startRow}:${col}${endRow}`;
};

// Parse 2D array values from Sheets API
const getArrayValue = (values: any[][], row: number, col: number): string => {
  if (values && values[row - 1] && values[row - 1][col - 1]) {
    return String(values[row - 1][col - 1]).trim();
  }
  return '';
};

// Extract range values from 2D array
const getRangeValues = (values: any[][], startRow: number, endRow: number, col: number): string[] => {
  const result: string[] = [];
  for (let i = startRow; i <= endRow; i++) {
    const val = getArrayValue(values, i, col);
    if (val) result.push(val);
  }
  console.log(`[getRangeValues] Fetched ${result.length} values from rows ${startRow}-${endRow}, col ${col}:`, result);
  return result;
};

export default function LiveBracket() {
  const trpcClient = trpc.useUtils().client;
  const [expandedCycles, setExpandedCycles] = useState<Set<number>>(new Set());
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [pageState, setPageState] = useState<PageState>({
    eventWinner: 'Pending Results',
    status: 'Awaiting Results',
    currentLeader: 'Pending Results',
    registeredTeams: [],
    teamRosters: {},
    standings: [],
    cycles: [],
    isPreEvent: true,
    isLiveEvent: false,
    isEventComplete: false,
    dataAvailable: false,
  });

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        // Fetch Lists tab for registered teams (A5:A24)
        const teamsResult = await trpcClient.bracket.getSheetData.query({
          sheetId: NEW_SHEET_ID,
          tabId: '0'
        });
        
        if (!teamsResult.success) throw new Error(teamsResult.error);
        const registeredTeams = (teamsResult.values || [])
          .flat()
          .map((v: any) => String(v).trim())
          .filter((v: string) => v);
        console.log('[fetchAllData] Registered teams:', registeredTeams);

        // Fetch Team Members tab for rosters (A2:L21)
        const rostersResult = await trpcClient.bracket.getSheetData.query({
          sheetId: NEW_SHEET_ID,
          tabId: '1'
        });
        
        if (!rostersResult.success) throw new Error(rostersResult.error);
        const teamRosters: Record<string, TeamRoster> = {};
        const rosterValues = rostersResult.values || [];
        
        for (let i = 0; i < rosterValues.length; i++) {
          const row = rosterValues[i];
          if (row && row[0]) {
            const teamName = String(row[0]).trim();
            if (teamName) {
              teamRosters[teamName] = {
                teamName,
                teamLeader: String(row[1] || '').trim(),
                player1: String(row[2] || '').trim(),
                player2: String(row[3] || '').trim(),
                player3: String(row[4] || '').trim(),
                sub: String(row[5] || '').trim(),
              };
            }
          }
        }

        // Fetch Dashboard tab for status (B6, E6, I6)
        const dashboardResult = await trpcClient.bracket.getSheetData.query({
          sheetId: NEW_SHEET_ID,
          tabId: '2'
        });
        
        if (!dashboardResult.success) throw new Error(dashboardResult.error);
        const dashboardValues = dashboardResult.values?.[0] || [];
        const eventWinner = String(dashboardValues[0] || '').trim() || 'Pending Results';
        const status = String(dashboardValues[4] || '').trim() || 'Awaiting Results';
        const currentLeader = String(dashboardValues[8] || '').trim() || 'Pending Results';

        const isPreEvent = status === 'Awaiting Results' || status === 'Pre-Event';
        const isLiveEvent = status === 'Live' || status === 'In Progress';
        const isEventComplete = status === 'Complete' || eventWinner !== 'Pending Results';

        // Fetch Standings tab (J5:L24)
        const standingsResult = await trpcClient.bracket.getSheetData.query({
          sheetId: NEW_SHEET_ID,
          tabId: '3'
        });
        
        if (!standingsResult.success) throw new Error(standingsResult.error);
        const standings: Array<{ name: string; frp: number; rank: number }> = [];
        const standingsValues = standingsResult.values || [];
        
        for (let i = 0; i < standingsValues.length; i++) {
          const row = standingsValues[i];
          if (row && row[0]) {
            const teamName = String(row[0]).trim();
            const frp = parseInt(String(row[1] || '0')) || 0;
            const rank = i + 1;
            if (teamName && frp > 0) {
              standings.push({ name: teamName, frp, rank });
            }
          }
        }

        // Fetch cycles data
        const cycles: CycleData[] = [];

        for (let cycleNum = 1; cycleNum <= 3; cycleNum++) {
          try {
            const tabName = `Cycle ${cycleNum}`;
            
            // Fetch cashout results (A7:B10)
            const cashoutResult = await trpcClient.bracket.getSheetData.query({
              sheetId: NEW_SHEET_ID,
              tabId: String(3 + cycleNum)
            });
            
            const cashout: CashoutResult[] = [];
            if (cashoutResult.success) {
              const cashoutValues = cashoutResult.values || [];
              for (let i = 0; i < cashoutValues.length; i++) {
                const row = cashoutValues[i];
                if (row && row[0]) {
                  const team = String(row[0]).trim();
                  const placement = parseInt(String(row[1] || '0')) || 0;
                  if (team && placement > 0) {
                    cashout.push({ team, placement });
                  }
                }
              }
            }

            // Fetch match results (A13:B18)
            const matchesResult = await trpcClient.bracket.getSheetData.query({
              sheetId: NEW_SHEET_ID,
              tabId: String(3 + cycleNum)
            });
            
            const matches: MatchResult[] = [];
            if (matchesResult.success) {
              const matchValues = matchesResult.values || [];
              for (let i = 0; i < matchValues.length; i++) {
                const row = matchValues[i];
                if (row && row[0] && row[1]) {
                  const winner = String(row[0]).trim();
                  const loser = String(row[1]).trim();
                  if (winner && loser) {
                    matches.push({ winner, loser });
                  }
                }
              }
            }

            // Fetch cycle leader (E7)
            const leaderResult = await trpcClient.bracket.getSheetData.query({
              sheetId: NEW_SHEET_ID,
              tabId: String(3 + cycleNum)
            });
            
            const leader = leaderResult.success && leaderResult.values?.[0]?.[0]
              ? String(leaderResult.values[0][0]).trim()
              : '';

            const hasData = cashout.length > 0 || matches.length > 0;
            cycles.push({ cashout, matches, leader, hasData });
          } catch (e) {
            console.error(`Failed to fetch cycle ${cycleNum}:`, e);
            cycles.push({ cashout: [], matches: [], leader: '', hasData: false });
          }
        }

        console.log('[fetchAllData] Final state:', {
          registeredTeams: registeredTeams.length,
          teamRostersCount: Object.keys(teamRosters).length,
          standingsCount: standings.length,
          cyclesCount: cycles.length
        });
        
        setPageState({
          eventWinner: eventWinner || 'Pending Results',
          status: status || 'Awaiting Results',
          currentLeader: currentLeader && currentLeader !== 'Pending Results' ? currentLeader : 'Pending Results',
          registeredTeams,
          teamRosters,
          standings,
          cycles,
          isPreEvent,
          isLiveEvent,
          isEventComplete,
          dataAvailable: true
        });
        setIsLoading(false);
      } catch (error) {
        console.error('[fetchAllData] Failed to fetch sheet data:', error);
        setIsLoading(false);
      }
    };

    fetchAllData();
    const interval = setInterval(fetchAllData, 30000);
    return () => clearInterval(interval);
  }, [trpcClient]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-dark-charcoal flex items-center justify-center">
        <div className="text-center">
          <GlitchText size="xl" variant="cyan">Loading tournament data...</GlitchText>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-charcoal py-12 px-4">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <GlitchText size="2xl" variant="magenta">Development Division</GlitchText>
          <p className="text-white/60 font-mono">Live Tournament Bracket</p>
        </div>

        {/* Status Panels */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Event Winner */}
          <NeonCard variant="gold" className="p-6">
            <h3 className="text-sm font-bold text-white/60 mb-2 font-mono">EVENT WINNER</h3>
            <p className="text-2xl font-bold text-neon-gold font-mono">{pageState.eventWinner}</p>
          </NeonCard>

          {/* Status */}
          <NeonCard variant="cyan" className="p-6">
            <h3 className="text-sm font-bold text-white/60 mb-2 font-mono">STATUS</h3>
            <p className="text-2xl font-bold text-neon-cyan font-mono">{pageState.status}</p>
          </NeonCard>

          {/* Current Leader */}
          <NeonCard variant="magenta" className="p-6">
            <h3 className="text-sm font-bold text-white/60 mb-2 font-mono">CURRENT LEADER</h3>
            <p className="text-2xl font-bold text-neon-magenta font-mono">{pageState.currentLeader}</p>
          </NeonCard>
        </div>

        {/* Tournament Structure */}
        <NeonCard variant="gold" className="p-8">
          <h2 className="text-2xl font-bold text-neon-gold mb-8 font-mono">TOURNAMENT STRUCTURE</h2>
          
          {[1, 2, 3].map((cycleNum) => (
            <div key={cycleNum} className="mb-8 last:mb-0">
              <h3 className="text-xl font-bold text-white mb-4 font-mono">CYCLE {cycleNum}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Stage 1: Cashout */}
                <div className="border-2 border-neon-gold p-4">
                  <h4 className="text-sm font-bold text-white mb-3 font-mono">STAGE 1: CASHOUT</h4>
                  <div className="space-y-2 text-sm text-white/80 font-mono">
                    <p>4 Teams Compete</p>
                    <p>All 4 teams play one round of Cashout</p>
                    <p className="mt-3 font-bold">Placements</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>1st Place</li>
                      <li>2nd Place</li>
                      <li>3rd Place</li>
                      <li>4th Place</li>
                    </ul>
                  </div>
                </div>

                {/* Stage 2: Final Round */}
                <div className="border-2 border-neon-magenta p-4">
                  <h4 className="text-sm font-bold text-neon-magenta mb-3 font-mono">STAGE 2: FINAL ROUND</h4>
                  <div className="space-y-2 text-sm text-white/80 font-mono">
                    <p>Best of 3 Matches</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>1st vs 2nd (BO3)</li>
                      <li>3rd vs 4th (BO3)</li>
                    </ul>
                    <p className="mt-3">1 FRP Per Round Win</p>
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
          <div className="space-y-4 text-white/80 font-mono text-sm">
            <p>
              <span className="font-bold">Highest FRP After 3 Cycles:</span> The team with the most accumulated Final Round Points across all three cycles wins the tournament.
            </p>
            <p>
              <span className="font-bold">Tie Scenario:</span> If two or more teams are tied on FRP, a Sudden Death Final Round determines the champion.
            </p>
            <p>
              <span className="font-bold">FRP Tracking:</span> FRP is tracked cumulatively throughout the tournament. Every round win in Stage 2 contributes to your total.
            </p>
          </div>
        </NeonCard>

        {/* Registered Teams */}
        {pageState.registeredTeams.length > 0 && (
          <NeonCard variant="magenta" className="p-8">
            <h2 className="text-2xl font-bold text-neon-magenta mb-6 font-mono">REGISTERED TEAMS</h2>
            <div className="space-y-4">
              {pageState.registeredTeams.map((teamName) => {
                const roster = pageState.teamRosters[teamName];
                const isExpanded = expandedTeams.has(teamName);
                
                return (
                  <div key={teamName} className="border border-neon-magenta/50 rounded">
                    <button
                      onClick={() => {
                        const newExpanded = new Set(expandedTeams);
                        if (newExpanded.has(teamName)) {
                          newExpanded.delete(teamName);
                        } else {
                          newExpanded.add(teamName);
                        }
                        setExpandedTeams(newExpanded);
                      }}
                      className="w-full p-4 flex items-center justify-between hover:bg-neon-magenta/10 transition-colors"
                    >
                      <span className="font-bold text-white font-mono">{teamName}</span>
                      <ChevronDown
                        size={20}
                        className={`text-neon-magenta transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      />
                    </button>

                    {isExpanded && roster && (
                      <div className="bg-dark-charcoal/50 p-4 border-t border-neon-magenta/50 space-y-2 text-sm font-mono">
                        {roster.teamLeader && <p><span className="text-neon-magenta">Team Leader:</span> {roster.teamLeader}</p>}
                        {roster.player1 && <p><span className="text-neon-magenta">Player 1:</span> {roster.player1}</p>}
                        {roster.player2 && <p><span className="text-neon-magenta">Player 2:</span> {roster.player2}</p>}
                        {roster.player3 && <p><span className="text-neon-magenta">Player 3:</span> {roster.player3}</p>}
                        {roster.sub && <p><span className="text-neon-magenta">Sub:</span> {roster.sub}</p>}
                        {!roster.teamLeader && !roster.player1 && <p className="text-white/60">Roster pending</p>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </NeonCard>
        )}

        {/* Cycles */}
        {pageState.cycles.some(c => c.hasData) && (
          <NeonCard variant="cyan" className="p-8">
            <h2 className="text-2xl font-bold text-neon-cyan mb-6 font-mono">LIVE CYCLES</h2>
            <div className="space-y-6">
              {pageState.cycles.map((cycle, idx) => {
                const isExpanded = expandedCycles.has(idx);
                
                return (
                  <div key={idx} className="border border-neon-cyan/50 rounded">
                    <button
                      onClick={() => {
                        const newExpanded = new Set(expandedCycles);
                        if (newExpanded.has(idx)) {
                          newExpanded.delete(idx);
                        } else {
                          newExpanded.add(idx);
                        }
                        setExpandedCycles(newExpanded);
                      }}
                      className="w-full p-4 flex items-center justify-between hover:bg-neon-cyan/10 transition-colors"
                    >
                      <span className="font-bold text-white font-mono">Cycle {idx + 1}</span>
                      <ChevronDown
                        size={20}
                        className={`text-neon-cyan transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      />
                    </button>

                    {isExpanded && cycle.hasData && (
                      <div className="bg-dark-charcoal/50 p-4 border-t border-neon-cyan/50 space-y-4">
                        {cycle.cashout.length > 0 && (
                          <div>
                            <h4 className="font-bold text-neon-cyan mb-2 font-mono">Cashout Results</h4>
                            <div className="space-y-1 text-sm font-mono">
                              {cycle.cashout.map((result) => (
                                <p key={result.team}>
                                  <span className="text-white/60">#{result.placement}</span> {result.team}
                                </p>
                              ))}
                            </div>
                          </div>
                        )}

                        {cycle.matches.length > 0 && (
                          <div>
                            <h4 className="font-bold text-neon-cyan mb-2 font-mono">Match Results</h4>
                            <div className="space-y-1 text-sm font-mono">
                              {cycle.matches.map((match, i) => (
                                <p key={i}>
                                  <span className="text-neon-magenta">{match.winner}</span> vs {match.loser}
                                </p>
                              ))}
                            </div>
                          </div>
                        )}

                        {cycle.leader && (
                          <div>
                            <p className="text-sm font-mono">
                              <span className="text-neon-cyan font-bold">Cycle Leader:</span> {cycle.leader}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </NeonCard>
        )}

        {/* Standings */}
        {pageState.standings.length > 0 && (
          <NeonCard variant="gold" className="p-8">
            <h2 className="text-2xl font-bold text-neon-gold mb-6 font-mono">STANDINGS</h2>
            <div className="space-y-2">
              {pageState.standings.map((standing) => (
                <div key={standing.name} className="flex justify-between items-center p-3 bg-dark-charcoal/50 rounded border border-neon-gold/20">
                  <div className="flex items-center gap-4">
                    <span className="text-neon-gold font-bold font-mono">#{standing.rank}</span>
                    <span className="text-white font-mono">{standing.name}</span>
                  </div>
                  <span className="text-neon-gold font-bold font-mono">{standing.frp} FRP</span>
                </div>
              ))}
            </div>
          </NeonCard>
        )}

        {/* Tournament History Button */}
        <div className="flex justify-center">
          <Link href="/tournaments">
            <button className="px-8 py-3 border-2 border-neon-cyan text-neon-cyan font-bold font-mono hover:bg-neon-cyan/10 transition-colors">
              TOURNAMENT HISTORY
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
