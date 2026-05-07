import { readFile } from "node:fs/promises";
import path from "node:path";
import { resolveWeaponArchiveImageUrl } from "./weaponArchiveImages";

type WeaponClass = "Light" | "Medium" | "Heavy" | "multi";
type WeaponCategory = "Weapon" | "Gadget" | "Specialization";
type ChangeType = "buff" | "nerf" | "fix" | "adjustment" | "rework";

type SeedWeapon = {
  id: string;
  slug: string;
  name: string;
  category: WeaponCategory | string | null;
  class: Exclude<WeaponClass, "multi"> | string | null;
  description: string | null;
  imageUrl: string | null;
  iconUrl?: string | null;
  ammoSize?: number | null;
  damageProfile?: string | null;
  fireRate?: string | null;
  isActive?: number | null;
};

type SeedPatch = {
  id: string;
  versionLabel: string;
  title: string | null;
  patchDate: string | null;
  seasonLabel: string | null;
  sourceUrl: string | null;
  sourceType: string | null;
};

type SeedChange = {
  id: string;
  weaponId: string;
  patchId: string;
  sectionLabel: string | null;
  changeType: ChangeType | string | null;
  changeSummary: string | null;
  changeText: string | null;
  devNote: string | null;
  statField: string | null;
  oldValue: string | null;
  newValue: string | null;
  sortOrder: number | null;
  sourceType: string | null;
  confidence: string | null;
};

type SeedBaselineStat = {
  weaponId: string | null;
  name: string | null;
  class?: string | null;
  bodyDamage: number | null;
  headDamage: number | null;
  rateOfFireRpm: number | null;
  magazineSize: number | null;
  damagePerMagazine: number | null;
  tacticalReloadTimeSeconds: number | null;
  emptyReloadTimeSeconds: number | null;
  ttkVsLightBodySeconds: number | null;
  stkLightBody: number | null;
  ttkVsMediumBodySeconds: number | null;
  stkMediumBody: number | null;
  ttkVsHeavyBodySeconds: number | null;
  stkHeavyBody: number | null;
  damageDropoffMinRange: number | null;
  damageDropoffMaxRange: number | null;
  damageDropoffModifierAtMaxRange: number | null;
  sourceNotes?: string | null;
  rawValues?: string | null;
};

type SeedBaselineBatch = {
  id: string;
  sourceLabel: string;
  snapshotDate: string | null;
  sourceType: string | null;
  notes: string | null;
};

export type WeaponArchiveListItem = SeedWeapon & {
  category: WeaponCategory | string | null;
  class: WeaponClass | string | null;
  changeCount: number;
  latestPatch: string | null;
  latestPatchDate: string | null;
};

export type WeaponArchiveDetail = {
  weapon: WeaponArchiveListItem;
  baselineStats: SeedBaselineStat[];
  baselineSource: {
    sourceLabel: string;
    versionLabel: string;
    snapshotDate: string | null;
  } | null;
  history: Array<{
    patch: SeedPatch;
    changes: SeedChange[];
  }>;
};

const DATA_DIR = path.join(process.cwd(), "server", "data", "weapon-archive");

const SHARED_GADGET_CANONICAL_SLUGS = new Set([
  "flashbang-light",
  "frag-grenade-light",
  "gas-grenade-light",
  "goo-grenade-light",
  "pyro-grenade-light",
  "smoke-grenade-light",
]);

const SHARED_GADGET_SLUG_TO_CANONICAL: Record<string, string> = {
  "flashbang-light": "flashbang-light",
  "flashbang-medium": "flashbang-light",
  "flashbang-heavy": "flashbang-light",
  "frag-grenade-light": "frag-grenade-light",
  "frag-grenade-medium": "frag-grenade-light",
  "frag-grenade-heavy": "frag-grenade-light",
  "gas-grenade-light": "gas-grenade-light",
  "gas-grenade-medium": "gas-grenade-light",
  "gas-grenade-heavy": "gas-grenade-light",
  "goo-grenade-light": "goo-grenade-light",
  "goo-grenade-medium": "goo-grenade-light",
  "goo-grenade-heavy": "goo-grenade-light",
  "pyro-grenade-light": "pyro-grenade-light",
  "pyro-grenade-medium": "pyro-grenade-light",
  "pyro-grenade-heavy": "pyro-grenade-light",
  "smoke-grenade-light": "smoke-grenade-light",
  "smoke-grenade-medium": "smoke-grenade-light",
  "smoke-grenade-heavy": "smoke-grenade-light",
};

