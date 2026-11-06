-- Supported by MySQL 8.0.16+ and MariaDB 10.4+ (Hostinger verified: 11.8.9).
ALTER TABLE `Product` ADD CONSTRAINT `Product_nonnegative_prices` CHECK ((`priceUsd` IS NULL OR `priceUsd` >= 0) AND (`priceYer` IS NULL OR `priceYer` >= 0));
ALTER TABLE `Product` ADD CONSTRAINT `Product_valid_warranty` CHECK (`warrantyMonths` IS NULL OR (`warrantyMonths` >= 0 AND `warrantyMonths` <= 120));
ALTER TABLE `Product` ADD CONSTRAINT `Product_valid_quantity` CHECK (`quantity` >= 0);
ALTER TABLE `Product` ADD CONSTRAINT `Product_valid_battery` CHECK (`batteryHealthPct` IS NULL OR (`batteryHealthPct` >= 0 AND `batteryHealthPct` <= 100));
-- Self compatibility is guarded by triggers installed with db:audit:protect.
-- MariaDB 11.8 forbids CHECK on columns participating in cascading foreign keys.
ALTER TABLE `ProductCompat` ADD CONSTRAINT `ProductCompat_valid_watts` CHECK (`watts` IS NULL OR `watts` > 0);
ALTER TABLE `ProductCompat` ADD CONSTRAINT `ProductCompat_verified_source` CHECK (NOT `verified` OR (`portType` IS NOT NULL AND `source` IS NOT NULL));
ALTER TABLE `Quote` ADD CONSTRAINT `Quote_valid_amounts` CHECK (`subtotal` >= 0 AND `discount` >= 0 AND `total` >= 0);
ALTER TABLE `QuoteItem` ADD CONSTRAINT `QuoteItem_valid_amounts` CHECK (`qty` > 0 AND `unitPrice` >= 0);
ALTER TABLE `BundleItem` ADD CONSTRAINT `BundleItem_valid_qty` CHECK (`qty` > 0);
