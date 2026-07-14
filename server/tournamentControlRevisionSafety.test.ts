import { beforeEach, describe, expect, it, vi } from "vitest";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import {
  teams,
  tournamentGameAssignments,
  tournamentGames,
  tournaments,
  tournamentTeamSubmissions,
  tournamentPrivateInviteLinks,
  tournamentTeamClaimLinks,
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
  submissions: [] as any[],
  privateInvites: [] as any[],
  claimLinks: [] as any[],
  nextTeamId: 100,
  nextInviteId: 1,
  nextClaimLinkId: 1,
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
  state.submissions = snapshot.submissions;
  state.privateInvites = snapshot.privateInvites;
  state.claimLinks = snapshot.claimLinks;
  state.nextTeamId = snapshot.nextTeamId;
  state.nextInviteId = snapshot.nextInviteId;
  state.nextClaimLinkId = snapshot.nextClaimLinkId;
}

function rowsFor(table: unknown, selected?: unknown) {
  if (table === tournaments && selected) return [];
  if (table === tournaments) return [state.tournament];
  if (table === tournamentGames) return state.games;
  if (table === teams) return state.teams;
  if (table === tournamentGameAssignments) return state.assignments;
  if (table === tournamentTeamSubmissions) return state.submissions;
  if (table === tournamentPrivateInviteLinks) return state.privateInvites;
  if (table === tournamentTeamClaimLinks) return state.claimLinks;
  return [];
}

function sqlText(value: unknown): string {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object") return "";
  const chunks = (value as { queryChunks?: unknown[] }).queryChunks;
  if (Array.isArray(chunks)) return chunks.map(sqlText).join("");
  const stringChunk = (value as { value?: unknown }).value;
  if (Array.isArray(stringChunk)) return stringChunk.map(sqlText).join("");
  return String(value);
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
    execute(query: unknown) {
      const text = sqlText(query);
      if (text.includes("tournament_game_connections"))
        return Promise.resolve([state.connections]);
      if (text.includes("tournament_game_assignments"))
        return Promise.resolve([state.assignments]);
      if (text.includes("tournaments"))
        return Promise.resolve([[state.tournament]]);
      return Promise.resolve([[]]);
    },
    select(selected?: unknown) {
      const builder: any = {
        _table: null as unknown,
        _selected: selected,
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
          return Promise.resolve(rowsFor(this._table, this._selected)).then(
            resolve,
            reject
          );
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
              if (table === tournamentTeamSubmissions)
                Object.assign(state.submissions[0], values);
              if (table === tournamentPrivateInviteLinks)
                state.privateInvites.forEach(invite =>
                  Object.assign(invite, values)
                );
              if (table === tournamentTeamClaimLinks)
                state.claimLinks.forEach(link => Object.assign(link, values));
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
            const row = {
              id: values.id ?? 20 + state.games.length,
              status: "pending",
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
              ...values,
            };
            state.games.push(row);
            return Promise.resolve({ insertId: row.id });
          }
          if (table === tournamentPrivateInviteLinks) {
            const row = {
              id: state.nextInviteId++,
              status: "active",
              ...values,
            };
            state.privateInvites.push(row);
            return Promise.resolve({ insertId: row.id });
          }
          if (table === tournamentTeamClaimLinks) {
            const row = {
              id: state.nextClaimLinkId++,
              status: "active",
              ...values,
            };
            state.claimLinks.push(row);
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
    state.submissions = [];
    state.privateInvites = [];
    state.claimLinks = [];
    state.nextTeamId = 100;
    state.nextInviteId = 1;
    state.nextClaimLinkId = 1;
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

  it("calls the actual lobby creation helper and persists R+1", async () => {
    const board = await __tournamentControlTestInternals.createGame(
      1,
      "cashout",
      { x: 25, y: 30 }
    );
    expect(
      state.games.some(game => game.displayLabel === "Cashout Lobby 2")
    ).toBe(true);
    expect(board.tournament.boardRevision).toBe(8);
    expect(state.tournament.boardRevision).toBe(8);
  });

  it("calls assignTeamToGameSlot and persists R+1", async () => {
    state.teams.push({ id: 200, tournamentId: 1, name: "Assigned", frp: 1 });
    const board = await __tournamentControlTestInternals.assignTeamToGameSlot(
      10,
      200,
      1
    );
    expect(state.assignments).toMatchObject([
      { gameId: 10, teamId: 200, slotIndex: 1 },
    ]);
    expect(board.tournament.boardRevision).toBe(8);
    expect(state.tournament.boardRevision).toBe(8);
  });

  it("changed batch move increments exactly once", async () => {
    const board = await __tournamentControlTestInternals.moveGames({
      tournamentId: 1,
      positions: [{ gameId: 10, position: { x: 55, y: 65 } }],
    });
    expect(state.games[0].canvasX).toBe(55);
    expect(state.games[0].canvasY).toBe(65);
    expect(board.tournament.boardRevision).toBe(8);
    expect(state.tournament.boardRevision).toBe(8);
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

  it("visibility mutation increments exactly once and returns the board", async () => {
    const board =
      await __tournamentControlTestInternals.setTournamentVisibility(
        1,
        "public",
        { id: 1, role: "admin" }
      );
    expect(state.tournament.visibility).toBe("public");
    expect(state.tournament.publicSlug).toBeTruthy();
    expect(board.tournament.boardRevision).toBe(8);
  });

  it("publish mutation increments exactly once and returns the board", async () => {
    state.tournament.visibility = "public";
    state.tournament.publicSlug = "original";
    const board = await __tournamentControlTestInternals.publishTournament(
      1,
      true,
      { id: 1, role: "admin" }
    );
    expect(state.tournament.publishedAt).toBeTruthy();
    expect(board.tournament.boardRevision).toBe(8);
  });

  it("submission rejection increments exactly once", async () => {
    state.submissions.push({
      id: 501,
      tournamentId: 1,
      status: "pending",
      adminNote: null,
      managedTeamId: 1,
    });
    const board = await __tournamentControlTestInternals.rejectSubmission(
      501,
      "Rejected"
    );
    expect(state.submissions[0]).toMatchObject({
      status: "rejected",
      adminNote: "Rejected",
    });
    expect(board.tournament.boardRevision).toBe(8);
  });

  it("private invite regeneration revokes and creates inside one transaction", async () => {
    state.privateInvites.push({
      id: 1,
      tournamentId: 1,
      status: "active",
      token: "old",
    });
    const result =
      await __tournamentControlTestInternals.regeneratePrivateInviteLink(1, {
        id: 1,
        role: "admin",
      });
    expect(result.path).toContain("/tournaments/invite/");
    expect(
      state.privateInvites.filter(invite => invite.status === "active")
    ).toHaveLength(1);
    expect(
      state.privateInvites.some(
        invite => invite.token === "old" && invite.status === "revoked"
      )
    ).toBe(true);
  });

  it("finalized claim-link and lobby-code helpers reject", async () => {
    state.tournament.finalizedAt = new Date();
    state.teams.push({
      id: 300,
      tournamentId: 1,
      name: "Manual",
      frp: 1,
      managedTeamId: null,
    });
    await expect(
      __tournamentControlTestInternals.createTeamClaimLink(300, {
        id: 1,
        role: "admin",
      })
    ).rejects.toThrow("finalized");
    await expect(
      __tournamentControlTestInternals.releaseLobbyCodeDeliveries(10, 1, 300)
    ).rejects.toThrow("finalized");
  });
});
