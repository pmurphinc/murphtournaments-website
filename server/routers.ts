import { clearSessionCookie } from "./_core/logout";
import { systemRouter } from "./_core/systemRouter";
import { teamFinderRouter } from "./teamFinderRouter";
import { teamManagementRouter } from "./teamManagementRouter";
import { ENV } from "./_core/env";
import { publicProcedure, router, adminProcedure } from "./_core/trpc";
import { z } from "zod";
import {
  checkVodFrameCaptureBinaries,
  formatRequiredBinaryList,
} from "./vodFrameCapture";
import {
  getOrCreateDevDivisionTournament,
  getOrCreateSeventhCircleTournament,
  updateTournamentStatus,
  getTeamsByTournament,
  upsertTeams,
  getTournamentHistory,
  getAllPatchNotes,
} from "./db";
import { scrapeAndStorePatchNotes } from "./patchNoteScraper";
import { mergeWebsitePatchNotes } from "./patchNoteContent";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  getWeaponArchiveDetail,
  listWeaponArchiveItems,
} from "./weaponArchiveData";
import {
  createVodAnalysis,
  approveVodSuggestedEvent,
  createVodAnalysisEvent,
  createVodAnalysisEventInputSchema,
  createVodCaptureJob,
  createVodCaptureJobInputSchema,
  processVodCaptureJob,
  processVodCaptureJobInputSchema,
  updateVodCaptureJobStatus,
  updateVodCaptureJobStatusInputSchema,
  createVodSuggestedEvent,
  createVodSuggestedEventInputSchema,
  createVodAnalysisInputSchema,
  deleteVodAnalysisEvent,
  deleteVodAnalysisEventInputSchema,
  getLatestCaptureFramePreview,
  getLatestCaptureJobEvidence,
  getLatestVodCaptureJob,
  getVodAutomationStatus,
  getVodAnalysisById,
  ingestAutomationDetections,
  ingestAutomationDetectionsInputSchema,
  listVodAnalysisEvents,
  latestCaptureFramePreviewInputSchema,
  latestCaptureJobEvidenceInputSchema,
  listVodCaptureJobs,
  listVodAnalyses,
  listVodSuggestedEvents,
  rejectVodSuggestedEvent,
  updateVodAnalysisEvent,
  updateVodAnalysisEventInputSchema,
  updateVodSuggestedEvent,
  updateVodSuggestedEventInputSchema,
  refreshTwitchMetadataForVodAnalysis,
  runMockVodAutomationDetections,
  runMockVodAutomationDetectionsInputSchema,
  suggestedEventIdInputSchema,
  vodAnalysisIdInputSchema,
} from "./vodAnalysis";

type LoadoutItemType = "weapon" | "gadget";
type LoadoutBuildType = "Light" | "Medium" | "Heavy";

interface LoadoutItem {
  name: string;
  normalizedName: string;
  build: LoadoutBuildType;
  type: LoadoutItemType;
  imageUrl?: string;
}

interface LoadoutTrackerItem extends LoadoutItem {
  latestPatch: string;
  patchDate: string | null;
  patchText: string;
  devNote: string | null;
  isNew: boolean;
  matchQuality: "matched" | "noPatchText" | "new";
}

interface LoadoutTrackerPayload {
  items: LoadoutTrackerItem[];
  metadata: {
    lastUpdated: string | null;
    dataSourceStatus: "live" | "cache" | "degraded" | "empty";
    isFromCache: boolean;
    currentPatch: string | null;
    cacheAgeMinutes: number | null;
  };
}

const BUILDS_PAGE_API =
  "https://www.thefinals.wiki/w/api.php?action=parse&page=Builds&prop=text&formatversion=2&format=json";
const PATCHNOTES_PAGE_API =
  "https://www.thefinals.wiki/w/api.php?action=parse&page=Patchnotes&prop=text&formatversion=2&format=json";
