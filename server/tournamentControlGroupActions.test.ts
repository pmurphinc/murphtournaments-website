import { describe, expect, it } from "vitest";
import { TRPCError } from "@trpc/server";
import {
  gameCapacity,
  planGroupAction,
  planShuffledSeating,
  type ControlAssignment,
} from "./tournamentControlRules";

type Game = {
  id: number;
  tournamentId: number;
  gameType: "cashout" | "final_round";
  status: "draft" | "ready" | "live" | "complete";
};

const game = (id: number, overrides: Partial<Game> = {}): Game => ({
  id,
  tournamentId: 1,
  gameType: "cashout",
  status: "ready",
  ...overrides,
});

const seat = (
  gameId: number,
  teamId: number,
  slotIndex: number
): ControlAssignment => ({ gameId, teamId, slotIndex });

/** Deterministic stand-in for the real Fisher-Yates shuffle. */
const reverse = (teamIds: number[]) => [...teamIds].reverse();
const identity = (teamIds: number[]) => [...teamIds];

describe("planGroupAction", () => {
  const games = [game(10), game(11), game(12, { status: "complete" })];

  it("returns the selected lobbies", () => {
    const plan = planGroupAction(games, 1, [10, 11]);
    expect(plan.selected.map(g => g.id)).toEqual([10, 11]);
  });

  it("holds back completed lobbies and counts them", () => {
    const plan = planGroupAction(games, 1, [10, 12]);
    expect(plan.editable.map(g => g.id)).toEqual([10]);
    expect(plan.skipped).toBe(1);
  });

  it("reports nothing skipped when no lobby is complete", () => {
    expect(planGroupAction(games, 1, [10, 11]).skipped).toBe(0);
  });

  it("can end up with nothing to do", () => {
    const plan = planGroupAction(games, 1, [12]);
    expect(plan.editable).toHaveLength(0);
    expect(plan.skipped).toBe(1);
  });

  it("rejects a duplicated lobby", () => {
    expect(() => planGroupAction(games, 1, [10, 10])).toThrow(TRPCError);
  });

  it("rejects a lobby that does not exist", () => {
    expect(() => planGroupAction(games, 1, [10, 999])).toThrow(TRPCError);
  });

  it("rejects a lobby from another tournament", () => {
    const foreign = [game(10), game(11, { tournamentId: 2 })];
    expect(() => planGroupAction(foreign, 1, [10, 11])).toThrow(TRPCError);
  });
});

describe("planShuffledSeating", () => {
  const twoLobbies = [game(10), game(11)];
  const fourSeated = [
    seat(10, 1, 1),
    seat(10, 2, 2),
    seat(11, 3, 1),
    seat(11, 4, 2),
  ];

  it("reseats every team exactly once", () => {
    const seating = planShuffledSeating(twoLobbies, fourSeated, reverse);
    expect(seating).not.toBeNull();
    expect(seating?.map(s => s.teamId).sort()).toEqual([1, 2, 3, 4]);
  });

  it("never reuses a slot within a lobby", () => {
    const seating = planShuffledSeating(twoLobbies, fourSeated, reverse) ?? [];
    const keys = seating.map(s => `${s.gameId}:${s.slotIndex}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("never seats a team outside the selected lobbies", () => {
    const seating = planShuffledSeating(twoLobbies, fourSeated, reverse) ?? [];
    for (const s of seating) expect([10, 11]).toContain(s.gameId);
  });

  it("keeps slot indices within each lobby's capacity", () => {
    const seating = planShuffledSeating(twoLobbies, fourSeated, reverse) ?? [];
    for (const s of seating) {
      expect(s.slotIndex).toBeGreaterThanOrEqual(1);
      expect(s.slotIndex).toBeLessThanOrEqual(gameCapacity.cashout);
    }
  });

  it("leaves every lobby with the headcount it started with", () => {
    // Shuffling a round redraws who plays whom; it must not restructure the
    // bracket by emptying a lobby into another.
    const seating = planShuffledSeating(twoLobbies, fourSeated, reverse) ?? [];
    expect(seating.filter(s => s.gameId === 10)).toHaveLength(2);
    expect(seating.filter(s => s.gameId === 11)).toHaveLength(2);
  });

  it("reuses the exact seats that were occupied before", () => {
    const seating = planShuffledSeating(twoLobbies, fourSeated, reverse) ?? [];
    const before = fourSeated.map(s => `${s.gameId}:${s.slotIndex}`).sort();
    const after = seating.map(s => `${s.gameId}:${s.slotIndex}`).sort();
    expect(after).toEqual(before);
  });

  it("keeps uneven lobbies uneven", () => {
    const uneven = [seat(10, 1, 1), seat(11, 2, 1), seat(11, 3, 2)];
    const seating = planShuffledSeating(twoLobbies, uneven, reverse) ?? [];
    expect(seating.filter(s => s.gameId === 10)).toHaveLength(1);
    expect(seating.filter(s => s.gameId === 11)).toHaveLength(2);
  });

  it("actually moves teams between lobbies", () => {
    const seating = planShuffledSeating(twoLobbies, fourSeated, reverse) ?? [];
    // reverse maps seats [10:1,10:2,11:1,11:2] <- teams [4,3,2,1]
    expect(seating).toEqual([
      { gameId: 10, teamId: 4, slotIndex: 1 },
      { gameId: 10, teamId: 3, slotIndex: 2 },
      { gameId: 11, teamId: 2, slotIndex: 1 },
      { gameId: 11, teamId: 1, slotIndex: 2 },
    ]);
  });

  it("ignores assignments belonging to unselected lobbies", () => {
    const withOutsider = [...fourSeated, seat(99, 5, 1)];
    const seating = planShuffledSeating(twoLobbies, withOutsider, reverse);
    expect(seating?.map(s => s.teamId).sort()).toEqual([1, 2, 3, 4]);
  });

  it("follows the shuffle it is given", () => {
    const seating = planShuffledSeating(twoLobbies, fourSeated, identity) ?? [];
    // Seats are walked in lobby then slot order, so an identity shuffle
    // reproduces the original seating exactly.
    expect(seating).toEqual([
      { gameId: 10, teamId: 1, slotIndex: 1 },
      { gameId: 10, teamId: 2, slotIndex: 2 },
      { gameId: 11, teamId: 3, slotIndex: 1 },
      { gameId: 11, teamId: 4, slotIndex: 2 },
    ]);
  });

  it("is deterministic given the same shuffle", () => {
    const a = planShuffledSeating(twoLobbies, fourSeated, reverse);
    const b = planShuffledSeating(twoLobbies, fourSeated, reverse);
    expect(a).toEqual(b);
  });

  it("does nothing when fewer than two teams are seated", () => {
    expect(
      planShuffledSeating(twoLobbies, [seat(10, 1, 1)], reverse)
    ).toBeNull();
    expect(planShuffledSeating(twoLobbies, [], reverse)).toBeNull();
  });

  it("works for game modes with a smaller lobby", () => {
    const finals = [game(10, { gameType: "final_round" })];
    const capacity = gameCapacity.final_round;
    const seated = Array.from({ length: capacity }, (_, i) =>
      seat(10, i + 1, i + 1)
    );
    const seating = planShuffledSeating(finals, seated, reverse) ?? [];
    expect(seating).toHaveLength(capacity);
    expect(Math.max(...seating.map(s => s.slotIndex))).toBe(capacity);
  });

  it("rejects a shuffle that loses or invents a team", () => {
    expect(() =>
      planShuffledSeating(twoLobbies, fourSeated, ids => ids.slice(1))
    ).toThrow(TRPCError);
  });
});
