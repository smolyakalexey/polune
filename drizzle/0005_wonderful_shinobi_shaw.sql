CREATE TABLE `personalization_profiles` (
	`user_id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`zodiac` text NOT NULL,
	`birth_date` text,
	`birth_time` text,
	`birth_place` text,
	`time_unknown` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
