import { describe, expect, it } from "vitest";
import { sanitizeDiscordReturnPath } from "../../../server/_core/discordOAuth";

describe("Discord OAuth return path validation", () => {
  it("permits same-site relative paths", () => {
    expect(sanitizeDiscordReturnPath("/admin/tournaments/control")).toBe("/admin/tournaments/control");
    expect(sanitizeDiscordReturnPath("/admin/tournaments/7/control?tab=rooms#top")).toBe("/admin/tournaments/7/control?tab=rooms#top");
  });

  it("rejects external and protocol-relative redirect paths", () => {
    expect(sanitizeDiscordReturnPath("https://evil.example/path")).toBe("/team-finder");
    expect(sanitizeDiscordReturnPath("http://evil.example/path")).toBe("/team-finder");
    expect(sanitizeDiscordReturnPath("//evil.example/path")).toBe("/team-finder");
  });
});
