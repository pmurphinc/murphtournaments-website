import { TRPCError } from "@trpc/server";

export const activeTournamentGameStatuses = ["draft", "ready", "live"] as const;
export const tournamentGameStatuses = [
  "draft",
  "ready",
  "live",
  "complete",
] as const;
export const tournamentGameTypes = ["cashout", "final_round"] as const;

export type TournamentGameType = (typeof tournamentGameTypes)[number];
export type TournamentGameStatus = (typeof tournamentGameStatuses)[number];

export type ControlTeam = { id: number; tournamentId: number; name: string };
export type ControlGame = {
  id: number;
  tournamentId: number;
  gameType: TournamentGameType;
  status: TournamentGameStatus;
};
export type ControlAssignment = {
  gameId: number;
  teamId: number;
  slotIndex: number;
};

export const gameCapacity: Record<TournamentGameType, number> = {
  cashout: 4,
  final_round: 2,
};

export function isActiveGameStatus(status: TournamentGameStatus) {
  return activeTournamentGameStatuses.includes(
    status as (typeof activeTournamentGameStatuses)[number]
  );
}

export function clampCanvasPosition(position: { x: number; y: number }) {
  return {
    x: Math.max(0, Math.round(position.x)),
    y: Math.max(0, Math.round(position.y)),
  };
}

export function getActiveAssignedTeamIds(
  games: ControlGame[],
  assignments: ControlAssignment[]
) {
  const activeGameIds = new Set(
    games.filter(game => isActiveGameStatus(game.status)).map(game => game.id)
  );
  return new Set(
    assignments
      .filter(assignment => activeGameIds.has(assignment.gameId))
      .map(assignment => assignment.teamId)
  );
}

export function getNextAvailableSlot(
  assignments: Pick<ControlAssignment, "slotIndex" | "teamId">[],
  capacity: number,
  preferredSlotIndex?: number,
  teamId?: number
) {
  if (
    teamId !== undefined &&
    assignments.some(assignment => assignment.teamId === teamId)
  )
    return null;
  const occupiedSlots = new Set(
    assignments.map(assignment => assignment.slotIndex)
  );
  const slots = Array.from({ length: capacity }, (_, index) => index + 1);
  const orderedSlots = preferredSlotIndex
    ? [preferredSlotIndex, ...slots.filter(slot => slot !== preferredSlotIndex)]
    : slots;
  return (
    orderedSlots.find(
      slot => slot >= 1 && slot <= capacity && !occupiedSlots.has(slot)
    ) ?? null
  );
}

export function resolveAssignmentSlot(input: {
  game: ControlGame;
  assignments: ControlAssignment[];
  preferredSlotIndex?: number;
  teamId?: number;
}) {
  const slotIndex = getNextAvailableSlot(
    input.assignments.filter(assignment => assignment.gameId === input.game.id),
    gameCapacity[input.game.gameType],
    input.preferredSlotIndex,
    input.teamId
  );
  if (slotIndex === null) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "This lobby has no open slots.",
    });
  }
  return slotIndex;
}

export type AutoFillCandidate = ControlTeam;

export type AutoFillSelectionInput = {
  teams: AutoFillCandidate[];
  games: ControlGame[];
  assignments: ControlAssignment[];
  targetGame: ControlGame;
  random?: () => number;
};

export function getEmptySlotsForGame(
  game: ControlGame,
  assignments: Pick<ControlAssignment, "gameId" | "slotIndex">[]
) {
  const occupiedSlots = new Set(
    assignments
      .filter(assignment => assignment.gameId === game.id)
      .map(assignment => assignment.slotIndex)
  );
  return Array.from(
    { length: gameCapacity[game.gameType] },
    (_, index) => index + 1
  ).filter(slot => !occupiedSlots.has(slot));
}

export function shuffleTournamentTeams<T>(
  items: readonly T[],
  random: () => number = Math.random
) {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [
      shuffled[swapIndex],
      shuffled[index],
    ];
  }
  return shuffled;
}

export function selectAutoFillLobbyAssignments(input: AutoFillSelectionInput) {
  assertGameIsMutable(input.targetGame);
  const emptySlots = getEmptySlotsForGame(input.targetGame, input.assignments);
  if (emptySlots.length === 0)
    throw new TRPCError({
      code: "CONFLICT",
      message: "This lobby is already full.",
    });
  const targetTeamIds = new Set(
    input.assignments
      .filter(assignment => assignment.gameId === input.targetGame.id)
      .map(assignment => assignment.teamId)
  );
  const otherActiveGameIds = new Set(
    input.games
      .filter(
        game =>
          game.id !== input.targetGame.id && isActiveGameStatus(game.status)
      )
      .map(game => game.id)
  );
  const blockedTeamIds = new Set(
    input.assignments
      .filter(assignment => otherActiveGameIds.has(assignment.gameId))
      .map(assignment => assignment.teamId)
  );
  const eligibleTeams = input.teams.filter(
    team =>
      team.tournamentId === input.targetGame.tournamentId &&
      !targetTeamIds.has(team.id) &&
      !blockedTeamIds.has(team.id)
  );
  if (eligibleTeams.length === 0)
    throw new TRPCError({
      code: "CONFLICT",
      message: "No eligible teams are available for this lobby.",
    });
  const selectedTeams = shuffleTournamentTeams(
    eligibleTeams,
    input.random
  ).slice(0, emptySlots.length);
  return selectedTeams.map((team, index) => ({
    teamId: team.id,
    slotIndex: emptySlots[index]!,
  }));
}

