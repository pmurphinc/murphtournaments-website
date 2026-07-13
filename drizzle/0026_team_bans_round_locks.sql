ALTER TABLE `managed_teams` ADD `mapBanId` varchar(64);
ALTER TABLE `tournament_games` ADD `roundLocked` int NOT NULL DEFAULT 0;
ALTER TABLE `tournament_control_template_games` ADD `roundLocked` int NOT NULL DEFAULT 0;
