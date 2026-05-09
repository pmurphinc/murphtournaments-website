export type VodEventLabelSource = {
  actorLabel?: string | null;
  targetLabel?: string | null;
  teamLabel?: string | null;
};

export type VodEventLabelSuggestions = {
  teams: string[];
  actors: string[];
  targets: string[];
};

export type VodLabelVariantCount = {
  label: string;
  count: number;
};

export type VodTeamLabelWarning = {
  normalizedKey: string;
  variants: VodLabelVariantCount[];
  totalCount: number;
};

type LabelCandidate = {
  displayLabel: string;
  count: number;
  firstSeenIndex: number;
};

export function normalizeVodLabelKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function getPreferredLabels(
  events: VodEventLabelSource[],
  field: keyof VodEventLabelSource
): string[] {
  const labelsByNormalizedKey = new Map<string, Map<string, LabelCandidate>>();

  events.forEach((event, eventIndex) => {
    const rawLabel = event[field];
    if (rawLabel == null) return;

    const displayLabel = rawLabel.trim();
    if (!displayLabel) return;

    const normalizedKey = normalizeVodLabelKey(displayLabel);
    const candidates = labelsByNormalizedKey.get(normalizedKey) ?? new Map();
    const existing = candidates.get(displayLabel);

    if (existing) {
      existing.count += 1;
    } else {
      candidates.set(displayLabel, {
        displayLabel,
        count: 1,
        firstSeenIndex: eventIndex,
      });
    }

    labelsByNormalizedKey.set(normalizedKey, candidates);
  });

  return Array.from(labelsByNormalizedKey.entries())
    .map(([normalizedKey, candidates]) => {
      const preferred = Array.from(candidates.values()).sort((left, right) => {
        const countDiff = right.count - left.count;
        if (countDiff !== 0) return countDiff;
        return left.firstSeenIndex - right.firstSeenIndex;
      })[0];

      return {
        normalizedKey,
        label: preferred.displayLabel,
      };
    })
    .sort((left, right) =>
      left.normalizedKey.localeCompare(right.normalizedKey)
    )
    .map(({ label }) => label);
}

export function getVodEventLabelSuggestions(
  events: VodEventLabelSource[]
): VodEventLabelSuggestions {
  return {
    teams: getPreferredLabels(events, "teamLabel"),
    actors: getPreferredLabels(events, "actorLabel"),
    targets: getPreferredLabels(events, "targetLabel"),
  };
}

export function getVodTeamLabelWarnings(
  events: VodEventLabelSource[]
): VodTeamLabelWarning[] {
  const labelsByNormalizedKey = new Map<
    string,
    Map<string, VodLabelVariantCount>
  >();

  for (const event of events) {
    const rawLabel = event.teamLabel;
    if (rawLabel == null) continue;

    if (!rawLabel.trim()) continue;

    const normalizedKey = normalizeVodLabelKey(rawLabel);
    const variants = labelsByNormalizedKey.get(normalizedKey) ?? new Map();
    const existing = variants.get(rawLabel);

    if (existing) {
      existing.count += 1;
    } else {
      variants.set(rawLabel, { label: rawLabel, count: 1 });
    }

    labelsByNormalizedKey.set(normalizedKey, variants);
  }

  return Array.from(labelsByNormalizedKey.entries())
    .filter(([, variants]) => variants.size > 1)
    .map(([normalizedKey, variants]) => {
      const sortedVariants = Array.from(variants.values()).sort(
        (left, right) => {
          const labelDiff = left.label.localeCompare(right.label);
          if (labelDiff !== 0) return labelDiff;
          return left.count - right.count;
        }
      );

      return {
        normalizedKey,
        variants: sortedVariants,
        totalCount: sortedVariants.reduce(
          (total, variant) => total + variant.count,
          0
        ),
      };
    })
    .sort((left, right) =>
      left.normalizedKey.localeCompare(right.normalizedKey)
    );
}
