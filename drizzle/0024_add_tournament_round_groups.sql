ALTER TABLE `tournament_games`
  ADD COLUMN `roundGroupId` varchar(64),
  ADD COLUMN `roundLabel` varchar(80);

CREATE INDEX `tournament_games_round_group_idx`
  ON `tournament_games` (`tournamentId`, `roundGroupId`);

ALTER TABLE `tournament_control_template_games`
  ADD COLUMN `roundGroupId` varchar(64),
  ADD COLUMN `roundLabel` varchar(80);
