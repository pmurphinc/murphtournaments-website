CREATE TABLE `arcade_scores` (
  `id` int AUTO_INCREMENT NOT NULL,
  `userId` int NOT NULL,
  `game` varchar(64) NOT NULL DEFAULT 'wormhole',
  `score` int NOT NULL,
  `ship` varchar(64),
  `outcome` enum('victory','defeat') NOT NULL,
  `rivalHealth` int NOT NULL DEFAULT 0,
  `durationSeconds` int NOT NULL DEFAULT 0,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `arcade_scores_id` PRIMARY KEY(`id`),
  CONSTRAINT `arcade_scores_score_non_negative` CHECK (`score` >= 0),
  CONSTRAINT `arcade_scores_rivalHealth_range` CHECK (`rivalHealth` >= 0 AND `rivalHealth` <= 100),
  CONSTRAINT `arcade_scores_durationSeconds_non_negative` CHECK (`durationSeconds` >= 0),
  CONSTRAINT `arcade_scores_userId_users_id_fk`
    FOREIGN KEY (`userId`) REFERENCES `users`(`id`)
    ON DELETE cascade ON UPDATE no action
);
--> statement-breakpoint
CREATE INDEX `arcade_scores_game_score_idx` ON `arcade_scores` (`game`,`score`);
--> statement-breakpoint
CREATE INDEX `arcade_scores_user_game_idx` ON `arcade_scores` (`userId`,`game`);
--> statement-breakpoint
CREATE INDEX `arcade_scores_createdAt_idx` ON `arcade_scores` (`createdAt`);
