import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "../../../server/_core/context";

vi.mock("../../../server/db", () => ({
  getDb: vi.fn(async () => db),
}));

import { appRouter } from "../../../server/routers";
import { clearDiscordTournamentStaffCache } from "../../../server/discordTournamentRoles";
import { extractInsertId } from "../../../server/tournamentControl";
import { tournamentControlTemplateConnections, tournamentControlTemplateGames, tournamentControlTemplates, tournamentGames, tournaments } from "../../../drizzle/schema";

type TournamentRow = { id: number; name: string; ownerUserId?: number | null; eventStatus: "not-live"; currentCycle: "1"; currentStage: "check-in"; currentMatch: null; eventNote: null };
type GameRow = { id: number; tournamentId: number; gameType: "cashout" | "final_round"; status: "draft"; displayLabel: string; canvasX: number; canvasY: number; seriesBestOf: number; privateLobbyCode: string | null; mapId: string | null; roundGroupId: string | null; roundLabel: string | null; roundColor: string | null; roundLocked: number };
type TemplateRow = { id: number; name: string; visibility: "private" | "public"; createdByUserId: number; sourceTournamentId: number | null };
type TemplateGameRow = { id: number; templateId: number; gameType: "cashout" | "final_round"; displayLabel: string; canvasX: number; canvasY: number; seriesBestOf: number; mapId: string | null; roundGroupId: string | null; roundLabel: string | null; roundColor: string | null; roundLocked: number };
type TemplateConnectionRow = { id: number; templateId: number; sourceTemplateGameId: number; targetTemplateGameId: number; flowType: "winner" | "loser" };
type Insertable = Partial<TournamentRow & GameRow & TemplateRow & TemplateGameRow & TemplateConnectionRow>;

type SelectBuilder<T> = { where: (condition?: unknown) => SelectResult<T>; leftJoin: (table?: unknown, condition?: unknown) => SelectBuilder<T>; innerJoin: (table?: unknown, condition?: unknown) => SelectBuilder<T>; then: Promise<T[]>["then"] };
type SelectResult<T> = { limit: (count: number) => Promise<T[]>; then: Promise<T[]>["then"] };

const state = {
  tournaments: [] as TournamentRow[],
  games: [] as GameRow[],
  templates: [] as TemplateRow[],
  templateGames: [] as TemplateGameRow[],
  templateConnections: [] as TemplateConnectionRow[],
  nextTournamentId: 1,
  nextGameId: 10,
  nextTemplateId: 100,
  nextTemplateGameId: 200,
  nextTemplateConnectionId: 300,
  gameSelects: 0,
  templateGameSelects: 0,
};

function mysql2InsertResult(insertId: number): [{ insertId: number }, undefined] {
  return [{ insertId }, undefined];
}

function makeSelect<T>(rows: () => T[]): SelectBuilder<T> {
  const result = (): SelectResult<T> => {
    const promise = Promise.resolve(rows());
    return { limit: (count: number) => Promise.resolve(rows().slice(0, count)), then: promise.then.bind(promise) };
  };
  const promise = Promise.resolve(rows());
  return { where: () => result(), leftJoin: () => makeSelect(rows), innerJoin: () => makeSelect(rows), then: promise.then.bind(promise) };
}

function selectedRows(table: unknown): unknown[] {
  if (table === tournaments) return state.tournaments;
  if (table === tournamentGames) {
    state.gameSelects += 1;
    return state.games;
  }
  if (table === tournamentControlTemplates) return state.templates;
  if (table === tournamentControlTemplateGames) {
    state.templateGameSelects += 1;
    return state.templateGames;
  }
  if (table === tournamentControlTemplateConnections) return state.templateConnections;
  return [];
}

