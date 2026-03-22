import NeonCard from '@/components/NeonCard';
import GlitchText from '@/components/GlitchText';
import { Link } from 'wouter';

/**
 * Live Bracket Page
 * Cyberpunk Neon Rebellion Design
 * - Current/upcoming tournament bracket
 * - Bracket visualization placeholder
 * - Tournament details and schedule
 */

export default function LiveBracket() {
  return (
    <div className="min-h-screen bg-dark-charcoal py-20">
      <div className="container">
        {/* Header */}
        <div className="mb-16">
          <GlitchText size="xl" variant="lime" className="mb-4">
            Live Bracket
          </GlitchText>
          <p className="text-lg text-white/80 font-mono max-w-2xl">
            Current tournament bracket and real-time match updates. Follow the action as teams compete for the championship.
          </p>
        </div>

        {/* Current Tournament Info */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold font-mono text-neon-gold mb-6 uppercase">Upcoming Tournament</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <NeonCard variant="gold">
              <p className="text-xs text-white/50 font-mono uppercase mb-2">Status</p>
              <p className="text-lg font-bold font-mono text-neon-gold">Coming Soon</p>
            </NeonCard>
            <NeonCard variant="gold">
              <p className="text-xs text-white/50 font-mono uppercase mb-2">Format</p>
              <p className="text-lg font-bold font-mono text-neon-gold">TBA</p>
            </NeonCard>
            <NeonCard variant="gold">
              <p className="text-xs text-white/50 font-mono uppercase mb-2">Teams</p>
              <p className="text-lg font-bold font-mono text-neon-gold">TBA</p>
            </NeonCard>
            <NeonCard variant="gold">
              <p className="text-xs text-white/50 font-mono uppercase mb-2">Prize Pool</p>
              <p className="text-lg font-bold font-mono text-neon-gold">TBA</p>
            </NeonCard>
          </div>
        </div>

        {/* Bracket Visualization */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold font-mono text-neon-lime mb-6 uppercase">Tournament Bracket</h2>
          <NeonCard variant="lime">
            <div className="aspect-video bg-dark-charcoal rounded-sm flex items-center justify-center border border-neon-lime/30">
              <div className="text-center">
                <div className="text-6xl mb-4 font-mono text-neon-lime/30">⚔️</div>
                <p className="text-lg font-mono text-white/60 mb-2">8-Team Double Elimination</p>
                <p className="text-sm font-mono text-white/40">Bracket visualization coming soon</p>
                <p className="text-xs font-mono text-white/30 mt-4">Check back during tournament for live updates</p>
              </div>
            </div>
          </NeonCard>
        </div>

        {/* Format Details */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold font-mono text-neon-cyan mb-6 uppercase">Format Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <NeonCard variant="cyan">
              <h3 className="text-lg font-bold font-mono text-neon-cyan mb-4 uppercase">Match Structure</h3>
              <ul className="space-y-2 text-sm text-white/70 font-mono">
                <li>• Double Elimination Format</li>
                <li>• Winners Bracket → Finals</li>
                <li>• Losers Bracket → Consolation</li>
                <li>• Best of 1 (BO1)</li>
                <li>• Final Round Focus</li>
              </ul>
            </NeonCard>

            <NeonCard variant="cyan">
              <h3 className="text-lg font-bold font-mono text-neon-cyan mb-4 uppercase">Prize Distribution</h3>
              <ul className="space-y-2 text-sm text-white/70 font-mono">
                <li>• 1st Place: $2,500 (50%)</li>
                <li>• 2nd Place: $1,500 (30%)</li>
                <li>• 3rd Place: $1,000 (20%)</li>
                <li>• Streamed on Twitch</li>
                <li>• Professional Commentary</li>
              </ul>
            </NeonCard>
          </div>
        </div>

        {/* Watch Live */}
        <div className="text-center mb-16">
          <h2 className="text-2xl font-bold font-mono text-neon-magenta mb-6 uppercase">Watch Live</h2>
          <p className="text-lg text-white/80 font-mono mb-6 max-w-2xl mx-auto">
            Tune in to our Twitch channel for live tournament coverage with professional commentary and analysis.
          </p>
          <a
            href="https://www.twitch.tv/pmurphinc"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-8 py-3 bg-neon-magenta text-dark-black font-bold font-mono uppercase tracking-widest hover-glow-magenta rounded-sm transition-all"
          >
            Watch on Twitch
          </a>
        </div>

        {/* Navigation */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/tournaments">
            <button className="px-8 py-3 border-2 border-neon-cyan text-neon-cyan font-bold font-mono uppercase tracking-widest hover-glow-cyan rounded-sm transition-all">
              Tournament History
            </button>
          </Link>
          <a href="https://discord.gg/kcmdxmBgnC" target="_blank" rel="noopener noreferrer">
            <button className="px-8 py-3 border-2 border-neon-gold text-neon-gold font-bold font-mono uppercase tracking-widest hover-glow-magenta rounded-sm transition-all">
              Join Discord
            </button>
          </a>
        </div>
      </div>
    </div>
  );
}
