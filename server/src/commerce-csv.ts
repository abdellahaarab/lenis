import type {PrismaClient} from '@prisma/client';
import type {FastifyRequest} from 'fastify';
import {z} from 'zod';
import {SpecValues,Money,UnitEdit} from '@aljeel/shared';
import {randomUUID,createHash} from 'node:crypto';
import {transaction} from './db.js';
import {audit} from './audit.js';
import {ApiError} from './errors.js';
import {effectiveFields,validateSpecs,jsonObject,optionIdentity} from './commerce-catalog.js';
import type {AppConfig} from './config.js';
export const csvVariant=z.object({id:z.string().optional(),productId:z.string().regex(/^[a-z0-9-]{1,100}$/),sku:z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/),priceUsd:Money,quantity:z.coerce.number().int().min(0).max(100000),inventoryMode:z.enum(['quantity','serialized']).default('quantity'),options:SpecValues.default({}),specs:SpecValues.default({}),titleAr:z.string().optional(),titleEn:z.string().optional(),summaryAr:z.string().default(''),summaryEn:z.string().default(''),category:z.string().optional(),brandId:z.string().optional(),slug:z.string().regex(/^[a-z0-9-]{1,120}$/).optional(),model:z.string().optional()}).refine(v=>v.inventoryMode!=='serialized'||v.quantity===0);
const csvUnit=UnitEdit.extend({batteryHealthPct:z.preprocess(v=>v===''||v===undefined?null:typeof v==='string'?Number(v):v,z.number().int().min(0).max(100).nullable())});
export async function importCsv(db:PrismaClient,config:AppConfig,request:FastifyRequest){
  const input=z.object({kind:z.enum(['variants','units']).default('variants'),rows:z.array(z.unknown()).min(1).max(1000),commit:z.boolean().default(false),previewToken:z.string().optional()}).parse(request.body);
  const errors:{row:number;message:string}[]=[],versions:unknown[]=[],parsed=input.rows.map((row,index)=>({index,result:input.kind==='variants'?csvVariant.safeParse(row):csvUnit.safeParse(row)}));
  const identities=new Set<string>(),combinations=new Set<string>();
  for(const row of parsed){
    const result=input.kind==='variants'?csvVariant.safeParse(input.rows[row.index]):csvUnit.safeParse(input.rows[row.index]);
    if(!result.success){errors.push({row:row.index+1,message:result.error.issues.map(i=>i.path.join('.')+': '+i.message).join('; ')});continue;}
    try{
      if(input.kind==='variants'){
        const v=csvVariant.parse(input.rows[row.index]),p=await db.product.findUnique({where:{id:v.productId}}),existing=await db.productVariant.findUnique({where:{sku:v.sku}});
        if(identities.has(v.sku))throw new Error('duplicate_sku');identities.add(v.sku);
        if(!p){if(!v.titleAr?.trim()||!v.titleEn?.trim()||!v.category||!v.brandId)throw new Error('new_product_requires_titles_category_brandId');if(!await db.catalogCategory.findUnique({where:{slug:v.category}})||!await db.brand.findUnique({where:{id:v.brandId}}))throw new Error('unknown_category_or_brand');}
        if(existing&&(existing.productId!==v.productId||existing.inventoryMode!==v.inventoryMode))throw new Error('incompatible_existing_sku');
        if(v.id){const idRow=await db.productVariant.findUnique({where:{id:v.id}});if(idRow&&idRow.sku!==v.sku)throw new Error('id_in_use');}
        const optionKey=optionIdentity(v.options),combination=v.productId+optionKey;
        if(combinations.has(combination))throw new Error('duplicate_option_combination');combinations.add(combination);
        const duplicate=await db.productVariant.findUnique({where:{productId_optionKey:{productId:v.productId,optionKey}}});if(duplicate&&duplicate.sku!==v.sku)throw new Error('duplicate_option_combination');
        validateSpecs(await effectiveFields(db,p??{category:v.category!}),{...jsonObject(p?.specs),...v.specs,...v.options},false);
        versions.push([v.sku,existing?.updatedAt.toISOString()??null,p?.updatedAt.toISOString()??null]);
      }else{
        const v=csvUnit.parse(input.rows[row.index]);if(identities.has(v.serialNumber))throw new Error('duplicate_serial');identities.add(v.serialNumber);
        const variant=await db.productVariant.findUnique({where:{id:v.variantId}}),existing=await db.inventoryUnit.findUnique({where:{id:v.id}}),serial=await db.inventoryUnit.findUnique({where:{serialNumber:v.serialNumber}});
        if(!variant||variant.inventoryMode!=='serialized')throw new Error('select_serialized_variant');
        if(existing&&(existing.soldOrderId||existing.variantId!==v.variantId))throw new Error('unit_sold_or_wrong_variant');
        if(serial&&serial.id!==v.id)throw new Error('serial_in_use');
        for(const path of v.images)if(!await db.mediaAsset.findFirst({where:{originalPath:path}}))throw new Error('unknown_image');
        versions.push([v.id,existing?.updatedAt.toISOString()??null,variant.updatedAt.toISOString()]);
      }
    }catch(error){errors.push({row:row.index+1,message:error instanceof Error?error.message:'invalid_row'});}
  }
  const previewToken=createHash('sha256').update(JSON.stringify([input.kind,input.rows,versions])).digest('hex');
  if(!input.commit||errors.length)return {errors,valid:input.rows.length-new Set(errors.map(e=>e.row)).size,committed:false,previewToken};
  if(input.previewToken!==previewToken)throw new ApiError(409,'import_changed');
  await transaction(db,async tx=>{
    // Lock and compare every existing row before applying the reviewed snapshot.
    for(const version of versions as [string,string|null,string|null][]){
      if(input.kind==='variants'){const v=await tx.productVariant.findUnique({where:{sku:version[0]}});if((v?.updatedAt.toISOString()??null)!==version[1])throw new ApiError(409,'import_changed');const row=csvVariant.parse(input.rows.find(row=>csvVariant.parse(row).sku===version[0]));const p=await tx.product.findUnique({where:{id:row.productId}});if((p?.updatedAt.toISOString()??null)!==version[2])throw new ApiError(409,'import_changed');}
      else {const u=await tx.inventoryUnit.findUnique({where:{id:version[0]}});if((u?.updatedAt.toISOString()??null)!==version[1])throw new ApiError(409,'import_changed');const row=csvUnit.parse(input.rows.find(row=>csvUnit.parse(row).id===version[0]));const v=await tx.productVariant.findUniqueOrThrow({where:{id:row.variantId}});if(v.updatedAt.toISOString()!==version[2])throw new ApiError(409,'import_changed');}
    }
    for(const row of input.rows){
      if(input.kind==='variants'){
        const v=csvVariant.parse(row),optionKey=optionIdentity(v.options);
        let p=await tx.product.findUnique({where:{id:v.productId}});
        if(!p)p=await tx.product.create({data:{id:v.productId,slug:v.slug||v.productId,category:v.category!,brandId:v.brandId!,model:v.model||v.sku,title:{ar:v.titleAr!,en:v.titleEn!},summary:{ar:v.summaryAr,en:v.summaryEn},condition:'new',status:'draft',specs:{},inspection:{passed:false,date:null,notes:{ar:'',en:''}},specSources:[],bestFor:[],tags:[]}});
        const before=await tx.productVariant.findUnique({where:{sku:v.sku}});
        const after=await tx.productVariant.upsert({where:{sku:v.sku},create:{id:v.id||randomUUID(),productId:v.productId,sku:v.sku,optionKey,options:v.options,specs:v.specs,images:[],priceUsd:v.priceUsd,quantity:v.quantity,inventoryMode:v.inventoryMode,condition:p.condition,inventoryReviewed:v.inventoryMode==='quantity',warrantyMonths:p.warrantyMonths},update:{options:v.options,specs:v.specs,optionKey,priceUsd:v.priceUsd,quantity:v.quantity,inventoryReviewed:v.inventoryMode==='quantity'?true:before?.inventoryReviewed}});
        await tx.product.update({where:{id:p.id},data:{status:'draft'}});
        if(v.inventoryMode==='quantity')await tx.inventoryMovement.create({data:{variantId:after.id,delta:v.quantity-(before?.quantity??0),reason:'CSV import reviewed',userId:request.auth!.user.id}});
        await audit(tx,config,request,{action:'catalog.csv_imported',entity:'ProductVariant',entityId:after.id,before,after});
      }else{
        const v=csvUnit.parse(row),before=await tx.inventoryUnit.findUnique({where:{id:v.id}}),{revision:_r,...data}=v;void _r;
        const after=await tx.inventoryUnit.upsert({where:{id:v.id},create:data,update:data});
        await tx.productVariant.update({where:{id:v.variantId},data:{inventoryReviewed:true}});
        if(!before)await tx.inventoryMovement.create({data:{variantId:v.variantId,unitId:v.id,delta:1,reason:'CSV unit received and reviewed',userId:request.auth!.user.id}});
        await audit(tx,config,request,{action:'unit.csv_imported',entity:'InventoryUnit',entityId:v.id,before,after});
      }
    }
  });
  return {errors:[],valid:input.rows.length,committed:true,previewToken};
}

