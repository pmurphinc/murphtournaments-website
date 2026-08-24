CREATE TABLE `arcade_scores` (
	`id` int AUTO_INCREMENT NOT NULL,
	`runId` varchar(64) NOT NULL,
	`initials` varchar(3) NOT NULL,
	`score` int NOT NULL,
	`ship` varchar(64) NOT NULL,
	`difficulty` enum('easy','difficult','hard') NOT NULL,
	`durationSeconds` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `arcade_scores_id` PRIMARY KEY(`id`),
	CONSTRAINT `arcade_scores_runId_unique` UNIQUE(`runId`)
);
--> statement-breakpoint
CREATE INDEX `arcade_scores_score_created_idx` ON `arcade_scores` (`score`,`createdAt`);
