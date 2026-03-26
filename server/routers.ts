import { getSessionCookieOptions } from "./_core/cookies";
import { COOKIE_NAME } from "../shared/const";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import { getOrCreateDevDivisionTournament, getOrCreateSeventhCircleTournament, updateTournamentStatus, getTeamsByTournament, upsertTeams, updateTeamFRP } from "./db";

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
  }),
});

export type AppRouter = typeof appRouter;
