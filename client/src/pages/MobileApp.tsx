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
    <div className="min-h-screen bg-dark-charcoal py-16 md:py-20">
      <div className="container space-y-14 md:space-y-20">
        <section className="relative overflow-hidden border-2 border-neon-magenta rounded-sm bg-dark-purple/50 p-6 md:p-10">
          <div className="absolute inset-0 scan-lines opacity-5 pointer-events-none" />
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10 items-start">
            <div className="space-y-5 md:space-y-6">
              <div className="inline-block border border-neon-gold text-neon-gold text-xs font-mono uppercase tracking-widest px-3 py-2 rounded-sm">
                Android Alpha Test Now Open
              </div>
              <div className="space-y-3">
                <GlitchText size="xl" variant="magenta" className="mb-0">
                  Murph Tournament Mobile App
                </GlitchText>
                <h1 className="text-2xl md:text-3xl font-bold font-mono text-white uppercase tracking-wide leading-tight">
                  Built for players who want more than a bracket
                </h1>
                <p className="text-white/80 font-mono text-base md:text-lg max-w-xl">
                  Android alpha is live now. Track the game, study weapon history, and follow the shifting meta with a cleaner competitive companion.
                </p>
              </div>
              <div className="flex flex-wrap gap-3 text-xs font-mono uppercase tracking-widest">
                <span className="px-3 py-2 border border-neon-cyan text-neon-cyan rounded-sm">Android Only</span>
                <span className="px-3 py-2 border border-neon-lime text-neon-lime rounded-sm">iOS Coming Soon</span>
                <span className="px-3 py-2 border border-neon-gold text-neon-gold rounded-sm">Unlisted Alpha Build</span>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 pt-1">
                <a href={APK_URL} target="_blank" rel="noopener noreferrer" className="inline-block px-8 py-3.5 bg-neon-magenta text-dark-black font-bold font-mono uppercase tracking-widest hover-glow-magenta rounded-sm transition-all border-2 border-neon-magenta text-center">
                  Download Android Alpha
                </a>
                <a href="https://discord.gg/kcmdxmBgnC" target="_blank" rel="noopener noreferrer" className="inline-block px-8 py-3.5 border-2 border-neon-cyan text-neon-cyan font-bold font-mono uppercase tracking-widest hover-glow-cyan rounded-sm transition-all text-center">
                  Follow in Discord
                </a>
              </div>
            </div>

            <NeonCard variant="gold" className="h-full">
              <h2 className="text-lg font-bold font-mono text-neon-gold uppercase mb-3">Alpha Install Notice</h2>
              <div className="space-y-2.5 text-sm font-mono text-white/80 leading-relaxed">
                <p>Android only for this alpha release, with iOS coming soon.</p>
                <p>This is an unlisted app build and is not on the Play Store.</p>
                <p>Your phone may ask you to allow installs from this source before the APK installs.</p>
              </div>
            </NeonCard>
          </div>
        </section>

        <section className="border-2 border-neon-cyan rounded-sm bg-dark-purple/40 p-4 sm:p-6 md:p-8">
          <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-6 md:gap-8 items-stretch">
            <NeonCard variant="cyan" className="h-full">
              <h2 className="text-2xl md:text-3xl font-bold font-mono text-neon-cyan uppercase mb-3">Download and Install</h2>
              <p className="text-white/85 font-mono mb-5">
                Get immediate alpha access on Android with the direct APK.
              </p>
              <a href={APK_URL} target="_blank" rel="noopener noreferrer" className="inline-block w-full sm:w-auto px-8 py-3.5 bg-neon-cyan text-dark-black font-bold font-mono uppercase tracking-widest hover-glow-cyan rounded-sm transition-all border-2 border-neon-cyan text-center mb-5">
                Get the APK
              </a>
              <div className="rounded-sm border border-neon-cyan/40 bg-dark-charcoal/50 p-4 space-y-2.5 text-sm font-mono text-white/80">
                <p><span className="text-neon-cyan">Android only:</span> this alpha build is currently for Android devices.</p>
                <p><span className="text-neon-lime">iOS:</span> coming soon.</p>
                <p><span className="text-neon-gold">Unlisted:</span> this build is not on the Google Play Store.</p>
                <p><span className="text-neon-magenta">Install step:</span> your device may ask you to allow installs from this source.</p>
              </div>
            </NeonCard>

            <NeonCard variant="magenta" className="h-full flex flex-col items-center justify-center text-center gap-4 md:gap-5">
              <img
                src="/assets/images/murph-app-alpha-qr.svg"
                alt="QR code to download the Murph Tournament Mobile App Android alpha"
                className="w-60 h-60 md:w-72 md:h-72 rounded-sm border-2 border-neon-magenta bg-white p-2"
              />
              <div className="space-y-1">
                <p className="text-neon-magenta font-mono uppercase tracking-widest text-sm">Scan to install the Alpha build</p>
                <p className="text-white/60 font-mono text-xs">Open with your Android phone camera.</p>
              </div>
            </NeonCard>
          </div>
        </section>

        <section>
          <h2 className="text-3xl font-bold font-mono text-neon-gold uppercase mb-5">App Preview</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <NeonCard variant="gold">
              <p className="text-white/80 font-mono mb-5">
                A cleaner competitive companion designed to keep tournament players in sync with what matters most.
              </p>
              <div className="space-y-3.5">
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
          <h2 className="text-3xl font-bold font-mono text-neon-cyan uppercase mb-5">Feature Highlights</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {featureCards.map((feature) => (
              <NeonCard key={feature.title} variant={feature.variant}>
                <h3 className="text-xl font-bold font-mono text-white uppercase mb-3">{feature.title}</h3>
                <p className="text-white/75 font-mono text-sm leading-relaxed">{feature.text}</p>
              </NeonCard>
            ))}
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <NeonCard variant="magenta" className="bg-gradient-to-b from-neon-magenta/10 to-dark-purple/40">
            <h2 className="text-2xl font-bold font-mono text-neon-magenta uppercase mb-4">Archive + Meta</h2>
            <p className="text-white/80 font-mono mb-4 leading-relaxed">
              The Archive is being expanded to help players look back across weapon history and see how the game changed over time.
            </p>
            <p className="text-white/80 font-mono mb-4 leading-relaxed">
              The Meta section gives a fast pulse on what is rising, what is showing up most, and what deserves attention right now.
            </p>
            <p className="text-white/80 font-mono leading-relaxed">
              Together, they turn raw updates into usable competitive context.
            </p>
          </NeonCard>
          <NeonCard variant="gold">
            <h2 className="text-2xl font-bold font-mono text-neon-gold uppercase mb-4">Alpha Access</h2>
            <p className="text-white/80 font-mono mb-3 leading-relaxed">
              This is an early release built for first access and focused feedback.
            </p>
            <p className="text-white/80 font-mono mb-3 leading-relaxed">
              Alpha players help shape what comes next, from polish to feature depth.
            </p>
            <p className="text-white/80 font-mono leading-relaxed">
              More tools and refinement are coming as the app grows.
            </p>
          </NeonCard>
        </section>

        <section className="border-2 border-neon-cyan rounded-sm bg-dark-purple/40 p-6 md:p-10 text-center">
          <h2 className="text-3xl md:text-4xl font-bold font-mono text-neon-cyan uppercase mb-3">Download the Android Alpha</h2>
          <p className="text-white/80 font-mono max-w-3xl mx-auto mb-7">
            Get early access, test what&apos;s coming, and help shape the next phase of Murph Tournament tools.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a href={APK_URL} target="_blank" rel="noopener noreferrer" className="inline-block px-8 py-3.5 bg-neon-magenta text-dark-black font-bold font-mono uppercase tracking-widest hover-glow-magenta rounded-sm transition-all border-2 border-neon-magenta">
              Download Android Alpha
            </a>
            <a href="https://discord.gg/kcmdxmBgnC" target="_blank" rel="noopener noreferrer" className="inline-block px-8 py-3.5 border-2 border-neon-gold text-neon-gold font-bold font-mono uppercase tracking-widest hover-glow-gold rounded-sm transition-all">
              Join the Community
            </a>
            <Link href="/patchnotes" className="inline-block px-8 py-3.5 border-2 border-neon-cyan text-neon-cyan font-bold font-mono uppercase tracking-widest hover-glow-cyan rounded-sm transition-all">
              Follow Development
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
