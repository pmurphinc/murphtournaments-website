export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  discordClientId: process.env.DISCORD_CLIENT_ID ?? "",
  discordClientSecret: process.env.DISCORD_CLIENT_SECRET ?? "",
  discordRedirectUri: process.env.DISCORD_REDIRECT_URI ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  twitchClientId: process.env.TWITCH_CLIENT_ID ?? "",
  twitchClientSecret: process.env.TWITCH_CLIENT_SECRET ?? "",
  googleSheetsApiKey: process.env.GOOGLE_SHEETS_API_KEY ?? "",
  /**
   * Opens a GitHub issue for each site bug report. Both are optional: with
   * either unset, reports are still stored, just not mirrored.
   */
  githubIssueToken: process.env.GITHUB_ISSUE_TOKEN ?? "",
  githubIssueRepo:
    process.env.GITHUB_ISSUE_REPO ?? "pmurphinc/murphtournaments-website",
};