const ITEM_SLUG_ALIASES: Record<string, string> = {
  "bfr-titan": "bfm-titan",
};

let archivePromise: Promise<{
  weapons: SeedWeapon[];
  patches: SeedPatch[];
  changes: SeedChange[];
  baselineStats: SeedBaselineStat[];
  baselineBatch: SeedBaselineBatch | null;
}> | null = null;

async function readJsonFile<T>(fileName: string): Promise<T> {
  const raw = await readFile(path.join(DATA_DIR, fileName), "utf8");
  return JSON.parse(raw) as T;
}

async function loadArchiveData() {
  archivePromise ??= Promise.all([
    readJsonFile<SeedWeapon[]>("weapons-seed.json"),
    readJsonFile<SeedPatch[]>("patches-seed.json"),
    readJsonFile<SeedChange[]>("weapon-changes-seed.json"),
    readJsonFile<SeedBaselineStat[]>("weapon-baseline-stats-seed.json"),
    readJsonFile<SeedBaselineBatch>("weapon-baseline-batch-seed.json").catch(() => null),
  ]).then(([weapons, patches, changes, baselineStats, baselineBatch]) => ({
    weapons,
    patches,
    changes,
    baselineStats,
    baselineBatch,
  }));

  return archivePromise;
}

function canonicalizeWeaponSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/\+/g, "plus")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeBaselineName(value: string | null | undefined) {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/\+/g, "plus")
    .replace(/\([^)]*\)/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function canonicalizeSharedGadgetSlug(slug: string) {
  const aliasedSlug = ITEM_SLUG_ALIASES[slug] ?? slug;
  return SHARED_GADGET_SLUG_TO_CANONICAL[aliasedSlug] ?? aliasedSlug;
}

function applySharedGadgetClass<T extends { slug: string; category: string | null; class: string | null }>(weapon: T): T {
  if ((weapon.category ?? "").toLowerCase() !== "gadget") return weapon;
  if (!SHARED_GADGET_CANONICAL_SLUGS.has(canonicalizeSharedGadgetSlug(weapon.slug))) return weapon;
  return { ...weapon, class: "multi" } as T;
}

function compareVersion(a: string | null | undefined, b: string | null | undefined) {
  const parse = (value: string | null | undefined) =>
    (value ?? "")
      .split(".")
      .map(part => Number.parseInt(part, 10))
      .map(num => (Number.isFinite(num) ? num : -1));

  const pa = parse(a);
  const pb = parse(b);
  const len = Math.max(pa.length, pb.length, 3);
  for (let index = 0; index < len; index += 1) {
    const av = pa[index] ?? 0;
    const bv = pb[index] ?? 0;
    if (av !== bv) return av - bv;
  }
  return 0;
}

function buildChangeKey(change: SeedChange) {
  return [
    change.weaponId,
    change.patchId,
    (change.changeSummary ?? change.changeText ?? "").trim().toLowerCase(),
    (change.devNote ?? "").trim().toLowerCase(),
  ].join("|");
}

