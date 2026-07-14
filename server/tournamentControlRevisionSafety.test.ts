import { beforeEach, describe, expect, it, vi } from "vitest";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import {
  teams,
  tournamentGameAssignments,
  tournamentGames,
  tournaments,
} from "../drizzle/schema";

const state = {
  tournament: {
    id: 1,
    name: "Original",
    boardRevision: 7,
    finalizedAt: null as Date | null,
    publicSlug: null,
    visibility: "private",
    registrationOpen: 1,
  },
  games: [
    {
      id: 10,
      tournamentId: 1,
      gameType: "cashout",
      status: "pending",
      displayLabel: "Lobby A",
      canvasX: 0,
      canvasY: 0,
      privateLobbyCode: null,
      seriesBestOf: 1,
      mapId: null,
      broadcastUrl: null,
      roundGroupId: null,
      roundLabel: null,
      roundColor: null,
      roundLocked: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ] as any[],
  teams: [] as any[],
  assignments: [] as any[],
  connections: [] as any[],
  nextTeamId: 100,
};

function cloneState() {
  return JSON.parse(JSON.stringify(state));
}
function restore(snapshot: any) {
  Object.assign(state.tournament, snapshot.tournament);
  state.games = snapshot.games;
  state.teams = snapshot.teams;
  state.assignments = snapshot.assignments;
  state.connections = snapshot.connections;
  state.nextTeamId = snapshot.nextTeamId;
}

function rowsFor(table: unknown) {
  if (table === tournaments) return [state.tournament];
  if (table === tournamentGames) return state.games;
  if (table === teams) return state.teams;
  if (table === tournamentGameAssignments) return state.assignments;
  return [];
}

function makeDb(): any {
  const db: any = {
    async transaction(callback: (tx: any) => Promise<unknown>) {
      const snapshot = cloneState();
      try {
        return await callback(db);
      } catch (error) {
        restore(snapshot);
        throw error;
      }
    },
    execute(_query: unknown) {
      return Promise.resolve([[state.tournament]]);
    },
    select() {
      const builder: any = {
        _table: null as unknown,
        from(table: unknown) {
          this._table = table;
          return this;
        },
        leftJoin() {
          return this;
        },
        innerJoin() {
          return this;
        },
        where() {
          return this;
        },
        limit() {
          return this;
        },
        then(
          resolve: (rows: any[]) => unknown,
          reject: (error: unknown) => unknown
        ) {
          return Promise.resolve(rowsFor(this._table)).then(resolve, reject);
        },
      };
      return builder;
    },
    update(table: unknown) {
      return {
        set(values: any) {
          return {
            where() {
              if (table === tournaments) {
                if ("boardRevision" in values)
                  state.tournament.boardRevision += 1;
                else Object.assign(state.tournament, values);
              }
              if (table === tournamentGames)
                Object.assign(state.games[0], values);
              return Promise.resolve({ affectedRows: 1 });
            },
          };
        },
      };
    },
    insert(table: unknown) {
      return {
        values(values: any) {
          if (table === teams) {
            const row = { id: state.nextTeamId++, ...values };
            state.teams.push(row);
            return Promise.resolve({ insertId: row.id });
          }
          if (table === tournamentGames) {
            const row = { id: values.id ?? 20, ...values };
            state.games.push(row);
            return Promise.resolve({ insertId: row.id });
          }
          if (table === tournamentGameAssignments) {
            const row = {
              id: state.assignments.length + 1,
              resultPlacement: null,
              ...values,
            };
            state.assignments.push(row);
            return Promise.resolve({ insertId: row.id });
          }
          return Promise.resolve({ insertId: 1 });
        },
      };
    },
    delete(table: unknown) {
      return {
        where() {
          if (table === tournamentGames) state.games = [];
          if (table === tournamentGameAssignments) state.assignments = [];
          return Promise.resolve({ affectedRows: 1 });
        },
      };
    },
  };
  return db;
}

vi.mock("../server/db", () => ({ getDb: vi.fn(async () => makeDb()) }));

const { __tournamentControlTestInternals } = await import(
  "./tournamentControl"
);

describe("tournament control revision behavior", () => {
  beforeEach(() => {
    state.tournament.name = "Original";
    state.tournament.boardRevision = 7;
    state.tournament.finalizedAt = null;
    state.games = [state.games[0] ?? { id: 10, tournamentId: 1 }];
    Object.assign(state.games[0], {
      id: 10,
      tournamentId: 1,
      canvasX: 0,
      canvasY: 0,
      status: "pending",
      gameType: "cashout",
      displayLabel: "Lobby A",
      roundLocked: 0,
    });
    state.teams = [];
    state.assignments = [];
    state.connections = [];
    state.nextTeamId = 100;
  });

  it("returns the committed post-increment revision for a lobby creation style mutation", async () => {
    const initial = state.tournament.boardRevision;
    const board =
      await __tournamentControlTestInternals.runBoardMutationAndFetch(
        1,
        async (tx: any) => {
          await tx.insert(tournamentGames).values({
            id: 11,
            tournamentId: 1,
            gameType: "cashout",
            status: "pending",
            displayLabel: "Lobby B",
            canvasX: 1,
            canvasY: 1,
          });
        }
      );
    expect(board.tournament.boardRevision).toBe(initial + 1);
    expect(state.tournament.boardRevision).toBe(initial + 1);
  });

  it("increments once for manual team creation and returns the persisted revision", async () => {
    const board =
      await __tournamentControlTestInternals.createTournamentTeamAndFetch({
        tournamentId: 1,
        name: "Team A",
        frp: 10,
      });
    expect(state.teams).toHaveLength(1);
    expect(board.tournament.boardRevision).toBe(8);
    expect(state.tournament.boardRevision).toBe(8);
  });

  it("renames a tournament with matching response and persisted revisions", async () => {
    const board = await __tournamentControlTestInternals.updateTournamentName(
      1,
      "Renamed"
    );
    expect(state.tournament.name).toBe("Renamed");
    expect(board.tournament.boardRevision).toBe(state.tournament.boardRevision);
  });

  it("batch move no-op leaves the revision unchanged", async () => {
    const board = await __tournamentControlTestInternals.moveGames({
      tournamentId: 1,
      positions: [{ gameId: 10, position: { x: 0, y: 0 } }],
    });
    expect(board.tournament.boardRevision).toBe(7);
    expect(state.tournament.boardRevision).toBe(7);
  });

  it("rolls back data and revision when a mutation fails", async () => {
    await expect(
      __tournamentControlTestInternals.runBoardMutationAndFetch(
        1,
        async (tx: any) => {
          await tx
            .update(tournaments)
            .set({ name: "Bad" })
            .where(eq(tournaments.id, 1));
          throw new TRPCError({ code: "BAD_REQUEST", message: "boom" });
        }
      )
    ).rejects.toThrow("boom");
    expect(state.tournament.name).toBe("Original");
    expect(state.tournament.boardRevision).toBe(7);
  });

  it("rejects finalized tournaments through the real mutation helper", async () => {
    state.tournament.finalizedAt = new Date();
    await expect(
      __tournamentControlTestInternals.updateTournamentName(1, "Nope")
    ).rejects.toThrow("finalized");
  });

  it("rejects stale undo restore revisions with CONFLICT", async () => {
    await expect(
      __tournamentControlTestInternals.restoreTournamentBoardSnapshot(1, {
        expectedRevision: 6,
        games: [],
        assignments: [],
        connections: [],
      })
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });
});
