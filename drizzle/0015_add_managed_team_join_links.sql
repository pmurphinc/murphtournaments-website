CREATE TABLE `managed_team_join_links` (
	`id` int AUTO_INCREMENT NOT NULL,
	`teamId` int NOT NULL,
	`createdByUserId` int NOT NULL,
	`tokenHash` varchar(64) NOT NULL,
	`status` enum('active','revoked') NOT NULL DEFAULT 'active',
	`expiresAt` timestamp,
	`maxUses` int,
	`useCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `managed_team_join_links_id` PRIMARY KEY(`id`),
	CONSTRAINT `managed_team_join_links_tokenHash_unique` UNIQUE(`tokenHash`)
);
--> statement-breakpoint
ALTER TABLE `managed_team_join_links` ADD CONSTRAINT `managed_team_join_links_teamId_managed_teams_id_fk` FOREIGN KEY (`teamId`) REFERENCES `managed_teams`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `managed_team_join_links` ADD CONSTRAINT `managed_team_join_links_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX `managed_team_join_links_team_status_idx` ON `managed_team_join_links` (`teamId`,`status`);
