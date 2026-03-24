import NeonCard from '@/components/NeonCard';
import GlitchText from '@/components/GlitchText';

/**
 * About Page
 * Cyberpunk Neon Rebellion Design
 * - Murph biography (no government name)
 * - Organizational hierarchy: PMURPHINC (parent) → Murph Tournaments → Development Division
 * - Competitive integrity focus
 */

export default function About() {
  return (
    <div className="min-h-screen bg-dark-charcoal py-20">
      <div className="container">
        {/* Header */}
        <div className="mb-16">
          <GlitchText size="xl" variant="gold" className="mb-4">
            About Murph Tournaments
          </GlitchText>
          <p className="text-xl text-white/80 font-mono max-w-3xl">
            Competitive Tournament Organization & Player Development
          </p>
        </div>

        {/* Main Bio Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <div className="md:col-span-2">
            <NeonCard variant="cyan">
              <h2 className="text-2xl font-bold font-mono text-neon-cyan mb-6 uppercase">Murph</h2>

              <div className="space-y-4 text-white/80 font-mono leading-relaxed">
                <p>
                  Competitive esports organizer and systems builder focused on THE FINALS ecosystem. With a passion for competitive integrity and player development, establishing Murph Tournaments as a trusted hub for serious competitors.
                </p>

                <p>
                  His approach to tournament organization emphasizes fairness, structure, and professionalism. Every event is designed to provide players with a competitive environment that rewards skill, teamwork, and dedication.
                </p>

                <p>
                  Murph Tournaments operates two main initiatives: the flagship Murph Tournaments (competitive events) and the Development Division (monthly tournaments for aspiring players). This structure creates a clear pathway from casual play to professional competition.
                </p>

                <p>
                  As a producer and organizer within THE FINALS competitive scene, Murph continues to expand opportunities for players at all levels to compete with integrity and purpose.
                </p>
              </div>
            </NeonCard>
          </div>

          {/* Stats Card */}
          <NeonCard variant="magenta">
            <h3 className="text-lg font-bold font-mono text-neon-magenta mb-6 uppercase">By The Numbers</h3>
            <div className="space-y-4">
              <div className="border-b border-neon-magenta/20 pb-3">
                <p className="text-xs text-white/50 font-mono uppercase mb-1">TikTok Followers</p>
                <p className="text-3xl font-bold font-mono text-neon-magenta">10K+</p>
              </div>
              <div className="border-b border-neon-magenta/20 pb-3">
                <p className="text-xs text-white/50 font-mono uppercase mb-1">TikTok Likes</p>
                <p className="text-3xl font-bold font-mono text-neon-cyan">400K+</p>
              </div>
              <div className="border-b border-neon-magenta/20 pb-3">
                <p className="text-xs text-white/50 font-mono uppercase mb-1">TikTok Views</p>
                <p className="text-3xl font-bold font-mono text-neon-gold">5M+</p>
              </div>
              <div>
                <p className="text-xs text-white/50 font-mono uppercase mb-1">Community Reach</p>
                <p className="text-3xl font-bold font-mono text-neon-lime">Growing</p>
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
                We believe in creating pathways for players to improve and advance. The Development Division exists to help Plat–Diamond players reach their competitive potential.
              </p>
            </NeonCard>

            <NeonCard variant="lime">
              <h3 className="text-lg font-bold font-mono text-neon-lime mb-3 uppercase">Community First</h3>
              <p className="text-white/70 font-mono">
                Built on community. Discord is the hub. Tournaments are for players. Streams are for fans. Everything serves the competitive community.
              </p>
            </NeonCard>

            <NeonCard variant="lime">
              <h3 className="text-lg font-bold font-mono text-neon-lime mb-3 uppercase">Professionalism</h3>
              <p className="text-white/70 font-mono">
                Tournament production, stream quality, and communication are held to professional standards. Representing the competitive scene with pride.
              </p>
            </NeonCard>
          </div>
        </div>

        {/* Organizational Structure */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold font-mono text-neon-gold mb-6 uppercase">Organizational Structure</h2>
          <div className="space-y-4">
            <NeonCard variant="gold">
              <div className="flex items-start gap-4">
                <div className="text-3xl font-bold font-mono text-neon-magenta min-w-fit">01</div>
                <div>
                  <h3 className="text-lg font-bold font-mono text-neon-gold mb-2">Murph Tournaments</h3>
                  <p className="text-white/70 font-mono">
                    14 competitive tournaments showcasing THE FINALS' best talent. Each event features professional production, fair competition, and meaningful prize pools.
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
                    Monthly tournaments for Plat–Diamond players seeking competitive experience. A division of Murph Tournaments, providing structured matches, feedback, and stream exposure.
                  </p>
                </div>
              </div>
            </NeonCard>
          </div>
        </div>

        {/* Connect/Social */}
        <div className="text-center">
          <h2 className="text-2xl font-bold font-mono text-neon-cyan mb-6 uppercase">Connect</h2>
          <p className="text-white/80 font-mono mb-6">
            Join the community on Discord to connect with players, learn about tournaments, and stay updated on all competitive opportunities.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="https://discord.gg/kcmdxmBgnC"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-8 py-3 bg-neon-magenta text-dark-black font-bold font-mono uppercase tracking-widest hover-glow-magenta rounded-sm transition-all"
            >
              Join Discord
            </a>
            <a
              href="https://www.youtube.com/Pmurphinc"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-8 py-3 border-2 border-neon-cyan text-neon-cyan font-bold font-mono uppercase tracking-widest hover-glow-cyan rounded-sm transition-all"
            >
              YouTube
            </a>
            <a
              href="https://www.tiktok.com/@pmurphinc"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-8 py-3 border-2 border-neon-gold text-neon-gold font-bold font-mono uppercase tracking-widest hover-glow-magenta rounded-sm transition-all"
            >
              TikTok
            </a>
            <a
              href="https://www.twitch.tv/pmurphinc"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-8 py-3 border-2 border-neon-magenta text-neon-magenta font-bold font-mono uppercase tracking-widest hover-glow-magenta rounded-sm transition-all"
            >
              Twitch
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
