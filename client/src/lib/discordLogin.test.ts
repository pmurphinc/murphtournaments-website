import { describe, expect, it } from "vitest";
import { getDiscordLoginUrl, sanitizeDiscordReturnPath } from "./discordLogin";

describe("client Discord login URL", () => {
  it("builds without Manus OAuth variables and does not throw Invalid URL", () => {
    expect(() => getDiscordLoginUrl("/admin/tournaments/control")).not.toThrow();
    expect(getDiscordLoginUrl("/admin/tournaments/control")).toBe("/api/auth/discord/login?returnTo=%2Fadmin%2Ftournaments%2Fcontrol");
  });

  it("rejects unsafe return targets", () => {
    expect(sanitizeDiscordReturnPath("https://evil.example")).toBe("/");
    expect(sanitizeDiscordReturnPath("//evil.example")).toBe("/");
  });
});
