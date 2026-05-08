import { sql } from "drizzle-orm";
import {
  check,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
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
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Tournament status and live data
export const tournaments = mysqlTable("tournaments", {
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
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Tournament = typeof tournaments.$inferSelect;
export type InsertTournament = typeof tournaments.$inferInsert;

// Teams in a tournament
export const teams = mysqlTable("teams", {
  id: int("id").autoincrement().primaryKey(),
  tournamentId: int("tournamentId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  frp: int("frp").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Team = typeof teams.$inferSelect;
export type InsertTeam = typeof teams.$inferInsert;
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
