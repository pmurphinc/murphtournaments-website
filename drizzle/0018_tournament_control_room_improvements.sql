ALTER TABLE `tournament_games` ADD `seriesBestOf` int NOT NULL DEFAULT 1;
--> statement-breakpoint
CREATE TABLE `tournament_viewer_links` (
  `id` int AUTO_INCREMENT NOT NULL,
  `tournamentId` int NOT NULL,
  `createdByUserId` int NOT NULL,
  `tokenHash` varchar(64) NOT NULL,
  `status` enum('active','revoked') NOT NULL DEFAULT 'active',
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `tournament_viewer_links_id` PRIMARY KEY(`id`),
  CONSTRAINT `tournament_viewer_links_tokenHash_unique` UNIQUE(`tokenHash`)
);
--> statement-breakpoint
CREATE TABLE `tournament_control_templates` (
  `id` int AUTO_INCREMENT NOT NULL,
  `name` varchar(120) NOT NULL,
  `visibility` enum('private','public') NOT NULL DEFAULT 'private',
  `createdByUserId` int NOT NULL,
  `sourceTournamentId` int,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `tournament_control_templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tournament_control_template_games` (
  `id` int AUTO_INCREMENT NOT NULL,
  `templateId` int NOT NULL,
  `gameType` enum('cashout','final_round') NOT NULL,
  `displayLabel` varchar(80) NOT NULL,
  `canvasX` int NOT NULL DEFAULT 120,
  `canvasY` int NOT NULL DEFAULT 120,
  `seriesBestOf` int NOT NULL DEFAULT 1,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `tournament_control_template_games_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tournament_control_template_connections` (
  `id` int AUTO_INCREMENT NOT NULL,
  `templateId` int NOT NULL,
  `sourceTemplateGameId` int NOT NULL,
  `targetTemplateGameId` int NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `tournament_control_template_connections_id` PRIMARY KEY(`id`),
  CONSTRAINT `tournament_control_template_connections_unique` UNIQUE(`sourceTemplateGameId`,`targetTemplateGameId`)
);
--> statement-breakpoint
CREATE TABLE `tournament_team_claim_links` (
  `id` int AUTO_INCREMENT NOT NULL,
  `tournamentTeamId` int NOT NULL,
  `createdByUserId` int NOT NULL,
  `tokenHash` varchar(64) NOT NULL,
  `status` enum('active','claimed','revoked') NOT NULL DEFAULT 'active',
  `claimedByUserId` int,
  `expiresAt` timestamp NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `tournament_team_claim_links_id` PRIMARY KEY(`id`),
  CONSTRAINT `tournament_team_claim_links_tokenHash_unique` UNIQUE(`tokenHash`)
);
--> statement-breakpoint
ALTER TABLE `tournament_viewer_links` ADD CONSTRAINT `tournament_viewer_links_tournamentId_tournaments_id_fk` FOREIGN KEY (`tournamentId`) REFERENCES `tournaments`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `tournament_viewer_links` ADD CONSTRAINT `tournament_viewer_links_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `tournament_control_templates` ADD CONSTRAINT `tournament_control_templates_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `tournament_control_templates` ADD CONSTRAINT `tournament_control_templates_sourceTournamentId_tournaments_id_fk` FOREIGN KEY (`sourceTournamentId`) REFERENCES `tournaments`(`id`) ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `tournament_control_template_games` ADD CONSTRAINT `tournament_control_template_games_templateId_tournament_control_templates_id_fk` FOREIGN KEY (`templateId`) REFERENCES `tournament_control_templates`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `tournament_control_template_connections` ADD CONSTRAINT `tournament_control_template_connections_templateId_tournament_control_templates_id_fk` FOREIGN KEY (`templateId`) REFERENCES `tournament_control_templates`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `tournament_control_template_connections` ADD CONSTRAINT `tournament_control_template_connections_sourceTemplateGameId_tournament_control_template_games_id_fk` FOREIGN KEY (`sourceTemplateGameId`) REFERENCES `tournament_control_template_games`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `tournament_control_template_connections` ADD CONSTRAINT `tournament_control_template_connections_targetTemplateGameId_tournament_control_template_games_id_fk` FOREIGN KEY (`targetTemplateGameId`) REFERENCES `tournament_control_template_games`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `tournament_team_claim_links` ADD CONSTRAINT `tournament_team_claim_links_tournamentTeamId_teams_id_fk` FOREIGN KEY (`tournamentTeamId`) REFERENCES `teams`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `tournament_team_claim_links` ADD CONSTRAINT `tournament_team_claim_links_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `tournament_team_claim_links` ADD CONSTRAINT `tournament_team_claim_links_claimedByUserId_users_id_fk` FOREIGN KEY (`claimedByUserId`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX `tournament_viewer_links_tournament_status_idx` ON `tournament_viewer_links` (`tournamentId`,`status`);
--> statement-breakpoint
CREATE INDEX `tournament_control_templates_creator_idx` ON `tournament_control_templates` (`createdByUserId`);
--> statement-breakpoint
CREATE INDEX `tournament_control_templates_visibility_idx` ON `tournament_control_templates` (`visibility`);
--> statement-breakpoint
CREATE INDEX `tournament_control_template_games_template_idx` ON `tournament_control_template_games` (`templateId`);
--> statement-breakpoint
CREATE INDEX `tournament_control_template_connections_template_idx` ON `tournament_control_template_connections` (`templateId`);
--> statement-breakpoint
CREATE INDEX `tournament_team_claim_links_team_status_idx` ON `tournament_team_claim_links` (`tournamentTeamId`,`status`);
