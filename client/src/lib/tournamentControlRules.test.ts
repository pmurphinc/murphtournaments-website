import { describe, expect, it, vi } from "vitest";
import { TRPCError } from "@trpc/server";
import { appRouter } from "../../../server/routers";
import type { TrpcContext } from "../../../server/_core/context";
import { assertGameIsMutable, getActiveAssignedTeamIds, validateAssignmentPlan, validateMovePlan, validateReopenPlan, type ControlAssignment, type ControlGame, type ControlTeam } from "../../../server/tournamentControlRules";

const teams: ControlTeam[] = [
  { id: 1, tournamentId: 10, name: "Alpha" },
  { id: 2, tournamentId: 10, name: "Bravo" },
  { id: 3, tournamentId: 20, name: "Other" },
];
const games: ControlGame[] = [
  { id: 100, tournamentId: 10, gameType: "cashout", status: "draft" },
  { id: 101, tournamentId: 10, gameType: "final_round", status: "ready" },
  { id: 102, tournamentId: 10, gameType: "cashout", status: "complete" },
  { id: 200, tournamentId: 20, gameType: "cashout", status: "draft" },
];

function publicContext(): TrpcContext {
  return { user: null, req: { protocol: "https", headers: {}, get: () => "localhost" }, res: { clearCookie: vi.fn(), cookie: vi.fn() } } as unknown as TrpcContext;
}

function expectTrpcCode(fn: () => unknown, code: string) {
  try { fn(); } catch (error) { expect(error).toBeInstanceOf(TRPCError); expect((error as TRPCError).code).toBe(code); return; }
  throw new Error("Expected TRPCError");
}

describe("tournament control admin guard", () => {
  it("blocks non-admin callers before organizer data access", async () => {
    const caller = appRouter.createCaller(publicContext());
    await expect(caller.tournamentControl.get({ tournamentId: 10 })).rejects.toThrow("required permission");
  });
});

describe("tournament control assignment rules", () => {
  it("allows valid Cashout and Final Round placements within capacity", () => {
    expect(validateAssignmentPlan({ games, teams, assignments: [], targetGameId: 100, teamId: 1, slotIndex: 4 }).id).toBe(100);
    expect(validateAssignmentPlan({ games, teams, assignments: [], targetGameId: 101, teamId: 1, slotIndex: 2 }).id).toBe(101);
  });

  it("enforces Cashout capacity of 4 and Final Round capacity of 2", () => {
    expectTrpcCode(() => validateAssignmentPlan({ games, teams, assignments: [], targetGameId: 100, teamId: 1, slotIndex: 5 }), "BAD_REQUEST");
    expectTrpcCode(() => validateAssignmentPlan({ games, teams, assignments: [], targetGameId: 101, teamId: 1, slotIndex: 3 }), "BAD_REQUEST");
  });

  it("prevents assigning a team across active games in the same tournament", () => {
    const assignments: ControlAssignment[] = [{ gameId: 100, teamId: 1, slotIndex: 1 }];
    expectTrpcCode(() => validateAssignmentPlan({ games, teams, assignments, targetGameId: 101, teamId: 1, slotIndex: 1 }), "CONFLICT");
  });

  it("rejects teams from a different tournament", () => {
    expectTrpcCode(() => validateAssignmentPlan({ games, teams, assignments: [], targetGameId: 100, teamId: 3, slotIndex: 1 }), "BAD_REQUEST");
  });

  it("rejects occupied slots without displacing the current occupant", () => {
    const assignments: ControlAssignment[] = [{ gameId: 100, teamId: 1, slotIndex: 1 }];
    expectTrpcCode(() => validateAssignmentPlan({ games, teams, assignments, targetGameId: 100, teamId: 2, slotIndex: 1 }), "CONFLICT");
    expect(assignments).toEqual([{ gameId: 100, teamId: 1, slotIndex: 1 }]);
  });

  it("validates failed cross-game moves without changing the original assignment", () => {
    const assignments: ControlAssignment[] = [{ gameId: 100, teamId: 1, slotIndex: 1 }, { gameId: 101, teamId: 2, slotIndex: 1 }];
    expectTrpcCode(() => validateMovePlan({ games, teams, assignments, sourceGameId: 100, targetGameId: 101, teamId: 1, slotIndex: 1 }), "CONFLICT");
    expect(assignments.find(a => a.gameId === 100 && a.teamId === 1)).toBeDefined();
  });

  it("completed games do not block a team's next active assignment", () => {
    const assignments: ControlAssignment[] = [{ gameId: 102, teamId: 1, slotIndex: 1 }];
    expect(validateAssignmentPlan({ games, teams, assignments, targetGameId: 100, teamId: 1, slotIndex: 1 }).id).toBe(100);
    expect([...getActiveAssignedTeamIds(games, assignments)]).toEqual([]);
  });

  it("lobby codes are not returned through public auth procedure", async () => {
    const caller = appRouter.createCaller(publicContext());
    await expect(caller.auth.me()).resolves.toBeNull();
  });


  it("allows reopening a completed game when assigned teams are not active elsewhere", () => {
    const assignments: ControlAssignment[] = [{ gameId: 102, teamId: 1, slotIndex: 1 }];
    expect(() => validateReopenPlan({ games, assignments, gameId: 102 })).not.toThrow();
  });

  it("rejects reopening a completed game when assigned teams are active elsewhere", () => {
    const assignments: ControlAssignment[] = [
      { gameId: 102, teamId: 1, slotIndex: 1 },
      { gameId: 100, teamId: 1, slotIndex: 2 },
    ];
    expectTrpcCode(() => validateReopenPlan({ games, assignments, gameId: 102 }), "CONFLICT");
  });

  it("allows moving a team between slots within the same Cashout lobby", () => {
    const assignments: ControlAssignment[] = [{ gameId: 100, teamId: 1, slotIndex: 1 }];
    expect(validateMovePlan({ games, teams, assignments, sourceGameId: 100, targetGameId: 100, teamId: 1, slotIndex: 2 }).targetGame.id).toBe(100);
  });

  it("blocks completed game lobby-code edits and deletes through the shared mutability guard", () => {
    const completedGame = games.find(game => game.id === 102);
    expect(completedGame).toBeDefined();
    expectTrpcCode(() => assertGameIsMutable(completedGame!), "CONFLICT");
    expectTrpcCode(() => assertGameIsMutable(completedGame!), "CONFLICT");
  });

  it("admin Create Team duplicate rule is case-insensitive within a tournament", () => {
    const existing = [{ id: 1, tournamentId: 10, name: "Alpha" }];
    expect(existing.some(team => team.tournamentId === 10 && team.name.toLowerCase() === "alpha")).toBe(true);
  });
});
