CREATE TABLE `team_finder_listings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerUserId` int NOT NULL,
	`listingType` enum('player','team') NOT NULL,
	`status` enum('active','filled','closed','expired') NOT NULL DEFAULT 'active',
	`region` enum('NA','EU','SA','ASIA','OCE','MENA','GLOBAL') NOT NULL,
	`targetTournament` varchar(120),
	`description` varchar(600) NOT NULL,
	`embarkId` varchar(64),
	`mainClasses` varchar(32),
	`preferredRole` varchar(120),
	`experience` varchar(240),
	`availability` varchar(240),
	`twitchUrl` varchar(256),
	`youtubeUrl` varchar(256),
	`teamName` varchar(120),
	`rosterCount` int,
	`neededClass` varchar(120),
	`practiceAvailability` varchar(240),
	`hiddenByAdmin` int NOT NULL DEFAULT 0,
	`expiresAt` datetime NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `team_finder_listings_id` PRIMARY KEY(`id`),
	CONSTRAINT `team_finder_listings_rosterCount_range` CHECK(`team_finder_listings`.`rosterCount` IS NULL OR (`team_finder_listings`.`rosterCount` >= 0 AND `team_finder_listings`.`rosterCount` <= 10))
);
--> statement-breakpoint
CREATE TABLE `team_finder_reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`listingId` int NOT NULL,
	`reporterUserId` int,
	`reason` enum('spam','inappropriate','scam','impersonation','other') NOT NULL,
	`details` varchar(600),
	`status` enum('open','reviewed','dismissed') NOT NULL DEFAULT 'open',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `team_finder_reports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `vod_analysis_events` MODIFY COLUMN `eventType` enum('death','tap','plug','cashout','team_wipe','team_spawn','steal_flip','revive','defib') NOT NULL;--> statement-breakpoint
ALTER TABLE `vod_suggested_events` MODIFY COLUMN `eventType` enum('death','tap','plug','cashout','team_wipe','team_spawn','steal_flip','revive','defib') NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `discordId` varchar(32);--> statement-breakpoint
ALTER TABLE `users` ADD `discordUsername` varchar(64);--> statement-breakpoint
ALTER TABLE `users` ADD `discordAvatarUrl` varchar(512);--> statement-breakpoint
ALTER TABLE `team_finder_listings` ADD CONSTRAINT `team_finder_listings_ownerUserId_users_id_fk` FOREIGN KEY (`ownerUserId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `team_finder_reports` ADD CONSTRAINT `team_finder_reports_listingId_team_finder_listings_id_fk` FOREIGN KEY (`listingId`) REFERENCES `team_finder_listings`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `team_finder_reports` ADD CONSTRAINT `team_finder_reports_reporterUserId_users_id_fk` FOREIGN KEY (`reporterUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `team_finder_listings_ownerUserId_idx` ON `team_finder_listings` (`ownerUserId`);--> statement-breakpoint
CREATE INDEX `team_finder_listings_listingType_idx` ON `team_finder_listings` (`listingType`);--> statement-breakpoint
CREATE INDEX `team_finder_listings_status_idx` ON `team_finder_listings` (`status`);--> statement-breakpoint
CREATE INDEX `team_finder_listings_region_idx` ON `team_finder_listings` (`region`);--> statement-breakpoint
CREATE INDEX `team_finder_listings_expiresAt_idx` ON `team_finder_listings` (`expiresAt`);--> statement-breakpoint
CREATE INDEX `team_finder_listings_createdAt_idx` ON `team_finder_listings` (`createdAt`);--> statement-breakpoint
CREATE INDEX `team_finder_reports_listingId_idx` ON `team_finder_reports` (`listingId`);--> statement-breakpoint
CREATE INDEX `team_finder_reports_status_idx` ON `team_finder_reports` (`status`);--> statement-breakpoint
CREATE INDEX `team_finder_reports_createdAt_idx` ON `team_finder_reports` (`createdAt`);