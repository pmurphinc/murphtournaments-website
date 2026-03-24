import NeonCard from '@/components/NeonCard';
import GlitchText from '@/components/GlitchText';
import { Link } from 'wouter';
import { useState, useEffect } from 'react';

/**
 * Live Bracket Page - Development Division
 * Cyberpunk Neon Rebellion Design
 * - Registered teams with player rosters
 * - Dynamic team names from Google Sheets
 * - Live Event Status and Current Leader panels
 * - 3-Cycle Development Division format
 * - Stage 1 (Cashout) and Stage 2 (Finals) structure
 * - FRP (Final Round Points) scoring system
 */

interface Team {
  id: number;
  name: string;
  players: string[];
}

const STATIC_TEAMS: Team[] = [
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

// Google Sheets CSV export URL
const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/1tXZ5opDeFAy_l_uTiOD-dEO1wMlL66MhuKBFtr84adc/export?format=csv&gid=0';

interface LiveData {
  teamNames: string[];
  eventStatus: string;
  currentLeader: string;
  tiebreaker: string;
  dataAvailable: boolean;
}

export default function LiveBracket() {
  const [expandedTeam, setExpandedTeam] = useState<number | null>(null);
  const [liveData, setLiveData] = useState<LiveData>({
    teamNames: STATIC_TEAMS.map(t => t.name),
    eventStatus: 'Awaiting Results',
    currentLeader: 'Pending Results',
    tiebreaker: 'NO TIEBREAKER NEEDED',
    dataAvailable: true
  });

  // Fetch data from Google Sheets
  useEffect(() => {
    const fetchSheetData = async () => {
      try {
        const response = await fetch(SHEET_CSV_URL);
        const csv = await response.text();
        const lines = csv.split('\n');
        
        // Extract team names from A5:A24 (rows 5-24, column A is index 0)
        const teamNames: string[] = [];
        for (let i = 4; i < Math.min(24, lines.length); i++) {
          const row = lines[i].split(',');
          if (row[0] && row[0].trim()) {
            teamNames.push(row[0].trim());
          }
        }

        // Extract Live Event Status from E6:G8 (rows 6-8, columns E-G are indices 4-6)
        let eventStatus = 'Awaiting Results';
        if (lines.length > 6) {
          const statusRow = lines[6].split(',');
          if (statusRow[5] && statusRow[5].trim()) {
            eventStatus = statusRow[5].trim();
          }
        }

        // Extract Current Leader from I6:K8 (rows 6-8, columns I-K are indices 8-10)
        let currentLeader = 'Pending Results';
        if (lines.length > 6) {
          const leaderRow = lines[6].split(',');
          if (leaderRow[9] && leaderRow[9].trim()) {
            currentLeader = leaderRow[9].trim();
          }
        }

        // Extract Tiebreaker from I8 (row 8, column I is index 8)
        let tiebreaker = 'NO TIEBREAKER NEEDED';
        if (lines.length > 7) {
          const tieRow = lines[7].split(',');
          if (tieRow[8] && tieRow[8].trim()) {
            tiebreaker = tieRow[8].trim();
          }
        }

        setLiveData({
          teamNames: teamNames.length > 0 ? teamNames : STATIC_TEAMS.map(t => t.name),
          eventStatus,
          currentLeader,
          tiebreaker,
          dataAvailable: teamNames.length > 0
        });
      } catch (error) {
        console.error('Failed to fetch sheet data:', error);
        setLiveData(prev => ({
          ...prev,
          dataAvailable: false
        }));
      }
    };

    fetchSheetData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchSheetData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Build teams with dynamic names
  const teams: Team[] = STATIC_TEAMS.map((team, idx) => ({
    ...team,
    name: liveData.teamNames[idx] || team.name
  }));

  return (
    <div className="min-h-screen bg-dark-charcoal py-20">
      <div className="container">
        {/* Data Status Indicator */}
        {!liveData.dataAvailable && (
          <div className="mb-6 p-3 bg-neon-magenta/10 border border-neon-magenta/50 rounded text-neon-magenta text-sm font-mono">
            ⚠ Live data unavailable - displaying cached team information
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

        {/* Live Status Panels */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-16">
          {/* Event Winner */}
          <NeonCard variant="gold">
            <h3 className="text-sm font-mono text-white/50 uppercase mb-3">Event Winner</h3>
            <p className="text-xl font-bold font-mono text-neon-gold">{liveData.eventStatus}</p>
          </NeonCard>

          {/* Live Event Status */}
          <NeonCard variant="cyan">
            <h3 className="text-sm font-mono text-white/50 uppercase mb-3">Status</h3>
            <p className="text-xl font-bold font-mono text-neon-cyan">{liveData.eventStatus}</p>
          </NeonCard>

          {/* Current Leader */}
          <NeonCard variant="magenta">
            <h3 className="text-sm font-mono text-white/50 uppercase mb-3">Current Leader</h3>
            <p className="text-xl font-bold font-mono text-neon-magenta">{liveData.currentLeader}</p>
          </NeonCard>
        </div>

        {/* Tiebreaker Alert */}
        <div className="mb-16">
          <NeonCard variant="lime">
            <h3 className="text-sm font-mono text-white/50 uppercase mb-2">Tiebreaker Alert</h3>
            <p className="text-lg font-bold font-mono text-neon-lime">{liveData.tiebreaker}</p>
          </NeonCard>
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
              <p className="text-lg font-bold font-mono text-neon-gold">{teams.length}</p>
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
          <h2 className="text-2xl font-bold font-mono text-neon-cyan mb-6 uppercase">Registered Teams ({teams.length})</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {teams.map((team) => (
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
                        <p className="text-sm text-white/50 font-mono uppercase mb-2">Roster:</p>
                        {team.players.map((player, idx) => (
                          <p key={idx} className="text-sm text-white/70 font-mono">• {player}</p>
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
                        <p className="text-xs text-white/50">All 4 teams play one round of Cashout</p>
                      </div>
                      <div>
                        <p className="text-neon-gold font-bold mb-1">Placements</p>
                        <ul className="space-y-1 text-xs text-white/60">
                          <li>• 1st Place</li>
                          <li>• 2nd Place</li>
                          <li>• 3rd Place</li>
                          <li>• 4th Place</li>
                        </ul>
                      </div>
                    </div>
                  </NeonCard>

                  {/* Stage 2: Finals */}
                  <NeonCard variant="magenta">
                    <h4 className="text-lg font-bold font-mono text-neon-magenta mb-4 uppercase">Stage 2: Final Round</h4>
                    <div className="space-y-3 text-sm text-white/70 font-mono">
                      <div>
                        <p className="text-neon-magenta font-bold mb-1">Best of 3 Matches</p>
                        <ul className="space-y-1 text-xs text-white/60">
                          <li>• 1st vs 2nd (BO3)</li>
                          <li>• 3rd vs 4th (BO3)</li>
                        </ul>
                      </div>
                      <div>
                        <p className="text-neon-magenta font-bold mb-1">1 FRP Per Round Win</p>
                        <p className="text-xs text-white/50">Each victory = 1 FRP</p>
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
