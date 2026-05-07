import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import GlitchText from "@/components/GlitchText";
import NeonCard from "@/components/NeonCard";
import { trpc } from "@/lib/trpc";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type BuildFilter = "All" | "Light" | "Medium" | "Heavy";
type TypeFilter = "All" | "weapon" | "gadget";
type SortFilter = "recent" | "oldest" | "az";

type LoadoutBalanceArchiveProps = {
  title: string;
  description: string;
  basePath: `/${string}`;
};

const formatUpdatedTime = (iso: string | null) => {
  if (!iso) return "N/A";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleString();
};

function LoadoutSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {Array.from({ length: 10 }).map((_, index) => (
        <div key={index} className="h-48 rounded-lg border border-white/10 bg-black/40 animate-pulse p-3">
          <div className="h-20 rounded bg-white/10 mb-3" />
          <div className="h-3 rounded bg-white/15 mb-2" />
          <div className="h-3 w-2/3 rounded bg-white/10 mb-3" />
          <div className="h-2 rounded bg-white/10" />
        </div>
      ))}
    </div>
  );
}

export default function LoadoutBalanceArchive({ title, description, basePath }: LoadoutBalanceArchiveProps) {
  const [buildFilter, setBuildFilter] = useState<BuildFilter>("All");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("All");
  const [sortFilter, setSortFilter] = useState<SortFilter>("recent");
  const [onlyCurrentPatch, setOnlyCurrentPatch] = useState(false);
  const [location, navigate] = useLocation();

  const { data, isLoading, isError, error } = trpc.loadoutTracker.getItems.useQuery(undefined, {
    refetchInterval: 1000 * 60 * 10,
    staleTime: 1000 * 60 * 5,
  });

  const items = data?.items ?? [];
  const metadata = data?.metadata;

  const selectedId = useMemo(() => {
    if (typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search).get("item");
  }, [location]);

  const selectedItem = useMemo(
    () => items.find(item => item.normalizedName === selectedId),
    [items, selectedId],
  );

  useEffect(() => {
    if (!selectedId || selectedItem || isLoading) return;
    navigate(basePath, { replace: true });
  }, [basePath, isLoading, navigate, selectedId, selectedItem]);

  const filtered = useMemo(() => {
    const scoped = items.filter(item => {
      const buildMatch = buildFilter === "All" || item.build === buildFilter;
      const typeMatch = typeFilter === "All" || item.type === typeFilter;
      const patchMatch = !onlyCurrentPatch || !metadata?.currentPatch || item.latestPatch === metadata.currentPatch;
      return buildMatch && typeMatch && patchMatch;
    });

    return [...scoped].sort((a, b) => {
      if (sortFilter === "az") {
        return a.name.localeCompare(b.name);
      }

      if (sortFilter === "oldest") {
        if (a.isNew && !b.isNew) return 1;
        if (!a.isNew && b.isNew) return -1;
        return (a.patchDate || "9999-12-31").localeCompare(b.patchDate || "9999-12-31");
      }

      const rank = (item: (typeof scoped)[number]) => {
        if (item.isNew) return 0;
        if (item.matchQuality === "matched") return 1;
        if (item.patchDate) return 2;
        return 3;
      };

      const rankDiff = rank(a) - rank(b);
      if (rankDiff !== 0) return rankDiff;

      const patchCompare = (b.patchDate || "0000-00-00").localeCompare(a.patchDate || "0000-00-00");
      if (patchCompare !== 0) return patchCompare;

      return a.name.localeCompare(b.name);
    });
  }, [items, buildFilter, typeFilter, onlyCurrentPatch, metadata?.currentPatch, sortFilter]);

  const openItem = (itemNormalizedName: string) => {
    navigate(`${basePath}?item=${encodeURIComponent(itemNormalizedName)}`, { replace: false });
  };

  const closeModal = () => {
    navigate(basePath, { replace: false });
  };

  return (
    <div className="min-h-screen bg-dark-charcoal py-20">
      <div className="container">
        <div className="mb-10">
          <GlitchText size="xl" variant="magenta" className="mb-4">
            {title}
          </GlitchText>
          <p className="text-white/70 font-mono max-w-3xl">{description}</p>
        </div>

        <div className="mb-6 rounded-lg border border-neon-cyan/30 bg-black/40 px-4 py-3 text-xs md:text-sm font-mono text-white/80 flex flex-wrap gap-x-6 gap-y-2">
          {metadata?.currentPatch ? <span>Current Patch: <strong className="text-neon-cyan">{metadata.currentPatch}</strong></span> : null}
          <span>Last Updated: <strong className="text-white">{formatUpdatedTime(metadata?.lastUpdated ?? null)}</strong></span>
          {metadata?.isFromCache ? <span className="text-amber-300">Serving cached data ({metadata.cacheAgeMinutes ?? "?"}m old)</span> : null}
          <span className="text-white/60">Source Status: {metadata?.dataSourceStatus ?? "N/A"}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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

          {metadata?.currentPatch ? (
            <label className="bg-black/60 border border-neon-cyan/40 rounded px-3 py-2 text-white/90 font-mono flex items-center gap-2 text-xs md:text-sm">
              <input
                type="checkbox"
                checked={onlyCurrentPatch}
                onChange={e => setOnlyCurrentPatch(e.target.checked)}
              />
              Only show current patch changes
            </label>
          ) : null}
        </div>

        {isError ? (
          <div className="rounded-lg border border-red-500/40 bg-red-950/30 p-8 text-center font-mono text-red-100">
            Balance archive data could not be loaded. {error.message}
          </div>
        ) : isLoading ? (
          <LoadoutSkeleton />
        ) : filtered.length === 0 ? (
          <div className="rounded-lg border border-white/10 bg-black/40 p-8 text-center font-mono text-white/70">
            {items.length === 0 ? "No balance archive entries are available yet." : "No items matched the selected filters."}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filtered.map(item => {
              const cardPriorityClass = item.isNew
                ? "ring-2 ring-neon-magenta/70 shadow-[0_0_16px_rgba(255,0,127,0.35)]"
                : item.matchQuality === "matched"
                  ? "ring-1 ring-neon-cyan/40"
                  : "ring-1 ring-white/10";

              return (
                <button key={`${item.build}-${item.type}-${item.normalizedName}`} onClick={() => openItem(item.normalizedName)} className="text-left">
                  <NeonCard
                    variant={item.isNew ? "magenta" : "cyan"}
                    className={`h-full transition-all duration-200 hover:scale-[1.02] hover:shadow-[0_0_18px_rgba(0,255,255,0.35)] ${cardPriorityClass}`}
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
                      {item.isNew ? (
                        <span className="text-[10px] font-mono px-2 py-1 border border-neon-magenta text-neon-magenta rounded bg-neon-magenta/10">
                          NEW
                        </span>
                      ) : null}
                    </div>
                    <p className="text-xs text-white/70 font-mono uppercase">{item.build} • {item.type}</p>
                    <p className="text-xs text-neon-cyan font-mono mt-2 uppercase">Latest: {item.latestPatch || "N/A"}</p>
                  </NeonCard>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={!!selectedItem} onOpenChange={open => !open && closeModal()}>
        <DialogContent className="bg-black border border-neon-magenta/40 text-white max-w-xl">
          {selectedItem ? (
            <>
              <DialogHeader>
                <DialogTitle className="font-mono text-neon-magenta uppercase">{selectedItem.name}</DialogTitle>
              </DialogHeader>

              {selectedItem.imageUrl ? (
                <img
                  src={selectedItem.imageUrl}
                  alt={selectedItem.name}
                  className="w-full max-h-48 object-contain rounded bg-dark-charcoal/50"
                />
              ) : null}

              <p className="font-mono text-sm text-neon-cyan uppercase">Latest Patch: {selectedItem.latestPatch || "N/A"}</p>
              <p className="font-mono text-sm text-white/85 whitespace-pre-wrap leading-relaxed">
                {selectedItem.patchText || "No patch note found"}
              </p>

              {selectedItem.devNote ? (
                <div className="mt-2 border-t border-white/10 pt-3">
                  <p className="font-mono text-xs text-neon-magenta uppercase mb-1">Dev Note</p>
                  <p className="font-mono text-sm text-white/80 whitespace-pre-wrap leading-relaxed">{selectedItem.devNote}</p>
                </div>
              ) : null}
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
