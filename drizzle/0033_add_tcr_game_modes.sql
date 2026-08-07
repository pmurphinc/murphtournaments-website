-- Temporarily admit the abandoned prototype value so installations that used it
-- can normalize safely before the final constrained enum is applied.
ALTER TABLE `tournament_games` MODIFY COLUMN `gameType` enum('cashout','final_round','quick_cash','power_shift','team_deathmatch','point_break','breakpoint') NOT NULL;
UPDATE `tournament_games` SET `gameType` = 'point_break' WHERE `gameType` = 'breakpoint';
ALTER TABLE `tournament_games` MODIFY COLUMN `gameType` enum('cashout','final_round','quick_cash','power_shift','team_deathmatch','point_break') NOT NULL;

ALTER TABLE `tournament_control_template_games` MODIFY COLUMN `gameType` enum('cashout','final_round','quick_cash','power_shift','team_deathmatch','point_break','breakpoint') NOT NULL;
UPDATE `tournament_control_template_games` SET `gameType` = 'point_break' WHERE `gameType` = 'breakpoint';
ALTER TABLE `tournament_control_template_games` MODIFY COLUMN `gameType` enum('cashout','final_round','quick_cash','power_shift','team_deathmatch','point_break') NOT NULL;
