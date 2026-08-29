CREATE TABLE `formSubmissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`formName` varchar(120) NOT NULL,
	`payload` text NOT NULL,
	`status` enum('new','reviewed','archived') NOT NULL DEFAULT 'new',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `formSubmissions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `globalSections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(120) NOT NULL,
	`content` text NOT NULL,
	`status` enum('draft','published') NOT NULL DEFAULT 'draft',
	`updatedBy` int,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `globalSections_id` PRIMARY KEY(`id`),
	CONSTRAINT `globalSections_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `mediaAssets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`filename` varchar(255) NOT NULL,
	`mimeType` varchar(100) NOT NULL,
	`url` text NOT NULL,
	`storageKey` text NOT NULL,
	`altText` varchar(255),
	`uploadedBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `mediaAssets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `navigationItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`label` varchar(120) NOT NULL,
	`href` varchar(255) NOT NULL,
	`displayOrder` int NOT NULL DEFAULT 0,
	`isVisible` boolean NOT NULL DEFAULT true,
	CONSTRAINT `navigationItems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`slug` varchar(255) NOT NULL,
	`status` enum('draft','pending_review','approved','scheduled','published','archived') NOT NULL DEFAULT 'draft',
	`layout` text NOT NULL,
	`seo` text NOT NULL,
	`featuredImageUrl` text,
	`scheduledAt` timestamp,
	`publishedAt` timestamp,
	`version` int NOT NULL DEFAULT 1,
	`updatedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pages_id` PRIMARY KEY(`id`),
	CONSTRAINT `pages_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `revisions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`pageId` int NOT NULL,
	`authorId` int NOT NULL,
	`summary` varchar(500) NOT NULL,
	`previousContent` text,
	`updatedContent` text NOT NULL,
	`status` enum('draft','pending_review','approved','scheduled','published','rejected','archived') NOT NULL DEFAULT 'draft',
	`reviewComment` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `revisions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','editor','reviewer','publisher','admin') NOT NULL DEFAULT 'user';--> statement-breakpoint
CREATE INDEX `pages_status_idx` ON `pages` (`status`);