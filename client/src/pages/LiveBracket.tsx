import NeonCard from '@/components/NeonCard';
import GlitchText from '@/components/GlitchText';
import { Link } from 'wouter';
import { useState, useEffect } from 'react';

/**
 * Live Bracket Page - Development Division
 * Refactored to use DD Scorekeeper 2.0 Google Sheet
 * - Smart data fetching from multiple tabs (Dashboard, Cycle 1-3, Standings, Lists)
 * - Intelligent visibility logic based on event state (pre-event, live, complete)
 * - Cashout results, match results, and cycle leaders
 * - Real-time standings leaderboard
 */

interface Team {
  name: string;
  frp: number;
  rank: number;
  tieStatus: string;
}

interface CycleData {
  cashout: Array<{ team: string; placement: number }>;
  matches: Array<{ winner: string; loser: string }>;
  leader: string;
}

interface PageState {
  eventWinner: string;
  status: string;
  currentLeader: string;
  registeredTeams: string[];
  standings: Team[];
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
  const [expandedTeam, setExpandedTeam] = useState<number | null>(null);
  const [pageState, setPageState] = useState<PageState>({
    eventWinner: 'Pending Results',
    status: 'Awaiting Results',
    currentLeader: 'Pending Results',
    registeredTeams: [],
    standings: [],
    cycles: [],
    isPreEvent: true,
    isLiveEvent: false,
    isEventComplete: false,
    dataAvailable: true
  });

