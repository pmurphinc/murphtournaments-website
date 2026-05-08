CREATE TABLE `vod_analyses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`sourceType` enum('twitch','youtube','google_drive','generic') NOT NULL,
	`sourceUrl` varchar(1024) NOT NULL,
	`normalizedSourceUrl` varchar(1024) NOT NULL,
	`sourceId` varchar(255),
	`sourceRef` varchar(255),
	`thumbnailUrl` varchar(1024),
	`durationSeconds` int,
	`videoPov` enum('player','spectator') NOT NULL,
	`status` enum('created') NOT NULL DEFAULT 'created',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `vod_analyses_id` PRIMARY KEY(`id`)
);
