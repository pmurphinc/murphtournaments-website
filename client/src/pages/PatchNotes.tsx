import { useState } from 'react';
import GlitchText from '@/components/GlitchText';
import NeonCard from '@/components/NeonCard';
import { ChevronDown } from 'lucide-react';

interface PatchNote {
  id: string;
  title: string;
  date: string;
  content: string;
  url?: string;
}

/**
 * Patch Notes Page
 * Cyberpunk Neon Rebellion Design
 * - Displays Game Updates with expandable dropdown menus
 * - Shows patch title and date in header
 * - Reveals full patch note content when expanded
 */

const patchNotesData: PatchNote[] = [
  {
    id: 'season-10-fantasy',
    title: 'SEASON 10 | FANTASY LEAGUE',
    date: '2026.03.26',
    content: 'THE FINALS — Season 10 Patch Summary\n\nSeason 10 delivers a major competitive shake-up with new content, balance adjustments, and system updates that directly impact tournament play.\n\nNew Content\n\nNew Map / Updates\n• Map pool refreshed with layout adjustments to improve flow and reduce stalemates\n• Environmental destruction tuning for more predictable engagements\n\nNew Weapons & Gadgets\n• New loadout options added across classes\n• Designed to expand playstyles without breaking core meta\n\nBalance Changes (Competitive Impact)\n\nWeapons\n• Recoil and damage tuning across multiple weapons\n• Reduced dominance of top-tier meta picks\n• Increased viability for underused weapons\n\nGadgets\n• Utility balancing to prevent overstacking strong defensive setups\n• Adjustments to cooldowns and effectiveness\n\nClass Tuning\n• Light, Medium, and Heavy roles rebalanced for clearer identity\n• Survivability and mobility adjustments to reduce frustration in fights\n\nGame Mode & Systems\n\nCashout Improvements\n• Better pacing and clarity during objective fights\n• Adjustments to spawn logic and contest mechanics\n\nRanked / Competitive Systems\n• Improvements to matchmaking consistency\n• Rank progression tuned for better skill representation\n\nQuality of Life\n• UI clarity improvements (health, damage feedback, objectives)\n• Audio tweaks for better situational awareness\n• Performance optimizations across platforms\n\nBug Fixes\n• Fixed multiple gameplay exploits and edge-case interactions\n• Improved hit registration consistency\n• Stability improvements in high-action scenarios'
  },
  {
    id: 'update-9-9-0',
    title: 'UPDATE 9.9.0',
    date: '2026.02.12',
    content: 'THE RED MOON SHALL SHINE!\n\nA beautiful moon takes over the Arena, and rising lanterns float upwards, casting a soft glow across the Arena. The Lunar New Year festivities have officially started in THE FINALS!\n\nCOLLECTION EVENT | LUNAR NEW YEAR\nComplete 3 daily contracts to light up a lantern each day and earn up to 15 free Lunar New Year-themed rewards, including the Legendary Final Mentra set! You will now only need to collect 12 out of the 14 rewards to unlock the Legendary set.\n\nLTM | BANK IT\nA classic in THE FINALS is now back as a Limited-Time Mode! Bank It makes its return as you race to eliminate your opponents and collect precious red envelopes to bring them safely to a Deposit Station.\n\nARENa UPDATES | LUNAR NEW YEAR DECOR\nThe Arena is aglow with Lunar New Year decorations lighting up selected maps. Visit Fangwai City, Las Vegas, Monaco, Seoul, and Fortune Stadium to embrace the festive spirit!\n\nSTORE | REVENANT SETS\nStep into the boots of the mysterious spirits inside THE FINALS with the Ling Shen and Graveward Revenant sets and chase down your opponents in a relentless pursuit for vengeance.\n\nBALANCE CHANGES\nWeapon adjustments including BFR Titan damage reduction, CB-01 Repeater tuning, Cerberus 12GA pellet count increase, and LH1 camera shake reduction. These changes are aimed at reducing the \'poke\' meta and improving overall weapon balance.\n\nBUG FIXES\nExtensive animation, audio, cosmetics, and gameplay fixes including improved crouch poses, fixed audio stutters, cosmetic display corrections, and map improvements across multiple arenas.',
    url: 'https://www.reachthefinals.com/patchnotes/990'
  },
  {
    id: 'update-9-7-0',
    title: 'UPDATE 9.7.0',
    date: '2026.01.29',
    content: 'STAY ON THE MOVE!\n\nThis week, we are bringing a bunch of bug fixes, some performance improvements, changes to Point Break, balance changes and more! The recent DDoS attacks have also been largely mitigated by now, so the game should be back to normal service!\n\nSOCIAL | DISPLAY NAME\nNew rules for Embark ID Display Names to protect the game from bad actors. If your Display Name did not fit the new rule system, it was changed with no cooldown so you can pick a new one easily.\n\nNEW REWARD | THE VOLTAGE MARAUDER SET\nEarn the Voltage Marauder Set in THE FINALS when you own ARC Raiders! Simply connect your same Embark ID account across both games.\n\nSTORE UPDATE | PEAK-FORM STRIKER\nSend your opponents down a slippery slope in style with the Peak-Form Striker and the Slope Slammer sets. We also added Finger guns!\n\nWORLD TOUR | ORBITAL BREACH\nOrbital Breach has been enabled in the Arena. This event combines Hackout (see nearby opponents through walls) and Orbital Lasers (targeting anyone standing still for too long).\n\nDLC | GLITCH PROWLER SET\nLet your feline side take over with the Glitch Prowler Set. Embrace the cuteness and strike!\n\nBALANCE CHANGES\nGadget adjustments: Dome Shield health reduced from 300 to 250, Glitch Grenade ammo increased to 2 with cooldown raised to 25 seconds. Weapon tuning for FCAR, M60, P90, Pike-556, and XP-54 to improve automatic weapon viability and balance the meta.\n\nBUG FIXES & IMPROVEMENTS\nExtensive fixes for Gateway animations, audio issues, cosmetics, map improvements across Fangwai City, Kyoto, Las Vegas, Monaco, and Skyway Stadium. Performance optimizations for GPU and movement systems. Social features updated with new animations and offline appearance option.',
    url: 'https://www.reachthefinals.com/patchnotes/970'
  },
  {
    id: 'update-9-4-0',
    title: 'UPDATE 9.4.0',
    date: '2026.01.08',
    content: 'BACK IN ACTION!\n\nWelcome, Contestants! It\'s the first week back in 2026 and we\'ve packed this week\'s update with a long list of bug-fixes, some balance changes, and performance improvements.\n\nSNOWBALL BLITZ | LAST CHANCE\nThis is the last week of Snowball Blitz, so make a pile of snowballs and turn in those contracts!\n\nSTORE UPDATE | P1XEL REIGN CREW\nC-Pop group P1XEL REIGN have entered the Arena and they\'re here to take the spotlight from everyone! Do you have what it takes to face them?\n\nTWITCH | NEW FREE DROPS\nBrand-new free Twitch drops available until January 22nd. Watch anyone playing THE FINALS with drops enabled to earn exclusive rewards!\n\nBALANCE CHANGES\nGadgets: Breach Drill bit length increased from 83cm to 108cm for better wall penetration. Game Modes: Cashout Station spawn logic updated for consistent distances. Weapons: CB-01 Repeater ADS zoom time increased, FAMAS recoil pattern adjusted, Recurve Bow rate of fire increased from 98 to 103 RPM, V9S damage falloff end range decreased from 25m to 20m.\n\nBUG FIXES & IMPROVEMENTS\nExtensive animation fixes for .50 Akimbo pistols, Mesh Shield interactions, and cosmetic clipping issues. Audio improvements including announcer volume slider integration, deploy sound polish, and ÖRF grenade voice line adjustments. Cosmetic compatibility improvements for boots, pants, hoodies, and various outfits.',
    url: 'https://www.reachthefinals.com/patchnotes/940'
  },

];

