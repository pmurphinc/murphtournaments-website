CREATE TABLE `vod_capture_jobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`vodAnalysisId` int NOT NULL,
	`status` enum('queued','processing','complete','failed','cancelled') NOT NULL DEFAULT 'queued',
	`source` enum('manual_debug','automation') NOT NULL DEFAULT 'manual_debug',
	`sampleIntervalSeconds` int NOT NULL,
	`plannedSamples` int NOT NULL,
	`processedSamples` int NOT NULL DEFAULT 0,
	`failedSamples` int NOT NULL DEFAULT 0,
	`errorMessage` text,
	`startedAt` datetime,
	`completedAt` datetime,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `vod_capture_jobs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `vod_capture_jobs` ADD CONSTRAINT `vod_capture_jobs_vodAnalysisId_vod_analyses_id_fk` FOREIGN KEY (`vodAnalysisId`) REFERENCES `vod_analyses`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `vod_capture_jobs_vodAnalysisId_idx` ON `vod_capture_jobs` (`vodAnalysisId`);--> statement-breakpoint
CREATE INDEX `vod_capture_jobs_status_idx` ON `vod_capture_jobs` (`status`);--> statement-breakpoint
CREATE INDEX `vod_capture_jobs_createdAt_idx` ON `vod_capture_jobs` (`createdAt`);