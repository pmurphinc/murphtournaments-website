import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function getTomlSection(config: string, sectionName: string): string {
  const escapedSectionName = sectionName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const sectionMatch = new RegExp(
    `\\[${escapedSectionName}\\]([\\s\\S]*?)(?:\\n\\[|$)`
  ).exec(config);
  expect(sectionMatch).not.toBeNull();

  return sectionMatch?.[1] ?? "";
}

function getSetupNixPackages(config: string): string[] {
  const setupSection = getTomlSection(config, "phases.setup");
  const nixPkgsMatch = /nixPkgs\s*=\s*\[([^\]]+)\]/s.exec(setupSection);
  expect(nixPkgsMatch).not.toBeNull();

  return [...(nixPkgsMatch?.[1] ?? "").matchAll(/"([^"]+)"/g)].map(
    match => match[1]
  );
}

describe("nixpacks deployment config", () => {
  it("installs VOD capture system binaries through Nix packages", () => {
    const config = readFileSync(path.resolve("nixpacks.toml"), "utf8");
    const setupNixPackages = getSetupNixPackages(config);

    expect(setupNixPackages).toEqual(["...", "ffmpeg", "yt-dlp-light"]);
    expect(setupNixPackages).not.toContain("yt-dlp");
    expect(config).not.toMatch(/aptPkgs\s*=/);
  });

  it("keeps Railway runtime startup on the production Node server", () => {
    const config = readFileSync(path.resolve("nixpacks.toml"), "utf8");
    const startSection = getTomlSection(config, "start");

    expect(startSection).toMatch(/cmd\s*=\s*"pnpm start"/);
  });
});
