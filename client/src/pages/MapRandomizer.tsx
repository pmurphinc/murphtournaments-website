import GlitchText from "@/components/GlitchText";
import NeonCard from "@/components/NeonCard";
import {
  DEFAULT_COMPETITIVE_MAP_IDS,
  THE_FINALS_MAPS,
  drawUniqueMaps,
  type FinalsMap,
  type FinalsMapCategory,
  type FinalsMapId,
} from "@/lib/finalsMaps";
import {
  Check,
  Clipboard,
  Minus,
  Plus,
  RotateCcw,
  Shuffle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const storageKey = "murph-finals-map-randomizer";
const storageVersion = 2;
const defaultCount = 1;

const categoryLabels: Record<FinalsMapCategory, string> = {
  main: "Main Arenas",
  compact: "Compact / Mode-Specific",
  training: "Training / Practice",
};

const categoryDescriptions: Record<FinalsMapCategory, string> = {
  main: "Main arenas. Seoul and Kyoto are available here, but excluded from the Default Competitive preset.",
  compact: "Visible for mode-specific blocks; not selected by default.",
  training: "Non-tournament practice option; not selected by default.",
};

interface StoredRandomizerState {
  selectedIds: FinalsMapId[];
  count: number;
  version?: number;
}

function isFinalsMapId(value: string): value is FinalsMapId {
  return THE_FINALS_MAPS.some(map => map.id === value);
}

function readStoredState(): StoredRandomizerState | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<StoredRandomizerState>;
    if (parsed.version !== storageVersion) return null;

    const selectedIds = Array.isArray(parsed.selectedIds)
      ? parsed.selectedIds.filter(
          (id): id is FinalsMapId => typeof id === "string" && isFinalsMapId(id)
        )
      : null;
    const count =
      typeof parsed.count === "number" && Number.isFinite(parsed.count)
        ? parsed.count
        : defaultCount;

    if (!selectedIds) return null;

    return {
      selectedIds,
      count: Math.max(0, Math.min(Math.floor(count), selectedIds.length)),
      version: storageVersion,
    };
  } catch {
    return null;
  }
}

function getInitialState(): StoredRandomizerState {
  return (
    readStoredState() ?? {
      selectedIds: DEFAULT_COMPETITIVE_MAP_IDS,
      count: defaultCount,
      version: storageVersion,
    }
  );
}

