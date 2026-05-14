import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function getSetupNixPackages(config: string): string[] {
  const setupMatch = /\[phases\.setup\]([\s\S]*?)(?:\n\[|$)/.exec(config);
  expect(setupMatch).not.toBeNull();

  const nixPkgsMatch = /nixPkgs\s*=\s*\[([^\]]+)\]/s.exec(
    setupMatch?.[1] ?? ""
  );
  expect(nixPkgsMatch).not.toBeNull();

  return [...(nixPkgsMatch?.[1] ?? "").matchAll(/"([^"]+)"/g)].map(
    match => match[1]
  );
}

describe("nixpacks deployment config", () => {
  it("installs VOD capture system binaries through Nix packages", () => {
    const config = readFileSync(path.resolve("nixpacks.toml"), "utf8");
    const setupNixPackages = getSetupNixPackages(config);

    expect(setupNixPackages).toContain("...");
    expect(setupNixPackages).toContain("ffmpeg");
    expect(setupNixPackages).toContain("yt-dlp-light");
    expect(setupNixPackages).not.toContain("yt-dlp");
    expect(config).not.toMatch(/aptPkgs\s*=/);
  });
});
