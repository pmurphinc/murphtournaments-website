export const finalsMapCategories = ["main", "compact", "training"] as const;

export type FinalsMapCategory = (typeof finalsMapCategories)[number];

export interface FinalsMap {
  id: string;
  name: string;
  category: FinalsMapCategory;
}

export const THE_FINALS_MAPS = [
  { id: "monaco", name: "Monaco", category: "main" },
  { id: "seoul", name: "Seoul", category: "main" },
  { id: "skyway-stadium", name: "Skyway Stadium", category: "main" },
  { id: "las-vegas", name: "Las Vegas", category: "main" },
  { id: "sys-horizon", name: "SYS$HORIZON", category: "main" },
  { id: "kyoto", name: "Kyoto", category: "main" },
  { id: "fortune-stadium", name: "Fortune Stadium", category: "main" },
  { id: "bernal", name: "Bernal", category: "main" },
  { id: "las-vegas-stadium", name: "Las Vegas Stadium", category: "main" },
  { id: "nozomi-citadel", name: "NOZOMI/CITADEL", category: "main" },
  { id: "fangwai-city", name: "Fangwai City", category: "main" },
  { id: "starlight-hollow", name: "Starlight Hollow", category: "compact" },
  { id: "peace-center", name: "P.E.A.C.E. Center", category: "compact" },
  { id: "practice-range", name: "Practice Range", category: "training" },
] as const satisfies readonly FinalsMap[];

export type FinalsMapId = (typeof THE_FINALS_MAPS)[number]["id"];

export const DEFAULT_COMPETITIVE_EXCLUDED_MAP_IDS = ["seoul", "kyoto"] as const satisfies readonly FinalsMapId[];

const defaultCompetitiveExcludedMapIds = new Set<FinalsMapId>(
  DEFAULT_COMPETITIVE_EXCLUDED_MAP_IDS
);

export const DEFAULT_COMPETITIVE_MAP_IDS = THE_FINALS_MAPS.filter(
  map =>
    map.category === "main" && !defaultCompetitiveExcludedMapIds.has(map.id)
).map(map => map.id) as FinalsMapId[];

export function drawUniqueMaps<T>(pool: readonly T[], count: number): T[] {
  if (pool.length === 0 || count < 1) {
    return [];
  }

  const drawCount = Math.min(Math.floor(count), pool.length);
  const shuffled = [...pool];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [
      shuffled[swapIndex],
      shuffled[index],
    ];
  }

  return shuffled.slice(0, drawCount);
}
