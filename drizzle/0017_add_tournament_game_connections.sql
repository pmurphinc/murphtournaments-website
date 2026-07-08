CREATE TABLE `tournament_game_connections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tournamentId` int NOT NULL,
	`sourceGameId` int NOT NULL,
	`targetGameId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tournament_game_connections_id` PRIMARY KEY(`id`),
	CONSTRAINT `tournament_game_connections_source_target_unique` UNIQUE(`sourceGameId`,`targetGameId`)
);
--> statement-breakpoint
ALTER TABLE `tournament_game_connections` ADD CONSTRAINT `tournament_game_connections_tournamentId_tournaments_id_fk` FOREIGN KEY (`tournamentId`) REFERENCES `tournaments`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `tournament_game_connections` ADD CONSTRAINT `tournament_game_connections_sourceGameId_tournament_games_id_fk` FOREIGN KEY (`sourceGameId`) REFERENCES `tournament_games`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `tournament_game_connections` ADD CONSTRAINT `tournament_game_connections_targetGameId_tournament_games_id_fk` FOREIGN KEY (`targetGameId`) REFERENCES `tournament_games`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX `tournament_game_connections_tournament_idx` ON `tournament_game_connections` (`tournamentId`);
--> statement-breakpoint
CREATE INDEX `tournament_game_connections_source_idx` ON `tournament_game_connections` (`sourceGameId`);
--> statement-breakpoint
CREATE INDEX `tournament_game_connections_target_idx` ON `tournament_game_connections` (`targetGameId`);
