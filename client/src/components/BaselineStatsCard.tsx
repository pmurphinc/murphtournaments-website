import React from "react";

type BaselineWeaponStat = {
  weaponId: string | null;
  name: string | null;
  weaponType?: "melee" | null;
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
  accent = "text-[var(--mt-off-white)]",
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="min-w-0 px-3 py-3">
      <div className="font-mono text-[10px] font-bold uppercase tracking-wide text-[var(--mt-muted)]">{label}</div>
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
      <div className="mt-1 truncate font-mono text-lg font-black text-[var(--mt-off-white)]">{value}</div>
    </div>
  );
}

function MeleeStatsCard({
  weaponName,
  stat,
  sourceText,
}: {
  weaponName: string;
  stat: BaselineWeaponStat;
  sourceText: string;
}) {
  const hitsToEliminate = [
    { label: "Light", value: stat.stkLightBody, accent: "text-[#00d9ff]" },
    { label: "Medium", value: stat.stkMediumBody, accent: "text-[#E8B84B]" },
    { label: "Heavy", value: stat.stkHeavyBody, accent: "text-[#E84B4B]" },
  ].filter(entry => entry.value !== null && entry.value !== undefined);

  return (
    <section className="mb-5 overflow-hidden rounded-lg border border-[var(--mt-steel-line)] bg-[var(--mt-charcoal)]">
      <div className="border-b border-[var(--mt-steel-line)] px-4 py-3">
        <div className="font-mono text-[11px] font-black uppercase tracking-wide text-[var(--mt-muted)]">Melee Baseline</div>
        <h2 className="mt-1 font-mono text-xl font-black uppercase tracking-wide text-[var(--mt-gold-bright)]">{weaponName}</h2>
      </div>

      {stat.bodyDamage !== null && stat.bodyDamage !== undefined ? (
        <div className="grid grid-cols-1">
          <StatCell label="Attack DMG" value={formatNumber(stat.bodyDamage)} />
        </div>
      ) : null}

      {hitsToEliminate.length > 0 ? (
        <div className="border-t border-[var(--mt-steel-line)]">
          <div className="px-4 pt-3 font-mono text-[11px] font-black uppercase tracking-wide text-[var(--mt-muted)]">
            Hits to Eliminate
          </div>
          <div className="grid grid-cols-1 divide-y divide-[var(--mt-steel-line)] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {hitsToEliminate.map(entry => (
              <TtkCell
                key={entry.label}
                label={entry.label}
                accent={entry.accent}
                value={`${entry.value} ${entry.value === 1 ? "hit" : "hits"}`}
              />
            ))}
          </div>
        </div>
      ) : null}

      {stat.sourceNotes?.trim() ? (
        <div className="border-t border-[var(--mt-steel-line)] px-4 py-3">
          <div className="font-mono text-[10px] font-black uppercase tracking-wide text-[var(--mt-muted)]">Attack Notes</div>
          <p className="mt-2 text-sm leading-6 text-[var(--mt-off-white)]">{stat.sourceNotes.trim()}</p>
        </div>
      ) : null}

      <div className="border-t border-[var(--mt-steel-line)] px-4 py-3 font-mono text-xs text-[var(--mt-muted)]">{sourceText}</div>
    </section>
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
    : "Source: Krome's Spreadsheet - 10.6.0 Baseline";

  if (stat.weaponType === "melee") {
    return <MeleeStatsCard weaponName={weaponName} stat={stat} sourceText={sourceText} />;
  }

  return (
    <section className="mb-5 overflow-hidden rounded-lg border border-[var(--mt-steel-line)] bg-[var(--mt-charcoal)]">
      <div className="border-b border-[var(--mt-steel-line)] px-4 py-3">
        <div className="font-mono text-[11px] font-black uppercase tracking-wide text-[var(--mt-muted)]">Baseline Stats</div>
        <h2 className="mt-1 font-mono text-xl font-black uppercase tracking-wide text-[var(--mt-gold-bright)]">{weaponName}</h2>
      </div>

      <div className="grid grid-cols-2 divide-x divide-y divide-[var(--mt-steel-line)] sm:grid-cols-4">
        <StatCell label="Body DMG" value={formatNumber(stat.bodyDamage)} />
        <StatCell label="Head DMG" value={formatNumber(stat.headDamage)} accent="text-[#E84B4B]" />
        <StatCell label="Fire Rate" value={formatNumber(stat.rateOfFireRpm)} />
        <StatCell label="Mag Size" value={raw.magazineRaw ?? formatNumber(stat.magazineSize)} />
      </div>

      <div className="grid grid-cols-1 divide-y divide-[var(--mt-steel-line)] border-t border-[var(--mt-steel-line)] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <StatCell label="Tact. Reload" value={formatNumber(stat.tacticalReloadTimeSeconds, "s")} />
        <StatCell label="Empty Reload" value={raw.emptyReloadRaw ?? formatNumber(stat.emptyReloadTimeSeconds, "s")} />
        <StatCell label="DMG / Mag" value={formatNumber(damagePerMagazine)} />
      </div>

      <div className="border-t border-[var(--mt-steel-line)]">
        <div className="px-4 pt-3 font-mono text-[11px] font-black uppercase tracking-wide text-[var(--mt-muted)]">
          Time to Kill (Body)
        </div>
        <div className="grid grid-cols-1 divide-y divide-[var(--mt-steel-line)] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
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

      <div className="grid grid-cols-1 divide-y divide-[var(--mt-steel-line)] border-t border-[var(--mt-steel-line)] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <StatCell label="Dropoff Start" value={raw.damageDropoffMinRange ?? formatNumber(stat.damageDropoffMinRange, "m")} />
        <StatCell label="Dropoff End" value={raw.damageDropoffMaxRange ?? formatNumber(stat.damageDropoffMaxRange, "m")} />
        <StatCell
          label="Max DMG %"
          value={raw.damageDropoffModifierAtMaxRange ?? formatNumber(stat.damageDropoffModifierAtMaxRange, "%")}
          accent="text-[#E84B4B]"
        />
      </div>

      <div className="border-t border-[var(--mt-steel-line)] px-4 py-3 font-mono text-xs text-[var(--mt-muted)]">{sourceText}</div>
    </section>
  );
}
