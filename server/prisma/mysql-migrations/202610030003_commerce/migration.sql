-- AlterTable
ALTER TABLE `CatalogCategory` ADD COLUMN `description` JSON NOT NULL DEFAULT (JSON_OBJECT()),
    ADD COLUMN `imageId` VARCHAR(100) NULL,
    ADD COLUMN `parentSlug` VARCHAR(100) NULL,
    ADD COLUMN `productTypeId` VARCHAR(100) NULL,
    ADD COLUMN `status` ENUM('draft', 'published', 'archived') NOT NULL DEFAULT 'published';

-- AlterTable
ALTER TABLE `Product` ADD COLUMN `productTypeId` VARCHAR(100) NULL;

-- AlterTable
ALTER TABLE `SpecDefinition` ADD COLUMN `card` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `options` JSON NOT NULL DEFAULT (JSON_ARRAY()),
    ADD COLUMN `required` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `sort` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `unit` VARCHAR(40) NULL,
    ADD COLUMN `valueType` VARCHAR(20) NOT NULL DEFAULT 'text';

-- CreateTable
CREATE TABLE `ProductType` (
    `id` VARCHAR(100) NOT NULL,
    `title` JSON NOT NULL,
    `fields` JSON NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProductVariant` (
    `id` VARCHAR(100) NOT NULL,
    `productId` VARCHAR(100) NOT NULL,
    `sku` VARCHAR(100) NOT NULL,
    `optionKey` VARCHAR(500) NOT NULL,
    `options` JSON NOT NULL,
    `specs` JSON NOT NULL,
    `images` JSON NOT NULL,
    `priceUsd` DECIMAL(14, 2) NULL,
    `warrantyMonths` INTEGER NULL,
    `condition` ENUM('new', 'A', 'B', 'C') NOT NULL,
    `inventoryMode` VARCHAR(20) NOT NULL DEFAULT 'quantity',
    `quantity` INTEGER NOT NULL DEFAULT 0,
    `inventoryReviewed` BOOLEAN NOT NULL DEFAULT false,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ProductVariant_sku_key`(`sku`),
    INDEX `ProductVariant_productId_active_idx`(`productId`, `active`),
    UNIQUE INDEX `ProductVariant_productId_optionKey_key`(`productId`, `optionKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InventoryUnit` (
    `id` VARCHAR(100) NOT NULL,
    `variantId` VARCHAR(100) NOT NULL,
    `serialNumber` VARCHAR(200) NOT NULL,
    `condition` ENUM('new', 'A', 'B', 'C') NOT NULL,
    `batteryHealthPct` INTEGER NULL,
    `inspection` JSON NOT NULL,
    `defects` JSON NOT NULL,
    `images` JSON NOT NULL,
    `available` BOOLEAN NOT NULL DEFAULT true,
    `soldOrderId` VARCHAR(100) NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `InventoryUnit_serialNumber_key`(`serialNumber`),
    INDEX `InventoryUnit_variantId_available_idx`(`variantId`, `available`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InventoryMovement` (
    `id` VARCHAR(100) NOT NULL,
    `variantId` VARCHAR(100) NOT NULL,
    `unitId` VARCHAR(100) NULL,
    `delta` INTEGER NOT NULL,
    `reason` VARCHAR(500) NOT NULL,
    `userId` VARCHAR(100) NOT NULL,
    `orderId` VARCHAR(100) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `InventoryMovement_variantId_createdAt_idx`(`variantId`, `createdAt`),
    INDEX `InventoryMovement_orderId_idx`(`orderId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CatalogCollection` (
    `id` VARCHAR(100) NOT NULL,
    `slug` VARCHAR(160) NOT NULL,
    `title` JSON NOT NULL,
    `description` JSON NOT NULL,
    `mode` VARCHAR(20) NOT NULL,
    `rules` JSON NOT NULL,
    `published` BOOLEAN NOT NULL DEFAULT false,
    `sort` INTEGER NOT NULL DEFAULT 0,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `CatalogCollection_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CollectionProduct` (
    `collectionId` VARCHAR(100) NOT NULL,
    `productId` VARCHAR(100) NOT NULL,

    PRIMARY KEY (`collectionId`, `productId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CatalogPackage` (
    `id` VARCHAR(100) NOT NULL,
    `slug` VARCHAR(160) NOT NULL,
    `title` JSON NOT NULL,
    `description` JSON NOT NULL,
    `priceMode` VARCHAR(20) NOT NULL,
    `priceUsd` DECIMAL(14, 2) NULL,
    `published` BOOLEAN NOT NULL DEFAULT false,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `CatalogPackage_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PackageItem` (
    `packageId` VARCHAR(100) NOT NULL,
    `variantId` VARCHAR(100) NOT NULL,
    `quantity` INTEGER NOT NULL,

    PRIMARY KEY (`packageId`, `variantId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CustomerAccount` (
    `id` VARCHAR(100) NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `phone` VARCHAR(16) NOT NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `phoneVerified` BOOLEAN NOT NULL DEFAULT false,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `CustomerAccount_phone_key`(`phone`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CustomerSession` (
    `id` VARCHAR(64) NOT NULL,
    `customerId` VARCHAR(100) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,

    INDEX `CustomerSession_customerId_idx`(`customerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CustomerReset` (
    `id` VARCHAR(64) NOT NULL,
    `customerId` VARCHAR(100) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `usedAt` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ShoppingCart` (
    `id` VARCHAR(64) NOT NULL,
    `customerId` VARCHAR(100) NULL,
    `items` JSON NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ShoppingCart_customerId_key`(`customerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PricingConfig` (
    `id` INTEGER NOT NULL DEFAULT 1,
    `usdToYer` DECIMAL(18, 6) NULL,
    `whatsapp` VARCHAR(16) NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CommerceOrder` (
    `id` VARCHAR(100) NOT NULL,
    `number` VARCHAR(50) NOT NULL,
    `customerId` VARCHAR(100) NOT NULL,
    `idempotencyKey` VARCHAR(100) NOT NULL,
    `status` VARCHAR(30) NOT NULL DEFAULT 'new',
    `currency` ENUM('USD', 'YER') NOT NULL,
    `usdToYer` DECIMAL(18, 6) NULL,
    `rateAt` DATETIME(3) NULL,
    `subtotalUsd` DECIMAL(18, 2) NOT NULL,
    `subtotalYer` DECIMAL(24, 2) NULL,
    `hasUnpriced` BOOLEAN NOT NULL,
    `items` JSON NOT NULL,
    `fulfillment` JSON NOT NULL,
    `customerSnapshot` JSON NOT NULL,
    `completedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `CommerceOrder_number_key`(`number`),
    INDEX `CommerceOrder_status_createdAt_idx`(`status`, `createdAt`),
    UNIQUE INDEX `CommerceOrder_customerId_idempotencyKey_key`(`customerId`, `idempotencyKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProductRedirect` (
    `path` VARCHAR(500) NOT NULL,
    `productId` VARCHAR(100) NOT NULL,

    PRIMARY KEY (`path`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `CatalogCategory` ADD CONSTRAINT `CatalogCategory_parentSlug_fkey` FOREIGN KEY (`parentSlug`) REFERENCES `CatalogCategory`(`slug`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductVariant` ADD CONSTRAINT `ProductVariant_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InventoryUnit` ADD CONSTRAINT `InventoryUnit_variantId_fkey` FOREIGN KEY (`variantId`) REFERENCES `ProductVariant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InventoryMovement` ADD CONSTRAINT `InventoryMovement_variantId_fkey` FOREIGN KEY (`variantId`) REFERENCES `ProductVariant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CollectionProduct` ADD CONSTRAINT `CollectionProduct_collectionId_fkey` FOREIGN KEY (`collectionId`) REFERENCES `CatalogCollection`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CollectionProduct` ADD CONSTRAINT `CollectionProduct_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PackageItem` ADD CONSTRAINT `PackageItem_packageId_fkey` FOREIGN KEY (`packageId`) REFERENCES `CatalogPackage`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PackageItem` ADD CONSTRAINT `PackageItem_variantId_fkey` FOREIGN KEY (`variantId`) REFERENCES `ProductVariant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CustomerSession` ADD CONSTRAINT `CustomerSession_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `CustomerAccount`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CustomerReset` ADD CONSTRAINT `CustomerReset_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `CustomerAccount`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ShoppingCart` ADD CONSTRAINT `ShoppingCart_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `CustomerAccount`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CommerceOrder` ADD CONSTRAINT `CommerceOrder_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `CustomerAccount`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
