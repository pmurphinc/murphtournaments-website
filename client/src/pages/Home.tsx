import { useAuth } from '@/_core/hooks/useAuth';
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
  // Calculate next First Friday at 6 PM PST
  const getNextFirstFriday = () => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    // Start with the first day of current month
    let firstDay = new Date(currentYear, currentMonth, 1);
    
    // Find the first Friday (Friday is 5)
    let firstFriday = new Date(firstDay);
    const dayOfWeek = firstFriday.getDay();
    const daysUntilFriday = (5 - dayOfWeek + 7) % 7;
    firstFriday.setDate(firstFriday.getDate() + (daysUntilFriday === 0 ? 7 : daysUntilFriday));
    
    // Set time to 6 PM PST
    firstFriday.setHours(18, 0, 0, 0);
    
    // If this Friday has already passed, get next month's first Friday
    if (firstFriday <= now) {
      const nextMonth = new Date(currentYear, currentMonth + 1, 1);
      firstFriday = new Date(nextMonth);
      const nextDayOfWeek = firstFriday.getDay();
      const nextDaysUntilFriday = (5 - nextDayOfWeek + 7) % 7;
      firstFriday.setDate(firstFriday.getDate() + (nextDaysUntilFriday === 0 ? 7 : nextDaysUntilFriday));
      firstFriday.setHours(18, 0, 0, 0);
    }
    
    return firstFriday;
  };
  
  const nextTournamentDate = getNextFirstFriday();

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

            {/* Right: Next Tournament Countdown */}
            <div className="hidden lg:flex items-center justify-center">
              <div className="relative w-full h-96 bg-gradient-to-br from-neon-magenta/10 to-neon-gold/10 border-2 border-neon-gold rounded-sm p-8 flex flex-col justify-center">
                <div className="text-center space-y-4">
                  <div className="text-neon-gold font-mono text-sm uppercase tracking-widest font-bold">Next Event</div>
                  <h3 className="text-3xl font-bold font-mono text-neon-gold uppercase tracking-widest">Dev Division</h3>
                  <p className="text-white/80 font-mono text-sm leading-relaxed">
                    Monthly tournaments on the <span className="text-neon-gold font-bold">First Friday</span> at 6 PM PST. Compete, improve, and get noticed.
                  </p>
                  <CountdownTimer targetDate={nextTournamentDate} eventName="Dev Division" />
                  <Link href="/dev-division" className="inline-block mt-4 px-6 py-2 border-2 border-neon-magenta text-neon-magenta font-bold font-mono uppercase tracking-widest hover-glow-magenta rounded-sm transition-all">
                    Learn More
                  </Link>
                </div>
              </div>
            </div>
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
            <button className="px-8 py-3 bg-neon-cyan text-dark-black font-bold font-mono uppercase tracking-widest hover-glow-cyan rounded-sm transition-all border-2 border-neon-cyan">
              Explore Dev Division
            </button>
          </Link>
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



      {/* Player Spotlight – Week 1 Section */}
      <section className="py-16 md:py-24 border-t border-neon-magenta/20">
        <div className="container">
          <h2 className="text-4xl font-bold font-mono text-neon-gold mb-12 uppercase tracking-widest">
            Player Spotlight – Week 1
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <PlayerSpotlight
              name="PLUTO"
              role="Top Fragger"
              rank="Lvl 123 • 732 hrs"
              achievements={[
                "K/D: 2.10",
                "Win Rate: 59%",
                "High-impact carry",
              ]}
              stats={[
                { label: 'K/D', value: '2.10' },
                { label: 'Win Rate', value: '59%' },
                { label: 'Level', value: '123' },
                { label: 'Hours', value: '732' },
              ]}
              variant="gold"
              href="/player/pluto"
            />
            <PlayerSpotlight
              name="44TURNIPS"
              role="High Efficiency"
              rank="Lvl 133 • 560 hrs"
              achievements={[
                "K/D: 1.55",
                "Win Rate: 59%",
                "Consistent performer",
              ]}
              stats={[
                { label: 'K/D', value: '1.55' },
                { label: 'Win Rate', value: '59%' },
                { label: 'Level', value: '133' },
                { label: 'Hours', value: '560' },
              ]}
              variant="cyan"
              href="/player/44turnips"
            />
            <PlayerSpotlight
              name="TWOCEEZ"
              role="Support Specialist"
              rank="Lvl 156 • 1955 hrs"
              achievements={[
                "K/D: 1.17",
                "Win Rate: 49%",
                "Exceptional support",
              ]}
              stats={[
                { label: 'K/D', value: '1.17' },
                { label: 'Win Rate', value: '49%' },
                { label: 'Level', value: '156' },
                { label: 'Hours', value: '1955' },
              ]}
              variant="magenta"
              href="/player/twoceez"
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
