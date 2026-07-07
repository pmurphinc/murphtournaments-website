CREATE TABLE `tournament_games` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tournamentId` int NOT NULL,
	`gameType` enum('cashout','final_round') NOT NULL,
	`displayLabel` varchar(80) NOT NULL,
	`status` enum('draft','ready','live','complete') NOT NULL DEFAULT 'draft',
	`canvasX` int NOT NULL DEFAULT 120,
	`canvasY` int NOT NULL DEFAULT 120,
	`privateLobbyCode` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tournament_games_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tournament_game_assignments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`gameId` int NOT NULL,
	`teamId` int NOT NULL,
	`slotIndex` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tournament_game_assignments_id` PRIMARY KEY(`id`),
	CONSTRAINT `tournament_game_assignments_game_slot_unique` UNIQUE(`gameId`,`slotIndex`),
	CONSTRAINT `tournament_game_assignments_game_team_unique` UNIQUE(`gameId`,`teamId`)
);
--> statement-breakpoint
ALTER TABLE `tournament_games` ADD CONSTRAINT `tournament_games_tournamentId_tournaments_id_fk` FOREIGN KEY (`tournamentId`) REFERENCES `tournaments`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `tournament_game_assignments` ADD CONSTRAINT `tournament_game_assignments_gameId_tournament_games_id_fk` FOREIGN KEY (`gameId`) REFERENCES `tournament_games`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `tournament_game_assignments` ADD CONSTRAINT `tournament_game_assignments_teamId_teams_id_fk` FOREIGN KEY (`teamId`) REFERENCES `teams`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX `tournament_games_tournament_idx` ON `tournament_games` (`tournamentId`);
--> statement-breakpoint
CREATE INDEX `tournament_games_status_idx` ON `tournament_games` (`status`);
--> statement-breakpoint
CREATE INDEX `tournament_game_assignments_team_idx` ON `tournament_game_assignments` (`teamId`);
