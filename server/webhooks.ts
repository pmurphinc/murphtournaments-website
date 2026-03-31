import { Request, Response } from "express";
import { z } from "zod";

/**
 * In-memory tournament state cache
 * This serves as the single source of truth for public tournament data
 * Updated via webhook from Discord bot
 */
interface TournamentState {
  eventWinner: string | null;
  status: string;
  currentLeader: string | null;
  updatedAt: string;
  tournamentId: string;
  cycle: number;
  isComplete: boolean;
}

// Separate state for each tournament
const tournamentStateCache: Record<string, TournamentState> = {
  "dev-division": {
    eventWinner: null,
    status: "Awaiting Update",
    currentLeader: null,
    updatedAt: new Date().toISOString(),
    tournamentId: "dev-division",
    cycle: 1,
    isComplete: false,
  },
  "7th-circle": {
    eventWinner: null,
    status: "Awaiting Update",
    currentLeader: null,
    updatedAt: new Date().toISOString(),
    tournamentId: "7th-circle",
    cycle: 1,
    isComplete: false,
  },
};

// Webhook payload validation schema
const webhookPayloadSchema = z.object({
  tournamentId: z.enum(["dev-division", "7th-circle"]),
  eventWinner: z.string().nullable().optional(),
  status: z.string(),
  currentLeader: z.string().nullable().optional(),
  cycle: z.number().optional(),
  isComplete: z.boolean().optional(),
});

export type WebhookPayload = z.infer<typeof webhookPayloadSchema>;

/**
 * Get current tournament state
 */
export function getTournamentState(tournamentId: string): TournamentState {
  return (
    tournamentStateCache[tournamentId] || {
      eventWinner: null,
      status: "Awaiting Update",
      currentLeader: null,
      updatedAt: new Date().toISOString(),
      tournamentId,
      cycle: 1,
      isComplete: false,
    }
  );
}

/**
 * Webhook endpoint handler for Discord bot updates
 * Validates webhook secret and updates tournament state
 */
export async function handleTournamentWebhook(
  req: Request,
  res: Response
): Promise<void> {
  try {
    // Validate webhook secret
    const webhookSecret = process.env.TOURNAMENT_WEBHOOK_SECRET;
    const authHeader = req.headers["x-webhook-secret"];

    if (!webhookSecret || authHeader !== webhookSecret) {
      res.status(401).json({ error: "Unauthorized: Invalid webhook secret" });
      return;
    }

    // Validate payload schema
    const payload = webhookPayloadSchema.parse(req.body);

    // Update tournament state
    const updatedState: TournamentState = {
      eventWinner: payload.eventWinner ?? tournamentStateCache[payload.tournamentId]?.eventWinner ?? null,
      status: payload.status,
      currentLeader: payload.currentLeader ?? tournamentStateCache[payload.tournamentId]?.currentLeader ?? null,
      updatedAt: new Date().toISOString(),
      tournamentId: payload.tournamentId,
      cycle: payload.cycle ?? tournamentStateCache[payload.tournamentId]?.cycle ?? 1,
      isComplete: payload.isComplete ?? tournamentStateCache[payload.tournamentId]?.isComplete ?? false,
    };

    tournamentStateCache[payload.tournamentId] = updatedState;

    console.log(
      `[Webhook] Tournament ${payload.tournamentId} updated:`,
      updatedState
    );

    res.status(200).json({
      success: true,
      message: "Tournament state updated",
      state: updatedState,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: "Invalid payload",
        details: error.issues,
      });
      return;
    }

    console.error("[Webhook] Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * Public endpoint to fetch current tournament state
 * No authentication required - this is public data
 */
export function handleGetTournamentState(
  req: Request,
  res: Response
): void {
  try {
    const { tournamentId } = req.params;

    if (!["dev-division", "7th-circle"].includes(tournamentId)) {
      res.status(400).json({ error: "Invalid tournament ID" });
      return;
    }

    const state = getTournamentState(tournamentId);
    res.status(200).json(state);
  } catch (error) {
    console.error("[Get Tournament State] Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
