ALTER TABLE `tournament_game_assignments` ADD `resultPlacement` int;
--> statement-breakpoint
CREATE UNIQUE INDEX `tournament_game_assignments_game_result_unique` ON `tournament_game_assignments` (`gameId`,`resultPlacement`);
