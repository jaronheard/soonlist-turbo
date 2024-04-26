-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TABLE `Comment` (
	`id` varchar(191) NOT NULL,
	`content` mediumtext NOT NULL,
	`eventId` varchar(191) NOT NULL,
	`userId` varchar(191) NOT NULL,
	`createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updatedAt` datetime(3) NOT NULL,
	CONSTRAINT `Comment_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `Event` (
	`createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updatedAt` datetime(3) NOT NULL,
	`event` json NOT NULL,
	`userId` varchar(191) NOT NULL,
	`endDateTime` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`startDateTime` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`cuid` varchar(191) NOT NULL,
	`visibility` enum('public','private') NOT NULL DEFAULT 'public',
	CONSTRAINT `Event_cuid` PRIMARY KEY(`cuid`)
);
--> statement-breakpoint
CREATE TABLE `FollowEvent` (
	`userId` varchar(191) NOT NULL,
	`eventId` varchar(191) NOT NULL,
	`createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updatedAt` datetime(3) NOT NULL,
	CONSTRAINT `FollowEvent_userId_eventId` PRIMARY KEY(`userId`,`eventId`)
);
--> statement-breakpoint
CREATE TABLE `FollowList` (
	`userId` varchar(191) NOT NULL,
	`listId` varchar(191) NOT NULL,
	`createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updatedAt` datetime(3) NOT NULL,
	CONSTRAINT `FollowList_userId_listId` PRIMARY KEY(`userId`,`listId`)
);
--> statement-breakpoint
CREATE TABLE `FollowUser` (
	`createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updatedAt` datetime(3) NOT NULL,
	`followerId` varchar(191) NOT NULL,
	`followingId` varchar(191) NOT NULL,
	CONSTRAINT `FollowUser_followerId_followingId` PRIMARY KEY(`followerId`,`followingId`)
);
--> statement-breakpoint
CREATE TABLE `List` (
	`name` varchar(191) NOT NULL,
	`description` varchar(191) NOT NULL,
	`createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updatedAt` datetime(3) NOT NULL,
	`id` varchar(191) NOT NULL,
	`userId` varchar(191) NOT NULL,
	CONSTRAINT `List_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `RequestResponse` (
	`id` varchar(191) NOT NULL,
	`createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updatedAt` datetime(3) NOT NULL,
	`modelOutput` json,
	`modelInput` json NOT NULL,
	`modelStatus` varchar(191) NOT NULL DEFAULT 'idle',
	`source` varchar(191) NOT NULL DEFAULT 'unknown',
	`modelCompletionTime` int,
	`parsedOutput` json,
	CONSTRAINT `RequestResponse_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `User` (
	`id` varchar(191) NOT NULL,
	`username` varchar(191) NOT NULL,
	`email` varchar(191) NOT NULL,
	`displayName` varchar(191) NOT NULL,
	`userImage` varchar(191) NOT NULL,
	`createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updatedAt` datetime(3) NOT NULL,
	CONSTRAINT `User_id` PRIMARY KEY(`id`),
	CONSTRAINT `User_username_key` UNIQUE(`username`),
	CONSTRAINT `User_email_key` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `Waitlist` (
	`id` varchar(191) NOT NULL,
	`email` varchar(191) NOT NULL,
	`zipcode` varchar(191) NOT NULL,
	`createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updatedAt` datetime(3) NOT NULL,
	`why` varchar(191) NOT NULL,
	CONSTRAINT `Waitlist_id` PRIMARY KEY(`id`),
	CONSTRAINT `Waitlist_email_key` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE INDEX `Comment_eventId_idx` ON `Comment` (`eventId`);--> statement-breakpoint
CREATE INDEX `Comment_userId_idx` ON `Comment` (`userId`);--> statement-breakpoint
CREATE INDEX `Event_userId_idx` ON `Event` (`userId`);--> statement-breakpoint
CREATE INDEX `FollowEvent_userId_idx` ON `FollowEvent` (`userId`);--> statement-breakpoint
CREATE INDEX `FollowEvent_eventId_idx` ON `FollowEvent` (`eventId`);--> statement-breakpoint
CREATE INDEX `FollowList_userId_idx` ON `FollowList` (`userId`);--> statement-breakpoint
CREATE INDEX `FollowList_listId_idx` ON `FollowList` (`listId`);--> statement-breakpoint
CREATE INDEX `FollowUser_followerId_idx` ON `FollowUser` (`followerId`);--> statement-breakpoint
CREATE INDEX `FollowUser_followingId_idx` ON `FollowUser` (`followingId`);--> statement-breakpoint
CREATE INDEX `List_userId_idx` ON `List` (`userId`);--> statement-breakpoint
*/