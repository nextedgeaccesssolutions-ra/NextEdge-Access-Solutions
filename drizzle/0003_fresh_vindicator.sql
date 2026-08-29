CREATE TABLE `recentProjects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(180) NOT NULL,
	`location` varchar(160) NOT NULL,
	`service` varchar(120) NOT NULL,
	`summary` text NOT NULL,
	`imageUrl` text,
	`displayOrder` int NOT NULL DEFAULT 0,
	`isPublished` boolean NOT NULL DEFAULT false,
	`updatedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `recentProjects_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `recent_projects_published_idx` ON `recentProjects` (`isPublished`);