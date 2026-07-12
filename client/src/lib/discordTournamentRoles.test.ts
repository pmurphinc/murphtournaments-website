import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TRPCError } from "@trpc/server";
import {
  assertDiscordTournamentStaff,
  clearDiscordTournamentStaffCache,
  normalizeOwnerOpenId,
} from "../../../server/discordTournamentRoles";
import type { TrpcContext } from "../../../server/_core/context";
import { appRouter } from "../../../server/routers";

const OLD_ENV = { ...process.env };

function ctx(
  user: Partial<NonNullable<TrpcContext["user"]>> | null
): TrpcContext {
  return {
    user,
    req: { protocol: "https", headers: {}, get: () => "localhost" },
    res: { clearCookie: vi.fn(), cookie: vi.fn() },
  } as unknown as TrpcContext;
}

function configureRoles() {
  process.env.DISCORD_BOT_TOKEN = "bot-token";
  process.env.DISCORD_GUILD_ID = "100";
  process.env.DISCORD_TOURNAMENT_ADMIN_ROLE_ID = "200";
  process.env.DISCORD_TOURNAMENT_STAFF_ROLE_ID = "300";
}

function configureControlRolesOnly() {
  process.env.DISCORD_BOT_TOKEN = "bot-token";
  process.env.DISCORD_GUILD_ID = "100";
  process.env.DISCORD_TOURNAMENT_CONTROL_ROLE_IDS = "400, 500,600";
  delete process.env.DISCORD_TOURNAMENT_ADMIN_ROLE_ID;
  delete process.env.DISCORD_TOURNAMENT_STAFF_ROLE_ID;
}

function mockMember(roles: string[], ok = true, status = 200) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ ok, status, json: async () => ({ roles }) }))
  );
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
    await expect(
      assertDiscordTournamentStaff(
        ctx({ openId: "user:1", loginMethod: "google", role: "admin" })
      )
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("allows a user with a role listed in DISCORD_TOURNAMENT_CONTROL_ROLE_IDS", async () => {
    configureControlRolesOnly();
    mockMember(["500"]);
    await expect(
      assertDiscordTournamentStaff(
        ctx({ openId: "discord:123", loginMethod: "discord" })
      )
    ).resolves.toBeUndefined();
  });

  it("allows a user with the configured legacy Discord Admin role", async () => {
    configureRoles();
    mockMember(["200"]);
    await expect(
      assertDiscordTournamentStaff(
        ctx({ openId: "discord:123", loginMethod: "discord" })
      )
    ).resolves.toBeUndefined();
  });

  it("allows a user with the configured legacy Discord Staff role", async () => {
    configureRoles();
    mockMember(["300"]);
    await expect(
      assertDiscordTournamentStaff(
        ctx({ openId: "discord:123", loginMethod: "discord" })
      )
    ).resolves.toBeUndefined();
  });

  it("rejects users with neither configured role", async () => {
    configureRoles();
    mockMember(["999"]);
    await expect(
      assertDiscordTournamentStaff(
        ctx({ openId: "discord:123", loginMethod: "discord" })
      )
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects users who are not members of the configured guild", async () => {
    configureRoles();
    mockMember([], false, 404);
    await expect(
      assertDiscordTournamentStaff(
        ctx({ openId: "discord:123", loginMethod: "discord" })
      )
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("keeps Discord API verification failures distinct from missing-role denials", async () => {
    configureRoles();
    mockMember([], false, 503);
    await expect(
      assertDiscordTournamentStaff(
        ctx({ openId: "discord:123", loginMethod: "discord" })
      )
    ).rejects.toMatchObject({
      message: "Unable to verify Discord server membership or roles.",
    });
  });

  it("fails closed when required Discord guild configuration is missing", async () => {
    process.env.DISCORD_BOT_TOKEN = "bot-token";
    await expect(
      assertDiscordTournamentStaff(
        ctx({ openId: "discord:123", loginMethod: "discord" })
      )
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("fails closed when no role configuration exists", async () => {
    process.env.DISCORD_BOT_TOKEN = "bot-token";
    process.env.DISCORD_GUILD_ID = "100";
    delete process.env.DISCORD_TOURNAMENT_CONTROL_ROLE_IDS;
    delete process.env.DISCORD_TOURNAMENT_ADMIN_ROLE_ID;
    delete process.env.DISCORD_TOURNAMENT_STAFF_ROLE_ID;
    mockMember(["200"]);
    await expect(
      assertDiscordTournamentStaff(
        ctx({ openId: "discord:123", loginMethod: "discord" })
      )
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("allows a Discord-authenticated database admin before Discord role lookup", async () => {
    configureRoles();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(
      assertDiscordTournamentStaff(
        ctx({ openId: "discord:123", loginMethod: "discord", role: "admin" })
      )
    ).resolves.toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("allows a Discord-authenticated database admin when role env vars are absent", async () => {
    delete process.env.DISCORD_BOT_TOKEN;
    delete process.env.DISCORD_GUILD_ID;
    delete process.env.DISCORD_TOURNAMENT_CONTROL_ROLE_IDS;
    delete process.env.DISCORD_TOURNAMENT_ADMIN_ROLE_ID;
    delete process.env.DISCORD_TOURNAMENT_STAFF_ROLE_ID;
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(
      assertDiscordTournamentStaff(
        ctx({ openId: "discord:123", loginMethod: "discord", role: "admin" })
      )
    ).resolves.toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("allows configured owner IDs with prefixed, numeric, and whitespace formats", async () => {
    for (const ownerOpenId of ["discord:123", "123", " 123 "]) {
      process.env.OWNER_OPEN_ID = ownerOpenId;
      clearDiscordTournamentStaffCache();
      const fetchMock = vi.fn();
      vi.stubGlobal("fetch", fetchMock);
      await expect(
        assertDiscordTournamentStaff(
          ctx({ openId: "discord:123", loginMethod: "discord", role: "user" })
        )
      ).resolves.toBeUndefined();
      expect(fetchMock).not.toHaveBeenCalled();
    }
  });

  it("does not match unrelated or invalid owner IDs", async () => {
    configureRoles();
    process.env.OWNER_OPEN_ID = "discord:456";
    mockMember(["999"]);
    await expect(
      assertDiscordTournamentStaff(
        ctx({ openId: "discord:123", loginMethod: "discord", role: "user" })
      )
    ).rejects.toMatchObject({
      message: "Tournament Control role required.",
    });
    expect(normalizeOwnerOpenId("not-a-discord-id")).toBeNull();
  });

  it("does not let cached denial block a Discord-authenticated admin or configured owner", async () => {
    configureRoles();
    mockMember(["999"]);
    await expect(
      assertDiscordTournamentStaff(
        ctx({ openId: "discord:123", loginMethod: "discord", role: "user" })
      )
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      assertDiscordTournamentStaff(
        ctx({ openId: "discord:123", loginMethod: "discord", role: "admin" })
      )
    ).resolves.toBeUndefined();
    process.env.OWNER_OPEN_ID = "123";
    await expect(
      assertDiscordTournamentStaff(
        ctx({ openId: "discord:123", loginMethod: "discord", role: "user" })
      )
    ).resolves.toBeUndefined();
  });

  it("keeps non-tournament adminProcedure behavior untouched", async () => {
    const caller = appRouter.createCaller(
      ctx({ id: 1, openId: "user:1", loginMethod: "google", role: "admin" })
    );
    await expect(
      caller.teamFinder.setHidden({ id: 1, hiddenByAdmin: false })
    ).rejects.not.toThrow("required permission");
  });
});
