import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {ProductsArraySchema,BrandsArraySchema,contentSchemas,type ProductEdit} from '@aljeel/shared';
import {loadConfig} from './config.js';
import {createDb} from './db.js';
import {saveProduct} from './catalog-service.js';
const config=loadConfig(),db=createDb(config.DATABASE_URL);
const root=new URL('../../',import.meta.url);
async function json(name:string){return JSON.parse(await readFile(new URL('src/data/'+name+'.json',root),'utf8'));}
try{
  const products=ProductsArraySchema.parse(await json('products')), brands=BrandsArraySchema.parse(await json('brands'));
  const categories={laptops:['لابتوبات','Laptops'],displays:['شاشات','Displays'],audio:['صوتيات','Audio'],gaming:['ألعاب','Gaming'],network:['شبكات','Networking'],storage:['تخزين','Storage'],power:['طاقة','Power'],'hard-drives':['هاردسك وأقراص التخزين','Hard Drives & SSDs']};
  for(const [slug,[ar,en]] of Object.entries(categories)) await db.catalogCategory.upsert({where:{slug},create:{slug,title:{ar,en}},update:{}});
  const definitions:Record<string,[string,string,boolean]>={cpu:['المعالج','CPU',true],cpuGen:['جيل المعالج','CPU generation',true],ramGB:['الرام GB','RAM GB',true],ramType:['نوع الرام','RAM type',true],storageGB:['التخزين GB','Storage GB',true],storageType:['نوع التخزين','Storage type',true],ports:['المنافذ','Ports',true],gpu:['كرت الشاشة','GPU',true],display:['الشاشة','Display',false],batteryHealthPct:['صحة البطارية %','Battery health %',false],wifiStandard:['معيار الشبكة اللاسلكية','Wi-Fi standard',true],capacityGB:['السعة GB','Capacity GB',true],capacityVA:['سعة الطاقة VA','Power capacity VA',true],capacityWatts:['القدرة W','Power capacity W',true],connectionType:['نوع الاتصال','Connection type',true],interface:['واجهة التوصيل','Interface',true],hddType:['نوع القرص','Drive Type',true],formFactor:['الشكل والحجم','Form Factor',true],rpm:['سرعة الدوران RPM','RPM Speed',true],readSpeedMBs:['سرعة القراءة MB/s','Read Speed MB/s',false],writeSpeedMBs:['سرعة الكتابة MB/s','Write Speed MB/s',false],usbVersion:['إصدار USB','USB Version',true]};
  for(const [key,[ar,en,filterable]] of Object.entries(definitions)){
    const before=await db.specDefinition.findUnique({where:{key}});
    const old=before?.title as {ar?:string;en?:string}|undefined;
    await db.specDefinition.upsert({where:{key},create:{key,title:{ar,en},filterable},update:old?.ar===key&&old.en===key?{title:{ar,en},filterable}:{}});
  }
  for(const b of brands){
    await db.brand.upsert({where:{id:b.id},update:{},create:{id:b.id,slug:b.id,name:b.name,description:b.description,...(b.tagline?{tagline:b.tagline}:{}),published:true}});
    for(const categorySlug of b.categories) await db.brandCategory.upsert({where:{brandId_categorySlug:{brandId:b.id,categorySlug}},update:{},create:{brandId:b.id,categorySlug}});
  }
  const imported:string[]=[];
  for(const name of new Set(products.map(p=>p.brand))) if(!brands.some(b=>b.name===name)) {
    const id='unspecified-'+createHash('sha256').update(name).digest('hex').slice(0,12);
    await db.brand.upsert({where:{id},update:{},create:{id,slug:id,name,description:{ar:'العلامة التجارية غير مؤكدة في البيانات الأصلية.',en:'Brand is unconfirmed in the original data.'},published:true}});
  }
  for(const p of products){
    if(await db.product.findUnique({where:{id:p.id}})) continue;
    const paths:string[]=[];
    for(const path of p.images){
      if(!/^\/images\/[a-zA-Z0-9/_\-.]+$/.test(path)||path.includes('..')) throw new Error('Invalid import image path');
      const id='import-'+createHash('sha256').update(path).digest('hex').slice(0,40);
      const buffer=await sharp(await readFile(fileURLToPath(new URL('public'+path,root))),{limitInputPixels:24000000}).resize({width:1600,height:1600,fit:'inside',withoutEnlargement:true}).webp({quality:85}).toBuffer();
      const info=await sharp(buffer).metadata();const originalPath='/api/media/'+id;
      await db.mediaAsset.upsert({where:{id},update:{},create:{id,kind:'image',originalPath,variants:{},content:new Uint8Array(buffer),mime:'image/webp',width:info.width,height:info.height,bytes:buffer.length,sourceNote:'Imported existing illustrative image; verify product and licence before publication.',licensed:false}});
      paths.push(originalPath);
    }
    await saveProduct(db,config,null,{...p,images:paths,status:'draft',price:{...p.price,usd:p.price.usd?.toFixed(2)??null,yer:p.price.yer?.toFixed(2)??null}} as ProductEdit,true,true);
    imported.push(p.id);
  }
  // Resolve relationships after all new products exist, without overwriting managed data on reruns.
  for(const p of products){
    const last=await db.auditLog.findFirst({where:{entity:'Product',entityId:p.id},orderBy:{createdAt:'desc'}});
    if(!imported.includes(p.id)&&last?.action!=='catalog.imported')continue;
    for(const id of p.compatibleWith) if(await db.product.findUnique({where:{id}})) await db.productCompat.upsert({where:{productId_otherProductId:{productId:p.id,otherProductId:id}},create:{productId:p.id,otherProductId:id},update:{}});
  }
  for(const key of ['site','faq','warranty','bundles'] as const){const value=contentSchemas[key].parse(await json(key));await db.siteSetting.upsert({where:{key},update:{},create:{key,value}});}
  console.log('Imported '+imported.length+' draft products. Existing rows preserved; IDs and slugs retained. Images stored in MySQL.');
}finally{await db.$disconnect();}
