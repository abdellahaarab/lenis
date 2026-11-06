import {beforeAll,afterAll,it,expect} from 'vitest';
import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import mariadb,{type Connection} from 'mariadb';
import type {FastifyInstance,LightMyRequestResponse} from 'fastify';
import {type PrismaClient} from '@prisma/client';
import {buildApp} from '../src/app.js';
import {ConfigSchema} from '../src/config.js';
import {createDb} from '../src/db.js';
import {hashPassword,hashToken,randomToken} from '../src/security.js';

const url=new URL(process.env.TEST_DATABASE_URL??'mysql://missing@127.0.0.1:3306/missing');
if(!['127.0.0.1','localhost'].includes(url.hostname)||!process.env.TEST_DATABASE_URL)throw new Error('Local TEST_DATABASE_URL required');
const namespace='crud_test_'+randomUUID().replaceAll('-',''),config=ConfigSchema.parse({NODE_ENV:'test',DATABASE_URL:url.toString(),SESSION_SECRET:randomToken(),TOTP_ENCRYPTION_KEY:'a'.repeat(64),ALLOWED_ORIGINS:'http://localhost:5174',LOG_LEVEL:'silent'});
let app:FastifyInstance,db:PrismaClient,sql:Connection,passwordHash:string;

type Browser={cookies:Map<string,string>;csrf:string;call:(path:string,method?:string,body?:unknown)=>Promise<LightMyRequestResponse>};
function browser(prefix='/api/shop'):Browser{const client:Browser={cookies:new Map(),csrf:'',async call(path,method='GET',body){const r=await app.inject({url:prefix+path,method:method as 'GET'|'POST'|'PATCH'|'DELETE',headers:{origin:'http://localhost:5174',cookie:[...client.cookies].map(([k,v])=>k+'='+v).join('; '),'x-csrf-token':client.csrf,...(body!==undefined?{'content-type':'application/json'}:{})},...(body!==undefined?{payload:JSON.stringify(body)}: {})});for(const c of r.cookies){if(c.value)client.cookies.set(c.name,c.value);else client.cookies.delete(c.name);}if(r.headers['content-type']?.includes('json')&&r.json().csrfToken)client.csrf=r.json().csrfToken;return r;}};return client;}

async function staff(role:'owner'|'sales'|'editor'='owner'){
  const user=await db.user.create({data:{email:randomUUID()+'@example.test',name:'Test staff',passwordHash,role,mustChangePassword:false}}),client=browser('/api/admin');await client.call('/auth/csrf');const raw=randomToken();await db.session.create({data:{id:hashToken(raw),userId:user.id,expiresAt:new Date(Date.now()+3600000),userAgent:'test',ipHash:'a'.repeat(64)}});client.cookies.set('aljeel_session',raw);return client;
}

beforeAll(async()=>{
  sql=await mariadb.createConnection({host:url.hostname,port:Number(url.port||3306),user:decodeURIComponent(url.username),password:decodeURIComponent(url.password),allowPublicKeyRetrieval:true});
  await sql.query('CREATE DATABASE '+namespace+' CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');await sql.query('USE '+namespace);
  for(const folder of ['202610030001_mysql','202610030002_checks','202610030003_commerce','202610030004_commerce_integrity','202610030005_commerce_checks','202610030006_contest']){const text=await readFile(new URL('../prisma/mysql-migrations/'+folder+'/migration.sql',import.meta.url),'utf8');for(const stmt of text.split(';').map(s=>s.trim()).filter(Boolean)){for(let attempt=0;;attempt++){try{await sql.query(stmt);break;}catch(error){if((error as {code:string}).code!=='ER_ERROR_ON_RENAME'||attempt>=5)throw error;await new Promise(resolve=>setTimeout(resolve,500));}}}}
  url.pathname='/'+namespace;db=createDb(url.toString());passwordHash=await hashPassword(randomToken());app=await buildApp(config,db,{disableRateLimits:true});await app.ready();
},60000);

