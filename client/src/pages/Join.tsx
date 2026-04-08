import { useState } from 'react';
import NeonCard from '@/components/NeonCard';
import GlitchText from '@/components/GlitchText';
import { toast } from 'sonner';

/**
 * Join/Contact Page
 * Cyberpunk Neon Rebellion Design
 * - Tournament signup form
 * - Discord integration (primary CTA)
 * - Team/player information collection
 */

export default function Join() {
  const [formData, setFormData] = useState({
    teamName: '',
    platform: 'PC',
    rank: 'Diamond',
    contactEmail: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Show success message
    toast.success('Application submitted! Check your Discord for next steps.');
    // Reset form
    setFormData({
      teamName: '',
      platform: 'PC',
      rank: 'Diamond',
      contactEmail: '',
    });
  };

  return (
    <div className="min-h-screen bg-dark-charcoal py-20">
      <div className="container">
        {/* Header */}
        <div className="mb-16">
          <GlitchText size="xl" variant="magenta" className="mb-4">
            Join PMURPHINC
          </GlitchText>
          <p className="text-lg text-white/80 font-mono max-w-3xl">
            Compete. Improve. Get noticed.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Left: Discord CTA (Primary) */}
          <div>
            <h2 className="text-2xl font-bold font-mono text-neon-cyan mb-6 uppercase">Join Our Community</h2>
            <NeonCard variant="cyan" className="mb-8">
              <div className="text-center space-y-4">
                <div className="text-6xl mb-4">💬</div>
                <p className="text-white/80 font-mono">
                  The PMURPHINC Discord is the hub for all tournament information, player spotlights, and community discussion.
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
            </NeonCard>

            {/* Benefits */}
            <h3 className="text-lg font-bold font-mono text-neon-gold mb-4 uppercase">Why Join?</h3>
            <div className="space-y-3">
              <div className="flex gap-3 items-start">
                <span className="text-neon-magenta font-mono text-lg">✓</span>
                <p className="text-white/70 font-mono">Access to all tournament information and sign-ups</p>
              </div>
              <div className="flex gap-3 items-start">
                <span className="text-neon-cyan font-mono text-lg">✓</span>
                <p className="text-white/70 font-mono">Direct communication with organizers and players</p>
              </div>
              <div className="flex gap-3 items-start">
                <span className="text-neon-gold font-mono text-lg">✓</span>
                <p className="text-white/70 font-mono">Player spotlights and community recognition</p>
              </div>
              <div className="flex gap-3 items-start">
                <span className="text-neon-lime font-mono text-lg">✓</span>
                <p className="text-white/70 font-mono">Networking with competitive players and teams</p>
              </div>
            </div>
          </div>

          {/* Right: Signup Form */}
          <div>
            <h2 className="text-2xl font-bold font-mono text-neon-magenta mb-6 uppercase">Tournament Signup</h2>
            <NeonCard variant="magenta">
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Team Name */}
                <div>
                  <label className="block text-sm font-bold font-mono text-neon-magenta mb-2 uppercase">
                    Team Name
                  </label>
                  <input
                    type="text"
                    name="teamName"
                    value={formData.teamName}
                    onChange={handleChange}
                    placeholder="Your team name"
                    className="w-full px-4 py-2 bg-dark-charcoal border-2 border-neon-magenta/30 text-white font-mono rounded-sm focus:border-neon-magenta focus:outline-none transition-colors"
                    required
                  />
                </div>

                {/* Platform */}
                <div>
                  <label className="block text-sm font-bold font-mono text-neon-cyan mb-2 uppercase">
                    Platform
                  </label>
                  <select
                    name="platform"
                    value={formData.platform}
                    onChange={handleChange}
                    className="w-full px-4 py-2 bg-dark-charcoal border-2 border-neon-cyan/30 text-white font-mono rounded-sm focus:border-neon-cyan focus:outline-none transition-colors"
                  >
                    <option value="PC">PC</option>
                    <option value="Console">Console</option>
                    <option value="Cross-Platform">Cross-Platform</option>
                  </select>
                </div>

                {/* Rank */}
                <div>
                  <label className="block text-sm font-bold font-mono text-neon-gold mb-2 uppercase">
                    Highest Rank
                  </label>
                  <select
                    name="rank"
                    value={formData.rank}
                    onChange={handleChange}
                    className="w-full px-4 py-2 bg-dark-charcoal border-2 border-neon-gold/30 text-white font-mono rounded-sm focus:border-neon-gold focus:outline-none transition-colors"
                  >
                    <option value="Diamond">Diamond</option>
                    <option value="Platinum">Platinum</option>
                    <option value="Gold">Gold</option>
                    <option value="Silver">Silver</option>
                  </select>
                </div>

                {/* Contact Email */}
                <div>
                  <label className="block text-sm font-bold font-mono text-neon-lime mb-2 uppercase">
                    Contact Email
                  </label>
                  <input
                    type="email"
                    name="contactEmail"
                    value={formData.contactEmail}
                    onChange={handleChange}
                    placeholder="your@email.com"
                    className="w-full px-4 py-2 bg-dark-charcoal border-2 border-neon-lime/30 text-white font-mono rounded-sm focus:border-neon-lime focus:outline-none transition-colors"
                    required
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  className="w-full px-6 py-3 bg-neon-magenta text-dark-black font-bold font-mono uppercase tracking-widest hover-glow-magenta rounded-sm transition-all mt-6"
                >
                  Submit Application
                </button>

                <p className="text-xs text-white/50 font-mono text-center mt-4">
                  You'll receive confirmation on Discord. Check your DMs for next steps.
                </p>
              </form>
            </NeonCard>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-20">
          <h2 className="text-2xl font-bold font-mono text-neon-gold mb-8 uppercase">Frequently Asked</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <NeonCard variant="gold">
              <h3 className="text-lg font-bold font-mono text-neon-gold mb-3 uppercase">How do I register?</h3>
              <p className="text-white/70 font-mono text-sm">
                Join the Discord server first, then fill out the tournament signup form. You'll receive confirmation and tournament details via Discord DM.
              </p>
            </NeonCard>

            <NeonCard variant="gold">
              <h3 className="text-lg font-bold font-mono text-neon-gold mb-3 uppercase">What rank do I need?</h3>
              <p className="text-white/70 font-mono text-sm">
                Main tournaments: Diamond rank. Development Division: Platinum–Diamond. Check specific tournament requirements on Discord.
              </p>
            </NeonCard>

            <NeonCard variant="gold">
              <h3 className="text-lg font-bold font-mono text-neon-gold mb-3 uppercase">When are tournaments?</h3>
              <p className="text-white/70 font-mono text-sm">
                Dev Division: April 24th at 4 PM PST. Future events scheduled monthly. Check Discord for exact dates and registration deadlines.
              </p>
            </NeonCard>

            <NeonCard variant="gold">
              <h3 className="text-lg font-bold font-mono text-neon-gold mb-3 uppercase">Do I need a team?</h3>
              <p className="text-white/70 font-mono text-sm">
                Yes. Tournaments are 4v4 team format. If you don't have a team, join Discord and find teammates in the community.
              </p>
            </NeonCard>
          </div>
        </div>
      </div>
    </div>
  );
}
