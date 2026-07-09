ALTER TABLE `tournament_game_connections` ADD `flowType` enum('winner','loser') NOT NULL DEFAULT 'winner';
--> statement-breakpoint
ALTER TABLE `tournament_game_connections` DROP INDEX `tournament_game_connections_source_target_unique`;
--> statement-breakpoint
CREATE UNIQUE INDEX `tournament_game_connections_source_target_flow_unique` ON `tournament_game_connections` (`sourceGameId`,`targetGameId`,`flowType`);
--> statement-breakpoint
ALTER TABLE `tournament_control_template_connections` ADD `flowType` enum('winner','loser') NOT NULL DEFAULT 'winner';
--> statement-breakpoint
ALTER TABLE `tournament_control_template_connections` DROP INDEX `tournament_control_template_connections_unique`;
--> statement-breakpoint
CREATE UNIQUE INDEX `tournament_control_template_connections_unique` ON `tournament_control_template_connections` (`sourceTemplateGameId`,`targetTemplateGameId`,`flowType`);
