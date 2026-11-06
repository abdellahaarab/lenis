ALTER TABLE ProductVariant ADD CONSTRAINT ProductVariant_nonnegative CHECK (quantity >= 0 AND (priceUsd IS NULL OR priceUsd > 0));
ALTER TABLE ProductVariant ADD CONSTRAINT ProductVariant_inventory_mode CHECK (inventoryMode IN ('quantity','serialized'));
ALTER TABLE InventoryUnit ADD CONSTRAINT InventoryUnit_battery CHECK (batteryHealthPct IS NULL OR batteryHealthPct BETWEEN 0 AND 100);
ALTER TABLE PackageItem ADD CONSTRAINT PackageItem_quantity CHECK (quantity > 0);
ALTER TABLE PricingConfig ADD CONSTRAINT PricingConfig_positive_rate CHECK (usdToYer IS NULL OR usdToYer > 0);
ALTER TABLE CommerceOrder ADD CONSTRAINT CommerceOrder_valid_status CHECK (status IN ('new','review','confirmed','preparing','ready_pickup','out_delivery','completed','cancelled'));
