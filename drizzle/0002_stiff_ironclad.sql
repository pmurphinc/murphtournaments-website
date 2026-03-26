CREATE TABLE `tournament_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tournamentId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`winner` varchar(255) NOT NULL,
	`runner_up` varchar(255),
	`finalFrp` int NOT NULL DEFAULT 0,
	`completedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `tournament_history_id` PRIMARY KEY(`id`)
);
