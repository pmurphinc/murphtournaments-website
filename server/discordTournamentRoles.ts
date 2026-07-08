import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { isDiscordAuthenticatedUser } from "./_core/discordOAuth";
import type { TrpcContext } from "./_core/context";

const guildMemberSchema = z.object({ roles: z.array(z.string().regex(/^\d+$/)) });
const DISCORD_API_BASE = "https://discord.com/api/v10";
const CACHE_MS = 60_000;

type CacheEntry = { allowed: boolean; expiresAt: number };
const cache = new Map<string, CacheEntry>();

export function clearDiscordTournamentStaffCache() { cache.clear(); }

export function getDiscordTournamentRoleConfig() {
  return {
    botToken: process.env.DISCORD_BOT_TOKEN ?? "",
    guildId: process.env.DISCORD_GUILD_ID ?? "",
    adminRoleId: process.env.DISCORD_TOURNAMENT_ADMIN_ROLE_ID ?? "",
    staffRoleId: process.env.DISCORD_TOURNAMENT_STAFF_ROLE_ID ?? "",
  };
}

export function getDiscordUserId(user: { openId?: string; loginMethod?: string | null } | null | undefined) {
  if (!isDiscordAuthenticatedUser(user)) return null;
  const openId = user?.openId;
  if (!openId) return null;
  const id = openId.slice("discord:".length);
  return /^\d+$/.test(id) ? id : null;
}

export async function assertDiscordTournamentStaff(ctx: TrpcContext) {
  const discordUserId = getDiscordUserId(ctx.user);
  if (!discordUserId) throw new TRPCError({ code: "FORBIDDEN", message: "Tournament Control requires Discord sign-in." });

  const config = getDiscordTournamentRoleConfig();
  if (!config.botToken || !config.guildId || !config.adminRoleId || !config.staffRoleId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Discord Tournament Control role configuration is missing." });
  }

  const cacheKey = `${config.guildId}:${discordUserId}:${config.adminRoleId}:${config.staffRoleId}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    if (cached.allowed) return;
    throw new TRPCError({ code: "FORBIDDEN", message: "Discord Admin or Staff role required." });
  }

  try {
    const response = await fetch(`${DISCORD_API_BASE}/guilds/${config.guildId}/members/${discordUserId}`, {
      headers: { authorization: `Bot ${config.botToken}` },
    });
    if (!response.ok) throw new Error(`Discord member lookup failed with ${response.status}`);
    const member = guildMemberSchema.parse(await response.json());
    const allowed = member.roles.includes(config.adminRoleId) || member.roles.includes(config.staffRoleId);
    cache.set(cacheKey, { allowed, expiresAt: Date.now() + CACHE_MS });
    if (!allowed) throw new TRPCError({ code: "FORBIDDEN", message: "Discord Admin or Staff role required." });
  } catch (error) {
    if (error instanceof TRPCError) throw error;
    throw new TRPCError({ code: "FORBIDDEN", message: "Unable to verify Discord server membership or roles." });
  }
}
