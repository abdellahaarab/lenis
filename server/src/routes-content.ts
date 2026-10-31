import type {FastifyInstance,FastifyRequest,FastifyReply} from 'fastify';
import type {PrismaClient} from '@prisma/client';
import {Prisma} from '@prisma/client';
import {z} from 'zod';
import sharp, {type Metadata} from 'sharp';
import {randomUUID} from 'node:crypto';
import {ProductEditSchema,BrandEditSchema,CategoryEditSchema,SpecEditSchema,ContentKeySchema,contentSchemas} from '@aljeel/shared';
import type {AppConfig} from './config.js';
import {ApiError} from './errors.js';
import {transaction} from './db.js';
import {audit} from './audit.js';
import {productInclude,productDto,saveProduct} from './catalog-service.js';
import {invalidateCatalogCache} from './commerce-catalog.js';

let cachedBootstrap: { data: unknown; expiresAt: number } | null = null;
export function invalidateBootstrapCache() {
  cachedBootstrap = null;
}

export async function publicContentRoutes(app:FastifyInstance,db:PrismaClient){
  const bootstrap=async(_request:FastifyRequest,reply:FastifyReply)=>{
    reply.header('Cache-Control','public, max-age=15, stale-while-revalidate=60');
    const isBootstrap = _request.url.startsWith('/api/bootstrap');
    const now = Date.now();
    if (isBootstrap && cachedBootstrap && cachedBootstrap.expiresAt > now) {
      return cachedBootstrap.data;
    }
    const [products,brands,settings,categories,specs,pricingConfig]=await Promise.all([
      db.product.findMany({where:{status:'published',deletedAt:null,brand:{published:true},categoryRef:{status:'published'}},include:productInclude,orderBy:{publishedAt:'desc'},...(isBootstrap?{take:8}:{})}),
      db.brand.findMany({where:{published:true},include:{categories:true},orderBy:{sort:'asc'}}),
      db.siteSetting.findMany({where:{key:{in:['site','faq','warranty','bundles']}}}),
      db.catalogCategory.findMany({orderBy:{sort:'asc'}}),
      db.specDefinition.findMany({where:{filterable:true}}),
      db.pricingConfig.findUnique({where:{id:1}}),
    ]);
    const content=Object.fromEntries(settings.map(s=>[s.key,s.value]));
    if(!content.site||!content.warranty) throw new ApiError(503,'content_not_ready');
    const publishedIds=new Set(products.map(p=>p.id));
    const result = {products:products.map(p=>{const dto=productDto(p);return {...dto,compatibleWith:dto.compatibleWith.filter(id=>publishedIds.has(id))};}),
      brands:brands.map(b=>({id:b.id,name:b.name,description:b.description,...(b.tagline?{tagline:b.tagline}:{}),categories:b.categories.map(c=>c.categorySlug)})),
      site:content.site,warranty:content.warranty,faq:content.faq??[],bundles:contentSchemas.bundles.parse(content.bundles??[]).map(b=>({...b,tiers:b.tiers.map(t=>({...t,items:t.items.filter(id=>publishedIds.has(id))})).filter(t=>t.items.length)})).filter(b=>b.tiers.length),categories,specs,
      pricing:{usdToYer:pricingConfig?.usdToYer?String(pricingConfig.usdToYer):'530'}};
    if (isBootstrap) {
      cachedBootstrap = { data: result, expiresAt: now + 60_000 };
    }
    return result;
  };
  app.get('/api/catalog',bootstrap);
  app.get('/api/bootstrap',bootstrap);
  app.get('/api/content/:key',async(request,reply)=>{
    const key=ContentKeySchema.parse((request.params as {key:string}).key);
    reply.header('Cache-Control','no-store');
    const item=await db.siteSetting.findUnique({where:{key}});
    if(item) return item;
    try{
      const root=new URL('../../',import.meta.url);
      const {readFile}=await import('node:fs/promises');
      const raw=await readFile(new URL('src/data/'+key+'.json',root),'utf8');
      return {key,value:JSON.parse(raw),updatedAt:new Date().toISOString()};
    }catch{
      throw new ApiError(404,'not_found');
    }
  });
  app.get('/api/media/:id',async(request,reply)=>{
    const {id}=z.object({id:z.string().regex(/^[a-zA-Z0-9-]{1,100}$/)}).parse(request.params);
    const linked=await db.productVariant.findMany({where:{active:true,product:{status:'published',deletedAt:null,brand:{published:true}}},select:{images:true,units:{select:{images:true}}}});
    const extra=linked.some(v=>[v.images,...v.units.map(u=>u.images)].some(images=>Array.isArray(images)&&images.includes('/api/media/'+id)))||Boolean(await db.catalogCategory.findFirst({where:{imageId:id,status:'published'}}));
    const media=await db.mediaAsset.findFirst({where:{id,...(extra?{}:{OR:[{productImages:{some:{product:{status:'published',deletedAt:null,brand:{published:true}}}}},{brands:{some:{published:true}}}]})},select:{content:true,mime:true}});
    if(!media?.content) throw new ApiError(404,'not_found');
    return reply.header('Cache-Control','no-cache').type(media.mime).send(Buffer.from(media.content));
  });
}
export async function contentRoutes(app:FastifyInstance,db:PrismaClient,config:AppConfig){
  const edit={permission:'catalog.edit' as const};
  app.get('/products',{config:edit},async()=>({items:(await db.product.findMany({include:productInclude,orderBy:{updatedAt:'desc'}})).map(p=>productDto(p,true))}));
  app.post('/products',{config:edit},async(request,reply)=>reply.code(201).send(await saveProduct(db,config,request,ProductEditSchema.parse(request.body),true)));
  app.patch('/products/:id',{config:edit},async request=>{
    const p=ProductEditSchema.parse(request.body);if((request.params as {id:string}).id!==p.id) throw new ApiError(400,'validation_failed');
    return saveProduct(db,config,request,p);
  });
  app.delete('/products/:id',{config:edit},async request=>{
    const id=(request.params as {id:string}).id;
    return transaction(db,async tx=>{
      const p=await tx.product.findUnique({where:{id},include:{variants:true}});
      if(!p)throw new ApiError(404,'not_found');
      const hasHistory=await tx.sale.count({where:{productId:id}})||await tx.quoteItem.count({where:{productId:id}});
      if(hasHistory){
        const after=await tx.product.update({where:{id},data:{deletedAt:new Date(),status:'archived'}});
        await audit(tx,config,request,{action:'product.deleted',entity:'Product',entityId:id,before:p,after});
        return {ok:true,soft:true};
      }
      const delOps: Promise<unknown>[] = [
        tx.productCompat.deleteMany({where:{OR:[{productId:id},{otherProductId:id}]}}),
        tx.productImage.deleteMany({where:{productId:id}}),
        tx.productFacet.deleteMany({where:{productId:id}}),
        tx.productLabel.deleteMany({where:{productId:id}}),
        tx.collectionProduct.deleteMany({where:{productId:id}}),
        tx.productRedirect.deleteMany({where:{productId:id}}),
        tx.priceHistory.deleteMany({where:{productId:id}}),
        tx.bundleItem.deleteMany({where:{productId:id}}),
        tx.analyticsEvent.deleteMany({where:{productId:id}}),
      ];
      const variantIds=p.variants.map(v=>v.id);
      if(variantIds.length>0){
        delOps.push(
          tx.packageItem.deleteMany({where:{variantId:{in:variantIds}}}),
          tx.inventoryMovement.deleteMany({where:{variantId:{in:variantIds}}}),
          tx.inventoryUnit.deleteMany({where:{variantId:{in:variantIds}}}),
        );
      }
      await Promise.all(delOps);
      await tx.productVariant.deleteMany({where:{productId:id}});
      await tx.product.delete({where:{id}});
      await audit(tx,config,request,{action:'product.deleted',entity:'Product',entityId:id,before:p});
      invalidateCatalogCache();
      invalidateBootstrapCache();
      return {ok:true};
    });
  });
  app.get('/reference',{config:edit},async()=>{
    const [brands,categories,specs]=await Promise.all([
      db.brand.findMany({include:{categories:true},orderBy:{sort:'asc'}}),
      db.catalogCategory.findMany({orderBy:{sort:'asc'}}),
      db.specDefinition.findMany(),
    ]);
    return {brands,categories,specs};
  });
  app.post('/brands',{config:edit},async request=>{
    const b=BrandEditSchema.parse(request.body);
    return transaction(db,async tx=>{
      const before=await tx.brand.findUnique({where:{id:b.id},include:{categories:true}});
      if(b.logoMediaId&&!await tx.mediaAsset.findUnique({where:{id:b.logoMediaId}}))throw new ApiError(400,'unknown_image');
      const after=await tx.brand.upsert({where:{id:b.id},create:{id:b.id,slug:b.id,name:b.name,description:b.description,tagline:b.tagline??Prisma.DbNull,logoMediaId:b.logoMediaId??null,published:b.published,sort:b.sort},update:{name:b.name,description:b.description,tagline:b.tagline??Prisma.DbNull,logoMediaId:b.logoMediaId===undefined?before?.logoMediaId:b.logoMediaId,published:b.published,sort:b.sort}});
      await tx.brandCategory.deleteMany({where:{brandId:b.id}});for(const categorySlug of new Set(b.categories)) await tx.brandCategory.create({data:{brandId:b.id,categorySlug}});
      await audit(tx,config,request,{action:'brand.saved',entity:'Brand',entityId:b.id,before,after});return {ok:true};
    });
  });
  app.delete('/brands/:id',{config:edit},async request=>{
    const id=(request.params as {id:string}).id;
    return transaction(db,async tx=>{
      const before=await tx.brand.findUnique({where:{id}});
      if(!before)throw new ApiError(404,'not_found');
      const count=await tx.product.count({where:{brandId:id,deletedAt:null}});
      if(count>0)throw new ApiError(400,'brand_in_use');
      await tx.brandCategory.deleteMany({where:{brandId:id}});
      await tx.brand.delete({where:{id}});
      await audit(tx,config,request,{action:'brand.deleted',entity:'Brand',entityId:id,before});
      return {ok:true};
    });
  });
  app.post('/categories',{config:edit},async request=>{
    const c=CategoryEditSchema.parse(request.body);
    return transaction(db,async tx=>{const before=await tx.catalogCategory.findUnique({where:{slug:c.slug}});const after=await tx.catalogCategory.upsert({where:{slug:c.slug},create:c,update:{title:c.title,sort:c.sort}});await audit(tx,config,request,{action:'category.saved',entity:'CatalogCategory',entityId:c.slug,before,after});return {ok:true};});
  });
  app.post('/specs',{config:edit},async request=>{
    const s=SpecEditSchema.parse(request.body);
    return transaction(db,async tx=>{const before=await tx.specDefinition.findUnique({where:{key:s.key}});const after=await tx.specDefinition.upsert({where:{key:s.key},create:s,update:s});await audit(tx,config,request,{action:'spec.saved',entity:'SpecDefinition',entityId:s.key,before,after});return {ok:true};});
  });
  app.get('/content/:key',{config:{permission:'settings.manage'}},async request=>{
    const key=ContentKeySchema.parse((request.params as {key:string}).key);
    let item=await db.siteSetting.findUnique({where:{key}});
    if(!item){
      try{
        const root=new URL('../../',import.meta.url);
        const {readFile}=await import('node:fs/promises');
        const raw=await readFile(new URL('src/data/'+key+'.json',root),'utf8');
        const defaultValue=contentSchemas[key].parse(JSON.parse(raw));
        item=await db.siteSetting.create({data:{key,value:defaultValue}});
      }catch{
        throw new ApiError(404,'not_found');
      }
    }
    return item;
  });
  app.patch('/content/:key',{config:{permission:'settings.manage'}},async request=>{
    const key=ContentKeySchema.parse((request.params as {key:string}).key);
    const input=z.object({value:z.unknown(),revision:z.string().optional()}).strict().parse(request.body);
    const value=contentSchemas[key].parse(input.value);
    return transaction(db,async tx=>{
      const before=await tx.siteSetting.findUnique({where:{key}});
      if(before&&input.revision&&input.revision!==before.updatedAt.toISOString()) throw new ApiError(409,'content_changed');
      const after=await tx.siteSetting.upsert({where:{key},create:{key,value},update:{value}});
      await audit(tx,config,request,{action:'content.saved',entity:'SiteSetting',entityId:key,before,after});
      return after;
    });
  });
  app.get('/media',{config:edit},async()=>({items:(await db.mediaAsset.findMany({select:{id:true,originalPath:true,width:true,height:true,bytes:true,altAr:true,altEn:true,createdAt:true},orderBy:{createdAt:'desc'}})).map(m=>({...m,bytes:Number(m.bytes)}))}));
  app.get('/media/:id',{config:edit},async(request,reply)=>{const media=await db.mediaAsset.findUniqueOrThrow({where:{id:(request.params as {id:string}).id}});if(!media.content)throw new ApiError(404,'not_found');return reply.header('Cache-Control','no-store').type(media.mime).send(Buffer.from(media.content));});
  app.post('/media',{config:edit,bodyLimit:6*1024*1024},async(request,reply)=>{
    const input=z.object({type:z.enum(['image/jpeg','image/png','image/webp']),data:z.string().max(5600000).regex(/^[A-Za-z0-9+/]+={0,2}$/),altAr:z.string().min(1).max(190),altEn:z.string().max(190).optional().default('')}).strict().transform(v=>({...v,altEn:v.altEn&&v.altEn.trim()?v.altEn:v.altAr})).parse(request.body);
    const buffer=Buffer.from(input.data,'base64');if(buffer.length>4*1024*1024) throw new ApiError(413,'image_too_large');
    let content:Buffer,meta:Metadata;
    try{const image=sharp(buffer,{limitInputPixels:24000000,failOn:'warning',animated:false});meta=await image.metadata();if(!['jpeg','png','webp'].includes(meta.format??'')||'image/'+(meta.format==='jpeg'?'jpeg':meta.format)!==input.type||(meta.pages??1)>1)throw new Error('format');content=await image.rotate().resize({width:1600,height:1600,fit:'inside',withoutEnlargement:true}).webp({quality:85}).toBuffer();meta=await sharp(content).metadata();}catch{throw new ApiError(400,'invalid_image');}
    const id=randomUUID();
    await transaction(db,async tx=>{await tx.mediaAsset.create({data:{id,kind:'image',originalPath:'/api/media/'+id,variants:{},content:new Uint8Array(content),mime:'image/webp',bytes:content.length,width:meta.width,height:meta.height,altAr:input.altAr,altEn:input.altEn,createdBy:request.auth!.user.id}});await audit(tx,config,request,{action:'media.uploaded',entity:'MediaAsset',entityId:id,after:{bytes:content.length}});});
    return reply.code(201).send({id,path:'/api/media/'+id});
  });
  app.delete('/media/:id',{config:edit},async request=>transaction(db,async tx=>{
    const id=(request.params as {id:string}).id;
    const media=await tx.mediaAsset.findUniqueOrThrow({where:{id},include:{_count:{select:{productImages:true,brands:true,guides:true}}}});
    const [category,variants,units]=await Promise.all([tx.catalogCategory.findFirst({where:{imageId:id}}),tx.productVariant.findMany({select:{images:true}}),tx.inventoryUnit.findMany({select:{images:true}})]);
    const usedInImages=[...variants,...units].some(row=>Array.isArray(row.images)&&row.images.includes(media.originalPath));
    if(category||usedInImages||Object.values(media._count).some(v=>v>0)) throw new ApiError(409,'image_in_use');
    await tx.mediaAsset.delete({where:{id}});await audit(tx,config,request,{action:'media.deleted',entity:'MediaAsset',entityId:id});return {ok:true};
  }));
}
