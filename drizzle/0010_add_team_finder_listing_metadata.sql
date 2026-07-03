ALTER TABLE `team_finder_listings` ADD `listingType` enum('lft','lfp') NOT NULL DEFAULT 'lft';
--> statement-breakpoint
ALTER TABLE `team_finder_listings` ADD `preferredRole` varchar(64);
