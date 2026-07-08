import { randomBytes, timingSafeEqual } from "node:crypto";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import { parse as parseCookieHeader } from "cookie";
import { z } from "zod";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { ENV } from "./env";
import { sdk } from "./sdk";

const DISCORD_AUTH_URL = "https://discord.com/oauth2/authorize";
const DISCORD_TOKEN_URL = "https://discord.com/api/oauth2/token";
const DISCORD_USER_URL = "https://discord.com/api/users/@me";
const DISCORD_STATE_COOKIE = "discord_oauth_state";
const DISCORD_RETURN_PATH_COOKIE = "discord_oauth_return_path";
const DISCORD_STATE_MAX_AGE_MS = 10 * 60 * 1000;

const discordUserSchema = z.object({
  id: z.string().regex(/^\d+$/),
  username: z.string().min(1),
  global_name: z.string().nullable().optional(),
  avatar: z.string().nullable().optional(),
});

export function getDiscordAvatarUrl(discordUser: {
  id: string;
  avatar?: string | null;
}) {
  if (discordUser.avatar) {
    const extension = discordUser.avatar.startsWith("a_") ? "gif" : "png";
    return `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.${extension}?size=128`;
  }

  const fallbackIndex = BigInt(discordUser.id) % BigInt(5);
  return `https://cdn.discordapp.com/embed/avatars/${fallbackIndex.toString()}.png`;
}

const getQueryParam = (req: Request, key: string): string | undefined => {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
};

export const isDiscordAuthenticatedUser = (
  user: { openId?: string; loginMethod?: string | null } | null | undefined
) =>
  user?.loginMethod === "discord" &&
  typeof user.openId === "string" &&
  user.openId.startsWith("discord:");

export function validateDiscordState(
  expected: string | undefined,
  actual: string | undefined
) {
  if (!expected || !actual) return false;
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(actual);
  return (
    expectedBuffer.length === actualBuffer.length &&
    timingSafeEqual(expectedBuffer, actualBuffer)
  );
}

async function exchangeDiscordCode(code: string) {
  const body = new URLSearchParams({
    client_id: ENV.discordClientId,
    client_secret: ENV.discordClientSecret,
    grant_type: "authorization_code",
    code,
    redirect_uri: ENV.discordRedirectUri,
  });
  const response = await fetch(DISCORD_TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!response.ok) throw new Error("Discord token exchange failed");
  const data = (await response.json()) as { access_token?: string };
  if (!data.access_token) throw new Error("Discord access token missing");
  return data.access_token;
}

async function fetchDiscordUser(accessToken: string) {
  const response = await fetch(DISCORD_USER_URL, {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) throw new Error("Discord user fetch failed");
  return discordUserSchema.parse(await response.json());
}

export function sanitizeDiscordReturnPath(value: unknown) {
  if (typeof value !== "string") return "/team-finder";
  if (!value.startsWith("/") || value.startsWith("//")) return "/team-finder";
  try {
    const parsed = new URL(value, "https://murphtournaments.local");
    if (parsed.origin !== "https://murphtournaments.local") return "/team-finder";
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return "/team-finder";
  }
}

function redirectError(res: Response, returnPath = "/team-finder") {
  const safePath = sanitizeDiscordReturnPath(returnPath);
  const separator = safePath.includes("?") ? "&" : "?";
  res.redirect(302, `${safePath}${separator}discord=error`);
}

export function registerDiscordOAuthRoutes(app: Express) {
  app.get("/api/auth/discord/login", (req: Request, res: Response) => {
    if (
      !ENV.discordClientId ||
      !ENV.discordClientSecret ||
      !ENV.discordRedirectUri
    ) {
      redirectError(res);
      return;
    }

    const state = randomBytes(32).toString("base64url");
    const returnPath = sanitizeDiscordReturnPath(getQueryParam(req, "returnTo"));
    res.cookie(DISCORD_STATE_COOKIE, state, {
      ...getSessionCookieOptions(req),
      httpOnly: true,
      maxAge: DISCORD_STATE_MAX_AGE_MS,
    });
    res.cookie(DISCORD_RETURN_PATH_COOKIE, returnPath, {
      ...getSessionCookieOptions(req),
      httpOnly: true,
      maxAge: DISCORD_STATE_MAX_AGE_MS,
    });

    const url = new URL(DISCORD_AUTH_URL);
    url.searchParams.set("client_id", ENV.discordClientId);
    url.searchParams.set("redirect_uri", ENV.discordRedirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "identify");
    url.searchParams.set("state", state);
    res.redirect(302, url.toString());
  });

  app.get("/api/auth/discord/callback", async (req: Request, res: Response) => {
    const cookieOptions = getSessionCookieOptions(req);
    res.clearCookie(DISCORD_STATE_COOKIE, cookieOptions);
    res.clearCookie(DISCORD_RETURN_PATH_COOKIE, cookieOptions);

    const cookies = parseCookieHeader(req.headers.cookie || "");
    const returnPath = sanitizeDiscordReturnPath(cookies[DISCORD_RETURN_PATH_COOKIE]);

    try {
      const code = getQueryParam(req, "code");
      const state = getQueryParam(req, "state");
      if (
        !code ||
        !validateDiscordState(cookies[DISCORD_STATE_COOKIE], state)
      ) {
        redirectError(res, returnPath);
        return;
      }

      const accessToken = await exchangeDiscordCode(code);
      const discordUser = await fetchDiscordUser(accessToken);
      const openId = `discord:${discordUser.id}`;
      const displayName = discordUser.global_name || discordUser.username;
      const discordAvatarUrl = getDiscordAvatarUrl(discordUser);

      await db.upsertUser({
        openId,
        name: displayName,
        loginMethod: "discord",
        discordDisplayName: displayName,
        discordUsername: discordUser.username,
        discordAvatarUrl,
        lastSignedIn: new Date(),
      });

      const sessionToken = await sdk.createSessionToken(openId, {
        appId: "murph-tournaments-website",
        name: displayName,
        expiresInMs: ONE_YEAR_MS,
      });
      res.cookie(COOKIE_NAME, sessionToken, {
        ...cookieOptions,
        maxAge: ONE_YEAR_MS,
      });
      console.log(`[Discord OAuth] Signed in Discord user ${discordUser.id}`);
      res.redirect(302, returnPath);
    } catch (error) {
      console.error(
        "[Discord OAuth] Callback failed",
        error instanceof Error ? error.message : String(error)
      );
      redirectError(res, returnPath);
    }
  });
}
