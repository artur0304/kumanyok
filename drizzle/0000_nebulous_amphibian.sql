CREATE TABLE `bookings` (
	`id` text PRIMARY KEY NOT NULL,
	`resource` text NOT NULL,
	`date` text NOT NULL,
	`start` integer NOT NULL,
	`end` integer NOT NULL,
	`guests` integer NOT NULL,
	`name` text NOT NULL,
	`phone` text NOT NULL,
	`total` integer NOT NULL,
	`deposit` integer NOT NULL,
	`status` text NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `bookings_resource_date` ON `bookings` (`resource`,`date`);--> statement-breakpoint
CREATE TABLE `settings` (
	`id` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
