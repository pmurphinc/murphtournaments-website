import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from "@shared/const";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
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

export const TCR_ALPHA_ONLY_MESSAGE =
  "The Tournament Control Room is currently available to invited alpha testers only.";

function getDiscordId(user: { openId?: string | null }) {
  const match = user.openId?.match(/(?:^discord:|^)(\d{5,32})$/);
  return match?.[1] ?? null;
}

function getTcrAlphaAllowlist() {
  return new Set(
    (process.env.TCR_ALPHA_ALLOWED_DISCORD_IDS ?? "")
      .split(",")
      .map(id => id.trim())
      .filter(id => /^\d{5,32}$/.test(id))
  );
}

if (
  process.env.TCR_ALPHA_MODE === "true" &&
  getTcrAlphaAllowlist().size === 0
) {
  console.warn(
    "TCR alpha mode is enabled without any valid allowlisted Discord IDs; only site admins can access Personal TCR."
  );
}

export const personalTcrAlphaProcedure = discordAuthenticatedProcedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;
    const user = ctx.user;
    if (!user || user.loginMethod !== "discord")
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Discord sign-in is required.",
      });
    if (user.role === "admin" || process.env.TCR_ALPHA_MODE !== "true")
      return next({ ctx: { ...ctx, user } });
    const discordId = getDiscordId(user);
    if (!discordId || !getTcrAlphaAllowlist().has(discordId))
      throw new TRPCError({
        code: "FORBIDDEN",
        message: TCR_ALPHA_ONLY_MESSAGE,
      });
    return next({ ctx: { ...ctx, user } });
  })
);

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
