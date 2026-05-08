CREATE TABLE `vod_analysis_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`vodAnalysisId` int NOT NULL,
	`eventType` enum('death','tap','plug','cashout','team_wipe','team_spawn','revive','defib') NOT NULL,
	`timestampSeconds` int NOT NULL,
	`actorLabel` varchar(255),
	`targetLabel` varchar(255),
	`teamLabel` varchar(255),
	`metadata` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `vod_analysis_events_id` PRIMARY KEY(`id`),
	CONSTRAINT `vod_analysis_events_timestampSeconds_non_negative` CHECK(`vod_analysis_events`.`timestampSeconds` >= 0)
);
--> statement-breakpoint
ALTER TABLE `vod_analysis_events` ADD CONSTRAINT `vod_analysis_events_vodAnalysisId_vod_analyses_id_fk` FOREIGN KEY (`vodAnalysisId`) REFERENCES `vod_analyses`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `vod_analysis_events_vodAnalysisId_idx` ON `vod_analysis_events` (`vodAnalysisId`);--> statement-breakpoint
CREATE INDEX `vod_analysis_events_eventType_idx` ON `vod_analysis_events` (`eventType`);--> statement-breakpoint
CREATE INDEX `vod_analysis_events_timestampSeconds_idx` ON `vod_analysis_events` (`timestampSeconds`);