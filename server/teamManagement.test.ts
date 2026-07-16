import { beforeEach, describe, expect, it, vi } from "vitest";
import { TRPCError } from "@trpc/server";
import {
  managedTeamInvites,
  managedTeamMembers,
  managedTeams,
  users,
} from "../drizzle/schema";

type Row = Record<string, unknown>;

const state = {
  users: [] as Row[],
  managedTeams: [] as Row[],
  managedTeamMembers: [] as Row[],
  managedTeamInvites: [] as Row[],
  nextInviteId: 1,
};

function resetState() {
  state.users = [
    {
      id: 1,
      openId: "discord:100000000000000001",
      loginMethod: "discord",
      discordUsername: "captain",
    },
    {
      id: 2,
      openId: "discord:100000000000000002",
      loginMethod: "discord",
      discordUsername: "recruit",
    },
  ];
  state.managedTeams = [
    { id: 5, name: "Alpha Squad", slug: "alpha-squad", captainUserId: 1 },
  ];
  state.managedTeamMembers = [{ id: 1, teamId: 5, userId: 1, role: "captain" }];
  state.managedTeamInvites = [];
  state.nextInviteId = 1;
}

function isColumnChunk(chunk: unknown): chunk is { name: string } {
  return (
    Boolean(chunk) &&
    typeof chunk === "object" &&
    typeof (chunk as { name?: unknown }).name === "string" &&
    "table" in (chunk as object)
  );
}
// eq(column, value) wraps value in a { value, encoder } Param object; a raw
// sql`...${value}` template (used for the case-insensitive username lookup)
// embeds an unwrapped primitive directly in queryChunks instead. Both count
// as a bindable value chunk here.
function isParamChunk(
  chunk: unknown
): chunk is { value: unknown } | string | number | boolean {
  if (chunk === null || chunk === undefined) return false;
  const type = typeof chunk;
  if (type === "string" || type === "number" || type === "boolean") return true;
  return (
    type === "object" &&
    "value" in (chunk as object) &&
    "encoder" in (chunk as object)
  );
}
function paramValue(chunk: { value: unknown } | string | number | boolean) {
  return typeof chunk === "object" ? chunk.value : chunk;
}
function isSqlChunk(chunk: unknown): chunk is { queryChunks: unknown[] } {
  return (
    Boolean(chunk) &&
    typeof chunk === "object" &&
    Array.isArray((chunk as { queryChunks?: unknown }).queryChunks)
  );
}

/** Walks a drizzle eq()/and()/sql`` condition tree, collecting {column, value} equality pairs. */
function extractEqPairs(
  condition: unknown,
  pairs: { column: string; value: unknown }[] = []
) {
  if (!isSqlChunk(condition)) return pairs;
  let pendingColumn: string | null = null;
  for (const chunk of condition.queryChunks) {
    if (isSqlChunk(chunk)) {
      extractEqPairs(chunk, pairs);
      pendingColumn = null;
    } else if (isColumnChunk(chunk)) {
      pendingColumn = chunk.name;
    } else if (isParamChunk(chunk) && pendingColumn) {
      pairs.push({ column: pendingColumn, value: paramValue(chunk) });
      pendingColumn = null;
    }
  }
  return pairs;
}

function matchesCondition(row: Row, condition: unknown) {
  const pairs = extractEqPairs(condition);
  if (pairs.length === 0) return true;
  return pairs.every(({ column, value }) => row[column] === value);
}

function stateArrayFor(table: unknown): Row[] {
  if (table === users) return state.users;
  if (table === managedTeams) return state.managedTeams;
  if (table === managedTeamMembers) return state.managedTeamMembers;
  if (table === managedTeamInvites) return state.managedTeamInvites;
  throw new Error("Unhandled table in test mock");
}

function makeDb(): any {
  const db: any = {
    async transaction(callback: (tx: any) => Promise<unknown>) {
      return callback(db);
    },
    select() {
      const builder: any = {
        _table: null as unknown,
        _condition: undefined as unknown,
        from(table: unknown) {
          this._table = table;
          return this;
        },
        where(condition: unknown) {
          this._condition = condition;
          return this;
        },
        limit() {
          return this;
        },
        then(
          resolve: (rows: Row[]) => unknown,
          reject: (error: unknown) => unknown
        ) {
          const rows = stateArrayFor(this._table).filter(row =>
            matchesCondition(row, this._condition)
          );
          return Promise.resolve(rows).then(resolve, reject);
        },
      };
      return builder;
    },
    update(table: unknown) {
      return {
        set(values: Row) {
          return {
            where(condition: unknown) {
              const rows = stateArrayFor(table).filter(row =>
                matchesCondition(row, condition)
              );
              for (const row of rows) Object.assign(row, values);
              return Promise.resolve({ affectedRows: rows.length });
            },
          };
        },
      };
    },
    insert(table: unknown) {
      return {
        values(values: Row) {
          if (table === managedTeamInvites) {
            const row = { id: state.nextInviteId++, ...values };
            state.managedTeamInvites.push(row);
            return Promise.resolve({ insertId: row.id });
          }
          throw new Error("Unhandled insert table in test mock");
        },
      };
    },
  };
  return db;
}

vi.mock("./db", () => ({ getDb: vi.fn(async () => makeDb()) }));

const { inviteManagedTeamByDiscordUsername } = await import("./teamManagement");

const ORIGIN = "https://murphtournaments.example";

type FetchCall = { url: string; body: unknown };