const LOADOUT_CACHE_PATH = path.join(
  process.cwd(),
  "server",
  ".cache",
  "loadout-tracker-cache.json"
);
const LOADOUT_REFRESH_WINDOW_MS = 1000 * 60 * 20;

const ITEM_NAME_ALIASES: Record<string, string> = {
  xp54: "xp-54",
  "xp 54": "xp-54",
  "akm rifle": "akm",
  fcarrifle: "fcar",
  "m 60": "m60",
  "v 9 s": "v9s",
  cl40: "cl-40",
};

const resolveItemAlias = (value: string) =>
  ITEM_NAME_ALIASES[value.trim().toLowerCase()] || value;

const normalizeItemName = (value: string) =>
  resolveItemAlias(value.replace(/&amp;/g, "and").replace(/\+/g, "plus").trim())
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const stripHtmlTags = (value: string) =>
  value
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();

const extractItemsFromBuildsHtml = (html: string): LoadoutItem[] => {
  const buildNames: LoadoutBuildType[] = ["Light", "Medium", "Heavy"];
  const items: LoadoutItem[] = [];
  const seen = new Set<string>();

  for (const build of buildNames) {
    const buildStart = html.search(new RegExp(`<h2[^>]*>${build} Build`, "i"));
    if (buildStart < 0) continue;

    const remainingBuilds = buildNames.filter(name => name !== build);
    const nextBuildIndices = remainingBuilds
      .map(nextBuild =>
        html
          .slice(buildStart + 1)
          .search(new RegExp(`<h2[^>]*>${nextBuild} Build`, "i"))
      )
      .filter(index => index >= 0)
      .map(index => index + buildStart + 1);
    const buildEnd =
      nextBuildIndices.length > 0 ? Math.min(...nextBuildIndices) : html.length;
    const buildSlice = html.slice(buildStart, buildEnd);

    const typeDefinitions: Array<{
      type: LoadoutItemType;
      heading: string;
      nextHeading: string;
    }> = [
      { type: "weapon", heading: "Weapons", nextHeading: "Gadgets" },
      { type: "gadget", heading: "Gadgets", nextHeading: "</h2>" },
    ];

    for (const definition of typeDefinitions) {
      const typeStart = buildSlice.search(
        new RegExp(
          `<h3[^>]*>${definition.heading}</h3>|>${definition.heading}<`,
          "i"
        )
      );
      if (typeStart < 0) continue;

      const tail = buildSlice.slice(typeStart + 1);
      let typeEnd = tail.search(
        new RegExp(
          `<h3[^>]*>${definition.nextHeading}</h3>|${definition.nextHeading}`,
          "i"
        )
      );
      if (typeEnd < 0) {
        typeEnd = tail.length;
      }

      const typeSlice = tail.slice(0, typeEnd);
      const anchorRegex =
        /<a[^>]*href="\/wiki\/[^"#]+"[^>]*title="([^"]+)"[^>]*>(?:<img[^>]*alt="([^"]*)"[^>]*src="([^"]+)"[^>]*>)?[^<]*<\/a>/gi;
      let match: RegExpExecArray | null;

      while ((match = anchorRegex.exec(typeSlice)) !== null) {
        const name = stripHtmlTags(match[1] || "");
        if (!name || /^(Image|Weapons|Gadgets)$/i.test(name)) continue;

        const normalizedName = normalizeItemName(name);
        if (!normalizedName) continue;

        const key = `${build}-${definition.type}-${normalizedName}`;
        if (seen.has(key)) continue;
        seen.add(key);

        let imageUrl = match[3] || undefined;
        if (imageUrl && imageUrl.startsWith("//")) {
          imageUrl = `https:${imageUrl}`;
        }

        items.push({
          name,
          normalizedName,
          build,
          type: definition.type,
          imageUrl,
        });
      }
    }
  }

  return items;
};

