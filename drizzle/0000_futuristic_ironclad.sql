CREATE TABLE `labour_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`labour_id` text NOT NULL,
	`entry_time` integer NOT NULL,
	`exit_time` integer,
	`status` text NOT NULL,
	`date` text NOT NULL,
	FOREIGN KEY (`labour_id`) REFERENCES `labours`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `log_labour_id_idx` ON `labour_logs` (`labour_id`);--> statement-breakpoint
CREATE INDEX `log_status_idx` ON `labour_logs` (`status`);--> statement-breakpoint
CREATE INDEX `log_date_idx` ON `labour_logs` (`date`);--> statement-breakpoint
CREATE INDEX `log_entry_time_idx` ON `labour_logs` (`entry_time`);--> statement-breakpoint
CREATE TABLE `labours` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`code_no` text NOT NULL,
	`join_date` integer,
	`designation` text,
	`is_trained` integer DEFAULT true NOT NULL,
	`type` text NOT NULL,
	`contractor_name` text,
	`created_at` integer DEFAULT (unixepoch())
);
--> statement-breakpoint
CREATE UNIQUE INDEX `labours_code_no_unique` ON `labours` (`code_no`);--> statement-breakpoint
CREATE INDEX `labour_name_idx` ON `labours` (`name`);--> statement-breakpoint
CREATE INDEX `labour_code_idx` ON `labours` (`code_no`);--> statement-breakpoint
CREATE INDEX `labour_designation_idx` ON `labours` (`designation`);--> statement-breakpoint
CREATE INDEX `labour_contractor_idx` ON `labours` (`contractor_name`);--> statement-breakpoint
CREATE INDEX `labour_created_at_idx` ON `labours` (`created_at`);--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`password_hash` text NOT NULL,
	`role` text DEFAULT 'guard' NOT NULL,
	`created_at` integer DEFAULT (unixepoch())
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_username_unique` ON `user` (`username`);--> statement-breakpoint
CREATE TABLE `vehicles` (
	`id` text PRIMARY KEY NOT NULL,
	`vehicle_number` text NOT NULL,
	`type` text NOT NULL,
	`vendor_name` text,
	`cargo_description` text,
	`driver_name` text,
	`helper_name` text,
	`mobile` text,
	`note` text,
	`entry_time` integer NOT NULL,
	`exit_time` integer,
	`status` text NOT NULL,
	`date` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `vehicle_num_idx` ON `vehicles` (`vehicle_number`);--> statement-breakpoint
CREATE INDEX `vehicle_status_idx` ON `vehicles` (`status`);--> statement-breakpoint
CREATE INDEX `vehicle_date_idx` ON `vehicles` (`date`);--> statement-breakpoint
CREATE INDEX `vehicle_driver_idx` ON `vehicles` (`driver_name`);--> statement-breakpoint
CREATE INDEX `vehicle_vendor_idx` ON `vehicles` (`vendor_name`);--> statement-breakpoint
CREATE INDEX `vehicle_entry_time_idx` ON `vehicles` (`entry_time`);--> statement-breakpoint
CREATE TABLE `visitor_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`visitor_id` text NOT NULL,
	`purpose` text,
	`visiting_card_no` text,
	`entry_time` integer NOT NULL,
	`exit_time` integer,
	`status` text NOT NULL,
	`date` text NOT NULL,
	FOREIGN KEY (`visitor_id`) REFERENCES `visitor_profiles`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `vlog_visitor_id_idx` ON `visitor_logs` (`visitor_id`);--> statement-breakpoint
CREATE INDEX `vlog_status_idx` ON `visitor_logs` (`status`);--> statement-breakpoint
CREATE INDEX `vlog_date_idx` ON `visitor_logs` (`date`);--> statement-breakpoint
CREATE INDEX `vlog_card_no_idx` ON `visitor_logs` (`visiting_card_no`);--> statement-breakpoint
CREATE INDEX `vlog_entry_time_idx` ON `visitor_logs` (`entry_time`);--> statement-breakpoint
CREATE TABLE `visitor_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`company` text,
	`contact_no` text,
	`visitor_type` text DEFAULT 'guest',
	`created_at` integer DEFAULT (unixepoch())
);
--> statement-breakpoint
CREATE UNIQUE INDEX `visitor_profiles_contact_no_unique` ON `visitor_profiles` (`contact_no`);--> statement-breakpoint
CREATE INDEX `visitor_contact_idx` ON `visitor_profiles` (`contact_no`);--> statement-breakpoint
CREATE INDEX `visitor_name_idx` ON `visitor_profiles` (`name`);--> statement-breakpoint
CREATE INDEX `visitor_company_idx` ON `visitor_profiles` (`company`);--> statement-breakpoint
CREATE INDEX `visitor_created_at_idx` ON `visitor_profiles` (`created_at`);