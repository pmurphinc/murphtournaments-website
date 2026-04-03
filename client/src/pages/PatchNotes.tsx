import { useState } from 'react';
import GlitchText from '@/components/GlitchText';
import NeonCard from '@/components/NeonCard';
import { ChevronDown } from 'lucide-react';

interface PatchNote {
  id: string;
  title: string;
  date: string;
  content: string;
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
    content: 'FORGE YOUR PATH\nStep into a world of steel, fire, and legend. Dart around the Arena with the new Aerialist Playstyle, duel to the death in the all-new Arena Starlight Hollow, and dress like the champion of your dreams with a fully loaded new Battle Pass!'
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
