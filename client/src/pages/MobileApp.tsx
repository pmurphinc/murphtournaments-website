import { Link } from 'wouter';
import GlitchText from '@/components/GlitchText';
import NeonCard from '@/components/NeonCard';

const APK_URL = 'https://vida-prod-webdev-app.s3.us-east-1.amazonaws.com/android-builds/310519663462787524/697125af-dafa-4c97-af97-b6bfd1096f81/murph-tournaments-app-v1_5_4.apk?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAZV3A2ECZO4N7RSPW%2F20260414%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20260414T025228Z&X-Amz-Expires=604800&X-Amz-SignedHeaders=host&x-id=GetObject&X-Amz-Signature=4bcdb819b616e81fbe164d1e98652d20ecfcfe13a254c39cbadf74bfce6d29be';

const showcaseRows = [
  {
    label: 'Tournament Feed',
    value: 'Fast access to bracket links, stream windows, and event checkpoints.',
    color: 'text-neon-cyan',
  },
  {
    label: 'Archive Timeline',
    value: 'Patch-by-patch snapshots that show how weapons changed over time.',
    color: 'text-neon-gold',
  },
  {
    label: 'Meta Pulse',
    value: 'A focused first look at what players are running and watching during alpha.',
    color: 'text-neon-magenta',
  },
];

const featureCards = [
  {
    title: 'Tournament Utility',
    text: 'Built to support players, teams, and tournament communities with faster access to competitive tools.',
    variant: 'cyan' as const,
  },
  {
    title: 'Weapon Archive',
    text: 'Track historical weapon updates and balance shifts, so you can study how loadouts evolved.',
    variant: 'gold' as const,
  },
  {
    title: 'Meta Information',
    text: 'Quickly spot what is trending, what keeps showing up, and what deserves attention right now.',
    variant: 'magenta' as const,
  },
  {
    title: 'Built for Growth',
    text: 'This alpha is the starting line. New features, refinements, and deeper systems are being expanded.',
    variant: 'lime' as const,
  },
];

