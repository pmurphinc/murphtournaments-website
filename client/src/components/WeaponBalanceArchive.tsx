import { useMemo, useState } from "react";
import type React from "react";
import { Link, useLocation } from "wouter";
import {
  ArrowLeft,
  ChevronRight,
  Clock3,
  RotateCcw,
  Search,
  X,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import BaselineStatsCard from "@/components/BaselineStatsCard";

type ClassFilter = "all" | "Light" | "Medium" | "Heavy" | "multi";
type CategoryFilter = "all" | "Weapon" | "Gadget" | "Specialization";
type SortOption = "alphabetical" | "recently-changed" | "most-changed";
type ChangeTypeFilter =
  | "all"
  | "buff"
  | "nerf"
  | "fix"
  | "adjustment"
  | "rework";

type ArchiveMode = { kind: "list" } | { kind: "detail"; slug: string };

const CLASS_COLORS: Record<string, string> = {
  Light: "#00d9ff",
  Medium: "#E8B84B",
  Heavy: "#E84B4B",
  multi: "#a78bfa",
};

const CHANGE_TYPE_CONFIG: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  buff: { label: "BUFF", color: "#4ADE80", bg: "rgba(74, 222, 128, 0.13)" },
  nerf: { label: "NERF", color: "#E84B4B", bg: "rgba(232, 75, 75, 0.13)" },
  fix: { label: "FIX", color: "#818CF8", bg: "rgba(129, 140, 248, 0.13)" },
  adjustment: {
    label: "ADJUST",
    color: "#E8B84B",
    bg: "rgba(232, 184, 75, 0.13)",
  },
  rework: { label: "REWORK", color: "#F97316", bg: "rgba(249, 115, 22, 0.13)" },
};

const CLASS_FILTERS: Array<{ key: ClassFilter; label: string }> = [
  { key: "all", label: "ALL" },
  { key: "Light", label: "LIGHT" },
  { key: "Medium", label: "MEDIUM" },
  { key: "Heavy", label: "HEAVY" },
  { key: "multi", label: "MULTI" },
];

const CATEGORY_FILTERS: Array<{ key: CategoryFilter; label: string }> = [
  { key: "all", label: "ALL" },
  { key: "Weapon", label: "WEAPON" },
  { key: "Gadget", label: "GADGET" },
  { key: "Specialization", label: "SPEC" },
];

const SORT_OPTIONS: Array<{ key: SortOption; label: string }> = [
  { key: "alphabetical", label: "A-Z" },
  { key: "recently-changed", label: "Recent" },
  { key: "most-changed", label: "Most Changed" },
];

const CHANGE_FILTERS: Array<{ key: ChangeTypeFilter; label: string }> = [
  { key: "all", label: "ALL" },
  { key: "buff", label: "BUFF" },
  { key: "nerf", label: "NERF" },
  { key: "fix", label: "FIX" },
  { key: "adjustment", label: "ADJUST" },
  { key: "rework", label: "REWORK" },
];

function getClassColor(value: string | null | undefined) {
  return CLASS_COLORS[value ?? ""] ?? "#9ba1a6";
}

function FilterChip({
  label,
  active,
  color = "#00d9ff",
  onClick,
}: {
  label: string;
  active: boolean;
  color?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="shrink-0 rounded-md border px-3 py-1.5 font-mono text-[11px] font-bold transition hover:scale-[1.02]"
      style={{
        borderColor: active ? color : "#2a2a4a",
        color: active ? color : "#9ba1a6",
        background: active ? `${color}22` : "transparent",
      }}
    >
      {label}
    </button>
  );
}

function ArchiveSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 9 }).map((_, index) => (
        <div
          key={index}
          className="h-32 animate-pulse rounded-lg border border-white/10 bg-[#141830]"
        />
      ))}
    </div>
  );
}

