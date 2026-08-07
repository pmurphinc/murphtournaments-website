import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  createDevelopmentDivisionInvitePath,
  getDevelopmentDivisionInviteState,
  hashDevelopmentDivisionInviteToken,
} from "../../../server/developmentDivisionInvites";

const appSource = readFileSync("client/src/App.tsx", "utf8");
const navigationSource = readFileSync(
  "client/src/components/Navigation.tsx",
  "utf8"
);
const avatarSource = readFileSync(
  "client/src/components/DevelopmentDivisionAvatar.tsx",
  "utf8"
);

describe("Development Division membership UI", () => {
  it("registers the private claim route and organizer management route", () => {
    expect(appSource).toContain("/invite/development-division/:token");
    expect(appSource).toContain("/admin/development-division");
  });

  it("shows the member badge in account navigation", () => {
    expect(navigationSource).toContain("DevelopmentDivisionAvatar");
    expect(navigationSource).toContain("Development Division Member");
    expect(avatarSource).toContain("/images/development-division-badge.png");
    expect(avatarSource).toContain("Development Division member badge");
  });
});

describe("Development Division invite security", () => {
  it("stores a one-way token hash and builds the claim path", () => {
    const token = "private token/with spaces";
    expect(hashDevelopmentDivisionInviteToken(token)).toMatch(/^[a-f0-9]{64}$/);
    expect(hashDevelopmentDivisionInviteToken(token)).not.toContain(token);
    expect(createDevelopmentDivisionInvitePath(token)).toBe(
      "/invite/development-division/private%20token%2Fwith%20spaces"
    );
  });

  it("marks active links as claimable", () => {
    expect(
      getDevelopmentDivisionInviteState({
        status: "active",
        expiresAt: new Date(Date.now() + 60_000),
        maxUses: 25,
        useCount: 4,
      })
    ).toEqual({ active: true, expired: false, full: false, revoked: false });
  });

  it.each([
    {
      link: {
        status: "revoked" as const,
        expiresAt: null,
        maxUses: null,
        useCount: 0,
      },
      reason: "revoked",
    },
    {
      link: {
        status: "active" as const,
        expiresAt: new Date(Date.now() - 60_000),
        maxUses: null,
        useCount: 0,
      },
      reason: "expired",
    },
    {
      link: {
        status: "active" as const,
        expiresAt: null,
        maxUses: 5,
        useCount: 5,
      },
      reason: "full",
    },
  ])("blocks a $reason link", ({ link }) => {
    expect(getDevelopmentDivisionInviteState(link).active).toBe(false);
  });
});
