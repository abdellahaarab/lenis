import { z } from 'zod';

export const LocalizedTextSchema = z.object({
  ar: z.string().min(1, 'Arabic text is required'),
  en: z.string().max(4000).optional().default(''),
}).transform(val => ({
  ar: val.ar,
  en: (val.en && val.en.trim()) ? val.en : val.ar
}));

// Product descriptions are optional; clearing them must remain valid in the store and editor.
export const ProductSummarySchema = z.object({
  ar: z.string().max(4000).default(''),
  en: z.string().max(4000).optional().default(''),
});

export const CategoryEnum = z.enum([
  'laptops',
  'displays',
  'audio',
  'gaming',
  'network',
  'storage',
  'power',
  'hard-drives',
]);

export const ConditionEnum = z.enum([
  'new',
  'open_box',
  'like_new',
  'refurbished',
  'used',
  'defective',
  'A',
  'B',
  'C',
]);

export const AvailabilityModeEnum = z.enum(['in_stock', 'local_order', 'external_order']);

export const StockEnum = z.enum(['in_stock', 'low', 'order', 'sold']);

export const PriceSchema = z.object({
  usd: z.number().nullable(),
  originalUsd: z.number().nullable().optional(),
  discountPercent: z.number().nullable().optional(),
  yer: z.number().nullable(),
  updatedAt: z.string().nullable(),
  negotiable: z.boolean().default(false),
});

export const DisplaySpecSchema = z.object({
  sizeIn: z.number(),
  res: z.string(),
  touch: z.boolean().optional(),
  hz: z.number().optional(),
  panel: z.string().optional(),
});

export const SpecsSchema = z.object({
  // Laptop & PC specs
  cpu: z.string().optional(),
  cpuGen: z.number().optional(),
  ramGB: z.number().optional(),
  ramType: z.string().optional(),
  ramUpgradable: z.boolean().optional(),
  storageGB: z.number().optional(),
  storageType: z.string().optional(),
  display: DisplaySpecSchema.optional(),
  gpu: z.string().optional(),
  batteryHealthPct: z.number().nullable().optional(),
  ports: z.array(z.string()).optional(),
  weightKg: z.number().optional(),
  os: z.string().optional(),

  // Display specs
  panel: z.string().optional(),
  colorGamut: z.string().optional(),
  usbCPdWatts: z.number().optional(),
  heightAdjustable: z.boolean().optional(),

  // Audio specs
  connectionType: z.string().optional(),
  polarPattern: z.string().optional(),
  frequencyResponse: z.string().optional(),

  // Network specs
  wifiStandard: z.string().optional(),
  speedMbps: z.number().optional(),
  portsCount: z.number().optional(),
  meshSupport: z.boolean().optional(),

  // Storage specs
  capacityGB: z.number().optional(),
  readSpeedMBs: z.number().optional(),
  writeSpeedMBs: z.number().optional(),
  interface: z.string().optional(),

  // Power specs
  capacityVA: z.number().optional(),
  capacityWatts: z.number().optional(),
  waveType: z.string().optional(),
  outletsCount: z.number().optional(),

  // Hard Drive specs
  hddType: z.string().optional(),       // HDD | SSD | NVMe | External | Portable
  formFactor: z.string().optional(),    // 3.5" | 2.5" | M.2 | External
  rpm: z.number().optional(),           // 5400 | 7200 | 10000
  cacheSize: z.string().optional(),     // e.g. "64MB" | "256MB"
  usbVersion: z.string().optional(),    // e.g. "USB 3.0" | "USB-C 3.2"
}).passthrough();

export const InspectionNotesSchema = z.object({
  ar: z.string(),
  en: z.string().optional().default(''),
}).transform(val => ({
  ar: val.ar,
  en: (val.en && val.en.trim()) ? val.en : val.ar
}));

export const InspectionSchema = z.object({
  passed: z.boolean(),
  date: z.string().nullable(),
  notes: InspectionNotesSchema,
  checklist: z.record(z.string(), z.boolean()).optional(),
});

