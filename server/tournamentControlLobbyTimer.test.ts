import { beforeEach, describe, expect, it, vi } from "vitest";
import { tournamentGames, tournaments } from "../drizzle/schema";

type FakeGame = {
  id: number;
  tournamentId: number;
  gameType: "cashout" | "final_round";
  status: "draft" | "ready" | "live" | "complete";
  displayLabel: string;
  canvasX: number;
  canvasY: number;
  privateLobbyCode: string | null;
  roundGroupId: string | null;
  roundLabel: string | null;
  roundColor: string | null;
  roundLocked: number;
  broadcastUrl: string | null;
  mapId: string | null;
  seriesBestOf: number;
  liveStartedAt: Date | null;
  liveEndedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

const state = {
  tournament: { id: 1, boardRevision: 1, finalizedAt: null as Date | null },
  games: [] as FakeGame[],
  assignments: [] as unknown[],
  teams: [] as unknown[],
  connections: [] as unknown[],
  results: [] as unknown[],
};

function resetState(overrides: Partial<FakeGame> = {}) {
  state.tournament = { id: 1, boardRevision: 1, finalizedAt: null };
  state.games = [
    {
      id: 10,
      tournamentId: 1,
      gameType: "cashout",
      status: "draft",
      displayLabel: "Lobby A",
      canvasX: 0,
      canvasY: 0,
      privateLobbyCode: null,
      roundGroupId: null,
      roundLabel: null,
      roundColor: null,
      roundLocked: 0,
      broadcastUrl: null,
      mapId: null,
      seriesBestOf: 1,
      liveStartedAt: null,
      liveEndedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    },
  ];
  state.assignments = [];
  state.teams = [];
  state.connections = [];
  state.results = [];
}

function isSqlNowMarker(value: unknown) {
  return (
    Boolean(value) &&
    typeof value === "object" &&
    "queryChunks" in (value as object)
  );
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

function rowsFor(table: unknown) {
  if (table === tournaments) return [state.tournament];
  if (table === tournamentGames) return state.games;
  return [];
}

function makeDb(): any {
  const db: any = {
    async transaction(callback: (tx: any) => Promise<unknown>) {
      return callback(db);
    },
    execute(query: unknown) {
      const text = sqlText(query);
      if (text.includes("tournament_game_connections"))
        return Promise.resolve([state.connections]);
      if (text.includes("tournaments"))
        return Promise.resolve([[state.tournament]]);
      return Promise.resolve([[]]);
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
          resolve: (rows: unknown[]) => unknown,
          reject: (error: unknown) => unknown
        ) {
          return Promise.resolve(rowsFor(this._table)).then(resolve, reject);
        },
      };
      return builder;
    },
    update(table: unknown) {
      return {
        set(values: Record<string, unknown>) {
          return {
            where() {
              if (table === tournaments) {
                if ("boardRevision" in values)
                  state.tournament.boardRevision += 1;
                else Object.assign(state.tournament, values);
              }
              if (table === tournamentGames) {
                const patch = { ...values };
                for (const key of ["liveStartedAt", "liveEndedAt"] as const) {
                  if (key in patch && isSqlNowMarker(patch[key]))
                    patch[key] = new Date();
                }
                Object.assign(state.games[0]!, patch);
              }
              return Promise.resolve({ affectedRows: 1 });
            },
          };
        },
      };
    },
  };
  return db;
}

vi.mock("./db", () => ({ getDb: vi.fn(async () => makeDb()) }));

const { __tournamentControlTestInternals } = await import(
  "./tournamentControl"
);

