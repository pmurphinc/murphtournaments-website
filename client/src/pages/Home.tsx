import { Link } from 'wouter';
import NeonCard from '@/components/NeonCard';
import GlitchText from '@/components/GlitchText';
import CountdownTimer from '@/components/CountdownTimer';

/**
 * Home Page
 * Cyberpunk Neon Rebellion Design
 * - Hero section with CTA buttons
 * - June 2026 tournament announcement
 * - About Murph section
 * - Featured clips section
 */

const juneTournamentDate = new Date('2026-06-28T17:00:00-07:00');

const tournamentFacts = [
  { label: 'Date', value: 'June 28, 2026' },
  { label: 'Time', value: '5 PM Pacific / 8 PM Eastern' },
  { label: 'Format', value: 'Cashout Elim → BO5 Final' },
  { label: 'Team Cap', value: '16 Teams Max' },
  { label: 'Buy-In', value: '$30 Per Team' },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-dark-charcoal">
      {/* Hero Section */}
      <section className="relative pt-24 pb-20 md:pt-32 md:pb-32 overflow-hidden">
        <div className="absolute inset-0 scan-lines opacity-5 pointer-events-none" />

        <div className="container relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
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
                Competitive tournament showcase, live production, tournament history, and community hub for THE FINALS competitive scene.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <a href="https://discord.gg/kcmdxmBgnC" target="_blank" rel="noopener noreferrer">
                  <button className="px-8 py-3 bg-neon-magenta text-dark-black font-bold font-mono uppercase tracking-widest hover-glow-magenta rounded-sm transition-all border-2 border-neon-magenta">
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

            <div className="hidden lg:flex items-center justify-center">
              <div className="relative w-full h-96 bg-gradient-to-br from-neon-magenta/10 to-neon-gold/10 border-2 border-neon-gold rounded-sm p-8 flex flex-col justify-center">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,184,0,0.14),transparent_45%)] pointer-events-none" />
                <div className="relative text-center space-y-4">
                  <div className="text-neon-gold font-mono text-sm uppercase tracking-widest font-bold">June 2026</div>
                  <h3 className="text-3xl font-bold font-mono text-neon-gold uppercase tracking-widest">New Tournament Incoming</h3>
                  <p className="text-white/80 font-mono text-sm leading-relaxed">
                    June 28, 2026 — 5:00 PM Pacific / 8:00 PM Eastern. Cashout elimination lobbies lead into a Final Round BO5 Championship Series.
                  </p>
                  <Link href="/tournaments/june-2026">
                    <button className="inline-block mt-4 px-6 py-2 border-2 border-neon-cyan text-neon-cyan font-bold font-mono uppercase tracking-widest hover-glow-cyan rounded-sm transition-all">
                      View Details
                    </button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* June 2026 Tournament Announcement */}
      <section className="py-16 md:py-24 border-t border-neon-gold/30 bg-gradient-to-b from-dark-charcoal via-neon-gold/5 to-dark-charcoal">
        <div className="container">
          <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-8 lg:gap-12 items-stretch">
            <NeonCard variant="gold" className="relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,184,0,0.18),transparent_35%)] pointer-events-none" />
              <div className="relative z-10 space-y-6">
                <div>
                  <p className="text-sm text-neon-gold font-mono uppercase tracking-widest font-bold mb-3">
                    Live Event · June 28, 2026
                  </p>
                  <GlitchText size="xl" variant="gold" className="mb-4">
                    June Tournament
                  </GlitchText>
                  <p className="text-white/75 font-mono leading-relaxed max-w-2xl">
                    Murph Tournaments returns June 28 with a 16-team Cashout elimination format leading into a Final Round BO5 Championship Series.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {tournamentFacts.map((fact) => (
                    <div key={fact.label} className="border border-neon-gold/30 bg-black/40 p-4 rounded-sm">
                      <p className="text-xs text-white/50 font-mono uppercase tracking-widest">{fact.label}</p>
                      <p className="text-sm text-white font-mono font-bold mt-2">{fact.value}</p>
                    </div>
                  ))}
                </div>

                <Link href="/tournaments/june-2026">
                  <button className="w-full sm:w-auto px-8 py-3 bg-neon-gold text-dark-black font-bold font-mono uppercase tracking-widest hover-glow-gold rounded-sm transition-all border-2 border-neon-gold">
                    View June Tournament Details
                  </button>
                </Link>
              </div>
            </NeonCard>

            <div className="grid grid-cols-1 gap-6">
              <NeonCard variant="cyan" className="bg-black/60">
                <CountdownTimer targetDate={juneTournamentDate} eventName="June Tournament" />
                <p className="text-xs text-white/60 font-mono text-center uppercase tracking-widest">
                  June 28, 2026 — 5:00 PM Pacific / 8:00 PM Eastern
                </p>
              </NeonCard>

              <NeonCard variant="gold" className="bg-black/60">
                <p className="text-xs text-white/50 font-mono uppercase tracking-widest mb-2">1st Place Team</p>
                <p className="text-5xl md:text-6xl font-bold font-mono text-neon-gold mb-2">$240</p>
                <p className="text-sm text-white/70 font-mono mb-5">$80 per player</p>
                <div className="space-y-2 text-sm text-white/75 font-mono">
                  <p>3D printed M11</p>
                  <p>Alien Nade</p>
                  <p>Cashbox with vault and cashout station</p>
                  <p>Assortment of sponsor keychains</p>
                </div>
              </NeonCard>

              <NeonCard variant="cyan" className="bg-black/50">
                <p className="text-xs text-white/50 font-mono uppercase tracking-widest mb-2">2nd Place</p>
                <p className="text-lg text-neon-cyan font-bold font-mono">
                  Any $20 in-game bundle of their choosing
                </p>
              </NeonCard>
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
                - Murph Tournaments Founder<br/>
                - FCL Season 1 Producer<br/>
                - Murph Tournaments x14<br/>
                - Gaming Since '92
              </p>
              <p className="text-white/80 font-mono mb-6">
                Mission: run professional tournaments, produce competitive broadcasts, and build a THE FINALS community that values skill and dedication.
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
                  <div className="flex justify-between items-center border-b border-neon-cyan/20 pb-2 gap-4">
                    <span className="text-white/60 font-mono">Tournaments Hosted</span>
                    <span className="text-2xl font-bold text-neon-cyan font-mono">14+</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-neon-cyan/20 pb-2 gap-4">
                    <span className="text-white/60 font-mono">Total Prize Pool Awarded</span>
                    <span className="text-2xl font-bold text-neon-gold font-mono">$2,500+</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-neon-cyan/20 pb-2 gap-4">
                    <span className="text-white/60 font-mono">Players Competed</span>
                    <span className="text-2xl font-bold text-neon-magenta font-mono text-right">100+ Verified</span>
                  </div>
                  <div className="flex justify-between items-center gap-4">
                    <span className="text-white/60 font-mono">Events Produced</span>
                    <span className="text-2xl font-bold text-neon-lime font-mono text-right">20+ Including FCL</span>
                  </div>
                </div>
              </div>
            </NeonCard>
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
            <NeonCard variant="lime">
              <a href="https://www.tiktok.com/@pmurphinc/video/7446651252408110366" target="_blank" rel="noopener noreferrer" className="block">
                <div className="aspect-video bg-dark-charcoal rounded-sm flex items-center justify-center border border-neon-lime/30 hover:border-neon-lime/60 transition-all cursor-pointer">
                  <div className="text-center">
                    <div className="text-4xl mb-2 font-mono text-neon-lime">TT</div>
                    <p className="text-sm text-white/60 font-mono">TikTok Highlights</p>
                    <p className="text-xs text-neon-lime mt-2">Click to watch</p>
                  </div>
                </div>
              </a>
            </NeonCard>

            <NeonCard variant="lime">
              <a href="https://www.youtube.com/shorts/QTgm-CL5BYY" target="_blank" rel="noopener noreferrer" className="block">
                <div className="aspect-video bg-dark-charcoal rounded-sm flex items-center justify-center border border-neon-lime/30 hover:border-neon-lime/60 transition-all cursor-pointer">
                  <div className="text-center">
                    <div className="text-4xl mb-2 font-mono text-neon-lime">YT</div>
                    <p className="text-sm text-white/60 font-mono">YouTube Highlights</p>
                    <p className="text-xs text-neon-lime mt-2">Click to watch</p>
                  </div>
                </div>
              </a>
            </NeonCard>
          </div>

          <Link href="/watch">
            <button className="px-8 py-3 bg-neon-lime text-dark-black font-bold font-mono uppercase tracking-widest hover-glow-cyan rounded-sm transition-all border-2 border-neon-lime">
              Watch More Content
            </button>
          </Link>
        </div>
      </section>
    </div>
  );
}
