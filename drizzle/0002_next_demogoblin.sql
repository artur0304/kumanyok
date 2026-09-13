ALTER TABLE `bookings` ADD `source` text DEFAULT 'site' NOT NULL;--> statement-breakpoint
ALTER TABLE `bookings` ADD `note` text DEFAULT '' NOT NULL;--> statement-breakpoint
CREATE INDEX `bookings_date_status` ON `bookings` (`date`,`status`);