import { Link } from 'wouter';
import NeonCard from '@/components/NeonCard';
import GlitchText from '@/components/GlitchText';
import CountdownTimer from '@/components/CountdownTimer';

interface PrizeImage {
  src: string;
  alt: string;
  label: string;
}

interface InfoCard {
  label: string;
  value: string;
}

interface FormatRound {
  title: string;
  flow: string;
  description: string;
  accent: 'gold' | 'cyan' | 'magenta';
}

const discordUrl = 'https://discord.gg/kcmdxmBgnC';
const juneTournamentSignupUrl = 'https://forms.gle/62uQXhJ6825dYN869';
const juneTournamentDate = new Date('2026-06-28T17:00:00-07:00');

const infoCards: InfoCard[] = [
  { label: 'Event Date', value: 'June 28, 2026' },
  { label: 'Time', value: '5 PM Pacific / 8 PM Eastern' },
  { label: 'Entry', value: 'Free' },
  { label: 'Prize', value: '1st Place 3D Prints' },
  { label: 'Format', value: 'Cashout Elim → BO5 Final' },
  { label: 'Team Cap', value: 'Max 16 Teams' },
  { label: 'Runtime', value: 'Approx. 2 Hours' },
];

const formatRounds: FormatRound[] = [
  {
    title: 'Cashout Round 1',
    flow: '16 Teams → 8 Teams',
    description: '4 lobbies run at once. The top 2 teams from each lobby advance; the bottom 2 are eliminated.',
    accent: 'gold',
  },
  {
    title: 'Cashout Round 2',
    flow: '8 Teams → 4 Teams',
    description: '2 lobbies run at once. The top 2 teams from each lobby advance; the bottom 2 are eliminated.',
    accent: 'cyan',
  },
  {
    title: 'Cashout Round 3',
    flow: '4 Teams → 2 Teams',
    description: '1 Cashout lobby remains. The top 2 teams advance to the Grand Final; the bottom 2 are eliminated.',
    accent: 'magenta',
  },
  {
    title: 'Grand Final',
    flow: 'BO5 Final Round Championship Series',
    description: 'Final Round 3v3 BO5. First team to 3 map wins takes the tournament.',
    accent: 'gold',
  },
];

const firstPlacePrizes = [
  '3D printed M11',
  'Alien Nade',
  'Cashbox with vault and cashout station',
  'Assortment of sponsor keychains',
];

const prizeImages: PrizeImage[] = [
  {
    src: '/images/prints/june-2026/m11-display.jpg',
    alt: '3D printed M11 prize displayed outdoors for the June 2026 Murph Tournaments event',
    label: '3D Printed M11',
  },
  {
    src: '/images/prints/june-2026/m11-handheld.jpg',
    alt: 'Handheld 3D printed M11 prize with sponsor keychain for the June 2026 tournament',
    label: 'M11 Detail',
  },
  {
    src: '/images/prints/june-2026/alien-nade.jpg',
    alt: 'Green Alien Nade 3D printed prize for the June 2026 Murph Tournaments event',
    label: 'Alien Nade',
  },
  {
    src: '/images/prints/june-2026/cashbox-vault-cashout.jpg',
    alt: 'Yellow cashbox with vault and cashout station 3D printed prize',
    label: 'Cashbox, Vault, Cashout',
  },
  {
    src: '/images/prints/june-2026/cashbox-alien-bundle.jpg',
    alt: '3D printed cashbox, vault, cashout station, and Alien Nade prize bundle',
    label: 'Physical Prize Bundle',
  },
  {
    src: '/images/prints/june-2026/sponsor-keychains.jpg',
    alt: 'Assorted sponsor keychains printed for the June 2026 Murph Tournaments prize package',
    label: 'Sponsor Keychains',
  },
];

