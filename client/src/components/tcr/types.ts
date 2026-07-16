import type {
  ConnectionFlowType,
  GameStatus,
  GameType,
  RoundFrameColorId,
} from "@/lib/tournamentControlBoard";

export type ControlTeamView = {
  id: number;
  name: string;
  managedTeamId?: number | null;
  captainUserId?: number | null;
  captainDiscordId?: string | null;
  captainDisplayName?: string | null;
};

export type ControlGameView = {
  id: number;
  tournamentId: number;
  gameType: GameType;
  status: GameStatus;
  displayLabel: string;
  canvasX: number;
  canvasY: number;
  privateLobbyCode?: string | null;
  seriesBestOf?: 1 | 3 | 5;
  mapId?: string | null;
  broadcastUrl?: string | null;
  roundGroupId?: string | null;
  roundLabel?: string | null;
  roundColor?: RoundFrameColorId | null;
  roundLocked?: number;
};

export type AssignmentView = {
  id: number;
  gameId: number;
  teamId: number;
  slotIndex: number;
  resultPlacement?: number | null;
};

export type ConnectionView = {
  id: number;
  tournamentId: number;
  sourceGameId: number;
  targetGameId: number;
  flowType: ConnectionFlowType;
};

export type DragPayload = { teamId: number; fromGameId?: number };

export type StaffMemberView = {
  id: number;
  createdAt: string | number | Date;
  user: {
    id: number;
    name?: string | null;
    discordDisplayName?: string | null;
    discordUsername?: string | null;
  };
};

/**
 * Context-sensitive selection consumed by the Inspector. Priority is resolved
 * by the page: assignment > connection > lobby > group > board.
 */
export type InspectorSelection =
  | { kind: "board" }
  | {
      kind: "lobby";
      game: ControlGameView;
      assignments: AssignmentView[];
      capacity: number;
    }
  | {
      kind: "assignment";
      assignment: AssignmentView;
      game: ControlGameView;
      team: ControlTeamView | null;
      capacity: number;
      eliminated: boolean;
    }
  | {
      kind: "connection";
      connection: ConnectionView;
      sourceLabel: string;
      targetLabel: string;
    }
  | {
      kind: "group";
      gameIds: number[];
      group: {
        id: string;
        label: string;
        colorId: RoundFrameColorId;
        locked: boolean;
      } | null;
    };

export function parseDragPayload(value: string): DragPayload | null {
  try {
    const parsed = JSON.parse(value) as Partial<DragPayload>;
    if (typeof parsed.teamId !== "number" || !Number.isInteger(parsed.teamId)) {
      return null;
    }
    if (
      parsed.fromGameId !== undefined &&
      (typeof parsed.fromGameId !== "number" ||
        !Number.isInteger(parsed.fromGameId))
    ) {
      return null;
    }
    return { teamId: parsed.teamId, fromGameId: parsed.fromGameId };
  } catch {
    return null;
  }
}

export function formatPlacement(value: number) {
  if (value === 1) return "1st";
  if (value === 2) return "2nd";
  if (value === 3) return "3rd";
  return `${value}th`;
}

export const gameStatusLabels: Record<GameStatus, string> = {
  draft: "Draft",
  ready: "Ready",
  live: "Live",
  complete: "Complete",
};

export function getLobbyCapacity(gameType: GameType) {
  return gameType === "cashout" ? 4 : 2;
}

export function getRecipientWarning(team: ControlTeamView) {
  if (!team.managedTeamId)
    return "Manual team has no managed captain recipient.";
  if (!team.captainUserId) return "Managed team has no captain recipient.";
  if (!team.captainDiscordId) return "Captain has no Discord ID available.";
  return null;
}

export function getLobbyCodeMessage(
  tournamentName: string,
  lobbyName: string,
  teamName: string,
  code: string
) {
  return `Murph Tournaments lobby code
Tournament: ${tournamentName}
Lobby: ${lobbyName}
Team: ${teamName}
Code: ${code}`;
}
