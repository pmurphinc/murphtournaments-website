ALTER TABLE `users`
  ADD `developmentDivisionMember` int NOT NULL DEFAULT 0;

CREATE TABLE `development_division_invite_links` (
  `id` int AUTO_INCREMENT NOT NULL,
  `createdByUserId` int NOT NULL,
  `tokenHash` varchar(64) NOT NULL,
  `status` enum('active','revoked') NOT NULL DEFAULT 'active',
  `expiresAt` timestamp NULL,
  `maxUses` int NULL,
  `useCount` int NOT NULL DEFAULT 0,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `development_division_invite_links_id` PRIMARY KEY(`id`),
  CONSTRAINT `development_division_invite_links_creator_fk`
    FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`)
    ON DELETE RESTRICT ON UPDATE NO ACTION
);

CREATE UNIQUE INDEX `development_division_invite_links_tokenHash_unique`
  ON `development_division_invite_links` (`tokenHash`);

CREATE INDEX `development_division_invite_links_status_idx`
  ON `development_division_invite_links` (`status`);
