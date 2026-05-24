import { cp, mkdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const source = path.join(process.cwd(), "server", "data", "weapon-archive");
const target = path.join(process.cwd(), "dist", "server", "data", "weapon-archive");
const publicImagesRoot = path.join(process.cwd(), "client", "public", "images", "weapons");
const appReferenceCsv = path.join(
  process.cwd(),
  "..",
  "murph-tournaments-app",
  "data",
  "reference",
  "THE FINALS - Krome's Weapon Data Sheet (10.6.0) - KWDS - Overview.csv",
);

function normalizeName(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/\+/g, "plus")
    .replace(/\([^)]*\)/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function inferArchiveAssetPath(item) {
  if (item.imageUrl) return item.imageUrl.replace(/^\/images\/weapons\//, "");
  if (!item.class || !item.category) return null;

  const classFolder = item.class.toLowerCase();
  const categoryFolder =
    item.category === "Gadget"
      ? "gadgets"
      : item.category === "Specialization"
        ? "specializations"
        : "weapons";
  const fileSlug = item.slug.replace(new RegExp(`-${classFolder}$`), "");

  return `${classFolder}/${categoryFolder}/${fileSlug}.png`;
}

async function reportMissingArchiveImages() {
  const weapons = JSON.parse(await readFile(path.join(source, "weapons-seed.json"), "utf8"));
  const missing = weapons
    .map(item => ({
      name: item.name,
      slug: item.slug,
      expected: inferArchiveAssetPath(item),
    }))
    .filter(item => !item.expected || !existsSync(path.join(publicImagesRoot, item.expected)));

  if (missing.length === 0) {
    console.log("[weapon-archive] Image validation passed.");
    return;
  }

  console.warn("[weapon-archive] Missing public image assets:");
  for (const item of missing) {
    console.warn(`- ${item.name} (${item.slug}) expected ${item.expected ?? "no inferred path"}`);
  }
}

async function reportBaselineStatsCoverage() {
  const [weapons, baselineStats, baselineBatch] = await Promise.all([
    readFile(path.join(source, "weapons-seed.json"), "utf8").then(JSON.parse),
    readFile(path.join(source, "weapon-baseline-stats-seed.json"), "utf8").then(JSON.parse),
    readFile(path.join(source, "weapon-baseline-batch-seed.json"), "utf8").then(JSON.parse).catch(() => null),
  ]);
  const statsByWeaponId = new Map(baselineStats.map(row => [row.weaponId, row]));
  const statsByName = new Map(baselineStats.map(row => [normalizeName(row.name), row]));
  const weaponItems = weapons.filter(item => item.category === "Weapon");
  const missing = weaponItems.filter(item => {
    return !statsByWeaponId.has(item.id) && !statsByName.has(normalizeName(item.name));
  });

  if (existsSync(appReferenceCsv)) {
    console.log(`[weapon-archive] Baseline source: ${appReferenceCsv}`);
  } else {
    console.warn(`[weapon-archive] Baseline source CSV not found: ${appReferenceCsv}`);
  }

  const label = baselineBatch
    ? `${baselineBatch.sourceLabel} (${baselineBatch.id})`
    : "weapon-baseline-stats-seed.json";
  console.log(`[weapon-archive] Baseline stats coverage: ${weaponItems.length - missing.length}/${weaponItems.length} weapons matched from ${label}.`);

  if (missing.length > 0) {
    console.warn("[weapon-archive] Weapons without baseline stats:");
    for (const item of missing) {
      console.warn(`- ${item.name} (${item.slug})`);
    }
  }
}

await mkdir(path.dirname(target), { recursive: true });
await cp(source, target, { recursive: true });
await reportMissingArchiveImages();
await reportBaselineStatsCoverage();
