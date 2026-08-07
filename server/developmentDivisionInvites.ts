import { and, desc, eq, sql } from "drizzle-orm";
import { createHash, randomBytes } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { developmentDivisionInviteLinks, users } from "../drizzle/schema";
import { getDb } from "./db";

type InviteStatus = "active" | "revoked";

export const DEFAULT_DEVELOPMENT_DIVISION_INVITE_DAYS = 90;
export const DEFAULT_DEVELOPMENT_DIVISION_INVITE_MAX_USES = 100;

export function hashDevelopmentDivisionInviteToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function createDevelopmentDivisionInvitePath(token: string) {
  return `/invite/development-division/${encodeURIComponent(token)}`;
}

export function getDevelopmentDivisionInviteState(link: {
  status: InviteStatus;
  expiresAt: Date | null;
  maxUses: number | null;
  useCount: number;
}) {
  const expired = !!link.expiresAt && link.expiresAt.getTime() <= Date.now();
  const full = link.maxUses !== null && link.useCount >= link.maxUses;
  const revoked = link.status === "revoked";
  return {
    active: !revoked && !expired && !full,
    expired,
    full,
    revoked,
  };
}

async function dbOrThrow() {
  const db = await getDb();
  if (!db)
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Database unavailable",
    });
  return db;
}

function inviteUnavailableMessage(
  state: ReturnType<typeof getDevelopmentDivisionInviteState>
) {
  if (state.revoked)
    return "This Development Division invite has been revoked.";
  if (state.expired) return "This Development Division invite has expired.";
  if (state.full)
    return "This Development Division invite has reached its member limit.";
  return "This Development Division invite is unavailable.";
}

export async function previewDevelopmentDivisionInvite(token: string) {
  const db = await dbOrThrow();
  const [link] = await db
    .select()
    .from(developmentDivisionInviteLinks)
    .where(
      eq(
        developmentDivisionInviteLinks.tokenHash,
        hashDevelopmentDivisionInviteToken(token)
      )
    )
    .limit(1);

  if (!link)
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Development Division invite not found.",
    });

  return {
    id: link.id,
    expiresAt: link.expiresAt,
    maxUses: link.maxUses,
    useCount: link.useCount,
    ...getDevelopmentDivisionInviteState(link),
  };
}

export async function createDevelopmentDivisionInvite(input: {
  createdByUserId: number;
  expiresInDays: number | null;
  maxUses: number | null;
}) {
  const db = await dbOrThrow();
  const token = randomBytes(32).toString("base64url");
  const expiresAt =
    input.expiresInDays === null
      ? null
      : new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000);

  await db.insert(developmentDivisionInviteLinks).values({
    createdByUserId: input.createdByUserId,
    tokenHash: hashDevelopmentDivisionInviteToken(token),
    expiresAt,
    maxUses: input.maxUses,
  });

  const [created] = await db
    .select()
    .from(developmentDivisionInviteLinks)
    .where(
      eq(
        developmentDivisionInviteLinks.tokenHash,
        hashDevelopmentDivisionInviteToken(token)
      )
    )
    .limit(1);

  return {
    ...created,
    path: createDevelopmentDivisionInvitePath(token),
  };
}

export async function listDevelopmentDivisionInvites() {
  const db = await dbOrThrow();
  const rows = await db
    .select({
      id: developmentDivisionInviteLinks.id,
      status: developmentDivisionInviteLinks.status,
      expiresAt: developmentDivisionInviteLinks.expiresAt,
      maxUses: developmentDivisionInviteLinks.maxUses,
      useCount: developmentDivisionInviteLinks.useCount,
      createdAt: developmentDivisionInviteLinks.createdAt,
      creator: {
        name: users.name,
        discordDisplayName: users.discordDisplayName,
        discordUsername: users.discordUsername,
      },
    })
    .from(developmentDivisionInviteLinks)
    .innerJoin(
      users,
      eq(developmentDivisionInviteLinks.createdByUserId, users.id)
    )
    .orderBy(desc(developmentDivisionInviteLinks.createdAt));

  return rows.map(row => ({
    ...row,
    ...getDevelopmentDivisionInviteState(row),
  }));
}

export async function revokeDevelopmentDivisionInvite(inviteId: number) {
  const db = await dbOrThrow();
  const [link] = await db
    .select({ id: developmentDivisionInviteLinks.id })
    .from(developmentDivisionInviteLinks)
    .where(eq(developmentDivisionInviteLinks.id, inviteId))
    .limit(1);
  if (!link)
    throw new TRPCError({ code: "NOT_FOUND", message: "Invite not found." });

  await db
    .update(developmentDivisionInviteLinks)
    .set({ status: "revoked", updatedAt: sql`now()` })
    .where(eq(developmentDivisionInviteLinks.id, inviteId));
  return { success: true } as const;
}

export async function claimDevelopmentDivisionInvite(
  userId: number,
  token: string
) {
  const db = await dbOrThrow();
  return db.transaction(async tx => {
    const tokenHash = hashDevelopmentDivisionInviteToken(token);
    // Serialize claims for this link so simultaneous requests cannot exceed
    // the member limit. Lock the user too, preventing a double-click from
    // counting the same account twice.
    await tx.execute(sql`
      SELECT id
      FROM development_division_invite_links
      WHERE tokenHash = ${tokenHash}
      LIMIT 1
      FOR UPDATE
    `);
    await tx.execute(sql`
      SELECT id
      FROM users
      WHERE id = ${userId}
      LIMIT 1
      FOR UPDATE
    `);
    const [link] = await tx
      .select()
      .from(developmentDivisionInviteLinks)
      .where(eq(developmentDivisionInviteLinks.tokenHash, tokenHash))
      .limit(1);
    if (!link)
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Development Division invite not found.",
      });

    const state = getDevelopmentDivisionInviteState(link);
    if (!state.active)
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: inviteUnavailableMessage(state),
      });

    const [user] = await tx
      .select({
        id: users.id,
        developmentDivisionMember: users.developmentDivisionMember,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!user)
      throw new TRPCError({ code: "NOT_FOUND", message: "User not found." });
    if (user.developmentDivisionMember === 1)
      return { success: true, alreadyMember: true } as const;

    await tx
      .update(users)
      .set({ developmentDivisionMember: 1, updatedAt: sql`now()` })
      .where(eq(users.id, userId));
    await tx
      .update(developmentDivisionInviteLinks)
      .set({
        useCount: sql`${developmentDivisionInviteLinks.useCount} + 1`,
        updatedAt: sql`now()`,
      })
      .where(
        and(
          eq(developmentDivisionInviteLinks.id, link.id),
          eq(developmentDivisionInviteLinks.status, "active")
        )
      );

    return { success: true, alreadyMember: false } as const;
  });
}
