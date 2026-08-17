CREATE TABLE `analytics_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`session_id` text NOT NULL,
	`event_name` text NOT NULL,
	`intent_id` text,
	`archetype` text,
	`selected_date` text,
	`score` integer,
	`method_version` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_analytics_events_created_at` ON `analytics_events` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_analytics_events_event_name_created_at` ON `analytics_events` (`event_name`,`created_at`);