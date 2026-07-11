ALTER TABLE tournaments
  ADD COLUMN visibility enum('private','public') NOT NULL DEFAULT 'private' AFTER registrationOpen,
  ADD COLUMN publicSlug varchar(120) DEFAULT NULL AFTER visibility,
  ADD COLUMN publishedAt timestamp NULL DEFAULT NULL AFTER publicSlug,
  ADD COLUMN maxTeams int DEFAULT NULL AFTER publishedAt;
--> statement-breakpoint
CREATE UNIQUE INDEX tournaments_publicSlug_unique ON tournaments (publicSlug);
--> statement-breakpoint
CREATE INDEX tournaments_visibility_published_idx ON tournaments (visibility, publishedAt);
--> statement-breakpoint
CREATE INDEX tournaments_owner_visibility_idx ON tournaments (ownerUserId, visibility);
--> statement-breakpoint
CREATE TABLE tournament_private_invite_links (
  id int AUTO_INCREMENT PRIMARY KEY,
  tournamentId int NOT NULL,
  createdByUserId int NOT NULL,
  token varchar(128) NOT NULL,
  status enum('active','revoked') NOT NULL DEFAULT 'active',
  createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT tournament_private_invite_links_tournament_fk FOREIGN KEY (tournamentId) REFERENCES tournaments(id) ON DELETE CASCADE,
  CONSTRAINT tournament_private_invite_links_creator_fk FOREIGN KEY (createdByUserId) REFERENCES users(id),
  UNIQUE KEY tournament_private_invite_links_token_unique (token),
  KEY tournament_private_invite_links_tournament_status_idx (tournamentId, status)
);
--> statement-breakpoint
CREATE TABLE tournament_lobby_code_deliveries (
  id int AUTO_INCREMENT PRIMARY KEY,
  gameId int NOT NULL,
  teamId int NOT NULL,
  releasedByUserId int NOT NULL,
  status enum('available','revoked') NOT NULL DEFAULT 'available',
  lastDiscordAttemptAt timestamp NULL DEFAULT NULL,
  createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT tournament_lobby_code_deliveries_game_fk FOREIGN KEY (gameId) REFERENCES tournament_games(id) ON DELETE CASCADE,
  CONSTRAINT tournament_lobby_code_deliveries_team_fk FOREIGN KEY (teamId) REFERENCES teams(id) ON DELETE CASCADE,
  CONSTRAINT tournament_lobby_code_deliveries_releaser_fk FOREIGN KEY (releasedByUserId) REFERENCES users(id),
  UNIQUE KEY tournament_lobby_code_deliveries_game_team_unique (gameId, teamId),
  KEY tournament_lobby_code_deliveries_team_status_idx (teamId, status)
);
