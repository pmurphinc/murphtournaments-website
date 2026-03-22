import NeonCard from '@/components/NeonCard';
import GlitchText from '@/components/GlitchText';

/**
 * Tournament History Page
 * Cyberpunk Neon Rebellion Design
 * - List of all past tournaments (Murph Tournaments I-XIII)
 * - Tournament details and winners
 */

export default function TournamentHistory() {
  const pastTournaments = [
    { name: 'Murph Monthly – September', date: 'September 5, 2025', teams: 8, prizePool: '$175 + Codes', winners: 'FAFO' },
    { name: 'July Showdown', date: 'July 26, 2025', teams: 8, prizePool: 'Community-Funded', winners: 'Deadlyalzheimers' },
    { name: 'Tournament XI – Coach vs. Coach', date: 'June 27, 2025', teams: 4, prizePool: '$240', winners: 'Team Purestrafez' },
    { name: 'Murph Tournament X', date: 'May 31, 2025', teams: 8, prizePool: '$180', winners: 'Your Moms Fav' },
    { name: 'Murph Tournament IX', date: 'May 10, 2025', teams: 10, prizePool: '$200', winners: 'Tiger, Honor' },
    { name: 'Murph Tournament VIII', date: 'April 19, 2025', teams: 8, prizePool: '$270', winners: 'Honorbound Aces' },
    { name: 'Murph Tournament VII', date: 'March 28, 2025', teams: 8, prizePool: '$225', winners: '4th Party Cashbox' },
    { name: 'Murph Tournament VI', date: 'March 8, 2025', teams: 8, prizePool: '$165', winners: 'The Empty Mags' },
    { name: 'Murph Tournament V', date: 'February 21, 2025', teams: 8, prizePool: '$170', winners: 'TRAFFY & Team' },
    { name: 'Murph Tournament IV', date: 'February 7, 2025', teams: 8, prizePool: '$240', winners: 'pinhead & Team' },
    { name: 'Murph Tournament III', date: 'January 24, 2025', teams: 6, prizePool: '$125', winners: 'purestrafez & Team' },
    { name: 'Murph Tournament II', date: 'January 17, 2025', teams: 8, prizePool: '$360', winners: 'The High Notes' },
    { name: 'Murph Tournament I', date: 'January 4, 2025', teams: 8, prizePool: 'No Prize Pool', winners: 'Murph, Lazerbladez' },
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
            Murph Tournaments has hosted 13 competitive tournaments, establishing a track record of professional production, fair competition, and consistent prize pools.
          </p>
        </div>

        {/* Past Tournaments List */}
        <div>
          <h2 className="text-2xl font-bold font-mono text-neon-cyan mb-6 uppercase">Past Tournaments</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pastTournaments.map((tournament, idx) => (
              <NeonCard key={idx} variant="cyan">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-lg font-bold font-mono text-white mb-1">{tournament.name}</h3>
                    <p className="text-sm text-white/60 font-mono">{tournament.date}</p>
                  </div>
                </div>
                <div className="space-y-2 border-t border-white/10 pt-3">
                  <div className="flex justify-between">
                    <div>
                      <p className="text-xs text-white/50 font-mono uppercase">Teams</p>
                      <p className="text-lg font-bold font-mono text-neon-gold">{tournament.teams}</p>
                    </div>
                    <div>
                      <p className="text-xs text-white/50 font-mono uppercase">Prize Pool</p>
                      <p className="text-lg font-bold font-mono text-neon-lime">{tournament.prizePool}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-white/50 font-mono uppercase">Winners</p>
                    <p className="text-sm font-mono text-neon-cyan">{tournament.winners}</p>
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
