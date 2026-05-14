import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

type RailwayConfig = {
  $schema?: string;
  build?: {
    builder?: string;
    dockerfilePath?: string;
  };
};

function readDockerfile(): string {
  return readFileSync(path.resolve("Dockerfile"), "utf8");
}

function readDockerignore(): string {
  return readFileSync(path.resolve(".dockerignore"), "utf8");
}

function readRailwayConfig(): RailwayConfig {
  return JSON.parse(
    readFileSync(path.resolve("railway.json"), "utf8")
  ) as RailwayConfig;
}

describe("Docker deployment config", () => {
  it("keeps Dockerfile as the Railway deployment source of truth", () => {
    expect(existsSync(path.resolve("Dockerfile"))).toBe(true);
    expect(existsSync(path.resolve("railpack.json"))).toBe(false);
    expect(existsSync(path.resolve("nixpacks.toml"))).toBe(false);
    expect(existsSync(path.resolve("railway.toml"))).toBe(false);
  });

  it("installs VOD capture binaries in the final runtime image", () => {
    const dockerfile = readDockerfile();
    const runtimeStage = dockerfile.slice(
      dockerfile.indexOf("FROM base AS runtime")
    );

    expect(dockerfile).toMatch(
      /apt-get install -y --no-install-recommends\s+ca-certificates ffmpeg yt-dlp/
    );
    expect(runtimeStage).toContain("FROM base AS runtime");
    expect(dockerfile).not.toContain("yt-dlp-light");
  });

  it("keeps pnpm patches available to Docker builds", () => {
    const dockerignore = readDockerignore();
    const dockerignoreEntries = dockerignore
      .split(/\r?\n/)
      .map((entry) => entry.trim())
      .filter(Boolean);

    expect(dockerignoreEntries).not.toContain("patches");
    expect(dockerignoreEntries).not.toContain("patches/");
  });

  it("copies pnpm patches before installing dependencies", () => {
    const dockerfile = readDockerfile();
    const depsStage = dockerfile.slice(
      dockerfile.indexOf("FROM base AS deps"),
      dockerfile.indexOf("FROM deps AS build")
    );
    const copyPatchesIndex = depsStage.indexOf("COPY patches ./patches");
    const installIndex = depsStage.indexOf("RUN pnpm install --frozen-lockfile");

    expect(copyPatchesIndex).toBeGreaterThan(-1);
    expect(installIndex).toBeGreaterThan(-1);
    expect(copyPatchesIndex).toBeLessThan(installIndex);
  });

  it("builds and starts the app with pnpm", () => {
    const dockerfile = readDockerfile();

    expect(dockerfile).toMatch(/^RUN pnpm build$/m);
    expect(dockerfile).toContain('CMD ["pnpm", "start"]');
  });

  it("forces Railway to build from the Dockerfile", () => {
    const config = readRailwayConfig();

    expect(config.$schema).toBe("https://railway.com/railway.schema.json");
    expect(config.build).toEqual({
      builder: "DOCKERFILE",
      dockerfilePath: "Dockerfile",
    });
  });
});
