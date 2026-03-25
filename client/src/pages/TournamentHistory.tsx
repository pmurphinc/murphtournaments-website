import NeonCard from '@/components/NeonCard';
import GlitchText from '@/components/GlitchText';

/**
 * Tournament History Page
 * Cyberpunk Neon Rebellion Design
 * - List of all past tournaments (Murph Tournaments I-IX)
 * - Tournament details, winners, formats, and descriptions
 */

export default function TournamentHistory() {
  const pastTournaments = [
    {
      name: 'Murph Tournament IX',
      date: 'May 10, 2025',
      teams: 10,
      prizePool: '$200 ($100 per winning duo)',
      winners: 'Tiger, Honor',
      format: '2v2 Final Round, Double Elimination, BO1',
      description: 'A special edition with custom rules, shifting focus to duo play.'
    },
    {
      name: 'Murph Tournament VIII',
      date: 'April 19, 2025',
      teams: 8,
      prizePool: '$150 (1st) + $120 (2nd)',
      winners: 'Honorbound Aces - MuntMaster1108#6005, aidan1000p#0502, honor#3665',
      format: 'Cashout → Final Round',
      description: 'Featured solo-queue signups, creating diverse team compositions.'
    },
    {
      name: 'Murph Tournament VII',
      date: 'March 28, 2025',
      teams: 8,
      prizePool: '$225 (1st) + 1150 Multibucks (additional placement)',
      winners: '4th Party Cashbox - kafeneio, sirgnal, brutal_logic',
      format: 'Cashout → Final Round, BO1',
      description: 'Streamlined hybrid format with smooth progression from Cashout to Finals.'
    },
    {
      name: 'Murph Tournament VI',
      date: 'March 8, 2025',
      teams: 8,
      prizePool: '$165 (1st) + 1150 Multibucks (2nd each)',
      winners: 'The Empty Mags — Moggyplays#9465, HeatTazz#5051, Naithehunter#1031',
      format: 'Cashout → Final Round, Double Elimination, BO1',
      description: 'Balanced hybrid event, combining Cashout with structured Finals.'
    },
    {
      name: 'Murph Tournament V',
      date: 'February 21, 2025',
      teams: 8,
      prizePool: '$120 (1st) + $50 (2nd)',
      winners: 'TRAFFY#4065, purestrafez, MuntMaster1108#6005',
      format: 'Final Round (3v3), Double Elimination, BO1',
      description: 'The third consecutive Final Round-only tournament, heightening rivalries.'
    },
    {
      name: 'Murph Tournament IV',
      date: 'February 7, 2025',
      teams: 8,
      prizePool: '$180 (1st) + $60 (2nd)',
      winners: 'pinhead, bongo#2748, Mydadbeetzmehrd#0813',
      format: 'Final Round (3v3), Double Elimination, BO1',
      description: 'Continued with the Final Round format, building consistency.'
    },
    {
      name: 'Murph Tournament III',
      date: 'January 24, 2025',
      teams: 6,
      prizePool: '$125 (1st place total)',
      winners: 'purestrafez, xSuddenStarxTTV#6709, TRAFFY#4065',
      format: 'Final Round (3v3), Double Elimination, BO1',
      description: 'Focused exclusively on Final Round gameplay.'
    },
    {
      name: 'Murph Tournament II',
      date: 'January 17, 2025',
      teams: 8,
      prizePool: '$240 (1st) + $120 (2nd)',
      winners: 'The High Notes — bongo#2748, Mydadbeetzmehrd#0813, pinhead',
      format: 'Cashout → Final Round, Double Elimination, BO1',
      description: 'Introduced a hybrid format modeled after ranked play.'
    },
    {
      name: 'Murph Tournament I',
      date: 'January 4, 2025',
      teams: 8,
      prizePool: 'No Prize Pool',
      winners: 'Murph, Lazerbladez',
      format: 'Final Round (3v3), Double Elimination, BO1',
      description: 'The first Murph Tournament, setting the foundation for competitive community events.'
    },
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
            Murph Tournaments has hosted 9 competitive tournaments, establishing a track record of professional production, fair competition, and consistent prize pools.
          </p>
        </div>

        {/* Past Tournaments List */}
        <div>
          <h2 className="text-2xl font-bold font-mono text-neon-cyan mb-6 uppercase">Past Tournaments</h2>
          <div className="grid grid-cols-1 gap-4">
            {pastTournaments.map((tournament, idx) => (
              <NeonCard key={idx} variant="cyan">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold font-mono text-white mb-1">{tournament.name}</h3>
                    <p className="text-sm text-white/60 font-mono">{tournament.date}</p>
                  </div>
                </div>
                <div className="space-y-3 border-t border-white/10 pt-3">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-white/50 font-mono uppercase">Teams</p>
                      <p className="text-lg font-bold font-mono text-neon-gold">{tournament.teams}</p>
                    </div>
                    <div>
                      <p className="text-xs text-white/50 font-mono uppercase">Prize Pool</p>
                      <p className="text-sm font-bold font-mono text-neon-lime">{tournament.prizePool}</p>
                    </div>
                    <div>
                      <p className="text-xs text-white/50 font-mono uppercase">Format</p>
                      <p className="text-sm font-mono text-neon-magenta">{tournament.format}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-white/50 font-mono uppercase">Winners</p>
                    <p className="text-sm font-mono text-neon-cyan">{tournament.winners}</p>
                  </div>
                  <div>
                    <p className="text-xs text-white/50 font-mono uppercase">Description</p>
                    <p className="text-sm font-mono text-white/70">{tournament.description}</p>
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
