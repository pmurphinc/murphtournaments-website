import { Link } from 'wouter';

/**
 * Footer Component
 * Cyberpunk Neon Rebellion Design
 * - Minimal asymmetric layout
 * - Neon accent colors
 * - Social links and Discord integration
 */

export default function Footer() {
  return (
    <footer className="bg-dark-charcoal border-t border-neon-magenta/30 mt-20 py-12">
      <div className="container">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div>
            <div className="text-lg font-bold font-mono text-white mb-2">MURPH TOURNAMENTS</div>
            <p className="text-sm text-white/60 font-mono">Competitive THE FINALS tournaments. Built by players. For players.</p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-sm font-bold font-mono text-neon-cyan mb-4 uppercase">Navigation</h3>
            <div className="space-y-2">
              <Link href="/tournaments">
                <div className="text-sm text-white/60 hover:text-neon-magenta transition-colors cursor-pointer">Tournaments</div>
              </Link>
              <Link href="/dev-division">
                <div className="text-sm text-white/60 hover:text-neon-magenta transition-colors cursor-pointer">Dev Division</div>
              </Link>
              <Link href="/about">
                <div className="text-sm text-white/60 hover:text-neon-magenta transition-colors cursor-pointer">About</div>
              </Link>
            </div>
          </div>

          {/* Community */}
          <div>
            <h3 className="text-sm font-bold font-mono text-neon-cyan mb-4 uppercase">Community</h3>
            <div className="flex flex-col gap-4">
              <a href="https://www.twitch.tv/pmurphinc" target="_blank" rel="noopener noreferrer" className="text-sm text-white/60 hover:text-neon-magenta transition-colors">
                Twitch
              </a>
              <a href="https://discord.gg/kcmdxmBgnC" target="_blank" rel="noopener noreferrer" className="text-sm text-white/60 hover:text-neon-magenta transition-colors">
                Discord
              </a>
              <a href="https://www.tiktok.com/@pmurphinc" target="_blank" rel="noopener noreferrer" className="text-sm text-white/60 hover:text-neon-magenta transition-colors">
                TikTok
              </a>
            </div>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-sm font-bold font-mono text-neon-cyan mb-4 uppercase">Contact</h3>
            <p className="text-sm text-white/60 font-mono mb-4">Join our Discord for tournament updates and community.</p>
            <a href="https://discord.gg/kcmdxmBgnC" target="_blank" rel="noopener noreferrer" className="inline-block px-4 py-2 bg-neon-magenta text-dark-black font-bold font-mono text-xs uppercase tracking-widest hover-glow-magenta rounded-sm transition-all">
              Join Discord
            </a>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-neon-magenta/20 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-white/40 font-mono">© 2026 Murph Tournaments. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="text-xs text-white/40 hover:text-neon-cyan transition-colors font-mono">Privacy</a>
            <a href="#" className="text-xs text-white/40 hover:text-neon-cyan transition-colors font-mono">Terms</a>
            <a href="#" className="text-xs text-white/40 hover:text-neon-cyan transition-colors font-mono">Contact</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