const extractPatchLinks = (html: string) => {
  const links: Array<{
    pageTitle: string;
    patchVersion: string;
    patchDate: string;
  }> = [];
  const seen = new Set<string>();
  const rowRegex =
    /<tr[^>]*>[\s\S]*?<a[^>]*href="\/wiki\/([^"]+)"[^>]*>([^<]+)<\/a>[\s\S]*?(\d{4}-\d{2}-\d{2})[\s\S]*?<\/tr>/gi;
  let match: RegExpExecArray | null;

  while ((match = rowRegex.exec(html)) !== null) {
    const pageTitle = decodeURIComponent(match[1]).replace(/_/g, " ").trim();
    const patchVersion = stripHtmlTags(match[2]);
    const patchDate = match[3];
    const key = `${pageTitle}-${patchDate}`;

    if (seen.has(key)) continue;
    seen.add(key);

    links.push({ pageTitle, patchVersion, patchDate });
  }

  return links.sort((a, b) => (a.patchDate < b.patchDate ? 1 : -1));
};

const extractCurrentPatch = (patchLinks: Array<{ patchVersion: string }>) => {
  const firstVersion =
    patchLinks.find(link => link.patchVersion?.trim())?.patchVersion || null;
  if (!firstVersion) return null;
  const normalized = firstVersion.toUpperCase();
  return normalized.startsWith("UPDATE") || normalized.startsWith("PATCH")
    ? firstVersion
    : `Update ${firstVersion}`;
};

