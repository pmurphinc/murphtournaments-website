import { Link } from "wouter";

export default function Footer() {
  return (
    <footer className="mt-20 border-t border-[var(--mt-steel-line)] bg-[var(--mt-charcoal)] py-12 text-[var(--mt-off-white)]">
      <div className="container">
        <div className="mb-8 grid grid-cols-1 gap-8 md:grid-cols-4">
          <div>
            <div className="font-mono text-lg font-bold uppercase tracking-widest text-[var(--mt-off-white)]">
              Murph Tournaments
            </div>
            <p className="mt-2 text-sm text-[var(--mt-muted)]">
              Competitive THE FINALS tournaments. Built by players. For players.
            </p>
          </div>

          <div>
            <h3 className="mb-4 font-mono text-xs font-bold uppercase tracking-widest text-[var(--mt-gold-bright)]">
              Tournaments
            </h3>
            <div className="flex flex-col gap-2 text-sm text-[var(--mt-muted)]">
              <Link
                href="/tournaments/community"
                className="hover:text-[var(--mt-off-white)]"
              >
                Browse Tournaments
              </Link>
              <Link
                href="/tournaments"
                className="hover:text-[var(--mt-off-white)]"
              >
                Results &amp; Archive
              </Link>
              <Link
                href="/tournaments/june-2026"
                className="hover:text-[var(--mt-off-white)]"
              >
                Current Event
              </Link>
              <Link
                href="/players"
                className="hover:text-[var(--mt-off-white)]"
              >
                Player Archive
              </Link>
            </div>
          </div>

          <div>
            <h3 className="mb-4 font-mono text-xs font-bold uppercase tracking-widest text-[var(--mt-gold-bright)]">
              Site
            </h3>
            <div className="flex flex-col gap-2 text-sm text-[var(--mt-muted)]">
              <Link href="/watch" className="hover:text-[var(--mt-off-white)]">
                Watch
              </Link>
              <Link
                href="/patchnotes"
                className="hover:text-[var(--mt-off-white)]"
              >
                News
              </Link>
              <Link
                href="/balance-archive"
                className="hover:text-[var(--mt-off-white)]"
              >
                Weapon Archive
              </Link>
              <Link href="/about" className="hover:text-[var(--mt-off-white)]">
                About
              </Link>
            </div>
          </div>

          <div>
            <h3 className="mb-4 font-mono text-xs font-bold uppercase tracking-widest text-[var(--mt-gold-bright)]">
              Community
            </h3>
            <div className="flex flex-col gap-2 text-sm text-[var(--mt-muted)]">
              <a
                href="https://www.twitch.tv/pmurphinc"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[var(--mt-off-white)]"
              >
                Twitch
              </a>
              <a
                href="https://discord.gg/kcmdxmBgnC"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[var(--mt-off-white)]"
              >
                Discord
              </a>
              <a
                href="https://www.tiktok.com/@pmurphinc"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[var(--mt-off-white)]"
              >
                TikTok
              </a>
            </div>
            <a
              href="https://discord.gg/kcmdxmBgnC"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-block rounded-md bg-[var(--mt-gold)] px-4 py-2 font-mono text-xs font-bold uppercase tracking-widest text-[var(--mt-gold-foreground)] transition hover:bg-[var(--mt-gold-bright)]"
            >
              Join Discord
            </a>
          </div>
        </div>

        <div className="mt-hairline mb-8" />

        <p className="text-center font-mono text-xs text-[var(--mt-muted)]">
          © 2026 Murph Tournaments. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
