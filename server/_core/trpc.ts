import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from "@shared/const";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

export const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

export const discordAuthenticatedProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;
    if (!ctx.user || ctx.user.loginMethod !== "discord") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Discord sign-in is required.",
      });
    }
    return next({ ctx: { ...ctx, user: ctx.user } });
  })
);

/**
 * Personal Tournament Control Room access.
 *
 * Personal TCR launched publicly, so the only requirement is a Discord
 * identity: a tournament has an owner, and ownership is what every
 * per-tournament guard in tournamentControl.ts checks against. Resource
 * ceilings live in PERSONAL_TCR_LIMITS rather than in an access gate.
 *
 * This replaces an invite allowlist driven by TCR_ALPHA_MODE and
 * TCR_ALPHA_ALLOWED_DISCORD_IDS. That gate failed open — any value other
 * than the exact string "true" admitted everyone — so whether the product
 * was reachable at all turned on an environment variable that appeared in
 * no committed config. Removing it makes the launched state the state the
 * code describes.
 */
export const personalTcrProcedure = discordAuthenticatedProcedure;

export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  })
);