afterAll(async()=>{if(app)await app.close();if(db)await db.$disconnect();if(sql){await sql.query('DROP DATABASE IF EXISTS '+namespace);await sql.end();}});

it('handles full lifecycle (create, update, delete) for Categories', async()=>{
  const admin = await staff();
  const slug = 'cat-test-' + randomUUID();
  // Create
  const createRes = await admin.call('/commerce/categories', 'POST', {
    slug,
    title: { ar: 'فئة جديدة', en: 'New Category' },
    description: { ar: 'وصف', en: 'Description' },
    parentSlug: null,
    productTypeId: null,
    imageId: null,
    status: 'draft',
    sort: 1
  });
  expect(createRes.statusCode).toBe(200);

  // Update without revision requirement
  const updateRes = await admin.call('/commerce/categories', 'POST', {
    slug,
    title: { ar: 'فئة معدلة', en: 'Updated Category' },
    description: { ar: 'وصف معدل', en: 'Updated Description' },
    parentSlug: null,
    productTypeId: null,
    imageId: null,
    status: 'published',
    sort: 2
  });
  expect(updateRes.statusCode).toBe(200);

  // Delete
  const delRes = await admin.call('/commerce/categories/' + slug, 'DELETE');
  expect(delRes.statusCode).toBe(200);
  expect(delRes.json().ok).toBe(true);

  // Verify deleted from db
  const found = await db.catalogCategory.findUnique({ where: { slug } });
  expect(found).toBeNull();
});

it('handles full lifecycle (create, update, delete) for Brands', async()=>{
  const admin = await staff();
  const id = 'brand-test-' + randomUUID().toLowerCase().replace(/[^a-z0-9]/g, '');
  // Create
  const createRes = await admin.call('/brands', 'POST', {
    id,
    name: 'Brand Test',
    logoMediaId: null,
    description: { ar: 'علامة جديدة', en: 'New Brand' },
    categories: [],
    published: true,
    sort: 1
  });
  expect(createRes.statusCode).toBe(200);

  // Update
  const updateRes = await admin.call('/brands', 'POST', {
    id,
    name: 'Brand Test Updated',
    logoMediaId: null,
    description: { ar: 'علامة معدلة', en: 'Updated Brand' },
    categories: [],
    published: false,
    sort: 2
  });
  expect(updateRes.statusCode).toBe(200);

  // Delete
  const delRes = await admin.call('/brands/' + id, 'DELETE');
  expect(delRes.statusCode).toBe(200);
  expect(delRes.json().ok).toBe(true);

  const found = await db.brand.findUnique({ where: { id } });
  expect(found).toBeNull();
});

it('handles full lifecycle (create, update, delete) for Products', async()=>{
  const admin = await staff();
  const id = 'p' + randomUUID().toLowerCase().replace(/[^a-z0-9]/g, '');
  const brand = await db.brand.create({
    data: { id: 'b-' + id, slug: 'b-' + id, name: 'Brand P', published: true, description: {} }
  });
  const cat = await db.catalogCategory.create({
    data: { slug: 'c-' + id, title: { ar: 'فئة', en: 'Cat' }, description: {} }
  });

  // Create Product
  const createRes = await admin.call('/products', 'POST', {
    id,
    slug: 'slug-' + id,
    model: 'Model-' + id,
    brandId: brand.id,
    brand: brand.name,
    category: cat.slug,
    title: { ar: 'منتج اختبار', en: 'Product Test' },
    summary: { ar: 'ملخص', en: 'Summary' },
    condition: 'A',
    specs: {},
    specSources: [],
    inspection: { passed: true, date: null, notes: { ar: '', en: '' } },
    bestFor: [],
    tags: [],
    compatibleWith: [],
    price: { usd: '100.00', yer: null, updatedAt: null, negotiable: false },
    warrantyMonths: 12,
    status: 'draft',
    stock: 'order',
    images: []
  });
  expect(createRes.statusCode).toBe(201);

  // Update Product via PATCH /products/:id
  const updateRes = await admin.call('/products/' + id, 'PATCH', {
    id,
    slug: 'slug-' + id,
    model: 'Model-' + id,
    brandId: brand.id,
    brand: brand.name,
    category: cat.slug,
    title: { ar: 'منتج معدل', en: 'Updated Product Test' },
    summary: { ar: 'ملخص معدل', en: 'Updated Summary' },
    condition: 'A',
    specs: {},
    specSources: [],
    inspection: { passed: true, date: null, notes: { ar: '', en: '' } },
    bestFor: [],
    tags: [],
    compatibleWith: [],
    price: { usd: '120.00', yer: null, updatedAt: null, negotiable: false },
    warrantyMonths: 12,
    status: 'draft',
    stock: 'order',
    images: []
  });
  expect(updateRes.statusCode).toBe(200);

  // Delete Product
  const delRes = await admin.call('/products/' + id, 'DELETE');
  if (delRes.statusCode !== 200) {
    console.error('DELETE FAILED:', delRes.statusCode, delRes.body);
  }
  expect(delRes.statusCode).toBe(200);
  expect(delRes.json().ok).toBe(true);

  const found = await db.product.findUnique({ where: { id } });
  expect(found).toBeNull();
});

