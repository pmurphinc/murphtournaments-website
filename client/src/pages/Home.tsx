import { useAuth } from '@/_core/hooks/useAuth';
import { Link } from 'wouter';
import NeonCard from '@/components/NeonCard';
import GlitchText from '@/components/GlitchText';
import CountdownTimer from '@/components/CountdownTimer';
import NextEventBanner from '@/components/NextEventBanner';
import PlayerSpotlight from '@/components/PlayerSpotlight';
import Season10Countdown from '@/components/Season10Countdown';

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
  const { user, loading, error, isAuthenticated, logout } = useAuth();

  // Next Development Division event: April 3rd, 2026 at 6 PM PST
  const nextTournamentDate = new Date('2026-04-03T18:00:00-07:00');

  return (
    <div className="min-h-screen bg-dark-charcoal">
      {/* Hero Section */}
      <section className="relative pt-24 pb-20 md:pt-32 md:pb-32 overflow-hidden">
        {/* Background scan lines effect */}
        <div className="absolute inset-0 scan-lines opacity-5 pointer-events-none" />

        <div className="container relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            {/* Left: Text Content */}
            <div className="space-y-6 max-w-full lg:max-w-none">
              <div className="max-w-full lg:max-w-none overflow-wrap break-word">
                <GlitchText size="2xl" variant="magenta">
                  COMPETITIVE
                </GlitchText>
                <GlitchText size="2xl" variant="cyan">
                  THE FINALS
                </GlitchText>
                <GlitchText size="2xl" variant="gold">
                  TOURNAMENTS
                </GlitchText>
              </div>

              <p className="text-lg text-white/80 font-mono leading-relaxed max-w-full lg:max-w-md">
                Built by players. For players.
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

            {/* Right: THE FINALS Season 10 News */}
            <div className="hidden lg:flex items-center justify-center">
              <div className="relative w-full h-96 bg-gradient-to-br from-neon-magenta/10 to-neon-cyan/10 border-2 border-neon-gold/40 rounded-sm p-8 flex flex-col justify-center">
                <div className="text-center space-y-4">
                  <div className="text-neon-gold font-mono text-sm uppercase tracking-widest font-bold">Latest News</div>
                  <h3 className="text-3xl font-bold font-mono text-neon-cyan uppercase tracking-widest">Season 10 Launch</h3>
                  <p className="text-white/80 font-mono text-sm leading-relaxed">
                    THE FINALS Season 10 launches on <span className="text-neon-gold font-bold">March 26, 2026</span>. A bold new era for the arena with new content, gameplay updates, and competitive opportunities.
                  </p>
                  <Season10Countdown />
                  <a href="https://www.reachthefinals.com" target="_blank" rel="noopener noreferrer" className="inline-block mt-4 px-6 py-2 border-2 border-neon-cyan text-neon-cyan font-bold font-mono uppercase tracking-widest hover-glow-cyan rounded-sm transition-all">
                    Learn More
                  </a>
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
                - Development Division Founder<br/>
                - FCL Season 1 Producer<br/>
                - Murph Tournaments ×14<br/>
                - Gaming Since '92
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
                    <span className="text-2xl font-bold text-neon-magenta font-mono" style={{textAlign: 'right'}}>100+ Verified</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/60 font-mono">Events Produced</span>
                    <span className="text-2xl font-bold text-neon-lime font-mono" style={{textAlign: 'right'}}>20+ (Including FCL)</span>
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

      {/* Upcoming Tournament Section */}
      <section className="py-16 md:py-24 border-t border-neon-magenta/20">
        <div className="container">
          <h2 className="text-4xl font-bold font-mono text-neon-gold mb-12 uppercase tracking-widest">
            Next Tournament
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
            {/* TikTok Featured Clip */}
            <NeonCard variant="lime">
              <a href="https://www.tiktok.com/@pmurphinc/video/7446651252408110366" target="_blank" rel="noopener noreferrer" className="block">
                <div className="aspect-video bg-dark-charcoal rounded-sm flex items-center justify-center border border-neon-lime/30 hover:border-neon-lime/60 transition-all cursor-pointer">
                  <div className="text-center">
                    <div className="text-4xl mb-2">📱</div>
                    <p className="text-sm text-white/60 font-mono">TikTok Highlights</p>
                    <p className="text-xs text-neon-lime mt-2">Click to watch →</p>
                  </div>
                </div>
              </a>
            </NeonCard>

            {/* YouTube Featured Clip */}
            <NeonCard variant="lime">
              <a href="https://www.youtube.com/shorts/QTgm-CL5BYY" target="_blank" rel="noopener noreferrer" className="block">
                <div className="aspect-video bg-dark-charcoal rounded-sm flex items-center justify-center border border-neon-lime/30 hover:border-neon-lime/60 transition-all cursor-pointer">
                  <div className="text-center">
                    <div className="text-4xl mb-2">🎬</div>
                    <p className="text-sm text-white/60 font-mono">YouTube Highlights</p>
                    <p className="text-xs text-neon-lime mt-2">Click to watch →</p>
                  </div>
                </div>
              </a>
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
