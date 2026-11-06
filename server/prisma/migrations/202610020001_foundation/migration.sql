-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('owner', 'manager', 'sales', 'editor', 'viewer');

-- CreateEnum
CREATE TYPE "Category" AS ENUM ('laptops', 'displays', 'audio', 'gaming', 'network', 'storage', 'power');

-- CreateEnum
CREATE TYPE "Condition" AS ENUM ('new', 'A', 'B', 'C');

-- CreateEnum
CREATE TYPE "ContentStatus" AS ENUM ('draft', 'published', 'archived');

-- CreateEnum
CREATE TYPE "Stock" AS ENUM ('in_stock', 'low', 'order', 'sold');

-- CreateEnum
CREATE TYPE "Shot" AS ENUM ('front-closed', '34-right', '34-left', 'side', 'open-screen', 'keyboard', 'ports-right', 'ports-left', 'back', 'label', 'defect', 'accessories');

-- CreateEnum
CREATE TYPE "BundleTier" AS ENUM ('economy', 'balanced', 'advanced');

-- CreateEnum
CREATE TYPE "MediaKind" AS ENUM ('image', 'sequence', 'document');

-- CreateEnum
CREATE TYPE "CustomerType" AS ENUM ('individual', 'business');

-- CreateEnum
CREATE TYPE "LeadSource" AS ENUM ('brief_builder', 'quote_form', 'contact_form', 'product_inquiry', 'whatsapp_click', 'walk_in', 'phone', 'manual');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('new', 'contacted', 'quoted', 'won', 'lost');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('note', 'call', 'whatsapp', 'status_change', 'assignment');

-- CreateEnum
CREATE TYPE "QuoteStatus" AS ENUM ('draft', 'sent', 'accepted', 'rejected', 'expired');

-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('USD', 'YER');

-- CreateEnum
CREATE TYPE "SubscriberChannel" AS ENUM ('email', 'whatsapp');

-- CreateEnum
CREATE TYPE "SubscriberStatus" AS ENUM ('active', 'unsubscribed', 'bounced');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('page_view', 'product_view', 'whatsapp_click', 'filter_used', 'compare_used', 'search', 'form_submit', 'bundle_view');

-- CreateEnum
CREATE TYPE "DeviceClass" AS ENUM ('mobile', 'tablet', 'desktop');