it('handles full lifecycle (create, update, delete) for Product Types, Packages and Collections', async()=>{
  const admin = await staff();
  const typeId = randomUUID();
  // Product Type
  const typeCreate = await admin.call('/commerce/types', 'POST', {
    id: typeId,
    title: { ar: 'نوع اختبار', en: 'Type Test' },
    fields: []
  });
  expect(typeCreate.statusCode).toBe(200);

  const typeDel = await admin.call('/commerce/types/' + typeId, 'DELETE');
  expect(typeDel.statusCode).toBe(200);
  expect(typeDel.json().ok).toBe(true);

  // Fixture variant for package item
  const catSlug = 'cat-pkg-' + randomUUID();
  const brandId = 'brand-pkg-' + randomUUID();
  await db.brand.create({ data: { id: brandId, slug: brandId, name: 'Brand Pkg', published: true, description: {} } });
  await db.catalogCategory.create({ data: { slug: catSlug, title: { ar: 'فئة', en: 'Cat' }, description: {} } });
  const prodId = 'prod-pkg-' + randomUUID().toLowerCase().replace(/[^a-z0-9]/g, '');
  await db.product.create({
    data: {
      id: prodId,
      slug: prodId,
      category: catSlug,
      brandId,
      model: 'M',
      title: { ar: 'ع', en: 'E' },
      summary: { ar: 'ص', en: 'S' },
      condition: 'A',
      status: 'draft',
      specs: {},
      inspection: { passed: true },
      specSources: [],
      bestFor: [],
      tags: []
    }
  });
  const varId = 'var-pkg-' + randomUUID();
  await db.productVariant.create({
    data: {
      id: varId,
      sku: 'sku-pkg-' + randomUUID(),
      productId: prodId,
      optionKey: '[]',
      options: {},
      specs: {},
      images: [],
      priceUsd: '50.00',
      condition: 'A',
      inventoryMode: 'quantity',
      quantity: 10,
      inventoryReviewed: true
    }
  });

  // Package
  const pkgId = randomUUID();
  const pkgCreate = await admin.call('/commerce/packages', 'POST', {
    id: pkgId,
    slug: 'pkg-' + pkgId,
    title: { ar: 'باقة اختبار', en: 'Package Test' },
    description: { ar: 'وصف', en: 'Description' },
    priceMode: 'fixed',
    priceUsd: '99.00',
    items: [{ variantId: varId, quantity: 1 }],
    published: false
  });
  expect(pkgCreate.statusCode).toBe(200);

  const pkgDel = await admin.call('/commerce/packages/' + pkgId, 'DELETE');
  expect(pkgDel.statusCode).toBe(200);
  expect(pkgDel.json().ok).toBe(true);

  // Collection
  const colId = randomUUID();
  const colCreate = await admin.call('/commerce/collections', 'POST', {
    id: colId,
    slug: 'col-' + colId,
    title: { ar: 'مجموعة اختبار', en: 'Collection Test' },
    description: { ar: 'وصف', en: 'Description' },
    mode: 'manual',
    rules: { categories: [], brands: [], conditions: [], available: null, min: null, max: null },
    productIds: [],
    published: false,
    sort: 1
  });
  expect(colCreate.statusCode).toBe(200);

  const colDel = await admin.call('/commerce/collections/' + colId, 'DELETE');
  expect(colDel.statusCode).toBe(200);
  expect(colDel.json().ok).toBe(true);
});

