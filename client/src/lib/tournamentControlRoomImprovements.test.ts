import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import {
  boardSnapshotSchema,
  broadcastUrlSchema,
  storedMapIdSchema,
  userSelectedMapIdSchema,
} from "../../../server/tournamentControl";

describe("Tournament Control Room improvements", () => {
  it("persists final-round seriesBestOf while rejecting BO3/BO5 for cashout in server code", async () => {
    const schema = await readFile(
      new URL("../../../drizzle/schema.ts", import.meta.url),
      "utf8"
    );
    const server = await readFile(
      new URL("../../../server/tournamentControl.ts", import.meta.url),
      "utf8"
    );
    expect(schema).toContain(
      'seriesBestOf: int("seriesBestOf").default(1).notNull()'
    );
    expect(server).toContain(
      "z.union([z.literal(1), z.literal(3), z.literal(5)])"
    );
    expect(server).toContain('gameType !== "final_round"');
    expect(server).toContain("setFinalRoundSeriesBestOf");
  });

  it("adds templates without storing private lobby codes or assigned teams", async () => {
    const schema = await readFile(
      new URL("../../../drizzle/schema.ts", import.meta.url),
      "utf8"
    );
    const server = await readFile(
      new URL("../../../server/tournamentControl.ts", import.meta.url),
      "utf8"
    );
    expect(schema).toContain("tournament_control_templates");
    expect(schema).toContain(
      'visibility: mysqlEnum("visibility", ["private", "public"])'
    );
    expect(schema).toContain("tournament_control_template_games");
    expect(schema).toContain("tournament_control_template_connections");
    const templateSection = schema.slice(
      schema.indexOf("tournamentControlTemplates"),
      schema.indexOf("tournamentViewerLinks")
    );
    expect(templateSection).not.toContain("privateLobbyCode");
    expect(server).toContain("createTournamentFromTemplate");
  });

  it("viewer query returns sanitized fields only", async () => {
    const server = await readFile(
      new URL("../../../server/tournamentControl.ts", import.meta.url),
      "utf8"
    );
    const viewerStart = server.indexOf("async function getViewerDataByToken");
    const viewerEnd = server.indexOf(
      "async function saveTemplateFromTournament"
    );
    const viewerCode = server.slice(viewerStart, viewerEnd);
    expect(viewerCode).toContain("frp: teams.frp");
    expect(viewerCode).toContain("seriesBestOf");
    expect(viewerCode).toContain("mapId");
    expect(viewerCode).toContain("broadcastUrl");
    expect(viewerCode).not.toContain("privateLobbyCode");
    expect(viewerCode).not.toContain("captainDiscordId");
    expect(viewerCode).not.toContain("captainUserId");
    expect(viewerCode).not.toContain("captainDiscordOpenId");
  });

  it("builds the viewer board without touching the captain tables", async () => {
    // The public viewer used to project the full staff board down, which
    // meant joining managed_teams and users to resolve each team's captain
    // and carrying their Discord open ids to an unauthenticated endpoint
    // before discarding them. Selecting the viewer's own columns keeps that
    // data out of the query entirely.
    const server = await readFile(
      new URL("../../../server/tournamentControl.ts", import.meta.url),
      "utf8"
    );
    const start = server.indexOf("async function fetchViewerBoard");
    expect(start).toBeGreaterThan(-1);
    const body = server.slice(
      start,
      server.indexOf("async function", start + 1)
    );
    expect(body).not.toContain("managedTeams");
    expect(body).not.toContain("leftJoin");
    expect(body).not.toContain("fetchTournamentRows");
  });

  it("does not hand the viewer the staff board", async () => {
    const server = await readFile(
      new URL("../../../server/tournamentControl.ts", import.meta.url),
      "utf8"
    );
    expect(server).toContain("return fetchViewerBoard(db, link.tournamentId)");
  });

  it("manual team claim links are token-hashed, single-use, expiring, and create managed ownership", async () => {
    const schema = await readFile(
      new URL("../../../drizzle/schema.ts", import.meta.url),
      "utf8"
    );
    const server = await readFile(
      new URL("../../../server/tournamentControl.ts", import.meta.url),
      "utf8"
    );
    expect(schema).toContain("tournament_team_claim_links");
    expect(schema).toContain(
      'status: mysqlEnum("status", ["active", "claimed", "revoked"])'
    );
    expect(schema).toContain(
      'uniqueIndex("tournament_team_claim_links_tokenHash_unique")'
    );
    expect(server).toContain("This team is already managed.");
    expect(server).toContain("This claim link has already been used.");
    expect(server).toContain("This claim link has expired.");
    expect(server).toContain("This claim link has been revoked.");
    expect(server).toContain(".insert(managedTeams)");
    expect(server).toContain(".values({");
    expect(server).toContain(".insert(managedTeamMembers)");
    expect(server).toContain("managedTeamId: managedTeam.id");
  });

  it("persists and validates map ids through viewers and templates", async () => {
    const schema = await readFile(
      new URL("../../../drizzle/schema.ts", import.meta.url),
      "utf8"
    );
    const server = await readFile(
      new URL("../../../server/tournamentControl.ts", import.meta.url),
      "utf8"
    );
    expect(schema).toContain('mapId: varchar("mapId", { length: 64 })');
    expect(userSelectedMapIdSchema.safeParse("monaco").success).toBe(true);
    expect(userSelectedMapIdSchema.safeParse("seoul").success).toBe(true);
    expect(storedMapIdSchema.safeParse("seoul").success).toBe(true);
    expect(server).toContain("setGameMap");
    expect(server).toContain("randomizeGameMap");
    expect(server).toContain("DEFAULT_COMPETITIVE_MAP_IDS");
    expect(server).toContain("mapId: game.mapId");
    expect(server).toContain("broadcastUrl: game.broadcastUrl");
  });

  it("supports tournament owners, rename, and safe delete without deleting templates", async () => {
    const schema = await readFile(
      new URL("../../../drizzle/schema.ts", import.meta.url),
      "utf8"
    );
    const server = await readFile(
      new URL("../../../server/tournamentControl.ts", import.meta.url),
      "utf8"
    );
    expect(schema).toContain('ownerUserId: int("ownerUserId").references');
    expect(server).toContain("ownerUserId: ctx.user.id");
    expect(server).toContain("setTournamentOwner");
    expect(server).toContain("renameTournament");
    expect(server).toContain("deleteTournament");
    expect(server).toContain(
      "UPDATE tournament_control_templates SET sourceTournamentId = NULL"
    );
  });

  it("adds staff-protected board cleanup and undo restore mutations", async () => {
    const server = await readFile(
      new URL("../../../server/tournamentControl.ts", import.meta.url),
      "utf8"
    );
    expect(server).toContain("clearTournamentConnections");
    expect(server).toContain("returnTournamentTeamsToAvailable");
    expect(server).toContain("clearTournamentCanvas");
    expect(server).toContain("restoreTournamentBoardSnapshot");
    expect(server).toContain("discordTournamentStaffProcedure");
    expect(server).toContain(".input(tournamentIdSchema)");
    expect(server).toContain("boardSnapshotSchema");
    expect(server).toContain(
      "Snapshot assignment references a team from another tournament"
    );
    expect(server).toContain("const gameIdMap = new Map<number, number>()");
    expect(server).toContain(
      "DELETE FROM tournament_game_connections WHERE tournamentId"
    );
    expect(server).toContain("return fetchTournamentRows(tx, tournamentId)");
  });

  it("adds staff-only broadcast URLs without exposing private lobby codes", async () => {
    const schema = await readFile(
      new URL("../../../drizzle/schema.ts", import.meta.url),
      "utf8"
    );
    const server = await readFile(
      new URL("../../../server/tournamentControl.ts", import.meta.url),
      "utf8"
    );
    expect(schema).toContain(
      'broadcastUrl: varchar("broadcastUrl", { length: 1024 })'
    );
    expect(server).toContain("export const broadcastUrlSchema");
    expect(server).toContain(
      "setBroadcastUrl: discordTournamentStaffProcedure"
    );
    expect(server).not.toContain(
      "publicProcedure.input(gameIdSchema.extend({ broadcastUrl"
    );
    const viewerCode = server.slice(
      server.indexOf("async function getViewerDataByToken"),
      server.indexOf("async function saveTemplateFromTournament")
    );
    expect(viewerCode).toContain("broadcastUrl: tournamentGames.broadcastUrl");
    expect(viewerCode).not.toContain("privateLobbyCode");
    const restoreCode = server.slice(
      server.indexOf("async function restoreTournamentBoardSnapshot"),
      server.indexOf("function assertSeriesBestOf")
    );
    expect(restoreCode).toContain("broadcastUrl: game.broadcastUrl ?? null");
  });

  it("keeps the broadcast dialog reachable from the board", async () => {
    const controlRoom = await readFile(
      new URL("../pages/TournamentControlRoom.tsx", import.meta.url),
      "utf8"
    );
    const lobbyNode = await readFile(
      new URL("../components/tcr/TcrLobbyNode.tsx", import.meta.url),
      "utf8"
    );
    const inspector = await readFile(
      new URL("../components/tcr/TcrInspector.tsx", import.meta.url),
      "utf8"
    );

    expect(controlRoom).toContain('dialogState?.type === "broadcast"');
    // Reachable from the lobby node context menu and from the inspector.
    expect(lobbyNode).toContain("Set/Clear Broadcast Link");
    expect(inspector).toContain("Set Broadcast");
    // A lobby with a broadcast link says so on the node.
    expect(lobbyNode).toContain("Broadcast Link Set");
  });
});

