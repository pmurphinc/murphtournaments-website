ALTER TABLE `tournament_staff_invite_links` ADD `maxUses` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `tournament_staff_invite_links` ADD `useCount` int DEFAULT 0 NOT NULL;
