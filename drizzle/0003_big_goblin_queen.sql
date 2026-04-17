CREATE TABLE `patch_notes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`date` varchar(64) NOT NULL,
	`content` text NOT NULL,
	`url` varchar(512),
	`sourceUrl` varchar(512),
	`version` varchar(64),
	`isGameUpdate` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `patch_notes_id` PRIMARY KEY(`id`)
);
