import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

type RailpackConfig = {
  $schema?: string;
  buildAptPackages?: string[];
  deploy?: {
    startCommand?: string;
    aptPackages?: string[];
  };
};

function readRailpackConfig(): RailpackConfig {
  return JSON.parse(
    readFileSync(path.resolve("railpack.json"), "utf8")
  ) as RailpackConfig;
}

describe("railpack deployment config", () => {
  it("keeps Railway runtime startup on the production Node server", () => {
    const config = readRailpackConfig();

    expect(config.deploy?.startCommand).toBe("pnpm start");
  });

  it("installs VOD capture system binaries in the final runtime image", () => {
    const config = readRailpackConfig();

    expect(config.deploy?.aptPackages).toEqual(["ffmpeg", "yt-dlp"]);
    expect(config.deploy?.aptPackages).not.toContain("yt-dlp-light");
    expect(config.buildAptPackages ?? []).not.toContain("ffmpeg");
    expect(config.buildAptPackages ?? []).not.toContain("yt-dlp");
  });

  it("does not keep stale Nixpacks config as Railway's source of truth", () => {
    expect(existsSync(path.resolve("nixpacks.toml"))).toBe(false);
  });
});