function dedupeChanges(changes: SeedChange[]) {
  const seen = new Set<string>();
  return changes.filter(change => {
    const key = buildChangeKey(change);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function matchesClassFilter(
  weapon: { class: string | null; category: string | null },
  classFilter: WeaponClass,
  categoryFilter?: string,
) {
  if (classFilter === "multi") return weapon.class === "multi";
  if ((categoryFilter ?? "").toLowerCase() === "gadget") {
    return weapon.class === classFilter || weapon.class === "multi";
  }
  return weapon.class === classFilter;
}

async function buildListItems() {
  const { weapons, patches, changes } = await loadArchiveData();
  const patchById = new Map(patches.map(patch => [patch.id, patch]));
  const dedupedChanges = dedupeChanges(changes);
  const changesByWeapon = new Map<string, SeedChange[]>();

  for (const change of dedupedChanges) {
    changesByWeapon.set(change.weaponId, [...(changesByWeapon.get(change.weaponId) ?? []), change]);
  }

  const bySlug = new Map<string, WeaponArchiveListItem>();

  for (const weapon of weapons.filter(item => item.isActive !== 0)) {
    const canonicalSlug = canonicalizeSharedGadgetSlug(weapon.slug);
    const canonicalWeapon = applySharedGadgetClass({ ...weapon, slug: canonicalSlug });
    const weaponChanges = changesByWeapon.get(weapon.id) ?? [];
    const patchIds = Array.from(new Set(weaponChanges.map(change => change.patchId)));
    const latestPatch = patchIds
      .map(patchId => patchById.get(patchId) ?? null)
      .filter((patch): patch is SeedPatch => Boolean(patch))
      .sort((a, b) => {
        const version = compareVersion(b.versionLabel, a.versionLabel);
        if (version !== 0) return version;
        return (b.patchDate ?? "").localeCompare(a.patchDate ?? "");
      })[0] ?? null;

    const item: WeaponArchiveListItem = {
      ...canonicalWeapon,
      imageUrl: resolveWeaponArchiveImageUrl(canonicalSlug, canonicalWeapon.imageUrl),
      changeCount: weaponChanges.length,
      latestPatch: latestPatch?.versionLabel ?? null,
      latestPatchDate: latestPatch?.patchDate ?? null,
    };

    const existing = bySlug.get(canonicalSlug);
    if (!existing || item.changeCount > existing.changeCount) {
      bySlug.set(canonicalSlug, item);
    }
  }

  return Array.from(bySlug.values());
}

export async function listWeaponArchiveItems(input?: {
  class?: WeaponClass;
  category?: string;
  search?: string;
  sort?: "alphabetical" | "recently-changed" | "most-changed";
}) {
  let items = await buildListItems();

  if (input?.class) {
    items = items.filter(item => matchesClassFilter(item, input.class!, input.category));
  }

  if (input?.category) {
    items = items.filter(item => item.category === input.category);
  }

  if (input?.search) {
    const query = input.search.trim().toLowerCase();
    const canonicalQuery = canonicalizeWeaponSlug(query);
    items = items.filter(item => {
      const canonicalName = canonicalizeWeaponSlug(item.name);
      return (
        item.name.toLowerCase().includes(query) ||
        canonicalName.includes(canonicalQuery) ||
        (item.category ?? "").toLowerCase().includes(query) ||
        (item.class ?? "").toLowerCase().includes(query)
      );
    });
  }

  const sort = input?.sort ?? "alphabetical";
  if (sort === "most-changed") {
    items.sort((a, b) => b.changeCount - a.changeCount || a.name.localeCompare(b.name));
  } else if (sort === "recently-changed") {
    items.sort((a, b) => {
      const dateCompare = (b.latestPatchDate ?? "").localeCompare(a.latestPatchDate ?? "");
      if (dateCompare !== 0) return dateCompare;
      return compareVersion(b.latestPatch, a.latestPatch) || a.name.localeCompare(b.name);
    });
  } else {
    items.sort((a, b) => a.name.localeCompare(b.name));
  }

  return items;
}

export async function getWeaponArchiveDetail(slug: string): Promise<WeaponArchiveDetail | null> {
  const canonicalSlug = canonicalizeSharedGadgetSlug(canonicalizeWeaponSlug(slug));
  const { weapons, patches, changes, baselineStats, baselineBatch } = await loadArchiveData();
  const listItems = await buildListItems();
  const weapon = listItems.find(item => item.slug === canonicalSlug);
  if (!weapon) return null;

  const matchingWeaponIds = weapons
    .filter(item => canonicalizeSharedGadgetSlug(item.slug) === canonicalSlug)
    .map(item => item.id);
  const patchById = new Map(patches.map(patch => [patch.id, patch]));
  const relevantChanges = dedupeChanges(changes.filter(change => matchingWeaponIds.includes(change.weaponId)));
  const changesByPatch = new Map<string, SeedChange[]>();

  for (const change of relevantChanges) {
    changesByPatch.set(change.patchId, [...(changesByPatch.get(change.patchId) ?? []), change]);
  }

  const history = Array.from(changesByPatch.entries())
    .map(([patchId, patchChanges]) => {
      const patch = patchById.get(patchId);
      if (!patch) return null;
      return {
        patch,
        changes: patchChanges.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
    .sort((a, b) => {
      const dateCompare = (b.patch.patchDate ?? "").localeCompare(a.patch.patchDate ?? "");
      if (dateCompare !== 0) return dateCompare;
      return compareVersion(b.patch.versionLabel, a.patch.versionLabel);
    });

  const stats = baselineStats.filter(row => {
    return row.weaponId === weapon.id || normalizeBaselineName(row.name) === normalizeBaselineName(weapon.name);
  });

  return {
    weapon,
    baselineStats: stats,
    baselineSource: baselineBatch
      ? {
          sourceLabel: baselineBatch.sourceLabel,
          versionLabel: baselineBatch.id.match(/(\d+_\d+_\d+)/)?.[1]?.replace(/_/g, ".") ?? "10.3.0",
          snapshotDate: baselineBatch.snapshotDate,
        }
      : null,
    history,
  };
}
