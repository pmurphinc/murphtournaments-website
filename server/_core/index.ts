import "dotenv/config";
import express from "express";
import fs from "fs";
import { createServer } from "http";
import net from "net";
import path from "path";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerDiscordOAuthRoutes } from "./discordOAuth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { handleTournamentWebhook, handleGetTournamentState } from "../webhooks";
import { scrapeAndStorePatchNotes } from "../patchNoteScraper";
import { serveVodCaptureFrame } from "../vodCaptureFrameRoute";
import { logVodFrameCaptureBinaryAvailability } from "../vodFrameCapture";

function resolveFclMediaDirectory() {
  const candidates = [
    path.resolve(import.meta.dirname, "..", "..", "data", "reference", "FCL"),
    path.resolve(import.meta.dirname, "..", "data", "reference", "FCL"),
    path.resolve(process.cwd(), "data", "reference", "FCL"),
  ];

  return candidates.find(candidate => fs.existsSync(candidate)) ?? candidates[0];
}

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  app.use(
    "/media/fcl",
    express.static(resolveFclMediaDirectory(), {
      fallthrough: true,
      index: false,
    })
  );
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);

  // Discord OAuth2 sign-in under /api/auth/discord/*
  registerDiscordOAuthRoutes(app);

  // Webhook endpoint for Discord bot tournament updates
  app.post("/api/webhooks/tournament", handleTournamentWebhook);

  // Public endpoint to fetch current tournament state
  app.get("/api/tournament/:tournamentId/state", handleGetTournamentState);

  app.get(
    "/api/vod-capture-frame/:vodAnalysisId/:captureJobId/:fileName",
    serveVodCaptureFrame
  );

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });

  void logVodFrameCaptureBinaryAvailability();
}

// Weekly patch notes scraper scheduler
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

async function runPatchNoteScraper() {
  console.log(
    `[scheduler] Running patch notes scraper at ${new Date().toISOString()}`
  );
  try {
    const result = await scrapeAndStorePatchNotes();
    console.log(
      `[scheduler] Patch notes scrape complete: ${result.added} added, ${result.skipped} skipped, ${result.errors} errors`
    );
  } catch (err) {
    console.error("[scheduler] Patch notes scraper failed:", err);
  }
}

startServer()
  .then(() => {
    // Run scraper once on startup (after a short delay to let DB connect)
    setTimeout(() => {
      runPatchNoteScraper();
    }, 10_000);

    // Schedule weekly scrape
    setInterval(() => {
      runPatchNoteScraper();
    }, ONE_WEEK_MS);

    console.log(
      "[scheduler] Patch notes scraper scheduled: runs on startup + every 7 days"
    );
  })
  .catch(console.error);
