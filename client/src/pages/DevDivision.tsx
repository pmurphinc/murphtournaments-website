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
          <p className="text-lg text-white/70 font-mono max-w-3xl">
            Built for Plat–Diamond players seeking competitive experience, skill development, and exposure. Monthly tournaments with structured matches, detailed feedback, and professional stream coverage.
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
              <li>✓ Platinum Rank or Higher</li>
              <li>✓ Diamond Rank</li>
              <li>✓ Competitive Mindset</li>
              <li>✓ Reliable Schedule</li>
              <li>✓ Discord Member</li>
            </ul>
          </NeonCard>

          <NeonCard variant="cyan">
            <h3 className="text-lg font-bold font-mono text-neon-cyan mb-4 uppercase">Schedule</h3>
            <ul className="space-y-2 text-sm text-white/70 font-mono">
              <li>📅 First Friday of Each Month</li>
              <li>🕘 8 PM - 11 PM PST</li>
              <li>👥 4v4 Team Format</li>
              <li>🎙️ Streamed on Twitch</li>
              <li>💬 Post-match Analysis</li>
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

        {/* CTA Section */}
        <div className="text-center">
          <p className="text-lg text-white/80 font-mono mb-6">
            Ready to compete and improve?
          </p>
          <Link href="/join">
            <button className="px-8 py-3 bg-neon-cyan text-dark-black font-bold font-mono uppercase tracking-widest hover-glow-cyan rounded-sm transition-all">
              Join Development Division
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
