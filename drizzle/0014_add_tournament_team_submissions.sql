ALTER TABLE `tournaments` ADD `registrationOpen` int NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `teams` ADD `managedTeamId` int;
--> statement-breakpoint
CREATE TABLE `tournament_team_submissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tournamentId` int NOT NULL,
	`managedTeamId` int NOT NULL,
	`submittedByUserId` int NOT NULL,
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`adminNote` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tournament_team_submissions_id` PRIMARY KEY(`id`),
	CONSTRAINT `tournament_team_submissions_tournament_team_unique` UNIQUE(`tournamentId`,`managedTeamId`)
);
--> statement-breakpoint
ALTER TABLE `teams` ADD CONSTRAINT `teams_managedTeamId_managed_teams_id_fk` FOREIGN KEY (`managedTeamId`) REFERENCES `managed_teams`(`id`) ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `tournament_team_submissions` ADD CONSTRAINT `tournament_team_submissions_tournamentId_tournaments_id_fk` FOREIGN KEY (`tournamentId`) REFERENCES `tournaments`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `tournament_team_submissions` ADD CONSTRAINT `tournament_team_submissions_managedTeamId_managed_teams_id_fk` FOREIGN KEY (`managedTeamId`) REFERENCES `managed_teams`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `tournament_team_submissions` ADD CONSTRAINT `tournament_team_submissions_submittedByUserId_users_id_fk` FOREIGN KEY (`submittedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX `tournament_team_submissions_tournament_status_idx` ON `tournament_team_submissions` (`tournamentId`,`status`);
--> statement-breakpoint
CREATE INDEX `tournament_team_submissions_managedTeamId_idx` ON `tournament_team_submissions` (`managedTeamId`);
