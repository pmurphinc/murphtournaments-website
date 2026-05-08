CREATE TABLE `vod_suggested_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`vodAnalysisId` int NOT NULL,
	`eventType` enum('death','tap','plug','cashout','team_wipe','team_spawn','revive','defib') NOT NULL,
	`timestampSeconds` int NOT NULL,
	`actorLabel` varchar(255),
	`targetLabel` varchar(255),
	`teamLabel` varchar(255),
	`metadata` text,
	`source` enum('manual_test','debug','automation') NOT NULL,
	`confidence` int,
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`confirmedVodEventId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `vod_suggested_events_id` PRIMARY KEY(`id`),
	CONSTRAINT `vod_suggested_events_timestampSeconds_non_negative` CHECK(`vod_suggested_events`.`timestampSeconds` >= 0),
	CONSTRAINT `vod_suggested_events_confidence_range` CHECK(`vod_suggested_events`.`confidence` IS NULL OR (`vod_suggested_events`.`confidence` >= 0 AND `vod_suggested_events`.`confidence` <= 100))
);
--> statement-breakpoint
ALTER TABLE `vod_suggested_events` ADD CONSTRAINT `vod_suggested_events_vodAnalysisId_vod_analyses_id_fk` FOREIGN KEY (`vodAnalysisId`) REFERENCES `vod_analyses`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vod_suggested_events` ADD CONSTRAINT `vod_suggested_events_confirmedVodEventId_vod_analysis_events_id_fk` FOREIGN KEY (`confirmedVodEventId`) REFERENCES `vod_analysis_events`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `vod_suggested_events_vodAnalysisId_idx` ON `vod_suggested_events` (`vodAnalysisId`);--> statement-breakpoint
CREATE INDEX `vod_suggested_events_status_idx` ON `vod_suggested_events` (`status`);--> statement-breakpoint
CREATE INDEX `vod_suggested_events_eventType_idx` ON `vod_suggested_events` (`eventType`);--> statement-breakpoint
CREATE INDEX `vod_suggested_events_timestampSeconds_idx` ON `vod_suggested_events` (`timestampSeconds`);