const extractItemUpdateFromPatch = (wikitext: string, itemNames: string[]) => {
  const lines = wikitext.split("\n");
  const normalizedItemNames = itemNames
    .map(name => normalizeItemName(name))
    .filter(Boolean);

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const cleanedLine = stripHtmlTags(line.replace(/^\s*[\*#:;\-]+\s*/, ""));
    const normalizedLine = normalizeItemName(cleanedLine);

    if (!normalizedLine) continue;

    const hasItemMention = normalizedItemNames.some(itemName =>
      normalizedLine.includes(itemName)
    );
    if (!hasItemMention) continue;

    const patchText = cleanedLine || "No patch note found";
    let devNote: string | undefined;
    for (let offset = 0; offset < 4; offset += 1) {
      const candidate = lines[index + offset] || "";
      if (/dev\s*note/i.test(candidate)) {
        devNote = stripHtmlTags(candidate.replace(/^\s*[\*#:;\-]+\s*/, ""));
        break;
      }
    }

    return {
      patchText,
      devNote,
    };
  }

  return null;
};

const getCacheAgeMinutes = (lastUpdated: string | null) => {
  if (!lastUpdated) return null;
  const timestamp = new Date(lastUpdated).getTime();
  if (Number.isNaN(timestamp)) return null;
  return Math.max(0, Math.floor((Date.now() - timestamp) / 60000));
};

const safeEmptyLoadoutPayload = (): LoadoutTrackerPayload => ({
  items: [],
  metadata: {
    lastUpdated: null,
    dataSourceStatus: "empty",
    isFromCache: false,
    currentPatch: null,
    cacheAgeMinutes: null,
  },
});

const readLoadoutCache = async (): Promise<LoadoutTrackerPayload | null> => {
  try {
    const raw = await readFile(LOADOUT_CACHE_PATH, "utf8");
    const parsed = JSON.parse(raw) as LoadoutTrackerPayload;
    if (!Array.isArray(parsed.items) || !parsed.metadata) return null;
    return parsed;
  } catch {
    return null;
  }
};

const writeLoadoutCache = async (payload: LoadoutTrackerPayload) => {
  await mkdir(path.dirname(LOADOUT_CACHE_PATH), { recursive: true });
  await writeFile(LOADOUT_CACHE_PATH, JSON.stringify(payload, null, 2), "utf8");
};

export const appRouter = router({
  // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  teamFinder: teamFinderRouter,
  teamManagement: teamManagementRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      clearSessionCookie(ctx.req, ctx.res);
      return {
        success: true,
      } as const;
    }),
  }),

  // Bracket data fetching
  bracket: router({
    getSheetData: publicProcedure
      .input(
        z.object({
          sheetId: z.string(),
          range: z.string(),
        })
      )
      .query(async ({ input }) => {
        try {
          console.log(
            `[bracket.getSheetData] Fetching from Google Sheets: ${input.range}`
          );

          // Use the Google Sheets API v4 with public access
          // This works for sheets shared publicly or with "Anyone with the link" access
          if (!ENV.googleSheetsApiKey) {
            throw new Error("GOOGLE_SHEETS_API_KEY is not configured");
          }

          const encodedRange = encodeURIComponent(input.range);
          const url = `https://sheets.googleapis.com/v4/spreadsheets/${input.sheetId}/values/${encodedRange}?key=${ENV.googleSheetsApiKey}`;

          const response = await fetch(url, {
            method: "GET",
            headers: {
              Accept: "application/json",
            },
          });

          if (!response.ok) {
            // If API key fails, try the CSV export fallback
            console.log(
              `[bracket.getSheetData] API key failed (${response.status}), trying CSV export...`
            );
            throw new Error(`API failed: ${response.status}`);
          }

          const data = await response.json();
          const values = data.values || [];

          console.log(
            `[bracket.getSheetData] Received ${values.length} rows from range: ${input.range}`
          );
          return { success: true, values };
        } catch (error) {
          console.error(`[bracket.getSheetData] Error:`, error);
          return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
            values: [],
          };
        }
      }),
  }),

  // Tournament management
  tournament: router({
    // Get or create the Dev Division tournament
    getDevDivision: publicProcedure.query(async () => {
      const tournament = await getOrCreateDevDivisionTournament();
      if (!tournament) {
        throw new Error("Failed to get or create tournament");
      }

      const teamList = await getTeamsByTournament(tournament.id);
      return {
        ...tournament,
        teams: teamList,
      };
    }),

    // Update tournament status (admin only)
    updateStatus: adminProcedure
      .input(
        z.object({
          eventStatus: z.enum(["not-live", "live", "complete"]).optional(),
          currentCycle: z.enum(["1", "2", "3"]).optional(),
          currentStage: z
            .enum(["check-in", "cashout", "final-round", "finished"])
            .optional(),
          currentMatch: z.string().optional(),
          eventNote: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const tournament = await getOrCreateDevDivisionTournament();
        if (!tournament) {
          throw new Error("Failed to get tournament");
        }

        const updated = await updateTournamentStatus(tournament.id, input);
        if (!updated) {
          throw new Error("Failed to update tournament");
        }

        const teamList = await getTeamsByTournament(tournament.id);
        return {
          ...updated,
          teams: teamList,
        };
      }),

    // Update teams and their FRP
    updateTeams: adminProcedure
      .input(
        z.object({
          teams: z.array(
            z.object({
              name: z.string(),
              frp: z.number(),
            })
          ),
        })
      )
      .mutation(async ({ input }) => {
        const tournament = await getOrCreateDevDivisionTournament();
        if (!tournament) {
          throw new Error("Failed to get tournament");
        }

        const updatedTeams = await upsertTeams(tournament.id, input.teams);
        return updatedTeams;
      }),

    // 7th Circle tournament endpoints
    getSeventhCircle: publicProcedure.query(async () => {
      const tournament = await getOrCreateSeventhCircleTournament();
      if (!tournament) {
        throw new Error("Failed to get or create tournament");
      }

      const teamList = await getTeamsByTournament(tournament.id);
      return {
        ...tournament,
        teams: teamList,
      };
    }),

    getHistory: publicProcedure.query(async () => {
      return await getTournamentHistory();
    }),
  }),

  patchNotes: router({
    // Get all game update patch notes from the database
    getAll: publicProcedure.query(async () => {
      try {
        const dbNotes = await getAllPatchNotes();
        return mergeWebsitePatchNotes(dbNotes).map(note => ({
          id: note.id ?? 0,
          title: note.title,
          date: note.date,
          content: note.content,
          url: note.url,
          version: note.version,
        }));
      } catch (err) {
        console.error("[patchNotes.getAll] Error:", err);
        return mergeWebsitePatchNotes([]).map(note => ({
          id: note.id ?? 0,
          title: note.title,
          date: note.date,
          content: note.content,
          url: note.url,
          version: note.version,
        }));
      }
    }),

    // Scrape thefinals.wiki for new game updates and store them in the database
    scrapeAndStore: publicProcedure.mutation(async () => {
      return await scrapeAndStorePatchNotes();
    }),
  }),

  loadoutTracker: router({
    getItems: publicProcedure.query(async () => {
      const cachedPayload = await readLoadoutCache();
      const cacheIsFresh = cachedPayload?.metadata.lastUpdated
        ? Date.now() - new Date(cachedPayload.metadata.lastUpdated).getTime() <
          LOADOUT_REFRESH_WINDOW_MS
        : false;

      if (cachedPayload && cacheIsFresh) {
        return {
          ...cachedPayload,
          metadata: {
            ...cachedPayload.metadata,
            dataSourceStatus: "cache",
            isFromCache: true,
            cacheAgeMinutes: getCacheAgeMinutes(
              cachedPayload.metadata.lastUpdated
            ),
          },
        } satisfies LoadoutTrackerPayload;
      }

      try {
        const [buildsResponse, patchnotesResponse] = await Promise.all([
          fetch(BUILDS_PAGE_API),
          fetch(PATCHNOTES_PAGE_API),
        ]);

        if (!buildsResponse.ok || !patchnotesResponse.ok) {
          throw new Error("Failed to fetch THE FINALS wiki pages.");
        }

        const buildsPayload = await buildsResponse.json();
        const patchnotesPayload = await patchnotesResponse.json();
        const buildsHtml = buildsPayload?.parse?.text as string | undefined;
        const patchnotesHtml = patchnotesPayload?.parse?.text as
          | string
          | undefined;

        if (!buildsHtml || !patchnotesHtml) {
          throw new Error("Wiki response missing expected data.");
        }

        const items = extractItemsFromBuildsHtml(buildsHtml);
        if (items.length === 0) {
          throw new Error("Build parsing produced no items.");
        }

        const patchLinks = extractPatchLinks(patchnotesHtml);
        const currentPatch = extractCurrentPatch(patchLinks);
        const patchMatchMap = new Map<
          string,
          {
            latestPatch: string;
            patchDate: string;
            patchText: string;
            devNote?: string;
          }
        >();

        for (const patch of patchLinks.slice(0, 80)) {
          const unfoundItems = items.filter(
            item =>
              !patchMatchMap.has(
                `${item.build}-${item.type}-${item.normalizedName}`
              )
          );
          if (unfoundItems.length === 0) break;

          const patchApiUrl = `https://www.thefinals.wiki/w/api.php?action=parse&page=${encodeURIComponent(patch.pageTitle)}&prop=wikitext&formatversion=2&format=json`;
          const patchResponse = await fetch(patchApiUrl);
          if (!patchResponse.ok) continue;

          const patchPayload = await patchResponse.json();
          const wikitext = patchPayload?.parse?.wikitext as string | undefined;
          if (!wikitext) continue;

          for (const item of unfoundItems) {
            const match = extractItemUpdateFromPatch(wikitext, [item.name]);
            if (!match) continue;

            patchMatchMap.set(
              `${item.build}-${item.type}-${item.normalizedName}`,
              {
                latestPatch: patch.patchVersion || "N/A",
                patchDate: patch.patchDate || "N/A",
                patchText: match.patchText || "No patch note found",
                devNote: match.devNote,
              }
            );
          }
        }

        const preparedItems = items.map(item => {
          const key = `${item.build}-${item.type}-${item.normalizedName}`;
          const match = patchMatchMap.get(key);
          if (!match) {
            return {
              ...item,
              latestPatch: "NEW",
              patchDate: null,
              patchText: "No balance changes yet",
              devNote: null,
              isNew: true,
              matchQuality: "new" as const,
            };
          }

          const hasPatchText = Boolean(
            match.patchText && match.patchText.trim().length > 0
          );
          return {
            ...item,
            latestPatch: match.latestPatch,
            patchDate: match.patchDate,
            patchText: hasPatchText ? match.patchText : "No patch note found",
            devNote: match.devNote || null,
            isNew: false,
            matchQuality: hasPatchText
              ? ("matched" as const)
              : ("noPatchText" as const),
          };
        });

        const livePayload: LoadoutTrackerPayload = {
          items: preparedItems,
          metadata: {
            lastUpdated: new Date().toISOString(),
            dataSourceStatus: "live",
            isFromCache: false,
            currentPatch,
            cacheAgeMinutes: 0,
          },
        };

        await writeLoadoutCache(livePayload);
        return livePayload;
      } catch (error) {
        console.error("loadoutTracker.getItems error", error);
        if (cachedPayload) {
          return {
            ...cachedPayload,
            metadata: {
              ...cachedPayload.metadata,
              dataSourceStatus: "degraded",
              isFromCache: true,
              cacheAgeMinutes: getCacheAgeMinutes(
                cachedPayload.metadata.lastUpdated
              ),
            },
          } satisfies LoadoutTrackerPayload;
        }

        return safeEmptyLoadoutPayload();
      }
    }),
  }),

  vodAnalysis: router({
    list: publicProcedure.query(async () => {
      return listVodAnalyses();
    }),

    getById: publicProcedure
      .input(vodAnalysisIdInputSchema)
      .query(async ({ input }) => {
        return getVodAnalysisById(input);
      }),

    create: publicProcedure
      .input(createVodAnalysisInputSchema)
      .mutation(async ({ input }) => {
        return createVodAnalysis(input);
      }),

    createEvent: publicProcedure
      .input(createVodAnalysisEventInputSchema)
      .mutation(async ({ input }) => {
        return createVodAnalysisEvent(input);
      }),

    updateEvent: publicProcedure
      .input(updateVodAnalysisEventInputSchema)
      .mutation(async ({ input }) => {
        return updateVodAnalysisEvent(input);
      }),

    deleteEvent: publicProcedure
      .input(deleteVodAnalysisEventInputSchema)
      .mutation(async ({ input }) => {
        return deleteVodAnalysisEvent(input);
      }),

    refreshTwitchMetadata: publicProcedure
      .input(vodAnalysisIdInputSchema)
      .mutation(async ({ input }) => {
        return refreshTwitchMetadataForVodAnalysis(input);
      }),

    createCaptureJob: publicProcedure
      .input(createVodCaptureJobInputSchema)
      .mutation(async ({ input }) => {
        return createVodCaptureJob(input.vodAnalysisId, input.source);
      }),

    processCaptureJob: publicProcedure
      .input(processVodCaptureJobInputSchema)
      .mutation(async ({ input }) => {
        const frameCaptureBinaries = await checkVodFrameCaptureBinaries({
          includeFailureReasons: true,
        });

        if (!frameCaptureBinaries.available) {
          if (frameCaptureBinaries.failureReasons) {
            console.warn(
              `[vod-capture] process blocked by missing runtime binaries: ${formatRequiredBinaryList(
                frameCaptureBinaries.missing
              )}`
            );
          }

          throw new Error(
            `Capture job processing is blocked until ffmpeg and yt-dlp are available in the Railway runtime. Missing: ${formatRequiredBinaryList(
              frameCaptureBinaries.missing
            )}.`
          );
        }

        return processVodCaptureJob(input);
      }),

    updateCaptureJobStatus: publicProcedure
      .input(updateVodCaptureJobStatusInputSchema)
      .mutation(async ({ input }) => {
        if (process.env.NODE_ENV === "production") {
          throw new Error(
            "Capture job status controls are only available in development."
          );
        }

        return updateVodCaptureJobStatus(input);
      }),

    listCaptureJobs: publicProcedure
      .input(vodAnalysisIdInputSchema)
      .query(async ({ input }) => {
        return listVodCaptureJobs(input);
      }),

    getLatestCaptureJob: publicProcedure
      .input(vodAnalysisIdInputSchema)
      .query(async ({ input }) => {
        return getLatestVodCaptureJob(input);
      }),

    getLatestCaptureFramePreview: publicProcedure
      .input(latestCaptureFramePreviewInputSchema)
      .query(async ({ input }) => {
        return getLatestCaptureFramePreview(input);
      }),

    getLatestCaptureJobEvidence: publicProcedure
      .input(latestCaptureJobEvidenceInputSchema)
      .query(async ({ input }) => {
        return getLatestCaptureJobEvidence(input);
      }),

    getAutomationStatus: publicProcedure
      .input(vodAnalysisIdInputSchema)
      .query(async ({ input }) => {
        return getVodAutomationStatus(input);
      }),

    listEvents: publicProcedure
      .input(vodAnalysisIdInputSchema)
      .query(async ({ input }) => {
        return listVodAnalysisEvents(input);
      }),

    listSuggestedEvents: publicProcedure
      .input(vodAnalysisIdInputSchema)
      .query(async ({ input }) => {
        return listVodSuggestedEvents(input);
      }),

    createSuggestedEvent: publicProcedure
      .input(createVodSuggestedEventInputSchema)
      .mutation(async ({ input }) => {
        return createVodSuggestedEvent(input);
      }),

    ingestAutomationDetections: publicProcedure
      .input(ingestAutomationDetectionsInputSchema)
      .mutation(async ({ input }) => {
        return ingestAutomationDetections(input);
      }),

    runMockAutomationDetections: publicProcedure
      .input(runMockVodAutomationDetectionsInputSchema)
      .mutation(async ({ input }) => {
        if (process.env.NODE_ENV === "production") {
          throw new Error(
            "Mock automation detections are only available in development."
          );
        }

        return runMockVodAutomationDetections(input);
      }),

    updateSuggestedEvent: publicProcedure
      .input(updateVodSuggestedEventInputSchema)
      .mutation(async ({ input }) => {
        return updateVodSuggestedEvent(input);
      }),

    approveSuggestedEvent: publicProcedure
      .input(suggestedEventIdInputSchema)
      .mutation(async ({ input }) => {
        return approveVodSuggestedEvent(input);
      }),

    rejectSuggestedEvent: publicProcedure
      .input(suggestedEventIdInputSchema)
      .mutation(async ({ input }) => {
        return rejectVodSuggestedEvent(input);
      }),
  }),

  weaponArchive: router({
    list: publicProcedure
      .input(
        z
          .object({
            class: z.enum(["Light", "Medium", "Heavy", "multi"]).optional(),
            category: z.enum(["Weapon", "Gadget", "Specialization"]).optional(),
            search: z.string().optional(),
            sort: z
              .enum(["alphabetical", "recently-changed", "most-changed"])
              .optional()
              .default("alphabetical"),
          })
          .optional()
      )
      .query(async ({ input }) => {
        return listWeaponArchiveItems(input);
      }),

    getBySlug: publicProcedure
      .input(z.object({ slug: z.string() }))
      .query(async ({ input }) => {
        return getWeaponArchiveDetail(input.slug);
      }),
  }),
});

export type AppRouter = typeof appRouter;
