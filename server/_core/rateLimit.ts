import { isIP } from "node:net";
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

/**
 * Ceiling on tracked keys.
 *
 * The key embeds a caller address, so without a cap the map is a write
 * primitive for anyone who can vary that address. Past the ceiling, new
 * callers share one overflow bucket: the limiter gets less precise under
 * flood, which is the moment precision matters least and bounded memory
 * matters most.
 */
const maxTrackedKeys = 50_000;
const overflowKey = "__overflow__";

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

/** RFC1918, loopback, link-local and unique-local ranges. */
function isPrivateAddress(address: string) {
  if (address.startsWith("::ffff:")) return isPrivateAddress(address.slice(7));
  if (isIP(address) === 6)
    return (
      address === "::1" || /^f[cd]/i.test(address) || /^fe80:/i.test(address)
    );
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some(Number.isNaN)) return true;
  const [a, b] = parts;
  return (
    a === 10 ||
    a === 127 ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 169 && b === 254)
  );
}

/**
 * The caller's address, read right-to-left out of X-Forwarded-For.
 *
 * Railway terminates TLS at a proxy, so the socket address is the proxy for
 * every caller and would put all of them in one bucket. The header is read
 * directly rather than by enabling Express `trust proxy`, which would also
 * change `req.protocol` and `req.secure` on the OAuth redirect and cookie
 * paths — not a change to make the week of a launch.
 *
 * Anything the client sends appears to the LEFT of what the proxy appends,
 * so scanning from the right for the first public address yields the
 * address that actually connected and ignores any chain the client invented.
 * Values that are not well-formed public IPs are never used as keys, so a
 * caller cannot mint map entries by varying the header.
 */
function clientKey(req: {
  headers: Record<string, unknown>;
  socket?: { remoteAddress?: string | null };
  ip?: string;
}) {
  const forwarded = req.headers["x-forwarded-for"];
  const raw = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  if (typeof raw === "string" && raw.length > 0) {
    const hops = raw.split(",");
    for (let i = hops.length - 1; i >= 0; i--) {
      const hop = hops[i]?.trim() ?? "";
      if (isIP(hop) && !isPrivateAddress(hop)) return hop;
    }
  }
  const direct = req.ip ?? req.socket?.remoteAddress ?? "";
  return isIP(direct) ? direct : "unknown";
}

const allowed = { allowed: true, retryAfterSeconds: 0 } as const;

function blocked(resetAt: number, now: number) {
  return {
    allowed: false,
    retryAfterSeconds: Math.max(1, Math.ceil((resetAt - now) / 1000)),
  };
}

export function consumeRateLimit(
  key: string,
  limit: number,
  now = Date.now()
): { allowed: boolean; retryAfterSeconds: number } {
  let resolvedKey = key;
  let existing = windows.get(resolvedKey);

  // A new key past the ceiling is served from the shared overflow bucket.
  // The overflow entry itself is always allowed to exist, otherwise a full
  // map would have nowhere to record the flood it is meant to bound.
  if (
    (!existing || existing.resetAt <= now) &&
    windows.size >= maxTrackedKeys
  ) {
    pruneExpired(now);
    if (windows.size >= maxTrackedKeys) {
      resolvedKey = overflowKey;
      existing = windows.get(resolvedKey);
    }
  }

  if (existing && existing.resetAt > now) {
    existing.count += 1;
    return existing.count > limit ? blocked(existing.resetAt, now) : allowed;
  }

  windows.set(resolvedKey, { count: 1, resetAt: now + windowMs });
  return allowed;
}

/** Exposed so tests start from a clean window. */
export function __resetRateLimits() {
  windows.clear();
  lastPrune = 0;
}

/** Exposed for tests asserting the keyspace stays bounded. */
export function __trackedKeyCount() {
  return windows.size;
}

export const __rateLimitInternals = {
  clientKey,
  maxTrackedKeys,
  overflowKey,
} as const;

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
