import { useState } from 'react';
import GlitchText from '@/components/GlitchText';
import NeonCard from '@/components/NeonCard';
import LoadingThrobber from '@/components/LoadingThrobber';
import { ChevronDown } from 'lucide-react';
import { trpc } from '@/lib/trpc';

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

  const patches = patchNotesData ?? [];

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