export default function PatchNotes() {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpanded = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="min-h-screen bg-dark-charcoal py-20">
      <div className="container">
        {/* Header */}
        <div className="mb-16">
          <GlitchText size="xl" variant="magenta" className="mb-4">
            Game Updates
          </GlitchText>
          <p className="text-lg text-white/80 font-mono max-w-2xl">
            Latest patch notes and game updates for The Finals. Stay informed about balance changes, new features, and bug fixes.
          </p>
        </div>

        {/* Patch Notes List */}
        <div>
          <h2 className="text-2xl font-bold font-mono text-neon-cyan mb-6 uppercase">Recent Updates</h2>
          <div className="grid grid-cols-1 gap-4">
            {patchNotesData.map((patch) => (
              <NeonCard key={patch.id} variant="cyan">
                <button
                  onClick={() => toggleExpanded(patch.id)}
                  className="w-full text-left"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold font-mono text-white mb-1">{patch.title}</h3>
                      <p className="text-sm text-white/60 font-mono">{patch.date}</p>
                    </div>
                    <div className="ml-4 flex-shrink-0">
                      <ChevronDown
                        className={`w-6 h-6 text-neon-cyan transition-transform ${
                          expandedId === patch.id ? 'rotate-180' : ''
                        }`}
                      />
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {expandedId === patch.id && (
                    <div className="space-y-3 border-t border-white/10 pt-4 mt-4">
                      <p className="text-sm font-mono text-white/80 whitespace-pre-wrap leading-relaxed">
                        {patch.content}
                      </p>
                      <a
                        href={patch.url || 'https://www.reachthefinals.com/patchnotes'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block mt-4 px-4 py-2 bg-neon-magenta/20 border-2 border-neon-magenta text-neon-magenta font-mono text-xs uppercase transition-all duration-200 rounded cursor-pointer hover:bg-neon-magenta/40 hover:shadow-[0_0_20px_rgba(255,0,127,0.6)] hover:shadow-neon-magenta"
                      >
                        View on Official Website →
                      </a>
                    </div>
                  )}
                </button>
              </NeonCard>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
