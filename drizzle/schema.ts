import { sql } from "drizzle-orm";
import {
  check,
  datetime,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable(
  "users",
  {
    /**
     * Surrogate primary key. Auto-incremented numeric value managed by the database.
     * Use this for relations between tables.
     */
    id: int("id").autoincrement().primaryKey(),
    /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
    openId: varchar("openId", { length: 64 }).notNull().unique(),
    name: text("name"),
    email: varchar("email", { length: 320 }),
    loginMethod: varchar("loginMethod", { length: 64 }),
    role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
    lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
    discordDisplayName: varchar("discordDisplayName", { length: 255 }),
    discordUsername: varchar("discordUsername", { length: 255 }),
    discordAvatarUrl: varchar("discordAvatarUrl", { length: 512 }),
  },
  table => [index("users_discordUsername_idx").on(table.discordUsername)]
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const managedTeams = mysqlTable(
  "managed_teams",
  {
    id: int("id").autoincrement().primaryKey(),
    name: varchar("name", { length: 64 }).notNull(),
    slug: varchar("slug", { length: 80 }).notNull().unique(),
    captainUserId: int("captainUserId")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("managed_teams_captainUserId_idx").on(table.captainUserId)]
);

export const managedTeamMembers = mysqlTable(
  "managed_team_members",
  {
    id: int("id").autoincrement().primaryKey(),
    teamId: int("teamId")
      .notNull()
      .references(() => managedTeams.id, { onDelete: "cascade" }),
    userId: int("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: mysqlEnum("role", ["captain", "member"]).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    index("managed_team_members_teamId_idx").on(table.teamId),
    index("managed_team_members_userId_idx").on(table.userId),
    uniqueIndex("managed_team_members_team_user_unique").on(
      table.teamId,
      table.userId
    ),
  ]
);

export const managedTeamJoinLinks = mysqlTable(
  "managed_team_join_links",
  {
    id: int("id").autoincrement().primaryKey(),
    teamId: int("teamId")
      .notNull()
      .references(() => managedTeams.id, { onDelete: "cascade" }),
    createdByUserId: int("createdByUserId")
      .notNull()
      .references(() => users.id),
    tokenHash: varchar("tokenHash", { length: 64 }).notNull(),
    status: mysqlEnum("status", ["active", "revoked"])
      .default("active")
      .notNull(),
    expiresAt: timestamp("expiresAt"),
    maxUses: int("maxUses"),
    useCount: int("useCount").default(0).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index("managed_team_join_links_team_status_idx").on(
      table.teamId,
      table.status
    ),
    uniqueIndex("managed_team_join_links_tokenHash_unique").on(table.tokenHash),
  ]
);

export const managedTeamInvites = mysqlTable(
  "managed_team_invites",
  {
    id: int("id").autoincrement().primaryKey(),
    teamId: int("teamId")
      .notNull()
      .references(() => managedTeams.id, { onDelete: "cascade" }),
    invitedUserId: int("invitedUserId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdByUserId: int("createdByUserId")
      .notNull()
      .references(() => users.id),
    status: mysqlEnum("status", ["pending", "accepted", "declined", "revoked"])
      .default("pending")
      .notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index("managed_team_invites_invited_status_idx").on(
      table.invitedUserId,
      table.status
    ),
    index("managed_team_invites_team_status_idx").on(
      table.teamId,
      table.status
    ),
    uniqueIndex("managed_team_invites_team_invited_unique").on(
      table.teamId,
      table.invitedUserId
    ),
  ]
);

export type ManagedTeam = typeof managedTeams.$inferSelect;
export type ManagedTeamMember = typeof managedTeamMembers.$inferSelect;
export type ManagedTeamInvite = typeof managedTeamInvites.$inferSelect;
export type ManagedTeamJoinLink = typeof managedTeamJoinLinks.$inferSelect;

export const teamFinderListings = mysqlTable(
  "team_finder_listings",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    listingType: mysqlEnum("listingType", ["lft", "lfp"])
      .default("lft")
      .notNull(),
    title: varchar("title", { length: 120 }).notNull(),
    description: text("description").notNull(),
    platform: varchar("platform", { length: 64 }),
    region: varchar("region", { length: 64 }),
    availability: varchar("availability", { length: 255 }),
    preferredRole: varchar("preferredRole", { length: 64 }),
    contact: varchar("contact", { length: 255 }),
    hiddenByAdmin: int("hiddenByAdmin").default(0).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index("team_finder_listings_userId_idx").on(table.userId),
    index("team_finder_listings_hiddenByAdmin_idx").on(table.hiddenByAdmin),
    index("team_finder_listings_createdAt_idx").on(table.createdAt),
  ]
);

export type TeamFinderListing = typeof teamFinderListings.$inferSelect;
export type InsertTeamFinderListing = typeof teamFinderListings.$inferInsert;

export const teamFinderReports = mysqlTable(
  "team_finder_reports",
  {
    id: int("id").autoincrement().primaryKey(),
    listingId: int("listingId")
      .notNull()
      .references(() => teamFinderListings.id, { onDelete: "cascade" }),
    reporterUserId: int("reporterUserId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    reason: text("reason").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    index("team_finder_reports_listingId_idx").on(table.listingId),
    uniqueIndex("team_finder_reports_listing_reporter_unique").on(
      table.listingId,
      table.reporterUserId
    ),
  ]
);

export type TeamFinderReport = typeof teamFinderReports.$inferSelect;
export type InsertTeamFinderReport = typeof teamFinderReports.$inferInsert;

// Tournament status and live data
export const tournaments = mysqlTable(
  "tournaments",
  {
    id: int("id").autoincrement().primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    eventStatus: mysqlEnum("eventStatus", ["not-live", "live", "complete"])
      .default("not-live")
      .notNull(),
    currentCycle: mysqlEnum("currentCycle", ["1", "2", "3"])
      .default("1")
      .notNull(),
    currentStage: mysqlEnum("currentStage", [
      "check-in",
      "cashout",
      "final-round",
      "finished",
    ])
      .default("check-in")
      .notNull(),
    currentMatch: varchar("currentMatch", { length: 255 }).default(
      "Team A vs Team B"
    ),
    eventNote: text("eventNote"),
    registrationOpen: int("registrationOpen").default(0).notNull(),
    visibility: mysqlEnum("visibility", ["private", "public"])
      .default("private")
      .notNull(),
    publicSlug: varchar("publicSlug", { length: 120 }),
    publishedAt: timestamp("publishedAt"),
    maxTeams: int("maxTeams"),
    ownerUserId: int("ownerUserId").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("tournaments_publicSlug_unique").on(table.publicSlug),
    index("tournaments_visibility_published_idx").on(
      table.visibility,
      table.publishedAt
    ),
    index("tournaments_owner_visibility_idx").on(
      table.ownerUserId,
      table.visibility
    ),
  ]
);

export type Tournament = typeof tournaments.$inferSelect;
export type InsertTournament = typeof tournaments.$inferInsert;

export const tournamentPrivateInviteLinks = mysqlTable(
  "tournament_private_invite_links",
  {
    id: int("id").autoincrement().primaryKey(),
    tournamentId: int("tournamentId")
      .notNull()
      .references(() => tournaments.id, { onDelete: "cascade" }),
    createdByUserId: int("createdByUserId")
      .notNull()
      .references(() => users.id),
    token: varchar("token", { length: 128 }).notNull(),
    status: mysqlEnum("status", ["active", "revoked"])
      .default("active")
      .notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index("tournament_private_invite_links_tournament_status_idx").on(
      table.tournamentId,
      table.status
    ),
    uniqueIndex("tournament_private_invite_links_token_unique").on(table.token),
  ]
);

export type TournamentPrivateInviteLink =
  typeof tournamentPrivateInviteLinks.$inferSelect;

export const tournamentStaffMembers = mysqlTable(
  "tournament_staff_members",
  {
    id: int("id").autoincrement().primaryKey(),
    tournamentId: int("tournamentId")
      .notNull()
      .references(() => tournaments.id, { onDelete: "cascade" }),
    userId: int("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: mysqlEnum("role", ["collaborator"]).default("collaborator").notNull(),
    addedByUserId: int("addedByUserId")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index("tournament_staff_members_tournament_idx").on(table.tournamentId),
    index("tournament_staff_members_user_idx").on(table.userId),
    uniqueIndex("tournament_staff_members_tournament_user_unique").on(
      table.tournamentId,
      table.userId
    ),
  ]
);

export const tournamentStaffInviteLinks = mysqlTable(
  "tournament_staff_invite_links",
  {
    id: int("id").autoincrement().primaryKey(),
    tournamentId: int("tournamentId")
      .notNull()
      .references(() => tournaments.id, { onDelete: "cascade" }),
    createdByUserId: int("createdByUserId")
      .notNull()
      .references(() => users.id),
    tokenHash: varchar("tokenHash", { length: 64 }).notNull(),
    status: mysqlEnum("status", ["active", "accepted", "revoked"])
      .default("active")
      .notNull(),
    expiresAt: timestamp("expiresAt").notNull(),
    acceptedByUserId: int("acceptedByUserId").references(() => users.id),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index("tournament_staff_invite_links_tournament_status_idx").on(
      table.tournamentId,
      table.status
    ),
    index("tournament_staff_invite_links_status_expires_idx").on(
      table.status,
      table.expiresAt
    ),
    uniqueIndex("tournament_staff_invite_links_tokenHash_unique").on(
      table.tokenHash
    ),
  ]
);

export type TournamentStaffMember = typeof tournamentStaffMembers.$inferSelect;
export type TournamentStaffInviteLink =
  typeof tournamentStaffInviteLinks.$inferSelect;

// Teams in a tournament
export const teams = mysqlTable("teams", {
  id: int("id").autoincrement().primaryKey(),
  tournamentId: int("tournamentId").notNull(),
  managedTeamId: int("managedTeamId").references(() => managedTeams.id),
  name: varchar("name", { length: 255 }).notNull(),
  frp: int("frp").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Team = typeof teams.$inferSelect;
export type InsertTeam = typeof teams.$inferInsert;

export const tournamentTeamSubmissions = mysqlTable(
  "tournament_team_submissions",
  {
    id: int("id").autoincrement().primaryKey(),
    tournamentId: int("tournamentId")
      .notNull()
      .references(() => tournaments.id, { onDelete: "cascade" }),
    managedTeamId: int("managedTeamId")
      .notNull()
      .references(() => managedTeams.id, { onDelete: "cascade" }),
    submittedByUserId: int("submittedByUserId")
      .notNull()
      .references(() => users.id),
    status: mysqlEnum("status", ["pending", "approved", "rejected"])
      .default("pending")
      .notNull(),
    adminNote: text("adminNote"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index("tournament_team_submissions_tournament_status_idx").on(
      table.tournamentId,
      table.status
    ),
    index("tournament_team_submissions_managedTeamId_idx").on(
      table.managedTeamId
    ),
    uniqueIndex("tournament_team_submissions_tournament_team_unique").on(
      table.tournamentId,
      table.managedTeamId
    ),
  ]
);

export type TournamentTeamSubmission =
  typeof tournamentTeamSubmissions.$inferSelect;
export type InsertTournamentTeamSubmission =
  typeof tournamentTeamSubmissions.$inferInsert;

export const tournamentGames = mysqlTable(
  "tournament_games",
  {
    id: int("id").autoincrement().primaryKey(),
    tournamentId: int("tournamentId")
      .notNull()
      .references(() => tournaments.id, { onDelete: "cascade" }),
    gameType: mysqlEnum("gameType", ["cashout", "final_round"]).notNull(),
    displayLabel: varchar("displayLabel", { length: 80 }).notNull(),
    status: mysqlEnum("status", ["draft", "ready", "live", "complete"])
      .default("draft")
      .notNull(),
    canvasX: int("canvasX").default(120).notNull(),
    canvasY: int("canvasY").default(120).notNull(),
    privateLobbyCode: varchar("privateLobbyCode", { length: 64 }),
    roundGroupId: varchar("roundGroupId", { length: 64 }),
    roundLabel: varchar("roundLabel", { length: 80 }),
    roundColor: varchar("roundColor", { length: 24 }),
    broadcastUrl: varchar("broadcastUrl", { length: 1024 }),
    mapId: varchar("mapId", { length: 64 }),
    seriesBestOf: int("seriesBestOf").default(1).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index("tournament_games_tournament_idx").on(table.tournamentId),
    index("tournament_games_status_idx").on(table.status),
    index("tournament_games_round_group_idx").on(
      table.tournamentId,
      table.roundGroupId
    ),
  ]
);

export const tournamentGameConnections = mysqlTable(
  "tournament_game_connections",
  {
    id: int("id").autoincrement().primaryKey(),
    tournamentId: int("tournamentId")
      .notNull()
      .references(() => tournaments.id, { onDelete: "cascade" }),
    sourceGameId: int("sourceGameId")
      .notNull()
      .references(() => tournamentGames.id, { onDelete: "cascade" }),
    targetGameId: int("targetGameId")
      .notNull()
      .references(() => tournamentGames.id, { onDelete: "cascade" }),
    flowType: mysqlEnum("flowType", ["winner", "loser"])
      .default("winner")
      .notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index("tournament_game_connections_tournament_idx").on(table.tournamentId),
    index("tournament_game_connections_source_idx").on(table.sourceGameId),
    index("tournament_game_connections_target_idx").on(table.targetGameId),
    uniqueIndex("tournament_game_connections_source_target_flow_unique").on(
      table.sourceGameId,
      table.targetGameId,
      table.flowType
    ),
  ]
);

export type TournamentGameConnection =
  typeof tournamentGameConnections.$inferSelect;
export type InsertTournamentGameConnection =
  typeof tournamentGameConnections.$inferInsert;

export const tournamentViewerLinks = mysqlTable(
  "tournament_viewer_links",
  {
    id: int("id").autoincrement().primaryKey(),
    tournamentId: int("tournamentId")
      .notNull()
      .references(() => tournaments.id, { onDelete: "cascade" }),
    createdByUserId: int("createdByUserId")
      .notNull()
      .references(() => users.id),
    tokenHash: varchar("tokenHash", { length: 64 }).notNull(),
    status: mysqlEnum("status", ["active", "revoked"])
      .default("active")
      .notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index("tournament_viewer_links_tournament_status_idx").on(
      table.tournamentId,
      table.status
    ),
    uniqueIndex("tournament_viewer_links_tokenHash_unique").on(table.tokenHash),
  ]
);

export const tournamentControlTemplates = mysqlTable(
  "tournament_control_templates",
  {
    id: int("id").autoincrement().primaryKey(),
    name: varchar("name", { length: 120 }).notNull(),
    visibility: mysqlEnum("visibility", ["private", "public"])
      .default("private")
      .notNull(),
    createdByUserId: int("createdByUserId")
      .notNull()
      .references(() => users.id),
    sourceTournamentId: int("sourceTournamentId").references(
      () => tournaments.id,
      { onDelete: "set null" }
    ),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index("tournament_control_templates_creator_idx").on(table.createdByUserId),
    index("tournament_control_templates_visibility_idx").on(table.visibility),
  ]
);

export const tournamentControlTemplateGames = mysqlTable(
  "tournament_control_template_games",
  {
    id: int("id").autoincrement().primaryKey(),
    templateId: int("templateId")
      .notNull()
      .references(() => tournamentControlTemplates.id, { onDelete: "cascade" }),
    gameType: mysqlEnum("gameType", ["cashout", "final_round"]).notNull(),
    displayLabel: varchar("displayLabel", { length: 80 }).notNull(),
    canvasX: int("canvasX").default(120).notNull(),
    canvasY: int("canvasY").default(120).notNull(),
    seriesBestOf: int("seriesBestOf").default(1).notNull(),
    mapId: varchar("mapId", { length: 64 }),
    roundGroupId: varchar("roundGroupId", { length: 64 }),
    roundLabel: varchar("roundLabel", { length: 80 }),
    roundColor: varchar("roundColor", { length: 24 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index("tournament_control_template_games_template_idx").on(
      table.templateId
    ),
  ]
);

export const tournamentControlTemplateConnections = mysqlTable(
  "tournament_control_template_connections",
  {
    id: int("id").autoincrement().primaryKey(),
    templateId: int("templateId")
      .notNull()
      .references(() => tournamentControlTemplates.id, { onDelete: "cascade" }),
    sourceTemplateGameId: int("sourceTemplateGameId")
      .notNull()
      .references(() => tournamentControlTemplateGames.id, {
        onDelete: "cascade",
      }),
    targetTemplateGameId: int("targetTemplateGameId")
      .notNull()
      .references(() => tournamentControlTemplateGames.id, {
        onDelete: "cascade",
      }),
    flowType: mysqlEnum("flowType", ["winner", "loser"])
      .default("winner")
      .notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    index("tournament_control_template_connections_template_idx").on(
      table.templateId
    ),
    uniqueIndex("tournament_control_template_connections_unique").on(
      table.sourceTemplateGameId,
      table.targetTemplateGameId,
      table.flowType
    ),
  ]
);

export const tournamentTeamClaimLinks = mysqlTable(
  "tournament_team_claim_links",
  {
    id: int("id").autoincrement().primaryKey(),
    tournamentTeamId: int("tournamentTeamId")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    createdByUserId: int("createdByUserId")
      .notNull()
      .references(() => users.id),
    tokenHash: varchar("tokenHash", { length: 64 }).notNull(),
    status: mysqlEnum("status", ["active", "claimed", "revoked"])
      .default("active")
      .notNull(),
    claimedByUserId: int("claimedByUserId").references(() => users.id),
    expiresAt: timestamp("expiresAt").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index("tournament_team_claim_links_team_status_idx").on(
      table.tournamentTeamId,
      table.status
    ),
    uniqueIndex("tournament_team_claim_links_tokenHash_unique").on(
      table.tokenHash
    ),
  ]
);

export const tournamentGameAssignments = mysqlTable(
  "tournament_game_assignments",
  {
    id: int("id").autoincrement().primaryKey(),
    gameId: int("gameId")
      .notNull()
      .references(() => tournamentGames.id, { onDelete: "cascade" }),
    teamId: int("teamId")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    slotIndex: int("slotIndex").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index("tournament_game_assignments_team_idx").on(table.teamId),
    uniqueIndex("tournament_game_assignments_game_slot_unique").on(
      table.gameId,
      table.slotIndex
    ),
    uniqueIndex("tournament_game_assignments_game_team_unique").on(
      table.gameId,
      table.teamId
    ),
  ]
);

export type TournamentGame = typeof tournamentGames.$inferSelect;
export type InsertTournamentGame = typeof tournamentGames.$inferInsert;
export type TournamentGameAssignment =
  typeof tournamentGameAssignments.$inferSelect;
export type InsertTournamentGameAssignment =
  typeof tournamentGameAssignments.$inferInsert;
export type TournamentTeamClaimLink =
  typeof tournamentTeamClaimLinks.$inferSelect;

export const tournamentLobbyCodeDeliveries = mysqlTable(
  "tournament_lobby_code_deliveries",
  {
    id: int("id").autoincrement().primaryKey(),
    gameId: int("gameId")
      .notNull()
      .references(() => tournamentGames.id, { onDelete: "cascade" }),
    teamId: int("teamId")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    releasedByUserId: int("releasedByUserId")
      .notNull()
      .references(() => users.id),
    status: mysqlEnum("status", ["available", "revoked"])
      .default("available")
      .notNull(),
    lastDiscordAttemptAt: timestamp("lastDiscordAttemptAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index("tournament_lobby_code_deliveries_team_status_idx").on(
      table.teamId,
      table.status
    ),
    uniqueIndex("tournament_lobby_code_deliveries_game_team_unique").on(
      table.gameId,
      table.teamId
    ),
  ]
);

export type TournamentLobbyCodeDelivery =
  typeof tournamentLobbyCodeDeliveries.$inferSelect;

// Tournament history archive
export const tournamentHistory = mysqlTable("tournament_history", {
  id: int("id").autoincrement().primaryKey(),
  tournamentId: int("tournamentId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  winner: varchar("winner", { length: 255 }).notNull(),
  runnerUp: varchar("runner_up", { length: 255 }),
  finalFrp: int("finalFrp").default(0).notNull(),
  completedAt: timestamp("completedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TournamentHistory = typeof tournamentHistory.$inferSelect;
export type InsertTournamentHistory = typeof tournamentHistory.$inferInsert;

// Patch notes from The Finals
export const patchNotes = mysqlTable("patch_notes", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  date: varchar("date", { length: 64 }).notNull(),
  content: text("content").notNull(),
  url: varchar("url", { length: 512 }),
  sourceUrl: varchar("sourceUrl", { length: 512 }),
  version: varchar("version", { length: 64 }),
  isGameUpdate: int("isGameUpdate").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PatchNote = typeof patchNotes.$inferSelect;
export type InsertPatchNote = typeof patchNotes.$inferInsert;

// VOD analysis intake records
export const vodAnalyses = mysqlTable("vod_analyses", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  sourceType: mysqlEnum("sourceType", [
    "twitch",
    "youtube",
    "google_drive",
    "generic",
  ]).notNull(),
  sourceUrl: varchar("sourceUrl", { length: 1024 }).notNull(),
  normalizedSourceUrl: varchar("normalizedSourceUrl", {
    length: 1024,
  }).notNull(),
  sourceId: varchar("sourceId", { length: 255 }),
  sourceRef: varchar("sourceRef", { length: 255 }),
  thumbnailUrl: varchar("thumbnailUrl", { length: 1024 }),
  durationSeconds: int("durationSeconds"),
  videoPov: mysqlEnum("videoPov", ["player", "spectator"]).notNull(),
  status: mysqlEnum("status", ["created"]).default("created").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type VodAnalysis = typeof vodAnalyses.$inferSelect;
export type InsertVodAnalysis = typeof vodAnalyses.$inferInsert;

// VOD capture job records for planned future frame capture work.
export const vodCaptureJobs = mysqlTable(
  "vod_capture_jobs",
  {
    id: int("id").autoincrement().primaryKey(),
    vodAnalysisId: int("vodAnalysisId")
      .notNull()
      .references(() => vodAnalyses.id, { onDelete: "cascade" }),
    status: mysqlEnum("status", [
      "queued",
      "processing",
      "complete",
      "failed",
      "cancelled",
    ])
      .default("queued")
      .notNull(),
    source: mysqlEnum("source", ["manual_debug", "automation"])
      .default("manual_debug")
      .notNull(),
    sampleIntervalSeconds: int("sampleIntervalSeconds").notNull(),
    plannedSamples: int("plannedSamples").notNull(),
    processedSamples: int("processedSamples").default(0).notNull(),
    failedSamples: int("failedSamples").default(0).notNull(),
    errorMessage: text("errorMessage"),
    startedAt: datetime("startedAt"),
    completedAt: datetime("completedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index("vod_capture_jobs_vodAnalysisId_idx").on(table.vodAnalysisId),
    index("vod_capture_jobs_status_idx").on(table.status),
    index("vod_capture_jobs_createdAt_idx").on(table.createdAt),
  ]
);

export type VodCaptureJob = typeof vodCaptureJobs.$inferSelect;
export type InsertVodCaptureJob = typeof vodCaptureJobs.$inferInsert;

// Manual timeline events recorded against a VOD analysis.
export const vodAnalysisEvents = mysqlTable(
  "vod_analysis_events",
  {
    id: int("id").autoincrement().primaryKey(),
    vodAnalysisId: int("vodAnalysisId")
      .notNull()
      .references(() => vodAnalyses.id, { onDelete: "cascade" }),
    eventType: mysqlEnum("eventType", [
      "death",
      "tap",
      "plug",
      "cashout",
      "team_wipe",
      "team_spawn",
      "steal_flip",
      "revive",
      "defib",
    ]).notNull(),
    timestampSeconds: int("timestampSeconds").notNull(),
    actorLabel: varchar("actorLabel", { length: 255 }),
    targetLabel: varchar("targetLabel", { length: 255 }),
    teamLabel: varchar("teamLabel", { length: 255 }),
    metadata: text("metadata"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index("vod_analysis_events_vodAnalysisId_idx").on(table.vodAnalysisId),
    index("vod_analysis_events_eventType_idx").on(table.eventType),
    index("vod_analysis_events_timestampSeconds_idx").on(
      table.timestampSeconds
    ),
    check(
      "vod_analysis_events_timestampSeconds_non_negative",
      sql`${table.timestampSeconds} >= 0`
    ),
  ]
);

export type VodAnalysisEvent = typeof vodAnalysisEvents.$inferSelect;
export type InsertVodAnalysisEvent = typeof vodAnalysisEvents.$inferInsert;

// Suggested timeline events queued for human review before confirmation.
export const vodSuggestedEvents = mysqlTable(
  "vod_suggested_events",
  {
    id: int("id").autoincrement().primaryKey(),
    vodAnalysisId: int("vodAnalysisId")
      .notNull()
      .references(() => vodAnalyses.id, { onDelete: "cascade" }),
    eventType: mysqlEnum("eventType", [
      "death",
      "tap",
      "plug",
      "cashout",
      "team_wipe",
      "team_spawn",
      "steal_flip",
      "revive",
      "defib",
    ]).notNull(),
    timestampSeconds: int("timestampSeconds").notNull(),
    actorLabel: varchar("actorLabel", { length: 255 }),
    targetLabel: varchar("targetLabel", { length: 255 }),
    teamLabel: varchar("teamLabel", { length: 255 }),
    metadata: text("metadata"),
    source: mysqlEnum("source", [
      "manual_test",
      "debug",
      "automation",
    ]).notNull(),
    confidence: int("confidence"),
    status: mysqlEnum("status", ["pending", "approved", "rejected"])
      .default("pending")
      .notNull(),
    confirmedVodEventId: int("confirmedVodEventId").references(
      () => vodAnalysisEvents.id,
      { onDelete: "set null" }
    ),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index("vod_suggested_events_vodAnalysisId_idx").on(table.vodAnalysisId),
    index("vod_suggested_events_status_idx").on(table.status),
    index("vod_suggested_events_eventType_idx").on(table.eventType),
    index("vod_suggested_events_timestampSeconds_idx").on(
      table.timestampSeconds
    ),
    check(
      "vod_suggested_events_timestampSeconds_non_negative",
      sql`${table.timestampSeconds} >= 0`
    ),
    check(
      "vod_suggested_events_confidence_range",
      sql`${table.confidence} IS NULL OR (${table.confidence} >= 0 AND ${table.confidence} <= 100)`
    ),
  ]
);

export type VodSuggestedEvent = typeof vodSuggestedEvents.$inferSelect;
export type InsertVodSuggestedEvent = typeof vodSuggestedEvents.$inferInsert;
