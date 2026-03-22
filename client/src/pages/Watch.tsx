import NeonCard from '@/components/NeonCard';
import GlitchText from '@/components/GlitchText';

/**
 * Watch/Media Page
 * Cyberpunk Neon Rebellion Design
 * - Embedded Twitch stream
 * - TikTok feed
 * - YouTube videos
 */

export default function Watch() {
  return (
    <div className="min-h-screen bg-dark-charcoal py-20">
      <div className="container">
        {/* Header */}
        <div className="mb-16">
          <GlitchText size="xl" variant="lime" className="mb-4">
            Watch & Media
          </GlitchText>
          <p className="text-lg text-white/80 font-mono max-w-3xl">
            Follow PMURPHINC across all platforms for tournament streams, highlights, and competitive content.
          </p>
        </div>

        {/* Twitch Stream Section */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold font-mono text-neon-magenta mb-6 uppercase">Live on Twitch</h2>
          <NeonCard variant="magenta">
            <div className="aspect-video bg-dark-charcoal rounded-sm flex items-center justify-center border border-neon-magenta/30 mb-4">
              <div className="text-center">
                <div className="text-6xl mb-4">📺</div>
                <p className="text-lg font-mono text-white/60 mb-2">Twitch Stream</p>
                <p className="text-sm font-mono text-white/40">Streams: 9 PM - 12 AM PST</p>
              </div>
            </div>
            <div className="space-y-3">
              <p className="text-sm text-white/70 font-mono">
                Watch live tournament matches, competitive gameplay, and community events on Twitch. PMURPHINC streams regularly during tournament nights with professional commentary and analysis.
              </p>
              <a
                href="https://www.twitch.tv/pmurphinc"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block px-6 py-2 bg-neon-magenta text-dark-black font-bold font-mono uppercase tracking-widest hover-glow-magenta rounded-sm transition-all"
              >
                Watch on Twitch
              </a>
            </div>
          </NeonCard>
        </div>

        {/* TikTok Section */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold font-mono text-neon-cyan mb-6 uppercase">TikTok Highlights</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <NeonCard variant="cyan">
              <div className="aspect-square bg-dark-charcoal rounded-sm flex items-center justify-center border border-neon-cyan/30 mb-4">
                <div className="text-center">
                  <div className="text-6xl mb-4">📱</div>
                  <p className="text-lg font-mono text-white/60">Short-Form Content</p>
                </div>
              </div>
              <p className="text-sm text-white/70 font-mono mb-4">
                Fast-paced tournament highlights, clutch plays, and competitive moments. Follow for daily esports content.
              </p>
              <a
                href="https://www.tiktok.com/@pmurphinc"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block px-6 py-2 border-2 border-neon-cyan text-neon-cyan font-bold font-mono uppercase tracking-widest hover-glow-cyan rounded-sm transition-all"
              >
                Follow on TikTok
              </a>
            </NeonCard>

            <NeonCard variant="cyan">
              <div className="aspect-square bg-dark-charcoal rounded-sm flex items-center justify-center border border-neon-cyan/30 mb-4">
                <div className="text-center">
                  <div className="text-6xl mb-4">🎬</div>
                  <p className="text-lg font-mono text-white/60">Clips & Reels</p>
                </div>
              </div>
              <p className="text-sm text-white/70 font-mono mb-4">
                Best moments from tournaments, player spotlights, and behind-the-scenes content. Shareable clips daily.
              </p>
              <a
                href="https://www.tiktok.com/@pmurphinc"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block px-6 py-2 border-2 border-neon-cyan text-neon-cyan font-bold font-mono uppercase tracking-widest hover-glow-cyan rounded-sm transition-all"
              >
                View Clips
              </a>
            </NeonCard>
          </div>
        </div>

        {/* YouTube Section */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold font-mono text-neon-gold mb-6 uppercase">YouTube</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <NeonCard variant="gold">
              <div className="aspect-video bg-dark-charcoal rounded-sm flex items-center justify-center border border-neon-gold/30 mb-4">
                <div className="text-center">
                  <div className="text-6xl mb-4">🎥</div>
                  <p className="text-lg font-mono text-white/60">Full VODs</p>
                </div>
              </div>
              <p className="text-sm text-white/70 font-mono mb-4">
                Complete tournament recordings, full matches, and archived streams. Watch at your own pace.
              </p>
              <a
                href="https://www.youtube.com/Pmurphinc"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block px-6 py-2 border-2 border-neon-gold text-neon-gold font-bold font-mono uppercase tracking-widest hover-glow-magenta rounded-sm transition-all"
              >
                Watch on YouTube
              </a>
            </NeonCard>

            <NeonCard variant="gold">
              <div className="aspect-video bg-dark-charcoal rounded-sm flex items-center justify-center border border-neon-gold/30 mb-4">
                <div className="text-center">
                  <div className="text-6xl mb-4">📊</div>
                  <p className="text-lg font-mono text-white/60">Analysis & Guides</p>
                </div>
              </div>
              <p className="text-sm text-white/70 font-mono mb-4">
                Competitive analysis, player interviews, and educational content. Learn from the pros.
              </p>
              <a
                href="https://www.youtube.com/Pmurphinc"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block px-6 py-2 border-2 border-neon-gold text-neon-gold font-bold font-mono uppercase tracking-widest hover-glow-magenta rounded-sm transition-all"
              >
                Subscribe
              </a>
            </NeonCard>
          </div>
        </div>

        {/* Schedule */}
        <div>
          <h2 className="text-2xl font-bold font-mono text-neon-lime mb-6 uppercase">Stream Schedule</h2>
          <NeonCard variant="lime">
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-neon-lime/20 pb-3">
                <div>
                  <p className="font-bold font-mono text-neon-lime">Tournament Nights</p>
                  <p className="text-sm text-white/60 font-mono">Murph Tournaments</p>
                </div>
                <p className="text-white/80 font-mono">9 PM - 12 AM PST</p>
              </div>
              <div className="flex justify-between items-center border-b border-neon-lime/20 pb-3">
                <div>
                  <p className="font-bold font-mono text-neon-lime">Dev Division</p>
                  <p className="text-sm text-white/60 font-mono">Monthly Events</p>
                </div>
                <p className="text-white/80 font-mono">First Friday</p>
              </div>
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-bold font-mono text-neon-lime">Special Events</p>
                  <p className="text-sm text-white/60 font-mono">Announcements on Discord</p>
                </div>
                <p className="text-white/80 font-mono">Varies</p>
              </div>
            </div>
          </NeonCard>
        </div>
      </div>
    </div>
  );
}
