CREATE TABLE `managed_teams` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(64) NOT NULL,
	`slug` varchar(80) NOT NULL,
	`captainUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `managed_teams_id` PRIMARY KEY(`id`),
	CONSTRAINT `managed_teams_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `managed_team_members` (
	`id` int AUTO_INCREMENT NOT NULL,
	`teamId` int NOT NULL,
	`userId` int NOT NULL,
	`role` enum('captain','member') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `managed_team_members_id` PRIMARY KEY(`id`),
	CONSTRAINT `managed_team_members_team_user_unique` UNIQUE(`teamId`,`userId`)
);
--> statement-breakpoint
CREATE TABLE `managed_team_invites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`teamId` int NOT NULL,
	`invitedUserId` int NOT NULL,
	`createdByUserId` int NOT NULL,
	`status` enum('pending','accepted','declined','revoked') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `managed_team_invites_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `managed_teams` ADD CONSTRAINT `managed_teams_captainUserId_users_id_fk` FOREIGN KEY (`captainUserId`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `managed_team_members` ADD CONSTRAINT `managed_team_members_teamId_managed_teams_id_fk` FOREIGN KEY (`teamId`) REFERENCES `managed_teams`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `managed_team_members` ADD CONSTRAINT `managed_team_members_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `managed_team_invites` ADD CONSTRAINT `managed_team_invites_teamId_managed_teams_id_fk` FOREIGN KEY (`teamId`) REFERENCES `managed_teams`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `managed_team_invites` ADD CONSTRAINT `managed_team_invites_invitedUserId_users_id_fk` FOREIGN KEY (`invitedUserId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `managed_team_invites` ADD CONSTRAINT `managed_team_invites_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX `managed_team_members_teamId_idx` ON `managed_team_members` (`teamId`);
--> statement-breakpoint
CREATE INDEX `managed_team_members_userId_idx` ON `managed_team_members` (`userId`);
--> statement-breakpoint
CREATE INDEX `managed_team_invites_invited_status_idx` ON `managed_team_invites` (`invitedUserId`,`status`);
--> statement-breakpoint
CREATE INDEX `managed_team_invites_team_status_idx` ON `managed_team_invites` (`teamId`,`status`);
--> statement-breakpoint
CREATE INDEX `users_discordUsername_idx` ON `users` (`discordUsername`);
