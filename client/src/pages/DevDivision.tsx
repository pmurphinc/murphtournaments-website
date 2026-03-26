import { Link } from 'wouter';
import NeonCard from '@/components/NeonCard';
import GlitchText from '@/components/GlitchText';

/**
 * Development Division Page
 * Cyberpunk Neon Rebellion Design
 * - Path to competitive play
 * - Monthly events for Plat-Diamond players
 * - Skill development and exposure
 */

export default function DevDivision() {
  const features = [
    {
      title: 'Structured Matches',
      description: 'Competitive matches against skilled opponents in a fair, organized environment.',
      color: 'magenta' as const,
    },
    {
      title: 'Detailed Feedback',
      description: 'Receive analysis and feedback on your gameplay to accelerate improvement.',
      color: 'cyan' as const,
    },
    {
      title: 'Stream Coverage',
      description: 'Get noticed. All matches are streamed with professional commentary.',
      color: 'gold' as const,
    },
    {
      title: 'Monthly Events',
      description: 'First Friday of every month. Regular competition schedule.',
      color: 'lime' as const,
    },
  ];

  return (
    <div className="min-h-screen bg-dark-charcoal py-20">
      <div className="container">
        {/* Header */}
        <div className="mb-16">
          <GlitchText size="xl" variant="cyan" className="mb-4">
            Development Division
          </GlitchText>
          <p className="text-xl text-white/80 font-mono max-w-3xl mb-4">
            The Path to Competitive Play
          </p>
          <p className="text-lg text-white/70 font-mono max-w-3xl mb-4">
            Part of Murph Tournaments. Monthly competitive tournaments for Plat–Diamond players seeking competitive experience, skill development, and exposure.
          </p>
          <p className="text-sm text-white/60 font-mono max-w-3xl">
            Structured matches, detailed feedback, and professional stream coverage. First Friday of each month, 6 PM PST.
          </p>
        </div>

        {/* Key Features */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
          {features.map((feature, idx) => (
            <NeonCard key={idx} variant={feature.color}>
              <h3 className="text-lg font-bold font-mono mb-3 uppercase" style={{
                color: feature.color === 'magenta' ? 'rgb(255, 0, 255)' :
                       feature.color === 'cyan' ? 'rgb(0, 217, 255)' :
                       feature.color === 'gold' ? 'rgb(255, 215, 0)' :
                       'rgb(0, 255, 0)',
              }}>
                {feature.title}
              </h3>
              <p className="text-white/70 font-mono">
                {feature.description}
              </p>
            </NeonCard>
          ))}
        </div>

        {/* Eligibility & Requirements */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
          <NeonCard variant="magenta">
            <h3 className="text-lg font-bold font-mono text-neon-magenta mb-4 uppercase">Eligibility</h3>
            <ul className="space-y-2 text-sm text-white/70 font-mono">
              <li>✓ Platinum Rank</li>
              <li>✓ Diamond Rank</li>
              <li>✓ Competitive Mindset</li>
              <li>✓ Reliable Schedule</li>
              <li>✓ Discord Member</li>
            </ul>
          </NeonCard>

          <NeonCard variant="cyan">
            <h3 className="text-lg font-bold font-mono text-neon-cyan mb-4 uppercase">Upcoming Events</h3>
            <ul className="space-y-2 text-sm text-white/70 font-mono">
              <li>📅 April 3rd, 2026</li>
              <li>📅 May 1st, 2026</li>
              <li>📅 June 5th, 2026</li>
              <li>📅 July 3rd, 2026</li>
              <li>🕘 Always 6 PM - 9 PM PST</li>
            </ul>
          </NeonCard>
        </div>

        {/* Progression Path */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold font-mono text-neon-gold mb-6 uppercase">Progression Path</h2>
          <div className="space-y-4">
            <NeonCard variant="gold">
              <div className="flex items-start gap-4">
                <div className="text-3xl font-bold font-mono text-neon-gold">01</div>
                <div>
                  <h3 className="text-lg font-bold font-mono text-neon-gold mb-2">Join Dev Division</h3>
                  <p className="text-white/70 font-mono">Register through Discord and complete your player profile.</p>
                </div>
              </div>
            </NeonCard>

            <NeonCard variant="gold">
              <div className="flex items-start gap-4">
                <div className="text-3xl font-bold font-mono text-neon-cyan">02</div>
                <div>
                  <h3 className="text-lg font-bold font-mono text-neon-cyan mb-2">Compete Monthly</h3>
                  <p className="text-white/70 font-mono">Play in structured matches, receive feedback, and improve your skills.</p>
                </div>
              </div>
            </NeonCard>

            <NeonCard variant="gold">
              <div className="flex items-start gap-4">
                <div className="text-3xl font-bold font-mono text-neon-magenta">03</div>
                <div>
                  <h3 className="text-lg font-bold font-mono text-neon-magenta mb-2">Get Noticed</h3>
                  <p className="text-white/70 font-mono">Build reputation, gain stream exposure, and attract team opportunities.</p>
                </div>
              </div>
            </NeonCard>

            <NeonCard variant="gold">
              <div className="flex items-start gap-4">
                <div className="text-3xl font-bold font-mono text-neon-lime">04</div>
                <div>
                  <h3 className="text-lg font-bold font-mono text-neon-lime mb-2">Advance to Pro</h3>
                  <p className="text-white/70 font-mono">Qualify for main tournaments, join competitive teams, or become a league player.</p>
                </div>
              </div>
            </NeonCard>
          </div>
        </div>

        {/* Resources Section */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold font-mono text-neon-cyan mb-6 uppercase">Resources</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <a href="https://docs.google.com/document/d/1zn3uv5U6dIHCcl4UxpWE5SpHYl34iQEL6doh-EFKMDg/edit?usp=sharing" target="_blank" rel="noopener noreferrer">
              <button className="w-full px-6 py-3 border-2 border-neon-cyan text-neon-cyan font-bold font-mono uppercase tracking-widest hover:bg-neon-cyan hover:text-dark-black transition-all rounded-sm">
                What is the Development Division?
              </button>
            </a>
            <a href="https://docs.google.com/document/d/1aMJuTyLSZ1OjIfqXqxbMP31b_BDB3pLbicBr_ug2r4M/edit?usp=sharing" target="_blank" rel="noopener noreferrer">
              <button className="w-full px-6 py-3 border-2 border-neon-magenta text-neon-magenta font-bold font-mono uppercase tracking-widest hover:bg-neon-magenta hover:text-dark-black transition-all rounded-sm">
                Rulebook
              </button>
            </a>
            <a href="https://forms.gle/MzLNqg3YmPMk7gwK8" target="_blank" rel="noopener noreferrer">
              <button className="w-full px-6 py-3 border-2 border-neon-lime text-neon-lime font-bold font-mono uppercase tracking-widest hover:bg-neon-lime hover:text-dark-black transition-all rounded-sm">
                Sign-Up Here
              </button>
            </a>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <p className="text-lg text-white/80 font-mono mb-6">
            Ready to compete and improve?
          </p>
              <a href="https://discord.gg/kcmdxmBgnC" target="_blank" rel="noopener noreferrer">
                <button className="px-8 py-3 bg-neon-cyan text-dark-black font-bold font-mono uppercase tracking-widest hover-glow-cyan rounded-sm transition-all">
                  Join Discord
                </button>
              </a>
        </div>
      </div>
    </div>
  );
}
