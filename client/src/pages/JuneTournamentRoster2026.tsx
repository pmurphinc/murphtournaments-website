import { Link } from 'wouter';
import NeonCard from '@/components/NeonCard';
import GlitchText from '@/components/GlitchText';
import { discordUrl, juneTournamentSignupUrl } from './JuneTournament2026';

interface RosterTeam {
  id: number;
  name: string;
  captain: string;
  players: readonly string[];
  substitute?: string;
}

interface StatCard {
  label: string;
  value: string;
  variant: 'gold' | 'cyan' | 'magenta';
}

const rosterTeams: readonly RosterTeam[] = [
  { id: 1, name: 'Daystar', captain: 'Mike#2590', players: ['Jerahmeel#8692', 'straightkix.ttv#5818'] },
  { id: 2, name: 'Dojo Of Fao', captain: 'Wei_Faostest#2505', players: ['Wei_Faoster#0592', 'Wei_Fao#4674'], substitute: 'Wei_Faostify#9907' },
  { id: 3, name: 'Seismic', captain: 'Kzoe#0633', players: ['NiceBoy#1697', 'Pluto#8051'] },
  { id: 4, name: 'SHOOTERZ ONLY', captain: 'MISFIT_GM#5193', players: ['Boog2SmootgYFS#5600', 'Alwayscapone#9684'] },
  { id: 5, name: 'BTRR', captain: 'SKIEZ#9272', players: ['twitch.dawnIGN#0574', 'Zuex#2198'] },
  { id: 6, name: 'Aura LLC', captain: 'udrakoni#9522', players: ['joewoahseph#8833', 'Spuze_TTV#1856'] },
  { id: 7, name: 'Axoloto', captain: 'ZeToniez#3134', players: ['Diamond#2842', 'Rex#7110'] },
  { id: 8, name: "Auntie's Goo Bois", captain: 'ekazo#5318', players: ['appoh#9173', 'kdkiller6021#4000'] },
  { id: 9, name: 'Team Obsidian', captain: 'Prodigy#3252', players: ['Tron#8189', 'Shinobi#3743'], substitute: 'Heegoo#0606' },
  { id: 10, name: 'spynix', captain: 'Ronthedon.tt#0093', players: ['SkilfulPython10#1048', 'Yaboiivo#1975'], substitute: '\u0046emboy_enjoyer#8043' },
  { id: 11, name: 'That one team', captain: 'Merchant#0469', players: ['Sushi_noob#0598', 'Ttvjiggypiggy#7424'] },
  { id: 12, name: 'Opall Esports', captain: 'INVINCIBLE#5854', players: ['NXT#8501', 'TTV_Cloudy6166#9524'], substitute: 'ImSleepy_ttv#0414' },
  { id: 13, name: 'Sup3r Mario Bro’s', captain: 'BMvrph#7255', players: ['SUP3R#5259', 'Mario_vmanTTV#9301'] },
  { id: 14, name: 'Friends With Benefits', captain: 'Naithehunter#1037', players: ['Sokudo#0731', 'Stikythecreator#7704'] },
  { id: 15, name: 'Paragon', captain: 'DrownninYoAhh#0014', players: ['Kittkats#6384', 'xsuddenstarxttv#9105'] },
  { id: 16, name: 'PIKE', captain: 'cooldude225#6846', players: ['Disposablethumbs#4624', 'GabehornIII#8880'] },
];

const statCards: readonly StatCard[] = [
  { label: 'Registered Teams', value: '16', variant: 'gold' },
  { label: 'Starting Players', value: '48', variant: 'cyan' },
  { label: 'Registered Substitutes', value: '5', variant: 'magenta' },
];

const rosterCardVariants: readonly ('gold' | 'cyan' | 'magenta')[] = ['gold', 'cyan', 'magenta'];

