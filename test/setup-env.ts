const isTestEnvironment =
  process.env.NODE_ENV === "test" || process.env.VITEST === "true";

if (isTestEnvironment && !process.env.TOURNAMENT_WEBHOOK_SECRET) {
  process.env.TOURNAMENT_WEBHOOK_SECRET =
    "test_tournament_webhook_secret_123456";
}
