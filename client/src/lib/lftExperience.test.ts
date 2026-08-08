import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("LFT experience", () => {
  const page = readFileSync(
    new URL("../pages/TeamFinder.tsx", import.meta.url),
    "utf8"
  );
  const card = readFileSync(
    new URL("../components/TeamFinderListingCard.tsx", import.meta.url),
    "utf8"
  );
  const service = readFileSync(
    new URL("../../../server/teamFinder.ts", import.meta.url),
    "utf8"
  );
  const app = readFileSync(new URL("../App.tsx", import.meta.url), "utf8");

  it("keeps the legacy route and adds the preferred LFT route", () => {
    expect(app).toContain(
      '<Route path={"/team-finder"} component={TeamFinder} />'
    );
    expect(app).toContain('<Route path={"/lft"} component={TeamFinder} />');
  });

  it("defaults new posts to LFT without showing an LFP choice", () => {
    expect(page).toContain('listingType: "lft"');
    expect(page).not.toContain('["lfp", "Looking for Players"]');
    expect(page).toContain("LFT — Looking for Team");
    expect(page).not.toContain("window.prompt");
  });

  it("returns and renders owner avatars and Development Division membership", () => {
    expect(service).toContain("discordAvatarUrl: users.discordAvatarUrl");
    expect(service).toContain(
      "developmentDivisionMember: users.developmentDivisionMember"
    );
    expect(card).toContain("<DevelopmentDivisionAvatar");
    expect(card).toContain("src={listing.discordAvatarUrl}");
    expect(card).toContain(
      "isDevelopmentDivisionMember={listing.developmentDivisionMember}"
    );
  });
});