describe("TCR lobby stopwatch lifecycle", () => {
  beforeEach(() => {
    resetState();
  });

  it("records a server-set start timestamp when a lobby goes live from draft or ready", async () => {
    const board =
      await __tournamentControlTestInternals.updateGameStatusAndFetch(
        10,
        "live"
      );
    expect(state.games[0]!.status).toBe("live");
    expect(state.games[0]!.liveStartedAt).toBeInstanceOf(Date);
    expect(state.games[0]!.liveEndedAt).toBeNull();
    expect(board.tournament.boardRevision).toBe(2);
  });

  it("does not reset the start timestamp when re-marking an already-live lobby live", async () => {
    resetState({ status: "live", liveStartedAt: new Date(1_000) });
    const board =
      await __tournamentControlTestInternals.updateGameStatusAndFetch(
        10,
        "live"
      );
    expect(state.games[0]!.liveStartedAt).toEqual(new Date(1_000));
    // A same-status call is a no-op: no board mutation should occur.
    expect(board.tournament.boardRevision).toBe(1);
  });

  it("records a server-set end timestamp when a live lobby completes", async () => {
    resetState({ status: "live", liveStartedAt: new Date(1_000) });
    await __tournamentControlTestInternals.updateGameStatusAndFetch(
      10,
      "complete"
    );
    expect(state.games[0]!.status).toBe("complete");
    expect(state.games[0]!.liveStartedAt).toEqual(new Date(1_000));
    expect(state.games[0]!.liveEndedAt).toBeInstanceOf(Date);
  });

  it("keeps the completed duration stable across repeated reads", async () => {
    resetState({ status: "live", liveStartedAt: new Date(1_000) });
    await __tournamentControlTestInternals.updateGameStatusAndFetch(
      10,
      "complete"
    );
    const frozenEnd = state.games[0]!.liveEndedAt;
    const frozenStart = state.games[0]!.liveStartedAt;
    // Unrelated later reads/refetches must not perturb the frozen values.
    await __tournamentControlTestInternals.runBoardMutationAndFetch(
      1,
      async () => false
    );
    expect(state.games[0]!.liveStartedAt).toEqual(frozenStart);
    expect(state.games[0]!.liveEndedAt).toEqual(frozenEnd);
  });

  it("completing a lobby that never went live does not fabricate an end timestamp", async () => {
    resetState({ status: "draft", liveStartedAt: null, liveEndedAt: null });
    await __tournamentControlTestInternals.updateGameStatusAndFetch(
      10,
      "complete"
    );
    expect(state.games[0]!.liveStartedAt).toBeNull();
    expect(state.games[0]!.liveEndedAt).toBeNull();
  });

  it("reopening a completed lobby to draft/ready clears the prior run", async () => {
    resetState({
      status: "complete",
      liveStartedAt: new Date(1_000),
      liveEndedAt: new Date(2_000),
    });
    await __tournamentControlTestInternals.updateGameStatusAndFetch(
      10,
      "ready"
    );
    expect(state.games[0]!.liveStartedAt).toBeNull();
    expect(state.games[0]!.liveEndedAt).toBeNull();
  });

  it("the next transition to live after a reopen starts a brand new stopwatch", async () => {
    resetState({
      status: "complete",
      liveStartedAt: new Date(1_000),
      liveEndedAt: new Date(2_000),
    });
    await __tournamentControlTestInternals.updateGameStatusAndFetch(
      10,
      "ready"
    );
    await __tournamentControlTestInternals.updateGameStatusAndFetch(10, "live");
    expect(state.games[0]!.status).toBe("live");
    expect(state.games[0]!.liveStartedAt).toBeInstanceOf(Date);
    expect(state.games[0]!.liveStartedAt).not.toEqual(new Date(1_000));
    expect(state.games[0]!.liveEndedAt).toBeNull();
  });

  it("reopening straight from complete to live also starts a fresh stopwatch", async () => {
    resetState({
      status: "complete",
      liveStartedAt: new Date(1_000),
      liveEndedAt: new Date(2_000),
    });
    await __tournamentControlTestInternals.updateGameStatusAndFetch(10, "live");
    expect(state.games[0]!.liveStartedAt).toBeInstanceOf(Date);
    expect(state.games[0]!.liveStartedAt).not.toEqual(new Date(1_000));
    expect(state.games[0]!.liveEndedAt).toBeNull();
  });

  it("unrelated lobby field updates do not alter timing timestamps", async () => {
    const liveStartedAt = new Date(1_000);
    resetState({ status: "live", liveStartedAt });
    await __tournamentControlTestInternals.updateGameFieldAndFetch(10, () => ({
      displayLabel: "Renamed Lobby",
      mapId: "monaco",
      broadcastUrl: "https://twitch.tv/example",
      privateLobbyCode: "CODE1",
      seriesBestOf: 3,
      canvasX: 500,
      canvasY: 250,
    }));
    expect(state.games[0]!.displayLabel).toBe("Renamed Lobby");
    expect(state.games[0]!.liveStartedAt).toEqual(liveStartedAt);
    expect(state.games[0]!.liveEndedAt).toBeNull();
  });

  it("existing board revision protections still increment exactly once per real status change", async () => {
    resetState({ status: "draft" });
    const board =
      await __tournamentControlTestInternals.updateGameStatusAndFetch(
        10,
        "ready"
      );
    expect(board.tournament.boardRevision).toBe(2);
    expect(state.tournament.boardRevision).toBe(2);
  });
});
