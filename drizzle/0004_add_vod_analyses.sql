CREATE TABLE `vod_analyses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255),
	`sourceType` enum('twitch','youtube','google_drive','generic') NOT NULL,
	`sourceId` varchar(255),
	`sourceRef` varchar(255),
	`sourceUrl` varchar(2048) NOT NULL,
	`normalizedUrl` varchar(2048) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `vod_analyses_id` PRIMARY KEY(`id`)
);