export const ConnectionSchema = z.object({
  targetId: z.string(),
  port: z.string().nullable(),
  watts: z.number().positive().nullable(),
  verified: z.boolean(),
  source: z.string().url().nullable(),
}).refine(v => !v.verified || Boolean(v.port && v.source), 'Verified connections need a documented port and source');

export const ProductSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  category: z.string().regex(/^[a-z0-9][a-z0-9-]{0,99}$/),
  brand: z.string().min(1),
  model: z.string().min(1),
  title: LocalizedTextSchema,
  summary: ProductSummarySchema,
  condition: ConditionEnum,
  warrantyMonths: z.number().nullable(),
  price: PriceSchema,
  stock: StockEnum,
  specs: SpecsSchema,
  bestFor: z.array(z.string()),
  compatibleWith: z.array(z.string()),
  connections: z.array(ConnectionSchema).optional(),
  specSources: z.array(z.string().url()).optional(),
  inspection: InspectionSchema,
  images: z.array(z.string()),
  tags: z.array(z.string()),
  demo: z.boolean().optional(),
});

export const ProductsArraySchema = z.array(ProductSchema);

export const BundleTierSchema = z.object({
  id: z.string(),
  name: LocalizedTextSchema,
  summary: LocalizedTextSchema,
  price: z.object({
    usd: z.number().nullable(),
    yer: z.number().nullable(),
  }),
  items: z.array(z.string()),
});

export const BundleSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: LocalizedTextSchema,
  summary: LocalizedTextSchema,
  why: LocalizedTextSchema,
  problemSolved: LocalizedTextSchema,
  tiers: z.array(BundleTierSchema),
});

export const BundlesArraySchema = z.array(BundleSchema);

export const BrandSchema = z.object({
  id: z.string(),
  name: z.string(),
  categories: z.array(z.string()),
  description: LocalizedTextSchema,
  tagline: LocalizedTextSchema.optional(),
  claim: z.string().optional(), // 'authorized' not allowed without doc
});

export const BrandsArraySchema = z.array(BrandSchema);

export const FAQItemSchema = z.object({
  id: z.string(),
  question: LocalizedTextSchema,
  answer: LocalizedTextSchema,
  category: z.string().optional(),
});

export const FAQArraySchema = z.array(FAQItemSchema);

export const ConditionGradeSchema = z.object({
  grade: ConditionEnum,
  label: LocalizedTextSchema,
  meaning: LocalizedTextSchema,
  criteria: LocalizedTextSchema,
});

export const ChecklistItemSchema = z.object({
  id: z.string(),
  title: LocalizedTextSchema,
  description: LocalizedTextSchema,
});

export const WarrantyPolicySchema = z.object({
  durationNote: LocalizedTextSchema,
  coverage: LocalizedTextSchema,
  exclusions: LocalizedTextSchema,
  replacementOrRepair: LocalizedTextSchema,
  immediateReplacementPeriod: LocalizedTextSchema,
  proofOfPurchase: LocalizedTextSchema,
  claimProcess: LocalizedTextSchema,
});

export const WarrantyDataSchema = z.object({
  conditionGrades: z.array(ConditionGradeSchema),
  inspectionChecklist: z.array(ChecklistItemSchema),
  policy: WarrantyPolicySchema,
});

export const SiteDataSchema = z.object({
  storeName: LocalizedTextSchema,
  englishName: z.string(),
  city: LocalizedTextSchema,
  tagline: LocalizedTextSchema,
  warrantySlogan: LocalizedTextSchema,
  foundedYear: z.number().nullable(),
  address: LocalizedTextSchema.nullable(),
  phone: z.string().nullable(),
  whatsapp: z.string().nullable(),
  workingHours: LocalizedTextSchema.nullable(),
  socialAccounts: z.record(z.string(), z.string().nullable()),
  defaultCurrency: z.enum(['USD', 'YER']),
  officialAgentClaim: z.literal(false),
  demoNotice: LocalizedTextSchema,
});
