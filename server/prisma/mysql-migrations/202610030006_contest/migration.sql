-- Persist the exhibition module included in the deployed application.
CREATE TABLE IF NOT EXISTS `Contest` (
  `id` VARCHAR(100) NOT NULL, `slug` VARCHAR(100) NOT NULL,
  `title` JSON NOT NULL, `description` JSON NOT NULL,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `startsAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `endsAt` DATETIME(3) NULL, `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `Contest_slug_key` (`slug`), INDEX `Contest_isActive_startsAt_idx` (`isActive`,`startsAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS `ContestPrize` (
  `id` VARCHAR(100) NOT NULL, `contestId` VARCHAR(100) NOT NULL,
  `title` JSON NOT NULL, `description` JSON NULL, `imageUrl` VARCHAR(500) NULL,
  `category` VARCHAR(50) NOT NULL DEFAULT 'electronics', `quantity` INTEGER NOT NULL DEFAULT 1, `sort` INTEGER NOT NULL DEFAULT 0,
  INDEX `ContestPrize_contestId_sort_idx` (`contestId`,`sort`), PRIMARY KEY (`id`),
  CONSTRAINT `ContestPrize_contestId_fkey` FOREIGN KEY (`contestId`) REFERENCES `Contest` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS `ContestEntry` (
  `id` VARCHAR(100) NOT NULL, `contestId` VARCHAR(100) NOT NULL,
  `ticketNumber` VARCHAR(60) NOT NULL, `name` VARCHAR(150) NOT NULL, `phone` VARCHAR(20) NOT NULL,
  `city` VARCHAR(100) NULL, `interests` JSON NOT NULL, `deviceHash` VARCHAR(64) NULL, `ipHash` VARCHAR(64) NULL,
  `isWinner` BOOLEAN NOT NULL DEFAULT false, `wonPrizeId` VARCHAR(100) NULL,
  `wonAt` DATETIME(3) NULL, `claimedAt` DATETIME(3) NULL, `notes` VARCHAR(500) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `ContestEntry_ticketNumber_key` (`ticketNumber`), UNIQUE INDEX `ContestEntry_contestId_phone_key` (`contestId`,`phone`),
  INDEX `ContestEntry_contestId_isWinner_idx` (`contestId`,`isWinner`), INDEX `ContestEntry_contestId_deviceHash_idx` (`contestId`,`deviceHash`),
  INDEX `ContestEntry_createdAt_idx` (`createdAt`), PRIMARY KEY (`id`),
  CONSTRAINT `ContestEntry_contestId_fkey` FOREIGN KEY (`contestId`) REFERENCES `Contest` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ContestEntry_wonPrizeId_fkey` FOREIGN KEY (`wonPrizeId`) REFERENCES `ContestPrize` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS `ContestDrawLog` (
  `id` VARCHAR(100) NOT NULL, `contestId` VARCHAR(100) NOT NULL,
  `prizeId` VARCHAR(100) NOT NULL, `entryId` VARCHAR(100) NOT NULL,
  `drawnBy` VARCHAR(100) NULL, `drawnAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `ContestDrawLog_contestId_drawnAt_idx` (`contestId`,`drawnAt`), PRIMARY KEY (`id`),
  CONSTRAINT `ContestDrawLog_contestId_fkey` FOREIGN KEY (`contestId`) REFERENCES `Contest` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ContestDrawLog_prizeId_fkey` FOREIGN KEY (`prizeId`) REFERENCES `ContestPrize` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ContestDrawLog_entryId_fkey` FOREIGN KEY (`entryId`) REFERENCES `ContestEntry` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
