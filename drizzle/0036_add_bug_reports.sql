CREATE TABLE `bug_reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`summary` varchar(200) NOT NULL,
	`details` text NOT NULL,
	`pageUrl` varchar(512),
	`userAgent` varchar(512),
	`contact` varchar(120),
	`reporterUserId` int,
	`reporterName` varchar(120),
	`githubIssueNumber` int,
	`githubIssueUrl` varchar(512),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `bug_reports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `bug_reports_created_idx` ON `bug_reports` (`createdAt`);
