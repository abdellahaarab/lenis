-- ============================================================
-- Migration: 202610280001_pricing_history
-- الهدف: إضافة أعمدة الخصم والسعر الأصلي كأعمدة حقيقية
--        وتحسين PriceHistory لتتبع كامل للتغييرات
-- ============================================================

-- 1. إضافة أعمدة السعر الأصلي والخصم إلى Product
ALTER TABLE `Product`
  ADD COLUMN IF NOT EXISTS `originalPriceUsd` DECIMAL(14,2) NULL,
  ADD COLUMN IF NOT EXISTS `discountPercent`   DECIMAL(5,2)  NULL;

-- 2. إضافة نفس الأعمدة إلى ProductVariant
ALTER TABLE `ProductVariant`
  ADD COLUMN IF NOT EXISTS `originalPriceUsd` DECIMAL(14,2) NULL,
  ADD COLUMN IF NOT EXISTS `discountPercent`   DECIMAL(5,2)  NULL;

-- 3. تحسين PriceHistory لتتبع الخصم والنوع
ALTER TABLE `PriceHistory`
  ADD COLUMN IF NOT EXISTS `originalPriceUsd` DECIMAL(14,2) NULL,
  ADD COLUMN IF NOT EXISTS `discountPercent`   DECIMAL(5,2)  NULL,
  ADD COLUMN IF NOT EXISTS `changeType`        VARCHAR(20)   NOT NULL DEFAULT 'price';

-- 4. فهرس إضافي على changedAt لسرعة الاستعلام الزمني
ALTER TABLE `PriceHistory`
  ADD INDEX IF NOT EXISTS `PriceHistory_changedAt_idx` (`changedAt`);

-- 5. ترحيل البيانات الموجودة: نقل originalPriceUsd من specs (JSON) إلى العمود الحقيقي
-- للـ Product
UPDATE `Product`
SET `originalPriceUsd` = CAST(
  JSON_UNQUOTE(JSON_EXTRACT(`specs`, '$.originalPriceUsd')) AS DECIMAL(14,2)
)
WHERE
  JSON_EXTRACT(`specs`, '$.originalPriceUsd') IS NOT NULL
  AND JSON_UNQUOTE(JSON_EXTRACT(`specs`, '$.originalPriceUsd')) REGEXP '^[0-9]+(\\.[0-9]+)?$'
  AND `originalPriceUsd` IS NULL;

-- حساب discountPercent للـ Product حيث priceUsd < originalPriceUsd
UPDATE `Product`
SET `discountPercent` = ROUND(
  ((`originalPriceUsd` - `priceUsd`) / `originalPriceUsd`) * 100, 2
)
WHERE
  `originalPriceUsd` IS NOT NULL
  AND `priceUsd` IS NOT NULL
  AND `originalPriceUsd` > `priceUsd`
  AND `discountPercent` IS NULL;

-- للـ ProductVariant
UPDATE `ProductVariant`
SET `originalPriceUsd` = CAST(
  JSON_UNQUOTE(JSON_EXTRACT(`specs`, '$.originalPriceUsd')) AS DECIMAL(14,2)
)
WHERE
  JSON_EXTRACT(`specs`, '$.originalPriceUsd') IS NOT NULL
  AND JSON_UNQUOTE(JSON_EXTRACT(`specs`, '$.originalPriceUsd')) REGEXP '^[0-9]+(\\.[0-9]+)?$'
  AND `originalPriceUsd` IS NULL;

-- حساب discountPercent للـ ProductVariant
UPDATE `ProductVariant` v
JOIN `Product` p ON v.`productId` = p.`id`
SET v.`discountPercent` = ROUND(
  ((v.`originalPriceUsd` - COALESCE(v.`priceUsd`, p.`priceUsd`)) / v.`originalPriceUsd`) * 100, 2
)
WHERE
  v.`originalPriceUsd` IS NOT NULL
  AND COALESCE(v.`priceUsd`, p.`priceUsd`) IS NOT NULL
  AND v.`originalPriceUsd` > COALESCE(v.`priceUsd`, p.`priceUsd`)
  AND v.`discountPercent` IS NULL;