function stubDiscordFetch(
  options: { channelOk?: boolean; messageOk?: boolean } = {}
) {
  const { channelOk = true, messageOk = true } = options;
  const calls: FetchCall[] = [];
  const fetchMock = vi.fn(async (url: string, init?: { body?: string }) => {
    calls.push({ url, body: init?.body ? JSON.parse(init.body) : undefined });
    if (url.endsWith("/users/@me/channels")) {
      return channelOk
        ? { ok: true, status: 200, json: async () => ({ id: "channel-1" }) }
        : { ok: false, status: 403, json: async () => ({}) };
    }
    if (url.includes("/channels/") && url.endsWith("/messages")) {
      return messageOk
        ? { ok: true, status: 200, json: async () => ({}) }
        : { ok: false, status: 403, json: async () => ({}) };
    }
    throw new Error(`Unexpected fetch to ${url}`);
  });
  vi.stubGlobal("fetch", fetchMock);
  return calls;
}

describe("inviteManagedTeamByDiscordUsername", () => {
  beforeEach(() => {
    resetState();
    process.env.DISCORD_BOT_TOKEN = "test-bot-token";
    vi.unstubAllGlobals();
  });

  it("creates a pending invite and sends a DM to the invited user's stored Discord ID", async () => {
    const calls = stubDiscordFetch();
    const result = await inviteManagedTeamByDiscordUsername(
      1,
      5,
      "recruit",
      ORIGIN
    );
    expect(result).toEqual({
      success: true,
      reactivated: false,
      discordDelivery: { delivered: true },
    });
    expect(state.managedTeamInvites).toMatchObject([
      { teamId: 5, invitedUserId: 2, createdByUserId: 1, status: "pending" },
    ]);
    const channelRequestBody = calls[0]?.body as { recipient_id: string };
    expect(channelRequestBody.recipient_id).toBe("100000000000000002");
  });

  it("the DM content names the team and links to a valid /teams URL", async () => {
    const calls = stubDiscordFetch();
    await inviteManagedTeamByDiscordUsername(1, 5, "recruit", ORIGIN);
    const messageBody = calls[1]?.body as { content: string };
    expect(messageBody.content).toContain("Alpha Squad");
    expect(messageBody.content).toContain(`${ORIGIN}/teams`);
    expect(() => new URL(`${ORIGIN}/teams`)).not.toThrow();
  });

  it("reactivating a declined invite sends a fresh DM", async () => {
    state.managedTeamInvites = [
      {
        id: 9,
        teamId: 5,
        invitedUserId: 2,
        createdByUserId: 1,
        status: "declined",
      },
    ];
    const calls = stubDiscordFetch();
    const result = await inviteManagedTeamByDiscordUsername(
      1,
      5,
      "recruit",
      ORIGIN
    );
    expect(result).toEqual({
      success: true,
      reactivated: true,
      discordDelivery: { delivered: true },
    });
    expect(state.managedTeamInvites[0]).toMatchObject({ status: "pending" });
    expect(calls).toHaveLength(2);
  });

  it("does not send a DM and rejects a duplicate pending invite", async () => {
    state.managedTeamInvites = [
      {
        id: 9,
        teamId: 5,
        invitedUserId: 2,
        createdByUserId: 1,
        status: "pending",
      },
    ];
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(
      inviteManagedTeamByDiscordUsername(1, 5, "recruit", ORIGIN)
    ).rejects.toMatchObject({ code: "CONFLICT" });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(state.managedTeamInvites[0]).toMatchObject({ status: "pending" });
  });

  it("leaves the invitation pending with a partial-success result when the DM fails", async () => {
    stubDiscordFetch({ channelOk: false });
    const result = await inviteManagedTeamByDiscordUsername(
      1,
      5,
      "recruit",
      ORIGIN
    );
    expect(result.discordDelivery.delivered).toBe(false);
    if (!result.discordDelivery.delivered) {
      expect(result.discordDelivery.reason).toContain("403");
    }
    expect(state.managedTeamInvites).toMatchObject([
      { teamId: 5, invitedUserId: 2, status: "pending" },
    ]);
  });

  it("missing Discord configuration leaves the invite created without corrupting or rolling it back", async () => {
    delete process.env.DISCORD_BOT_TOKEN;
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const result = await inviteManagedTeamByDiscordUsername(
      1,
      5,
      "recruit",
      ORIGIN
    );
    expect(result.discordDelivery).toEqual({
      delivered: false,
      reason: expect.stringContaining("not configured"),
    });
    expect(state.managedTeamInvites).toMatchObject([
      { teamId: 5, invitedUserId: 2, status: "pending" },
    ]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects invites from a non-captain team member without sending a DM", async () => {
    state.managedTeamMembers = [
      { id: 2, teamId: 5, userId: 3, role: "member" },
    ];
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(
      inviteManagedTeamByDiscordUsername(3, 5, "recruit", ORIGIN)
    ).rejects.toThrow(TRPCError);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(state.managedTeamInvites).toHaveLength(0);
  });

  it("rejects invites for a Discord username that has never signed in", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(
      inviteManagedTeamByDiscordUsername(1, 5, "nobody", ORIGIN)
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects invites for a user who is already on the team", async () => {
    state.managedTeamMembers.push({
      id: 2,
      teamId: 5,
      userId: 2,
      role: "member",
    });
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(
      inviteManagedTeamByDiscordUsername(1, 5, "recruit", ORIGIN)
    ).rejects.toMatchObject({ code: "CONFLICT" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
