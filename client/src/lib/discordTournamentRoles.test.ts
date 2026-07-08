import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TRPCError } from "@trpc/server";
import { assertDiscordTournamentStaff, clearDiscordTournamentStaffCache } from "../../../server/discordTournamentRoles";
import type { TrpcContext } from "../../../server/_core/context";
import { appRouter } from "../../../server/routers";

const OLD_ENV = { ...process.env };

function ctx(user: Partial<NonNullable<TrpcContext["user"]>> | null): TrpcContext {
  return { user, req: { protocol: "https", headers: {}, get: () => "localhost" }, res: { clearCookie: vi.fn(), cookie: vi.fn() } } as unknown as TrpcContext;
}

function configureRoles() {
  process.env.DISCORD_BOT_TOKEN = "bot-token";
  process.env.DISCORD_GUILD_ID = "100";
  process.env.DISCORD_TOURNAMENT_ADMIN_ROLE_ID = "200";
  process.env.DISCORD_TOURNAMENT_STAFF_ROLE_ID = "300";
}

function mockMember(roles: string[], ok = true, status = 200) {
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok, status, json: async () => ({ roles }) })));
}

beforeEach(() => {
  process.env = { ...OLD_ENV };
  clearDiscordTournamentStaffCache();
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
  process.env = { ...OLD_ENV };
});

describe("Discord Tournament Control role authorization", () => {
  it("denies non-Discord users", async () => {
    configureRoles();
    await expect(assertDiscordTournamentStaff(ctx({ openId: "user:1", loginMethod: "google", role: "admin" }))).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("allows a user with the configured Discord Admin role", async () => {
    configureRoles();
    mockMember(["200"]);
    await expect(assertDiscordTournamentStaff(ctx({ openId: "discord:123", loginMethod: "discord" }))).resolves.toBeUndefined();
  });

  it("allows a user with the configured Discord Staff role", async () => {
    configureRoles();
    mockMember(["300"]);
    await expect(assertDiscordTournamentStaff(ctx({ openId: "discord:123", loginMethod: "discord" }))).resolves.toBeUndefined();
  });

  it("rejects users with neither configured role", async () => {
    configureRoles();
    mockMember(["999"]);
    await expect(assertDiscordTournamentStaff(ctx({ openId: "discord:123", loginMethod: "discord" }))).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects users who are not members of the configured guild", async () => {
    configureRoles();
    mockMember([], false, 404);
    await expect(assertDiscordTournamentStaff(ctx({ openId: "discord:123", loginMethod: "discord" }))).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("fails closed when required Discord guild configuration is missing", async () => {
    process.env.DISCORD_BOT_TOKEN = "bot-token";
    await expect(assertDiscordTournamentStaff(ctx({ openId: "discord:123", loginMethod: "discord" }))).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("does not use users.role as a fallback authorization path", async () => {
    configureRoles();
    mockMember(["999"]);
    await expect(assertDiscordTournamentStaff(ctx({ openId: "discord:123", loginMethod: "discord", role: "admin" }))).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("keeps non-tournament adminProcedure behavior untouched", async () => {
    const caller = appRouter.createCaller(ctx({ id: 1, openId: "user:1", loginMethod: "google", role: "admin" }));
    await expect(caller.teamFinder.setHidden({ id: 1, hiddenByAdmin: false })).rejects.not.toThrow("required permission");
  });
});