-- CreateEnum
CREATE TYPE "Language" AS ENUM ('ar', 'en');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "nameSearch" VARCHAR(100) NOT NULL DEFAULT '',
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT true,
    "totpSecret" TEXT,
    "totpPendingSecret" TEXT,
    "totpPendingUntil" TIMESTAMPTZ(3),
    "totpLastCounter" BIGINT,
    "failedLogins" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMPTZ(3),
    "lastLoginAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" VARCHAR(64) NOT NULL,
    "userId" UUID NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "lastSeenAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userAgent" VARCHAR(300) NOT NULL,
    "ipHash" VARCHAR(64) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL,
    "userId" UUID,
    "action" VARCHAR(80) NOT NULL,
    "entity" VARCHAR(80) NOT NULL,
    "entityId" VARCHAR(100),
    "before" JSONB,
    "after" JSONB,
    "ip" VARCHAR(64),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Brand" (
    "id" UUID NOT NULL,
    "slug" VARCHAR(160) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "description" JSONB NOT NULL DEFAULT '{}',
    "tagline" JSONB,
    "categories" "Category"[] DEFAULT ARRAY[]::"Category"[],
    "logoMediaId" UUID,
    "isAuthorizedDealer" BOOLEAN NOT NULL DEFAULT false,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "published" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Brand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" UUID NOT NULL,
    "slug" VARCHAR(160) NOT NULL,
    "category" "Category" NOT NULL,
    "brandId" UUID NOT NULL,
    "model" VARCHAR(200) NOT NULL,
    "title" JSONB NOT NULL,
    "summary" JSONB NOT NULL,
    "condition" "Condition" NOT NULL,
    "status" "ContentStatus" NOT NULL DEFAULT 'draft',
    "demo" BOOLEAN NOT NULL DEFAULT false,
    "warrantyMonths" INTEGER,
    "priceUsd" DECIMAL(14,2),
    "priceYer" DECIMAL(18,2),
    "priceUpdatedAt" TIMESTAMPTZ(3),
    "negotiable" BOOLEAN NOT NULL DEFAULT false,
    "stock" "Stock" NOT NULL DEFAULT 'order',
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "serialNumber" VARCHAR(200),
    "batteryHealthPct" INTEGER,
    "specs" JSONB NOT NULL,
    "inspection" JSONB NOT NULL,
    "specSources" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "bestFor" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "publishedAt" TIMESTAMPTZ(3),
    "deletedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductImage" (
    "id" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "mediaId" UUID NOT NULL,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "shot" "Shot" NOT NULL,
    "altAr" TEXT NOT NULL DEFAULT '',
    "altEn" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "ProductImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductCompat" (
    "id" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "otherProductId" UUID NOT NULL,
    "portType" TEXT,
    "watts" DECIMAL(10,2),
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "source" TEXT,
    "note" TEXT,

    CONSTRAINT "ProductCompat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceHistory" (
    "id" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "priceUsd" DECIMAL(14,2),
    "priceYer" DECIMAL(18,2),
    "changedBy" UUID NOT NULL,
    "changedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT,

    CONSTRAINT "PriceHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bundle" (
    "id" UUID NOT NULL,
    "slug" VARCHAR(160) NOT NULL,
    "useCase" VARCHAR(80) NOT NULL,
    "title" JSONB NOT NULL,
    "summary" JSONB NOT NULL,
    "why" JSONB NOT NULL,
    "problemSolved" JSONB NOT NULL,
    "tiers" JSONB NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Bundle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BundleItem" (
    "id" UUID NOT NULL,
    "bundleId" UUID NOT NULL,
    "tier" "BundleTier" NOT NULL,
    "productId" UUID,
    "roleLabel" JSONB,
    "qty" INTEGER NOT NULL DEFAULT 1,
    "sort" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "BundleItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FaqItem" (
    "id" UUID NOT NULL,
    "question" JSONB NOT NULL,
    "answer" JSONB NOT NULL,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "category" VARCHAR(80),

    CONSTRAINT "FaqItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WarrantyPolicy" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "conditionGrades" JSONB NOT NULL,
    "inspectionChecklist" JSONB NOT NULL,
    "policy" JSONB NOT NULL,
    "newMonths" INTEGER,
    "gradeAMonths" INTEGER,
    "gradeBMonths" INTEGER,
    "gradeCMonths" INTEGER,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "WarrantyPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Guide" (
    "id" UUID NOT NULL,
    "slug" VARCHAR(160) NOT NULL,
    "title" JSONB NOT NULL,
    "body" JSONB NOT NULL,
    "coverMediaId" UUID,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "ContentStatus" NOT NULL DEFAULT 'draft',
    "publishedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Guide_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteSetting" (
    "key" VARCHAR(100) NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "SiteSetting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "MediaAsset" (
    "id" UUID NOT NULL,
    "kind" "MediaKind" NOT NULL,
    "originalPath" TEXT NOT NULL,
    "variants" JSONB NOT NULL,
    "manifest" JSONB,
    "width" INTEGER,
    "height" INTEGER,
    "bytes" BIGINT NOT NULL,
    "sourceNote" TEXT,
    "licensed" BOOLEAN NOT NULL DEFAULT false,
    "altAr" TEXT NOT NULL DEFAULT '',
    "altEn" TEXT NOT NULL DEFAULT '',
    "createdBy" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" UUID NOT NULL,
    "name" VARCHAR(150),
    "phone" VARCHAR(16),
    "email" VARCHAR(254),
    "city" VARCHAR(100),
    "type" "CustomerType" NOT NULL DEFAULT 'individual',
    "company" TEXT,
    "notes" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "firstSource" "LeadSource" NOT NULL,
    "marketingConsent" BOOLEAN NOT NULL DEFAULT false,
    "consentAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" UUID NOT NULL,
    "customerId" UUID,
    "source" "LeadSource" NOT NULL,
    "status" "LeadStatus" NOT NULL DEFAULT 'new',
    "lostReason" TEXT,
    "payload" JSONB NOT NULL,
    "productId" UUID,
    "assignedToId" UUID,
    "nextFollowUpAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadActivity" (
    "id" UUID NOT NULL,
    "leadId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "type" "ActivityType" NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quote" (
    "id" UUID NOT NULL,
    "leadId" UUID,
    "customerId" UUID,
    "currency" "Currency" NOT NULL DEFAULT 'USD',
    "subtotal" DECIMAL(18,2) NOT NULL,
    "discount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(18,2) NOT NULL,
    "validUntil" TIMESTAMPTZ(3),
    "status" "QuoteStatus" NOT NULL DEFAULT 'draft',
    "notes" JSONB,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Quote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuoteItem" (
    "id" UUID NOT NULL,
    "quoteId" UUID NOT NULL,
    "productId" UUID,
    "label" JSONB NOT NULL,
    "qty" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(18,2) NOT NULL,
    "currency" "Currency" NOT NULL,
    "sort" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "QuoteItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sale" (
    "id" UUID NOT NULL,
    "customerId" UUID,
    "productId" UUID,
    "serialNumber" TEXT,
    "soldAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "priceUsd" DECIMAL(14,2),
    "warrantyMonths" INTEGER,
    "warrantyStart" TIMESTAMPTZ(3) NOT NULL,
    "warrantyEnd" TIMESTAMPTZ(3),
    "notes" TEXT,

    CONSTRAINT "Sale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscriber" (
    "id" UUID NOT NULL,
    "channel" "SubscriberChannel" NOT NULL,
    "contact" VARCHAR(254) NOT NULL,
    "status" "SubscriberStatus" NOT NULL DEFAULT 'active',
    "consentAt" TIMESTAMPTZ(3) NOT NULL,
    "consentSource" VARCHAR(100) NOT NULL,
    "consentTextVersion" VARCHAR(80) NOT NULL,
    "unsubscribeToken" VARCHAR(64) NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "lang" "Language" NOT NULL DEFAULT 'ar',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Subscriber_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsEvent" (
    "id" UUID NOT NULL,
    "type" "EventType" NOT NULL,
    "path" VARCHAR(500) NOT NULL,
    "productId" UUID,
    "visitorHash" VARCHAR(64) NOT NULL,
    "sessionHash" VARCHAR(64) NOT NULL,
    "referrerHost" VARCHAR(254),
    "utm" JSONB,
    "deviceClass" "DeviceClass" NOT NULL,
    "lang" "Language" NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsDaily" (
    "id" UUID NOT NULL,
    "day" DATE NOT NULL,
    "type" "EventType" NOT NULL,
    "dimensionKey" VARCHAR(64) NOT NULL,
    "dimensions" JSONB NOT NULL,
    "events" INTEGER NOT NULL DEFAULT 0,
    "visitors" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AnalyticsDaily_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_isActive_idx" ON "User"("role", "isActive");

-- CreateIndex
CREATE INDEX "Session_userId_expiresAt_idx" ON "Session"("userId", "expiresAt");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_createdAt_idx" ON "AuditLog"("entity", "entityId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Brand_slug_key" ON "Brand"("slug");

-- CreateIndex
CREATE INDEX "Brand_published_sort_idx" ON "Brand"("published", "sort");

-- CreateIndex
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");

-- CreateIndex
CREATE INDEX "Product_status_deletedAt_category_publishedAt_idx" ON "Product"("status", "deletedAt", "category", "publishedAt");

-- CreateIndex
CREATE INDEX "Product_brandId_status_idx" ON "Product"("brandId", "status");

-- CreateIndex
CREATE INDEX "Product_stock_deletedAt_idx" ON "Product"("stock", "deletedAt");

-- CreateIndex
CREATE INDEX "Product_demo_deletedAt_idx" ON "Product"("demo", "deletedAt");

-- CreateIndex
CREATE INDEX "ProductImage_productId_sort_idx" ON "ProductImage"("productId", "sort");

-- CreateIndex
CREATE INDEX "ProductImage_mediaId_idx" ON "ProductImage"("mediaId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductImage_productId_mediaId_key" ON "ProductImage"("productId", "mediaId");

-- CreateIndex
CREATE INDEX "ProductCompat_otherProductId_idx" ON "ProductCompat"("otherProductId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductCompat_productId_otherProductId_key" ON "ProductCompat"("productId", "otherProductId");

-- CreateIndex
CREATE INDEX "PriceHistory_productId_changedAt_idx" ON "PriceHistory"("productId", "changedAt");

-- CreateIndex
CREATE INDEX "PriceHistory_changedBy_idx" ON "PriceHistory"("changedBy");

-- CreateIndex
CREATE UNIQUE INDEX "Bundle_slug_key" ON "Bundle"("slug");

-- CreateIndex
CREATE INDEX "Bundle_published_useCase_idx" ON "Bundle"("published", "useCase");

-- CreateIndex
CREATE INDEX "BundleItem_bundleId_tier_sort_idx" ON "BundleItem"("bundleId", "tier", "sort");

-- CreateIndex
CREATE INDEX "BundleItem_productId_idx" ON "BundleItem"("productId");

-- CreateIndex
CREATE INDEX "FaqItem_published_category_sort_idx" ON "FaqItem"("published", "category", "sort");

-- CreateIndex
CREATE UNIQUE INDEX "Guide_slug_key" ON "Guide"("slug");

-- CreateIndex
CREATE INDEX "Guide_status_publishedAt_idx" ON "Guide"("status", "publishedAt");

-- CreateIndex
CREATE INDEX "MediaAsset_kind_createdAt_idx" ON "MediaAsset"("kind", "createdAt");

-- CreateIndex
CREATE INDEX "MediaAsset_createdBy_idx" ON "MediaAsset"("createdBy");

-- CreateIndex
CREATE INDEX "Customer_phone_idx" ON "Customer"("phone");

-- CreateIndex
CREATE INDEX "Customer_deletedAt_createdAt_idx" ON "Customer"("deletedAt", "createdAt");

-- CreateIndex
CREATE INDEX "Lead_status_createdAt_idx" ON "Lead"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Lead_assignedToId_nextFollowUpAt_idx" ON "Lead"("assignedToId", "nextFollowUpAt");

-- CreateIndex
CREATE INDEX "Lead_source_createdAt_idx" ON "Lead"("source", "createdAt");

-- CreateIndex
CREATE INDEX "Lead_customerId_idx" ON "Lead"("customerId");

-- CreateIndex
CREATE INDEX "Lead_productId_idx" ON "Lead"("productId");

-- CreateIndex
CREATE INDEX "LeadActivity_leadId_createdAt_idx" ON "LeadActivity"("leadId", "createdAt");

-- CreateIndex
CREATE INDEX "LeadActivity_userId_idx" ON "LeadActivity"("userId");

-- CreateIndex
CREATE INDEX "Quote_status_createdAt_idx" ON "Quote"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Quote_customerId_idx" ON "Quote"("customerId");

-- CreateIndex
CREATE INDEX "Quote_leadId_idx" ON "Quote"("leadId");

-- CreateIndex
CREATE INDEX "QuoteItem_quoteId_sort_idx" ON "QuoteItem"("quoteId", "sort");

-- CreateIndex
CREATE INDEX "QuoteItem_productId_idx" ON "QuoteItem"("productId");

-- CreateIndex
CREATE INDEX "Sale_warrantyEnd_idx" ON "Sale"("warrantyEnd");

-- CreateIndex
CREATE INDEX "Sale_customerId_soldAt_idx" ON "Sale"("customerId", "soldAt");

-- CreateIndex
CREATE INDEX "Sale_productId_idx" ON "Sale"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscriber_unsubscribeToken_key" ON "Subscriber"("unsubscribeToken");

-- CreateIndex
CREATE INDEX "Subscriber_channel_status_createdAt_idx" ON "Subscriber"("channel", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Subscriber_channel_contact_key" ON "Subscriber"("channel", "contact");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_createdAt_idx" ON "AnalyticsEvent"("createdAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_type_createdAt_idx" ON "AnalyticsEvent"("type", "createdAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_productId_type_createdAt_idx" ON "AnalyticsEvent"("productId", "type", "createdAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_visitorHash_createdAt_idx" ON "AnalyticsEvent"("visitorHash", "createdAt");

-- CreateIndex
CREATE INDEX "AnalyticsDaily_day_type_idx" ON "AnalyticsDaily"("day", "type");

-- CreateIndex
CREATE UNIQUE INDEX "AnalyticsDaily_day_type_dimensionKey_key" ON "AnalyticsDaily"("day", "type", "dimensionKey");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Brand" ADD CONSTRAINT "Brand_logoMediaId_fkey" FOREIGN KEY ("logoMediaId") REFERENCES "MediaAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductImage" ADD CONSTRAINT "ProductImage_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductImage" ADD CONSTRAINT "ProductImage_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "MediaAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductCompat" ADD CONSTRAINT "ProductCompat_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductCompat" ADD CONSTRAINT "ProductCompat_otherProductId_fkey" FOREIGN KEY ("otherProductId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceHistory" ADD CONSTRAINT "PriceHistory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceHistory" ADD CONSTRAINT "PriceHistory_changedBy_fkey" FOREIGN KEY ("changedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BundleItem" ADD CONSTRAINT "BundleItem_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "Bundle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BundleItem" ADD CONSTRAINT "BundleItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Guide" ADD CONSTRAINT "Guide_coverMediaId_fkey" FOREIGN KEY ("coverMediaId") REFERENCES "MediaAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadActivity" ADD CONSTRAINT "LeadActivity_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadActivity" ADD CONSTRAINT "LeadActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteItem" ADD CONSTRAINT "QuoteItem_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteItem" ADD CONSTRAINT "QuoteItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalyticsEvent" ADD CONSTRAINT "AnalyticsEvent_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Domain invariants that Prisma cannot express in its schema language.
ALTER TABLE "User" ADD CONSTRAINT "User_email_normalized" CHECK ("email" = lower(trim("email"))),
  ADD CONSTRAINT "User_failedLogins_nonnegative" CHECK ("failedLogins" >= 0);
ALTER TABLE "Session" ADD CONSTRAINT "Session_lifetime" CHECK ("expiresAt" > "createdAt");
ALTER TABLE "Product" ADD CONSTRAINT "Product_quantity_nonnegative" CHECK ("quantity" >= 0),
  ADD CONSTRAINT "Product_prices_nonnegative" CHECK (("priceUsd" IS NULL OR "priceUsd" >= 0) AND ("priceYer" IS NULL OR "priceYer" >= 0)),
  ADD CONSTRAINT "Product_warranty_nonnegative" CHECK ("warrantyMonths" IS NULL OR "warrantyMonths" >= 0),
  ADD CONSTRAINT "Product_battery_range" CHECK ("batteryHealthPct" IS NULL OR "batteryHealthPct" BETWEEN 0 AND 100),
  ADD CONSTRAINT "Product_json_objects" CHECK (jsonb_typeof("title") = 'object' AND jsonb_typeof("summary") = 'object' AND jsonb_typeof("specs") = 'object' AND jsonb_typeof("inspection") = 'object'),
  ADD CONSTRAINT "Product_publication_date" CHECK ("status" <> 'published' OR "publishedAt" IS NOT NULL);
ALTER TABLE "ProductCompat" ADD CONSTRAINT "ProductCompat_not_self" CHECK ("productId" <> "otherProductId"),
  ADD CONSTRAINT "ProductCompat_watts_positive" CHECK ("watts" IS NULL OR "watts" > 0),
  ADD CONSTRAINT "ProductCompat_verified_evidence" CHECK (NOT "verified" OR (length(trim("portType")) > 0 AND "portType" IS NOT NULL AND length(trim("source")) > 0 AND "source" IS NOT NULL));
ALTER TABLE "PriceHistory" ADD CONSTRAINT "PriceHistory_nonnegative" CHECK (("priceUsd" IS NULL OR "priceUsd" >= 0) AND ("priceYer" IS NULL OR "priceYer" >= 0));
ALTER TABLE "BundleItem" ADD CONSTRAINT "BundleItem_qty_positive" CHECK ("qty" > 0),
  ADD CONSTRAINT "BundleItem_component" CHECK (("productId" IS NULL) <> ("roleLabel" IS NULL));
ALTER TABLE "WarrantyPolicy" ADD CONSTRAINT "WarrantyPolicy_singleton" CHECK ("id" = 1),
  ADD CONSTRAINT "WarrantyPolicy_durations" CHECK (("newMonths" IS NULL OR "newMonths" >= 0) AND ("gradeAMonths" IS NULL OR "gradeAMonths" >= 0) AND ("gradeBMonths" IS NULL OR "gradeBMonths" >= 0) AND ("gradeCMonths" IS NULL OR "gradeCMonths" >= 0));
ALTER TABLE "Guide" ADD CONSTRAINT "Guide_publication_date" CHECK ("status" <> 'published' OR "publishedAt" IS NOT NULL);
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_dimensions" CHECK ("bytes" >= 0 AND ("width" IS NULL OR "width" > 0) AND ("height" IS NULL OR "height" > 0));
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_phone_e164" CHECK ("phone" IS NULL OR "phone" ~ '^\+[1-9][0-9]{6,14}$'),
  ADD CONSTRAINT "Customer_marketing_consent" CHECK (NOT "marketingConsent" OR "consentAt" IS NOT NULL);
ALTER TABLE "QuoteItem" ADD CONSTRAINT "QuoteItem_positive" CHECK ("qty" > 0 AND "unitPrice" >= 0);
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_totals" CHECK ("subtotal" >= 0 AND "discount" >= 0 AND "discount" <= "subtotal" AND "total" = "subtotal" - "discount");
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_warranty_snapshot" CHECK (("warrantyMonths" IS NULL AND "warrantyEnd" IS NULL) OR ("warrantyMonths" >= 0 AND "warrantyEnd" IS NOT NULL AND "warrantyEnd" >= "warrantyStart")),
  ADD CONSTRAINT "Sale_price_nonnegative" CHECK ("priceUsd" IS NULL OR "priceUsd" >= 0);
ALTER TABLE "AnalyticsDaily" ADD CONSTRAINT "AnalyticsDaily_nonnegative" CHECK ("events" >= 0 AND "visitors" >= 0);

CREATE FUNCTION reject_audit_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Audit log is append-only';
END;
$$;
CREATE TRIGGER "AuditLog_append_only" BEFORE UPDATE OR DELETE ON "AuditLog"
FOR EACH ROW EXECUTE FUNCTION reject_audit_mutation();