const db = {
  transaction: async <T>(callback: (tx: typeof db) => Promise<T>) => callback(db),
  select: () => ({ from: (table: unknown) => makeSelect(() => selectedRows(table)) }),
  insert: (table: unknown) => ({
    values: async (value: Insertable) => {
      if (table === tournamentControlTemplates) {
        const row: TemplateRow = { id: state.nextTemplateId++, name: String(value.name), visibility: value.visibility === "public" ? "public" : "private", createdByUserId: Number(value.createdByUserId), sourceTournamentId: Number(value.sourceTournamentId) };
        state.templates.push(row);
        return mysql2InsertResult(row.id);
      }
      if (table === tournamentControlTemplateGames) {
        const row: TemplateGameRow = { id: state.nextTemplateGameId++, templateId: Number(value.templateId), gameType: value.gameType === "final_round" ? "final_round" : "cashout", displayLabel: String(value.displayLabel), canvasX: Number(value.canvasX), canvasY: Number(value.canvasY), seriesBestOf: Number(value.seriesBestOf), mapId: value.mapId == null ? null : String(value.mapId), roundGroupId: value.roundGroupId == null ? null : String(value.roundGroupId), roundLabel: value.roundLabel == null ? null : String(value.roundLabel), roundColor: value.roundColor == null ? null : String(value.roundColor), roundLocked: Number(value.roundLocked ?? 0) };
        state.templateGames.push(row);
        return mysql2InsertResult(row.id);
      }
      if (table === tournamentControlTemplateConnections) {
        state.templateConnections.push({ id: state.nextTemplateConnectionId++, templateId: Number(value.templateId), sourceTemplateGameId: Number(value.sourceTemplateGameId), targetTemplateGameId: Number(value.targetTemplateGameId), flowType: value.flowType === "loser" ? "loser" : "winner" });
        return mysql2InsertResult(state.nextTemplateConnectionId - 1);
      }
      if (table === tournaments) {
        const row: TournamentRow = { id: state.nextTournamentId++, name: String(value.name), ownerUserId: Number(value.ownerUserId), eventStatus: "not-live", currentCycle: "1", currentStage: "check-in", currentMatch: null, eventNote: null };
        state.tournaments.push(row);
        return mysql2InsertResult(row.id);
      }
      if (table === tournamentGames) {
        const row: GameRow = { id: state.nextGameId++, tournamentId: Number(value.tournamentId), gameType: value.gameType === "final_round" ? "final_round" : "cashout", status: "draft", displayLabel: String(value.displayLabel), canvasX: Number(value.canvasX), canvasY: Number(value.canvasY), seriesBestOf: Number(value.seriesBestOf), privateLobbyCode: null, mapId: value.mapId == null ? null : String(value.mapId), roundGroupId: value.roundGroupId == null ? null : String(value.roundGroupId), roundLabel: value.roundLabel == null ? null : String(value.roundLabel), roundColor: value.roundColor == null ? null : String(value.roundColor), roundLocked: Number(value.roundLocked ?? 0) };
        state.games.push(row);
        return mysql2InsertResult(row.id);
      }
      return mysql2InsertResult(1);
    },
  }),
  update: () => ({ set: () => ({ where: async () => undefined }) }),
  delete: () => ({ where: async () => undefined }),
  execute: async () => [[{ id: 1, tournamentId: 1, sourceGameId: 10, targetGameId: 11 }]],
};

function staffContext(): TrpcContext {
  return { user: { id: 7, openId: "discord:123456789", loginMethod: "discord", role: "user" }, req: { protocol: "https", headers: {}, get: () => "localhost" }, res: { clearCookie: vi.fn(), cookie: vi.fn() } } as unknown as TrpcContext;
}

