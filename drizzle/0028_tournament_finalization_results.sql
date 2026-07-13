ALTER TABLE `tournaments` ADD `finalizedAt` timestamp;
--> statement-breakpoint
ALTER TABLE `tournaments` ADD `finalizedByUserId` int;
--> statement-breakpoint
ALTER TABLE `tournaments` ADD `unlockedAt` timestamp;
--> statement-breakpoint
ALTER TABLE `tournaments` ADD `unlockedByUserId` int;
--> statement-breakpoint
CREATE TABLE `tournament_team_results` (
  `id` int AUTO_INCREMENT NOT NULL,
  `tournamentId` int NOT NULL,
  `tournamentTeamId` int NOT NULL,
  `managedTeamId` int,
  `teamNameSnapshot` varchar(255) NOT NULL,
  `scoreSnapshot` int NOT NULL DEFAULT 0,
  `totalWins` int NOT NULL DEFAULT 0,
  `totalLosses` int NOT NULL DEFAULT 0,
  `cashoutWins` int NOT NULL DEFAULT 0,
  `cashoutLosses` int NOT NULL DEFAULT 0,
  `finalRoundWins` int NOT NULL DEFAULT 0,
  `finalRoundLosses` int NOT NULL DEFAULT 0,
  `finalPlacement` int,
  `isChampion` int NOT NULL DEFAULT 0,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `tournament_team_results_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tournament_team_results_tournament_team_unique` ON `tournament_team_results` (`tournamentId`,`tournamentTeamId`);
--> statement-breakpoint
CREATE INDEX `tournament_team_results_managed_team_idx` ON `tournament_team_results` (`managedTeamId`);
--> statement-breakpoint
CREATE INDEX `tournament_team_results_tournament_idx` ON `tournament_team_results` (`tournamentId`);
--> statement-breakpoint
ALTER TABLE `tournaments` ADD CONSTRAINT `tournaments_finalizedByUserId_users_id_fk` FOREIGN KEY (`finalizedByUserId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;
--> statement-breakpoint
ALTER TABLE `tournaments` ADD CONSTRAINT `tournaments_unlockedByUserId_users_id_fk` FOREIGN KEY (`unlockedByUserId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;
--> statement-breakpoint
ALTER TABLE `tournament_team_results` ADD CONSTRAINT `tournament_team_results_tournamentId_tournaments_id_fk` FOREIGN KEY (`tournamentId`) REFERENCES `tournaments`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;
--> statement-breakpoint
ALTER TABLE `tournament_team_results` ADD CONSTRAINT `tournament_team_results_tournamentTeamId_teams_id_fk` FOREIGN KEY (`tournamentTeamId`) REFERENCES `teams`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;
--> statement-breakpoint
ALTER TABLE `tournament_team_results` ADD CONSTRAINT `tournament_team_results_managedTeamId_managed_teams_id_fk` FOREIGN KEY (`managedTeamId`) REFERENCES `managed_teams`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;
