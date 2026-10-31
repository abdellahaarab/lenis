import {z} from 'zod';
import {ConditionEnum, AvailabilityModeEnum} from './catalog.js';
export const BiText = z.object({
  ar: z.string().min(1).max(4000),
  en: z.string().max(4000).optional().default('')
}).transform(val => ({
  ar: val.ar,
  en: (val.en && val.en.trim()) ? val.en : val.ar
}));
const id=z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/);
const slug=z.string().regex(/^[a-z0-9][a-z0-9-]{0,99}$/);
export const Money=z.string().regex(/^\d{1,12}(\.\d{1,2})?$/).refine(v=>Number(v)>0).nullable();
export const SpecValues=z.record(z.string().max(80),z.union([z.string().max(2000),z.number().finite(),z.boolean(),z.array(z.string().max(160)).max(30)]));
export const SpecField=z.object({key:id,title:BiText,valueType:z.enum(['number','text','boolean','single','multi']),unit:z.string().max(40).nullable().default(null),options:z.array(z.string().max(160)).max(100).default([]),required:z.boolean().default(false),filterable:z.boolean().default(false),card:z.boolean().default(false),sort:z.number().int().default(0)});
export const TypeEdit=z.object({id:slug,title:BiText,fields:z.array(SpecField).max(80),revision:z.string().optional()});
export const CategoryEdit=z.object({slug,title:BiText,description:BiText,parentSlug:id.nullable(),productTypeId:slug.nullable(),imageId:id.nullable(),sort:z.number().int(),status:z.enum(['draft','published','archived']),revision:z.string().optional()});
export const VariantEdit=z.object({id,productId:id,sku:id,options:SpecValues,specs:SpecValues,images:z.array(z.string().regex(/^\/api\/media\/[a-zA-Z0-9-]+$/)).max(20),priceUsd:Money,warrantyMonths:z.number().int().min(0).max(120).nullable(),condition:ConditionEnum,inventoryMode:z.enum(['quantity','serialized']),availabilityMode:AvailabilityModeEnum.default('in_stock'),leadTimeDays:z.number().int().min(0).max(90).nullable().default(null),active:z.boolean(),revision:z.string().optional()});
export const UnitEdit=z.object({id,variantId:id,serialNumber:z.string().min(1).max(200),condition:ConditionEnum,batteryHealthPct:z.number().int().min(0).max(100).nullable(),inspection:z.record(z.string(),z.union([z.boolean(),z.string().max(2000)])),defects:z.array(BiText).max(30),images:z.array(z.string().regex(/^\/api\/media\/[a-zA-Z0-9-]+$/)).max(20),revision:z.string().optional()});
export const CollectionRules=z.object({categories:z.array(id).default([]),brands:z.array(id).default([]),conditions:z.array(ConditionEnum).default([]),available:z.boolean().nullable().default(null),min:Money.optional(),max:Money.optional(),endsAt:z.string().datetime().nullable().optional(),badge:z.string().max(60).nullable().optional(),accentColor:z.string().max(20).nullable().optional(),discountPct:z.number().int().min(1).max(99).nullable().optional(),pinned:z.boolean().optional()});
export const CollectionEdit=z.object({id,slug:id,title:BiText,description:BiText,mode:z.enum(['manual','automatic']),rules:CollectionRules,productIds:z.array(id).max(2000),published:z.boolean(),sort:z.number().int(),revision:z.string().optional()});
export const PackageEdit=z.object({id,slug:id,title:BiText,description:BiText,priceMode:z.enum(['sum','fixed']),priceUsd:Money,items:z.array(z.object({variantId:id,quantity:z.number().int().min(1).max(100)})).min(1).max(30),published:z.boolean(),revision:z.string().optional()}).refine(v=>v.priceMode!=='fixed'||v.priceUsd!==null);
export const CartLine=z.object({variantId:id.optional(),unitId:id.optional(),packageId:id.optional(),unitIds:z.array(id).max(100).optional(),quantity:z.number().int().min(1).max(100)}).refine(v=>Boolean(v.variantId)!==Boolean(v.packageId));
export const CartLines=z.array(CartLine).max(100);
export const Fulfillment=z.object({method:z.enum(['pickup','delivery']),address:z.string().max(1000).default(''),notes:z.string().max(1000).default('')}).refine(v=>v.method!=='delivery'||v.address.trim().length>=10);
export const Checkout=z.object({previewToken:z.string().length(64),idempotencyKey:z.string().uuid(),currency:z.enum(['USD','YER']),fulfillment:Fulfillment,couponCode:z.string().max(50).optional()});
export const CustomerCredentials=z.object({phone:z.string().regex(/^\+[1-9]\d{7,14}$/),password:z.string().min(10).max(128)});
export const CustomerRegistration=CustomerCredentials.extend({name:z.string().trim().min(2).max(150)});
export const OrderStatuses=['new','review','confirmed','preparing','ready_pickup','out_delivery','completed','cancelled'] as const;
export type CartLineInput=z.infer<typeof CartLine>;
export type SpecFieldInput=z.infer<typeof SpecField>;
export type VariantInput=z.infer<typeof VariantEdit>;
export type CollectionRuleInput=z.infer<typeof CollectionRules>;
