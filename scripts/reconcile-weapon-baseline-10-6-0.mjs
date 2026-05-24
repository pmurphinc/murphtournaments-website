import { execFileSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const tsvPath = path.join(root, "data", "reference", "kromes-weapon-data-10.6.0-overview.tsv");
const baselinePath = path.join(root, "server", "data", "weapon-archive", "weapon-baseline-stats-seed.json");
const batchPath = path.join(root, "server", "data", "weapon-archive", "weapon-baseline-batch-seed.json");
const reportPath = path.join(root, "data", "reference", "kromes-weapon-data-10.6.0-reconciliation-report.md");
const batchId = "baseline_kromes_spreadsheet_10_6_0";

const fieldColumns = {
  bodyDamage: "Damage (Body)",
  headDamage: "Damage (Head)",
  rateOfFireRpm: "RPM",
  magazineSize: "Magazine",
  damagePerMagazine: "Damage Per Magazine (Body)",
  tacticalReloadTimeSeconds: "Tactical Reload Time",
  emptyReloadTimeSeconds: "Empty Reload Time",
  shotsPerBurst: "Shots Per Burst",
  delayUntilNextBurstSeconds: "Delay Until Next Burst (in seconds)",
  ttkVsLightBodySeconds: "Light TTK @ Body",
  stkLightBody: "Light STK @ Body",
  ttkVsLightHeadSeconds: "Light TTK @ Head",
  stkLightHead: "Light STK @ Head",
  ttkVsMediumBodySeconds: "Medium TTK @ Body",
  stkMediumBody: "Medium STK @ Body",
  ttkVsMediumHeadSeconds: "Medium TTK @ Head",
  stkMediumHead: "Medium STK @ Head",
  ttkVsHeavyBodySeconds: "Heavy TTK @ Body",
  stkHeavyBody: "Heavy STK @ Body",
  ttkVsHeavyHeadSeconds: "Heavy TTK @ Head",
  stkHeavyHead: "Heavy STK @ Head",
  damageDropoffMinRange: "Damage Dropoff Minimum Range",
  damageDropoffMaxRange: "Damage Dropoff Maximum Range",
  damageDropoffModifierAtMaxRange: "Damage Dropoff Modifier @ Max Range",
  sourceNotes: "Notes",
};

const integerFields = new Set([
  "magazineSize",
  "shotsPerBurst",
  "stkLightBody",
  "stkLightHead",
  "stkMediumBody",
  "stkMediumHead",
  "stkHeavyBody",
  "stkHeavyHead",
]);

const rawColumns = [
  ["bodyDamageRaw", "Damage (Body)"],
  ["headDamageRaw", "Damage (Head)"],
  ["magazineRaw", "Magazine"],
  ["damagePerMagazineRaw", "Damage Per Magazine (Body)"],
  ["headDamagePerMagazineRaw", "Damage Per Magazine (Head)"],
  ["tacticalReloadRaw", "Tactical Reload Time"],
  ["emptyReloadRaw", "Empty Reload Time"],
  ["damageDropoffMinRange", "Damage Dropoff Minimum Range"],
  ["damageDropoffMaxRange", "Damage Dropoff Maximum Range"],
  ["damageDropoffModifierAtMaxRange", "Damage Dropoff Modifier @ Max Range"],
];

function parseTsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;
  let atCellStart = true;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"' && (inQuotes || atCellStart)) {
      if (inQuotes && next === '"') {
        cell += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      atCellStart = false;
      continue;
    }

    if (!inQuotes && char === "\t") {
      row.push(cell);
      cell = "";
      atCellStart = true;
      continue;
    }

    if (!inQuotes && (char === "\n" || char === "\r")) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      atCellStart = true;
      continue;
    }

    cell += char;
    atCellStart = false;
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows;
}

function normalizeHeader(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalizeName(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/\+/g, "plus")
    .replace(/[^a-z0-9]+/g, "");
}

function parseNumber(value, { integer = false, percent = false } = {}) {
  const trimmed = String(value ?? "").trim();
  if (!trimmed || trimmed === "-" || trimmed === "(notes)") return null;
  const first = trimmed.split("(")[0].replace(/[~%ms]/gi, "").trim();
  if (!first || first === "-") return null;
  const number = Number.parseFloat(first);
  if (!Number.isFinite(number)) return null;
  return integer && !percent ? Math.trunc(number) : number;
}

function cleanText(value) {
  const trimmed = String(value ?? "").trim();
  return trimmed || null;
}

