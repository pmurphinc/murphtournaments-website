import { useState } from 'react';
import GlitchText from '@/components/GlitchText';
import NeonCard from '@/components/NeonCard';
import LoadingThrobber from '@/components/LoadingThrobber';
import { ChevronDown } from 'lucide-react';
import { trpc } from '@/lib/trpc';

const RESPEC_ORDER_PATCH_NOTE = {
  id: -1012,
  title: 'Respec Order 2.0',
  date: '2026.06.17',
  version: 'respec-order-2',
  url: 'https://www.reachthefinals.com/patchnotes/respec-order-2',
  content: `THE FINALS — Respec Order 2.0

Respec Order returns in update 10.12 as a World Tour Stop in Cashout for two weeks. Embark is continuing the health and movement-speed test from update 10.3, with extra weapon and specialization changes to better evaluate combat breakpoints, team cohesion, archetype identity, and class balance.

Test Goals

• Movement Speed: bring body-type movement speeds closer together so teams drift apart less often.
• Health Scale: compress health differences to make weapon balance feel better across Light, Medium, and Heavy.
• The first test had neutral survey sentiment, with roughly 53,000 survey responses and a 2.93 average score.
• World Tour participation rose during the test, and Embark says more testing is needed before anything reaches the main game.

Light Archetype

• Health increased from 150 to 175.
• Health regen delay increased from 7s to 8s.
• Sprint and run speeds decreased across forward, strafe, and backpedal movement.
• 93R damage decreased from 25 to 24 and fire rate decreased from 210 RPM to 200 RPM.
• Evasive Dash charges decreased from 3 to 2, while cooldown decreased from 7.5s to 6.5s.
• LH1 damage decreased from 44 to 42, with fall-off ranges pushed farther out.

Medium Archetype

• Cerberus damage per pellet increased from 8 to 9.
• CB-01 damage increased from 84 to 88.
• FAMAS damage per shot increased from 23 to 24.
• Model 1887 damage per pellet increased from 12 to 13.
• Pike-556 damage increased from 49 to 52.

Heavy Archetype

• Health decreased from 350 to 325.
• Sprint and run speeds increased across forward, strafe, and backpedal movement.
• BFR Titan damage increased from 88 to 95.
• MGL-32 max damage increased from 83 to 97, with outer blast damage increased from 10 to 12.
• SA1216 damage per pellet decreased from 6 to 5.

Competitive Notes

• Light gains more health, but Evasive Dash is being toned down.
• Heavy becomes faster, but loses some tank durability.
• Medium receives several weapon damage buffs to keep breakpoints competitive inside the altered health scale.
• These changes are mode-specific to Respec Order and are not being pushed directly into the main game yet.`,
};

/**
 * Patch Notes Page
 * Cyberpunk Neon Rebellion Design
 * - Fetches Game Updates from the database via tRPC
 * - Displays newest first with expandable dropdown menus
 * - Shows patch title and date in header
 * - Reveals full patch note content when expanded
 */

export default function PatchNotes() {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const { data: patchNotesData, isLoading } = trpc.patchNotes.getAll.useQuery();

  const toggleExpanded = (id: number) => {
    setExpandedId(expandedId === id ? null : id);
  };

  if (isLoading) {
    return <LoadingThrobber />;
  }

  const patches = [
    RESPEC_ORDER_PATCH_NOTE,
    ...(patchNotesData ?? []).filter(
      patch =>
        patch.url !== RESPEC_ORDER_PATCH_NOTE.url &&
        patch.version !== RESPEC_ORDER_PATCH_NOTE.version
    ),
  ];

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
          {patches.length === 0 ? (
            <NeonCard variant="cyan">
              <p className="text-white/60 font-mono text-center py-8">
                No game updates available yet. Check back soon.
              </p>
            </NeonCard>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {patches.map((patch) => (
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
          )}
        </div>
      </div>
    </div>
  );
}
