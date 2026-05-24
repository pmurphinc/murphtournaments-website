type BaselineWeaponStat = {
  weaponId: string | null;
  name: string | null;
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

type BaselineSource = {
  sourceLabel: string;
  versionLabel: string;
  snapshotDate: string | null;
};

type BaselineStatsCardProps = {
  weaponName: string;
  stat: BaselineWeaponStat;
  source: BaselineSource | null;
};

type RawBaselineValues = {
  damageDropoffMinRange?: string;
  damageDropoffMaxRange?: string;
  damageDropoffModifierAtMaxRange?: string;
  magazineRaw?: string;
  emptyReloadRaw?: string;
};

const CLASS_HEALTH = {
  Light: 150,
  Medium: 250,
  Heavy: 350,
} as const;

const formatNumber = (value: number | null | undefined, suffix = "") => {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  const rounded = Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)));
  return `${rounded}${suffix}`;
};

const parseRawValues = (rawValues: string | null | undefined): RawBaselineValues => {
  if (!rawValues) return {};
  try {
    return JSON.parse(rawValues) as RawBaselineValues;
  } catch {
    return {};
  }
};

const deriveDamagePerMagazine = (stat: BaselineWeaponStat) => {
  if (stat.damagePerMagazine !== null && stat.damagePerMagazine !== undefined) return stat.damagePerMagazine;
  if (stat.bodyDamage === null || stat.bodyDamage === undefined) return null;
  if (stat.magazineSize === null || stat.magazineSize === undefined) return null;
  return stat.bodyDamage * stat.magazineSize;
};

const deriveTtk = (stat: BaselineWeaponStat, health: number) => {
  if (!stat.bodyDamage || !stat.rateOfFireRpm) return null;
  const shotsToKill = Math.ceil(health / stat.bodyDamage);
  return {
    ttkSeconds: (shotsToKill - 1) / (stat.rateOfFireRpm / 60),
    shotsToKill,
  };
};

const formatTtk = (
  ttkSeconds: number | null | undefined,
  shotsToKill: number | null | undefined,
  fallback: ReturnType<typeof deriveTtk>,
) => {
  const ttk = ttkSeconds ?? fallback?.ttkSeconds ?? null;
  const shots = shotsToKill ?? fallback?.shotsToKill ?? null;
  if (ttk === null || shots === null) return "-";
  return `${formatNumber(ttk, "s")} / ${shots} shots`;
};

function StatCell({
  label,
  value,
  accent = "text-white",
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="min-w-0 px-3 py-3">
      <div className="font-mono text-[10px] font-bold uppercase tracking-wide text-white/45">{label}</div>
      <div className={`mt-1 truncate font-mono text-2xl font-black leading-tight ${accent}`}>{value}</div>
    </div>
  );
}

function TtkCell({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="min-w-0 px-3 py-3">
      <div className={`font-mono text-[10px] font-black uppercase tracking-wide ${accent}`}>{label}</div>
      <div className="mt-1 truncate font-mono text-lg font-black text-white">{value}</div>
    </div>
  );
}

export default function BaselineStatsCard({ weaponName, stat, source }: BaselineStatsCardProps) {
  const raw = parseRawValues(stat.rawValues);
  const damagePerMagazine = deriveDamagePerMagazine(stat);
  const lightTtk = deriveTtk(stat, CLASS_HEALTH.Light);
  const mediumTtk = deriveTtk(stat, CLASS_HEALTH.Medium);
  const heavyTtk = deriveTtk(stat, CLASS_HEALTH.Heavy);
  const sourceText = source
    ? `Source: ${source.sourceLabel} - ${source.versionLabel} Baseline`
    : "Source: Krome's Spreadsheet Baseline";

  return (
    <section className="mb-5 overflow-hidden rounded-lg border border-[#243052] bg-[#0b1028] shadow-[0_0_24px_rgba(0,217,255,0.08)]">
      <div className="border-b border-white/10 px-4 py-3">
        <div className="font-mono text-[11px] font-black uppercase tracking-wide text-white/45">Baseline Stats</div>
        <h2 className="mt-1 font-mono text-xl font-black uppercase tracking-wide text-[#00d9ff]">{weaponName}</h2>
      </div>

      <div className="grid grid-cols-2 divide-x divide-y divide-white/10 sm:grid-cols-4">
        <StatCell label="Body DMG" value={formatNumber(stat.bodyDamage)} accent="text-white" />
        <StatCell label="Head DMG" value={formatNumber(stat.headDamage)} accent="text-[#E84B4B]" />
        <StatCell label="Fire Rate" value={formatNumber(stat.rateOfFireRpm)} accent="text-white" />
        <StatCell label="Mag Size" value={raw.magazineRaw ?? formatNumber(stat.magazineSize)} accent="text-white" />
      </div>

      <div className="grid grid-cols-1 divide-y divide-white/10 border-t border-white/10 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <StatCell label="Tact. Reload" value={formatNumber(stat.tacticalReloadTimeSeconds, "s")} accent="text-white" />
        <StatCell label="Empty Reload" value={raw.emptyReloadRaw ?? formatNumber(stat.emptyReloadTimeSeconds, "s")} accent="text-white" />
        <StatCell label="DMG / Mag" value={formatNumber(damagePerMagazine)} accent="text-white" />
      </div>

      <div className="border-t border-white/10">
        <div className="px-4 pt-3 font-mono text-[11px] font-black uppercase tracking-wide text-white/45">
          Time to Kill (Body)
        </div>
        <div className="grid grid-cols-1 divide-y divide-white/10 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <TtkCell
            label="Light"
            accent="text-[#00d9ff]"
            value={formatTtk(stat.ttkVsLightBodySeconds, stat.stkLightBody, lightTtk)}
          />
          <TtkCell
            label="Medium"
            accent="text-[#E8B84B]"
            value={formatTtk(stat.ttkVsMediumBodySeconds, stat.stkMediumBody, mediumTtk)}
          />
          <TtkCell
            label="Heavy"
            accent="text-[#E84B4B]"
            value={formatTtk(stat.ttkVsHeavyBodySeconds, stat.stkHeavyBody, heavyTtk)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 divide-y divide-white/10 border-t border-white/10 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <StatCell label="Dropoff Start" value={raw.damageDropoffMinRange ?? formatNumber(stat.damageDropoffMinRange, "m")} />
        <StatCell label="Dropoff End" value={raw.damageDropoffMaxRange ?? formatNumber(stat.damageDropoffMaxRange, "m")} />
        <StatCell
          label="Max DMG %"
          value={raw.damageDropoffModifierAtMaxRange ?? formatNumber(stat.damageDropoffModifierAtMaxRange, "%")}
          accent="text-[#E84B4B]"
        />
      </div>

      <div className="border-t border-white/10 px-4 py-3 font-mono text-xs text-white/45">{sourceText}</div>
    </section>
  );
}
