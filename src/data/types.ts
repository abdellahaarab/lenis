import { z } from 'zod';
import {
  ProductSchema,
  CategoryEnum,
  ConditionEnum,
  StockEnum,
  BundleSchema,
  BrandSchema,
  FAQItemSchema,
  WarrantyDataSchema,
  SiteDataSchema,
  LocalizedTextSchema,
  SpecsSchema,
} from './schema';

export type LocalizedText = z.infer<typeof LocalizedTextSchema>;
export type Category = z.infer<typeof CategoryEnum>;
export type ConditionGrade = z.infer<typeof ConditionEnum>;
export type StockStatus = z.infer<typeof StockEnum>;
export type ProductSpecs = z.infer<typeof SpecsSchema>;
export type Product = z.infer<typeof ProductSchema>;
export type Bundle = z.infer<typeof BundleSchema>;
export type Brand = z.infer<typeof BrandSchema>;
export type FAQItem = z.infer<typeof FAQItemSchema>;
export type WarrantyData = z.infer<typeof WarrantyDataSchema>;
export type SiteData = z.infer<typeof SiteDataSchema>;
