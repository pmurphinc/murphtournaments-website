import { describe, expect, it } from "vitest";
import {
  sanitizeDiscordReturnPath,
  sanitizeDiscordReturnTarget,
} from "../../../server/_core/discordOAuth";
import { ARCADE_PUBLIC_URL } from "@shared/arcade";

describe("Discord OAuth return path validation", () => {
  it("permits same-site relative paths", () => {
    expect(sanitizeDiscordReturnPath("/admin/tournaments/control")).toBe(
      "/admin/tournaments/control"
    );
    expect(
      sanitizeDiscordReturnPath("/admin/tournaments/7/control?tab=rooms#top")
    ).toBe("/admin/tournaments/7/control?tab=rooms#top");
  });

  it("rejects external and protocol-relative redirect paths", () => {
    expect(sanitizeDiscordReturnPath("https://evil.example/path")).toBe(
      "/team-finder"
    );
    expect(sanitizeDiscordReturnPath("http://evil.example/path")).toBe(
      "/team-finder"
    );
    expect(sanitizeDiscordReturnPath("//evil.example/path")).toBe(
      "/team-finder"
    );
  });
});

describe("Discord OAuth return target validation", () => {
  it("still permits same-site relative paths", () => {
    expect(sanitizeDiscordReturnTarget("/team-finder")).toBe("/team-finder");
    expect(sanitizeDiscordReturnTarget("/TCR?tab=rooms#top")).toBe(
      "/TCR?tab=rooms#top"
    );
  });

  it("permits an absolute return to the arcade origin", () => {
    expect(sanitizeDiscordReturnTarget(`${ARCADE_PUBLIC_URL}/?saved=1`)).toBe(
      `${ARCADE_PUBLIC_URL}/?saved=1`
    );
  });

  it("rejects absolute returns to any other origin", () => {
    expect(sanitizeDiscordReturnTarget("https://evil.example/path")).toBe(
      "/team-finder"
    );
    expect(
      sanitizeDiscordReturnTarget(
        "https://wormhole.murphtournaments.com.evil.example/"
      )
    ).toBe("/team-finder");
    expect(sanitizeDiscordReturnTarget("//evil.example/path")).toBe(
      "/team-finder"
    );
  });
});
