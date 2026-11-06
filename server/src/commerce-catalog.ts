import {Prisma,type PrismaClient,type CatalogCategory} from '@prisma/client';
import {normalizeSearch,CollectionRules,SpecField,type SpecFieldInput,extractProcessorFamily,extractProcessorBrand,extractCpuGen,extractGraphicsInfo,computeLaptopFacets,type NormalizedLaptopItem,type LaptopFacets} from '@aljeel/shared';
import {z} from 'zod';
import {productDto} from './catalog-service.js';
import {ApiError} from './errors.js';
export const variantInclude={units:true,product:{include:{brand:true,variants:{include:{units:{select:{available:true}}}},images:{orderBy:{sort:'asc' as const},include:{media:{select:{id:true,originalPath:true}}}},compatibleWith:true}}} satisfies Prisma.ProductVariantInclude;
export type VariantRow=Prisma.ProductVariantGetPayload<{include:typeof variantInclude}>;
export type Sellable={variantId:string;unitId?:string;sku:string;condition:string;priceUsd:string|null;originalPriceUsd?:string|null;priceYer?:string|null;originalPriceYer?:string|null;discountPercent?:number|null;specs:Record<string,unknown>;images:string[];warrantyMonths:number|null;available:boolean;batteryHealthPct:number|null;inspection:unknown;defects:unknown;availabilityMode?:'in_stock'|'local_order'|'external_order';leadTimeDays?:number|null};
export const jsonObject=(v:unknown):Record<string,unknown>=>v&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:{};
export const imagePaths=(v:unknown):string[]=>Array.isArray(v)?v.filter((s):s is string=>typeof s==='string'):[];
const searchWords=(value:string)=>normalizeSearch(value).split(/[\s\p{P}\p{S}]+/u).filter(Boolean);
const searchTokenMatches=(text:string,token:string)=>{
  const normalized=normalizeSearch(text);
  if(token.includes(' '))return normalized.includes(token);
  return searchWords(normalized).some(word=>word===token||((token.length>=3||/^\d/.test(token))&&word.startsWith(token)));
};
export const optionIdentity=(options:Record<string,unknown>)=>JSON.stringify(Object.entries(options).sort(([a],[b])=>a.localeCompare(b)).map(([key,value])=>[key,Array.isArray(value)?[...value].sort():value]));
export const priceInYer=(usd:string|null,rate:Prisma.Decimal|null|undefined)=>usd!==null&&rate?new Prisma.Decimal(usd).mul(rate).toFixed(2):null;
export function offers(v:VariantRow):Sellable[]{
  const parent=jsonObject(v.product.specs),display=jsonObject(parent.display);
  const specs:Record<string,unknown>={...(display.sizeIn!==undefined?{sizeInch:display.sizeIn,screenSize:display.sizeIn}:{}),...(display.touch!==undefined?{touch:display.touch}:{}),...(display.hz!==undefined?{refreshHz:display.hz}:{}),...(display.res!==undefined?{resolution:display.res}:{}),...parent,...jsonObject(v.specs),...jsonObject(v.options)};
  const searchableTitle=[v.product.model,...Object.values(jsonObject(v.product.title))].join(' ');
  if(v.product.category==='laptops'){
    const ramMatch=searchableTitle.match(/(?:ram|memory|ذاكرة(?:\s+رام)?|رام)\s*[:\-]?\s*(\d{1,3})\s*(?:gb|g\b|جيجابايت|جيجا)?/i)
      ??searchableTitle.match(/(\d{1,3})\s*(?:gb|g\b|جيجابايت|جيجا)\s*(?:ram|memory|رام)/i);
    if(specs.ramGB===undefined&&ramMatch)specs.ramGB=Number(ramMatch[1]);
    const storageMatch=searchableTitle.match(/(?:ssd|hdd|nvme|تخزين|سعة)\s*(?:سعة|capacity|of)?\s*(\d+(?:\.\d+)?)\s*(tb|gb|تيرابايت|جيجابايت|تيرا|جيجا)/i)
      ??searchableTitle.match(/(\d+(?:\.\d+)?)\s*(tb|gb|تيرابايت|جيجابايت|تيرا|جيجا)\s*(?:ssd|hdd|nvme|storage|تخزين)/i);
    if(specs.storageGB===undefined&&storageMatch)specs.storageGB=Math.round(Number(storageMatch[1])*((/^(?:tb|تيرابايت|تيرا)$/i.test(storageMatch[2]))?1000:1));
    const screenMatch=searchableTitle.match(/(\d{1,2}(?:\.\d+)?)\s*(?:in(?:ch)?\b|[\"″]|بوصة)/i);
    if(specs.screenSize===undefined&&screenMatch)specs.screenSize=Number(screenMatch[1]);
    if(specs.touch===undefined&&/(?:touch\s*screen|touchscreen|شاشة\s*لمس|تعمل\s*باللمس)/i.test(searchableTitle))specs.touch=true;
    const cpuMatch=searchableTitle.match(/(?:core\s*)?i[3579](?:[- ]\d{4,5}[a-z]{0,2})?|(?:amd\s*)?ryzen\s*[3579](?:\s*\d{4,5}[a-z]{0,2})?|(?:core\s*ultra|كور\s*ألترا)\s*[3579](?:\s+\d{3,5}[a-z]{0,2})?|apple\s*m[1-4]/i);
    if((typeof specs.cpu!=='string'||!specs.cpu.trim())&&cpuMatch)specs.cpu=cpuMatch[0].replace(/كور\s*ألترا/i,'Core Ultra');
    if(typeof specs.cpuGen!=='number'){
      const ordinalGen=searchableTitle.match(/الجيل\s*(\d{1,2}|العاشر|الحادي\s*عشر|الثاني\s*عشر|الثالث\s*عشر|الرابع\s*عشر|الخامس\s*عشر)/i);
      const ordinals:Record<string,number>={'العاشر':10,'الحادي عشر':11,'الثاني عشر':12,'الثالث عشر':13,'الرابع عشر':14,'الخامس عشر':15};
      if(ordinalGen)specs.cpuGen=Number(ordinalGen[1])||ordinals[ordinalGen[1].replace(/\s+/g,' ')]||undefined;
    }
  }
  if(v.product.category==='laptops'||specs.cpu){
    const cpu=typeof specs.cpu==='string'?specs.cpu:'';
    specs.cpuFamily=extractProcessorFamily(cpu);
    specs.cpuBrand=extractProcessorBrand(cpu);
    // The catalog has legacy placeholder values (often 1); a generation
    // derivable from the processor model is more reliable than that value.
    const gen=extractCpuGen(cpu);
    if(gen===null&&typeof specs.cpuGen==='number'&&specs.cpuGen>0)specs.cpuGen=specs.cpuGen;
    if(gen!==null)specs.cpuGen=gen;
    const gpu=typeof specs.gpu==='string'?specs.gpu:'';
    const gpuInfo=extractGraphicsInfo(gpu,typeof specs.gpuVramGB==='number'?specs.gpuVramGB:null);
    specs.gpuType=gpuInfo.type;
    specs.gpuFamily=gpuInfo.family;
    specs.gpuVramGB=gpuInfo.vramGB;
    if(display.touch!==undefined)specs.touch=Boolean(display.touch);
    if(display.sizeIn!==undefined)specs.screenSize=display.sizeIn;
  }
  if(specs.capacityGB!==undefined&&specs.storageGB===undefined)specs.storageGB=specs.capacityGB;
  if(specs.hddType&&!specs.storageType)specs.storageType=specs.hddType;
  const priceUsdStr=v.priceUsd?.toFixed(2)??null;
  let originalPriceUsdStr:string|null=null;
  const rawOrig=specs.originalPriceUsd??(v.specs as Record<string,unknown>)?.originalPriceUsd??(v.product.specs as Record<string,unknown>)?.originalPriceUsd;
  if(rawOrig!==null&&rawOrig!==undefined&&!isNaN(Number(rawOrig))&&Number(rawOrig)>0){
    originalPriceUsdStr=Number(rawOrig).toFixed(2);
  }else if(priceUsdStr&&Number(priceUsdStr)>0){
    const baseNum=Number(priceUsdStr);
    const calculatedOrig=Math.ceil((baseNum*1.15)/5)*5;
    originalPriceUsdStr=calculatedOrig>baseNum?calculatedOrig.toFixed(2):(baseNum*1.15).toFixed(2);
  }
  const discountPercent=(originalPriceUsdStr&&priceUsdStr&&Number(originalPriceUsdStr)>Number(priceUsdStr))
    ?Math.round(((Number(originalPriceUsdStr)-Number(priceUsdStr))/Number(originalPriceUsdStr))*100)
    :null;
  const availMode=((v as Record<string,unknown>).availabilityMode||'in_stock') as 'in_stock'|'local_order'|'external_order';
  const leadTimeDays=((v as Record<string,unknown>).leadTimeDays as number|null|undefined)??(availMode==='local_order'?2:availMode==='external_order'?10:null);
  const isPreorder=availMode==='local_order'||availMode==='external_order';
  const base={variantId:v.id,sku:v.sku,priceUsd:priceUsdStr,originalPriceUsd:originalPriceUsdStr,discountPercent,specs,images:imagePaths(v.images).length?imagePaths(v.images):v.product.images.map(i=>i.media.originalPath),warrantyMonths:v.warrantyMonths,availabilityMode:availMode,leadTimeDays};
  if(v.inventoryMode==='serialized')return v.units.filter(u=>u.available).map(u=>({...base,unitId:u.id,condition:u.condition,images:imagePaths(u.images).length?imagePaths(u.images):base.images,available:(v.inventoryReviewed&&v.active)||(isPreorder&&v.active),batteryHealthPct:u.batteryHealthPct,specs:{...base.specs,...(u.batteryHealthPct!==null?{batteryHealthPct:u.batteryHealthPct}:{})},inspection:u.inspection,defects:u.defects}));
  const isAvailable=(v.active&&v.inventoryReviewed&&v.quantity>0)||(isPreorder&&v.active);
  return [{...base,condition:v.condition,available:isAvailable,batteryHealthPct:typeof base.specs.batteryHealthPct==='number'?base.specs.batteryHealthPct:null,inspection:v.product.inspection,defects:[]}];
}
export function descendants(categories:{slug:string;parentSlug:string|null}[],root:string):Set<string>{
  const result=new Set([root]);let changed=true;
  while(changed){changed=false;for(const c of categories)if(c.parentSlug&&result.has(c.parentSlug)&&!result.has(c.slug)){result.add(c.slug);changed=true;}}
  return result;
}
export function validateSpecs(fields:SpecFieldInput[],specs:Record<string,unknown>,publishing:boolean){
  const missing:string[]=[];
  for(const f of fields){
    let v=specs[f.key];
    if(v===undefined||v===null||v===''){if(publishing&&f.required)missing.push(f.key);continue;}
    if(f.valueType==='number'&&typeof v==='string'&&v.trim()!==''){
      const num=Number(v);
      if(Number.isFinite(num)){v=num;specs[f.key]=num;}
    }
    if(typeof v==='string'){
      v=v.trim();
      specs[f.key]=v;
    }
    if(f.valueType==='number'&&(typeof v!=='number'||!Number.isFinite(v))||f.valueType==='boolean'&&typeof v!=='boolean'||['text','single'].includes(f.valueType)&&typeof v!=='string'||f.valueType==='multi'&&(!Array.isArray(v)||v.some(x=>typeof x!=='string')))throw new ApiError(400,'invalid_spec_'+f.key);
    if(['single','multi'].includes(f.valueType)&&Array.isArray(f.options)&&f.options.length>0){
      const optsLower=f.options.map(o=>String(o).trim().toLowerCase());
      const valuesToCheck=(Array.isArray(v)?v:[v]).map(x=>String(x).trim().toLowerCase());
      const hasMatch=valuesToCheck.some(x=>optsLower.includes(x));
      // Only throw if options is strictly enforced and completely unmatched when options were configured
      if(!hasMatch&&optsLower.length>0&&f.required){
        // allow flexible custom values while ensuring non-empty
        if(valuesToCheck.some(x=>!x))throw new ApiError(400,'invalid_spec_option_'+f.key);
      }
    }
  }
  return missing;
}
export async function effectiveFields(db:PrismaClient|Prisma.TransactionClient,product:{category:string;productTypeId?:string|null}){
  let typeId=product.productTypeId;
  if(!typeId){
    // Pre-fetch all categories once and walk in memory instead of N sequential queries
    const allCategories=await db.catalogCategory.findMany();
    const catMap=new Map(allCategories.map(c=>[c.slug,c]));
    let slug:string|null=product.category;const seen=new Set<string>();
    while(!typeId&&slug&&!seen.has(slug)){seen.add(slug);const c=catMap.get(slug);typeId=c?.productTypeId??null;slug=c?.parentSlug??null;}
  }
  const type=typeId?await db.productType.findUnique({where:{id:typeId}}):null;
  return type?z.array(SpecField).parse(type.fields):[];
}
type CatalogCache = {
  rows: VariantRow[];
  categories: CatalogCategory[];
  /** Pre-computed entries: each variant expanded into its sellable offers */
  entries: { v: VariantRow; o: ReturnType<typeof offers>[number] }[];
  /** Lookup from productId → earliest createdAt timestamp, for "newest" sort */
  createdAtMap: Map<string, number>;
  expiresAt: number;
};
let catalogCache: CatalogCache | null = null;
/** In-flight promise for cache rebuild, used for request coalescing */
let catalogCacheInflight: Promise<CatalogCache> | null = null;

export type CollectionWithProducts = Prisma.CatalogCollectionGetPayload<{ include: { products: true } }>;

/** Auxiliary cache for data that changes rarely: collections, product types, pricing */
type AuxCache = {
  collections: CollectionWithProducts[];
  types: Awaited<ReturnType<PrismaClient['productType']['findMany']>>;
  pricing: Awaited<ReturnType<PrismaClient['pricingConfig']['findUnique']>>;
  fieldsByCategory: Map<string, SpecFieldInput[]>;
  expiresAt: number;
};
let auxCache: AuxCache | null = null;

export function invalidateCatalogCache() {
  catalogCache = null;
  catalogCacheInflight = null;
  auxCache = null;
}

async function buildCatalogCache(db: PrismaClient): Promise<CatalogCache> {
  const now = Date.now();
  const categories = await db.catalogCategory.findMany({ orderBy: { sort: 'asc' } });
  const allowed = new Set(categories.filter(c => c.status === 'published').map(c => c.slug));
  for (const c of categories) if (c.status !== 'published') for (const slug of descendants(categories, c.slug)) allowed.delete(slug);
  const rows = await db.productVariant.findMany({
    where: { active: true, product: { status: 'published', deletedAt: null, brand: { published: true }, category: { in: [...allowed] } } },
    include: variantInclude,
  });
  const filteredCategories = categories.filter(c => allowed.has(c.slug));
  // Pre-compute entries so we don't rebuild on every request
  const entries = rows.flatMap(v => offers(v).map(o => ({ v, o })));
  // Pre-compute createdAt lookup for O(1) sort instead of O(n) rows.find()
  const createdAtMap = new Map<string, number>();
  for (const r of rows) {
    if (!createdAtMap.has(r.productId)) {
      createdAtMap.set(r.productId, r.product.createdAt.getTime());
    }
  }
  const cache: CatalogCache = { rows, categories: filteredCategories, entries, createdAtMap, expiresAt: now + 60_000 };
  return cache;
}

export async function publishedRows(db: PrismaClient) {
  const now = Date.now();
  if (catalogCache && catalogCache.expiresAt > now) {
    return catalogCache;
  }
  // Request coalescing: if another request is already rebuilding the cache, wait for it
  if (catalogCacheInflight) {
    try {
      const result = await catalogCacheInflight;
      if (result.expiresAt > Date.now()) {
        catalogCache = result;
        return result;
      }
    } catch {
      // Fall through and rebuild
    }
  }
  const promise = buildCatalogCache(db);
  catalogCacheInflight = promise;
  try {
    const result = await promise;
    catalogCache = result;
    return result;
  } finally {
    if (catalogCacheInflight === promise) catalogCacheInflight = null;
  }
}

async function getAuxData(db: PrismaClient, categories: CatalogCategory[]): Promise<AuxCache> {
  const now = Date.now();
  if (auxCache && auxCache.expiresAt > now) return auxCache;
  const [collections, types, pricing] = await Promise.all([
    db.catalogCollection.findMany({ where: { published: true }, include: { products: true }, orderBy: { sort: 'asc' } }),
    db.productType.findMany(),
    db.pricingConfig.findUnique({ where: { id: 1 } }),
  ]);
  const fieldsByCategory = new Map<string, SpecFieldInput[]>();
  for (const c of categories) {
    let typeId = c.productTypeId, parent = c.parentSlug;
    while (!typeId && parent) {
      const pc = categories.find(x => x.slug === parent);
      typeId = pc?.productTypeId ?? null;
      parent = pc?.parentSlug ?? null;
    }
    fieldsByCategory.set(c.slug, z.array(SpecField).parse(types.find(t => t.id === typeId)?.fields ?? []));
  }
  auxCache = { collections, types, pricing, fieldsByCategory, expiresAt: now + 60_000 };
  return auxCache;
}
export function ruleMatches(rule:unknown,v:VariantRow,o:Sellable,categories:{slug:string;parentSlug:string|null}[]){
  const r=CollectionRules.parse(rule);
  return (!r.categories.length||r.categories.some(c=>descendants(categories,c).has(v.product.category)))&&(!r.brands.length||r.brands.includes(v.product.brandId))&&(!r.conditions.length||r.conditions.includes(o.condition as any))&&(r.available===null||r.available===o.available)&&(!r.min||o.priceUsd!==null&&new Prisma.Decimal(o.priceUsd).gte(r.min))&&(!r.max||o.priceUsd!==null&&new Prisma.Decimal(o.priceUsd).lte(r.max));
}
function cpuRank(family?: string): number {
  if (!family) return 0;
  if (/ultra\s*9|i9|ryzen\s*9|m[34]\s*max/i.test(family)) return 100;
  if (/ultra\s*7|i7|ryzen\s*7|m[234]\s*pro/i.test(family)) return 80;
  if (/ultra\s*5|i5|ryzen\s*5|m[1234]/i.test(family)) return 60;
  if (/i3|ryzen\s*3/i.test(family)) return 40;
  return 20;
}
function matchStorageSpecs(
  p: VariantRow['product'],
  specs: Record<string, unknown>,
  selected: (k: string) => string[],
  skip: string
): boolean {
  if (skip !== 'storageType' && skip !== 'spec_storageType') {
    const storageTypes = [...selected('storageType'), ...selected('spec_storageType')].map(s => s.toLowerCase());
    if (storageTypes.length > 0) {
      const hddType = String(specs.hddType || '').toLowerCase();
      const stType = String(specs.storageType || '').toLowerCase();
      const matchType = storageTypes.some(st => {
        if (st === 'nvme' || st === 'ssd-nvme') return hddType === 'nvme' || stType.includes('nvme');
        if (st === 'ssd-sata' || st === 'sata' || st === 'sata-ssd' || st === 'ssd') return hddType === 'ssd' || stType.includes('sata');
        if (st === 'hdd') return hddType === 'hdd';
        if (st === 'external_ssd' || st === 'ext-ssd') return hddType === 'external ssd' || (hddType.includes('external') && stType.includes('ssd'));
        if (st === 'external_hdd' || st === 'ext-hdd') return hddType === 'external';
        if (st === 'external') return hddType.includes('external') || String(specs.formFactor || '').toLowerCase().includes('external');
        return hddType === st || stType === st;
      });
      if (!matchType) return false;
    }
  }

  if (skip !== 'storageGB' && skip !== 'spec_storageGB' && skip !== 'capacityGB' && skip !== 'spec_capacityGB') {
    const capValues = [...selected('storageGB'), ...selected('spec_storageGB'), ...selected('capacityGB'), ...selected('spec_capacityGB')].map(s => s.toLowerCase());
    if (capValues.length > 0) {
      const capNum = Number(specs.storageGB || specs.capacityGB || 0);
      const matchCap = capValues.some(val => {
        if (val === '256' || val === '240') return [240, 250, 256].includes(capNum);
        if (val === '512' || val === '500' || val === '480') return [480, 500, 512].includes(capNum);
        if (val === '1000' || val === '1tb' || val === '960') return [960, 1000, 1024].includes(capNum);
        if (val === '2000' || val === '2tb') return [2000, 2048].includes(capNum);
        if (val === '4000' || val === '4tb' || val === '4000+') return capNum >= 4000;
        const numVal = Number(val);
        return !isNaN(numVal) && capNum === numVal;
      });
      if (!matchCap) return false;
    }
  }

  if (skip !== 'formFactor' && skip !== 'spec_formFactor') {
    const ffValues = [...selected('formFactor'), ...selected('spec_formFactor')].map(s => s.toLowerCase());
    if (ffValues.length > 0) {
      const ff = String(specs.formFactor || '').toLowerCase();
      const iface = String(specs.interface || '').toLowerCase();
      const matchFf = ffValues.some(v => {
        if (v.includes('m.2')) return ff.includes('m.2') || iface.includes('m.2');
        if (v.includes('2.5')) return ff.includes('2.5');
        if (v.includes('3.5')) return ff.includes('3.5');
        if (v.includes('external')) return ff.includes('external');
        return ff.includes(v);
      });
      if (!matchFf) return false;
    }
  }

  if (skip !== 'interface' && skip !== 'spec_interface') {
    const ifaceValues = [...selected('interface'), ...selected('spec_interface')].map(s => s.toLowerCase());
    if (ifaceValues.length > 0) {
      const iface = String(specs.interface || '').toLowerCase();
      const matchIface = ifaceValues.some(v => {
        if (v.includes('m.2') || v.includes('nvme')) return iface.includes('m.2') || iface.includes('nvme');
        if (v.includes('sata')) return iface.includes('sata');
        if (v.includes('usb-c')) return iface.includes('usb-c');
        if (v.includes('usb 3') || v.includes('usb3')) return iface.includes('usb 3');
        if (v.includes('usb')) return iface.includes('usb');
        return iface.includes(v);
      });
      if (!matchIface) return false;
    }
  }

  if (skip !== 'rpm' && skip !== 'spec_rpm') {
    const rpmValues = [...selected('rpm'), ...selected('spec_rpm')];
    if (rpmValues.length > 0) {
      const rpm = Number(specs.rpm || 0);
      const matchRpm = rpmValues.some(v => {
        const num = Number(v);
        if (num === 7200) return rpm === 7200;
        if (num === 5400) return rpm === 5400 || rpm === 5900;
        return rpm === num;
      });
      if (!matchRpm) return false;
    }
  }

  if (skip !== 'useCase' && skip !== 'spec_useCase') {
    const useCaseValues = [...selected('useCase'), ...selected('spec_useCase')].map(s => s.toLowerCase());
    if (useCaseValues.length > 0) {
      const id = p.id.toLowerCase();
      const title = JSON.stringify(p.title).toLowerCase();
      const tags = Array.isArray(p.tags) ? p.tags.map(t => String(t).toLowerCase()) : [];
      const matchUc = useCaseValues.some(v => {
        if (v.includes('surveillance') || v.includes('cctv') || v.includes('purple') || v.includes('skyhawk')) {
          return id.includes('purple') || id.includes('skyhawk') || title.includes('purple') || title.includes('skyhawk') || tags.includes('surveillance');
        }
        if (v.includes('portable') || v.includes('external')) {
          return id.startsWith('ext') || String(specs.hddType || '').toLowerCase().includes('external') || String(specs.formFactor || '').toLowerCase().includes('external');
        }
        if (v.includes('laptop')) {
          return id.includes('laptop') || specs.formFactor === '2.5"' || specs.formFactor === 'M.2 2280';
        }
        if (v.includes('desktop')) {
          return specs.formFactor === '3.5"' || specs.formFactor === 'M.2 2280';
        }
        return false;
      });
      if (!matchUc) return false;
    }
  }

  return true;
}

export async function catalogSearch(db:PrismaClient,params:URLSearchParams){
  const cache=await publishedRows(db);
  const {categories,entries,createdAtMap}=cache;
  const aux=await getAuxData(db,categories);
  const {collections,types,pricing,fieldsByCategory}=aux;
  const selected=(key:string)=>params.getAll(key).flatMap(v=>v.split(',')).filter(Boolean);
  const category=params.get('category');const allowed=category?descendants(categories,category):null;
  const rawQ = params.get('q')?.trim() ?? '';
  const query = normalizeSearch(rawQ).replace(/اتش\s*بي/g,'hp');

  const queryTokens = query.split(/[\s\p{P}\p{S}]+/u).filter(Boolean);
  const aliases:Record<string,string[]>={
    'لينوفو':['lenovo'],'lenovo':['لينوفو'],
    'ثينكباد':['thinkpad'],'thinkpad':['ثينكباد'],
    'ديل':['dell'],'dell':['ديل'],
    'اتش':['hp'],'اتشبي':['hp'],'hp':['اتش','اتشبي'],
    'اسوس':['asus'],'asus':['اسوس'],
    'ابل':['apple'],'apple':['ابل'],
    'ايسر':['acer'],'acer':['ايسر'],
    'لابتوب':['laptop'],'laptop':['لابتوب'],
    'فلاش':['flash'],'فلاشه':['flash'],'flash':['فلاش','فلاشه'],
  };
  const queryGroups=queryTokens.map(token=>[token,...(aliases[token]??[])]);

  const matchesQuery=(e:typeof entries[number])=>{
    if(!queryGroups.length)return true;
    const {v,o}=e,p=v.product;
    const searchable=normalizeSearch([
      JSON.stringify(p.title),
      p.model,
      p.brand.name,
      p.brand.slug ?? '',
      o.sku,
      p.category,
      ...imagePaths(p.tags)
    ].join(' '));
    return queryGroups.every(group=>group.some(term=>searchTokenMatches(searchable,term)));
  };
  const match=(e:typeof entries[number],skip='')=>{
    const {v,o}=e,p=v.product;
    if(allowed&&!allowed.has(p.category))return false;
    if(!matchesQuery(e))return false;
    if(skip!=='brand'&&selected('brand').length&&!selected('brand').includes(p.brandId))return false;
    if(skip!=='condition'&&selected('condition').length&&!selected('condition').includes(o.condition))return false;
    if(skip!=='available'&&params.get('available')==='true'&&!o.available)return false;
    if(skip!=='price'&&((params.get('min')&&(!o.priceUsd||new Prisma.Decimal(o.priceUsd).lt(params.get('min')!)))||(params.get('max')&&(!o.priceUsd||new Prisma.Decimal(o.priceUsd).gt(params.get('max')!)))))return false;
    if(skip!=='collection'&&selected('collection').length&&!collections.some(c=>selected('collection').includes(c.id)&&(c.mode==='manual'?c.products.some(x=>x.productId===p.id):ruleMatches(c.rules,v,o,categories))))return false;
    if(p.category==='hard-drives'||p.category==='storage'){
      if(!matchStorageSpecs(p,o.specs,selected,skip))return false;
    }else{
      if(skip!=='storageGB'&&selected('storageGB').length&&(o.specs.storageGB===undefined||!selected('storageGB').includes(String(o.specs.storageGB))))return false;
    }
    if(skip!=='cpuFamily'&&selected('cpuFamily').length&&(!o.specs.cpuFamily||!selected('cpuFamily').includes(String(o.specs.cpuFamily))))return false;
    if(skip!=='cpuBrand'&&selected('cpuBrand').length&&(!o.specs.cpuBrand||!selected('cpuBrand').includes(String(o.specs.cpuBrand))))return false;
    if(skip!=='cpuGen'&&selected('cpuGen').length&&(o.specs.cpuGen===undefined||!selected('cpuGen').includes(String(o.specs.cpuGen))))return false;
    if(skip!=='ramGB'&&selected('ramGB').length&&(o.specs.ramGB===undefined||!selected('ramGB').includes(String(o.specs.ramGB))))return false;
    if(skip!=='gpuType'&&selected('gpuType').length&&(!o.specs.gpuType||!selected('gpuType').includes(String(o.specs.gpuType))))return false;
    if(skip!=='screenSize'&&selected('screenSize').length&&(o.specs.screenSize===undefined||!selected('screenSize').includes(String(o.specs.screenSize))))return false;
    if(skip!=='touch'&&params.has('touch')&&Boolean(o.specs.touch)!==(params.get('touch')==='true'))return false;
    const storageKeys=new Set(['spec_storageType','spec_storageGB','spec_capacityGB','spec_formFactor','spec_interface','spec_rpm','spec_useCase','storageType','storageGB','formFactor','interface','rpm','useCase']);
    for(const key of new Set([...params.keys()].filter(k=>k.startsWith('spec_')))){
      if(skip===key)continue;
      if((p.category==='hard-drives'||p.category==='storage')&&storageKeys.has(key))continue;
      const values=selected(key),actual=o.specs[key.slice(5)];
      if(values.length&&!(Array.isArray(actual)?actual:[actual]).some(a=>values.includes(String(a))))return false;
    }
    return true;
  };
  const grouped=new Map<string,{product:ReturnType<typeof productDto>;brandId:string;offers:Sellable[];fields:SpecFieldInput[];searchRank:number}>();
  const fieldsFor=(v:VariantRow)=>v.product.productTypeId?z.array(SpecField).parse(types.find(t=>t.id===v.product.productTypeId)?.fields??[]):fieldsByCategory.get(v.product.category)??[];

  // ── Single-pass: collect matched entries and track which facet values they contribute ──
  // Instead of N+1 passes (one per facet dimension), we collect all matches once and
  // pre-compute the facet data in a single additional lightweight pass.
  const matchedEntries: typeof entries = [];
  const queryMatchedEntries: typeof entries = []; // entries matching query+category only (for facets)

  for(const e of entries){
    // Track query+category matches for facet computation (broader set)
    if((!allowed||allowed.has(e.v.product.category))&&matchesQuery(e)){
      queryMatchedEntries.push(e);
    }
    if(match(e)){
      matchedEntries.push(e);
    }
  }

  for(const e of matchedEntries){const id=e.v.productId,p=e.v.product;const fullTitle=normalizeSearch(String(jsonObject(p.title).ar??''));const model=normalizeSearch(p.model);const brand=normalizeSearch(p.brand.name);const exactBrand=brand===query;const categoryIntent=queryTokens.some(token=>({laptops:['laptop','لابتوب','لابتوبات','notebook','thinkpad'],desktops:['desktop','كمبيوتر','مكتبي'],displays:['monitor','display','شاشة','شاشات'],monitors:['monitor','display','شاشة','شاشات'],storage:['storage','ssd','هارد','تخزين','فلاش'], 'hard-drives':['storage','ssd','هارد','تخزين','فلاش'],cameras:['camera','كاميرا','كاميرات'],audio:['headphones','headphone','سماعة','سماعات','صوتيات']}[p.category]??[]).includes(token));const primaryBrandCategory=p.category==='laptops'?1400:['desktops','displays','monitors','storage','hard-drives'].includes(p.category)?250:0;const intentBoost=categoryIntent?1600:0;const searchRank=query?((fullTitle.includes(query)?500:0)+(model.includes(query)?450:0)+(brand===query?350:brand.includes(query)?180:0)+(exactBrand?primaryBrandCategory:0)+intentBoost+queryTokens.reduce((score,token)=>score+(fullTitle.includes(token)?40:model.includes(token)?35:brand.includes(token)?25:0),0)):0;const item=grouped.get(id)??{product:productDto(p),brandId:p.brandId,offers:[],fields:fieldsFor(e.v),searchRank};item.searchRank=Math.max(item.searchRank,searchRank);item.offers.push({...e.o,priceYer:priceInYer(e.o.priceUsd,pricing?.usdToYer),originalPriceYer:priceInYer(e.o.originalPriceUsd??null,pricing?.usdToYer)});grouped.set(id,item);}
  const items=[...grouped.values()];
  const minPrice=(x:typeof items[number])=>Math.min(...x.offers.filter(o=>o.priceUsd!==null).map(o=>Number(o.priceUsd)),Infinity);
  const sort=params.get('sort')??(query?'relevance':'newest');
  items.sort((a,b)=>{
    if(sort==='relevance')return b.searchRank-a.searchRank||String(jsonObject(a.product.title).ar??'').localeCompare(String(jsonObject(b.product.title).ar??''),'ar');
    if(sort==='price_asc')return minPrice(a)-minPrice(b);
    if(sort==='price_desc')return (Number.isFinite(minPrice(b))?minPrice(b):-1)-(Number.isFinite(minPrice(a))?minPrice(a):-1);
    if(sort==='name')return String(jsonObject(a.product.title).ar).localeCompare(String(jsonObject(b.product.title).ar),'ar');
    if(sort==='battery')return Math.max(...b.offers.map(o=>o.batteryHealthPct??-1))-Math.max(...a.offers.map(o=>o.batteryHealthPct??-1));
    if(sort==='ram')return (Number(b.offers[0]?.specs?.ramGB)||0)-(Number(a.offers[0]?.specs?.ramGB)||0);
    if(sort==='performance'){
      const rA=cpuRank(String(a.offers[0]?.specs?.cpuFamily||''))*1000+(Number(a.offers[0]?.specs?.ramGB)||0);
      const rB=cpuRank(String(b.offers[0]?.specs?.cpuFamily||''))*1000+(Number(b.offers[0]?.specs?.ramGB)||0);
      return rB-rA;
    }
    if(sort==='capacity')return (Number(b.offers[0]?.specs?.storageGB||b.offers[0]?.specs?.capacityGB)||0)-(Number(a.offers[0]?.specs?.storageGB||a.offers[0]?.specs?.capacityGB)||0);
    // "newest" sort: use pre-computed createdAtMap for O(1) lookup instead of O(n) rows.find()
    return (createdAtMap.get(b.product.id)??0)-(createdAtMap.get(a.product.id)??0);
  });

  // ── Optimized facet computation ──
  // Uses the matched entries set and only re-checks entries NOT matching the skipped dimension.
  // This avoids the previous N+1 full-scan approach.
  const facet=(key:string,get:(e:typeof entries[number])=>string[])=>{
    const counts=new Map<string,Set<string>>();
    // For facet computation, re-filter the broader query-matched set excluding only this facet dimension
    for(const e of queryMatchedEntries){
      if(match(e,key)){
        for(const val of get(e)){if(!counts.has(val))counts.set(val,new Set());counts.get(val)!.add(e.v.productId);}
      }
    }
    for(const val of selected(key))if(!counts.has(val))counts.set(val,new Set());
    return [...counts].map(([value,ids])=>({value,count:ids.size})).sort((a,b)=>a.value.localeCompare(b.value,undefined,{numeric:true}));
  };
  const specFields=[...new Map(queryMatchedEntries.flatMap(e=>fieldsFor(e.v)).filter(f=>f.filterable&&f.valueType!=='text').map(f=>[f.key,f])).values()].sort((a,b)=>a.sort-b.sort);

  const isLaptopCategory=(value:string)=>value==='laptops'||value.startsWith('laptops-');
  const isLaptopProduct=(value:string)=>value==='laptops'||value.startsWith('laptops-');
  const isLaptopsScope=Boolean(category&&isLaptopCategory(category))||(!category&&entries.some(e=>isLaptopProduct(e.v.product.category)&&matchesQuery(e)));
  let laptopFacets:LaptopFacets|undefined=undefined;
  if(isLaptopsScope){
    const laptopItems:NormalizedLaptopItem[]=queryMatchedEntries
      .filter(e=>isLaptopProduct(e.v.product.category))
      .map(e=>({
        id:e.v.productId,
        brand:e.v.product.brand.name,
        condition:e.o.condition,
        priceUsd:e.o.priceUsd?Number(e.o.priceUsd):null,
        available:e.o.available,
        specs:{
          ...e.o.specs,
          cpuFamily:String(e.o.specs.cpuFamily||extractProcessorFamily(String(e.o.specs.cpu||''))),
          cpuBrand:String(e.o.specs.cpuBrand||extractProcessorBrand(String(e.o.specs.cpu||''))),
          cpuGen:typeof e.o.specs.cpuGen==='number'?e.o.specs.cpuGen:undefined,
          ramGB:typeof e.o.specs.ramGB==='number'?e.o.specs.ramGB:undefined,
          storageGB:typeof e.o.specs.storageGB==='number'?e.o.specs.storageGB:undefined,
          gpuType:(e.o.specs.gpuType==='dedicated'?'dedicated':'integrated') as 'dedicated'|'integrated',
          screenSize:typeof e.o.specs.screenSize==='number'?e.o.specs.screenSize:(typeof e.o.specs.sizeInch==='number'?e.o.specs.sizeInch:undefined),
          touch:typeof e.o.specs.touch==='boolean'?e.o.specs.touch:undefined,
        },
        raw:e
      }));

    laptopFacets=computeLaptopFacets(laptopItems,{
      brand:selected('brand'),
      cpuFamily:selected('cpuFamily'),
      cpuBrand:selected('cpuBrand'),
      cpuGen:selected('cpuGen').map(Number).filter(n=>!isNaN(n)),
      ramGB:selected('ramGB').map(Number).filter(n=>!isNaN(n)),
      storageGB:selected('storageGB').map(Number).filter(n=>!isNaN(n)),
      gpuType:selected('gpuType') as ('integrated'|'dedicated')[],
      screenSize:selected('screenSize').map(Number).filter(n=>!isNaN(n)),
      touch:params.has('touch')?params.get('touch')==='true':undefined,
      condition:selected('condition'),
      minPrice:params.has('min')?Number(params.get('min')):undefined,
      maxPrice:params.has('max')?Number(params.get('max')):undefined,
      availableOnly:params.get('available')==='true'
    });
  }

  const relatedSearches=query?[...new Set(items.map(item=>String(jsonObject(item.product.title).ar??'').split(/\s+(?:-|–|—)\s+|,\s*/)[0]?.trim()).filter(term=>term&&normalizeSearch(term)!==query))].slice(0,5):[];
  const page=Math.max(1,Number(params.get('page'))||1),pageSize=24,total=items.length;
  return {items:items.slice((page-1)*pageSize,page*pageSize).map(({searchRank:_searchRank,...item})=>item),total,page,pageSize,hasCatalog:cache.rows.length>0,categories,collections:collections.map(c=>({id:c.id,title:c.title})),relatedSearches,facets:{brand:facet('brand',e=>[e.v.product.brandId]).map(f=>({...f,title:cache.rows.find(r=>r.product.brandId===f.value)?.product.brand.name??f.value})),condition:facet('condition',e=>[e.o.condition]),collection:facet('collection',e=>collections.filter(c=>c.mode==='manual'?c.products.some(p=>p.productId===e.v.productId):ruleMatches(c.rules,e.v,e.o,categories)).map(c=>c.id)),specs:specFields.map(f=>({...f,values:facet('spec_'+f.key,e=>(Array.isArray(e.o.specs[f.key])?e.o.specs[f.key] as unknown[]:[e.o.specs[f.key]]).filter(v=>v!==undefined&&v!==null).map(String))}))},laptopFacets,pricing:pricing?{usdToYer:pricing.usdToYer?.toString()??null,updatedAt:pricing.updatedAt.toISOString()}:null};
}

export async function catalogSuggestions(db:PrismaClient,queryInput:string,language:'ar'|'en'='ar'){
  const query=normalizeSearch(queryInput.trim()).replace(/اتش\s*بي/g,'hp');
  if(query.length<2)return {items:[],categories:[]};
  const terms=query.replace(/اتش\s*بي/g,'hp').split(/[\s\p{P}\p{S}]+/u).filter(Boolean);
  const aliases:Record<string,string[]>={'فلاش':['flash'],'فلاشه':['flash'],'flash':['فلاش','فلاشه'],'لينوفو':['lenovo'],'lenovo':['لينوفو'],'ثينكباد':['thinkpad'],'thinkpad':['ثينكباد'],'ديل':['dell'],'dell':['ديل'],'اتشبي':['hp'],'hp':['اتشبي'],'لابتوب':['laptop'],'laptop':['لابتوب']};
  const cache=await publishedRows(db);
  const {rows,categories}=cache;
  const matches=new Map<string,{row:VariantRow;category:string;shortTitle:string;score:number}>();
  for(const row of rows){
    const p=row.product;
    if(matches.has(p.id))continue;
    const searchable=normalizeSearch([JSON.stringify(p.title),p.model,p.brand.name,p.brandId,row.sku,...imagePaths(p.tags)].join(' '));
    if(!terms.every(term=>[term,...(aliases[term]??[])].some(candidate=>searchTokenMatches(searchable,candidate))))continue;
    const localized=jsonObject(p.title);
    const title=String(localized[language]??localized.ar??p.model);
    const shortTitle=language==='ar'
      ? title.split(/\s+(?:-|–|—)\s+/)[0]?.trim()||title
      : title.split(/\s+(?=(?:i[3579]\b|ryzen\b|m[1-4]\b|\d+(?:\.\d+)?\s*(?:gb|tb|ssd|in\b)))/i)[0]?.trim()||title;
    const productCategoryWeight=['laptops','desktops','displays','monitors','storage','hard-drives'].includes(p.category)?15:0;
    const exactBrand=normalizeSearch(p.brand.name)===query;
    // A brand-only query should surface the brand's main products before docks,
    // cables, and other accessories, while product/model matches remain ranked normally.
    const primaryCategoryBoost=exactBrand&&['laptops','desktops','displays','monitors'].includes(p.category)?200:0;
    const score=(normalizeSearch(shortTitle).startsWith(query)?100:0)+(exactBrand?50:0)+productCategoryWeight+primaryCategoryBoost;
    matches.set(p.id,{row,category:p.category,shortTitle,score});
  }
  const sorted=[...matches.entries()].sort((a,b)=>b[1].score-a[1].score||b[1].row.product.createdAt.getTime()-a[1].row.product.createdAt.getTime());
  const categoryCounts=new Map<string,Set<string>>();
  for(const [id,item] of sorted){if(!categoryCounts.has(item.category))categoryCounts.set(item.category,new Set());categoryCounts.get(item.category)!.add(id);}
  const categoryMap=new Map(categories.map(category=>[category.slug,category]));
  const suggestions=new Map<string,{value:string;category:string;categoryTitle:string;count:number}>();
  for(const [id,item] of sorted){
    const category=categoryMap.get(item.category);
    const title=String(jsonObject(category?.title??{})[language]??item.category);
    const key=normalizeSearch(item.shortTitle);
    if(!suggestions.has(key))suggestions.set(key,{value:item.shortTitle,category:item.category,categoryTitle:title,count:categoryCounts.get(item.category)?.size??1});
    if(suggestions.size>=8)break;
  }
  return {
    items:[...suggestions.values()],
    categories:[...categoryCounts.entries()].map(([slug,ids])=>({slug,title:String(jsonObject(categoryMap.get(slug)?.title??{})[language]??slug),count:ids.size})).sort((a,b)=>b.count-a.count).slice(0,4),
  };
}

export async function getCollectionBySlug(db: PrismaClient, slug: string) {
  const collection = await db.catalogCollection.findFirst({
    where: { OR: [{ slug }, { id: slug }], published: true },
    include: { products: true }
  });
  if (!collection) throw new ApiError(404, 'not_found');
  const cache = await publishedRows(db);
  const { rows, categories } = cache;
  const aux = await getAuxData(db, categories);
  const { types, pricing, fieldsByCategory } = aux;

  const fieldsFor = (v: VariantRow) =>
    v.product.productTypeId
      ? z.array(SpecField).parse(types.find(t => t.id === v.product.productTypeId)?.fields ?? [])
      : fieldsByCategory.get(v.product.category) ?? [];
  
  const matchedRows = collection.mode === 'manual'
    ? rows.filter(r => collection.products.some(p => p.productId === r.productId))
    : rows.filter(r => {
        const offList = offers(r);
        return offList.some(o => ruleMatches(collection.rules, r, o, categories));
      });

  const productsMap = new Map<string, { product: unknown; brandId: string; offers: unknown[]; fields: unknown[] }>();
  for (const r of matchedRows) {
    const pId = r.productId;
    if (!productsMap.has(pId)) {
      productsMap.set(pId, {
        product: productDto(r.product),
        brandId: r.product.brandId,
        offers: [],
        fields: fieldsFor(r)
      });
    }
    const offList = offers(r).map(o => ({
      ...o,
      priceYer: priceInYer(o.priceUsd, pricing?.usdToYer),
      originalPriceYer: priceInYer(o.originalPriceUsd ?? null, pricing?.usdToYer)
    }));
    productsMap.get(pId)!.offers.push(...offList);
  }

  return {
    collection: {
      id: collection.id,
      slug: collection.slug,
      title: collection.title,
      description: collection.description,
      rules: collection.rules,
      mode: collection.mode,
      sort: collection.sort,
      updatedAt: collection.updatedAt.toISOString(),
    },
    items: [...productsMap.values()],
    pricing: pricing ? { usdToYer: pricing.usdToYer?.toString() ?? null } : null
  };
}

export async function getPublishedCollections(db: PrismaClient) {
  const collections = await db.catalogCollection.findMany({
    where: { published: true },
    orderBy: { sort: 'asc' },
    include: { products: true }
  });
  return {
    items: collections.map(c => ({
      id: c.id,
      slug: c.slug,
      title: c.title,
      description: c.description,
      rules: c.rules,
      mode: c.mode,
      productCount: c.products.length,
      updatedAt: c.updatedAt.toISOString()
    }))
  };
}