export default function JuneTournament2026() {
  return (
    <div className="min-h-screen bg-dark-charcoal">
      <section className="relative overflow-hidden py-20 md:py-28 border-b border-neon-gold/30">
        <div className="absolute inset-0 scan-lines opacity-5 pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,184,0,0.16),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(0,217,255,0.1),transparent_35%)] pointer-events-none" />

        <div className="container relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_0.85fr] gap-10 lg:gap-14 items-center">
            <div className="space-y-6">
              <p className="text-sm text-neon-gold font-mono uppercase tracking-widest font-bold">
                Murph Tournaments Presents
              </p>
              <div>
                <GlitchText size="2xl" variant="gold">
                  June 2026
                </GlitchText>
                <GlitchText size="2xl" variant="cyan">
                  Tournament
                </GlitchText>
              </div>
              <p className="text-neon-cyan font-mono font-bold uppercase tracking-widest">
                June 28, 2026 — 5:00 PM Pacific / 8:00 PM Eastern
              </p>
              <p className="text-white/80 font-mono leading-relaxed max-w-2xl">
                A 16-team THE FINALS tournament built around Cashout elimination lobbies, a Final Round BO5 Championship Series, and a first-place 3D printed prize bundle.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <a href={juneTournamentSignupUrl} target="_blank" rel="noopener noreferrer">
                  <button className="w-full sm:w-auto px-8 py-3 bg-neon-magenta text-dark-black font-bold font-mono uppercase tracking-widest hover-glow-magenta rounded-sm transition-all border-2 border-neon-magenta">
                    Sign Up Now
                  </button>
                </a>
                <a href={discordUrl} target="_blank" rel="noopener noreferrer">
                  <button className="w-full sm:w-auto px-8 py-3 border-2 border-neon-gold text-neon-gold font-bold font-mono uppercase tracking-widest hover-glow-gold rounded-sm transition-all">
                    Join Discord
                  </button>
                </a>
                <Link href="/">
                  <button className="w-full sm:w-auto px-8 py-3 border-2 border-neon-cyan text-neon-cyan font-bold font-mono uppercase tracking-widest hover-glow-cyan rounded-sm transition-all">
                    Back Home
                  </button>
                </Link>
              </div>
            </div>

            <NeonCard variant="gold" className="bg-black/60">
              <CountdownTimer targetDate={juneTournamentDate} eventName="June Tournament" />
              <div className="border-t border-neon-gold/30 pt-5 mt-2">
                <p className="text-xs text-white/50 font-mono uppercase tracking-widest mb-2">
                  1st Place Prize
                </p>
                <p className="text-3xl md:text-4xl font-bold font-mono text-neon-gold mb-3">3D Printed Prize Bundle</p>
                <p className="text-xs text-neon-cyan font-mono uppercase tracking-widest leading-relaxed">
                  This event is free entry. No buy-in. No cash pot. 1st place only for prizes.
                </p>
              </div>
            </NeonCard>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 border-b border-neon-magenta/20">
        <div className="container">
          <div className="mb-10">
            <h2 className="text-3xl md:text-4xl font-bold font-mono text-neon-cyan uppercase tracking-widest mb-4">
              Tournament Overview
            </h2>
            <p className="text-white/70 font-mono leading-relaxed max-w-4xl">
              The June Tournament uses Cashout elimination lobbies to narrow the field from 16 teams to the final 2. Each Cashout lobby eliminates the bottom 2 teams, while the top 2 advance. The final two teams then face off in a Final Round 3v3 Best-of-5 Championship Series.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {infoCards.map((card) => (
              <NeonCard key={card.label} variant="cyan" className="bg-black/40">
                <p className="text-xs text-white/50 font-mono uppercase tracking-widest mb-3">{card.label}</p>
                <p className="text-lg text-white font-bold font-mono leading-snug">{card.value}</p>
              </NeonCard>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 border-b border-neon-gold/20 bg-black/20">
        <div className="container">
          <div className="mb-10">
            <h2 className="text-3xl md:text-4xl font-bold font-mono text-neon-gold uppercase tracking-widest mb-4">
              Format Breakdown
            </h2>
            <p className="text-white/70 font-mono leading-relaxed max-w-4xl">
              Cashout phase lobbies are 3v3v3v3. Each Cashout lobby eliminates the bottom 2 teams. The top 2 teams advance. Once a team finishes bottom 2 in a Cashout lobby, they are eliminated from the tournament.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
            {formatRounds.map((round, index) => (
              <NeonCard key={round.title} variant={round.accent} className="relative bg-black/50">
                <p className="text-xs text-white/40 font-mono uppercase tracking-widest mb-3">Stage {index + 1}</p>
                <h3 className="text-lg text-white font-bold font-mono uppercase tracking-wider mb-3">{round.title}</h3>
                <p className="text-base text-neon-cyan font-bold font-mono mb-4">{round.flow}</p>
                <p className="text-sm text-white/70 font-mono leading-relaxed">{round.description}</p>
              </NeonCard>
            ))}
          </div>

          <NeonCard variant="magenta" className="bg-black/60 mt-6">
            <p className="text-sm text-neon-magenta font-bold font-mono uppercase tracking-widest mb-3">Important Format Note</p>
            <p className="text-white/80 font-mono leading-relaxed">
              This is not a double-elimination bracket. Once a team finishes bottom 2 in a Cashout lobby, they are eliminated.
            </p>
            <p className="text-white/80 font-mono leading-relaxed mt-3">
              The final two teams play a Final Round 3v3 Best-of-5 Championship Series. First team to 3 map wins is champion. There is no bracket reset.
            </p>
          </NeonCard>

          <p className="text-sm text-white/60 font-mono leading-relaxed mt-6">
            Expected runtime is approximately 2 hours. Plan for a 1 hour 45 minute to 2 hour 15 minute window, with a hard buffer of up to 2.5 hours.
          </p>
        </div>
      </section>

      <section className="py-16 md:py-24 border-b border-neon-gold/20">
        <div className="container">
          <div className="grid grid-cols-1 lg:grid-cols-[0.95fr_1.05fr] gap-8 lg:gap-12">
            <NeonCard variant="gold" className="bg-black/60">
              <p className="text-sm text-neon-gold font-mono uppercase tracking-widest font-bold mb-4">
                1st Place Team
              </p>
              <p className="text-4xl font-bold font-mono text-neon-gold mb-3">3D Printed Prize Bundle</p>
              <p className="text-sm text-white/70 font-mono leading-relaxed mb-6">
                1st place takes home the 3D printed prize bundle: M11, Alien Nade, Cashbox/Vault/Cashout display pieces, and sponsor keychains.
              </p>
              <div className="space-y-3">
                {firstPlacePrizes.map((prize) => (
                  <div key={prize} className="border border-neon-gold/20 bg-dark-charcoal/70 px-4 py-3 rounded-sm">
                    <p className="text-sm text-white/80 font-mono">{prize}</p>
                  </div>
                ))}
              </div>
            </NeonCard>

            <NeonCard variant="magenta" className="bg-black/50">
              <p className="text-sm text-neon-magenta font-mono uppercase tracking-widest font-bold mb-4">
                Registration Open
              </p>
              <p className="text-white/70 font-mono leading-relaxed mb-6">
                Registration updates will be announced through the Murph Tournaments Discord.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <a href={juneTournamentSignupUrl} target="_blank" rel="noopener noreferrer">
                  <button className="w-full sm:w-auto px-6 py-3 bg-neon-magenta text-dark-black font-bold font-mono uppercase tracking-widest hover-glow-magenta rounded-sm transition-all border-2 border-neon-magenta">
                    Sign Up Now
                  </button>
                </a>
                <a href={discordUrl} target="_blank" rel="noopener noreferrer">
                  <button className="w-full sm:w-auto px-6 py-3 border-2 border-neon-cyan text-neon-cyan font-bold font-mono uppercase tracking-widest hover-glow-cyan rounded-sm transition-all">
                    Join Discord
                  </button>
                </a>
              </div>
            </NeonCard>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="container">
          <div className="mb-10">
            <h2 className="text-3xl md:text-4xl font-bold font-mono text-neon-gold uppercase tracking-widest mb-4">
              Prize Gallery
            </h2>
            <p className="text-white/70 font-mono leading-relaxed max-w-3xl">
              Physical prize photos for the June 2026 first-place package, including the M11, Alien Nade, cashbox display pieces, and sponsor keychains.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {prizeImages.map((image) => (
              <figure key={image.src} className="group border-2 border-neon-gold/40 bg-black/60 rounded-sm overflow-hidden transition-all duration-300 hover:border-neon-gold hover-glow-gold">
                <div className="aspect-[4/3] bg-dark-charcoal overflow-hidden">
                  <img
                    src={image.src}
                    alt={image.alt}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                </div>
                <figcaption className="px-5 py-4 text-sm text-neon-gold font-bold font-mono uppercase tracking-widest">
                  {image.label}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
