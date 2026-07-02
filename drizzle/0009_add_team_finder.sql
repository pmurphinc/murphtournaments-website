ALTER TABLE `users` ADD `discordDisplayName` varchar(255);
--> statement-breakpoint
ALTER TABLE `users` ADD `discordUsername` varchar(255);
--> statement-breakpoint

CREATE TABLE `team_finder_listings` (
  `id` int AUTO_INCREMENT NOT NULL,
  `userId` int NOT NULL,
  `title` varchar(120) NOT NULL,
  `description` text NOT NULL,
  `platform` varchar(64),
  `region` varchar(64),
  `availability` varchar(255),
  `contact` varchar(255),
  `hiddenByAdmin` int NOT NULL DEFAULT 0,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `team_finder_listings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint

CREATE TABLE `team_finder_reports` (
  `id` int AUTO_INCREMENT NOT NULL,
  `listingId` int NOT NULL,
  `reporterUserId` int NOT NULL,
  `reason` text NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `team_finder_reports_id` PRIMARY KEY(`id`),
  CONSTRAINT `team_finder_reports_listing_reporter_unique` UNIQUE(`listingId`,`reporterUserId`)
);
--> statement-breakpoint

ALTER TABLE `team_finder_listings` ADD CONSTRAINT `team_finder_listings_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `team_finder_reports` ADD CONSTRAINT `team_finder_reports_listingId_team_finder_listings_id_fk` FOREIGN KEY (`listingId`) REFERENCES `team_finder_listings`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `team_finder_reports` ADD CONSTRAINT `team_finder_reports_reporterUserId_users_id_fk` FOREIGN KEY (`reporterUserId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX `team_finder_listings_userId_idx` ON `team_finder_listings` (`userId`);
--> statement-breakpoint
CREATE INDEX `team_finder_listings_hiddenByAdmin_idx` ON `team_finder_listings` (`hiddenByAdmin`);
--> statement-breakpoint
CREATE INDEX `team_finder_listings_createdAt_idx` ON `team_finder_listings` (`createdAt`);
--> statement-breakpoint
CREATE INDEX `team_finder_reports_listingId_idx` ON `team_finder_reports` (`listingId`);
