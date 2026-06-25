import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import axios from "axios";
import { parse as parseCookieHeader } from "cookie";
import { randomBytes } from "node:crypto";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { ENV } from "./env";
import { sdk } from "./sdk";

/**
 * Discord OAuth2 sign-in.
 *
 * This flow runs entirely alongside the existing Manus OAuth implementation and
 * reuses the same signed-JWT session cookie, so `protectedProcedure`,
 * `adminProcedure`, `auth.me`, and logout keep working unchanged. Discord users
 * are stored in the shared `users` table with a synthetic, namespaced openId
 * (`discord:<discordId>`) so they never collide with Manus openIds, and the
 * Discord access token is discarded immediately after the profile fetch — it is
 * never persisted or sent to the browser.
 */

const DISCORD_AUTHORIZE_URL = "https://discord.com/oauth2/authorize";
const DISCORD_TOKEN_URL = "https://discord.com/api/oauth2/token";
const DISCORD_USER_URL = "https://discord.com/api/users/@me";
const DISCORD_SCOPE = "identify";

/** Short-lived cookie that carries the CSRF state + post-login redirect. */
const DISCORD_STATE_COOKIE = "discord_oauth_state";
const STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes

const DISCORD_OPEN_ID_PREFIX = "discord:";

type DiscordUser = {
  id: string;
  username: string;
  global_name?: string | null;
  discriminator?: string | null;
  avatar?: string | null;
};

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

/** Resolve the OAuth redirect URI, preferring an explicit env override. */
function resolveRedirectUri(req: Request): string {
  if (ENV.discordRedirectUri && ENV.discordRedirectUri.length > 0) {
    return ENV.discordRedirectUri;
  }
  const forwardedProto = req.headers["x-forwarded-proto"];
  const proto = Array.isArray(forwardedProto)
    ? forwardedProto[0]
    : (forwardedProto?.split(",")[0]?.trim() ?? req.protocol);
  const host = req.get("host");
  return `${proto}://${host}/api/auth/discord/callback`;
}

/** Build the absolute Discord avatar URL from the profile hash. */
function buildAvatarUrl(user: DiscordUser): string | null {
  if (!user.avatar) return null;
  const extension = user.avatar.startsWith("a_") ? "gif" : "png";
  return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${extension}?size=128`;
}

/** Prefer the modern global display name, falling back to the handle. */
function resolveDisplayName(user: DiscordUser): string {
  if (user.global_name && user.global_name.length > 0) return user.global_name;
  return resolveDiscordUsername(user);
}

/** Resolve the public Discord handle that other users can contact. */
function resolveDiscordUsername(user: DiscordUser): string {
  if (user.discriminator && user.discriminator !== "0") {
    return `${user.username}#${user.discriminator}`;
  }
  return user.username;
}

function isConfigured(): boolean {
  return ENV.discordClientId.length > 0 && ENV.discordClientSecret.length > 0;
}