  // Fetch and parse all sheet data
  useEffect(() => {
    const fetchAllData = async () => {
      try {
        // Fetch Dashboard tab (gid=1845713046)
        const dashboardCsv = await fetch(getSheetCsvUrl(NEW_SHEET_ID, '1845713046')).then(r => r.text());
        const dashboardData = parseCsv(dashboardCsv);

        // Fetch Lists tab (gid=0)
        const listsCsv = await fetch(getSheetCsvUrl(NEW_SHEET_ID, '0')).then(r => r.text());
        const listsData = parseCsv(listsCsv);

        // Fetch Standings tab (gid=1845713047)
        const standingsCsv = await fetch(getSheetCsvUrl(NEW_SHEET_ID, '1845713047')).then(r => r.text());
        const standingsData = parseCsv(standingsCsv);

        // Extract Dashboard data
        const eventWinner = getCellValue(dashboardData, 4, 2); // B4
        const status = getCellValue(dashboardData, 4, 5); // E4
        const currentLeader = getCellValue(dashboardData, 4, 9); // I4

        // Extract Registered Teams from Lists tab (A3:A22)
        const registeredTeams = getRangeValues(listsData, 3, 22, 1);

        // Extract Standings (J5:L24)
        const standingsTeams = getRangeValues(standingsData, 5, 24, 10); // Column J
        const standingsFrps = getRangeValues(standingsData, 5, 24, 11); // Column K
        const standingsRanks = getRangeValues(standingsData, 5, 24, 12); // Column L

        const standings: Team[] = [];
        for (let i = 0; i < standingsTeams.length; i++) {
          if (standingsTeams[i]) {
            standings.push({
              name: standingsTeams[i],
              frp: parseInt(standingsFrps[i] || '0') || 0,
              rank: parseInt(standingsRanks[i] || '0') || 0,
              tieStatus: ''
            });
          }
        }

        // Determine page state
        const isPreEvent = status === 'Awaiting Results';
        const isEventComplete = eventWinner !== 'Pending Results' && eventWinner !== '';
        const isLiveEvent = standings.some(t => t.frp > 0) && !isEventComplete;

        // Fetch cycle data
        const cycles: CycleData[] = [];
        const cycleTabIds = ['1845713048', '1845713049', '1845713050']; // Cycle 1, 2, 3

        for (const tabId of cycleTabIds) {
          try {
            const cycleCsv = await fetch(getSheetCsvUrl(NEW_SHEET_ID, tabId)).then(r => r.text());
            const cycleData = parseCsv(cycleCsv);

            const cycleLeader = getCellValue(cycleData, 26, 7); // G26

            // Only include cycle if it has data
            if (cycleLeader !== 'Pending Results' && cycleLeader !== '') {
              // Extract Cashout results (A7:B10)
              const cashoutTeams = getRangeValues(cycleData, 7, 10, 1);
              const cashoutPlacements = getRangeValues(cycleData, 7, 10, 2);
              const cashout = cashoutTeams.map((team, idx) => ({
                team,
                placement: parseInt(cashoutPlacements[idx] || '0') || 0
              })).filter(c => c.team && c.placement);

              // Extract Match results
              const matches: Array<{ winner: string; loser: string }> = [];

              // Match 1 (B17:B21)
              const match1Status = getCellValue(cycleData, 21, 2);
              if (match1Status !== 'Awaiting Teams' && match1Status !== '') {
                const match1Winners = [
                  getCellValue(cycleData, 17, 2),
                  getCellValue(cycleData, 18, 2),
                  getCellValue(cycleData, 19, 2)
                ].filter(w => w && w !== 'N/A');
                
                if (match1Winners.length > 0) {
                  const winCount: Record<string, number> = {};
                  match1Winners.forEach(w => {
                    winCount[w] = (winCount[w] || 0) + 1;
                  });
                  const winner = Object.entries(winCount).sort((a, b) => b[1] - a[1])[0]?.[0];
                  if (winner) {
                    matches.push({ winner, loser: 'TBD' });
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
                  const winner = Object.entries(winCount).sort((a, b) => b[1] - a[1])[0]?.[0];
                  if (winner) {
                    matches.push({ winner, loser: 'TBD' });
                  }
                }
              }

              cycles.push({
                cashout,
                matches,
                leader: cycleLeader
              });
            }
          } catch (e) {
            console.error(`Failed to fetch cycle ${cycles.length + 1}:`, e);
          }
        }

        setPageState({
          eventWinner: eventWinner || 'Pending Results',
          status: status || 'Awaiting Results',
          currentLeader: currentLeader && currentLeader !== 'Pending Results' ? currentLeader : 'Pending Results',
          registeredTeams,
          standings,
          cycles,
          isPreEvent,
          isLiveEvent,
          isEventComplete,
          dataAvailable: true
        });
      } catch (error) {
        console.error('Failed to fetch sheet data:', error);
        setPageState(prev => ({
          ...prev,
          dataAvailable: false
        }));
      }
    };

    fetchAllData();
    const interval = setInterval(fetchAllData, 30000);
    return () => clearInterval(interval);
  }, []);

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

        {/* PRE-EVENT STATE: Show Status + Registered Teams */}
        {pageState.isPreEvent && (
          <>
            {/* Status Panel */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-16">
              <NeonCard variant="cyan">
                <h3 className="text-sm font-mono text-white/50 uppercase mb-3">Status</h3>
                <p className="text-xl font-bold font-mono text-neon-cyan">{pageState.status}</p>
              </NeonCard>
            </div>

            {/* Registered Teams */}
            <div className="mb-16">
              <h2 className="text-2xl font-bold font-mono text-neon-cyan mb-6 uppercase">Registered Teams ({pageState.registeredTeams.length})</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pageState.registeredTeams.map((team, idx) => (
                  <NeonCard key={idx} variant="cyan">
                    <p className="text-lg font-bold font-mono text-neon-cyan uppercase">{team}</p>
                  </NeonCard>
                ))}
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

            {/* Standings Leaderboard */}
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

            {/* Cycles */}
            {pageState.cycles.length > 0 && (
              <div className="mb-16">
                <h2 className="text-2xl font-bold font-mono text-neon-magenta mb-6 uppercase">Cycles</h2>
                <div className="space-y-8">
                  {pageState.cycles.map((cycle, cycleIdx) => (
                    <div key={cycleIdx} className="space-y-4">
                      <h3 className="text-xl font-bold font-mono text-neon-gold uppercase">Cycle {cycleIdx + 1}</h3>
                      
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
                  ))}
                </div>
              </div>
            )}

            {/* Registered Teams */}
            <div className="mb-16">
              <h2 className="text-2xl font-bold font-mono text-neon-cyan mb-6 uppercase">Registered Teams ({pageState.registeredTeams.length})</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pageState.registeredTeams.map((team, idx) => (
                  <NeonCard key={idx} variant="cyan">
                    <p className="text-lg font-bold font-mono text-neon-cyan uppercase">{team}</p>
                  </NeonCard>
                ))}
              </div>
            </div>
          </>
        )}

        {/* EVENT COMPLETE STATE: Show Winner + Standings + Cycles + Teams */}
        {pageState.isEventComplete && (
          <>
            {/* Event Winner */}
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

            {/* Cycles */}
            {pageState.cycles.length > 0 && (
              <div className="mb-16">
                <h2 className="text-2xl font-bold font-mono text-neon-magenta mb-6 uppercase">Cycles</h2>
                <div className="space-y-8">
                  {pageState.cycles.map((cycle, cycleIdx) => (
                    <div key={cycleIdx} className="space-y-4">
                      <h3 className="text-xl font-bold font-mono text-neon-gold uppercase">Cycle {cycleIdx + 1}</h3>
                      
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
                  ))}
                </div>
              </div>
            )}

            {/* Registered Teams */}
            <div className="mb-16">
              <h2 className="text-2xl font-bold font-mono text-neon-cyan mb-6 uppercase">Registered Teams ({pageState.registeredTeams.length})</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pageState.registeredTeams.map((team, idx) => (
                  <NeonCard key={idx} variant="cyan">
                    <p className="text-lg font-bold font-mono text-neon-cyan uppercase">{team}</p>
                  </NeonCard>
                ))}
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
