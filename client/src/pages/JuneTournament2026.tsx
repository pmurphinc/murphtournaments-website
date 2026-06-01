import { Link } from 'wouter';
import NeonCard from '@/components/NeonCard';
import GlitchText from '@/components/GlitchText';

interface PrizeImage {
  src: string;
  alt: string;
  label: string;
}

interface InfoCard {
  label: string;
  value: string;
  note?: string;
}

const discordUrl = 'https://discord.gg/kcmdxmBgnC';

const infoCards: InfoCard[] = [
  { label: 'Event Window', value: 'June 2026' },
  { label: 'Date', value: 'To Be Announced', note: 'Date To Be Announced' },
  { label: 'Format', value: 'BO3 Final Round Double Elimination', note: 'Format Subject To Change' },
  { label: 'Buy-In', value: '$30 Per Team' },
  { label: 'Team Cap', value: 'Max 16 Teams' },
  { label: 'Cash Prize', value: 'Based On 16 Team Buy-In', note: 'No Cash Prize At 8 Teams' },
];

const firstPlacePrizes = [
  '$240 cash prize - $80 per player, based on a full 16-team buy-in',
  '3D printed M11',
  'Alien Nade',
  'Cashbox with vault and cashout station',
  'Assortment of sponsor keychains',
];

const secondPlacePrizes = [
  'Any $20 in-game bundle of their choosing',
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
              <p className="text-white/80 font-mono leading-relaxed max-w-2xl">
                A new THE FINALS competition launching in June 2026 with BO3 Final Round double elimination, a 16-team cap, and a first-place package led by premium 3D printed prizes plus cash if the event reaches the full 16-team buy-in.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <a href={discordUrl} target="_blank" rel="noopener noreferrer">
                  <button className="w-full sm:w-auto px-8 py-3 bg-neon-magenta text-dark-black font-bold font-mono uppercase tracking-widest hover-glow-magenta rounded-sm transition-all border-2 border-neon-magenta">
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
              <p className="text-xs text-white/50 font-mono uppercase tracking-widest mb-2">
                1st Place Team Cash Prize
              </p>
              <p className="text-6xl md:text-7xl font-bold font-mono text-neon-gold mb-3">$240</p>
              <p className="text-white/70 font-mono">$80 per player</p>
              <p className="text-xs text-neon-cyan font-mono uppercase tracking-widest mt-4">
                Based on 16 teams. No cash prize if the event runs with 8 teams.
              </p>
              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="border border-neon-gold/30 bg-dark-charcoal/70 p-4 rounded-sm">
                  <p className="text-xs text-white/50 font-mono uppercase">Date</p>
                  <p className="text-sm text-neon-gold font-bold font-mono mt-2">To Be Announced</p>
                </div>
                <div className="border border-neon-cyan/30 bg-dark-charcoal/70 p-4 rounded-sm">
                  <p className="text-xs text-white/50 font-mono uppercase">Format</p>
                  <p className="text-sm text-neon-cyan font-bold font-mono mt-2">Subject To Change</p>
                </div>
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
            <p className="text-white/70 font-mono leading-relaxed max-w-3xl">
              Teams should plan around a June 2026 event window while the exact date is finalized. The current target format is BO3 Final Round double elimination, with the final format subject to change before the event goes live. Cash rewards are based on hitting the full 16-team buy-in.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {infoCards.map((card) => (
              <NeonCard key={card.label} variant={card.note ? 'gold' : 'cyan'} className="bg-black/40">
                <p className="text-xs text-white/50 font-mono uppercase tracking-widest mb-3">{card.label}</p>
                <p className="text-lg text-white font-bold font-mono leading-snug">{card.value}</p>
                {card.note && (
                  <p className="text-xs text-neon-gold font-mono uppercase tracking-widest mt-4">{card.note}</p>
                )}
              </NeonCard>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 border-b border-neon-gold/20 bg-black/20">
        <div className="container">
          <div className="grid grid-cols-1 lg:grid-cols-[0.95fr_1.05fr] gap-8 lg:gap-12">
            <NeonCard variant="gold" className="bg-black/60">
              <p className="text-sm text-neon-gold font-mono uppercase tracking-widest font-bold mb-4">
                1st Place Team
              </p>
              <p className="text-5xl font-bold font-mono text-neon-gold mb-2">$240</p>
              <p className="text-sm text-white/60 font-mono mb-3">$80 per player</p>
              <p className="text-xs text-neon-cyan font-mono uppercase tracking-widest mb-6">
                Cash prize requires 16 teams. At 8 teams, prizes are the $20 bundles and 3D prints only.
              </p>
              <div className="space-y-3">
                {firstPlacePrizes.map((prize) => (
                  <div key={prize} className="border border-neon-gold/20 bg-dark-charcoal/70 px-4 py-3 rounded-sm">
                    <p className="text-sm text-white/80 font-mono">{prize}</p>
                  </div>
                ))}
              </div>
            </NeonCard>

            <div className="space-y-6">
              <NeonCard variant="cyan" className="bg-black/50">
                <p className="text-sm text-neon-cyan font-mono uppercase tracking-widest font-bold mb-4">
                  2nd Place
                </p>
                {secondPlacePrizes.map((prize) => (
                  <p key={prize} className="text-lg text-white font-bold font-mono">
                    {prize}
                  </p>
                ))}
              </NeonCard>

              <NeonCard variant="magenta" className="bg-black/50">
                <p className="text-sm text-neon-magenta font-mono uppercase tracking-widest font-bold mb-4">
                  Stay Ready
                </p>
                <p className="text-white/70 font-mono leading-relaxed mb-6">
                  Registration and date updates will be announced through the Murph Tournaments Discord as details are finalized. Donations toward the prize pool are welcome; DM Murph on Discord to coordinate.
                </p>
                <a href={discordUrl} target="_blank" rel="noopener noreferrer">
                  <button className="w-full sm:w-auto px-6 py-3 bg-neon-magenta text-dark-black font-bold font-mono uppercase tracking-widest hover-glow-magenta rounded-sm transition-all border-2 border-neon-magenta">
                    Join Discord
                  </button>
                </a>
              </NeonCard>
            </div>
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