export default function MapRandomizer() {
  const [selectedIds, setSelectedIds] = useState<FinalsMapId[]>(
    () => getInitialState().selectedIds
  );
  const [count, setCount] = useState(() => {
    const initialState = getInitialState();
    return (
      Math.max(
        0,
        Math.min(initialState.count, initialState.selectedIds.length)
      ) || defaultCount
    );
  });
  const [results, setResults] = useState<FinalsMap[]>([]);
  const [rollLabel, setRollLabel] = useState("Ready to roll");
  const [copyLabel, setCopyLabel] = useState("Copy Results");

  const selectedMaps = useMemo(
    () => THE_FINALS_MAPS.filter(map => selectedIds.includes(map.id)),
    [selectedIds]
  );

  const groupedMaps = useMemo(
    () => ({
      main: THE_FINALS_MAPS.filter(map => map.category === "main"),
      compact: THE_FINALS_MAPS.filter(map => map.category === "compact"),
      training: THE_FINALS_MAPS.filter(map => map.category === "training"),
    }),
    []
  );

  useEffect(() => {
    document.title = "THE FINALS Map Randomizer | Murph Tournaments";
  }, []);

  useEffect(() => {
    setCount(current =>
      Math.min(
        Math.max(current, selectedMaps.length > 0 ? 1 : 0),
        selectedMaps.length
      )
    );
  }, [selectedMaps.length]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify({ selectedIds, count, version: storageVersion })
      );
    } catch {
      // Persistence is convenience-only; ignore unavailable storage.
    }
  }, [selectedIds, count]);

  function applySelection(ids: FinalsMapId[]) {
    setSelectedIds(ids);
    setResults([]);
    setRollLabel("Pool updated");
  }

  function toggleMap(id: FinalsMapId) {
    applySelection(
      selectedIds.includes(id)
        ? selectedIds.filter(selectedId => selectedId !== id)
        : [...selectedIds, id]
    );
  }

  function rollMaps() {
    const drawnMaps = drawUniqueMaps(selectedMaps, count);
    setResults(drawnMaps);
    setRollLabel(
      drawnMaps.length > 0 ? "Rolled just now" : "Select at least one map"
    );
    setCopyLabel("Copy Results");
  }

  async function copyResults() {
    if (
      results.length === 0 ||
      typeof navigator === "undefined" ||
      !navigator.clipboard
    ) {
      setCopyLabel("Nothing to copy");
      return;
    }

    try {
      await navigator.clipboard.writeText(
        results.map((map, index) => `${index + 1}. ${map.name}`).join("\n")
      );
      setCopyLabel("Copied");
    } catch {
      setCopyLabel("Copy failed");
    }
  }

  const canRoll = selectedMaps.length > 0 && count > 0;

  return (
    <div className="min-h-screen bg-dark-charcoal">
      <section className="relative overflow-hidden border-b border-neon-gold/20 py-12 md:py-16">
        <div className="absolute inset-0 scan-lines opacity-10 pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,215,0,0.16),transparent_38%),radial-gradient(circle_at_bottom_left,rgba(0,217,255,0.12),transparent_34%)] pointer-events-none" />
        <div className="container relative z-10">
          <p className="mb-3 font-mono text-xs font-bold uppercase tracking-[0.35em] text-neon-gold">
            Tournament Tool
          </p>
          <GlitchText size="xl" variant="gold" className="mb-5">
            THE FINALS Map Randomizer
          </GlitchText>
          <p className="max-w-3xl font-mono text-sm leading-7 text-white/75 md:text-base">
            Randomly select maps for tournaments, scrims, warmups, or practice
            blocks. Default competitive rolls skip Seoul and Kyoto. Choose your
            pool, pick how many maps you need, and roll instantly.
          </p>
        </div>
      </section>

      <section className="container grid gap-6 py-8 lg:grid-cols-[minmax(0,1fr)_minmax(340px,0.72fr)]">
        <aside className="lg:sticky lg:top-24 lg:col-start-2 lg:row-start-1 lg:self-start">
          <NeonCard variant="gold" className="bg-black/70">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="font-mono text-2xl font-bold uppercase tracking-widest text-neon-gold">
                  Results
                </h2>
                <p className="font-mono text-xs uppercase tracking-widest text-white/45">
                  {rollLabel}
                </p>
              </div>
              <Shuffle className="text-neon-gold" aria-hidden="true" />
            </div>

            <p className="mb-4 font-mono text-xs uppercase tracking-widest text-white/50">
              Current pool: <span className="text-white">{selectedMaps.length}</span>{" "}
              maps • Drawing <span className="text-white">{count}</span>
            </p>

            <button
              type="button"
              onClick={rollMaps}
              disabled={!canRoll}
              className="mb-4 flex w-full items-center justify-center gap-3 rounded-sm border-2 border-neon-magenta bg-neon-magenta px-6 py-4 font-mono text-sm font-bold uppercase tracking-widest text-dark-black transition-all hover-glow-magenta disabled:cursor-not-allowed disabled:border-white/15 disabled:bg-white/10 disabled:text-white/35"
            >
              <RotateCcw size={18} /> Randomize Maps
            </button>

            <button
              type="button"
              onClick={copyResults}
              disabled={results.length === 0}
              className="mb-6 flex w-full items-center justify-center gap-3 rounded-sm border border-neon-cyan px-5 py-3 font-mono text-xs font-bold uppercase tracking-widest text-neon-cyan transition-all hover-glow-cyan disabled:cursor-not-allowed disabled:border-white/15 disabled:text-white/35"
            >
              <Clipboard size={16} /> {copyLabel}
            </button>

            {results.length > 0 ? (
              <ol className="space-y-3">
                {results.map((map, index) => (
                  <li
                    key={map.id}
                    className="rounded-sm border border-neon-gold/45 bg-dark-charcoal/90 p-4"
                  >
                    <div className="font-mono text-xs uppercase tracking-widest text-neon-cyan">
                      Map {index + 1}
                    </div>
                    <div className="mt-1 text-2xl font-bold font-mono text-white">
                      {map.name}
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="rounded-sm border border-dashed border-white/20 bg-dark-charcoal/60 p-6 text-center font-mono text-sm text-white/55">
                {canRoll
                  ? "Tap Randomize Maps to draw from the current pool."
                  : "Select at least one map to enable randomization."}
              </div>
            )}
          </NeonCard>
        </aside>

        <div className="space-y-6 lg:col-start-1 lg:row-start-1">
          <NeonCard variant="cyan" className="bg-black/55">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-2xl font-mono font-bold uppercase tracking-widest text-neon-cyan">
                  Roll Setup
                </h2>
                <p className="mt-2 font-mono text-sm text-white/60">
                  Selected pool: {" "}
                  <strong className="text-white">{selectedMaps.length}</strong>{" "}
                  / {THE_FINALS_MAPS.length} maps
                </p>
              </div>
              <div
                className="flex items-center gap-3 rounded-sm border border-neon-cyan/40 bg-dark-charcoal/80 p-2"
                aria-label="Choose number of maps to draw"
              >
                <button
                  className="px-3 py-2 text-neon-cyan disabled:text-white/25"
                  onClick={() => setCount(value => Math.max(1, value - 1))}
                  disabled={count <= 1}
                  aria-label="Draw fewer maps"
                >
                  <Minus size={18} />
                </button>
                <div className="min-w-20 text-center font-mono">
                  <div className="text-3xl font-bold text-white">{count}</div>
                  <div className="text-[10px] uppercase tracking-widest text-white/45">
                    Maps
                  </div>
                </div>
                <button
                  className="px-3 py-2 text-neon-cyan disabled:text-white/25"
                  onClick={() =>
                    setCount(value => Math.min(selectedMaps.length, value + 1))
                  }
                  disabled={count >= selectedMaps.length}
                  aria-label="Draw more maps"
                >
                  <Plus size={18} />
                </button>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <PresetButton
                label="Default Competitive"
                onClick={() => applySelection(DEFAULT_COMPETITIVE_MAP_IDS)}
              />
              <PresetButton
                label="All Maps"
                onClick={() =>
                  applySelection(THE_FINALS_MAPS.map(map => map.id))
                }
              />
              <PresetButton
                label="Main Arenas Only"
                onClick={() =>
                  applySelection(groupedMaps.main.map(map => map.id))
                }
              />
              <PresetButton
                label="Compact/Mode-Specific"
                onClick={() =>
                  applySelection(groupedMaps.compact.map(map => map.id))
                }
              />
              <PresetButton label="Clear" onClick={() => applySelection([])} />
            </div>
          </NeonCard>

          {Object.entries(groupedMaps).map(([category, maps]) => (
            <NeonCard
              key={category}
              variant={
                category === "main"
                  ? "gold"
                  : category === "compact"
                    ? "magenta"
                    : "lime"
              }
              className="bg-black/45"
            >
              <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="font-mono text-xl font-bold uppercase tracking-widest text-white">
                    {categoryLabels[category as FinalsMapCategory]}
                  </h2>
                  <p className="font-mono text-xs text-white/55">
                    {categoryDescriptions[category as FinalsMapCategory]}
                  </p>
                </div>
                <span className="font-mono text-xs uppercase tracking-widest text-neon-cyan">
                  {maps.filter(map => selectedIds.includes(map.id)).length}/
                  {maps.length} selected
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {maps.map(map => {
                  const selected = selectedIds.includes(map.id);
                  return (
                    <button
                      key={map.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => toggleMap(map.id)}
                      className={`flex items-center justify-between gap-3 rounded-sm border px-4 py-3 text-left font-mono transition-all ${selected ? "border-neon-gold bg-[rgba(255,215,0,0.15)] text-white shadow-[0_0_18px_rgba(255,215,0,0.18)]" : "border-white/15 bg-dark-charcoal/70 text-white/65 hover:border-neon-cyan hover:text-white"}`}
                    >
                      <span>{map.name}</span>
                      <span
                        className={`flex h-6 w-6 items-center justify-center rounded-sm border ${selected ? "border-neon-gold bg-[#ffd700] text-black" : "border-white/25 text-white/30"}`}
                        aria-hidden="true"
                      >
                        {selected ? <Check size={15} strokeWidth={3} /> : null}
                      </span>
                    </button>
                  );
                })}
              </div>
            </NeonCard>
          ))}
        </div>
      </section>
    </div>
  );
}

function PresetButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-sm border border-white/15 bg-dark-charcoal/80 px-3 py-2 font-mono text-xs font-bold uppercase tracking-widest text-white/70 transition-all hover:border-neon-gold hover:text-neon-gold"
    >
      {label}
    </button>
  );
}
