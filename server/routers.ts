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
        tabId: z.string(),
      }))
      .query(async ({ input }) => {
        try {
          // Use the published CSV export URL
          const url = `https://docs.google.com/spreadsheets/d/${input.sheetId}/export?format=csv&gid=${input.tabId}`;
          
          console.log(`[bracket.getSheetData] Fetching CSV from: ${url}`);
          
          const response = await fetch(url, {
            method: 'GET',
            headers: {
              'Accept': 'text/csv',
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            // Add timeout
            signal: AbortSignal.timeout(10000)
          });
          
          if (!response.ok) {
            throw new Error(`Failed to fetch sheet data: ${response.status} ${response.statusText}`);
          }
          
          const csv = await response.text();
          console.log(`[bracket.getSheetData] Received ${csv.length} bytes from gid=${input.tabId}`);
          
          // Parse CSV into 2D array
          const lines = csv.split('\n');
          const values: any[][] = [];
          
          for (const line of lines) {
            if (!line.trim()) continue;
            
            const cells: any[] = [];
            let current = '';
            let inQuotes = false;
            
            for (let i = 0; i < line.length; i++) {
              const char = line[i];
              const nextChar = line[i + 1];
              
              if (char === '"') {
                if (inQuotes && nextChar === '"') {
                  current += '"';
                  i++;
                } else {
                  inQuotes = !inQuotes;
                }
              } else if (char === ',' && !inQuotes) {
                cells.push(current.trim());
                current = '';
              } else {
                current += char;
              }
            }
            
            cells.push(current.trim());
            values.push(cells);
          }
          
          return { success: true, values };
        } catch (error) {
          console.error(`[bracket.getSheetData] Error:`, error);
          return { success: false, error: error instanceof Error ? error.message : 'Unknown error', values: [] };
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
