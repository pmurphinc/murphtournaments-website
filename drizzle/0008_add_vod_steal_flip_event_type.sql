ALTER TABLE `vod_analysis_events` MODIFY COLUMN `eventType` enum('death','tap','plug','cashout','team_wipe','team_spawn','steal_flip','revive','defib') NOT NULL;
ALTER TABLE `vod_suggested_events` MODIFY COLUMN `eventType` enum('death','tap','plug','cashout','team_wipe','team_spawn','steal_flip','revive','defib') NOT NULL;
