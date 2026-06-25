import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TeamFinderListingType } from "@shared/teamFinder";

const getDbMock = vi.fn();

vi.mock("../../../server/db", () => ({
  getDb: getDbMock,
}));

const { listTeamFinderListings, updateTeamFinderListing } = await import(
  "../../../server/teamFinder"
);

const now = new Date("2026-06-24T12:00:00.000Z");
const future = new Date("2026-07-24T12:00:00.000Z");

function createUpdateChain() {
  const where = vi.fn(async () => undefined);
  const set = vi.fn(() => ({ where }));
  const update = vi.fn(() => ({ set }));
  return { update, set, where };
}

function createSelectChain(rowsForSelection: (selection: unknown) => unknown[]) {
  const orderBy = vi.fn(async () => currentRows);
  const limit = vi.fn(async () => currentRows);
  const where = vi.fn(() => ({ orderBy, limit }));
  const innerJoin = vi.fn(() => ({ where }));
  const from = vi.fn(() => ({ innerJoin, where, limit }));
  let currentRows: unknown[] = [];
  const select = vi.fn((selection: unknown) => {
    currentRows = rowsForSelection(selection);
    return { from };
  });
  return { select, from, innerJoin, where, orderBy, limit };
}

describe("Team Finder listing data", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns only safe public contact fields with display name and Discord username", async () => {
    const updateChain = createUpdateChain();
    const selectChain = createSelectChain(() => [
      {
        id: 10,
        ownerUserId: 7,
        listingType: "player" as TeamFinderListingType,
        status: "active",
        region: "NA",
        targetTournament: null,
        description: "Ready to play.",
        embarkId: "Embark#1234",
        mainClasses: "Light,Medium",
        preferredRole: null,
        experience: null,
        availability: null,
        twitchUrl: null,
        youtubeUrl: null,
        teamName: null,
        rosterCount: null,
        neededClass: null,
        practiceAvailability: null,
        hiddenByAdmin: 0,
        expiresAt: future,
        createdAt: now,
        updatedAt: now,
        ownerName: "Display Nick",
        ownerDiscordUsername: "realhandle",
        ownerDiscordAvatarUrl: "https://cdn.discordapp.com/avatar.png",
      },
    ]);

    getDbMock.mockResolvedValue({
      update: updateChain.update,
      select: selectChain.select,
    });

    const [listing] = await listTeamFinderListings(undefined, null);

    expect(listing.owner).toEqual({
      displayName: "Display Nick",
      discordUsername: "realhandle",
      discordAvatarUrl: "https://cdn.discordapp.com/avatar.png",
    });
    expect(JSON.stringify(listing)).not.toContain("discordId");
    expect(JSON.stringify(listing)).not.toContain("email");
    expect(JSON.stringify(listing)).not.toContain("token");
  });

  it("rejects attempts to change a listing between player and team before writing", async () => {
    const updateChain = createUpdateChain();
    const selectChain = createSelectChain(selection => {
      const keys = Object.keys(selection as Record<string, unknown>);
      if (keys.includes("listingType")) {
        return [{ ownerUserId: 7, listingType: "player" }];
      }
      return [{ ownerUserId: 7 }];
    });

    getDbMock.mockResolvedValue({
      update: updateChain.update,
      select: selectChain.select,
    });

    await expect(
      updateTeamFinderListing(
        {
          id: 10,
          listingType: "team",
          region: "NA",
          description: "Now a team listing.",
          teamName: "Switch Squad",
          rosterCount: 2,
          neededClass: "Heavy",
        },
        { userId: 7, isAdmin: false }
      )
    ).rejects.toThrow("Listing type cannot be changed after posting.");

    expect(updateChain.update).toHaveBeenCalledTimes(0);
  });
});
