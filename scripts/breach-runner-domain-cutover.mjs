import fs from "node:fs";

function edit(pathname, replacements) {
  let source = fs.readFileSync(pathname, "utf8");
  for (const [from, to] of replacements) {
    if (!source.includes(from)) {
      throw new Error(`${pathname} no longer contains expected text: ${from}`);
    }
    source = source.split(from).join(to);
  }
  fs.writeFileSync(pathname, source);
}

edit("client/src/components/Navigation.tsx", [
  ["https://wormhole.murphtournaments.com", "https://breachrunner.murphtournaments.com"],
  ["Wormhole Arcade", "Breach Runner Arcade"],
]);

edit("client/src/components/Navigation.test.ts", [
  ["Wormhole Arcade", "Breach Runner Arcade"],
  ["https://wormhole.murphtournaments.com", "https://breachrunner.murphtournaments.com"],
]);

edit("server/arcadeScores.ts", [
  [
    'const ARCADE_ORIGINS = new Set([\n  "https://wormhole.murphtournaments.com",\n  "https://wormhole-arcade.pmurphinc.chatgpt.site",\n]);',
    'const ARCADE_ORIGINS = new Set([\n  "https://breachrunner.murphtournaments.com",\n  // Legacy alias retained during the custom-domain cutover.\n  "https://wormhole.murphtournaments.com",\n  "https://wormhole-arcade.pmurphinc.chatgpt.site",\n]);'
  ],
]);

edit("server/arcadeScores.test.ts", [
  ["Wormhole Arcade public leaderboard", "Breach Runner Arcade public leaderboard"],
  [
    'allowedArcadeOrigin("https://wormhole.murphtournaments.com")\n    ).toBe("https://wormhole.murphtournaments.com");',
    'allowedArcadeOrigin("https://breachrunner.murphtournaments.com")\n    ).toBe("https://breachrunner.murphtournaments.com");'
  ],
]);

edit("server/_core/discordOAuth.ts", [
  [
    'const DISCORD_EXTERNAL_RETURN_ORIGINS = new Set([\n  "https://wormhole.murphtournaments.com",\n]);',
    'const DISCORD_EXTERNAL_RETURN_ORIGINS = new Set([\n  "https://breachrunner.murphtournaments.com",\n  // Legacy alias retained during the custom-domain cutover.\n  "https://wormhole.murphtournaments.com",\n]);'
  ],
  ["// Wormhole is a separate Railway deployment on our own fixed subdomain.", "// Breach Runner Arcade is a separate Railway deployment on our own fixed subdomain."],
  ["// Permit only that exact HTTPS origin; never turn returnTo into an open", "// Permit only explicitly listed HTTPS origins; never turn returnTo into an open"],
]);

edit("client/src/lib/discordOAuthReturnPath.test.ts", [
  ["exact Wormhole Arcade production origin", "exact Breach Runner Arcade production origin"],
  ["https://wormhole.murphtournaments.com", "https://breachrunner.murphtournaments.com"],
]);

edit("server/_core/index.ts", [
  ["// Public, initials-only Wormhole Arcade leaderboard. No login is required.", "// Public, initials-only Breach Runner Arcade leaderboard. No login is required."],
]);

edit("drizzle/schema.ts", [
  [" * Classic Wormhole Arcade high scores. Initials are deliberately the only", " * Breach Runner Arcade high scores. Initials are deliberately the only"],
]);

console.log("Applied Breach Runner Arcade link/domain cutover.");
