import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("nixpacks deployment config", () => {
  it("installs VOD capture system binaries through Nix packages", () => {
    const config = readFileSync(path.resolve("nixpacks.toml"), "utf8");

    expect(config).toMatch(/\[phases\.setup\]/);
    expect(config).toMatch(/nixPkgs\s*=\s*\[[^\]]*"\.\.\."[^\]]*\]/s);
    expect(config).toMatch(/nixPkgs\s*=\s*\[[^\]]*"ffmpeg"[^\]]*\]/s);
    expect(config).toMatch(/nixPkgs\s*=\s*\[[^\]]*"yt-dlp"[^\]]*\]/s);
    expect(config).not.toMatch(/aptPkgs\s*=/);
  });
});
