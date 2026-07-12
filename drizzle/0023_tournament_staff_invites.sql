CREATE TABLE `tournament_staff_members` (
  `id` int AUTO_INCREMENT NOT NULL,
  `tournamentId` int NOT NULL,
  `userId` int NOT NULL,
  `role` enum('collaborator') NOT NULL DEFAULT 'collaborator',
  `addedByUserId` int NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `tournament_staff_members_id` PRIMARY KEY(`id`),
  CONSTRAINT `tournament_staff_members_tournament_user_unique` UNIQUE(`tournamentId`,`userId`)
);
CREATE TABLE `tournament_staff_invite_links` (
  `id` int AUTO_INCREMENT NOT NULL,
  `tournamentId` int NOT NULL,
  `createdByUserId` int NOT NULL,
  `tokenHash` varchar(64) NOT NULL,
  `status` enum('active','accepted','revoked') NOT NULL DEFAULT 'active',
  `expiresAt` timestamp NOT NULL,
  `acceptedByUserId` int,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `tournament_staff_invite_links_id` PRIMARY KEY(`id`),
  CONSTRAINT `tournament_staff_invite_links_tokenHash_unique` UNIQUE(`tokenHash`)
);
ALTER TABLE `tournament_staff_members` ADD CONSTRAINT `tournament_staff_members_tournamentId_tournaments_id_fk` FOREIGN KEY (`tournamentId`) REFERENCES `tournaments`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `tournament_staff_members` ADD CONSTRAINT `tournament_staff_members_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `tournament_staff_members` ADD CONSTRAINT `tournament_staff_members_addedByUserId_users_id_fk` FOREIGN KEY (`addedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;
ALTER TABLE `tournament_staff_invite_links` ADD CONSTRAINT `tournament_staff_invite_links_tournamentId_tournaments_id_fk` FOREIGN KEY (`tournamentId`) REFERENCES `tournaments`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `tournament_staff_invite_links` ADD CONSTRAINT `tournament_staff_invite_links_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;
ALTER TABLE `tournament_staff_invite_links` ADD CONSTRAINT `tournament_staff_invite_links_acceptedByUserId_users_id_fk` FOREIGN KEY (`acceptedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;
CREATE INDEX `tournament_staff_members_tournament_idx` ON `tournament_staff_members` (`tournamentId`);
CREATE INDEX `tournament_staff_members_user_idx` ON `tournament_staff_members` (`userId`);
CREATE INDEX `tournament_staff_invite_links_tournament_status_idx` ON `tournament_staff_invite_links` (`tournamentId`,`status`);
CREATE INDEX `tournament_staff_invite_links_status_expires_idx` ON `tournament_staff_invite_links` (`status`,`expiresAt`);
