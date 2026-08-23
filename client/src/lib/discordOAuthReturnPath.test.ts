import { describe, expect, it } from "vitest";
import { sanitizeDiscordReturnPath } from "../../../server/_core/discordOAuth";

describe("Discord OAuth return path validation", () => {
  it("permits same-site relative paths", () => {
    expect(sanitizeDiscordReturnPath("/admin/tournaments/control")).toBe("/admin/tournaments/control");
    expect(sanitizeDiscordReturnPath("/admin/tournaments/7/control?tab=rooms#top")).toBe("/admin/tournaments/7/control?tab=rooms#top");
  });

  it("permits the exact Wormhole Arcade production origin", () => {
    expect(
      sanitizeDiscordReturnPath("https://wormhole.murphtournaments.com/")
    ).toBe("https://wormhole.murphtournaments.com/");
    expect(
      sanitizeDiscordReturnPath("https://wormhole.murphtournaments.com/?discord=save#result")
    ).toBe("https://wormhole.murphtournaments.com/?discord=save#result");
  });

  it("rejects external and protocol-relative redirect paths", () => {
    expect(sanitizeDiscordReturnPath("https://evil.example/path")).toBe("/team-finder");
    expect(sanitizeDiscordReturnPath("http://evil.example/path")).toBe("/team-finder");
    expect(sanitizeDiscordReturnPath("//evil.example/path")).toBe("/team-finder");
    expect(sanitizeDiscordReturnPath("http://wormhole.murphtournaments.com/")).toBe("/team-finder");
    expect(sanitizeDiscordReturnPath("https://wormhole.murphtournaments.com.evil.example/")).toBe("/team-finder");
    expect(sanitizeDiscordReturnPath("https://evil.example/?next=https://wormhole.murphtournaments.com")).toBe("/team-finder");
  });
});
