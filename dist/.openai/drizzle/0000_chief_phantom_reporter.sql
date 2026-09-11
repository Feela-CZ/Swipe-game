CREATE TABLE `game_saves` (
	`owner` text NOT NULL,
	`slot` text NOT NULL,
	`payload` text NOT NULL,
	`revision` integer NOT NULL,
	`updated_at` text NOT NULL,
	PRIMARY KEY(`owner`, `slot`)
);
