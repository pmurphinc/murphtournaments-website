import NeonCard from '@/components/NeonCard';
import GlitchText from '@/components/GlitchText';

/**
 * Tournaments Page
 * Cyberpunk Neon Rebellion Design
 * - List of past tournaments (Murph Tournaments I-XIV)
 * - Format explanation
 * - Bracket placeholder
 */

export default function Tournaments() {
  const pastTournaments = [
    { name: 'Murph Tournament XIV', date: 'March 15, 2026', teams: 8, prizePool: '$5,000' },
    { name: 'Murph Tournament XIII', date: 'February 20, 2026', teams: 8, prizePool: '$4,500' },
    { name: 'Murph Tournament XII', date: 'January 25, 2026', teams: 8, prizePool: '$4,500' },
    { name: 'Murph Tournament XI', date: 'December 28, 2025', teams: 8, prizePool: '$5,000' },
    { name: 'Murph Tournament X', date: 'November 30, 2025', teams: 8, prizePool: '$4,000' },
    { name: 'Murph Tournament IX', date: 'October 26, 2025', teams: 8, prizePool: '$4,000' },
    { name: 'Murph Tournament VIII', date: 'September 21, 2025', teams: 8, prizePool: '$3,500' },
    { name: 'Murph Tournament VII', date: 'August 24, 2025', teams: 8, prizePool: '$3,500' },
    { name: 'Murph Tournament VI', date: 'July 20, 2025', teams: 8, prizePool: '$3,000' },
    { name: 'Murph Tournament V', date: 'June 22, 2025', teams: 8, prizePool: '$3,000' },
    { name: 'Murph Tournament IV', date: 'May 18, 2025', teams: 8, prizePool: '$2,500' },
    { name: 'Murph Tournament III', date: 'April 20, 2025', teams: 8, prizePool: '$2,500' },
    { name: 'Murph Tournament II', date: 'March 23, 2025', teams: 8, prizePool: '$2,000' },
    { name: 'Murph Tournament I', date: 'February 15, 2025', teams: 8, prizePool: '$2,000' },
  ];

  return (
    <div className="min-h-screen bg-dark-charcoal py-20">
      <div className="container">
        {/* Header */}
        <div className="mb-16">
          <GlitchText size="xl" variant="magenta" className="mb-4">
            Tournament History
          </GlitchText>
          <p className="text-lg text-white/80 font-mono max-w-2xl">
            Murph Tournaments has hosted 14 competitive tournaments, establishing a track record of professional production, fair competition, and consistent prize pools.
          </p>
        </div>

        {/* Format Explanation */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          <NeonCard variant="cyan">
            <h3 className="text-lg font-bold font-mono text-neon-cyan mb-4 uppercase">Tournament Format</h3>
            <ul className="space-y-2 text-sm text-white/70 font-mono">
              <li>• 8 Teams Compete</li>
              <li>• Cashout Rounds (Elimination)</li>
              <li>• Final Round Best of 3</li>
              <li>• One-Night Competition</li>
            </ul>
          </NeonCard>

          <NeonCard variant="gold">
            <h3 className="text-lg font-bold font-mono text-neon-gold mb-4 uppercase">Schedule</h3>
            <ul className="space-y-2 text-sm text-white/70 font-mono">
              <li>• Streams: 9 PM - 12 AM PST</li>
              <li>• Check-in: 8:45 PM</li>
              <li>• Matches: Back-to-back</li>
              <li>• Awards: Post-tournament</li>
            </ul>
          </NeonCard>

          <NeonCard variant="magenta">
            <h3 className="text-lg font-bold font-mono text-neon-magenta mb-4 uppercase">Prize Distribution</h3>
            <ul className="space-y-2 text-sm text-white/70 font-mono">
              <li>• 1st Place: 50%</li>
              <li>• 2nd Place: 30%</li>
              <li>• 3rd Place: 20%</li>
              <li>• Streamed on Twitch</li>
            </ul>
          </NeonCard>
        </div>

        {/* Bracket Placeholder */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold font-mono text-neon-lime mb-6 uppercase">Tournament Bracket</h2>
          <NeonCard variant="lime">
            <div className="aspect-video bg-dark-charcoal rounded-sm flex items-center justify-center border border-neon-lime/30">
              <div className="text-center">
                <div className="text-6xl mb-4 font-mono text-neon-lime/30">⚔️</div>
                <p className="text-lg font-mono text-white/60 mb-2">8-Team Single Elimination</p>
                <p className="text-sm font-mono text-white/40">Bracket visualization coming soon</p>
              </div>
            </div>
          </NeonCard>
        </div>

        {/* Past Tournaments List */}
        <div>
          <h2 className="text-2xl font-bold font-mono text-neon-cyan mb-6 uppercase">Past Tournaments</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pastTournaments.map((tournament, idx) => (
              <NeonCard key={idx} variant={idx % 2 === 0 ? 'cyan' : 'magenta'}>
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-lg font-bold font-mono text-white mb-1">{tournament.name}</h3>
                    <p className="text-sm text-white/60 font-mono">{tournament.date}</p>
                  </div>
                </div>
                <div className="flex justify-between items-center border-t border-white/10 pt-3">
                  <div>
                    <p className="text-xs text-white/50 font-mono uppercase">Teams</p>
                    <p className="text-lg font-bold font-mono text-neon-gold">{tournament.teams}</p>
                  </div>
                  <div>
                    <p className="text-xs text-white/50 font-mono uppercase">Prize Pool</p>
                    <p className="text-lg font-bold font-mono text-neon-lime">{tournament.prizePool}</p>
                  </div>
                </div>
              </NeonCard>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