export default function MobileApp() {
  return (
    <div className="min-h-screen bg-dark-charcoal py-20">
      <div className="container space-y-16 md:space-y-24">
        <section className="relative overflow-hidden border-2 border-neon-magenta rounded-sm bg-dark-purple/50 p-6 md:p-10">
          <div className="absolute inset-0 scan-lines opacity-5 pointer-events-none" />
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            <div className="space-y-6">
              <div className="inline-block border border-neon-gold text-neon-gold text-xs font-mono uppercase tracking-widest px-3 py-2 rounded-sm">
                Alpha Test Now Open
              </div>
              <div>
                <GlitchText size="xl" variant="magenta" className="mb-2">
                  Murph Tournament Mobile App
                </GlitchText>
                <p className="text-white/80 font-mono text-base md:text-lg max-w-xl">
                  Android Alpha available now. Built for players who want more than just a bracket: track the game, study the archive, and follow the shifting meta.
                </p>
              </div>
              <div className="flex flex-wrap gap-3 text-xs font-mono uppercase tracking-widest">
                <span className="px-3 py-2 border border-neon-cyan text-neon-cyan rounded-sm">Android Only</span>
                <span className="px-3 py-2 border border-neon-lime text-neon-lime rounded-sm">iOS Coming Soon</span>
                <span className="px-3 py-2 border border-neon-gold text-neon-gold rounded-sm">Unlisted Alpha Build</span>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 pt-2">
                <a href={APK_URL} target="_blank" rel="noopener noreferrer" className="inline-block px-8 py-3 bg-neon-magenta text-dark-black font-bold font-mono uppercase tracking-widest hover-glow-magenta rounded-sm transition-all border-2 border-neon-magenta text-center">
                  Download Android Alpha
                </a>
                <a href="https://discord.gg/kcmdxmBgnC" target="_blank" rel="noopener noreferrer" className="inline-block px-8 py-3 border-2 border-neon-cyan text-neon-cyan font-bold font-mono uppercase tracking-widest hover-glow-cyan rounded-sm transition-all text-center">
                  Follow in Discord
                </a>
              </div>
            </div>

            <NeonCard variant="gold" className="h-full">
              <h2 className="text-lg font-bold font-mono text-neon-gold uppercase mb-4">Android Alpha Install</h2>
              <div className="space-y-3 text-sm font-mono text-white/80">
                <p>Android only for this alpha release. iOS support is coming soon.</p>
                <p>This is an unlisted build and is not available on the Play Store.</p>
                <p>Your phone may ask you to allow installs from unknown or third-party sources before installing the APK.</p>
              </div>
            </NeonCard>
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
          <NeonCard variant="cyan" className="h-full">
            <h2 className="text-2xl font-bold font-mono text-neon-cyan uppercase mb-4">Download and Install</h2>
            <p className="text-white/80 font-mono mb-6">
              Get immediate alpha access on Android with the direct APK.
            </p>
            <div className="space-y-3 mb-6 text-sm font-mono text-white/70">
              <p>• Android only for this alpha release.</p>
              <p>• iOS is in progress and coming soon.</p>
              <p>• This build is unlisted and not on the Play Store.</p>
              <p>• You may need to enable installs from unknown sources on your device.</p>
            </div>
            <a href={APK_URL} target="_blank" rel="noopener noreferrer" className="inline-block px-6 py-3 bg-neon-cyan text-dark-black font-bold font-mono uppercase tracking-widest hover-glow-cyan rounded-sm transition-all border-2 border-neon-cyan">
              Get the APK
            </a>
          </NeonCard>

          <NeonCard variant="magenta" className="h-full flex flex-col items-center justify-center text-center gap-4">
            <img
              src="/assets/images/murph-app-alpha-qr.svg"
              alt="QR code to download the Murph Tournament Mobile App Android alpha"
              className="w-56 h-56 md:w-64 md:h-64 rounded-sm border-2 border-neon-magenta bg-white p-2"
            />
            <p className="text-neon-magenta font-mono uppercase tracking-widest text-sm">Scan to install the Alpha build</p>
          </NeonCard>
        </section>

        <section>
          <h2 className="text-3xl font-bold font-mono text-neon-gold uppercase mb-6">App Preview</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <NeonCard variant="gold">
              <p className="text-white/80 font-mono mb-6">
                A cleaner competitive companion designed to keep tournament players in sync with what matters most.
              </p>
              <div className="space-y-4">
                {showcaseRows.map((row) => (
                  <div key={row.label} className="border border-white/10 rounded-sm p-4 bg-dark-charcoal/40">
                    <p className={`font-mono uppercase tracking-widest text-sm mb-1 ${row.color}`}>{row.label}</p>
                    <p className="text-white/70 font-mono text-sm">{row.value}</p>
                  </div>
                ))}
              </div>
            </NeonCard>

            <NeonCard variant="lime" className="flex flex-col justify-between">
              <div>
                <h3 className="text-xl font-bold font-mono text-neon-lime uppercase mb-4">Built for What&apos;s Next</h3>
                <p className="text-white/80 font-mono mb-4">
                  This first look is focused on speed, clarity, and competitive insight. More surfaces and deeper utility are coming during alpha.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="border border-neon-cyan/40 p-3 rounded-sm">
                  <p className="text-neon-cyan font-mono text-xs uppercase">Early Access</p>
                  <p className="text-white/70 font-mono text-xs mt-1">First release track</p>
                </div>
                <div className="border border-neon-gold/40 p-3 rounded-sm">
                  <p className="text-neon-gold font-mono text-xs uppercase">Archive</p>
                  <p className="text-white/70 font-mono text-xs mt-1">History in motion</p>
                </div>
                <div className="border border-neon-magenta/40 p-3 rounded-sm">
                  <p className="text-neon-magenta font-mono text-xs uppercase">Meta</p>
                  <p className="text-white/70 font-mono text-xs mt-1">Trend first look</p>
                </div>
                <div className="border border-neon-lime/40 p-3 rounded-sm">
                  <p className="text-neon-lime font-mono text-xs uppercase">Growth</p>
                  <p className="text-white/70 font-mono text-xs mt-1">Ongoing expansion</p>
                </div>
              </div>
            </NeonCard>
          </div>
        </section>

        <section>
          <h2 className="text-3xl font-bold font-mono text-neon-cyan uppercase mb-6">Feature Highlights</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {featureCards.map((feature) => (
              <NeonCard key={feature.title} variant={feature.variant}>
                <h3 className="text-xl font-bold font-mono text-white uppercase mb-3">{feature.title}</h3>
                <p className="text-white/75 font-mono text-sm">{feature.text}</p>
              </NeonCard>
            ))}
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <NeonCard variant="magenta">
            <h2 className="text-2xl font-bold font-mono text-neon-magenta uppercase mb-4">Archive + Meta</h2>
            <p className="text-white/80 font-mono mb-4">
              The Archive is being expanded to help players look back across weapon history and understand how the game has shifted.
            </p>
            <p className="text-white/80 font-mono mb-4">
              The Meta section gives a fast view of what is rising, what is popular, and what is demanding attention right now.
            </p>
            <p className="text-white/80 font-mono">
              Together, they help you study the game instead of guessing.
            </p>
          </NeonCard>
          <NeonCard variant="gold">
            <h2 className="text-2xl font-bold font-mono text-neon-gold uppercase mb-4">Alpha Access</h2>
            <p className="text-white/80 font-mono mb-3">
              This is an early release built for first access and focused feedback.
            </p>
            <p className="text-white/80 font-mono mb-3">
              Alpha players help shape what comes next, from polish to feature depth.
            </p>
            <p className="text-white/80 font-mono">
              More tools and refinement are coming as the app grows.
            </p>
          </NeonCard>
        </section>

        <section className="border-2 border-neon-cyan rounded-sm bg-dark-purple/40 p-6 md:p-10 text-center">
          <h2 className="text-3xl font-bold font-mono text-neon-cyan uppercase mb-4">Download the Android Alpha</h2>
          <p className="text-white/80 font-mono max-w-3xl mx-auto mb-6">
            Get in early, test the app, and help shape the next phase of Murph Tournament tools.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href={APK_URL} target="_blank" rel="noopener noreferrer" className="inline-block px-8 py-3 bg-neon-magenta text-dark-black font-bold font-mono uppercase tracking-widest hover-glow-magenta rounded-sm transition-all border-2 border-neon-magenta">
              Download Android Alpha
            </a>
            <a href="https://discord.gg/kcmdxmBgnC" target="_blank" rel="noopener noreferrer" className="inline-block px-8 py-3 border-2 border-neon-gold text-neon-gold font-bold font-mono uppercase tracking-widest hover-glow-gold rounded-sm transition-all">
              Join the Community
            </a>
            <Link href="/patchnotes" className="inline-block px-8 py-3 border-2 border-neon-cyan text-neon-cyan font-bold font-mono uppercase tracking-widest hover-glow-cyan rounded-sm transition-all">
              Follow Development
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
