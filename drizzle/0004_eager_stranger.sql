CREATE TABLE `feedback_responses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`session_id` text NOT NULL,
	`intent_id` text,
	`selected_date` text,
	`score` integer,
	`clarity` integer NOT NULL,
	`trust` integer NOT NULL,
	`would_return` text NOT NULL,
	`missing_intent` text,
	`comment` text,
	`method_version` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_feedback_responses_created_at` ON `feedback_responses` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_feedback_responses_intent_created_at` ON `feedback_responses` (`intent_id`,`created_at`);