/**
 * Behavioral cover for the broadcast URL boundary.
 *
 * broadcastUrl is the one staff-entered free-text field that reaches the
 * PUBLIC viewer (/bracket/<token>) and is rendered there as a link, so the
 * scheme restriction is a security boundary, not a formatting nicety.
 */
describe("broadcastUrlSchema", () => {
  const parse = (value: unknown) => broadcastUrlSchema.safeParse(value);

  it("accepts an ordinary https broadcast link", () => {
    const result = parse("https://twitch.tv/murphtournaments");
    expect(result.success).toBe(true);
    if (result.success)
      expect(result.data).toBe("https://twitch.tv/murphtournaments");
  });

  it("upgrades a scheme-less host to https so the viewer link is absolute", () => {
    const result = parse("twitch.tv/murphtournaments");
    expect(result.success).toBe(true);
    if (result.success)
      expect(result.data).toBe("https://twitch.tv/murphtournaments");
  });

  it("upgrades a protocol-relative link to https", () => {
    const result = parse("//twitch.tv/murphtournaments");
    expect(result.success).toBe(true);
    if (result.success)
      expect(result.data).toBe("https://twitch.tv/murphtournaments");
  });

  it("normalizes an empty or whitespace-only value to null", () => {
    for (const value of ["", "   ", "\t\n"]) {
      const result = parse(value);
      expect(result.success).toBe(true);
      if (result.success) expect(result.data).toBeNull();
    }
  });

  it("trims surrounding whitespace", () => {
    const result = parse("  https://twitch.tv/x  ");
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe("https://twitch.tv/x");
  });

  it("rejects javascript: and other script-bearing schemes", () => {
    // These would otherwise become an href in the public viewer.
    expect(parse("javascript:alert(1)").success).toBe(false);
    expect(parse("JavaScript:alert(1)").success).toBe(false);
    expect(parse("data:text/html;base64,PHNjcmlwdD4=").success).toBe(false);
    expect(parse("vbscript:msgbox(1)").success).toBe(false);
  });

  it("rejects non-web schemes", () => {
    expect(parse("file:///etc/passwd").success).toBe(false);
    expect(parse("ftp://example.com/x").success).toBe(false);
  });

  it("accepts plain http", () => {
    expect(parse("http://example.com/stream").success).toBe(true);
  });

  it("rejects a URL longer than the column allows", () => {
    expect(parse(`https://example.com/${"a".repeat(1100)}`).success).toBe(
      false
    );
  });

  it("accepts an explicit null", () => {
    const result = parse(null);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBeNull();
  });
});