export default function JuneTournamentRoster2026() {
  return (
    <div className="min-h-screen bg-dark-charcoal">
      <section className="relative overflow-hidden py-20 md:py-28 border-b border-neon-gold/30">
        <div className="absolute inset-0 scan-lines opacity-5 pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,184,0,0.16),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(0,217,255,0.1),transparent_35%)] pointer-events-none" />
        <div className="container relative z-10">
          <div className="max-w-5xl space-y-6">
            <p className="text-sm text-neon-gold font-mono uppercase tracking-widest font-bold">Murph Tournaments Presents</p>
            <div className="flex flex-col items-start gap-2 md:flex-row md:items-baseline md:gap-4">
              <GlitchText size="2xl" variant="gold">June 2026</GlitchText>
              <GlitchText size="2xl" variant="cyan">Registered Roster</GlitchText>
            </div>
            <p className="text-neon-cyan font-mono font-bold uppercase tracking-widest">June 28, 2026 — 5 PM Pacific / 8 PM Eastern</p>
            <p className="text-white/80 font-mono leading-relaxed max-w-3xl">The full 16-team field for the June Tournament. Lobby assignments and final event instructions will be announced through Discord.</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-4xl">
              {statCards.map((stat) => (
                <NeonCard key={stat.label} variant={stat.variant} className="bg-black/50 py-5">
                  <p className="text-3xl font-bold font-mono text-white mb-2">{stat.value}</p>
                  <p className="text-xs text-white/60 font-mono uppercase tracking-widest">{stat.label}</p>
                </NeonCard>
              ))}
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/tournaments/june-2026"><button className="w-full sm:w-auto px-8 py-3 border-2 border-neon-cyan text-neon-cyan font-bold font-mono uppercase tracking-widest hover-glow-cyan rounded-sm transition-all">Back to Tournament Details</button></Link>
              <a href={discordUrl} target="_blank" rel="noopener noreferrer"><button className="w-full sm:w-auto px-8 py-3 border-2 border-neon-gold text-neon-gold font-bold font-mono uppercase tracking-widest hover-glow-gold rounded-sm transition-all">Join Discord</button></a>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 border-b border-neon-magenta/20">
        <div className="container">
          <div className="mb-10">
            <h2 className="text-3xl md:text-4xl font-bold font-mono text-neon-cyan uppercase tracking-widest mb-4">Tournament Roster</h2>
            <p className="text-white/70 font-mono leading-relaxed max-w-3xl">Teams are listed in registration order. This display is not tournament seeding.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {rosterTeams.map((team, index) => (
              <NeonCard key={`${team.id}-${team.name}`} variant={rosterCardVariants[index % rosterCardVariants.length]} className="bg-black/50 h-full flex flex-col">
                <p className="text-xs text-white/45 font-mono uppercase tracking-widest mb-3">Registered Team {String(team.id).padStart(2, '0')}</p>
                <h3 className="text-2xl text-white font-bold font-mono mb-5 leading-tight">{team.name}</h3>
                <ul className="space-y-3 flex-1" aria-label={`${team.name} starting players`}>
                  <li className="border border-neon-gold/30 bg-dark-charcoal/70 px-4 py-3 rounded-sm">
                    <p className="text-[10px] text-neon-gold font-bold font-mono uppercase tracking-widest mb-1">Team Leader</p>
                    <p className="text-sm text-white font-mono break-words">{team.captain}</p>
                  </li>
                  {team.players.map((player) => (
                    <li key={`${team.id}-${player}`} className="border border-white/10 bg-dark-charcoal/50 px-4 py-3 rounded-sm">
                      <p className="text-[10px] text-neon-cyan font-bold font-mono uppercase tracking-widest mb-1">Starting Player</p>
                      <p className="text-sm text-white/85 font-mono break-words">{player}</p>
                    </li>
                  ))}
                </ul>
                {team.substitute ? (
                  <div className="mt-5 pt-5 border-t border-neon-magenta/30">
                    <div className="border border-neon-magenta/40 bg-neon-magenta/10 px-4 py-3 rounded-sm">
                      <p className="text-[10px] text-neon-magenta font-bold font-mono uppercase tracking-widest mb-1">Substitute</p>
                      <p className="text-sm text-white/90 font-mono break-words">{team.substitute}</p>
                    </div>
                  </div>
                ) : null}
              </NeonCard>
            ))}
          </div>
          <NeonCard variant="magenta" className="bg-black/60 mt-10">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
              <p className="text-white/80 font-mono leading-relaxed max-w-4xl">The 16-team field is currently full. Additional teams may still register as standbys in case an opening becomes available before check-in.</p>
              <a href={juneTournamentSignupUrl} target="_blank" rel="noopener noreferrer" className="shrink-0"><button className="w-full sm:w-auto px-6 py-3 bg-neon-magenta text-dark-black font-bold font-mono uppercase tracking-widest hover-glow-magenta rounded-sm transition-all border-2 border-neon-magenta">Join Standby List</button></a>
            </div>
          </NeonCard>
        </div>
      </section>
    </div>
  );
}
