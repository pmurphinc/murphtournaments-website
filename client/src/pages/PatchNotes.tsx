import { useState, useEffect } from 'react';
import GlitchText from '@/components/GlitchText';
import NeonCard from '@/components/NeonCard';
import { ChevronDown } from 'lucide-react';

interface PatchNote {
  id: string;
  title: string;
  date: string;
  version: string;
  content: string;
  type: string;
}

/**
 * Patch Notes Page
 * Cyberpunk Neon Rebellion Design
 * - Fetches Game Updates from reachthefinals.com/patchnotes
 * - Displays patches newest first with expandable sections
 * - Filters to show only Game Updates
 */

export default function PatchNotes() {
  const [patches, setPatches] = useState<PatchNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const fetchPatchNotes = async () => {
      try {
        setLoading(true);
        // Fetch from reachthefinals.com/patchnotes
        const response = await fetch('https://reachthefinals.com/patchnotes');
        
        if (!response.ok) {
          throw new Error(`Failed to fetch patch notes: ${response.statusText}`);
        }

        const html = await response.text();
        
        // Parse HTML to extract Game Updates
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        // Look for patch note sections - adjust selectors based on actual HTML structure
        const patchElements = doc.querySelectorAll('[data-type="game-update"], .game-update, [class*="game-update"]');
        
        const parsedPatches: PatchNote[] = [];
        
        patchElements.forEach((element, index) => {
          const titleEl = element.querySelector('h2, h3, .title, [class*="title"]');
          const dateEl = element.querySelector('.date, [class*="date"], time');
          const contentEl = element.querySelector('.content, [class*="content"], p');
          const versionEl = element.querySelector('.version, [class*="version"]');
          
          if (titleEl) {
            parsedPatches.push({
              id: `patch-${index}`,
              title: titleEl.textContent?.trim() || 'Untitled Patch',
              date: dateEl?.textContent?.trim() || 'Unknown Date',
              version: versionEl?.textContent?.trim() || 'v1.0',
              content: contentEl?.textContent?.trim() || 'No details available',
              type: 'Game Update'
            });
          }
        });

        // Sort by date (newest first) - attempt to parse dates
        parsedPatches.sort((a, b) => {
          try {
            const dateA = new Date(a.date).getTime();
            const dateB = new Date(b.date).getTime();
            return dateB - dateA;
          } catch {
            return 0;
          }
        });

        if (parsedPatches.length === 0) {
          setError('No Game Updates found. Please check back later.');
        } else {
          setPatches(parsedPatches);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load patch notes');
        console.error('Error fetching patch notes:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPatchNotes();
  }, []);

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

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <p className="text-lg text-neon-cyan font-mono">Loading patch notes...</p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="mb-8">
            <NeonCard variant="magenta">
              <p className="text-sm text-white/70 font-mono">{error}</p>
            </NeonCard>
          </div>
        )}

        {/* Patch Notes List */}
        {!loading && patches.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold font-mono text-neon-cyan mb-6 uppercase">Recent Updates</h2>
            <div className="grid grid-cols-1 gap-4">
              {patches.map((patch) => (
                <NeonCard key={patch.id} variant="cyan">
                  <button
                    onClick={() => toggleExpanded(patch.id)}
                    className="w-full text-left"
                  >
                    <div className="flex justify-between items-start mb-3">
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
                      <div className="space-y-3 border-t border-white/10 pt-3">
                        <div>
                          <p className="text-xs text-white/50 font-mono uppercase mb-2">Version</p>
                          <p className="text-sm font-mono text-neon-gold">{patch.version}</p>
                        </div>
                        <div>
                          <p className="text-xs text-white/50 font-mono uppercase mb-2">Details</p>
                          <p className="text-sm font-mono text-white/70 whitespace-pre-wrap">{patch.content}</p>
                        </div>
                      </div>
                    )}
                  </button>
                </NeonCard>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && patches.length === 0 && !error && (
          <div className="text-center py-12">
            <p className="text-lg text-white/60 font-mono">No patch notes available at this time.</p>
          </div>
        )}
      </div>
    </div>
  );
}
