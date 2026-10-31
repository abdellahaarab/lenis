-- Smart Coupon System Migration

CREATE TABLE IF NOT EXISTS `Coupon` (
  `id` VARCHAR(100) NOT NULL,
  `code` VARCHAR(50) NOT NULL,
  `title` JSON NOT NULL,
  `description` JSON NULL,
  `discountType` VARCHAR(20) NOT NULL,
  `discountValue` DECIMAL(18,2) NOT NULL,
  `maxDiscountUsd` DECIMAL(18,2) NULL,
  `minOrderAmountUsd` DECIMAL(18,2) NULL,
  `maxOrderAmountUsd` DECIMAL(18,2) NULL,
  `minItemQuantity` INTEGER NULL DEFAULT 1,
  `startDate` DATETIME(3) NULL,
  `endDate` DATETIME(3) NULL,
  `usageLimitTotal` INTEGER NULL,
  `usageLimitPerCustomer` INTEGER NULL DEFAULT 1,
  `usedCount` INTEGER NOT NULL DEFAULT 0,
  `firstOrderOnly` BOOLEAN NOT NULL DEFAULT false,
  `excludeDiscounted` BOOLEAN NOT NULL DEFAULT false,
  `isPublic` BOOLEAN NOT NULL DEFAULT false,
  `active` BOOLEAN NOT NULL DEFAULT true,
  `applicableCategories` JSON NULL,
  `excludedCategories` JSON NULL,
  `applicableBrands` JSON NULL,
  `excludedBrands` JSON NULL,
  `applicableProducts` JSON NULL,
  `customerPhones` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `Coupon_code_key` (`code`),
  INDEX `Coupon_active_endDate_idx` (`active`, `endDate`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `CommerceOrder`
  ADD COLUMN IF NOT EXISTS `couponId` VARCHAR(100) NULL,
  ADD COLUMN IF NOT EXISTS `couponCode` VARCHAR(50) NULL,
  ADD COLUMN IF NOT EXISTS `discountUsd` DECIMAL(18,2) NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `discountYer` DECIMAL(24,2) NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `totalUsd` DECIMAL(18,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `totalYer` DECIMAL(24,2) NULL,
  ADD COLUMN IF NOT EXISTS `couponDetails` JSON NULL;

ALTER TABLE `CommerceOrder`
  ADD INDEX IF NOT EXISTS `CommerceOrder_couponId_idx` (`couponId`);

CREATE TABLE IF NOT EXISTS `CouponUsage` (
  `id` VARCHAR(100) NOT NULL,
  `couponId` VARCHAR(100) NOT NULL,
  `orderId` VARCHAR(100) NOT NULL,
  `customerId` VARCHAR(100) NOT NULL,
  `discountUsd` DECIMAL(18,2) NOT NULL,
  `discountYer` DECIMAL(24,2) NULL,
  `orderSubtotalUsd` DECIMAL(18,2) NOT NULL,
  `customerPhone` VARCHAR(30) NULL,
  `usedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `CouponUsage_orderId_key` (`orderId`),
  INDEX `CouponUsage_couponId_idx` (`couponId`),
  INDEX `CouponUsage_customerId_idx` (`customerId`),
  INDEX `CouponUsage_couponId_customerId_idx` (`couponId`, `customerId`),
  PRIMARY KEY (`id`),
  CONSTRAINT `CouponUsage_couponId_fkey` FOREIGN KEY (`couponId`) REFERENCES `Coupon` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `CouponUsage_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `CommerceOrder` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `CouponUsage_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `CustomerAccount` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