it('handles full lifecycle (create, update, delete) for Variants and Serialized Units', async()=>{
  const admin = await staff();
  const id = 'pvar' + randomUUID().toLowerCase().replace(/[^a-z0-9]/g, '');
  const brand = await db.brand.create({
    data: { id: 'b-' + id, slug: 'b-' + id, name: 'Brand Var', published: true, description: {} }
  });
  const cat = await db.catalogCategory.create({
    data: { slug: 'c-' + id, title: { ar: 'فئة', en: 'Cat' }, description: {} }
  });
  await db.product.create({
    data: {
      id,
      slug: id,
      category: cat.slug,
      brandId: brand.id,
      model: 'M',
      title: { ar: 'منتج', en: 'Product' },
      summary: { ar: 'ملخص', en: 'Summary' },
      condition: 'A',
      status: 'draft',
      specs: {},
      inspection: { passed: true },
      specSources: [],
      bestFor: [],
      tags: []
    }
  });

  const varId = 'var-' + randomUUID();
  // Create Variant
  const varCreate = await admin.call('/commerce/variants', 'POST', {
    id: varId,
    productId: id,
    sku: 'SKU-' + randomUUID().slice(0, 8),
    options: {},
    specs: {},
    images: [],
    priceUsd: '150.00',
    warrantyMonths: 6,
    condition: 'A',
    inventoryMode: 'serialized',
    active: true
  });
  expect(varCreate.statusCode).toBe(200);

  // Update Variant
  const varUpdate = await admin.call('/commerce/variants', 'POST', {
    id: varId,
    productId: id,
    sku: varCreate.json().sku,
    options: {},
    specs: {},
    images: [],
    priceUsd: '180.00',
    warrantyMonths: 12,
    condition: 'A',
    inventoryMode: 'serialized',
    active: true
  });
  expect(varUpdate.statusCode).toBe(200);

  // Create Serialized Unit
  const unitId = 'unit-' + randomUUID();
  const unitCreate = await admin.call('/commerce/units', 'POST', {
    id: unitId,
    variantId: varId,
    serialNumber: 'SN-' + randomUUID().slice(0, 10),
    condition: 'A',
    batteryHealthPct: 95,
    inspection: { passed: true, notes: 'All fine' },
    defects: [],
    images: []
  });
  expect(unitCreate.statusCode).toBe(200);

  // Update Unit
  const unitUpdate = await admin.call('/commerce/units', 'POST', {
    id: unitId,
    variantId: varId,
    serialNumber: unitCreate.json().serialNumber,
    condition: 'A',
    batteryHealthPct: 92,
    inspection: { passed: true, notes: 'Re-inspected' },
    defects: [],
    images: []
  });
  expect(unitUpdate.statusCode).toBe(200);

  // Delete Unit
  const unitDel = await admin.call('/commerce/units/' + unitId, 'DELETE');
  expect(unitDel.statusCode).toBe(200);
  expect(unitDel.json().ok).toBe(true);

  // Delete Variant (safe delete or deactivate)
  const varDel = await admin.call('/commerce/variants/' + varId, 'DELETE');
  expect(varDel.statusCode).toBe(200);
  expect(varDel.json().ok).toBe(true);
});
