import SectionHeading from "@/components/public/SectionHeading";
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
  main: "Main arenas. Seoul, Kyoto, and Galaxy Estates are available here, but excluded from the Default Competitive preset.",
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

  const isExactPreset = (ids: readonly FinalsMapId[]) => selectedIds.length === ids.length && ids.every(id => selectedIds.includes(id));
  const allMapIds = THE_FINALS_MAPS.map(map => map.id);
  const mainMapIds = groupedMaps.main.map(map => map.id);
  const compactMapIds = groupedMaps.compact.map(map => map.id);
  const canRoll = selectedMaps.length > 0 && count > 0;

  return (
    <div>
      <div className="border-b border-[var(--mt-steel-line)] py-12 sm:py-16">
        <div className="container">
          <SectionHeading
            level="h1"
            eyebrow="Tournament Tool"
            title="THE FINALS Map Randomizer"
            description="Randomly select maps for tournaments, scrims, warmups, or practice blocks. Default competitive rolls skip Seoul, Kyoto, and Galaxy Estates. Choose your pool, pick how many maps you need, and roll instantly."
          />
        </div>
      </div>

      <section className="container grid gap-6 py-10 sm:py-12 lg:grid-cols-[minmax(0,1fr)_minmax(340px,0.72fr)]">
        <aside className="lg:sticky lg:top-24 lg:col-start-2 lg:row-start-1 lg:self-start">
          <div className="mt-panel p-6">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold uppercase tracking-wide text-[var(--mt-off-white)]">
                  Results
                </h2>
                <p className="font-mono text-xs uppercase tracking-widest text-[var(--mt-muted)]">
                  {rollLabel}
                </p>
              </div>
              <Shuffle
                className="text-[var(--mt-gold-bright)]"
                aria-hidden="true"
              />
            </div>

            <p className="mb-4 font-mono text-xs uppercase tracking-widest text-[var(--mt-muted)]">
              Current pool:{" "}
              <span className="text-[var(--mt-off-white)]">
                {selectedMaps.length}
              </span>{" "}
              maps • Drawing{" "}
              <span className="text-[var(--mt-off-white)]">{count}</span>
            </p>

            <button
              type="button"
              onClick={rollMaps}
              disabled={!canRoll}
              className="mb-4 flex w-full items-center justify-center gap-3 rounded-md bg-[var(--mt-gold)] px-6 py-4 font-mono text-sm font-bold uppercase tracking-widest text-[var(--mt-gold-foreground)] transition-colors hover:bg-[var(--mt-gold-bright)] disabled:cursor-not-allowed disabled:bg-[var(--mt-steel)] disabled:text-[var(--mt-muted)]"
            >
              <RotateCcw size={18} /> Randomize Maps
            </button>

            <button
              type="button"
              onClick={copyResults}
              disabled={results.length === 0}
              className="mb-6 flex w-full items-center justify-center gap-3 rounded-md border border-[var(--mt-steel-line)] px-5 py-3 font-mono text-xs font-bold uppercase tracking-widest text-[var(--mt-off-white)] transition-colors hover:border-[var(--mt-gold)] hover:text-[var(--mt-gold-bright)] disabled:cursor-not-allowed disabled:border-[var(--mt-steel-line)] disabled:text-[var(--mt-muted)]"
            >
              <Clipboard size={16} /> {copyLabel}
            </button>

            {results.length > 0 ? (
              <ol className="space-y-3">
                {results.map((map, index) => (
                  <li
                    key={map.id}
                    className="mt-panel-raised p-4"
                  >
                    <div className="font-mono text-xs uppercase tracking-widest text-[var(--mt-gold-bright)]">
                      Map {index + 1}
                    </div>
                    <div className="mt-1 text-2xl font-bold text-[var(--mt-off-white)]">
                      {map.name}
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="mt-panel border-dashed p-6 text-center text-sm text-[var(--mt-muted)]">
                {canRoll
                  ? "Tap Randomize Maps to draw from the current pool."
                  : "Select at least one map to enable randomization."}
              </div>
            )}
          </div>
        </aside>

        <div className="space-y-6 lg:col-start-1 lg:row-start-1">
          <div className="mt-panel p-6">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-bold uppercase tracking-wide text-[var(--mt-off-white)]">
                  Roll Setup
                </h2>
                <p className="mt-2 text-sm text-[var(--mt-muted)]">
                  Selected pool:{" "}
                  <strong className="text-[var(--mt-off-white)]">
                    {selectedMaps.length}
                  </strong>{" "}
                  / {THE_FINALS_MAPS.length} maps
                </p>
              </div>
              <div
                className="flex items-center gap-3 rounded-md border border-[var(--mt-steel-line)] bg-[var(--mt-charcoal-raised)] p-2"
                aria-label="Choose number of maps to draw"
              >
                <button
                  className="px-3 py-2 text-[var(--mt-gold-bright)] disabled:text-[var(--mt-muted)]"
                  onClick={() => setCount(value => Math.max(1, value - 1))}
                  disabled={count <= 1}
                  aria-label="Draw fewer maps"
                >
                  <Minus size={18} />
                </button>
                <div className="min-w-20 text-center">
                  <div className="text-3xl font-bold text-[var(--mt-off-white)]">
                    {count}
                  </div>
                  <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--mt-muted)]">
                    Maps
                  </div>
                </div>
                <button
                  className="px-3 py-2 text-[var(--mt-gold-bright)] disabled:text-[var(--mt-muted)]"
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
                active={isExactPreset(DEFAULT_COMPETITIVE_MAP_IDS)}
                onClick={() => applySelection(DEFAULT_COMPETITIVE_MAP_IDS)}
              />
              <PresetButton
                label="All Maps"
                active={isExactPreset(allMapIds)}
                onClick={() =>
                  applySelection(allMapIds)
                }
              />
              <PresetButton
                label="Main Arenas Only"
                active={isExactPreset(mainMapIds)}
                onClick={() =>
                  applySelection(mainMapIds)
                }
              />
              <PresetButton
                label="Compact/Mode-Specific"
                active={isExactPreset(compactMapIds)}
                onClick={() =>
                  applySelection(compactMapIds)
                }
              />
              <PresetButton label="Clear" active={selectedIds.length === 0} onClick={() => applySelection([])} />
            </div>
          </div>

          {Object.entries(groupedMaps).map(([category, maps]) => (
            <div key={category} className="mt-panel p-6">
              <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-lg font-bold uppercase tracking-wide text-[var(--mt-off-white)]">
                    {categoryLabels[category as FinalsMapCategory]}
                  </h2>
                  <p className="text-xs text-[var(--mt-muted)]">
                    {categoryDescriptions[category as FinalsMapCategory]}
                  </p>
                </div>
                <span className="font-mono text-xs uppercase tracking-widest text-[var(--mt-gold-bright)]">
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
                      className={`flex items-center justify-between gap-3 rounded-md border px-4 py-3 text-left text-sm transition-colors ${selected ? "border-[var(--mt-gold)] bg-[var(--mt-gold)]/15 text-[var(--mt-off-white)]" : "border-[var(--mt-steel-line)] bg-[var(--mt-charcoal-raised)] text-[var(--mt-muted)] hover:border-[var(--mt-gold)]/50 hover:text-[var(--mt-off-white)]"}`}
                    >
                      <span>{map.name}</span>
                      <span
                        className={`flex h-6 w-6 items-center justify-center rounded-sm border ${selected ? "border-[var(--mt-gold)] bg-[var(--mt-gold)] text-[var(--mt-gold-foreground)]" : "border-[var(--mt-steel-line)] text-[var(--mt-muted)]"}`}
                        aria-hidden="true"
                      >
                        {selected ? <Check size={15} strokeWidth={3} /> : null}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function PresetButton({
  label,
  onClick,
  active = false,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-md border px-3 py-2 font-mono text-xs font-bold uppercase tracking-widest transition-colors ${active ? "border-[var(--mt-gold)] bg-[var(--mt-gold)] text-[var(--mt-gold-foreground)]" : "border-[var(--mt-steel-line)] bg-[var(--mt-charcoal-raised)] text-[var(--mt-muted)] hover:border-[var(--mt-gold)] hover:text-[var(--mt-gold-bright)]"}`}
    >
      {label}
    </button>
  );
}
