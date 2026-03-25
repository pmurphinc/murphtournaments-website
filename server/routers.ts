import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";

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
});

export type AppRouter = typeof appRouter;
