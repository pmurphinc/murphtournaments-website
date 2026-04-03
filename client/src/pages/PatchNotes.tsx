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
    id: 'update-10-1-0',
    title: 'UPDATE 10.1.0',
    date: '2026.03.20',
    content: 'Balance changes and gameplay improvements. New weapon tuning for competitive play. Bug fixes and performance optimizations.'
  },
  {
    id: 'store-update-9-14-0',
    title: 'STORE UPDATE 9.14.0',
    date: '2026.03.15',
    content: 'New cosmetics and battle pass items available. Limited-time seasonal bundles. Updated shop rotation with exclusive items.'
  },
  {
    id: 'hotfix-9-13-2',
    title: 'HOTFIX 9.13.2',
    date: '2026.03.10',
    content: 'Critical bug fixes and stability improvements. Server performance enhancements. Fixed matchmaking issues.'
  },
  {
    id: 'patch-9-13-0',
    title: 'PATCH 9.13.0',
    date: '2026.03.05',
    content: 'New Arena map with dynamic weather effects. Updated weapon balance across all playstyles. New cosmetic items and emotes.'
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
                        className="inline-block mt-4 px-4 py-2 bg-neon-magenta/20 border-2 border-neon-magenta text-neon-magenta font-mono text-xs uppercase hover:bg-neon-magenta/40 transition-all duration-200 rounded"
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
