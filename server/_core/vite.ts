import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import { nanoid } from "nanoid";
import path from "path";
import { createServer as createViteServer } from "vite";
import viteConfig from "../../vite.config";
import { injectPageMetadata } from "../../shared/pageMetadata";

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res
        .status(200)
        .set({ "Content-Type": "text/html" })
        .end(injectPageMetadata(page, url));
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath =
    process.env.NODE_ENV === "development"
      ? path.resolve(import.meta.dirname, "../..", "dist", "public")
      : path.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }

  app.use(express.static(distPath));

  const indexPath = path.resolve(distPath, "index.html");
  let cachedIndexHtml: string | null = null;

  // Fall through to index.html if the file doesn't exist, with this route's
  // title and link-preview tags injected. A scraper reads only what the
  // server sends, so this is the one place a shared link's preview can come
  // from — the client cannot set it after the fact.
  app.use("*", (req, res) => {
    try {
      // The built index.html cannot change while the process runs, so read it
      // once and leave every later request a string replace.
      if (cachedIndexHtml === null)
        cachedIndexHtml = fs.readFileSync(indexPath, "utf-8");
      res
        .status(200)
        .set({ "Content-Type": "text/html; charset=utf-8" })
        .end(injectPageMetadata(cachedIndexHtml, req.originalUrl));
    } catch {
      // No build to read: fall back to the plain send, which fails the same
      // way it did before this injection existed.
      res.sendFile(indexPath);
    }
  });
}