/**
 * Bounds on the undo/restore payload.
 *
 * restoreTournamentBoardSnapshot takes the largest client-supplied body in
 * the product and express accepts up to 50mb, so the arrays are capped
 * during parsing rather than only in the handler.
 */
describe("boardSnapshotSchema size limits", () => {
  const game = (id: number) => ({
    id,
    tournamentId: 1,
    gameType: "cashout" as const,
    status: "ready" as const,
    displayLabel: `Lobby ${id}`,
    canvasX: 0,
    canvasY: 0,
  });
  const assignment = (id: number) => ({
    id,
    gameId: 1,
    teamId: id,
    slotIndex: 1,
  });
  const connection = (id: number) => ({
    id,
    tournamentId: 1,
    sourceGameId: 1,
    targetGameId: 2,
    flowType: "winner" as const,
  });
  const snapshot = (counts: {
    games?: number;
    assignments?: number;
    connections?: number;
  }) => ({
    expectedRevision: 0,
    games: Array.from({ length: counts.games ?? 1 }, (_, i) => game(i + 1)),
    assignments: Array.from({ length: counts.assignments ?? 0 }, (_, i) =>
      assignment(i + 1)
    ),
    connections: Array.from({ length: counts.connections ?? 0 }, (_, i) =>
      connection(i + 1)
    ),
  });

  it("accepts a board at the documented limits", () => {
    const result = boardSnapshotSchema.safeParse(
      snapshot({ games: 64, assignments: 256, connections: 512 })
    );
    expect(result.success).toBe(true);
  });

  it("rejects more lobbies than a tournament may hold", () => {
    expect(boardSnapshotSchema.safeParse(snapshot({ games: 65 })).success).toBe(
      false
    );
  });

  it("rejects an oversized assignments array", () => {
    expect(
      boardSnapshotSchema.safeParse(snapshot({ assignments: 257 })).success
    ).toBe(false);
  });

  it("rejects an oversized connections array", () => {
    expect(
      boardSnapshotSchema.safeParse(snapshot({ connections: 513 })).success
    ).toBe(false);
  });

  it("still accepts an ordinary small board", () => {
    const result = boardSnapshotSchema.safeParse(
      snapshot({ games: 4, assignments: 12, connections: 3 })
    );
    expect(result.success).toBe(true);
  });
});
