import { Link } from 'wouter';
import NeonCard from '@/components/NeonCard';
import GlitchText from '@/components/GlitchText';
import CountdownTimer from '@/components/CountdownTimer';
import NextEventBanner from '@/components/NextEventBanner';
import PlayerSpotlight from '@/components/PlayerSpotlight';

/**
 * Home Page
 * Cyberpunk Neon Rebellion Design
 * - Hero section with CTA buttons
 * - About Murph section
 * - Current initiatives (Dev Division)
 * - Upcoming tournament countdown
 * - Featured clips section
 */

export default function Home() {
  // Next Development Division event: April 3rd, 2026 at 6 PM PST
  const nextTournamentDate = new Date('2026-04-03T18:00:00-07:00');

  return (
    <div className="min-h-screen bg-dark-charcoal">
      {/* Hero Section */}
      <section className="relative py-20 md:py-32 overflow-hidden">
        {/* Background scan lines effect */}
        <div className="absolute inset-0 scan-lines opacity-5 pointer-events-none" />

        <div className="container relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            {/* Left: Text Content */}
            <div className="space-y-6">
              <GlitchText size="2xl" variant="magenta">
                COMPETITIVE
              </GlitchText>
              <GlitchText size="2xl" variant="cyan">
                THE FINALS
              </GlitchText>
              <GlitchText size="2xl" variant="gold">
                TOURNAMENTS
              </GlitchText>

              <p className="text-lg text-white/80 font-mono leading-relaxed max-w-md">
                Built by players. Run like a league.
              </p>

              <p className="text-sm text-white/60 font-mono leading-relaxed max-w-md">
                Competitive tournament showcase. Development Division for aspiring players. Tournament history, live streams, and community hub for THE FINALS competitive scene.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <a href="https://discord.gg/kcmdxmBgnC" target="_blank" rel="noopener noreferrer">
                  <button className="px-8 py-3 bg-neon-magenta text-dark-black font-bold font-mono uppercase tracking-widest hover-glow-magenta rounded-sm transition-all">
                    Join Discord
                  </button>
                </a>
                <Link href="/watch">
                  <button className="px-8 py-3 border-2 border-neon-cyan text-neon-cyan font-bold font-mono uppercase tracking-widest hover-glow-cyan rounded-sm transition-all">
                    Watch Live
                  </button>
                </Link>
              </div>
            </div>

            {/* Right: Decorative Element */}
            <div className="hidden md:flex items-center justify-center">
              <div className="relative w-full h-96">
                {/* Animated border box */}
                <div className="absolute inset-0 border-2 border-neon-magenta/30 rounded-sm" />
                <div className="absolute inset-2 border-2 border-neon-cyan/20 rounded-sm" />
                <div className="absolute inset-4 border-2 border-neon-gold/10 rounded-sm" />

                {/* Center text */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                <div className="text-6xl font-bold font-mono text-neon-magenta/30 mb-4">
                  MURPH
                </div>
                    <div className="text-sm font-mono text-neon-cyan/30 uppercase tracking-widest">
                      Tournament Production
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About Murph Section */}
      <section className="py-16 md:py-24 border-t border-neon-magenta/20">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold font-mono text-neon-cyan mb-6 uppercase tracking-widest">
                About Murph
              </h2>
              <p className="text-white/80 font-mono mb-4">
                Tournament organizer, league operator, and competitive systems builder within THE FINALS ecosystem.
              </p>
              <p className="text-white/80 font-mono mb-4">
                With 14+ completed tournaments and a focus on competitive integrity, Murph Tournaments has established itself as a trusted hub for serious players seeking structure, fairness, and exposure.
              </p>
              <p className="text-white/80 font-mono mb-6">
                Mission: develop elite players, run professional tournaments, and build a competitive community that values skill and dedication.
              </p>
              <Link href="/about">
                <button className="px-6 py-2 border-2 border-neon-gold text-neon-gold font-bold font-mono uppercase tracking-widest hover-glow-magenta rounded-sm transition-all">
                  Learn More
                </button>
              </Link>
            </div>

            <NeonCard variant="cyan">
              <div className="space-y-4">
                <div className="text-sm font-mono text-neon-cyan uppercase tracking-widest">Stats</div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center border-b border-neon-cyan/20 pb-2">
                    <span className="text-white/60 font-mono">Tournaments Hosted</span>
                    <span className="text-2xl font-bold text-neon-cyan font-mono">14+</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-neon-cyan/20 pb-2">
                    <span className="text-white/60 font-mono">Total Prize Pool Awarded</span>
                    <span className="text-2xl font-bold text-neon-gold font-mono">$2,500+</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-neon-cyan/20 pb-2">
                    <span className="text-white/60 font-mono">Players Competed</span>
                    <span className="text-2xl font-bold text-neon-magenta font-mono">100+ Verified</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/60 font-mono">Events Produced</span>
                    <span className="text-2xl font-bold text-neon-lime font-mono">20+ (Including FCL)</span>
                  </div>
                </div>
              </div>
            </NeonCard>
          </div>
        </div>
      </section>

      {/* Development Division Section */}
      <section className="py-16 md:py-24 border-t border-neon-magenta/20">
        <div className="container">
          <h2 className="text-4xl font-bold font-mono text-neon-magenta mb-12 uppercase tracking-widest">
            Development Division
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <NeonCard variant="magenta">
              <h3 className="text-lg font-bold font-mono text-neon-magenta mb-3 uppercase">Path to Pro</h3>
              <p className="text-sm text-white/70 font-mono">
                Structured monthly events for Plat–Diamond players seeking competitive experience and exposure.
              </p>
            </NeonCard>

            <NeonCard variant="cyan">
              <h3 className="text-lg font-bold font-mono text-neon-cyan mb-3 uppercase">Skill Development</h3>
              <p className="text-sm text-white/70 font-mono">
                Compete against strong opponents, receive detailed feedback, and improve your competitive play.
              </p>
            </NeonCard>

            <NeonCard variant="gold">
              <h3 className="text-lg font-bold font-mono text-neon-gold mb-3 uppercase">Stream Coverage</h3>
              <p className="text-sm text-white/70 font-mono">
                Get noticed. All matches are streamed on Twitch with professional commentary and analysis.
              </p>
            </NeonCard>
          </div>

          <Link href="/dev-division">
            <button className="px-8 py-3 bg-neon-cyan text-dark-black font-bold font-mono uppercase tracking-widest hover-glow-cyan rounded-sm transition-all">
              Explore Dev Division
            </button>
          </Link>
        </div>
      </section>

      {/* Next Event Banner */}
      <section className="py-16 md:py-20 border-t border-neon-magenta/20">
        <div className="container">
          <NextEventBanner
            eventName="Development Division"
            date="April 3rd, 2026"
            time="6 PM - 9 PM PST"
            format="3v3 Teams"
            prizePool="To Be Announced"
          />
        </div>
      </section>

      {/* Upcoming Tournament Section */}
      <section className="py-16 md:py-24 border-t border-neon-magenta/20">
        <div className="container">
          <h2 className="text-4xl font-bold font-mono text-neon-gold mb-12 uppercase tracking-widest">
            Tournament Details
          </h2>

          <NeonCard variant="gold" className="mb-8">
            <div className="space-y-8">
              <CountdownTimer targetDate={nextTournamentDate} eventName="Development Division" />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 border-t border-neon-gold/20 pt-8">
                <div>
                  <p className="text-xs text-white/60 font-mono uppercase tracking-widest mb-2">Format</p>
                  <p className="text-lg font-bold text-neon-gold font-mono">3v3 Teams</p>
                  <p className="text-sm text-white/60 font-mono">Plat - Diamond Players</p>
                </div>
                <div>
                  <p className="text-xs text-white/60 font-mono uppercase tracking-widest mb-2">Next Event</p>
                  <p className="text-lg font-bold text-neon-gold font-mono">April 3rd</p>
                  <p className="text-sm text-white/60 font-mono">6 PM PST</p>
                </div>
                <div>
                  <p className="text-xs text-white/60 font-mono uppercase tracking-widest mb-2">Prize Pool</p>
                  <p className="text-lg font-bold text-neon-gold font-mono">TBA</p>
                  <p className="text-sm text-white/60 font-mono">To Be Announced</p>
                </div>
              </div>
            </div>
          </NeonCard>

          <Link href="/dev-division">
            <button className="px-8 py-3 border-2 border-neon-gold text-neon-gold font-bold font-mono uppercase tracking-widest hover-glow-magenta rounded-sm transition-all">
              Learn More About Dev Division
            </button>
          </Link>
        </div>
      </section>

      {/* Player Spotlight Section */}
      <section className="py-16 md:py-24 border-t border-neon-magenta/20">
        <div className="container">
          <h2 className="text-4xl font-bold font-mono text-neon-gold mb-12 uppercase tracking-widest">
            Player Spotlight
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <PlayerSpotlight
              name="Top Player"
              role="IGL / Rifler"
              rank="Diamond"
              achievements={[
                "Tournament Winner (Murph XIV)",
                "3x Top 3 Finishes",
                "Dev Division Champion",
              ]}
              stats={[
                { label: 'Tournaments', value: '12' },
                { label: 'Win Rate', value: '67%' },
                { label: 'Avg Kills', value: '8.2' },
                { label: 'Wins', value: '8' },
              ]}
              variant="gold"
            />
            <PlayerSpotlight
              name="Rising Star"
              role="Operator / Support"
              rank="Platinum"
              achievements={[
                "Dev Division Finalist",
                "Fastest Rank Up",
                "Community Favorite",
              ]}
              stats={[
                { label: 'Tournaments', value: '6' },
                { label: 'Improvement', value: '+45%' },
                { label: 'Avg Assists', value: '12.1' },
                { label: 'Consistency', value: '92%' },
              ]}
              variant="cyan"
            />
            <PlayerSpotlight
              name="Veteran Player"
              role="Entry Fragger"
              rank="Diamond"
              achievements={[
                "5+ Tournament Wins",
                "Clutch Play Master",
                "Team Captain",
              ]}
              stats={[
                { label: 'Tournaments', value: '14' },
                { label: 'Win Rate', value: '71%' },
                { label: 'Avg Kills', value: '9.1' },
                { label: 'Leadership', value: 'A+' },
              ]}
              variant="magenta"
            />
          </div>
        </div>
      </section>

      {/* Featured Clips Section */}
      <section className="py-16 md:py-24 border-t border-neon-magenta/20">
        <div className="container">
          <h2 className="text-4xl font-bold font-mono text-neon-lime mb-12 uppercase tracking-widest">
            Featured Clips
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Placeholder for TikTok/YouTube embeds */}
            <NeonCard variant="lime">
              <div className="aspect-video bg-dark-charcoal rounded-sm flex items-center justify-center border border-neon-lime/30">
                <div className="text-center">
                  <div className="text-4xl mb-2">📱</div>
                  <p className="text-sm text-white/60 font-mono">TikTok Highlights</p>
                </div>
              </div>
            </NeonCard>

            <NeonCard variant="lime">
              <div className="aspect-video bg-dark-charcoal rounded-sm flex items-center justify-center border border-neon-lime/30">
                <div className="text-center">
                  <div className="text-4xl mb-2">🎬</div>
                  <p className="text-sm text-white/60 font-mono">YouTube Highlights</p>
                </div>
              </div>
            </NeonCard>
          </div>

          <Link href="/watch">
            <button className="px-8 py-3 bg-neon-lime text-dark-black font-bold font-mono uppercase tracking-widest hover-glow-cyan rounded-sm transition-all">
              Watch More Content
            </button>
          </Link>
        </div>
      </section>
    </div>
  );
}
