-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(100) NOT NULL,
    `email` VARCHAR(254) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `nameSearch` VARCHAR(100) NOT NULL DEFAULT '',
    `passwordHash` VARCHAR(191) NOT NULL,
    `role` ENUM('owner', 'manager', 'sales', 'editor', 'viewer') NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `mustChangePassword` BOOLEAN NOT NULL DEFAULT true,
    `totpSecret` VARCHAR(191) NULL,
    `totpPendingSecret` VARCHAR(191) NULL,
    `totpPendingUntil` DATETIME(3) NULL,
    `totpLastCounter` BIGINT NULL,
    `failedLogins` INTEGER NOT NULL DEFAULT 0,
    `lockedUntil` DATETIME(3) NULL,
    `lastLoginAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    INDEX `User_role_isActive_idx`(`role`, `isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Session` (
    `id` VARCHAR(64) NOT NULL,
    `userId` VARCHAR(100) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `lastSeenAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `userAgent` VARCHAR(300) NOT NULL,
    `ipHash` VARCHAR(64) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Session_userId_expiresAt_idx`(`userId`, `expiresAt`),
    INDEX `Session_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AuditLog` (
    `id` VARCHAR(100) NOT NULL,
    `userId` VARCHAR(100) NULL,
    `action` VARCHAR(80) NOT NULL,
    `entity` VARCHAR(80) NOT NULL,
    `entityId` VARCHAR(100) NULL,
    `before` JSON NULL,
    `after` JSON NULL,
    `ip` VARCHAR(64) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AuditLog_createdAt_idx`(`createdAt`),
    INDEX `AuditLog_entity_entityId_createdAt_idx`(`entity`, `entityId`, `createdAt`),
    INDEX `AuditLog_userId_createdAt_idx`(`userId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Brand` (
    `id` VARCHAR(100) NOT NULL,
    `slug` VARCHAR(160) NOT NULL,
    `name` VARCHAR(160) NOT NULL,
    `description` JSON NOT NULL,
    `tagline` JSON NULL,
    `logoMediaId` VARCHAR(100) NULL,
    `isAuthorizedDealer` BOOLEAN NOT NULL DEFAULT false,
    `sort` INTEGER NOT NULL DEFAULT 0,
    `published` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `Brand_slug_key`(`slug`),
    INDEX `Brand_published_sort_idx`(`published`, `sort`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Product` (
    `id` VARCHAR(100) NOT NULL,
    `slug` VARCHAR(160) NOT NULL,
    `category` VARCHAR(100) NOT NULL,
    `brandId` VARCHAR(100) NOT NULL,
    `model` VARCHAR(200) NOT NULL,
    `title` JSON NOT NULL,
    `summary` JSON NOT NULL,
    `condition` ENUM('new', 'A', 'B', 'C') NOT NULL,
    `status` ENUM('draft', 'published', 'archived') NOT NULL DEFAULT 'draft',
    `demo` BOOLEAN NOT NULL DEFAULT false,
    `warrantyMonths` INTEGER NULL,
    `priceUsd` DECIMAL(14, 2) NULL,
    `priceYer` DECIMAL(18, 2) NULL,
    `priceUpdatedAt` DATETIME(3) NULL,
    `negotiable` BOOLEAN NOT NULL DEFAULT false,
    `stock` ENUM('in_stock', 'low', 'order', 'sold') NOT NULL DEFAULT 'order',
    `quantity` INTEGER NOT NULL DEFAULT 0,
    `serialNumber` VARCHAR(200) NULL,
    `batteryHealthPct` INTEGER NULL,
    `specs` JSON NOT NULL,
    `inspection` JSON NOT NULL,
    `specSources` JSON NOT NULL,
    `bestFor` JSON NOT NULL,
    `tags` JSON NOT NULL,
    `publishedAt` DATETIME(3) NULL,
    `deletedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Product_slug_key`(`slug`),
    INDEX `Product_status_deletedAt_category_publishedAt_idx`(`status`, `deletedAt`, `category`, `publishedAt`),
    INDEX `Product_brandId_status_idx`(`brandId`, `status`),
    INDEX `Product_stock_deletedAt_idx`(`stock`, `deletedAt`),
    INDEX `Product_demo_deletedAt_idx`(`demo`, `deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProductImage` (
    `id` VARCHAR(100) NOT NULL,
    `productId` VARCHAR(100) NOT NULL,
    `mediaId` VARCHAR(100) NOT NULL,
    `sort` INTEGER NOT NULL DEFAULT 0,
    `shot` ENUM('front-closed', '34-right', '34-left', 'side', 'open-screen', 'keyboard', 'ports-right', 'ports-left', 'back', 'label', 'defect', 'accessories') NOT NULL,
    `altAr` VARCHAR(191) NOT NULL DEFAULT '',
    `altEn` VARCHAR(191) NOT NULL DEFAULT '',

    INDEX `ProductImage_productId_sort_idx`(`productId`, `sort`),
    INDEX `ProductImage_mediaId_idx`(`mediaId`),
    UNIQUE INDEX `ProductImage_productId_mediaId_key`(`productId`, `mediaId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProductCompat` (
    `id` VARCHAR(100) NOT NULL,
    `productId` VARCHAR(100) NOT NULL,
    `otherProductId` VARCHAR(100) NOT NULL,
    `portType` VARCHAR(191) NULL,
    `watts` DECIMAL(10, 2) NULL,
    `verified` BOOLEAN NOT NULL DEFAULT false,
    `source` VARCHAR(191) NULL,
    `note` VARCHAR(191) NULL,

    INDEX `ProductCompat_otherProductId_idx`(`otherProductId`),
    UNIQUE INDEX `ProductCompat_productId_otherProductId_key`(`productId`, `otherProductId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PriceHistory` (
    `id` VARCHAR(100) NOT NULL,
    `productId` VARCHAR(100) NOT NULL,
    `priceUsd` DECIMAL(14, 2) NULL,
    `priceYer` DECIMAL(18, 2) NULL,
    `changedBy` VARCHAR(100) NOT NULL,
    `changedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `reason` VARCHAR(191) NULL,

    INDEX `PriceHistory_productId_changedAt_idx`(`productId`, `changedAt`),
    INDEX `PriceHistory_changedBy_idx`(`changedBy`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Bundle` (
    `id` VARCHAR(100) NOT NULL,
    `slug` VARCHAR(160) NOT NULL,
    `useCase` VARCHAR(80) NOT NULL,
    `title` JSON NOT NULL,
    `summary` JSON NOT NULL,
    `why` JSON NOT NULL,
    `problemSolved` JSON NOT NULL,
    `tiers` JSON NOT NULL,
    `published` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Bundle_slug_key`(`slug`),
    INDEX `Bundle_published_useCase_idx`(`published`, `useCase`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BundleItem` (
    `id` VARCHAR(100) NOT NULL,
    `bundleId` VARCHAR(100) NOT NULL,
    `tier` ENUM('economy', 'balanced', 'advanced') NOT NULL,
    `productId` VARCHAR(100) NULL,
    `roleLabel` JSON NULL,
    `qty` INTEGER NOT NULL DEFAULT 1,
    `sort` INTEGER NOT NULL DEFAULT 0,

    INDEX `BundleItem_bundleId_tier_sort_idx`(`bundleId`, `tier`, `sort`),
    INDEX `BundleItem_productId_idx`(`productId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FaqItem` (
    `id` VARCHAR(100) NOT NULL,
    `question` JSON NOT NULL,
    `answer` JSON NOT NULL,
    `sort` INTEGER NOT NULL DEFAULT 0,
    `published` BOOLEAN NOT NULL DEFAULT false,
    `category` VARCHAR(80) NULL,

    INDEX `FaqItem_published_category_sort_idx`(`published`, `category`, `sort`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `WarrantyPolicy` (
    `id` INTEGER NOT NULL DEFAULT 1,
    `conditionGrades` JSON NOT NULL,
    `inspectionChecklist` JSON NOT NULL,
    `policy` JSON NOT NULL,
    `newMonths` INTEGER NULL,
    `gradeAMonths` INTEGER NULL,
    `gradeBMonths` INTEGER NULL,
    `gradeCMonths` INTEGER NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Guide` (
    `id` VARCHAR(100) NOT NULL,
    `slug` VARCHAR(160) NOT NULL,
    `title` JSON NOT NULL,
    `body` JSON NOT NULL,
    `coverMediaId` VARCHAR(100) NULL,
    `tags` JSON NOT NULL,
    `status` ENUM('draft', 'published', 'archived') NOT NULL DEFAULT 'draft',
    `publishedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Guide_slug_key`(`slug`),
    INDEX `Guide_status_publishedAt_idx`(`status`, `publishedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SiteSetting` (
    `key` VARCHAR(100) NOT NULL,
    `value` JSON NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MediaAsset` (
    `id` VARCHAR(100) NOT NULL,
    `kind` ENUM('image', 'sequence', 'document') NOT NULL,
    `originalPath` VARCHAR(191) NOT NULL,
    `variants` JSON NOT NULL,
    `manifest` JSON NULL,
    `width` INTEGER NULL,
    `height` INTEGER NULL,
    `bytes` BIGINT NOT NULL,
    `sourceNote` VARCHAR(191) NULL,
    `licensed` BOOLEAN NOT NULL DEFAULT false,
    `altAr` VARCHAR(191) NOT NULL DEFAULT '',
    `altEn` VARCHAR(191) NOT NULL DEFAULT '',
    `content` MEDIUMBLOB NULL,
    `mime` VARCHAR(40) NOT NULL DEFAULT 'image/webp',
    `createdBy` VARCHAR(100) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `MediaAsset_kind_createdAt_idx`(`kind`, `createdAt`),
    INDEX `MediaAsset_createdBy_idx`(`createdBy`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Customer` (
    `id` VARCHAR(100) NOT NULL,
    `name` VARCHAR(150) NULL,
    `phone` VARCHAR(16) NULL,
    `email` VARCHAR(254) NULL,
    `city` VARCHAR(100) NULL,
    `type` ENUM('individual', 'business') NOT NULL DEFAULT 'individual',
    `company` VARCHAR(191) NULL,
    `notes` VARCHAR(191) NULL,
    `tags` JSON NOT NULL,
    `firstSource` ENUM('brief_builder', 'quote_form', 'contact_form', 'product_inquiry', 'whatsapp_click', 'walk_in', 'phone', 'manual') NOT NULL,
    `marketingConsent` BOOLEAN NOT NULL DEFAULT false,
    `consentAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `deletedAt` DATETIME(3) NULL,

    INDEX `Customer_phone_idx`(`phone`),
    INDEX `Customer_deletedAt_createdAt_idx`(`deletedAt`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Lead` (
    `id` VARCHAR(100) NOT NULL,
    `customerId` VARCHAR(100) NULL,
    `source` ENUM('brief_builder', 'quote_form', 'contact_form', 'product_inquiry', 'whatsapp_click', 'walk_in', 'phone', 'manual') NOT NULL,
    `status` ENUM('new', 'contacted', 'quoted', 'won', 'lost') NOT NULL DEFAULT 'new',
    `lostReason` VARCHAR(191) NULL,
    `payload` JSON NOT NULL,
    `productId` VARCHAR(100) NULL,
    `assignedToId` VARCHAR(100) NULL,
    `nextFollowUpAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Lead_status_createdAt_idx`(`status`, `createdAt`),
    INDEX `Lead_assignedToId_nextFollowUpAt_idx`(`assignedToId`, `nextFollowUpAt`),
    INDEX `Lead_source_createdAt_idx`(`source`, `createdAt`),
    INDEX `Lead_customerId_idx`(`customerId`),
    INDEX `Lead_productId_idx`(`productId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LeadActivity` (
    `id` VARCHAR(100) NOT NULL,
    `leadId` VARCHAR(100) NOT NULL,
    `userId` VARCHAR(100) NOT NULL,
    `type` ENUM('note', 'call', 'whatsapp', 'status_change', 'assignment') NOT NULL,
    `body` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `LeadActivity_leadId_createdAt_idx`(`leadId`, `createdAt`),
    INDEX `LeadActivity_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Quote` (
    `id` VARCHAR(100) NOT NULL,
    `leadId` VARCHAR(100) NULL,
    `customerId` VARCHAR(100) NULL,
    `currency` ENUM('USD', 'YER') NOT NULL DEFAULT 'USD',
    `subtotal` DECIMAL(18, 2) NOT NULL,
    `discount` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    `total` DECIMAL(18, 2) NOT NULL,
    `validUntil` DATETIME(3) NULL,
    `status` ENUM('draft', 'sent', 'accepted', 'rejected', 'expired') NOT NULL DEFAULT 'draft',
    `notes` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Quote_status_createdAt_idx`(`status`, `createdAt`),
    INDEX `Quote_customerId_idx`(`customerId`),
    INDEX `Quote_leadId_idx`(`leadId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `QuoteItem` (
    `id` VARCHAR(100) NOT NULL,
    `quoteId` VARCHAR(100) NOT NULL,
    `productId` VARCHAR(100) NULL,
    `label` JSON NOT NULL,
    `qty` INTEGER NOT NULL DEFAULT 1,
    `unitPrice` DECIMAL(18, 2) NOT NULL,
    `currency` ENUM('USD', 'YER') NOT NULL,
    `sort` INTEGER NOT NULL DEFAULT 0,

    INDEX `QuoteItem_quoteId_sort_idx`(`quoteId`, `sort`),
    INDEX `QuoteItem_productId_idx`(`productId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Sale` (
    `id` VARCHAR(100) NOT NULL,
    `customerId` VARCHAR(100) NULL,
    `productId` VARCHAR(100) NULL,
    `serialNumber` VARCHAR(191) NULL,
    `soldAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `priceUsd` DECIMAL(14, 2) NULL,
    `warrantyMonths` INTEGER NULL,
    `warrantyStart` DATETIME(3) NOT NULL,
    `warrantyEnd` DATETIME(3) NULL,
    `notes` VARCHAR(191) NULL,

    INDEX `Sale_warrantyEnd_idx`(`warrantyEnd`),
    INDEX `Sale_customerId_soldAt_idx`(`customerId`, `soldAt`),
    INDEX `Sale_productId_idx`(`productId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Subscriber` (
    `id` VARCHAR(100) NOT NULL,
    `channel` ENUM('email', 'whatsapp') NOT NULL,
    `contact` VARCHAR(254) NOT NULL,
    `status` ENUM('active', 'unsubscribed', 'bounced') NOT NULL DEFAULT 'active',
    `consentAt` DATETIME(3) NOT NULL,
    `consentSource` VARCHAR(100) NOT NULL,
    `consentTextVersion` VARCHAR(80) NOT NULL,
    `unsubscribeToken` VARCHAR(64) NOT NULL,
    `tags` JSON NOT NULL,
    `lang` ENUM('ar', 'en') NOT NULL DEFAULT 'ar',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Subscriber_unsubscribeToken_key`(`unsubscribeToken`),
    INDEX `Subscriber_channel_status_createdAt_idx`(`channel`, `status`, `createdAt`),
    UNIQUE INDEX `Subscriber_channel_contact_key`(`channel`, `contact`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AnalyticsEvent` (
    `id` VARCHAR(100) NOT NULL,
    `type` ENUM('page_view', 'product_view', 'whatsapp_click', 'filter_used', 'compare_used', 'search', 'form_submit', 'bundle_view') NOT NULL,
    `path` VARCHAR(500) NOT NULL,
    `productId` VARCHAR(100) NULL,
    `visitorHash` VARCHAR(64) NOT NULL,
    `sessionHash` VARCHAR(64) NOT NULL,
    `referrerHost` VARCHAR(254) NULL,
    `utm` JSON NULL,
    `deviceClass` ENUM('mobile', 'tablet', 'desktop') NOT NULL,
    `lang` ENUM('ar', 'en') NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AnalyticsEvent_createdAt_idx`(`createdAt`),
    INDEX `AnalyticsEvent_type_createdAt_idx`(`type`, `createdAt`),
    INDEX `AnalyticsEvent_productId_type_createdAt_idx`(`productId`, `type`, `createdAt`),
    INDEX `AnalyticsEvent_visitorHash_createdAt_idx`(`visitorHash`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AnalyticsDaily` (
    `id` VARCHAR(100) NOT NULL,
    `day` DATE NOT NULL,
    `type` ENUM('page_view', 'product_view', 'whatsapp_click', 'filter_used', 'compare_used', 'search', 'form_submit', 'bundle_view') NOT NULL,
    `dimensionKey` VARCHAR(64) NOT NULL,
    `dimensions` JSON NOT NULL,
    `events` INTEGER NOT NULL DEFAULT 0,
    `visitors` INTEGER NOT NULL DEFAULT 0,

    INDEX `AnalyticsDaily_day_type_idx`(`day`, `type`),
    UNIQUE INDEX `AnalyticsDaily_day_type_dimensionKey_key`(`day`, `type`, `dimensionKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CatalogCategory` (
    `slug` VARCHAR(100) NOT NULL,
    `title` JSON NOT NULL,
    `sort` INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY (`slug`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BrandCategory` (
    `brandId` VARCHAR(100) NOT NULL,
    `categorySlug` VARCHAR(100) NOT NULL,

    INDEX `BrandCategory_categorySlug_idx`(`categorySlug`),
    PRIMARY KEY (`brandId`, `categorySlug`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SpecDefinition` (
    `key` VARCHAR(80) NOT NULL,
    `title` JSON NOT NULL,
    `filterable` BOOLEAN NOT NULL DEFAULT true,

    PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProductFacet` (
    `productId` VARCHAR(100) NOT NULL,
    `key` VARCHAR(80) NOT NULL,
    `value` VARCHAR(160) NOT NULL,

    INDEX `ProductFacet_key_value_idx`(`key`, `value`),
    PRIMARY KEY (`productId`, `key`, `value`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProductLabel` (
    `productId` VARCHAR(100) NOT NULL,
    `kind` VARCHAR(20) NOT NULL,
    `value` VARCHAR(100) NOT NULL,

    INDEX `ProductLabel_kind_value_idx`(`kind`, `value`),
    PRIMARY KEY (`productId`, `kind`, `value`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Session` ADD CONSTRAINT `Session_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AuditLog` ADD CONSTRAINT `AuditLog_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Brand` ADD CONSTRAINT `Brand_logoMediaId_fkey` FOREIGN KEY (`logoMediaId`) REFERENCES `MediaAsset`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Product` ADD CONSTRAINT `Product_category_fkey` FOREIGN KEY (`category`) REFERENCES `CatalogCategory`(`slug`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Product` ADD CONSTRAINT `Product_brandId_fkey` FOREIGN KEY (`brandId`) REFERENCES `Brand`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductImage` ADD CONSTRAINT `ProductImage_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductImage` ADD CONSTRAINT `ProductImage_mediaId_fkey` FOREIGN KEY (`mediaId`) REFERENCES `MediaAsset`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductCompat` ADD CONSTRAINT `ProductCompat_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductCompat` ADD CONSTRAINT `ProductCompat_otherProductId_fkey` FOREIGN KEY (`otherProductId`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PriceHistory` ADD CONSTRAINT `PriceHistory_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PriceHistory` ADD CONSTRAINT `PriceHistory_changedBy_fkey` FOREIGN KEY (`changedBy`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BundleItem` ADD CONSTRAINT `BundleItem_bundleId_fkey` FOREIGN KEY (`bundleId`) REFERENCES `Bundle`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BundleItem` ADD CONSTRAINT `BundleItem_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Guide` ADD CONSTRAINT `Guide_coverMediaId_fkey` FOREIGN KEY (`coverMediaId`) REFERENCES `MediaAsset`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MediaAsset` ADD CONSTRAINT `MediaAsset_createdBy_fkey` FOREIGN KEY (`createdBy`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Lead` ADD CONSTRAINT `Lead_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Lead` ADD CONSTRAINT `Lead_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Lead` ADD CONSTRAINT `Lead_assignedToId_fkey` FOREIGN KEY (`assignedToId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LeadActivity` ADD CONSTRAINT `LeadActivity_leadId_fkey` FOREIGN KEY (`leadId`) REFERENCES `Lead`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LeadActivity` ADD CONSTRAINT `LeadActivity_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Quote` ADD CONSTRAINT `Quote_leadId_fkey` FOREIGN KEY (`leadId`) REFERENCES `Lead`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Quote` ADD CONSTRAINT `Quote_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `QuoteItem` ADD CONSTRAINT `QuoteItem_quoteId_fkey` FOREIGN KEY (`quoteId`) REFERENCES `Quote`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `QuoteItem` ADD CONSTRAINT `QuoteItem_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Sale` ADD CONSTRAINT `Sale_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Sale` ADD CONSTRAINT `Sale_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AnalyticsEvent` ADD CONSTRAINT `AnalyticsEvent_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BrandCategory` ADD CONSTRAINT `BrandCategory_brandId_fkey` FOREIGN KEY (`brandId`) REFERENCES `Brand`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BrandCategory` ADD CONSTRAINT `BrandCategory_categorySlug_fkey` FOREIGN KEY (`categorySlug`) REFERENCES `CatalogCategory`(`slug`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductFacet` ADD CONSTRAINT `ProductFacet_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductFacet` ADD CONSTRAINT `ProductFacet_key_fkey` FOREIGN KEY (`key`) REFERENCES `SpecDefinition`(`key`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductLabel` ADD CONSTRAINT `ProductLabel_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
