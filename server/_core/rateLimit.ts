import { TRPCError } from "@trpc/server";
import { t } from "./trpc";

/**
 * Fixed-window rate limiting for the unauthenticated tRPC procedures.
 *
 * The public bracket viewer polls `getViewer` every five seconds and each
 * poll fans out into six database queries, so a published viewer link is an
 * unmetered database surface on a URL that gets broadcast. The tokens are
 * 256 bits, so this is not guarding against guessing — it bounds load and
 * stops a single client hammering the database.
 *
 * Counters are per process and in memory. A single Railway instance is the
 * deployment today; if the service is ever scaled out, each instance keeps
 * its own window and the effective limit multiplies by the instance count.
 * Move to a shared store before relying on this as a hard guarantee.
 */

type Window = { count: number; resetAt: number };

const windows = new Map<string, Window>();
const windowMs = 60_000;

/** Stop the map growing without bound on a long-lived process. */
function pruneExpired(now: number) {
  windows.forEach((window, key) => {
    if (window.resetAt <= now) windows.delete(key);
  });
}

let lastPrune = 0;
function maybePrune(now: number) {
  if (now - lastPrune < windowMs) return;
  lastPrune = now;
  pruneExpired(now);
}

/**
 * The caller's address, taken from the left-most X-Forwarded-For entry.
 *
 * Railway terminates TLS at a proxy, so the socket address is the proxy for
 * every caller and would put all of them in one bucket. This reads the
 * header directly rather than enabling Express `trust proxy`, which would
 * also change `req.protocol` and `req.secure` for the OAuth redirect and
 * cookie paths. The header is client-supplied and therefore spoofable: an
 * attacker can rotate it to get a fresh bucket, which is accepted here
 * because the goal is bounding accidental and casual load, not defeating a
 * determined one.
 */
function clientKey(req: {
  headers: Record<string, unknown>;
  socket?: { remoteAddress?: string | null };
  ip?: string;
}) {
  const forwarded = req.headers["x-forwarded-for"];
  const raw = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  if (typeof raw === "string" && raw.length > 0) {
    const first = raw.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.ip ?? req.socket?.remoteAddress ?? "unknown";
}

export function consumeRateLimit(
  key: string,
  limit: number,
  now = Date.now()
): { allowed: boolean; retryAfterSeconds: number } {
  const existing = windows.get(key);
  if (!existing || existing.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }
  existing.count += 1;
  if (existing.count > limit)
    return {
      allowed: false,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((existing.resetAt - now) / 1000)
      ),
    };
  return { allowed: true, retryAfterSeconds: 0 };
}

/** Exposed so tests start from a clean window. */
export function __resetRateLimits() {
  windows.clear();
  lastPrune = 0;
}

/**
 * Requests per minute, per address, per procedure.
 *
 * A viewer tab polls 12 times a minute, so `poll` leaves room for roughly
 * fifty tabs behind one address — an event venue or office NAT stays well
 * inside it while a scripted client does not. The one-shot link previews are
 * opened by hand and need far less.
 */
export const rateLimits = { poll: 600, preview: 60 } as const;

export function rateLimited(limit: number) {
  return t.middleware(async ({ ctx, path, next }) => {
    const key = `${path}:${clientKey(ctx.req as never)}`;
    const { allowed, retryAfterSeconds } = consumeRateLimit(key, limit);
    maybePrune(Date.now());
    if (!allowed)
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: `Too many requests. Try again in ${retryAfterSeconds}s.`,
      });
    return next();
  });
}
