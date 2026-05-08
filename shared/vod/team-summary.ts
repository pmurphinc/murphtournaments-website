import type { VodAnalysisEventType } from "./events";

export type VodTeamSummaryEvent = {
  eventType: VodAnalysisEventType;
  timestampSeconds: number;
  teamLabel?: string | null;
};

export type VodTeamSummary = {
  teamName: string;
  deaths: number;
  teamWipes: number;
  teamSpawns: number;
  cashouts: number;
  revives: number;
  defibs: number;
  firstDeathToWipeAvgSeconds: number | null;
};

type MutableVodTeamSummary = VodTeamSummary & {
  firstDeathToWipeDurations: number[];
};

const createEmptySummary = (teamName: string): MutableVodTeamSummary => ({
  teamName,
  deaths: 0,
  teamWipes: 0,
  teamSpawns: 0,
  cashouts: 0,
  revives: 0,
  defibs: 0,
  firstDeathToWipeAvgSeconds: null,
  firstDeathToWipeDurations: [],
});

const countedEventTypes = new Set<VodAnalysisEventType>([
  "death",
  "cashout",
  "team_wipe",
  "team_spawn",
  "revive",
  "defib",
]);

function getTeamName(event: VodTeamSummaryEvent) {
  const teamName = event.teamLabel?.trim();
  return teamName ? teamName : null;
}

function averageDurations(durations: number[]) {
  if (durations.length === 0) return null;

  const total = durations.reduce((sum, duration) => sum + duration, 0);
  return total / durations.length;
}

export function buildVodTeamSummaries(
  events: VodTeamSummaryEvent[]
): VodTeamSummary[] {
  const summariesByTeam = new Map<string, MutableVodTeamSummary>();
  const firstDeathByTeam = new Map<string, number | null>();

  const sortedEvents = events
    .map((event, index) => ({ event, index }))
    .sort((left, right) => {
      const timestampDiff =
        left.event.timestampSeconds - right.event.timestampSeconds;
      return timestampDiff === 0 ? left.index - right.index : timestampDiff;
    });

  for (const { event } of sortedEvents) {
    const teamName = getTeamName(event);

    if (!teamName || !countedEventTypes.has(event.eventType)) {
      continue;
    }

    const summary =
      summariesByTeam.get(teamName) ?? createEmptySummary(teamName);
    summariesByTeam.set(teamName, summary);

    switch (event.eventType) {
      case "death":
        summary.deaths += 1;
        if (firstDeathByTeam.get(teamName) == null) {
          firstDeathByTeam.set(teamName, event.timestampSeconds);
        }
        break;
      case "team_wipe": {
        summary.teamWipes += 1;
        const firstDeathTimestamp = firstDeathByTeam.get(teamName);
        if (firstDeathTimestamp != null) {
          summary.firstDeathToWipeDurations.push(
            event.timestampSeconds - firstDeathTimestamp
          );
        }
        firstDeathByTeam.set(teamName, null);
        break;
      }
      case "team_spawn":
        summary.teamSpawns += 1;
        firstDeathByTeam.set(teamName, null);
        break;
      case "cashout":
        summary.cashouts += 1;
        break;
      case "revive":
        summary.revives += 1;
        break;
      case "defib":
        summary.defibs += 1;
        break;
    }
  }

  return Array.from(summariesByTeam.values())
    .map(({ firstDeathToWipeDurations, ...summary }) => ({
      ...summary,
      firstDeathToWipeAvgSeconds: averageDurations(firstDeathToWipeDurations),
    }))
    .sort((left, right) => left.teamName.localeCompare(right.teamName));
}
