import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: [
      "server/tournamentControlRevisionSafety.test.ts",
      "server/tournamentControlGroupActions.test.ts",
      "server/rateLimit.test.ts",
      "server/communityTournaments.test.ts",
      "server/tournamentControlLobbyTimer.test.ts",
      "server/teamManagement.test.ts",
      "server/patchNotes.test.ts",
      "server/patchNoteHtml.test.ts",
      "server/weaponArchiveData.test.ts",
      "server/teamRosterCapacity.test.ts",
      "server/arcadeScores.test.ts",
      "server/bugReports.test.ts",
      "server/staffInviteSeats.test.ts",
      "server/placeholderTeams.test.ts",
      "server/teamNamePropagation.test.ts",
      "server/teamClaimTeamSelection.test.ts",
      "shared/finalsGameModes.test.ts",
      "shared/pageMetadata.test.ts",
      "shared/redactTokens.test.ts",
      // vite.config.ts sets root: client, so the client suite never sees
      // shared/. Anything here that is not named is never run by anyone:
      // these seven existed for months without once executing in CI.
      "shared/tournamentResults.test.ts",
      "shared/vod/events.test.ts",
      "shared/vod/fallback-thumbnail.test.ts",
      "shared/vod/frame-sampling.test.ts",
      "shared/vod/hud-zones.test.ts",
      "shared/vod/team-summary.test.ts",
      "shared/vod/twitch-thumbnail-candidates.test.ts",
    ],
    environment: "node",
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
});
