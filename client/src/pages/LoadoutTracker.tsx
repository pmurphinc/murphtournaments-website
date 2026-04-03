import { useMemo, useState } from "react";
import GlitchText from "@/components/GlitchText";
import NeonCard from "@/components/NeonCard";
import { trpc } from "@/lib/trpc";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type BuildFilter = "All" | "Light" | "Medium" | "Heavy";
type TypeFilter = "All" | "weapon" | "gadget";
type SortFilter = "recent" | "oldest" | "az";

export default function LoadoutTracker() {
  const [buildFilter, setBuildFilter] = useState<BuildFilter>("All");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("All");
  const [sortFilter, setSortFilter] = useState<SortFilter>("recent");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data, isLoading } = trpc.loadoutTracker.getItems.useQuery(undefined, {
    refetchInterval: 1000 * 60 * 10,
    staleTime: 1000 * 60 * 5,
  });

  const filtered = useMemo(() => {
    const source = data ?? [];

    const scoped = source.filter(item => {
      const buildMatch = buildFilter === "All" || item.build === buildFilter;
      const typeMatch = typeFilter === "All" || item.type === typeFilter;
      return buildMatch && typeMatch;
    });

    return scoped.sort((a, b) => {
      if (sortFilter === "az") {
        return a.name.localeCompare(b.name);
      }

      if (sortFilter === "oldest") {
        if (a.isNew && !b.isNew) return 1;
        if (!a.isNew && b.isNew) return -1;
        return (a.patchDate || "9999-12-31").localeCompare(b.patchDate || "9999-12-31");
      }

      if (a.isNew && !b.isNew) return -1;
      if (!a.isNew && b.isNew) return 1;
      return (b.patchDate || "0000-00-00").localeCompare(a.patchDate || "0000-00-00");
    });
  }, [buildFilter, data, sortFilter, typeFilter]);

  const selectedItem = filtered.find(
    item => `${item.build}-${item.type}-${item.normalizedName}` === selectedId,
  );

  return (
    <div className="min-h-screen bg-dark-charcoal py-20">
      <div className="container">
        <div className="mb-10">
          <GlitchText size="xl" variant="magenta" className="mb-4">
            Loadout Tracker
          </GlitchText>
          <p className="text-white/70 font-mono max-w-3xl">
            Live weapon and gadget balance tracker sourced from THE FINALS Wiki. New loadout items are automatically surfaced even before they receive their first balance patch.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <select
            value={buildFilter}
            onChange={e => setBuildFilter(e.target.value as BuildFilter)}
            className="bg-black/60 border border-neon-cyan/50 rounded px-3 py-2 text-white font-mono"
          >
            <option>All</option>
            <option>Light</option>
            <option>Medium</option>
            <option>Heavy</option>
          </select>

          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value as TypeFilter)}
            className="bg-black/60 border border-neon-cyan/50 rounded px-3 py-2 text-white font-mono"
          >
            <option value="All">All</option>
            <option value="weapon">Weapon</option>
            <option value="gadget">Gadget</option>
          </select>

          <select
            value={sortFilter}
            onChange={e => setSortFilter(e.target.value as SortFilter)}
            className="bg-black/60 border border-neon-cyan/50 rounded px-3 py-2 text-white font-mono"
          >
            <option value="recent">Recently Changed</option>
            <option value="oldest">Oldest</option>
            <option value="az">A–Z</option>
          </select>
        </div>

        {isLoading ? (
          <p className="text-white/60 font-mono">Loading loadout data...</p>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filtered.map(item => {
              const cardId = `${item.build}-${item.type}-${item.normalizedName}`;
              return (
                <button key={cardId} onClick={() => setSelectedId(cardId)} className="text-left">
                  <NeonCard
                    variant={item.isNew ? "magenta" : "cyan"}
                    className="h-full transition-all duration-200 hover:scale-[1.02] hover:shadow-[0_0_18px_rgba(0,255,255,0.4)]"
                  >
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-full h-24 object-contain rounded mb-3 bg-black/40"
                        loading="lazy"
                      />
                    ) : null}

                    <div className="flex items-center justify-between mb-2 gap-2">
                      <h3 className="text-sm font-bold text-white font-mono line-clamp-2">{item.name}</h3>
                      {item.isNew && (
                        <span className="text-[10px] font-mono px-2 py-1 border border-neon-magenta text-neon-magenta rounded">
                          NEW
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-white/70 font-mono uppercase">{item.build} • {item.type}</p>
                    <p className="text-xs text-neon-cyan font-mono mt-2 uppercase">
                      Latest: {item.latestPatch || "N/A"}
                    </p>
                  </NeonCard>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={!!selectedItem} onOpenChange={open => !open && setSelectedId(null)}>
        <DialogContent className="bg-black border border-neon-magenta/40 text-white max-w-xl">
          {selectedItem && (
            <>
              <DialogHeader>
                <DialogTitle className="font-mono text-neon-magenta uppercase">
                  {selectedItem.name}
                </DialogTitle>
              </DialogHeader>

              {selectedItem.imageUrl ? (
                <img
                  src={selectedItem.imageUrl}
                  alt={selectedItem.name}
                  className="w-full max-h-48 object-contain rounded bg-dark-charcoal/50"
                />
              ) : null}

              <p className="font-mono text-sm text-neon-cyan uppercase">
                Latest Patch: {selectedItem.latestPatch || "N/A"}
              </p>
              <p className="font-mono text-sm text-white/85 whitespace-pre-wrap">
                {selectedItem.patchText || "No balance changes yet"}
              </p>

              {selectedItem.devNote ? (
                <div className="mt-2 border-t border-white/10 pt-3">
                  <p className="font-mono text-xs text-neon-magenta uppercase mb-1">Dev Note</p>
                  <p className="font-mono text-sm text-white/80">{selectedItem.devNote}</p>
                </div>
              ) : null}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