export function assertSlotIsValid(game: ControlGame, slotIndex: number) {
  const capacity = gameCapacity[game.gameType];
  if (slotIndex < 1 || slotIndex > capacity) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `${game.gameType === "cashout" ? "Cashout lobbies" : "Final Round matches"} support slots 1-${capacity}`,
    });
  }
}

export function assertGameIsMutable(game: ControlGame) {
  if (game.status === "complete") {
    throw new TRPCError({
      code: "CONFLICT",
      message:
        "Completed games are historical. Reopen the game before editing it.",
    });
  }
}

export function validateReopenPlan(input: {
  games: ControlGame[];
  assignments: ControlAssignment[];
  gameId: number;
}) {
  const reopeningGame = input.games.find(game => game.id === input.gameId);
  if (!reopeningGame) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Game not found" });
  }

  const reopeningAssignments = input.assignments.filter(
    assignment => assignment.gameId === input.gameId
  );
  for (const reopeningAssignment of reopeningAssignments) {
    const duplicateActive = input.assignments.find(assignment => {
      if (assignment.teamId !== reopeningAssignment.teamId) return false;
      if (assignment.gameId === input.gameId) return false;
      const assignedGame = input.games.find(
        game => game.id === assignment.gameId
      );
      return Boolean(
        assignedGame &&
          assignedGame.tournamentId === reopeningGame.tournamentId &&
          isActiveGameStatus(assignedGame.status)
      );
    });

    if (duplicateActive) {
      throw new TRPCError({
        code: "CONFLICT",
        message:
          "Cannot reopen game because an assigned team is already in another active game.",
      });
    }
  }
}

export function validateAssignmentPlan(input: {
  games: ControlGame[];
  teams: ControlTeam[];
  assignments: ControlAssignment[];
  targetGameId: number;
  teamId: number;
  slotIndex: number;
  sourceGameId?: number;
}) {
  const targetGame = input.games.find(game => game.id === input.targetGameId);
  if (!targetGame) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Target game not found",
    });
  }

  if (targetGame.status === "complete") {
    throw new TRPCError({
      code: "CONFLICT",
      message:
        "Completed games are historical. Mark the game active before changing assignments.",
    });
  }

  const team = input.teams.find(teamRow => teamRow.id === input.teamId);
  if (!team || team.tournamentId !== targetGame.tournamentId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Team does not belong to this tournament",
    });
  }

  assertSlotIsValid(targetGame, input.slotIndex);

  const occupiedSlot = input.assignments.find(
    assignment =>
      assignment.gameId === targetGame.id &&
      assignment.slotIndex === input.slotIndex &&
      assignment.teamId !== input.teamId
  );
  if (occupiedSlot) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "Target slot is occupied",
    });
  }

  const duplicateActive = input.assignments.find(assignment => {
    if (assignment.teamId !== input.teamId) return false;
    if (assignment.gameId === targetGame.id) return false;
    if (input.sourceGameId && assignment.gameId === input.sourceGameId)
      return false;
    const assignedGame = input.games.find(
      game => game.id === assignment.gameId
    );
    return Boolean(
      assignedGame &&
        assignedGame.tournamentId === targetGame.tournamentId &&
        isActiveGameStatus(assignedGame.status)
    );
  });

  if (duplicateActive) {
    throw new TRPCError({
      code: "CONFLICT",
      message:
        "Team is already assigned to another active game in this tournament",
    });
  }

  return targetGame;
}

export function validateMovePlan(input: {
  games: ControlGame[];
  teams: ControlTeam[];
  assignments: ControlAssignment[];
  sourceGameId: number;
  targetGameId: number;
  teamId: number;
  slotIndex: number;
}) {
  const sourceGame = input.games.find(game => game.id === input.sourceGameId);
  if (!sourceGame) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Source game not found",
    });
  }
  if (sourceGame.status === "complete") {
    throw new TRPCError({
      code: "CONFLICT",
      message:
        "Completed games are historical. Mark the game active before changing assignments.",
    });
  }

  const sourceAssignment = input.assignments.find(
    assignment =>
      assignment.gameId === input.sourceGameId &&
      assignment.teamId === input.teamId
  );
  if (!sourceAssignment) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Source assignment not found",
    });
  }

  const targetGame = validateAssignmentPlan({
    games: input.games,
    teams: input.teams,
    assignments: input.assignments,
    targetGameId: input.targetGameId,
    teamId: input.teamId,
    slotIndex: input.slotIndex,
    sourceGameId: input.sourceGameId,
  });

  if (sourceGame.tournamentId !== targetGame.tournamentId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Source and target games must belong to the same tournament",
    });
  }

  return { sourceGame, targetGame, sourceAssignment };
}
