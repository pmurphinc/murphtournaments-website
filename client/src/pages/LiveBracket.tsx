import NeonCard from '@/components/NeonCard';
import GlitchText from '@/components/GlitchText';
import { Link } from 'wouter';
import { useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

/**
 * Live Bracket Page - Development Division
 * Uses DD Scorekeeper 2.0 Google Sheet as single source of truth
 * - Smart data fetching from multiple tabs
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

// Helper to get CSV export URL for a specific tab
const getSheetCsvUrl = (sheetId: string, tabId: string) => 
  `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${tabId}`;

// Parse CSV data
const parseCsv = (csv: string): string[][] => {
  return csv.split('\n').map(line => 
    line.split(',').map(cell => cell.trim().replace(/^"(.*)"$/, '$1'))
  );
};

// Extract cell value from CSV data (1-indexed)
const getCellValue = (data: string[][], row: number, col: number): string => {
  if (row - 1 < data.length && col - 1 < data[row - 1].length) {
    return data[row - 1][col - 1] || '';
  }
  return '';
};

// Extract range from CSV data (1-indexed)
const getRangeValues = (data: string[][], startRow: number, endRow: number, col: number): string[] => {
  const values: string[] = [];
  for (let i = startRow; i <= endRow; i++) {
    const val = getCellValue(data, i, col);
    if (val) values.push(val);
  }
  return values;
};

export default function LiveBracket() {
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
    dataAvailable: true
  });

  const toggleCycle = (idx: number) => {
    const newSet = new Set(expandedCycles);
    if (newSet.has(idx)) {
      newSet.delete(idx);
    } else {
      newSet.add(idx);
    }
    setExpandedCycles(newSet);
  };

  const toggleTeam = (teamName: string) => {
    const newSet = new Set(expandedTeams);
    if (newSet.has(teamName)) {
      newSet.delete(teamName);
    } else {
      newSet.add(teamName);
    }
    setExpandedTeams(newSet);
  };

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        // Fetch Lists tab (gid=0) for registered teams
        const listsUrl = getSheetCsvUrl(NEW_SHEET_ID, '0');
        const listsResponse = await fetch(listsUrl);
        const listsData = parseCsv(await listsResponse.text());
        const registeredTeams = getRangeValues(listsData, 5, 24, 1).filter(t => t.trim());

        // Fetch Team Members tab (gid=1) for rosters
        const teamMembersUrl = getSheetCsvUrl(NEW_SHEET_ID, '1');
        const teamMembersResponse = await fetch(teamMembersUrl);
        const teamMembersData = parseCsv(await teamMembersResponse.text());

        // Build roster map from Team Members sheet
        const teamRosters: Record<string, TeamRoster> = {};
        for (let row = 2; row <= 21; row++) {
          const teamName = getCellValue(teamMembersData, row, 1).trim();
          if (teamName) {
            teamRosters[teamName] = {
              teamName,
              teamLeader: getCellValue(teamMembersData, row, 2).trim(),
              player1: getCellValue(teamMembersData, row, 3).trim(),
              player2: getCellValue(teamMembersData, row, 4).trim(),
              player3: getCellValue(teamMembersData, row, 5).trim(),
              sub: getCellValue(teamMembersData, row, 6).trim()
            };
          }
        }

        // Fetch Dashboard tab (gid=2) for status
        const dashboardUrl = getSheetCsvUrl(NEW_SHEET_ID, '2');
        const dashboardResponse = await fetch(dashboardUrl);
        const dashboardData = parseCsv(await dashboardResponse.text());

        const eventWinner = getCellValue(dashboardData, 6, 2) || 'Pending Results';
        const status = getCellValue(dashboardData, 6, 5) || 'Awaiting Results';
        const currentLeader = getCellValue(dashboardData, 6, 9) || 'Pending Results';

        // Determine event state
        const isPreEvent = status === 'Awaiting Results' || status === 'Pre-Event';
        const isLiveEvent = status === 'Live' || status === 'In Progress';
        const isEventComplete = status === 'Complete' || eventWinner !== 'Pending Results';

        // Fetch Standings tab (gid=3) for leaderboard
        const standingsUrl = getSheetCsvUrl(NEW_SHEET_ID, '3');
        const standingsResponse = await fetch(standingsUrl);
        const standingsData = parseCsv(await standingsResponse.text());

        const standings: Array<{ name: string; frp: number; rank: number }> = [];
        for (let row = 5; row <= 24; row++) {
          const teamName = getCellValue(standingsData, row, 10).trim();
          const frpStr = getCellValue(standingsData, row, 11).trim();
          const rankStr = getCellValue(standingsData, row, 12).trim();
          if (teamName && frpStr) {
            standings.push({
              name: teamName,
              frp: parseInt(frpStr) || 0,
              rank: parseInt(rankStr) || 0
            });
          }
        }

        // Fetch cycles data
        const cycles: CycleData[] = [];

        // Cycle 1 (gid=4)
        try {
          const cycle1Url = getSheetCsvUrl(NEW_SHEET_ID, '4');
          const cycle1Response = await fetch(cycle1Url);
          const cycleData = parseCsv(await cycle1Response.text());

          const cashout: CashoutResult[] = [];
          for (let i = 0; i < 4; i++) {
            const placement = getCellValue(cycleData, 7 + i, 1).trim();
            const team = getCellValue(cycleData, 7 + i, 2).trim();
            if (team && placement) {
              cashout.push({ team, placement: parseInt(placement) || i + 1 });
            }
          }

          const cycleLeader = getCellValue(cycleData, 26, 10).trim() || 'Pending Results';
          const matches: MatchResult[] = [];

          // Match 1 (G12:G16)
          const match1Status = getCellValue(cycleData, 21, 7);
          if (match1Status !== 'Awaiting Teams' && match1Status !== '') {
            const match1Winners = [
              getCellValue(cycleData, 12, 7),
              getCellValue(cycleData, 13, 7),
              getCellValue(cycleData, 14, 7)
            ].filter(w => w && w !== 'N/A');
            
            if (match1Winners.length > 0) {
              const winCount: Record<string, number> = {};
              match1Winners.forEach(w => {
                winCount[w] = (winCount[w] || 0) + 1;
              });
              
              const sorted = Object.entries(winCount).sort((a, b) => b[1] - a[1]);
              if (sorted.length >= 2) {
                matches.push({ winner: sorted[0][0], loser: sorted[1][0] });
              } else if (sorted.length === 1) {
                matches.push({ winner: sorted[0][0], loser: 'TBD' });
              }
            }
          }

          // Match 2 (G17:G21)
          const match2Status = getCellValue(cycleData, 21, 7);
          if (match2Status !== 'Awaiting Teams' && match2Status !== '') {
            const match2Winners = [
              getCellValue(cycleData, 17, 7),
              getCellValue(cycleData, 18, 7),
              getCellValue(cycleData, 19, 7)
            ].filter(w => w && w !== 'N/A');
            
            if (match2Winners.length > 0) {
              const winCount: Record<string, number> = {};
              match2Winners.forEach(w => {
                winCount[w] = (winCount[w] || 0) + 1;
              });
              
              const sorted = Object.entries(winCount).sort((a, b) => b[1] - a[1]);
              if (sorted.length >= 2) {
                matches.push({ winner: sorted[0][0], loser: sorted[1][0] });
              } else if (sorted.length === 1) {
                matches.push({ winner: sorted[0][0], loser: 'TBD' });
              }
            }
          }

          cycles.push({
            cashout,
            matches,
            leader: cycleLeader,
            hasData: true
          });
        } catch (e) {
          console.error('Failed to fetch cycle 1:', e);
        }

        // Cycle 2 (gid=5)
        try {
          const cycle2Url = getSheetCsvUrl(NEW_SHEET_ID, '5');
          const cycle2Response = await fetch(cycle2Url);
          const cycleData = parseCsv(await cycle2Response.text());

          const cashout: CashoutResult[] = [];
          for (let i = 0; i < 4; i++) {
            const placement = getCellValue(cycleData, 7 + i, 1).trim();
            const team = getCellValue(cycleData, 7 + i, 2).trim();
            if (team && placement) {
              cashout.push({ team, placement: parseInt(placement) || i + 1 });
            }
          }

          const cycleLeader = getCellValue(cycleData, 26, 10).trim() || 'Pending Results';
          const matches: MatchResult[] = [];

          const match1Status = getCellValue(cycleData, 21, 7);
          if (match1Status !== 'Awaiting Teams' && match1Status !== '') {
            const match1Winners = [
              getCellValue(cycleData, 12, 7),
              getCellValue(cycleData, 13, 7),
              getCellValue(cycleData, 14, 7)
            ].filter(w => w && w !== 'N/A');
            
            if (match1Winners.length > 0) {
              const winCount: Record<string, number> = {};
              match1Winners.forEach(w => {
                winCount[w] = (winCount[w] || 0) + 1;
              });
              
              const sorted = Object.entries(winCount).sort((a, b) => b[1] - a[1]);
              if (sorted.length >= 2) {
                matches.push({ winner: sorted[0][0], loser: sorted[1][0] });
              } else if (sorted.length === 1) {
                matches.push({ winner: sorted[0][0], loser: 'TBD' });
              }
            }
          }

          const match2Status = getCellValue(cycleData, 21, 7);
          if (match2Status !== 'Awaiting Teams' && match2Status !== '') {
            const match2Winners = [
              getCellValue(cycleData, 17, 7),
              getCellValue(cycleData, 18, 7),
              getCellValue(cycleData, 19, 7)
            ].filter(w => w && w !== 'N/A');
            
            if (match2Winners.length > 0) {
              const winCount: Record<string, number> = {};
              match2Winners.forEach(w => {
                winCount[w] = (winCount[w] || 0) + 1;
              });
              
              const sorted = Object.entries(winCount).sort((a, b) => b[1] - a[1]);
              if (sorted.length >= 2) {
                matches.push({ winner: sorted[0][0], loser: sorted[1][0] });
              } else if (sorted.length === 1) {
                matches.push({ winner: sorted[0][0], loser: 'TBD' });
              }
            }
          }

          cycles.push({
            cashout,
            matches,
            leader: cycleLeader,
            hasData: true
          });
        } catch (e) {
          console.error('Failed to fetch cycle 2:', e);
        }

        // Cycle 3 (gid=6)
        try {
          const cycle3Url = getSheetCsvUrl(NEW_SHEET_ID, '6');
          const cycle3Response = await fetch(cycle3Url);
          const cycleData = parseCsv(await cycle3Response.text());

          const cashout: CashoutResult[] = [];
          for (let i = 0; i < 4; i++) {
            const placement = getCellValue(cycleData, 7 + i, 1).trim();
            const team = getCellValue(cycleData, 7 + i, 2).trim();
            if (team && placement) {
              cashout.push({ team, placement: parseInt(placement) || i + 1 });
            }
          }

          const cycleLeader = getCellValue(cycleData, 26, 10).trim() || 'Pending Results';
          const matches: MatchResult[] = [];

          const match1Status = getCellValue(cycleData, 21, 7);
          if (match1Status !== 'Awaiting Teams' && match1Status !== '') {
            const match1Winners = [
              getCellValue(cycleData, 12, 7),
              getCellValue(cycleData, 13, 7),
              getCellValue(cycleData, 14, 7)
            ].filter(w => w && w !== 'N/A');
            
            if (match1Winners.length > 0) {
              const winCount: Record<string, number> = {};
              match1Winners.forEach(w => {
                winCount[w] = (winCount[w] || 0) + 1;
              });
              
              const sorted = Object.entries(winCount).sort((a, b) => b[1] - a[1]);
              if (sorted.length >= 2) {
                matches.push({ winner: sorted[0][0], loser: sorted[1][0] });
              } else if (sorted.length === 1) {
                matches.push({ winner: sorted[0][0], loser: 'TBD' });
              }
            }
          }

          const match2Status = getCellValue(cycleData, 21, 7);
          if (match2Status !== 'Awaiting Teams' && match2Status !== '') {
            const match2Winners = [
              getCellValue(cycleData, 17, 7),
              getCellValue(cycleData, 18, 7),
              getCellValue(cycleData, 19, 7)
            ].filter(w => w && w !== 'N/A');
            
            if (match2Winners.length > 0) {
              const winCount: Record<string, number> = {};
              match2Winners.forEach(w => {
                winCount[w] = (winCount[w] || 0) + 1;
              });
              
              const sorted = Object.entries(winCount).sort((a, b) => b[1] - a[1]);
              if (sorted.length >= 2) {
                matches.push({ winner: sorted[0][0], loser: sorted[1][0] });
              } else if (sorted.length === 1) {
                matches.push({ winner: sorted[0][0], loser: 'TBD' });
              }
            }
          }

          cycles.push({
            cashout,
            matches,
            leader: cycleLeader,
            hasData: true
          });
        } catch (e) {
          console.error('Failed to fetch cycle 3:', e);
        }

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
        console.error('Failed to fetch sheet data:', error);
        setPageState(prev => ({
          ...prev,
          dataAvailable: false
        }));
        setIsLoading(false);
      }
    };

    fetchAllData();
    const interval = setInterval(fetchAllData, 30000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-dark-charcoal py-20">
        <div className="container">
          <div className="text-center text-white/50 font-mono">Loading tournament data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-charcoal py-20">
      <div className="container">
        {/* Data Status Indicator */}
        {!pageState.dataAvailable && (
          <div className="mb-6 p-3 bg-neon-magenta/10 border border-neon-magenta/50 rounded text-neon-magenta text-sm font-mono">
            ⚠ Live data unavailable - please refresh
          </div>
        )}

        {/* Header */}
        <div className="mb-16">
          <GlitchText size="xl" variant="lime" className="mb-4">
            Development Division
          </GlitchText>
          <p className="text-lg text-white/80 font-mono max-w-2xl">
            The Development Division is played across three competitive cycles. Each cycle functions as a complete mini-bracket, where teams first establish seeding through Cashout and then compete in Final Round matchups for points. Performance carries across all three cycles, with Final Round Points (FRP) accumulating to determine the overall winner.
          </p>
        </div>

        {/* Tournament Structure */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold font-mono text-neon-gold mb-6 uppercase">Tournament Structure</h2>
          <div className="space-y-8">
            {/* Cycle 1 */}
            <div>
              <h3 className="text-xl font-bold font-mono text-white mb-4 uppercase">Cycle 1</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <NeonCard variant="gold">
                  <h4 className="text-lg font-bold font-mono text-neon-gold mb-3 uppercase">Stage 1: Cashout</h4>
                  <div className="space-y-2 text-sm font-mono text-white/70">
                    <div><span className="text-neon-gold font-bold">4 Teams Compete</span></div>
                    <div className="text-xs">All 4 teams play one round of Cashout</div>
                    <div className="mt-3 text-neon-gold font-bold">Placements</div>
                    <div className="text-xs space-y-1">
                      <div>• 1st Place</div>
                      <div>• 2nd Place</div>
                      <div>• 3rd Place</div>
                      <div>• 4th Place</div>
                    </div>
                  </div>
                </NeonCard>
                <NeonCard variant="magenta">
                  <h4 className="text-lg font-bold font-mono text-neon-magenta mb-3 uppercase">Stage 2: Final Round</h4>
                  <div className="space-y-2 text-sm font-mono text-white/70">
                    <div><span className="text-neon-magenta font-bold">Best of 3 Matches</span></div>
                    <div className="text-xs space-y-1">
                      <div>• 1st vs 2nd (BO3)</div>
                      <div>• 3rd vs 4th (BO3)</div>
                    </div>
                    <div className="mt-3 text-neon-magenta font-bold">1 FRP Per Round Win</div>
                    <div className="text-xs">Each victory = 1 FRP</div>
                  </div>
                </NeonCard>
              </div>
            </div>

            {/* Cycle 2 */}
            <div>
              <h3 className="text-xl font-bold font-mono text-white mb-4 uppercase">Cycle 2</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <NeonCard variant="gold">
                  <h4 className="text-lg font-bold font-mono text-neon-gold mb-3 uppercase">Stage 1: Cashout</h4>
                  <div className="space-y-2 text-sm font-mono text-white/70">
                    <div><span className="text-neon-gold font-bold">4 Teams Compete</span></div>
                    <div className="text-xs">All 4 teams play one round of Cashout</div>
                    <div className="mt-3 text-neon-gold font-bold">Placements</div>
                    <div className="text-xs space-y-1">
                      <div>• 1st Place</div>
                      <div>• 2nd Place</div>
                      <div>• 3rd Place</div>
                      <div>• 4th Place</div>
                    </div>
                  </div>
                </NeonCard>
                <NeonCard variant="magenta">
                  <h4 className="text-lg font-bold font-mono text-neon-magenta mb-3 uppercase">Stage 2: Final Round</h4>
                  <div className="space-y-2 text-sm font-mono text-white/70">
                    <div><span className="text-neon-magenta font-bold">Best of 3 Matches</span></div>
                    <div className="text-xs space-y-1">
                      <div>• 1st vs 2nd (BO3)</div>
                      <div>• 3rd vs 4th (BO3)</div>
                    </div>
                    <div className="mt-3 text-neon-magenta font-bold">1 FRP Per Round Win</div>
                    <div className="text-xs">Each victory = 1 FRP</div>
                  </div>
                </NeonCard>
              </div>
            </div>

            {/* Cycle 3 */}
            <div>
              <h3 className="text-xl font-bold font-mono text-white mb-4 uppercase">Cycle 3</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <NeonCard variant="gold">
                  <h4 className="text-lg font-bold font-mono text-neon-gold mb-3 uppercase">Stage 1: Cashout</h4>
                  <div className="space-y-2 text-sm font-mono text-white/70">
                    <div><span className="text-neon-gold font-bold">4 Teams Compete</span></div>
                    <div className="text-xs">All 4 teams play one round of Cashout</div>
                    <div className="mt-3 text-neon-gold font-bold">Placements</div>
                    <div className="text-xs space-y-1">
                      <div>• 1st Place</div>
                      <div>• 2nd Place</div>
                      <div>• 3rd Place</div>
                      <div>• 4th Place</div>
                    </div>
                  </div>
                </NeonCard>
                <NeonCard variant="magenta">
                  <h4 className="text-lg font-bold font-mono text-neon-magenta mb-3 uppercase">Stage 2: Final Round</h4>
                  <div className="space-y-2 text-sm font-mono text-white/70">
                    <div><span className="text-neon-magenta font-bold">Best of 3 Matches</span></div>
                    <div className="text-xs space-y-1">
                      <div>• 1st vs 2nd (BO3)</div>
                      <div>• 3rd vs 4th (BO3)</div>
                    </div>
                    <div className="mt-3 text-neon-magenta font-bold">1 FRP Per Round Win</div>
                    <div className="text-xs">Each victory = 1 FRP</div>
                  </div>
                </NeonCard>
              </div>
            </div>
          </div>
        </div>

        {/* Win Condition */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold font-mono text-neon-cyan mb-6 uppercase">Win Condition</h2>
          <NeonCard variant="cyan">
            <div className="space-y-4 text-sm font-mono text-white/70">
              <div>
                <span className="text-neon-cyan font-bold">Highest FRP After 3 Cycles:</span> The team with the most accumulated Final Round Points across all three cycles wins the tournament.
              </div>
              <div className="border-t border-neon-cyan/30 pt-4">
                <span className="text-neon-cyan font-bold">Tie Scenario:</span> If two or more teams are tied on FRP, a Sudden Death Final Round determines the champion.
              </div>
              <div className="border-t border-neon-cyan/30 pt-4">
                <span className="text-neon-cyan font-bold">FRP Tracking:</span> FRP is tracked cumulatively throughout the tournament. Every round win in Stage 2 contributes to your total.
              </div>
            </div>
          </NeonCard>
        </div>

        {/* PRE-EVENT STATE: Show Teams */}
        {pageState.isPreEvent && (
          <>
            {/* Registered Teams (TOP) */}
            <div className="mb-16">
              <h2 className="text-2xl font-bold font-mono text-neon-cyan mb-6 uppercase">Registered Teams ({pageState.registeredTeams.length})</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pageState.registeredTeams.map((team, idx) => {
                  const roster = pageState.teamRosters[team];
                  const isExpanded = expandedTeams.has(team);

                  return (
                    <div key={idx}>
                      {/* Team Card Header */}
                      <button
                        onClick={() => toggleTeam(team)}
                        className="w-full"
                      >
                        <NeonCard variant="cyan" className="cursor-pointer hover:opacity-80 transition-opacity">
                          <div className="flex items-center justify-between">
                            <p className="text-lg font-bold font-mono text-neon-cyan uppercase">{team}</p>
                            <ChevronDown
                              size={20}
                              className={`text-neon-cyan transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                            />
                          </div>
                        </NeonCard>
                      </button>

                      {/* Roster Dropdown */}
                      {isExpanded && (
                        <div className="mt-2 p-4 bg-dark-charcoal/50 border border-neon-cyan/30 rounded text-sm font-mono text-white/70 space-y-2">
                          {roster ? (
                            <>
                              {roster.teamLeader && (
                                <div><span className="text-neon-cyan font-bold">Team Leader:</span> {roster.teamLeader}</div>
                              )}
                              {roster.player1 && (
                                <div><span className="text-neon-cyan font-bold">Player 1:</span> {roster.player1}</div>
                              )}
                              {roster.player2 && (
                                <div><span className="text-neon-cyan font-bold">Player 2:</span> {roster.player2}</div>
                              )}
                              {roster.player3 && (
                                <div><span className="text-neon-cyan font-bold">Player 3:</span> {roster.player3}</div>
                              )}
                              {roster.sub && (
                                <div><span className="text-neon-cyan font-bold">Sub:</span> {roster.sub}</div>
                              )}
                              {!roster.teamLeader && !roster.player1 && !roster.player2 && !roster.player3 && !roster.sub && (
                                <div className="text-white/50 italic">Roster pending</div>
                              )}
                            </>
                          ) : (
                            <div className="text-white/50 italic">Roster pending</div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* LIVE EVENT STATE: Show Status + Standings + Cycles + Teams */}
        {pageState.isLiveEvent && (
          <>
            {/* Status Panels */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-16">
              <NeonCard variant="cyan">
                <h3 className="text-sm font-mono text-white/50 uppercase mb-3">Status</h3>
                <p className="text-xl font-bold font-mono text-neon-cyan">{pageState.status}</p>
              </NeonCard>
              {pageState.currentLeader !== 'Pending Results' && (
                <NeonCard variant="magenta">
                  <h3 className="text-sm font-mono text-white/50 uppercase mb-3">Current Leader</h3>
                  <p className="text-xl font-bold font-mono text-neon-magenta">{pageState.currentLeader}</p>
                </NeonCard>
              )}
            </div>

            {/* Standings Leaderboard (PRIMARY) */}
            {pageState.standings.length > 0 && (
              <div className="mb-16">
                <h2 className="text-2xl font-bold font-mono text-neon-gold mb-6 uppercase">Standings</h2>
                <NeonCard variant="gold">
                  <div className="space-y-2">
                    <div className="grid grid-cols-3 gap-4 pb-3 border-b border-neon-gold/30 text-xs font-mono text-white/50 uppercase">
                      <div>Team</div>
                      <div className="text-right">Rank</div>
                      <div className="text-right">Total FRP</div>
                    </div>
                    {pageState.standings.map((team, idx) => (
                      <div key={idx} className="grid grid-cols-3 gap-4 py-2 text-sm font-mono">
                        <div className="text-neon-gold font-bold">{team.name}</div>
                        <div className="text-right text-white/70">#{team.rank}</div>
                        <div className="text-right text-neon-lime font-bold">{team.frp}</div>
                      </div>
                    ))}
                  </div>
                </NeonCard>
              </div>
            )}

            {/* Cycles (Collapsible) */}
            {pageState.cycles.length > 0 && (
              <div className="mb-16">
                <h2 className="text-2xl font-bold font-mono text-neon-magenta mb-6 uppercase">Cycles</h2>
                <div className="space-y-4">
                  {pageState.cycles.map((cycle, cycleIdx) => (
                    <div key={cycleIdx}>
                      {/* Cycle Header (Collapsible) */}
                      <button
                        onClick={() => toggleCycle(cycleIdx)}
                        className="w-full"
                      >
                        <NeonCard variant="gold" className="cursor-pointer hover:opacity-80 transition-opacity">
                          <div className="flex items-center justify-between">
                            <h3 className="text-xl font-bold font-mono text-neon-gold uppercase">Cycle {cycleIdx + 1}</h3>
                            <ChevronDown
                              size={24}
                              className={`text-neon-gold transition-transform ${expandedCycles.has(cycleIdx) ? 'rotate-180' : ''}`}
                            />
                          </div>
                        </NeonCard>
                      </button>

                      {/* Cycle Content (Expanded) */}
                      {expandedCycles.has(cycleIdx) && (
                        <div className="mt-4 space-y-4">
                          {/* Cashout Results */}
                          {cycle.cashout.length > 0 && (
                            <NeonCard variant="gold">
                              <h4 className="text-lg font-bold font-mono text-neon-gold mb-4 uppercase">Cashout Results</h4>
                              <div className="space-y-2">
                                {cycle.cashout.map((result, idx) => (
                                  <div key={idx} className="text-sm font-mono text-white/70">
                                    <span className="text-neon-gold font-bold">{result.placement}.</span> {result.team}
                                  </div>
                                ))}
                              </div>
                            </NeonCard>
                          )}

                          {/* Match Results */}
                          {cycle.matches.length > 0 && (
                            <NeonCard variant="magenta">
                              <h4 className="text-lg font-bold font-mono text-neon-magenta mb-4 uppercase">Match Results</h4>
                              <div className="space-y-2">
                                {cycle.matches.map((match, idx) => (
                                  <div key={idx} className="text-sm font-mono text-white/70">
                                    <span className="text-neon-magenta font-bold">{match.winner}</span> def. {match.loser}
                                  </div>
                                ))}
                              </div>
                            </NeonCard>
                          )}

                          {/* Cycle Leader */}
                          {cycle.leader && cycle.leader !== 'Pending Results' && (
                            <NeonCard variant="lime">
                              <h4 className="text-sm font-mono text-white/50 uppercase mb-2">Cycle Leader</h4>
                              <p className="text-lg font-bold font-mono text-neon-lime">{cycle.leader}</p>
                            </NeonCard>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Registered Teams (LOWER) */}
            <div className="mb-16">
              <h2 className="text-2xl font-bold font-mono text-neon-cyan mb-6 uppercase">Registered Teams ({pageState.registeredTeams.length})</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pageState.registeredTeams.map((team, idx) => {
                  const roster = pageState.teamRosters[team];
                  const isExpanded = expandedTeams.has(team);

                  return (
                    <div key={idx}>
                      {/* Team Card Header */}
                      <button
                        onClick={() => toggleTeam(team)}
                        className="w-full"
                      >
                        <NeonCard variant="cyan" className="cursor-pointer hover:opacity-80 transition-opacity">
                          <div className="flex items-center justify-between">
                            <p className="text-lg font-bold font-mono text-neon-cyan uppercase">{team}</p>
                            <ChevronDown
                              size={20}
                              className={`text-neon-cyan transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                            />
                          </div>
                        </NeonCard>
                      </button>

                      {/* Roster Dropdown */}
                      {isExpanded && (
                        <div className="mt-2 p-4 bg-dark-charcoal/50 border border-neon-cyan/30 rounded text-sm font-mono text-white/70 space-y-2">
                          {roster ? (
                            <>
                              {roster.teamLeader && (
                                <div><span className="text-neon-cyan font-bold">Team Leader:</span> {roster.teamLeader}</div>
                              )}
                              {roster.player1 && (
                                <div><span className="text-neon-cyan font-bold">Player 1:</span> {roster.player1}</div>
                              )}
                              {roster.player2 && (
                                <div><span className="text-neon-cyan font-bold">Player 2:</span> {roster.player2}</div>
                              )}
                              {roster.player3 && (
                                <div><span className="text-neon-cyan font-bold">Player 3:</span> {roster.player3}</div>
                              )}
                              {roster.sub && (
                                <div><span className="text-neon-cyan font-bold">Sub:</span> {roster.sub}</div>
                              )}
                              {!roster.teamLeader && !roster.player1 && !roster.player2 && !roster.player3 && !roster.sub && (
                                <div className="text-white/50 italic">Roster pending</div>
                              )}
                            </>
                          ) : (
                            <div className="text-white/50 italic">Roster pending</div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* EVENT COMPLETE STATE: Show Winner + Standings + Cycles + Teams */}
        {pageState.isEventComplete && (
          <>
            {/* Event Winner (TOP) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-16">
              <NeonCard variant="gold">
                <h3 className="text-sm font-mono text-white/50 uppercase mb-3">Event Winner</h3>
                <p className="text-xl font-bold font-mono text-neon-gold">{pageState.eventWinner}</p>
              </NeonCard>
            </div>

            {/* Final Standings */}
            {pageState.standings.length > 0 && (
              <div className="mb-16">
                <h2 className="text-2xl font-bold font-mono text-neon-gold mb-6 uppercase">Final Standings</h2>
                <NeonCard variant="gold">
                  <div className="space-y-2">
                    <div className="grid grid-cols-3 gap-4 pb-3 border-b border-neon-gold/30 text-xs font-mono text-white/50 uppercase">
                      <div>Team</div>
                      <div className="text-right">Rank</div>
                      <div className="text-right">Total FRP</div>
                    </div>
                    {pageState.standings.map((team, idx) => (
                      <div key={idx} className="grid grid-cols-3 gap-4 py-2 text-sm font-mono">
                        <div className="text-neon-gold font-bold">{team.name}</div>
                        <div className="text-right text-white/70">#{team.rank}</div>
                        <div className="text-right text-neon-lime font-bold">{team.frp}</div>
                      </div>
                    ))}
                  </div>
                </NeonCard>
              </div>
            )}

            {/* Cycles (Collapsible) */}
            {pageState.cycles.length > 0 && (
              <div className="mb-16">
                <h2 className="text-2xl font-bold font-mono text-neon-magenta mb-6 uppercase">Cycles</h2>
                <div className="space-y-4">
                  {pageState.cycles.map((cycle, cycleIdx) => (
                    <div key={cycleIdx}>
                      {/* Cycle Header (Collapsible) */}
                      <button
                        onClick={() => toggleCycle(cycleIdx)}
                        className="w-full"
                      >
                        <NeonCard variant="gold" className="cursor-pointer hover:opacity-80 transition-opacity">
                          <div className="flex items-center justify-between">
                            <h3 className="text-xl font-bold font-mono text-neon-gold uppercase">Cycle {cycleIdx + 1}</h3>
                            <ChevronDown
                              size={24}
                              className={`text-neon-gold transition-transform ${expandedCycles.has(cycleIdx) ? 'rotate-180' : ''}`}
                            />
                          </div>
                        </NeonCard>
                      </button>

                      {/* Cycle Content (Expanded) */}
                      {expandedCycles.has(cycleIdx) && (
                        <div className="mt-4 space-y-4">
                          {cycle.cashout.length > 0 && (
                            <NeonCard variant="gold">
                              <h4 className="text-lg font-bold font-mono text-neon-gold mb-4 uppercase">Cashout Results</h4>
                              <div className="space-y-2">
                                {cycle.cashout.map((result, idx) => (
                                  <div key={idx} className="text-sm font-mono text-white/70">
                                    <span className="text-neon-gold font-bold">{result.placement}.</span> {result.team}
                                  </div>
                                ))}
                              </div>
                            </NeonCard>
                          )}

                          {cycle.matches.length > 0 && (
                            <NeonCard variant="magenta">
                              <h4 className="text-lg font-bold font-mono text-neon-magenta mb-4 uppercase">Match Results</h4>
                              <div className="space-y-2">
                                {cycle.matches.map((match, idx) => (
                                  <div key={idx} className="text-sm font-mono text-white/70">
                                    <span className="text-neon-magenta font-bold">{match.winner}</span> def. {match.loser}
                                  </div>
                                ))}
                              </div>
                            </NeonCard>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Registered Teams (BOTTOM) */}
            <div className="mb-16">
              <h2 className="text-2xl font-bold font-mono text-neon-cyan mb-6 uppercase">Registered Teams ({pageState.registeredTeams.length})</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pageState.registeredTeams.map((team, idx) => {
                  const roster = pageState.teamRosters[team];
                  const isExpanded = expandedTeams.has(team);

                  return (
                    <div key={idx}>
                      {/* Team Card Header */}
                      <button
                        onClick={() => toggleTeam(team)}
                        className="w-full"
                      >
                        <NeonCard variant="cyan" className="cursor-pointer hover:opacity-80 transition-opacity">
                          <div className="flex items-center justify-between">
                            <p className="text-lg font-bold font-mono text-neon-cyan uppercase">{team}</p>
                            <ChevronDown
                              size={20}
                              className={`text-neon-cyan transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                            />
                          </div>
                        </NeonCard>
                      </button>

                      {/* Roster Dropdown */}
                      {isExpanded && (
                        <div className="mt-2 p-4 bg-dark-charcoal/50 border border-neon-cyan/30 rounded text-sm font-mono text-white/70 space-y-2">
                          {roster ? (
                            <>
                              {roster.teamLeader && (
                                <div><span className="text-neon-cyan font-bold">Team Leader:</span> {roster.teamLeader}</div>
                              )}
                              {roster.player1 && (
                                <div><span className="text-neon-cyan font-bold">Player 1:</span> {roster.player1}</div>
                              )}
                              {roster.player2 && (
                                <div><span className="text-neon-cyan font-bold">Player 2:</span> {roster.player2}</div>
                              )}
                              {roster.player3 && (
                                <div><span className="text-neon-cyan font-bold">Player 3:</span> {roster.player3}</div>
                              )}
                              {roster.sub && (
                                <div><span className="text-neon-cyan font-bold">Sub:</span> {roster.sub}</div>
                              )}
                              {!roster.teamLeader && !roster.player1 && !roster.player2 && !roster.player3 && !roster.sub && (
                                <div className="text-white/50 italic">Roster pending</div>
                              )}
                            </>
                          ) : (
                            <div className="text-white/50 italic">Roster pending</div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* Navigation */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-16">
          <Link to="/tournaments">
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
