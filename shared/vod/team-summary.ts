import type { VodAnalysisEventType } from "./events";

export type VodTeamSummaryEvent = {
  eventType: VodAnalysisEventType;
  timestampSeconds: number;
  teamLabel?: string | null;
};

export type VodTeamAttributedEvent = VodTeamSummaryEvent & {
  id: number;
  actorLabel?: string | null;
  targetLabel?: string | null;
};

export type VodTeamSummary = {
  teamName: string;
  deaths: number;
  teamWipes: number;
  teamSpawns: number;
  cashouts: number;
  stealFlips: number;
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
  stealFlips: 0,
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
  "steal_flip",
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
      case "steal_flip":
        summary.stealFlips += 1;
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

export function getVodTeamAttributedEvents<
  TEvent extends VodTeamAttributedEvent,
>(teamName: string, events: TEvent[]): TEvent[] {
  const selectedTeamName = teamName.trim();

  if (!selectedTeamName) return [];

  return events
    .filter(event => {
      const eventTeamName = getTeamName(event);
      return (
        eventTeamName === selectedTeamName &&
        countedEventTypes.has(event.eventType)
      );
    })
    .sort((left, right) => {
      const timestampDiff = left.timestampSeconds - right.timestampSeconds;
      return timestampDiff === 0 ? left.id - right.id : timestampDiff;
    });
}

export function getVodTeamInsightCallouts(
  summary: VodTeamSummary,
  allSummaries: VodTeamSummary[] = []
): string[] {
  const recoveryEvents = summary.revives + summary.defibs;
  const labeledEventCount =
    summary.deaths +
    summary.teamWipes +
    summary.teamSpawns +
    summary.cashouts +
    summary.stealFlips +
    recoveryEvents;

  if (labeledEventCount < 2) {
    return ["Add more team-labeled events to unlock stronger insights."];
  }

  const callouts: string[] = [];
  const maxCashouts = Math.max(
    summary.cashouts,
    ...allSummaries.map(team => team.cashouts)
  );

  if (summary.deaths >= 4 && recoveryEvents <= 1) {
    callouts.push(
      "Survivability and reset discipline need attention. This team is losing players without enough recovery events."
    );
  }

  if (summary.cashouts >= 2 && summary.cashouts === maxCashouts) {
    callouts.push(
      "Objective conversion is a strength. This team is getting paid when opportunities appear."
    );
  }

  if (
    summary.firstDeathToWipeAvgSeconds !== null &&
    summary.firstDeathToWipeAvgSeconds <= 15
  ) {
    callouts.push(
      "The team collapses quickly after first death. Focus on spacing, disengage timing, and delaying the wipe."
    );
  }

  if (recoveryEvents >= 3) {
    callouts.push(
      "Recovery support looks strong. This team is extending fights through revive pressure."
    );
  }

  return callouts.length > 0
    ? callouts
    : ["Add more team-labeled events to unlock stronger insights."];
}