function EmptyState({
  children,
  action,
}: {
  children: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-[#141830] px-6 py-14 text-center">
      <p className="font-mono text-sm text-white/65">{children}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

function WeaponThumb({
  imageUrl,
  name,
  color,
}: {
  imageUrl: string | null | undefined;
  name: string;
  color: string;
}) {
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={name}
        loading="lazy"
        className="h-16 w-14 shrink-0 rounded-md object-contain sm:h-[72px] sm:w-16"
      />
    );
  }

  return (
    <div
      className="flex h-16 w-14 shrink-0 items-center justify-center rounded-md border font-mono text-lg font-black sm:h-[72px] sm:w-16"
      style={{ borderColor: `${color}55`, color, background: `${color}12` }}
      aria-hidden="true"
    >
      {name.slice(0, 2).toUpperCase()}
    </div>
  );
}

function ArchiveList() {
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState<ClassFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [sort, setSort] = useState<SortOption>("alphabetical");

  const queryInput = useMemo(
    () => ({
      class: classFilter === "all" ? undefined : classFilter,
      category: categoryFilter === "all" ? undefined : categoryFilter,
      search: search.trim() || undefined,
      sort,
    }),
    [categoryFilter, classFilter, search, sort]
  );

  const {
    data: weapons,
    isLoading,
    isError,
    error,
    refetch,
  } = trpc.weaponArchive.list.useQuery(queryInput, {
    staleTime: 1000 * 60 * 10,
  });

  const resetFilters = () => {
    setSearch("");
    setClassFilter("all");
    setCategoryFilter("all");
  };

  return (
    <>
      <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <h1 className="font-mono text-4xl font-black leading-none text-[#00d9ff] md:text-5xl">
            BALANCE
            <br />
            ARCHIVE
          </h1>
          <p className="mt-3 max-w-3xl font-mono text-sm leading-6 text-white/60">
            Weapons, gadgets, and specializations with full change history.
          </p>
        </div>
        <div className="w-fit rounded-full border border-[#ff00ff] bg-[#ff00ff]/10 px-4 py-2 font-mono text-xs font-bold text-[#ff00ff]">
          {isLoading ? "..." : `${weapons?.length ?? 0} ITEMS`}
        </div>
      </div>

      <div className="mb-4 flex items-center gap-3 rounded-lg border border-[#2a2a4a] bg-[#141830] px-4 py-3">
        <Search className="h-4 w-4 shrink-0 text-white/45" aria-hidden="true" />
        <input
          value={search}
          onChange={event => setSearch(event.target.value)}
          placeholder="Search archive items..."
          className="min-w-0 flex-1 bg-transparent font-mono text-sm text-white outline-none placeholder:text-white/40"
          aria-label="Search archive items"
        />
        {search ? (
          <button
            type="button"
            onClick={() => setSearch("")}
            className="text-white/45 transition hover:text-white"
          >
            <X className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">Clear search</span>
          </button>
        ) : null}
      </div>

      <div className="mb-4 space-y-2">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {CLASS_FILTERS.map(filter => (
            <FilterChip
              key={filter.key}
              label={filter.label}
              active={classFilter === filter.key}
              color={
                filter.key === "all" ? "#00d9ff" : getClassColor(filter.key)
              }
              onClick={() => setClassFilter(filter.key)}
            />
          ))}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {CATEGORY_FILTERS.map(filter => (
            <FilterChip
              key={filter.key}
              label={filter.label}
              active={categoryFilter === filter.key}
              onClick={() => setCategoryFilter(filter.key)}
            />
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[11px] font-bold text-white/45">
            SORT:
          </span>
          {SORT_OPTIONS.map(option => (
            <FilterChip
              key={option.key}
              label={option.label}
              active={sort === option.key}
              onClick={() => setSort(option.key)}
            />
          ))}
        </div>
      </div>

      <div className="mb-5 h-px bg-[#00d9ff]/15" />

      {isLoading ? (
        <ArchiveSkeleton />
      ) : isError ? (
        <EmptyState
          action={
            <button
              type="button"
              onClick={() => refetch()}
              className="inline-flex items-center gap-2 rounded-md border border-red-400 px-4 py-2 font-mono text-xs font-bold text-red-300"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              Retry
            </button>
          }
        >
          {`Failed to load archive${error?.message ? `: ${error.message}` : "."}`}
        </EmptyState>
      ) : !weapons || weapons.length === 0 ? (
        <EmptyState
          action={
            search || classFilter !== "all" || categoryFilter !== "all" ? (
              <button
                type="button"
                onClick={resetFilters}
                className="font-mono text-sm text-[#00d9ff] underline"
              >
                Clear filters
              </button>
            ) : null
          }
        >
          No items found.
        </EmptyState>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {weapons.map(item => {
            const classColor = getClassColor(item.class);
            return (
              <Link
                key={item.slug}
                href={`/balance-archive/${item.slug}`}
                className="group block rounded-lg border bg-[#141830] transition duration-200 hover:-translate-y-0.5 hover:bg-[#171d3a]"
                style={{
                  borderColor: `${classColor}44`,
                  borderLeftColor: classColor,
                  borderLeftWidth: 4,
                }}
                aria-label={`View ${item.name} change history`}
              >
                <div className="flex items-center gap-3 p-3">
                  <WeaponThumb
                    imageUrl={item.imageUrl}
                    name={item.name}
                    color={classColor}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h2 className="truncate font-mono text-base font-bold text-white">
                        {item.name}
                      </h2>
                      {item.class ? (
                        <span
                          className="shrink-0 rounded border px-1.5 py-0.5 font-mono text-[9px] font-black"
                          style={{
                            borderColor: classColor,
                            color: classColor,
                            background: `${classColor}22`,
                          }}
                        >
                          {item.class.toUpperCase()}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 font-mono text-xs text-white/50">
                      {item.category ?? "Unknown"}
                    </p>
                  </div>
                </div>
                <div
                  className="flex items-center gap-3 border-t px-3 py-2"
                  style={{ borderColor: `${classColor}22` }}
                >
                  <span className="inline-flex min-w-0 items-center gap-1.5 font-mono text-[11px] text-white/55">
                    <Clock3 className="h-3 w-3 shrink-0" aria-hidden="true" />
                    {item.changeCount}{" "}
                    {item.changeCount === 1 ? "change" : "changes"}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-[#4ADE80]">
                    {item.latestPatch
                      ? `v${item.latestPatch}`
                      : "No changes logged"}
                  </span>
                  <ChevronRight
                    className="h-4 w-4 text-white/45 transition group-hover:text-[#00d9ff]"
                    aria-hidden="true"
                  />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}

function DetailStat({
  label,
  value,
  color = "#00d9ff",
}: {
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <div className="flex-1 text-center">
      <div className="font-mono text-[10px] font-bold tracking-wide text-white/45">
        {label}
      </div>
      <div
        className="mt-1 truncate font-mono text-lg font-black"
        style={{ color }}
      >
        {value}
      </div>
    </div>
  );
}

function ArchiveDetail({ slug }: { slug: string }) {
  const [, navigate] = useLocation();
  const [changeFilter, setChangeFilter] = useState<ChangeTypeFilter>("all");
  const {
    data: detail,
    isLoading,
    isError,
  } = trpc.weaponArchive.getBySlug.useQuery(
    { slug },
    { enabled: Boolean(slug) }
  );

  const history = detail?.history ?? [];
  const filteredHistory = history
    .map(entry => ({
      ...entry,
      changes:
        changeFilter === "all"
          ? entry.changes
          : entry.changes.filter(change => change.changeType === changeFilter),
    }))
    .filter(entry => entry.changes.length > 0);
  const totalChanges = history.reduce(
    (sum, entry) => sum + entry.changes.length,
    0
  );
  const latestPatch = history[0]?.patch.versionLabel ?? null;
  const classColor = getClassColor(detail?.weapon.class);

  if (isLoading) {
    return <ArchiveSkeleton />;
  }

  if (isError || !detail) {
    return (
      <EmptyState
        action={
          <button
            type="button"
            onClick={() => navigate("/balance-archive")}
            className="inline-flex items-center gap-2 rounded-md border border-[#00d9ff] px-4 py-2 font-mono text-xs font-bold text-[#00d9ff]"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Balance Archive
          </button>
        }
      >
        {isError ? "Failed to load item." : "Item not found."}
      </EmptyState>
    );
  }

  const { weapon } = detail;
  const isWeapon = weapon.category === "Weapon";

  return (
    <>
      <Link
        href="/balance-archive"
        className="mb-4 inline-flex items-center gap-2 font-mono text-sm text-[#00d9ff] underline"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Balance Archive
      </Link>

      <div
        className="mb-5 overflow-hidden rounded-xl border bg-[#141830]"
        style={{
          borderColor: `${classColor}44`,
          borderLeftColor: classColor,
          borderLeftWidth: 4,
        }}
      >
        <div className="flex flex-col gap-4 p-4 sm:flex-row">
          <WeaponThumb
            imageUrl={weapon.imageUrl}
            name={weapon.name}
            color={classColor}
          />
          <div className="min-w-0 flex-1">
            <h1 className="font-mono text-3xl font-black leading-tight text-white">
              {weapon.name}
            </h1>
            <div className="mt-2 flex flex-wrap gap-2">
              {weapon.class ? (
                <span
                  className="rounded border px-2 py-1 font-mono text-[10px] font-black"
                  style={{
                    borderColor: classColor,
                    color: classColor,
                    background: `${classColor}22`,
                  }}
                >
                  {weapon.class.toUpperCase()}
                </span>
              ) : null}
              {weapon.category ? (
                <span className="rounded border border-white/10 bg-[#1a1a3a] px-2 py-1 font-mono text-[10px] font-bold text-white/55">
                  {weapon.category.toUpperCase()}
                </span>
              ) : null}
            </div>
            {weapon.description ? (
              <p className="mt-3 font-mono text-sm leading-6 text-white/55">
                {weapon.description}
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex border-t border-white/10 px-3 py-3">
          <DetailStat label="CHANGES" value={totalChanges} />
          <div className="w-px bg-white/10" />
          <DetailStat label="PATCHES" value={history.length} />
          <div className="w-px bg-white/10" />
          <DetailStat
            label="LATEST"
            value={latestPatch ? `v${latestPatch}` : "-"}
            color={latestPatch ? "#4ADE80" : "#9ba1a6"}
          />
          {weapon.fireRate ? (
            <>
              <div className="w-px bg-white/10" />
              <DetailStat
                label="FIRE RATE"
                value={weapon.fireRate}
                color="#ffffff"
              />
            </>
          ) : null}
        </div>
      </div>

      {isWeapon && detail.baselineStats.length > 0
        ? detail.baselineStats.map(stat => (
            <BaselineStatsCard
              key={`${stat.weaponId ?? stat.name ?? weapon.slug}`}
              weaponName={stat.name ?? weapon.name}
              stat={stat}
              source={detail.baselineSource}
            />
          ))
        : null}

      {isWeapon && detail.baselineStats.length === 0 ? (
        <div className="mb-5 rounded-lg border border-white/10 bg-[#141830] px-4 py-3 font-mono text-sm text-white/55">
          Baseline stats unavailable.
        </div>
      ) : null}

      <div className="mb-5">
        <div className="mb-2 font-mono text-[11px] font-bold tracking-wide text-white/45">
          FILTER BY TYPE:
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {CHANGE_FILTERS.map(filter => {
            const cfg = CHANGE_TYPE_CONFIG[filter.key] ?? { color: "#00d9ff" };
            return (
              <FilterChip
                key={filter.key}
                label={filter.label}
                active={changeFilter === filter.key}
                color={cfg.color}
                onClick={() => setChangeFilter(filter.key)}
              />
            );
          })}
        </div>
      </div>

      <h2 className="mb-3 font-mono text-xs font-bold tracking-wide text-white/45">
        PATCH HISTORY
      </h2>
      {filteredHistory.length === 0 ? (
        <EmptyState>
          {history.length === 0
            ? "No patch changes recorded yet."
            : "No changes match this filter."}
        </EmptyState>
      ) : (
        <div className="space-y-3">
          {filteredHistory.map((entry, entryIndex) => (
            <section key={entry.patch.id} className="space-y-1">
              <div
                className="flex items-center justify-between gap-4 rounded-lg border bg-[#141830] p-3"
                style={{
                  borderColor: entryIndex === 0 ? "#00d9ff" : "#2a2a4a",
                }}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/patchnotes?version=${encodeURIComponent(entry.patch.versionLabel)}#patch-${entry.patch.versionLabel.replace(/[^a-zA-Z0-9_-]/g, "-")}`}
                      className="font-mono text-sm font-black text-[#00d9ff] underline decoration-[#00d9ff]/40 underline-offset-4 transition hover:text-white"
                    >
                      v{entry.patch.versionLabel}
                    </Link>
                    {entryIndex === 0 ? (
                      <span className="rounded border border-[#00d9ff] bg-[#00d9ff]/10 px-1.5 py-0.5 font-mono text-[8px] font-black text-[#00d9ff]">
                        LATEST
                      </span>
                    ) : null}
                    {entry.patch.seasonLabel ? (
                      <span className="font-mono text-xs text-white/50">
                        {entry.patch.seasonLabel}
                      </span>
                    ) : null}
                  </div>
                  {entry.patch.patchDate ? (
                    <div className="mt-1 font-mono text-[11px] text-white/45">
                      {entry.patch.patchDate}
                    </div>
                  ) : null}
                </div>
                <div className="shrink-0 font-mono text-xs text-white/50">
                  {entry.changes.length}{" "}
                  {entry.changes.length === 1 ? "change" : "changes"}
                </div>
              </div>

              <div className="space-y-1 pl-3">
                {entry.changes.map(change => {
                  const cfg =
                    CHANGE_TYPE_CONFIG[change.changeType ?? "adjustment"] ??
                    CHANGE_TYPE_CONFIG.adjustment;
                  return (
                    <article
                      key={change.id}
                      className="rounded-lg border bg-[#1a1a3a] p-3"
                      style={{
                        borderColor: "#2a2a4a",
                        borderLeftColor: cfg.color,
                        borderLeftWidth: 4,
                      }}
                    >
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span
                          className="rounded border px-2 py-0.5 font-mono text-[9px] font-black"
                          style={{
                            color: cfg.color,
                            borderColor: cfg.color,
                            background: cfg.bg,
                          }}
                        >
                          {cfg.label}
                        </span>
                        {change.statField ? (
                          <span className="font-mono text-[11px] text-white/45">
                            {change.statField}
                          </span>
                        ) : null}
                      </div>
                      <p className="font-mono text-sm leading-6 text-white">
                        {change.changeSummary ?? change.changeText}
                      </p>
                      {change.oldValue || change.newValue ? (
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          {change.oldValue ? (
                            <span className="rounded border border-red-400/30 bg-red-400/10 px-2 py-1 font-mono text-xs text-red-300">
                              {change.oldValue}
                            </span>
                          ) : null}
                          {change.oldValue && change.newValue ? (
                            <span className="font-mono text-xs text-white/45">
                              to
                            </span>
                          ) : null}
                          {change.newValue ? (
                            <span className="rounded border border-green-400/30 bg-green-400/10 px-2 py-1 font-mono text-xs text-green-300">
                              {change.newValue}
                            </span>
                          ) : null}
                        </div>
                      ) : null}
                      {change.devNote?.trim() ? (
                        <div className="mt-3 rounded-md border border-[#00d9ff]/30 bg-[#0a0e27] p-3">
                          <div className="mb-1 font-mono text-[10px] font-black text-[#00d9ff]">
                            DEV NOTE
                          </div>
                          <p className="font-mono text-xs leading-5 text-white/60">
                            {change.devNote}
                          </p>
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  );
}

export default function WeaponBalanceArchive({ mode }: { mode: ArchiveMode }) {
  return (
    <div className="min-h-screen bg-[#0a0e27] py-10">
      <div className="container max-w-[1200px]">
        {mode.kind === "list" ? (
          <ArchiveList />
        ) : (
          <ArchiveDetail slug={mode.slug} />
        )}
      </div>
    </div>
  );
}