describe("tournamentControl template save flow", () => {
  beforeEach(() => {
    state.tournaments = [{ id: 1, name: "Source", ownerUserId: 7, eventStatus: "not-live", currentCycle: "1", currentStage: "check-in", currentMatch: null, eventNote: null }];
    state.games = [
      { id: 10, tournamentId: 1, gameType: "cashout", status: "draft", displayLabel: "Cashout A", canvasX: 100, canvasY: 100, seriesBestOf: 1, privateLobbyCode: "secret", mapId: "monaco", roundGroupId: "source-group-a", roundLabel: "Round 1", roundColor: "#f97316", roundLocked: 1 },
      { id: 11, tournamentId: 1, gameType: "final_round", status: "draft", displayLabel: "Final", canvasX: 200, canvasY: 100, seriesBestOf: 3, privateLobbyCode: "secret-final", mapId: "skyway-stadium", roundGroupId: "source-group-b", roundLabel: "Finals", roundColor: "#7c3aed", roundLocked: 0 },
    ];
    state.templates = [];
    state.templateGames = [];
    state.templateConnections = [];
    state.nextTemplateId = 100;
    state.nextTemplateGameId = 200;
    state.nextTemplateConnectionId = 300;
    state.nextTournamentId = 2;
    state.nextGameId = 20;
    state.gameSelects = 0;
    state.templateGameSelects = 0;
    process.env.DISCORD_BOT_TOKEN = "bot-token";
    process.env.DISCORD_GUILD_ID = "987654321";
    process.env.DISCORD_TOURNAMENT_CONTROL_ROLE_IDS = "555";
    clearDiscordTournamentStaffCache();
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({ roles: ["555"] }) })));
  });

  it("extracts insert ids from mysql2 wrapped insert results", () => {
    expect(extractInsertId([{ insertId: 42 }, undefined])).toBe(42);
  });

  it("saves a template using mysql2 wrapped insert ids for games and connections", async () => {
    const caller = appRouter.createCaller(staffContext());
    const result = await caller.tournamentControl.saveTemplateFromTournament({ tournamentId: 1, name: "Public Template", visibility: "public" });

    expect(result).toEqual({ templateId: 100 });
    expect(state.templateGames.map(game => game.id)).toEqual([200, 201]);
    expect(state.templateConnections).toEqual([{ id: 300, templateId: 100, sourceTemplateGameId: 200, targetTemplateGameId: 201, flowType: "winner" }]);
    expect(state.templateGames.map(game => game.mapId)).toEqual(["monaco", "skyway-stadium"]);
    expect(state.templateGameSelects).toBe(0);
  });

  it("remaps shared template round groups once when creating a tournament", async () => {
    state.templates = [
      { id: 100, name: "Grouped Template", visibility: "private", createdByUserId: 7, sourceTournamentId: 1 },
    ];
    state.templateGames = [
      { id: 200, templateId: 100, gameType: "cashout", displayLabel: "Group A Lobby 1", canvasX: 100, canvasY: 120, seriesBestOf: 1, mapId: "monaco", roundGroupId: "template-group-a", roundLabel: "Round 1", roundColor: "#f97316", roundLocked: 1 },
      { id: 201, templateId: 100, gameType: "cashout", displayLabel: "Group A Lobby 2", canvasX: 340, canvasY: 120, seriesBestOf: 1, mapId: "seoul", roundGroupId: "template-group-a", roundLabel: "Round 1", roundColor: "#f97316", roundLocked: 1 },
      { id: 202, templateId: 100, gameType: "final_round", displayLabel: "Group B Final", canvasX: 580, canvasY: 120, seriesBestOf: 3, mapId: "skyway-stadium", roundGroupId: "template-group-b", roundLabel: "Finals", roundColor: "#7c3aed", roundLocked: 0 },
      { id: 203, templateId: 100, gameType: "cashout", displayLabel: "Ungrouped", canvasX: 820, canvasY: 120, seriesBestOf: 1, mapId: "las-vegas", roundGroupId: null, roundLabel: null, roundColor: null, roundLocked: 0 },
    ];
    state.templateConnections = [
      { id: 300, templateId: 100, sourceTemplateGameId: 200, targetTemplateGameId: 202, flowType: "winner" },
    ];
    state.games = [];

    const caller = appRouter.createCaller(staffContext());
    const result = await caller.tournamentControl.createTournamentFromTemplate({ templateId: 100, name: "Restored Tournament" });

    expect(result.createdTournament).toBeTruthy();
    expect(state.games).toHaveLength(4);
    const [first, second, third, fourth] = state.games;
    expect(first.roundGroupId).toBeTruthy();
    expect(second.roundGroupId).toBe(first.roundGroupId);
    expect(third.roundGroupId).toBeTruthy();
    expect(third.roundGroupId).not.toBe(first.roundGroupId);
    expect(fourth.roundGroupId).toBeNull();
    expect([first.roundGroupId, third.roundGroupId]).not.toContain("template-group-a");
    expect([first.roundGroupId, third.roundGroupId]).not.toContain("template-group-b");
    expect(state.games.map(game => ({ label: game.roundLabel, color: game.roundColor, locked: game.roundLocked }))).toEqual([
      { label: "Round 1", color: "#f97316", locked: 1 },
      { label: "Round 1", color: "#f97316", locked: 1 },
      { label: "Finals", color: "#7c3aed", locked: 0 },
      { label: null, color: null, locked: 0 },
    ]);
    expect(state.games.map(game => ({ x: game.canvasX, y: game.canvasY, mapId: game.mapId, seriesBestOf: game.seriesBestOf }))).toEqual([
      { x: 100, y: 120, mapId: "monaco", seriesBestOf: 1 },
      { x: 340, y: 120, mapId: "seoul", seriesBestOf: 1 },
      { x: 580, y: 120, mapId: "skyway-stadium", seriesBestOf: 3 },
      { x: 820, y: 120, mapId: "las-vegas", seriesBestOf: 1 },
    ]);
  });
});
