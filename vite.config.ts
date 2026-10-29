import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig, loadEnv, type Plugin } from "vite";

const CONTROL_ROOM_MIN_ZOOM = 0.1;

function patchTournamentControlRoomSource(code: string) {
  let transformed = code.replace(
    "const minZoom = 0.55;",
    `const minZoom = ${CONTROL_ROOM_MIN_ZOOM};`
  );

  transformed = transformed.replace(
    `data-no-node-drag="true"
                                  className="max-w-[8rem] rounded border border-[#FFD700]/30 bg-black px-2 py-1 font-mono text-[10px] uppercase text-yellow-100 outline-none hover:border-[#FFD700]"`,
    `data-no-node-drag="true"
                                  onPointerDown={event => event.stopPropagation()}
                                  onPointerUp={event => event.stopPropagation()}
                                  onTouchStart={event => event.stopPropagation()}
                                  onClick={event => event.stopPropagation()}
                                  onContextMenu={event => event.stopPropagation()}
                                  className="max-w-[8rem] rounded border border-[#FFD700]/30 bg-black px-2 py-1 font-mono text-[10px] uppercase text-yellow-100 outline-none hover:border-[#FFD700]"`
  );

  return transformed;
}

function vitePluginControlRoomFixes(): Plugin {
  return {
    name: "control-room-fixes",
    enforce: "pre",
    transform(code, id) {
      const normalizedId = id.split(path.sep).join("/");
      if (
        !normalizedId.endsWith("/client/src/pages/TournamentControlRoom.tsx")
      ) {
        return null;
      }

      return patchTournamentControlRoomSource(code);
    },
  };
}

/**
 * Injects the Umami analytics tag, and only when it is actually configured.
 *
 * The tag was previously written into client/index.html using Vite's %VAR%
 * substitution. That substitution leaves the placeholder untouched when a
 * variable is missing, so an unconfigured build shipped a literal
 * `<script src="%VITE_ANALYTICS_ENDPOINT%/umami">`: every visitor's browser
 * resolved it against our own origin and requested
 * /%VITE_ANALYTICS_ENDPOINT%/umami, which 502s. Building the tag here means
 * a missing variable produces no tag at all.
 *
 * Both variables are read at BUILD time, not at runtime — see the ARG lines
 * in the Dockerfile, without which Railway's service variables never reach
 * `vite build`.
 */
function analyticsTagPlugin(): Plugin {
  let endpoint = "";
  let websiteId = "";
  return {
    name: "murph-analytics-tag",
    configResolved(config) {
      const env = loadEnv(config.mode, config.envDir, "");
      endpoint = (env.VITE_ANALYTICS_ENDPOINT ?? "").trim().replace(/\/+$/, "");
      websiteId = (env.VITE_ANALYTICS_WEBSITE_ID ?? "").trim();
      if (config.command === "build" && !(endpoint && websiteId))
        config.logger.warn(
          "[analytics] VITE_ANALYTICS_ENDPOINT / VITE_ANALYTICS_WEBSITE_ID are not set; building without the analytics tag."
        );
    },
    transformIndexHtml() {
      if (!endpoint || !websiteId) return [];
      return [
        {
          tag: "script",
          attrs: {
            defer: true,
            src: `${endpoint}/umami`,
            "data-website-id": websiteId,
          },
          injectTo: "body" as const,
        },
      ];
    },
  };
}

const plugins = [
  vitePluginControlRoomFixes(),
  react(),
  tailwindcss(),
  analyticsTagPlugin(),
];

export default defineConfig({
  plugins,
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  publicDir: path.resolve(import.meta.dirname, "client", "public"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  // No manualChunks here on purpose. Splitting the vendor bundle by package
  // (react / radix / tanstack / recharts) built cleanly and then failed at
  // runtime with "Cannot read properties of undefined (reading
  // 'createContext')": the chunks ended up initialising in an order where
  // code reached React before React's own chunk had evaluated, and the page
  // rendered blank. Route-level splitting in App.tsx gets the bulk of the
  // win without touching module order, so chunking is left to Rollup.
  server: {
    host: true,
    allowedHosts: ["localhost", "127.0.0.1"],
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
