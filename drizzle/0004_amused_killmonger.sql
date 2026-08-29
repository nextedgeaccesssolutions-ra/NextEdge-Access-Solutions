CREATE TABLE `globalSectionRevisions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`globalSectionId` int NOT NULL,
	`authorId` int NOT NULL,
	`summary` varchar(500) NOT NULL,
	`previousContent` text,
	`updatedContent` text NOT NULL,
	`previousStatus` enum('draft','published'),
	`updatedStatus` enum('draft','published') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `globalSectionRevisions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `global_section_revisions_section_idx` ON `globalSectionRevisions` (`globalSectionId`);