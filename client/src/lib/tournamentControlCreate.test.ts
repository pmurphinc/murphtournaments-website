import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "../../../server/_core/context";

const rows: Array<{
  id: number;
  name: string;
  eventStatus: "not-live" | "live" | "complete";
  currentCycle: "1" | "2" | "3";
  currentStage: "check-in" | "cashout" | "final-round" | "finished";
  currentMatch: string | null;
  eventNote: string | null;
}> = [];
let nextId = 1;
const insertedValues: unknown[] = [];

vi.mock("../../../server/db", () => ({
  getDb: vi.fn(async () => ({
    select: () => ({ from: async () => rows }),
    insert: () => ({
      values: async (value: any) => {
        insertedValues.push(value);
        const row = {
          id: nextId++,
          name: value.name,
          eventStatus: value.eventStatus ?? "not-live",
          currentCycle: value.currentCycle ?? "1",
          currentStage: value.currentStage ?? "check-in",
          currentMatch: value.currentMatch ?? null,
          eventNote: value.eventNote ?? null,
        };
        rows.push(row);
        return { insertId: row.id };
      },
    }),
  })),
}));

import { appRouter } from "../../../server/routers";
import { clearDiscordTournamentStaffCache } from "../../../server/discordTournamentRoles";

function ctx(user: TrpcContext["user"]): TrpcContext {
  return {
    user,
    req: { protocol: "https", headers: {}, get: () => "localhost" },
    res: { clearCookie: vi.fn(), cookie: vi.fn() },
  } as unknown as TrpcContext;
}

function staffContext(): TrpcContext {
  return ctx({
    id: 1,
    openId: "discord:123456789",
    loginMethod: "discord",
    role: "user",
  } as TrpcContext["user"]);
}

describe("tournamentControl.createTournament", () => {
  beforeEach(() => {
    rows.length = 0;
    insertedValues.length = 0;
    nextId = 1;
    process.env.DISCORD_BOT_TOKEN = "bot-token";
    process.env.DISCORD_GUILD_ID = "987654321";
    process.env.DISCORD_TOURNAMENT_CONTROL_ROLE_IDS = "555";
    clearDiscordTournamentStaffCache();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, json: async () => ({ roles: ["555"] }) }))
    );
  });

  it("requires Discord Tournament Control authorization", async () => {
    const caller = appRouter.createCaller(ctx(null));
    await expect(
      caller.tournamentControl.createTournament({ name: "June Championship" })
    ).rejects.toThrow("Discord sign-in");
    expect(insertedValues).toHaveLength(0);
  });

  it("creates a tournament row with safe defaults", async () => {
    const caller = appRouter.createCaller(staffContext());
    const result = await caller.tournamentControl.createTournament({
      name: "  June Championship  ",
    });

    expect(result.createdTournament).toMatchObject({
      id: 1,
      name: "June Championship",
      eventStatus: "not-live",
      currentCycle: "1",
      currentStage: "check-in",
      currentMatch: null,
      eventNote: null,
    });
    expect(result.tournaments).toHaveLength(1);
  });

  it("returns a list that includes the newly created tournament", async () => {
    const caller = appRouter.createCaller(staffContext());
    const created = await caller.tournamentControl.createTournament({
      name: "July Invitational",
      eventNote: "Awaiting check-in",
    });
    const listed = await caller.tournamentControl.listTournaments();

    expect(created.tournaments.map(tournament => tournament.name)).toContain(
      "July Invitational"
    );
    expect(listed).toEqual(created.tournaments);
    expect(listed[0]).toMatchObject({
      id: created.createdTournament.id,
      eventNote: "Awaiting check-in",
    });
  });
});