function stringifyRawValues(record) {
  const raw = {};
  for (const [key, column] of rawColumns) {
    const value = String(record[column] ?? "").trim();
    if (value) raw[key] = value;
  }
  return Object.keys(raw).length > 0 ? JSON.stringify(raw) : null;
}

function sameValue(left, right) {
  if (left === right) return true;
  if (left === null || left === undefined) return right === null || right === undefined;
  if (right === null || right === undefined) return false;
  if (typeof left === "number" && typeof right === "number") return Math.abs(left - right) < 0.000001;
  return false;
}

function mapHeader(row) {
  const header = row.map(normalizeHeader);
  const mapping = {
    classMarker: 0,
    number: header.indexOf("#"),
    name: header.indexOf("Name"),
    type: header.indexOf("Type"),
    firingMode: header.indexOf("Firing Mode"),
    "Damage (Body)": header.indexOf("Damage (Body)"),
    "Damage (Head)": header.indexOf("Damage (Head)"),
    RPM: header.indexOf("RPM"),
    Magazine: header.indexOf("Magazine"),
    "Damage Per Magazine (Body)": header.indexOf("Damage Per Magazine (Body)"),
    "Damage Per Magazine (Head)": header.indexOf("Damage Per Magazine (Head)"),
    "Tactical Reload Time": header.indexOf("Tactical Reload Time"),
    "Empty Reload Time": header.indexOf("Empty Reload Time"),
    "Shots Per Burst": header.indexOf("Shots Per Burst"),
    "Delay Until Next Burst (in seconds)": header.indexOf("Delay Until Next Burst (in seconds)"),
    Notes: header.indexOf("Notes"),
  };

  const ttkStart = header.findIndex(value => value === "TTK @ Body");
  const ttkColumns = [
    "Light TTK @ Body",
    "Light STK @ Body",
    "Light TTK @ Head",
    "Light STK @ Head",
    "Medium TTK @ Body",
    "Medium STK @ Body",
    "Medium TTK @ Head",
    "Medium STK @ Head",
    "Heavy TTK @ Body",
    "Heavy STK @ Body",
    "Heavy TTK @ Head",
    "Heavy STK @ Head",
  ];
  ttkColumns.forEach((column, index) => {
    mapping[column] = ttkStart + index;
  });
  mapping["Damage Dropoff Minimum Range"] = ttkStart + ttkColumns.length;
  mapping["Damage Dropoff Maximum Range"] = ttkStart + ttkColumns.length + 1;
  mapping["Damage Dropoff Modifier @ Max Range"] = ttkStart + ttkColumns.length + 2;

  for (const [name, index] of Object.entries(mapping)) {
    if (index < 0) throw new Error(`Unable to map TSV column: ${name}`);
  }
  return mapping;
}

function parseReferenceRows(rows, mapping) {
  const classMarkers = new Set(["LIGHT", "MEDIUM", "HEAVY"]);
  const records = [];
  let currentClass = null;

  for (const row of rows) {
    const marker = String(row[mapping.classMarker] ?? "").trim().toUpperCase();
    if (classMarkers.has(marker)) currentClass = marker[0] + marker.slice(1).toLowerCase();

    const number = String(row[mapping.number] ?? "").trim();
    const name = String(row[mapping.name] ?? "").trim();
    if (!currentClass || !number || !name || name === "Name") continue;

    const record = { class: currentClass, referenceName: name, normalizedName: normalizeName(name) };
    for (const [column, index] of Object.entries(mapping)) {
      record[column] = row[index] ?? "";
    }
    records.push(record);
  }
  return records;
}

function reconcileRow(baselineRow, referenceRow) {
  const next = { ...baselineRow, batchId };
  for (const [field, column] of Object.entries(fieldColumns)) {
    if (field === "sourceNotes") {
      next[field] = cleanText(referenceRow[column]);
    } else {
      next[field] = parseNumber(referenceRow[column], {
        integer: integerFields.has(field),
        percent: field === "damageDropoffModifierAtMaxRange",
      });
    }
  }
  next.rawValues = stringifyRawValues(referenceRow);
  return next;
}

function getChanges(before, after) {
  const fields = ["batchId", ...Object.keys(fieldColumns), "rawValues"];
  return fields
    .filter(field => !sameValue(before[field], after[field]))
    .map(field => ({ field, before: before[field] ?? null, after: after[field] ?? null }));
}

