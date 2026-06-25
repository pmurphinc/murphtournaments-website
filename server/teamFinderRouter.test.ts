import { TRPCError } from "@trpc/server";
import { describe, expect, it } from "vitest";
import type { User } from "../drizzle/schema";
import {
  TEAM_FINDER_DISCORD_REQUIRED_MESSAGE,
  teamFinderRouter,
} from "./teamFinderRouter";

const manusUser = {
  id: 42,
  openId: "manus-user",
  name: "Manus User",
  email: "manus@example.com",
  loginMethod: "manus",
  discordId: null,
  discordUsername: null,
  discordAvatarUrl: null,
  role: "user",
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
} satisfies User;

const caller = teamFinderRouter.createCaller({
  req: {},
  res: {},
  user: manusUser,
} as Parameters<typeof teamFinderRouter.createCaller>[0]);

async function expectDiscordRequired(action: () => Promise<unknown>) {
  await expect(action()).rejects.toMatchObject({
    message: TEAM_FINDER_DISCORD_REQUIRED_MESSAGE,
  } satisfies Partial<TRPCError>);
}

const playerListingInput = {
  listingType: "player" as const,
  region: "NA" as const,
  description: "Looking for a team.",
  embarkId: "Player#1234",
  mainClasses: ["Light"] as const,
};

describe("teamFinderRouter Discord identity gate", () => {
  it("requires Discord identity for myListings", async () => {
    await expectDiscordRequired(() => caller.myListings());
  });

  it("requires Discord identity for create", async () => {
    await expectDiscordRequired(() => caller.create(playerListingInput));
  });

  it("requires Discord identity for update", async () => {
    await expectDiscordRequired(() =>
      caller.update({ id: 1, ...playerListingInput })
    );
  });

  it("requires Discord identity for setStatus", async () => {
    await expectDiscordRequired(() =>
      caller.setStatus({ id: 1, status: "closed" })
    );
  });

  it("requires Discord identity for renew", async () => {
    await expectDiscordRequired(() => caller.renew({ id: 1 }));
  });

  it("requires Discord identity for delete", async () => {
    await expectDiscordRequired(() => caller.delete({ id: 1 }));
  });

  it("requires Discord identity for report", async () => {
    await expectDiscordRequired(() =>
      caller.report({ listingId: 1, reason: "spam" })
    );
  });
});
