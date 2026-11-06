import {z} from 'zod';
import {ProductSchema, ProductSummarySchema, LocalizedTextSchema, BrandSchema, SiteDataSchema, FAQArraySchema, WarrantyDataSchema, BundlesArraySchema} from './catalog.js';
const slug=z.string().regex(/^[a-z0-9][a-z0-9-]{0,99}$/);
const money=z.string().regex(/^(0|[1-9]\d{0,11})(\.\d{1,2})?$/).nullable();
const imagePath=z.string().regex(/^\/(images\/[a-zA-Z0-9/_\-.]+|api\/media\/[a-zA-Z0-9-]+)$/);
export const ProductEditSchema=ProductSchema.extend({
  brandId:slug.optional(),productTypeId:slug.nullable().optional(),
  id:slug, slug, category:slug, model:z.string().min(1).max(200), brand:z.string().min(1).max(160),
  title:LocalizedTextSchema, summary:ProductSummarySchema,
  status:z.enum(['draft','published','archived']).default('draft'),
  revision:z.string().optional(),
  price:z.object({usd:money,yer:money,updatedAt:z.iso.datetime().nullable(),negotiable:z.boolean()}),
  warrantyMonths:z.number().int().min(0).max(120).nullable(),
  images:z.array(imagePath).max(20),
  bestFor:z.array(z.string().max(100)).max(30), tags:z.array(z.string().max(100)).max(30),
  compatibleWith:z.array(slug).max(50),
}).strict().superRefine((p,ctx)=>{
  if(p.specs.batteryHealthPct!=null && (p.specs.batteryHealthPct<0||p.specs.batteryHealthPct>100)) ctx.addIssue({code:'custom',path:['specs','batteryHealthPct'],message:'Use 0–100'});
  if(p.status==='published' && !p.images.length) ctx.addIssue({code:'custom',path:['status'],message:'Published products need images; SKU specifications are validated by the server'});
});
export type ProductEdit=z.infer<typeof ProductEditSchema>;
export const BrandEditSchema=BrandSchema.extend({id:slug,categories:z.array(slug),logoMediaId:z.string().max(100).nullable().optional(),published:z.boolean(),sort:z.number().int().min(0).max(10000)}).strict();
export const CategoryEditSchema=z.object({slug,title:LocalizedTextSchema,sort:z.number().int().min(0).max(10000)}).strict();
export const SpecEditSchema=z.object({key:z.string().regex(/^[a-zA-Z][a-zA-Z0-9]{0,79}$/),title:LocalizedTextSchema,filterable:z.boolean()}).strict();
export const ContentKeySchema=z.enum(['site','faq','warranty','bundles','homeImages','about']);
export const HomeImagesSchema=z.record(z.string(),z.string().nullable());

// About Page Schema
export const AboutStatSchema=z.object({value:z.string(),label:LocalizedTextSchema});
export const AboutValueSchema=z.string().max(10000);
export const AboutPageSchema=z.object({
  hero:z.object({
    headline:LocalizedTextSchema,
    subheadline:LocalizedTextSchema,
    description:LocalizedTextSchema,
    heroImage:z.string().nullable().optional(),
  }),
  story:z.object({
    title:LocalizedTextSchema,
    content:LocalizedTextSchema,
    image:z.string().nullable().optional(),
    year:z.number().int().nullable().optional(),
  }),
  mission:z.object({
    title:LocalizedTextSchema,
    content:LocalizedTextSchema,
    image:z.string().nullable().optional(),
  }),
  whyUs:z.array(z.object({
    icon:z.string(),
    title:LocalizedTextSchema,
    description:LocalizedTextSchema,
  })).max(8),
  stats:z.array(z.object({
    value:z.string(),
    label:LocalizedTextSchema,
  })).max(6),
  teamHighlight:z.object({
    title:LocalizedTextSchema,
    description:LocalizedTextSchema,
    image:z.string().nullable().optional(),
  }).optional(),
  values:z.array(z.object({
    icon:z.string(),
    title:LocalizedTextSchema,
    description:LocalizedTextSchema,
  })).max(6),
  ctaTitle:LocalizedTextSchema,
  ctaDescription:LocalizedTextSchema,
});
export type AboutPage=z.infer<typeof AboutPageSchema>;

export const contentSchemas={site:SiteDataSchema.superRefine((s,ctx)=>{
  for(const key of ['phone','whatsapp'] as const) if(s[key]&&!/^\+?[1-9]\d{7,14}$/.test(s[key]!)) ctx.addIssue({code:'custom',path:[key],message:'International phone number required'});
  for(const [key,value] of Object.entries(s.socialAccounts)) if(value&&!/^https:\/\//.test(value)) ctx.addIssue({code:'custom',path:['socialAccounts',key],message:'HTTPS URL required'});
}),faq:FAQArraySchema,warranty:WarrantyDataSchema,bundles:BundlesArraySchema,homeImages:HomeImagesSchema,about:AboutPageSchema};
