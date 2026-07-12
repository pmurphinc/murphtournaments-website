import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { isDiscordAuthenticatedUser } from "./_core/discordOAuth";
import { ENV } from "./_core/env";
import type { TrpcContext } from "./_core/context";

const guildMemberSchema = z.object({
  roles: z.array(z.string().regex(/^\d+$/)),
});
const DISCORD_API_BASE = "https://discord.com/api/v10";
const CACHE_MS = 60_000;

type DiscordTournamentRoleConfig = {
  botToken: string;
  guildId: string;
  allowedRoleIds: string[];
};

type CacheEntry = { allowed: boolean; expiresAt: number };
const cache = new Map<string, CacheEntry>();

function parseDiscordRoleIds(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map(roleId => roleId.trim())
    .filter(roleId => /^\d+$/.test(roleId));
}

export function clearDiscordTournamentStaffCache() {
  cache.clear();
}

export function getDiscordTournamentRoleConfig(): DiscordTournamentRoleConfig {
  const allowedRoleIds = new Set<string>([
    ...parseDiscordRoleIds(process.env.DISCORD_TOURNAMENT_CONTROL_ROLE_IDS),
    ...parseDiscordRoleIds(process.env.DISCORD_TOURNAMENT_ADMIN_ROLE_ID),
    ...parseDiscordRoleIds(process.env.DISCORD_TOURNAMENT_STAFF_ROLE_ID),
  ]);

  return {
    botToken: process.env.DISCORD_BOT_TOKEN ?? "",
    guildId: process.env.DISCORD_GUILD_ID ?? "",
    allowedRoleIds: Array.from(allowedRoleIds),
  };
}

export function getDiscordUserId(
  user: { openId?: string; loginMethod?: string | null } | null | undefined
) {
  if (!isDiscordAuthenticatedUser(user)) return null;
  const openId = user?.openId;
  if (!openId) return null;
  const id = openId.slice("discord:".length);
  return /^\d+$/.test(id) ? id : null;
}

export function normalizeOwnerOpenId(value: string | undefined) {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return null;
  if (/^discord:\d+$/.test(trimmed)) return trimmed;
  if (/^\d+$/.test(trimmed)) return `discord:${trimmed}`;
  return null;
}

export function isSiteOwnerOrAdmin(ctx: TrpcContext) {
  if (!ctx.user || !isDiscordAuthenticatedUser(ctx.user)) return false;
  if (ctx.user.role === "admin") return true;
  const ownerOpenId = normalizeOwnerOpenId(
    process.env.OWNER_OPEN_ID ?? ENV.ownerOpenId
  );
  return Boolean(ownerOpenId && ctx.user.openId === ownerOpenId);
}

export async function assertDiscordTournamentStaff(ctx: TrpcContext) {
  const discordUserId = getDiscordUserId(ctx.user);
  if (!discordUserId)
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Tournament Control requires Discord sign-in.",
    });

  if (isSiteOwnerOrAdmin(ctx)) return;

  const config = getDiscordTournamentRoleConfig();
  if (
    !config.botToken ||
    !config.guildId ||
    config.allowedRoleIds.length === 0
  ) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Discord Tournament Control role configuration is missing.",
    });
  }

  const cacheKey = `${config.guildId}:${discordUserId}:${config.allowedRoleIds.join(",")}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    if (cached.allowed) return;
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Tournament Control role required.",
    });
  }

  try {
    const response = await fetch(
      `${DISCORD_API_BASE}/guilds/${config.guildId}/members/${discordUserId}`,
      {
        headers: { authorization: `Bot ${config.botToken}` },
      }
    );
    if (!response.ok)
      throw new Error(`Discord member lookup failed with ${response.status}`);
    const member = guildMemberSchema.parse(await response.json());
    const allowedRoles = new Set(config.allowedRoleIds);
    const allowed = member.roles.some(roleId => allowedRoles.has(roleId));
    cache.set(cacheKey, { allowed, expiresAt: Date.now() + CACHE_MS });
    if (!allowed)
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Tournament Control role required.",
      });
  } catch (error) {
    if (error instanceof TRPCError) throw error;
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Unable to verify Discord server membership or roles.",
    });
  }
}
