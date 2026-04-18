import GlitchText from '@/components/GlitchText';
import NeonCard from '@/components/NeonCard';

const APP_SHARE_URL = 'https://manus.im/share/njv6VbaLUjq8Lo6UgQAQ8o';
const APK_URL = 'https://vida-prod-webdev-app.s3.us-east-1.amazonaws.com/android-builds/310519663462787524/af48971d-ca1b-4cd5-8e48-d6445dfe5dbd/murph-tournaments-app-v1_6_3.apk?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAZV3A2ECZO4N7RSPW%2F20260418%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20260418T005332Z&X-Amz-Expires=604800&X-Amz-SignedHeaders=host&x-id=GetObject&X-Amz-Signature=4e521a81f083d93175333b7888ab862c193c1ffd365bc3e12df0b50b5891547c';
const QR_CODE_URL = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663462787524/GzitzUSk3snQMAtW4LnLnQ/app-qr-code_8b0ee436.png';

const showcaseRows = [
  {
    label: 'Balance Archive',
    value: 'Fast access to all weapons, gadgets, and specs, what changed and when.',
    color: 'text-neon-cyan',
  },
  {
    label: 'Update Archive',
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
        {/* Hero Section */}
        <section className="relative overflow-hidden border-2 border-neon-magenta rounded-sm bg-dark-purple/50 p-6 md:p-10">
          <div className="absolute inset-0 scan-lines opacity-5 pointer-events-none" />
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10 items-start">
            <div className="space-y-5 md:space-y-6">
              <div className="inline-block border border-neon-gold text-neon-gold text-xs font-mono uppercase tracking-widest px-3 py-2 rounded-sm">
                Alpha Test Now Open
              </div>
              <div className="space-y-3">
                <GlitchText size="xl" variant="magenta" className="mb-0">
                  Murph Tournament Mobile App
                </GlitchText>
                <h1 className="text-2xl md:text-3xl font-bold font-mono text-white uppercase tracking-wide leading-tight">
                  Built for players who want more than a bracket
                </h1>
                <p className="text-white/80 font-mono text-base md:text-lg max-w-xl">
                  The alpha is live now. Track the game, study weapon history, and follow the shifting meta with a cleaner competitive companion.
                </p>
              </div>
              <div className="flex flex-wrap gap-3 text-xs font-mono uppercase tracking-widest">
                <span className="px-3 py-2 border border-neon-cyan text-neon-cyan rounded-sm">Android</span>
                <span className="px-3 py-2 border border-neon-lime text-neon-lime rounded-sm">iOS via Expo Go</span>
                <span className="px-3 py-2 border border-neon-gold text-neon-gold rounded-sm">Alpha Build</span>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 pt-1">
                <a href={APK_URL} target="_blank" rel="noopener noreferrer" className="inline-block px-8 py-3.5 bg-neon-magenta text-dark-black font-bold font-mono uppercase tracking-widest hover-glow-magenta rounded-sm transition-all border-2 border-neon-magenta text-center">
                  Download the App
                </a>
                <a href="https://discord.gg/kcmdxmBgnC" target="_blank" rel="noopener noreferrer" className="inline-block px-8 py-3.5 border-2 border-neon-cyan text-neon-cyan font-bold font-mono uppercase tracking-widest hover-glow-cyan rounded-sm transition-all text-center">
                  Follow in Discord
                </a>
              </div>
            </div>

            {/* QR Code Card */}
            <NeonCard variant="gold" className="h-full flex flex-col items-center justify-center text-center gap-4 md:gap-5">
              <a href={APP_SHARE_URL} target="_blank" rel="noopener noreferrer">
                <img
                  src={QR_CODE_URL}
                  alt="QR code to download the Murph Tournament Mobile App"
                  className="w-56 h-56 md:w-64 md:h-64 rounded-sm border-2 border-neon-gold bg-white p-2"
                />
              </a>
              <div className="space-y-1">
                <p className="text-neon-gold font-mono uppercase tracking-widest text-sm">Scan to Download</p>
                <p className="text-white/60 font-mono text-xs">Open with your phone camera</p>
              </div>
            </NeonCard>
          </div>
        </section>

        {/* Download & Install Instructions */}
        <section className="border-2 border-neon-cyan rounded-sm bg-dark-purple/40 p-4 sm:p-6 md:p-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 items-stretch">
            {/* Android Instructions */}
            <NeonCard variant="cyan" className="h-full">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">🤖</span>
                <h2 className="text-2xl md:text-3xl font-bold font-mono text-neon-cyan uppercase">Android</h2>
              </div>
              <p className="text-white/85 font-mono mb-5">
                Download the APK directly to your Android device. No Play Store required.
              </p>
              <a href={APK_URL} target="_blank" rel="noopener noreferrer" className="inline-block w-full sm:w-auto px-8 py-3.5 bg-neon-cyan text-dark-black font-bold font-mono uppercase tracking-widest hover-glow-cyan rounded-sm transition-all border-2 border-neon-cyan text-center mb-5">
                Download for Android
              </a>
              <div className="rounded-sm border border-neon-cyan/40 bg-dark-charcoal/50 p-4 space-y-3 text-sm font-mono text-white/80">
                <div className="flex items-start gap-2">
                  <span className="text-neon-cyan font-bold shrink-0">1.</span>
                  <p>Tap the download link above or scan the QR code with your camera.</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-neon-cyan font-bold shrink-0">2.</span>
                  <p>When prompted, tap <span className="text-neon-gold">&quot;Download anyway&quot;</span> or <span className="text-neon-gold">&quot;Install unknown apps&quot;</span> to allow the install.</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-neon-cyan font-bold shrink-0">3.</span>
                  <p>Open the APK file once downloaded and follow the on-screen prompts.</p>
                </div>
                <div className="mt-3 pt-3 border-t border-neon-cyan/20">
                  <p className="text-neon-gold text-xs uppercase tracking-wider mb-1">Why the extra step?</p>
                  <p className="text-white/60 text-xs">This is a direct alpha build, not distributed through the Google Play Store. Your device will ask you to approve the install from an external source. This is standard for any app installed outside the Play Store.</p>
                </div>
              </div>
            </NeonCard>

            {/* iOS Instructions */}
            <NeonCard variant="lime" className="h-full">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">🍎</span>
                <h2 className="text-2xl md:text-3xl font-bold font-mono text-neon-lime uppercase">iOS</h2>
              </div>
              <p className="text-white/85 font-mono mb-5">
                iOS users can run the app through <span className="text-neon-lime font-bold">Expo Go</span>, a free app from the App Store.
              </p>
              <a href="https://apps.apple.com/app/expo-go/id982107779" target="_blank" rel="noopener noreferrer" className="inline-block w-full sm:w-auto px-8 py-3.5 bg-neon-lime text-dark-black font-bold font-mono uppercase tracking-widest hover-glow-lime rounded-sm transition-all border-2 border-neon-lime text-center mb-5">
                Get Expo Go on App Store
              </a>
              <div className="rounded-sm border border-neon-lime/40 bg-dark-charcoal/50 p-4 space-y-3 text-sm font-mono text-white/80">
                <div className="flex items-start gap-2">
                  <span className="text-neon-lime font-bold shrink-0">1.</span>
                  <p>Download <span className="text-neon-lime font-bold">Expo Go</span> from the App Store (free).</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-neon-lime font-bold shrink-0">2.</span>
                  <p>Open the camera app and scan the QR code above, or visit the <a href={APP_SHARE_URL} target="_blank" rel="noopener noreferrer" className="text-neon-lime underline hover:text-white transition-colors">download page</a>.</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-neon-lime font-bold shrink-0">3.</span>
                  <p>The link will open inside Expo Go and launch the app directly.</p>
                </div>
                <div className="mt-3 pt-3 border-t border-neon-lime/20">
                  <p className="text-neon-gold text-xs uppercase tracking-wider mb-1">What is Expo Go?</p>
                  <p className="text-white/60 text-xs">Expo Go is a free app that lets you run development builds without going through the App Store review process. It is the standard way to test React Native apps during alpha and beta phases.</p>
                </div>
              </div>
            </NeonCard>
          </div>
        </section>

        {/* App Preview */}
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

        {/* Feature Highlights */}
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

        {/* Archive + Meta / Alpha Access */}
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

        {/* Bottom CTA */}
        <section className="border-2 border-neon-cyan rounded-sm bg-dark-purple/40 p-6 md:p-10 text-center">
          <h2 className="text-3xl md:text-4xl font-bold font-mono text-neon-cyan uppercase mb-3">Get the Alpha Now</h2>
          <p className="text-white/80 font-mono max-w-3xl mx-auto mb-7">
            Get early access, test what&apos;s coming, and help shape the next phase of Murph Tournament tools.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a href={APK_URL} target="_blank" rel="noopener noreferrer" className="inline-block px-8 py-3.5 bg-neon-magenta text-dark-black font-bold font-mono uppercase tracking-widest hover-glow-magenta rounded-sm transition-all border-2 border-neon-magenta">
              Download the App
            </a>
            <a href="https://discord.gg/kcmdxmBgnC" target="_blank" rel="noopener noreferrer" className="inline-block px-8 py-3.5 border-2 border-neon-gold text-neon-gold font-bold font-mono uppercase tracking-widest hover-glow-gold rounded-sm transition-all">
              Join the Community
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}
