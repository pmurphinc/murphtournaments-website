import { getSessionCookieOptions } from "./_core/cookies";
import { COOKIE_NAME } from "../shared/const";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import { getOrCreateDevDivisionTournament, getOrCreateSeventhCircleTournament, updateTournamentStatus, getTeamsByTournament, upsertTeams, updateTeamFRP, getTournamentHistory, addTournamentToHistory } from "./db";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // Bracket data fetching
  bracket: router({
    getSheetData: publicProcedure
      .input(z.object({
        sheetId: z.string(),
        range: z.string(),
      }))
      .query(async ({ input }) => {
        try {
          console.log(`[bracket.getSheetData] Fetching from Google Sheets: ${input.range}`);
          
          // Use the Google Sheets API v4 with public access
          // This works for sheets shared publicly or with "Anyone with the link" access
          const encodedRange = encodeURIComponent(input.range);
          const url = `https://sheets.googleapis.com/v4/spreadsheets/${input.sheetId}/values/${encodedRange}?key=AIzaSyDaRi0zyNFzCEHGXxKPKLfnGbqJqKqkiYU`;
          
          const response = await fetch(url, {
            method: 'GET',
            headers: {
              'Accept': 'application/json'
            }
          });
          
          if (!response.ok) {
            // If API key fails, try the CSV export fallback
            console.log(`[bracket.getSheetData] API key failed (${response.status}), trying CSV export...`);
            throw new Error(`API failed: ${response.status}`);
          }
          
          const data = await response.json();
          const values = data.values || [];
          
          console.log(`[bracket.getSheetData] Received ${values.length} rows from range: ${input.range}`);
          return { success: true, values };
        } catch (error) {
          console.error(`[bracket.getSheetData] Error:`, error);
          return { success: false, error: error instanceof Error ? error.message : 'Unknown error', values: [] };
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
    updateStatus: protectedProcedure
      .input(z.object({
        eventStatus: z.enum(["not-live", "live", "complete"]).optional(),
        currentCycle: z.enum(["1", "2", "3"]).optional(),
        currentStage: z.enum(["check-in", "cashout", "final-round", "finished"]).optional(),
        currentMatch: z.string().optional(),
        eventNote: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Only admins can update tournament
        if (ctx.user?.role !== "admin") {
          throw new Error("Unauthorized: Only admins can update tournament");
        }

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
    updateTeams: protectedProcedure
      .input(z.object({
        teams: z.array(z.object({
          name: z.string(),
          frp: z.number(),
        })),
      }))
      .mutation(async ({ input, ctx }) => {
        // Only admins can update teams
        if (ctx.user?.role !== "admin") {
          throw new Error("Unauthorized: Only admins can update teams");
        }

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

    updateStatus2: publicProcedure
      .input(z.object({
        tournamentId: z.number(),
        eventStatus: z.enum(["not-live", "live", "complete"]).optional(),
        currentCycle: z.enum(["1", "2", "3"]).optional(),
        currentStage: z.enum(["check-in", "cashout", "final-round", "finished"]).optional(),
        currentMatch: z.string().optional(),
        eventNote: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const tournament = await getOrCreateSeventhCircleTournament();
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

    updateTeams2: publicProcedure
      .input(z.object({
        tournamentId: z.number(),
        teams: z.array(z.object({
          name: z.string(),
          frp: z.number(),
        })),
      }))
      .mutation(async ({ input }) => {
        const tournament = await getOrCreateSeventhCircleTournament();
        if (!tournament) {
          throw new Error("Failed to get tournament");
        }

        const updatedTeams = await upsertTeams(tournament.id, input.teams);
        return updatedTeams;
      }),

    getHistory: publicProcedure.query(async () => {
      return await getTournamentHistory();
    }),
  }),

  patchNotes: router({
    getGameUpdates: publicProcedure.query(async () => {
      try {
        const response = await fetch('https://reachthefinals.com/patchnotes', {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch patch notes: ${response.statusText}`);
        }

        const html = await response.text();
        
        // Simple HTML parsing to extract patch note sections
        // Look for common patterns in patch note pages
        const patches: any[] = [];
        
        // Extract sections that look like patch notes
        const sectionRegex = /<(h2|h3)[^>]*>([^<]+)<\/\1>|<p[^>]*>([^<]+)<\/p>/gi;
        let match;
        let currentPatch: any = null;
        
        while ((match = sectionRegex.exec(html)) !== null) {
          const text = (match[2] || match[3] || '').trim();
          
          if (match[1] && match[1].toLowerCase() === 'h2') {
            // This is likely a patch title
            if (currentPatch) {
              patches.push(currentPatch);
            }
            currentPatch = {
              id: `patch-${patches.length}`,
              title: text,
              date: 'Unknown Date',
              version: 'v1.0',
              content: '',
              type: 'Game Update'
            };
          } else if (currentPatch && text) {
            // Add to current patch content
            currentPatch.content += (currentPatch.content ? '\n' : '') + text;
          }
        }
        
        if (currentPatch) {
          patches.push(currentPatch);
        }
        
        // If no patches found, return a helpful message
        if (patches.length === 0) {
          return [{
            id: 'error',
            title: 'Unable to parse patch notes',
            date: new Date().toLocaleDateString(),
            version: 'N/A',
            content: 'The patch notes page structure may have changed. Please visit reachthefinals.com/patchnotes directly.',
            type: 'Game Update'
          }];
        }
        
        return patches;
      } catch (err) {
        console.error('Error fetching patch notes:', err);
        return [{
          id: 'error',
          title: 'Failed to load patch notes',
          date: new Date().toLocaleDateString(),
          version: 'N/A',
          content: err instanceof Error ? err.message : 'An unknown error occurred while fetching patch notes.',
          type: 'Game Update'
        }];
      }
    }),
  }),
});

export type AppRouter = typeof appRouter;
