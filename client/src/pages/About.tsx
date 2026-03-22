import NeonCard from '@/components/NeonCard';
import GlitchText from '@/components/GlitchText';

/**
 * About Page
 * Cyberpunk Neon Rebellion Design
 * - Patrick "Murph" Murphy biography
 * - Tournament organizer, league operator, system builder
 * - Competitive integrity focus
 */

export default function About() {
  return (
    <div className="min-h-screen bg-dark-charcoal py-20">
      <div className="container">
        {/* Header */}
        <div className="mb-16">
          <GlitchText size="xl" variant="gold" className="mb-4">
            About Murph
          </GlitchText>
          <p className="text-xl text-white/80 font-mono max-w-3xl">
            Tournament Organizer, League Operator, Community Builder
          </p>
        </div>

        {/* Main Bio Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <div className="md:col-span-2">
            <NeonCard variant="cyan">
              <h2 className="text-2xl font-bold font-mono text-neon-cyan mb-6 uppercase">Patrick "Murph" Murphy</h2>

              <div className="space-y-4 text-white/80 font-mono leading-relaxed">
                <p>
                  Patrick "Murph" Murphy is a competitive esports organizer and systems builder focused on THE FINALS ecosystem. With a passion for competitive integrity and player development, Murph has established PMURPHINC as a trusted hub for serious competitors.
                </p>

                <p>
                  His approach to tournament organization emphasizes fairness, structure, and professionalism. Every event is designed to provide players with a competitive environment that rewards skill, teamwork, and dedication.
                </p>

                <p>
                  Beyond tournaments, Murph is committed to building sustainable competitive systems. The Development Division represents his vision: a structured pathway for aspiring competitive players to improve, gain exposure, and transition to professional play.
                </p>

                <p>
                  As the producer of the Finals Contender League (FCL) Season 1, Murph continues to expand the competitive landscape for THE FINALS, creating opportunities for players at all levels to compete with integrity and purpose.
                </p>
              </div>
            </NeonCard>
          </div>

          {/* Stats Card */}
          <NeonCard variant="magenta">
            <h3 className="text-lg font-bold font-mono text-neon-magenta mb-6 uppercase">By The Numbers</h3>
            <div className="space-y-4">
              <div className="border-b border-neon-magenta/20 pb-3">
                <p className="text-xs text-white/50 font-mono uppercase mb-1">Tournaments Hosted</p>
                <p className="text-3xl font-bold font-mono text-neon-magenta">14+</p>
              </div>
              <div className="border-b border-neon-magenta/20 pb-3">
                <p className="text-xs text-white/50 font-mono uppercase mb-1">Players Developed</p>
                <p className="text-3xl font-bold font-mono text-neon-cyan">100+</p>
              </div>
              <div className="border-b border-neon-magenta/20 pb-3">
                <p className="text-xs text-white/50 font-mono uppercase mb-1">Prize Pool Distributed</p>
                <p className="text-3xl font-bold font-mono text-neon-gold">$50K+</p>
              </div>
              <div>
                <p className="text-xs text-white/50 font-mono uppercase mb-1">Years in Esports</p>
                <p className="text-3xl font-bold font-mono text-neon-lime">5+</p>
              </div>
            </div>
          </NeonCard>
        </div>

        {/* Core Values */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold font-mono text-neon-lime mb-6 uppercase">Core Values</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <NeonCard variant="lime">
              <h3 className="text-lg font-bold font-mono text-neon-lime mb-3 uppercase">Competitive Integrity</h3>
              <p className="text-white/70 font-mono">
                Every tournament is run with fairness, transparency, and professionalism. No shortcuts, no excuses. Competition is only meaningful when the playing field is level.
              </p>
            </NeonCard>

            <NeonCard variant="lime">
              <h3 className="text-lg font-bold font-mono text-neon-lime mb-3 uppercase">Player Development</h3>
              <p className="text-white/70 font-mono">
                Murph believes in creating pathways for players to improve and advance. The Development Division exists to help Plat–Diamond players reach their competitive potential.
              </p>
            </NeonCard>

            <NeonCard variant="lime">
              <h3 className="text-lg font-bold font-mono text-neon-lime mb-3 uppercase">Community First</h3>
              <p className="text-white/70 font-mono">
                PMURPHINC is built on community. Discord is the hub. Tournaments are for players. Streams are for fans. Everything serves the competitive community.
              </p>
            </NeonCard>

            <NeonCard variant="lime">
              <h3 className="text-lg font-bold font-mono text-neon-lime mb-3 uppercase">Professionalism</h3>
              <p className="text-white/70 font-mono">
                Tournament production, stream quality, and communication are held to professional standards. PMURPHINC represents the competitive scene with pride.
              </p>
            </NeonCard>
          </div>
        </div>

        {/* Initiatives */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold font-mono text-neon-gold mb-6 uppercase">Key Initiatives</h2>
          <div className="space-y-4">
            <NeonCard variant="gold">
              <div className="flex items-start gap-4">
                <div className="text-3xl font-bold font-mono text-neon-magenta min-w-fit">01</div>
                <div>
                  <h3 className="text-lg font-bold font-mono text-neon-gold mb-2">Murph Tournaments</h3>
                  <p className="text-white/70 font-mono">
                    14+ competitive tournaments showcasing THE FINALS' best talent. Each event features professional production, fair competition, and meaningful prize pools.
                  </p>
                </div>
              </div>
            </NeonCard>

            <NeonCard variant="gold">
              <div className="flex items-start gap-4">
                <div className="text-3xl font-bold font-mono text-neon-cyan min-w-fit">02</div>
                <div>
                  <h3 className="text-lg font-bold font-mono text-neon-gold mb-2">Development Division</h3>
                  <p className="text-white/70 font-mono">
                    Monthly competitive events for Plat–Diamond players. Structured matches, detailed feedback, and stream exposure to accelerate player development.
                  </p>
                </div>
              </div>
            </NeonCard>

            <NeonCard variant="gold">
              <div className="flex items-start gap-4">
                <div className="text-3xl font-bold font-mono text-neon-lime min-w-fit">03</div>
                <div>
                  <h3 className="text-lg font-bold font-mono text-neon-gold mb-2">FCL Season 1 Producer</h3>
                  <p className="text-white/70 font-mono">
                    Producer of the Finals Contender League, expanding competitive opportunities and building the infrastructure for THE FINALS esports ecosystem.
                  </p>
                </div>
              </div>
            </NeonCard>
          </div>
        </div>

        {/* Contact/Social */}
        <div className="text-center">
          <h2 className="text-2xl font-bold font-mono text-neon-cyan mb-6 uppercase">Connect</h2>
          <p className="text-white/80 font-mono mb-6">
            Join the community on Discord for tournament updates, player spotlights, and competitive opportunities.
          </p>
          <a
            href="https://discord.gg"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-8 py-3 bg-neon-cyan text-dark-black font-bold font-mono uppercase tracking-widest hover-glow-cyan rounded-sm transition-all"
          >
            Join Discord
          </a>
        </div>
      </div>
    </div>
  );
}
