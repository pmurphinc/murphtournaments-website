ALTER TABLE `tournaments` ADD `ownerUserId` int;
ALTER TABLE `tournament_games` ADD `mapId` varchar(64);
ALTER TABLE `tournament_control_template_games` ADD `mapId` varchar(64);
ALTER TABLE `tournaments` ADD CONSTRAINT `tournaments_ownerUserId_users_id_fk` FOREIGN KEY (`ownerUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;