export function registerDiscordOAuthRoutes(app: Express) {
  // Step 1: redirect the user to Discord's consent screen.
  app.get("/api/auth/discord/login", (req: Request, res: Response) => {
    if (!isConfigured()) {
      res
        .status(503)
        .json({ error: "Discord sign-in is not configured on this server." });
      return;
    }

    const redirectUri = resolveRedirectUri(req);
    const csrfToken = randomBytes(16).toString("hex");

    // Sanitize the post-login redirect to a same-site relative path only.
    const rawRedirect = getQueryParam(req, "redirect") ?? "/team-finder";
    const safeRedirect =
      rawRedirect.startsWith("/") && !rawRedirect.startsWith("//")
        ? rawRedirect
        : "/team-finder";

    const statePayload = JSON.stringify({
      csrf: csrfToken,
      redirect: safeRedirect,
    });
    const state = Buffer.from(statePayload).toString("base64url");

    const cookieOptions = getSessionCookieOptions(req);
    res.cookie(DISCORD_STATE_COOKIE, state, {
      ...cookieOptions,
      maxAge: STATE_TTL_MS,
    });

    const authorizeUrl = new URL(DISCORD_AUTHORIZE_URL);
    authorizeUrl.searchParams.set("client_id", ENV.discordClientId);
    authorizeUrl.searchParams.set("response_type", "code");
    authorizeUrl.searchParams.set("scope", DISCORD_SCOPE);
    authorizeUrl.searchParams.set("redirect_uri", redirectUri);
    authorizeUrl.searchParams.set("state", state);
    authorizeUrl.searchParams.set("prompt", "consent");

    res.redirect(302, authorizeUrl.toString());
  });

  // Step 2: handle the callback, exchange the code, and start a session.
  app.get("/api/auth/discord/callback", async (req: Request, res: Response) => {
    if (!isConfigured()) {
      res
        .status(503)
        .json({ error: "Discord sign-in is not configured on this server." });
      return;
    }

    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");
    const parsedCookies = parseCookieHeader(req.headers.cookie ?? "");
    const cookieState = parsedCookies[DISCORD_STATE_COOKIE];

    // Always clear the one-time state cookie.
    const cookieOptions = getSessionCookieOptions(req);
    res.clearCookie(DISCORD_STATE_COOKIE, { ...cookieOptions, maxAge: -1 });

    if (!code || !state) {
      res.status(400).send("Missing code or state from Discord.");
      return;
    }

    // CSRF protection: the state echoed back must match our state cookie.
    if (!cookieState || cookieState !== state) {
      res.status(400).send("Invalid OAuth state. Please try signing in again.");
      return;
    }

    let redirectTarget = "/team-finder";
    try {
      const decoded = JSON.parse(
        Buffer.from(state, "base64url").toString("utf8")
      ) as { csrf?: string; redirect?: string };
      if (
        decoded.redirect &&
        decoded.redirect.startsWith("/") &&
        !decoded.redirect.startsWith("//")
      ) {
        redirectTarget = decoded.redirect;
      }
    } catch {
      // Fall back to the default redirect target.
    }

    try {
      const redirectUri = resolveRedirectUri(req);

      // Exchange the authorization code for an access token (form-encoded).
      const tokenResponse = await axios.post<{ access_token: string }>(
        DISCORD_TOKEN_URL,
        new URLSearchParams({
          client_id: ENV.discordClientId,
          client_secret: ENV.discordClientSecret,
          grant_type: "authorization_code",
          code,
          redirect_uri: redirectUri,
        }).toString(),
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );

      const accessToken = tokenResponse.data.access_token;
      if (!accessToken) {
        res.status(502).send("Discord did not return an access token.");
        return;
      }

      // Fetch the user's basic profile, then discard the token.
      const profileResponse = await axios.get<DiscordUser>(DISCORD_USER_URL, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const profile = profileResponse.data;

      if (!profile?.id) {
        res.status(502).send("Discord profile was missing an id.");
        return;
      }

      const openId = `${DISCORD_OPEN_ID_PREFIX}${profile.id}`;
      const displayName = resolveDisplayName(profile);
      const discordUsername = resolveDiscordUsername(profile);
      const avatarUrl = buildAvatarUrl(profile);

      await db.upsertUser({
        openId,
        name: displayName,
        loginMethod: "discord",
        discordId: profile.id,
        discordUsername,
        discordAvatarUrl: avatarUrl,
        lastSignedIn: new Date(),
      });

      // Issue the same signed-JWT session cookie used by Manus OAuth.
      const sessionToken = await sdk.signSession(
        {
          openId,
          appId: ENV.appId,
          name: displayName,
        },
        { expiresInMs: ONE_YEAR_MS }
      );

      res.cookie(COOKIE_NAME, sessionToken, {
        ...cookieOptions,
        maxAge: ONE_YEAR_MS,
      });

      res.redirect(302, redirectTarget);
    } catch (error) {
      console.error("[DiscordOAuth] Callback failed", error);
      res.status(500).send("Discord sign-in failed. Please try again later.");
    }
  });
}