function formatValue(value) {
  if (value === null || value === undefined) return "null";
  return typeof value === "string" ? JSON.stringify(value) : String(value);
}

const tsv = await readFile(tsvPath, "utf8");
const tsvRows = parseTsv(tsv.replace(/^\uFEFF/, ""));
const headerRow = tsvRows.find(row => row.includes("Name") && row.includes("Firing Mode"));
if (!headerRow) throw new Error("Could not find TSV header row.");

const mapping = mapHeader(headerRow);
const referenceRows = parseReferenceRows(tsvRows, mapping);
const referenceByName = new Map(referenceRows.map(row => [row.normalizedName, row]));
const baselineRows = JSON.parse(await readFile(baselinePath, "utf8"));
const originalBaselineRows = JSON.parse(
  execFileSync("git", ["show", `HEAD:${path.relative(root, baselinePath).replace(/\\/g, "/")}`], {
    cwd: root,
    encoding: "utf8",
  }),
);
const originalByName = new Map(originalBaselineRows.map(row => [normalizeName(row.name), row]));
const usedReferences = new Set();
const unmatchedBaselineRows = [];
const rowReports = [];

const reconciledRows = baselineRows.map(row => {
  const referenceRow = referenceByName.get(normalizeName(row.name));
  if (!referenceRow) {
    unmatchedBaselineRows.push(row.name);
    return row;
  }

  usedReferences.add(referenceRow.normalizedName);
  const next = reconcileRow(row, referenceRow);
  const originalRow = originalByName.get(normalizeName(row.name)) ?? row;
  const changes = getChanges(originalRow, next);
  rowReports.push({
    name: row.name,
    tsvName: referenceRow.referenceName,
    changes,
  });
  return next;
});

const unmatchedTsvRows = referenceRows
  .filter(row => !usedReferences.has(row.normalizedName))
  .map(row => row.referenceName);

if (unmatchedBaselineRows.length > 0) {
  throw new Error(`Unmatched baseline rows: ${unmatchedBaselineRows.join(", ")}`);
}

await writeFile(baselinePath, `${JSON.stringify(reconciledRows, null, 2)}\n`);
await writeFile(
  batchPath,
  `${JSON.stringify(
    {
      id: batchId,
      sourceLabel: "Krome's Spreadsheet",
      snapshotDate: "2026-05-24",
      sourceType: "manual",
      notes: "Baseline reference snapshot reconciled cell-by-cell to Krome's Weapon Data Sheet 10.6.0.",
    },
    null,
    2,
  )}\n`,
);

const changedRows = rowReports.filter(row => row.changes.length > 0);
const unchangedRows = rowReports.filter(row => row.changes.length === 0);
const report = [
  "# Krome Weapon Baseline Reconciliation 10.6.0",
  "",
  `- TSV path used: \`${path.relative(root, tsvPath).replace(/\\/g, "/")}\``,
  `- Total TSV rows parsed: ${referenceRows.length}`,
  `- Total baseline rows checked: ${baselineRows.length}`,
  `- Rows changed: ${changedRows.length}`,
  `- Rows confirmed unchanged: ${unchangedRows.length}`,
  `- Unmatched TSV rows: ${unmatchedTsvRows.length ? unmatchedTsvRows.join(", ") : "none"}`,
  "- Unmatched baseline rows: none",
  "- Alias assumptions: none; all baseline rows matched by normalized weapon/stat row name",
  "",
  "## Header Mapping",
  "",
  ...Object.entries(mapping).map(([name, index]) => `- ${name}: column ${index + 1}`),
  "",
  "## Exact Field Changes",
  "",
  ...rowReports.map(row => {
    if (row.changes.length === 0) return `- ${row.name}: unchanged`;
    const changes = row.changes
      .map(change => `${change.field}: ${formatValue(change.before)} -> ${formatValue(change.after)}`)
      .join("; ");
    return `- ${row.name}: ${changes}`;
  }),
  "",
].join("\n");

await writeFile(reportPath, report);

console.log(JSON.stringify({
  tsvPath: path.relative(root, tsvPath).replace(/\\/g, "/"),
  totalTsvRowsParsed: referenceRows.length,
  totalBaselineRowsChecked: baselineRows.length,
  rowsChanged: changedRows.length,
  rowsConfirmedUnchanged: unchangedRows.length,
  unmatchedTsvRows,
  unmatchedBaselineRows,
  aliasesUsed: [],
  reportPath: path.relative(root, reportPath).replace(/\\/g, "/"),
}, null, 2));
