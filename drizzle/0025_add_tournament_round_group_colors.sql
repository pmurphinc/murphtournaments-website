ALTER TABLE `tournament_games`
  ADD COLUMN `roundColor` varchar(24);

ALTER TABLE `tournament_control_template_games`
  ADD COLUMN `roundColor` varchar(24);
