import {createDb} from './db.js';
import {loadConfig} from './config.js';
import {Prisma} from '@prisma/client';
import type {SpecFieldInput} from '@aljeel/shared';
const db=createDb(loadConfig().DATABASE_URL);
const field=(key:string,ar:string,en:string,valueType:SpecFieldInput['valueType'],unit:string|null=null,required=false):SpecFieldInput=>({key,title:{ar,en},valueType,unit,required,options:[],filterable:valueType!=='text',card:true,sort:0});
const common=[field('ramGB','الذاكرة','Memory','number','GB'),field('storageGB','التخزين','Storage','number','GB')];
const templates=[
  {id:'laptops',title:{ar:'لابتوبات',en:'Laptops'},fields:[field('cpu','المعالج','Processor','text',null,true),...common.map(f=>({...f,required:true})),field('batteryHealthPct','صحة البطارية','Battery health','number','%')]},
  {id:'desktops',title:{ar:'أجهزة مكتبية',en:'Desktops'},fields:[field('cpu','المعالج','Processor','text',null,true),...common,field('gpu','الرسوميات','Graphics','text')]},
  {id:'displays',title:{ar:'شاشات',en:'Displays'},fields:[field('sizeInch','المقاس','Screen size','number','inch'),field('refreshHz','التردد','Refresh rate','number','Hz'),field('resolution','الدقة','Resolution','text'),field('panel','نوع اللوحة','Panel','text')]},
  {id:'components',title:{ar:'مكونات وترقيات',en:'Components'},fields:[...common,field('interface','الواجهة','Interface','text'),field('powerW','الطاقة','Power','number','W')]},
  {id:'audio',title:{ar:'صوتيات',en:'Audio'},fields:[field('wireless','لاسلكي','Wireless','boolean'),field('batteryHours','عمر البطارية','Battery life','number','h')]},
  {id:'network',title:{ar:'شبكات',en:'Networking'},fields:[field('speedMbps','السرعة','Speed','number','Mbps'),field('portsCount','عدد المنافذ','Ports count','number'),field('wireless','لاسلكي','Wireless','boolean')]},
  {id:'storage',title:{ar:'تخزين',en:'Storage'},fields:[field('storageGB','السعة','Capacity','number','GB'),field('interface','الواجهة','Interface','text')]},
  {id:'power',title:{ar:'طاقة',en:'Power'},fields:[field('powerW','القدرة','Power','number','W'),field('capacityVA','السعة','Capacity','number','VA')]},
  {id:'accessories',title:{ar:'ملحقات',en:'Accessories'},fields:[field('wireless','لاسلكي','Wireless','boolean'),field('interface','الواجهة','Interface','text')]}
];
try{
  const products=await db.product.findMany();
  const processors=[...new Set(products.map(p=>(p.specs as Record<string,unknown>)?.cpu).filter((v):v is string=>typeof v==='string'&&v.trim().length>0))].sort();
  for(const t of templates){
    const initial=t.fields.map((f,sort)=>({...f,sort})),fields=initial.map(f=>f.key==='cpu'&&processors.length?{...f,valueType:'single',filterable:true,options:processors}:f);
    const existing=await db.productType.findUnique({where:{id:t.id}});
    await db.productType.upsert({where:{id:t.id},create:{...t,fields:fields as Prisma.InputJsonValue},update:existing&&JSON.stringify(existing.fields)===JSON.stringify(initial)?{fields:fields as Prisma.InputJsonValue}:{}});
  }
  for(const t of templates)await db.catalogCategory.updateMany({where:{slug:t.id,productTypeId:null},data:{productTypeId:t.id}});
  for(const p of products){
    if(await db.productVariant.count({where:{productId:p.id}})){const legacy=await db.productVariant.findUnique({where:{id:p.id+'-default'}});if(legacy&&!legacy.inventoryReviewed&&JSON.stringify(legacy.specs)===JSON.stringify(p.specs))await db.productVariant.update({where:{id:legacy.id},data:{specs:{}}});continue;}
    await db.productVariant.create({data:{id:p.id+'-default',productId:p.id,sku:p.id.slice(0,92)+'-default',optionKey:'[]',options:{},specs:{},images:[],priceUsd:p.priceUsd,warrantyMonths:p.warrantyMonths,condition:p.condition,quantity:p.quantity,inventoryReviewed:false,inventoryMode:p.serialNumber?'serialized':'quantity'}});
    if(p.serialNumber)await db.inventoryUnit.create({data:{variantId:p.id+'-default',serialNumber:p.serialNumber,condition:p.condition,batteryHealthPct:p.batteryHealthPct,inspection:p.inspection as Prisma.InputJsonValue,defects:[],images:[]}});
  }
  const site=await db.siteSetting.findUnique({where:{key:'site'}});
  const value=site?.value as {whatsapp?:string|null}|undefined;
  await db.pricingConfig.upsert({where:{id:1},create:{whatsapp:value?.whatsapp?.replace(/\D/g,'')||null},update:{}});
  console.log('Templates installed; existing products migrated with inventory requiring review.');
}finally{await db.$disconnect();}

