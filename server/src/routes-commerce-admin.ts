import type {FastifyInstance} from 'fastify';
import {Prisma,type PrismaClient} from '@prisma/client';
import {z} from 'zod';
import {can,CategoryEdit,TypeEdit,VariantEdit,UnitEdit,CollectionEdit,PackageEdit,OrderStatuses,CouponEdit} from '@aljeel/shared';
import {importCsv} from './commerce-csv.js';
import {generateTemplate, exportCatalogExcel, importExcel, getExportImportStats} from './commerce-excel.js';
import {productUpdateRoutes} from './product-updates.js';
import type {AppConfig} from './config.js';
import {transaction} from './db.js';
import {audit} from './audit.js';
import {ApiError} from './errors.js';
import {effectiveFields,validateSpecs,jsonObject,optionIdentity,invalidateCatalogCache} from './commerce-catalog.js';
import {changeOrder} from './commerce-cart.js';
import {couponToDto} from './coupon-service.js';
import {randomToken,hashToken} from './security.js';
import {productInclude,productDto} from './catalog-service.js';
import {fetchAmazonImages,importAmazonImagesToStore} from './amazon-service.js';
const catalog={permission:'catalog.edit' as const},inventory={permission:'inventory.manage' as const},orders={permission:'orders.manage' as const},coupons={permission:'orders.manage' as const};
const revision=(row:{updatedAt:Date}|null,value?:string)=>{if(row&&value!==undefined&&row.updatedAt.toISOString()!==value)throw new ApiError(409,'content_changed');};
export async function commerceAdminRoutes(app:FastifyInstance,db:PrismaClient,config:AppConfig){
  await productUpdateRoutes(app,db,config);
  app.get('/commerce/products',{config:catalog},async request=>{
    const q=z.object({q:z.string().max(200).default(''),status:z.enum(['draft','published','archived']).optional(),page:z.coerce.number().int().positive().default(1),sort:z.string().default('updated')}).parse(request.query);
    const sortVal=q.sort.startsWith('name')?'name':'updated';
    const trimmedQ=q.q.trim();

    if(trimmedQ){
      try {
        const param=`%${trimmedQ}%`;
        // استخدام $queryRaw الآمن بدلاً من $queryRawUnsafe لمنع حقن SQL
        // Use safe $queryRaw tagged template instead of $queryRawUnsafe to prevent SQL injection
        const statusFilter=q.status?Prisma.sql`AND p.status = ${q.status}`:Prisma.empty;
        const matchedRows=await db.$queryRaw<{id:string}[]>(
          Prisma.sql`SELECT DISTINCT p.id 
           FROM Product p
           LEFT JOIN Brand b ON p.brandId = b.id
           LEFT JOIN ProductVariant v ON v.productId = p.id
           WHERE p.deletedAt IS NULL 
             ${statusFilter}
             AND (
               p.model LIKE ${param} 
               OR p.slug LIKE ${param} 
               OR CAST(p.title AS CHAR) LIKE ${param} 
               OR b.name LIKE ${param} 
               OR v.sku LIKE ${param}
             )`
        );
        const matchingIds=matchedRows.map(r=>r.id);
        if(!matchingIds.length){
          return {items:[],total:0};
        }
        const where:Prisma.ProductWhereInput={
          id:{in:matchingIds},
          deletedAt:null,
          ...(q.status?{status:q.status}:{})
        };
        const [items,total]=await Promise.all([
          db.product.findMany({where,include:productInclude,skip:(q.page-1)*24,take:24,orderBy:sortVal==='name'?{model:'asc'}:{updatedAt:'desc'}}),
          matchingIds.length
        ]);
        return {items:items.map(p=>productDto(p,true)),total};
      } catch (err) {
        request.log.error(err, 'Raw search failed, falling back');
        return {items:[],total:0};
      }
    }

    const where:Prisma.ProductWhereInput={deletedAt:null,...(q.status?{status:q.status}:{})};
    const [items,total]=await Promise.all([
      db.product.findMany({where,include:productInclude,skip:(q.page-1)*24,take:24,orderBy:sortVal==='name'?{model:'asc'}:{updatedAt:'desc'}}),
      db.product.count({where})
    ]);
    return {items:items.map(p=>productDto(p,true)),total};
  });
  app.get('/commerce/reference',{config:catalog},async(_request,reply)=>{
    reply.header('Cache-Control','private, max-age=15');
    // الدفعة 1: استعلامات خفيفة لتخفيف الضغط على مجمع الاتصال
    // Batch 1: lightweight lookups
    const [brands,categories,types]=await Promise.all([
      db.brand.findMany(),
      db.catalogCategory.findMany({orderBy:{sort:'asc'}}),
      db.productType.findMany()
    ]);
    // الدفعة 2: استعلامات أثقل للجداول الكبيرة
    // Batch 2: heavier queries
    const [products,variants,collections,packages]=await Promise.all([
      db.product.findMany({select:{id:true,title:true,model:true,brandId:true,category:true,productTypeId:true,status:true,images:{take:1,include:{media:{select:{originalPath:true}}}}}}),
      db.productVariant.findMany({include:{units:true},orderBy:{sku:'asc'}}),
      db.catalogCollection.findMany({include:{products:true},orderBy:{sort:'asc'}}),
      db.catalogPackage.findMany({include:{items:true}})
    ]);
    return {products,brands,categories,types,variants,collections,packages};
  });
  app.post('/commerce/categories',{config:catalog},async request=>{
    const input=CategoryEdit.parse(request.body);
    return transaction(db,async tx=>{
      let parent=input.parentSlug;const seen=new Set([input.slug]);
      while(parent){if(seen.has(parent))throw new ApiError(400,'category_cycle');seen.add(parent);const row=await tx.catalogCategory.findUnique({where:{slug:parent}});if(!row)throw new ApiError(400,'unknown_category');parent=row.parentSlug;}
      if(input.productTypeId&&!await tx.productType.findUnique({where:{id:input.productTypeId}}))throw new ApiError(400,'unknown_type');
      if(input.imageId&&!await tx.mediaAsset.findUnique({where:{id:input.imageId}}))throw new ApiError(400,'unknown_image');
      const before=await tx.catalogCategory.findUnique({where:{slug:input.slug}});
      revision(before,input.revision);
      const {revision:_r,...data}=input;void _r;
      const after=await tx.catalogCategory.upsert({where:{slug:input.slug},create:data,update:data});await audit(tx,config,request,{action:'category.saved',entity:'CatalogCategory',entityId:input.slug,before,after});return after;
    });
  });
  app.delete('/commerce/categories/:slug',{config:catalog},async request=>{
    const slug=(request.params as {slug:string}).slug;
    return transaction(db,async tx=>{
      const before=await tx.catalogCategory.findUnique({where:{slug}});
      if(!before)throw new ApiError(404,'not_found');
      if(await tx.product.count({where:{category:slug,deletedAt:null}}))throw new ApiError(400,'category_in_use');
      if(await tx.catalogCategory.count({where:{parentSlug:slug}}))throw new ApiError(400,'category_has_children');
      await tx.brandCategory.deleteMany({where:{categorySlug:slug}});
      await tx.catalogCategory.delete({where:{slug}});
      await audit(tx,config,request,{action:'category.deleted',entity:'CatalogCategory',entityId:slug,before});
      return {ok:true};
    });
  });
  app.post('/commerce/types',{config:catalog},async request=>{
    const input=TypeEdit.parse(request.body);
    if(new Set(input.fields.map(f=>f.key)).size!==input.fields.length)throw new ApiError(400,'duplicate_spec');
    return transaction(db,async tx=>{
      const before=await tx.productType.findUnique({where:{id:input.id}});
      revision(before,input.revision);
      const data={title:input.title,fields:input.fields as Prisma.InputJsonValue};
      const after=await tx.productType.upsert({where:{id:input.id},create:{id:input.id,...data},update:data});

      // Synchronize assigned categories if categorySlugs passed in payload
      const rawBody = request.body as Record<string, unknown>;
      if(Array.isArray(rawBody?.categorySlugs)){
        const slugs = rawBody.categorySlugs.map(String);
        await tx.catalogCategory.updateMany({
          where: { productTypeId: input.id, slug: { notIn: slugs } },
          data: { productTypeId: null }
        });
        if(slugs.length > 0){
          await tx.catalogCategory.updateMany({
            where: { slug: { in: slugs } },
            data: { productTypeId: input.id }
          });
        }
      }

      // Sync filterable specs to SpecDefinition for facet and search indexing in parallel
      const filterable = input.fields.filter(f => f.filterable);
      if (filterable.length > 0) {
        await Promise.all(filterable.map(f =>
          tx.specDefinition.upsert({
            where:{key:f.key},
            create:{
              key:f.key,
              title:f.title as Prisma.InputJsonValue,
              filterable:true,
              valueType:f.valueType,
              unit:f.unit||null,
              options:(f.options||[]) as Prisma.InputJsonValue,
              required:Boolean(f.required),
              card:Boolean(f.card),
              sort:typeof f.sort==='number'?f.sort:0
            },
            update:{
              title:f.title as Prisma.InputJsonValue,
              filterable:true,
              valueType:f.valueType,
              unit:f.unit||null,
              options:(f.options||[]) as Prisma.InputJsonValue,
              required:Boolean(f.required),
              card:Boolean(f.card),
              sort:typeof f.sort==='number'?f.sort:0
            }
          })
        ));
      }

      await audit(tx,config,request,{action:'type.saved',entity:'ProductType',entityId:input.id,before,after});
      return after;
    });
  });
  app.delete('/commerce/types/:id',{config:catalog},async request=>{
    const id=(request.params as {id:string}).id;
    return transaction(db,async tx=>{
      const before=await tx.productType.findUnique({where:{id}});
      if(!before)throw new ApiError(404,'not_found');
      if(await tx.product.count({where:{productTypeId:id,deletedAt:null}}))throw new ApiError(400,'type_in_use');
      if(await tx.catalogCategory.count({where:{productTypeId:id}}))throw new ApiError(400,'type_in_use');
      await tx.productType.delete({where:{id}});
      await audit(tx,config,request,{action:'type.deleted',entity:'ProductType',entityId:id,before});
      return {ok:true};
    });
  });
  app.post('/commerce/variants',{config:catalog},async request=>{
    const input=VariantEdit.parse(request.body);
    return transaction(db,async tx=>{
      const before=await tx.productVariant.findUnique({where:{id:input.id}});revision(before,input.revision);
      if(before&&before.productId!==input.productId)throw new ApiError(400,'variant_product_locked');
      if(input.priceUsd!==before?.priceUsd?.toFixed(2)&&!(input.priceUsd===null&&before?.priceUsd==null)&&!can(request.auth!.user.role,'prices.edit'))throw new ApiError(403,'forbidden');
      if(before&&before.inventoryMode!==input.inventoryMode){const movements=await tx.inventoryMovement.count({where:{variantId:before.id}}),units=await tx.inventoryUnit.count({where:{variantId:before.id}});if(movements||units||before.quantity)throw new ApiError(409,'inventory_mode_locked');}
      const p=await tx.product.findUniqueOrThrow({where:{id:input.productId}}),fields=await effectiveFields(tx,p);
      const missing=validateSpecs(fields,{...jsonObject(p.specs),...input.specs,...input.options},p.status==='published');
      if(missing.length)throw new ApiError(400,'missing_specs:'+missing.join(','));
      // التحقق من صحة مسارات الصور دفعة واحدة لتفادي استعلامات N+1
      // Batch validate image paths instead of sequential N+1 queries
      if(input.images.length>0){const found=await tx.mediaAsset.findMany({where:{originalPath:{in:input.images}},select:{originalPath:true}});const foundPaths=new Set(found.map(m=>m.originalPath));if(input.images.some(p=>!foundPaths.has(p)))throw new ApiError(400,'unknown_image');}
      const optionKey=optionIdentity(input.options);
      const {revision:_revision,...values}=input;void _revision;
      const after=await tx.productVariant.upsert({where:{id:input.id},create:{...values,optionKey},update:{...values,optionKey}});
      await audit(tx,config,request,{action:'variant.saved',entity:'ProductVariant',entityId:input.id,before,after});return after;
    });
  });
  app.delete('/commerce/variants/:id',{config:catalog},async request=>{
    const id=(request.params as {id:string}).id;
    return transaction(db,async tx=>{
      const before=await tx.productVariant.findUnique({where:{id}});
      if(!before)throw new ApiError(404,'not_found');
      if(await tx.packageItem.count({where:{variantId:id}}))throw new ApiError(400,'variant_in_use');
      const movements=await tx.inventoryMovement.count({where:{variantId:id}});
      const units=await tx.inventoryUnit.count({where:{variantId:id}});
      if(movements||units){
        const after=await tx.productVariant.update({where:{id},data:{active:false}});
        await audit(tx,config,request,{action:'variant.deactivated',entity:'ProductVariant',entityId:id,before,after});
        return {ok:true,deactivated:true};
      }
      await tx.productVariant.delete({where:{id}});
      await audit(tx,config,request,{action:'variant.deleted',entity:'ProductVariant',entityId:id,before});
      return {ok:true};
    });
  });
  app.get('/commerce/inventory',{config:inventory},async request=>{
    const query=z.object({q:z.string().default(''),page:z.coerce.number().int().positive().default(1)}).parse(request.query),where:Prisma.ProductVariantWhereInput=query.q?{OR:[{sku:{contains:query.q}},{productId:query.q}]}:{};
    return {items:await db.productVariant.findMany({where,include:{units:true,product:{select:{id:true,title:true,model:true,slug:true}}},orderBy:{sku:'asc'},skip:(query.page-1)*24,take:24}),total:await db.productVariant.count({where}),movements:await db.inventoryMovement.findMany({include:{variant:{select:{sku:true,product:{select:{title:true}}}},user:{select:{name:true,email:true}}},orderBy:{createdAt:'desc'},take:100})};
  });
  app.post('/commerce/inventory/adjust',{config:inventory},async request=>{
    const input=z.object({variantId:z.string(),delta:z.number().int().min(-100000).max(100000),reason:z.string().trim().min(5).max(500),revision:z.string()}).parse(request.body);
    return transaction(db,async tx=>{const v=await tx.productVariant.findUniqueOrThrow({where:{id:input.variantId}});revision(v,input.revision);if(v.inventoryMode!=='quantity')throw new ApiError(400,'serialized_inventory');if(v.quantity+input.delta<0)throw new ApiError(409,'negative_stock');await tx.productVariant.update({where:{id:v.id},data:{quantity:{increment:input.delta},inventoryReviewed:true}});await tx.inventoryMovement.create({data:{variantId:v.id,delta:input.delta,reason:input.reason,userId:request.auth!.user.id}});await audit(tx,config,request,{action:'inventory.adjusted',entity:'ProductVariant',entityId:v.id,before:{quantity:v.quantity},after:{quantity:v.quantity+input.delta,reason:input.reason}});return {ok:true};}, 'Serializable');
  });
  app.post('/commerce/units',{config:inventory},async request=>{
    const input=UnitEdit.parse(request.body);
    return transaction(db,async tx=>{const before=await tx.inventoryUnit.findUnique({where:{id:input.id}});revision(before,input.revision);if(before?.soldOrderId)throw new ApiError(409,'unit_sold');if(before&&before.variantId!==input.variantId)throw new ApiError(400,'unit_variant_locked');const v=await tx.productVariant.findUniqueOrThrow({where:{id:input.variantId}});if(v.inventoryMode!=='serialized')throw new ApiError(400,'quantity_inventory');for(const path of input.images)if(!await tx.mediaAsset.findFirst({where:{originalPath:path}}))throw new ApiError(400,'unknown_image');const {revision:_r,...data}=input;void _r;const after=await tx.inventoryUnit.upsert({where:{id:input.id},create:data,update:data});await tx.productVariant.update({where:{id:v.id},data:{inventoryReviewed:true}});if(!before)await tx.inventoryMovement.create({data:{variantId:v.id,unitId:input.id,delta:1,userId:request.auth!.user.id,reason:'Individual unit received and inspected'}});await audit(tx,config,request,{action:'unit.saved',entity:'InventoryUnit',entityId:input.id,before,after});return after;}, 'Serializable');
  });
  app.delete('/commerce/units/:id',{config:inventory},async request=>{
    const id=(request.params as {id:string}).id;
    return transaction(db,async tx=>{
      const before=await tx.inventoryUnit.findUnique({where:{id}});
      if(!before)throw new ApiError(404,'not_found');
      if(before.soldOrderId)throw new ApiError(409,'unit_sold');
      await tx.inventoryMovement.deleteMany({where:{unitId:id}});
      await tx.inventoryUnit.delete({where:{id}});
      await audit(tx,config,request,{action:'unit.deleted',entity:'InventoryUnit',entityId:id,before});
      return {ok:true};
    });
  });
  app.post('/commerce/collections',{config:catalog},async request=>{
    const input=CollectionEdit.parse(request.body);
    const res = await transaction(db,async tx=>{
      const before=await tx.catalogCollection.findUnique({where:{id:input.id}});revision(before,input.revision);
      const {productIds,revision:_r,...data}=input;void _r;
      const after=await tx.catalogCollection.upsert({where:{id:input.id},create:data,update:data});
      await tx.collectionProduct.deleteMany({where:{collectionId:input.id}});
      const uniqueProductIds = [...new Set(productIds)];
      if (uniqueProductIds.length > 0) {
        await tx.collectionProduct.createMany({
          data: uniqueProductIds.map(productId => ({ collectionId: input.id, productId })),
          skipDuplicates: true
        });
      }
      await audit(tx,config,request,{action:'collection.saved',entity:'CatalogCollection',entityId:input.id,before,after});
      return after;
    });
    invalidateCatalogCache();
    return res;
  });
  app.delete('/commerce/collections/:id',{config:catalog},async request=>{
    const id=(request.params as {id:string}).id;
    const res = await transaction(db,async tx=>{
      const before=await tx.catalogCollection.findUnique({where:{id}});
      if(!before)throw new ApiError(404,'not_found');
      await tx.collectionProduct.deleteMany({where:{collectionId:id}});
      await tx.catalogCollection.delete({where:{id}});
      await audit(tx,config,request,{action:'collection.deleted',entity:'CatalogCollection',entityId:id,before});
      return {ok:true};
    });
    invalidateCatalogCache();
    return res;
  });
  app.post('/commerce/packages',{config:catalog},async request=>{
    const input=PackageEdit.parse(request.body);
    const res = await transaction(db,async tx=>{
      const before=await tx.catalogPackage.findUnique({where:{id:input.id}});revision(before,input.revision);
      if(input.priceUsd!==before?.priceUsd?.toFixed(2)&&!(input.priceUsd===null&&before?.priceUsd==null)&&!can(request.auth!.user.role,'prices.edit'))throw new ApiError(403,'forbidden');
      if(new Set(input.items.map(i=>i.variantId)).size!==input.items.length)throw new ApiError(400,'duplicate_component');
      const {items,revision:_r,...data}=input;void _r;
      const after=await tx.catalogPackage.upsert({where:{id:input.id},create:data,update:data});
      await tx.packageItem.deleteMany({where:{packageId:input.id}});
      if (items.length > 0) {
        await tx.packageItem.createMany({
          data: items.map(item => ({ packageId: input.id, ...item })),
          skipDuplicates: true
        });
      }
      await audit(tx,config,request,{action:'package.saved',entity:'CatalogPackage',entityId:input.id,before,after});
      return after;
    });
    invalidateCatalogCache();
    return res;
  });
  app.delete('/commerce/packages/:id',{config:catalog},async request=>{
    const id=(request.params as {id:string}).id;
    const res = await transaction(db,async tx=>{
      const before=await tx.catalogPackage.findUnique({where:{id}});
      if(!before)throw new ApiError(404,'not_found');
      await tx.packageItem.deleteMany({where:{packageId:id}});
      await tx.catalogPackage.delete({where:{id}});
      await audit(tx,config,request,{action:'package.deleted',entity:'CatalogPackage',entityId:id,before});
      return {ok:true};
    });
    invalidateCatalogCache();
    return res;
  });
  app.get('/commerce/orders',{config:orders},async request=>{
    const q=z.object({page:z.coerce.number().int().positive().default(1),q:z.string().default(''),status:z.enum(OrderStatuses).optional()}).parse(request.query),
      where:Prisma.CommerceOrderWhereInput={
        ...(q.status?{status:q.status}:{}),
        ...(q.q?{OR:[{number:{contains:q.q}},{customer:{phone:{contains:q.q}}},{customer:{name:{contains:q.q}}}]}:{})
      };
    return {items:await db.commerceOrder.findMany({where,skip:(q.page-1)*24,take:24,orderBy:{createdAt:'desc'}}),total:await db.commerceOrder.count({where})};
  });
  app.post('/commerce/orders/:id/status',{config:orders},async request=>{const input=z.object({status:z.enum(OrderStatuses),revision:z.string()}).parse(request.body);return changeOrder(db,config,request,(request.params as {id:string}).id,input.status,input.revision);});
  app.delete('/commerce/orders/:id',{config:orders},async request=>{
    const id=(request.params as {id:string}).id;
    return transaction(db,async tx=>{
      const order=await tx.commerceOrder.findUnique({where:{id}});
      if(!order)throw new ApiError(404,'not_found');
      if(order.status==='completed')throw new ApiError(409,'completed_order_cannot_be_deleted');
      await tx.commerceOrder.delete({where:{id}});
      await audit(tx,config,request,{action:'order.deleted',entity:'CommerceOrder',entityId:id,before:{number:order.number}});
      return {ok:true};
    });
  });
  app.get('/commerce/customers',{config:{permission:'customers.manage'}},async request=>{
    const q=z.object({q:z.string().default(''),page:z.coerce.number().int().positive().default(1)}).parse(request.query),where:Prisma.CustomerAccountWhereInput=q.q?{OR:[{phone:{contains:q.q}},{name:{contains:q.q}}]}:{};
    return {items:await db.customerAccount.findMany({where,skip:(q.page-1)*24,take:24,select:{id:true,name:true,phone:true,phoneVerified:true,active:true,createdAt:true,_count:{select:{orders:true}}}}),total:await db.customerAccount.count({where})};
  });
  app.post('/commerce/customers/:id/recovery',{config:{permission:'customers.manage'}},async request=>{
    const input=z.object({verificationNote:z.string().trim().min(10).max(500)}).parse(request.body),customerId=(request.params as {id:string}).id,token=randomToken();
    await transaction(db,async tx=>{await tx.customerReset.deleteMany({where:{customerId,usedAt:null}});await tx.customerReset.create({data:{id:hashToken(token),customerId,expiresAt:new Date(Date.now()+30*60000)}});await audit(tx,config,request,{action:'customer.recovery_issued',entity:'CustomerAccount',entityId:customerId,after:{verificationNote:input.verificationNote}});});
    return {token,expiresInMinutes:30};
  });
  app.get('/commerce/pricing',{config:{permission:'prices.edit'}},async()=>{
    const configRow=await db.pricingConfig.findUnique({where:{id:1}});
    // استعلام محدد بحد أقصى (500) لمنع استنزاف الذاكرة
    // Bounded product query with limit (take: 500) to prevent unbounded memory usage
    const products=await db.product.findMany({
      where:{deletedAt:null},
      take:500,
      include:{
        brand:{select:{id:true,name:true}},
        images:{take:1,include:{media:{select:{originalPath:true}}}},
        variants:{where:{active:true},include:{units:{select:{available:true}}}}
      },
      orderBy:{updatedAt:'desc'}
    });
    const rate=configRow?.usdToYer?Number(configRow.usdToYer):null;
    let pricedCount=0,unpricedCount=0,negotiableCount=0;
    const items=products.flatMap(p=>{
      const prodImg=p.images[0]?.media?.originalPath??null;
      if(p.negotiable)negotiableCount++;
      return p.variants.map(v=>{
        const vPrice=v.priceUsd!==null?Number(v.priceUsd):(p.priceUsd!==null?Number(p.priceUsd):null);
        if(vPrice!==null&&vPrice>0)pricedCount++;else unpricedCount++;
        const priceYer=vPrice!==null&&rate?Math.round(vPrice*rate):null;
        const availableUnits=v.units?.filter(u=>u.available).length??0;
        // قراءة originalPriceUsd من العمود الحقيقي أولاً، ثم fallback لـ specs (JSON)
        // Read originalPriceUsd from real column first, then fallback to specs JSON
        let origUsd:number|null=null;
        if(v.originalPriceUsd!==null&&v.originalPriceUsd!==undefined){
          origUsd=Number(v.originalPriceUsd);
        }else if(p.originalPriceUsd!==null&&p.originalPriceUsd!==undefined){
          origUsd=Number(p.originalPriceUsd);
        }else{
          const vSpecs=(v.specs||{}) as Record<string,unknown>;
          const pSpecs=(p.specs||{}) as Record<string,unknown>;
          const specOrig=vSpecs.originalPriceUsd??pSpecs.originalPriceUsd;
          if(specOrig&&!isNaN(Number(specOrig)))origUsd=Number(specOrig);
        }
        const discountPct:number|null=
          v.discountPercent!==null&&v.discountPercent!==undefined?Number(v.discountPercent):
          p.discountPercent!==null&&p.discountPercent!==undefined?Number(p.discountPercent):
          (origUsd&&vPrice&&origUsd>vPrice)?Math.round(((origUsd-vPrice)/origUsd)*100):null;
        const origYer=origUsd&&rate?Math.round(origUsd*rate):null;
        return {
          productId:p.id,
          variantId:v.id,
          sku:v.sku,
          model:p.model,
          title:p.title,
          category:p.category,
          brand:p.brand?.name??'',
          condition:v.condition,
          inventoryMode:v.inventoryMode,
          quantity:v.quantity,
          availableUnits,
          priceUsd:vPrice!==null?String(vPrice):null,
          originalPriceUsd:origUsd!==null?String(origUsd):null,
          priceYer,
          originalPriceYer:origYer,
          discountPercent:discountPct,
          negotiable:p.negotiable,
          status:p.status,
          image:prodImg
        };
      });
    });
    return {
      usdToYer:configRow?.usdToYer?String(configRow.usdToYer):null,
      whatsapp:configRow?.whatsapp??null,
      updatedAt:configRow?.updatedAt?.toISOString()??null,
      stats:{
        totalProducts:products.length,
        totalVariants:items.length,
        pricedCount,
        unpricedCount,
        negotiableCount
      },
      items
    };
  });
  app.post('/commerce/pricing',{config:{permission:'prices.edit'}},async request=>{
    const raw=request.body as Record<string,unknown>;
    let cleanWhatsapp:string|null=null;
    if(typeof raw?.whatsapp==='string'&&raw.whatsapp.trim().length>0){
      let w=raw.whatsapp.trim().replace(/[\s+()-]/g,'');
      if(w.startsWith('00'))w=w.slice(2);
      if(/^7\d{8}$/.test(w))w='967'+w;
      if(/^[1-9]\d{7,14}$/.test(w))cleanWhatsapp=w;
    }
    let cleanRate:string|null=null;
    if(raw?.usdToYer!==null&&raw?.usdToYer!==undefined&&String(raw.usdToYer).trim()!==''){
      const num=Number(String(raw.usdToYer).trim());
      if(!isNaN(num)&&num>0)cleanRate=String(num);
    }
    return transaction(db,async tx=>{
      const before=await tx.pricingConfig.findUnique({where:{id:1}});
      const after=await tx.pricingConfig.upsert({
        where:{id:1},
        create:{id:1,usdToYer:cleanRate,whatsapp:cleanWhatsapp},
        update:{usdToYer:cleanRate,whatsapp:cleanWhatsapp}
      });
      await audit(tx,config,request,{action:'pricing.saved',entity:'PricingConfig',before,after});
      return {
        usdToYer:after.usdToYer?String(after.usdToYer):null,
        whatsapp:after.whatsapp,
        updatedAt:after.updatedAt.toISOString()
      };
    });
  });
  app.post('/commerce/pricing/item',{config:{permission:'prices.edit'}},async request=>{
    const input=z.object({
      variantId:z.string(),
      priceUsd:z.union([z.string(),z.number()]).nullable(),
      originalPriceUsd:z.union([z.string(),z.number()]).nullable().optional(),
      negotiable:z.boolean().optional()
    }).parse(request.body);
    const price=input.priceUsd!==null&&input.priceUsd!==''&&!isNaN(Number(input.priceUsd))
      ?new Prisma.Decimal(Number(input.priceUsd).toFixed(2))
      :null;
    const origPrice=input.originalPriceUsd!==null&&input.originalPriceUsd!==undefined&&input.originalPriceUsd!==''&&!isNaN(Number(input.originalPriceUsd))
      ?new Prisma.Decimal(Number(input.originalPriceUsd).toFixed(2))
      :null;
    const discountPct=(origPrice&&price&&Number(origPrice)>Number(price))
      ?new Prisma.Decimal(((Number(origPrice)-Number(price))/Number(origPrice)*100).toFixed(2))
      :null;
    return transaction(db,async tx=>{
      const variant=await tx.productVariant.findUniqueOrThrow({where:{id:input.variantId},include:{product:true}});
      // كتابة السعر الأصلي والخصم إلى الأعمدة الحقيقية (وتحديث specs للتوافق مع الكود القديم)
      // Write to real columns + keep specs in sync for backward compatibility
      const currentSpecs=(variant.specs||{}) as Record<string,unknown>;
      const newSpecs={...currentSpecs,originalPriceUsd:origPrice?Number(origPrice):null};
      await tx.productVariant.update({
        where:{id:input.variantId},
        data:{
          priceUsd:price,
          originalPriceUsd:origPrice,
          discountPercent:discountPct,
          specs:newSpecs as Prisma.InputJsonValue
        }
      });
      const prodUpdates:Prisma.ProductUpdateInput={};
      if(price!==null)prodUpdates.priceUsd=price;
      if(origPrice!==null){prodUpdates.originalPriceUsd=origPrice;prodUpdates.discountPercent=discountPct;}
      if(input.negotiable!==undefined)prodUpdates.negotiable=input.negotiable;
      prodUpdates.priceUpdatedAt=new Date();
      const currentProdSpecs=(variant.product.specs||{}) as Record<string,unknown>;
      prodUpdates.specs={...currentProdSpecs,originalPriceUsd:origPrice?Number(origPrice):null} as Prisma.InputJsonValue;
      await tx.product.update({where:{id:variant.productId},data:prodUpdates});
      // تسجيل في سجل الأسعار مع تفاصيل الخصم
      // Log to price history with discount details
      if(price!==null||origPrice!==null){
        const changeType=price!==null&&origPrice!==null?'both':price!==null?'price':'discount';
        await tx.priceHistory.create({
          data:{
            productId:variant.productId,
            priceUsd:price,
            originalPriceUsd:origPrice,
            discountPercent:discountPct,
            changedBy:request.auth!.user.id,
            reason:'pricing_hub_update',
            changeType
          }
        });
      }
      await audit(tx,config,request,{
        action:'pricing.item_updated',
        entity:'ProductVariant',
        entityId:variant.id,
        before:{priceUsd:variant.priceUsd,originalPriceUsd:variant.originalPriceUsd},
        after:{priceUsd:price,originalPriceUsd:origPrice,discountPercent:discountPct,negotiable:input.negotiable}
      });
      return {ok:true,variantId:variant.id,priceUsd:price?String(price):null,originalPriceUsd:origPrice?String(origPrice):null};
    });
  });
  app.post('/commerce/pricing/batch',{config:{permission:'prices.edit'}},async request=>{
    const input=z.object({
      action:z.enum(['set_prices','adjust_percent','seed_defaults','set_fixed','apply_discount','clear_discounts','adjust_price']),
      percent:z.number().optional(),
      fixedPrice:z.number().optional(),
      fixedAmount:z.number().optional(),
      priceMin:z.number().optional(),    // نطاق سعر البداية (فلتر)
      priceMax:z.number().optional(),    // نطاق سعر النهاية (فلتر)
      category:z.string().optional(),
      variantIds:z.array(z.string()).optional(),
      updates:z.array(z.object({
        variantId:z.string(),
        priceUsd:z.union([z.string(),z.number()]).nullable(),
        originalPriceUsd:z.union([z.string(),z.number()]).nullable().optional(),
        negotiable:z.boolean().optional()
      })).optional()
    }).parse(request.body);
    return transaction(db,async tx=>{
      let updatedCount=0;
      const userId=request.auth!.user.id;

      // ─── مسح كل الخصومات ─── (clear_discounts)
      if(input.action==='clear_discounts'){
        const where:Prisma.ProductVariantWhereInput={
          active:true,
          ...(input.variantIds?.length?{id:{in:input.variantIds}}:{}),
          ...(input.category&&input.category!=='all'?{product:{category:input.category}}:{})
        };
        const variants=await tx.productVariant.findMany({where,include:{product:true}});
        // تجميع المتغيرات حسب المنتج لتحديث المنتج مرة واحدة فقط
        const productIds=new Set<string>();
        await Promise.all(variants.map(async v=>{
          const vSpecs=(v.specs||{}) as Record<string,unknown>;
          const cleanSpecs={...vSpecs};
          delete cleanSpecs.originalPriceUsd;
          await tx.productVariant.update({
            where:{id:v.id},
            data:{originalPriceUsd:null,discountPercent:null,specs:cleanSpecs as Prisma.InputJsonValue}
          });
          productIds.add(v.productId);
          updatedCount++;
        }));
        // تحديث جدول Product لكل منتج متأثر
        await Promise.all(Array.from(productIds).map(async pid=>{
          const prod=variants.find(v=>v.productId===pid)?.product;
          if(!prod)return;
          const pSpecs=(prod.specs||{}) as Record<string,unknown>;
          const cleanProdSpecs={...pSpecs};
          delete cleanProdSpecs.originalPriceUsd;
          await tx.product.update({
            where:{id:pid},
            data:{originalPriceUsd:null,discountPercent:null,specs:cleanProdSpecs as Prisma.InputJsonValue}
          });
        }));
        // تسجيل في PriceHistory
        await Promise.all(Array.from(productIds).map(pid=>
          tx.priceHistory.create({data:{productId:pid,changedBy:userId,reason:'clear_discounts',changeType:'discount'}})
        ));

      // ─── تعديل السعر الأصلي بالنسبة أو المبلغ ─── (adjust_price)
      }else if(input.action==='adjust_price'){
        const where:Prisma.ProductVariantWhereInput={
          active:true,
          priceUsd:{not:null},
          ...(input.variantIds?.length?{id:{in:input.variantIds}}:{}),
          ...(input.category&&input.category!=='all'?{product:{category:input.category}}:{}),
          ...(input.priceMin!==undefined||input.priceMax!==undefined?{
            priceUsd:{
              ...(input.priceMin!==undefined?{gte:new Prisma.Decimal(input.priceMin)}:{}),
              ...(input.priceMax!==undefined?{lte:new Prisma.Decimal(input.priceMax)}:{})
            }
          }:{})
        };
        const variants=await tx.productVariant.findMany({where,include:{product:true}});
        await Promise.all(variants.map(async v=>{
          if(!v.priceUsd)return;
          const oldPrice=Number(v.priceUsd);
          let newPrice:number;
          if(typeof input.percent==='number'&&input.percent!==0){
            newPrice=Math.max(1,parseFloat((oldPrice*(1+input.percent/100)).toFixed(2)));
          }else if(typeof input.fixedAmount==='number'&&input.fixedAmount!==0){
            newPrice=Math.max(1,parseFloat((oldPrice+input.fixedAmount).toFixed(2)));
          }else return;
          const newPriceDecimal=new Prisma.Decimal(newPrice.toFixed(2));
          // إعادة حساب discountPercent إذا كان هناك سعر أصلي
          const origUsd=v.originalPriceUsd?Number(v.originalPriceUsd):null;
          const newDiscount=origUsd&&origUsd>newPrice?new Prisma.Decimal(((origUsd-newPrice)/origUsd*100).toFixed(2)):null;
          await Promise.all([
            tx.productVariant.update({where:{id:v.id},data:{priceUsd:newPriceDecimal,discountPercent:newDiscount}}),
            tx.product.update({where:{id:v.productId},data:{priceUsd:newPriceDecimal,priceUpdatedAt:new Date(),discountPercent:newDiscount}})
          ]);
          await tx.priceHistory.create({data:{
            productId:v.productId,
            priceUsd:newPriceDecimal,
            originalPriceUsd:v.originalPriceUsd,
            discountPercent:newDiscount,
            changedBy:userId,
            reason:`adjust_price:${input.percent!==undefined?`${input.percent}%`:`$${input.fixedAmount}`}`,
            changeType:'price'
          }});
          updatedCount++;
        }));

      // ─── تطبيق خصم بنسبة % ─── (apply_discount)
      }else if(input.action==='apply_discount'&&typeof input.percent==='number'){
        const discountPct=Math.max(1,Math.min(90,input.percent));
        const factor=1-(discountPct/100);
        const where:Prisma.ProductVariantWhereInput={
          active:true,
          priceUsd:{not:null},
          ...(input.variantIds?.length?{id:{in:input.variantIds}}:{}),
          ...(input.category&&input.category!=='all'?{product:{category:input.category}}:{}),
          ...(input.priceMin!==undefined||input.priceMax!==undefined?{
            priceUsd:{
              ...(input.priceMin!==undefined?{gte:new Prisma.Decimal(input.priceMin)}:{}),
              ...(input.priceMax!==undefined?{lte:new Prisma.Decimal(input.priceMax)}:{})
            }
          }:{})
        };
        const variants=await tx.productVariant.findMany({where,include:{product:true}});
        await Promise.all(variants.map(async v=>{
          if(!v.priceUsd)return;
          const currentPrice=Number(v.priceUsd);
          // السعر الحالي يصبح السعر الأصلي إذا لم يكن هناك سعر أصلي مسبق
          const existingOrig=v.originalPriceUsd?Number(v.originalPriceUsd):null;
          const baseAnchor=existingOrig&&existingOrig>currentPrice?existingOrig:currentPrice;
          const discountedPrice=new Prisma.Decimal(Math.max(1,Math.round(baseAnchor*factor)).toFixed(2));
          const origPriceDecimal=new Prisma.Decimal(baseAnchor.toFixed(2));
          const realDiscountPct=new Prisma.Decimal(((baseAnchor-Number(discountedPrice))/baseAnchor*100).toFixed(2));
          const vSpecs=(v.specs||{}) as Record<string,unknown>;
          const pSpecs=(v.product.specs||{}) as Record<string,unknown>;
          await Promise.all([
            tx.productVariant.update({where:{id:v.id},data:{
              priceUsd:discountedPrice,
              originalPriceUsd:origPriceDecimal,
              discountPercent:realDiscountPct,
              specs:{...vSpecs,originalPriceUsd:baseAnchor} as Prisma.InputJsonValue
            }}),
            tx.product.update({where:{id:v.productId},data:{
              priceUsd:discountedPrice,
              originalPriceUsd:origPriceDecimal,
              discountPercent:realDiscountPct,
              priceUpdatedAt:new Date(),
              specs:{...pSpecs,originalPriceUsd:baseAnchor} as Prisma.InputJsonValue
            }})
          ]);
          await tx.priceHistory.create({data:{
            productId:v.productId,
            priceUsd:discountedPrice,
            originalPriceUsd:origPriceDecimal,
            discountPercent:realDiscountPct,
            changedBy:userId,
            reason:`apply_discount:${discountPct}%`,
            changeType:'both'
          }});
          updatedCount++;
        }));

      // ─── تعديل السعر بنسبة (للسعر الأصلي فقط) ─── (adjust_percent — legacy)
      }else if(input.action==='adjust_percent'&&typeof input.percent==='number'){
        const factor=1+(input.percent/100);
        const where:Prisma.ProductVariantWhereInput={
          active:true,
          priceUsd:{not:null},
          ...(input.variantIds?.length?{id:{in:input.variantIds}}:{}),
          ...(input.category&&input.category!=='all'?{product:{category:input.category}}:{})
        };
        const variants=await tx.productVariant.findMany({where,include:{product:true}});
        await Promise.all(variants.map(async v=>{
          if(!v.priceUsd)return;
          const newPrice=new Prisma.Decimal((Number(v.priceUsd)*factor).toFixed(2));
          const origUsd=v.originalPriceUsd?Number(v.originalPriceUsd):null;
          const newDiscount=origUsd&&Number(origUsd)>Number(newPrice)?new Prisma.Decimal(((origUsd-Number(newPrice))/origUsd*100).toFixed(2)):null;
          await Promise.all([
            tx.productVariant.update({where:{id:v.id},data:{priceUsd:newPrice,discountPercent:newDiscount}}),
            tx.product.update({where:{id:v.productId},data:{priceUsd:newPrice,priceUpdatedAt:new Date(),discountPercent:newDiscount}})
          ]);
          await tx.priceHistory.create({data:{
            productId:v.productId,
            priceUsd:newPrice,
            originalPriceUsd:v.originalPriceUsd,
            discountPercent:newDiscount,
            changedBy:userId,
            reason:`adjust_percent:${input.percent}%`,
            changeType:'price'
          }});
          updatedCount++;
        }));

      // ─── تعيين سعر ثابت ─── (set_fixed)
      }else if(input.action==='set_fixed'&&typeof input.fixedPrice==='number'){
        const price=new Prisma.Decimal(input.fixedPrice.toFixed(2));
        const ids=input.variantIds||[];
        if(!ids.length)throw new ApiError(400,'variant_ids_required');
        const variants=await tx.productVariant.findMany({where:{id:{in:ids}},include:{product:true}});
        await Promise.all(variants.map(async v=>{
          const origUsd=v.originalPriceUsd?Number(v.originalPriceUsd):null;
          const newDiscount=origUsd&&origUsd>input.fixedPrice!?new Prisma.Decimal(((origUsd-input.fixedPrice!)/origUsd*100).toFixed(2)):null;
          await Promise.all([
            tx.productVariant.update({where:{id:v.id},data:{priceUsd:price,discountPercent:newDiscount}}),
            tx.product.update({where:{id:v.productId},data:{priceUsd:price,priceUpdatedAt:new Date(),discountPercent:newDiscount}})
          ]);
          await tx.priceHistory.create({data:{
            productId:v.productId,
            priceUsd:price,
            originalPriceUsd:v.originalPriceUsd,
            discountPercent:newDiscount,
            changedBy:userId,
            reason:`set_fixed:${input.fixedPrice}`,
            changeType:'price'
          }});
          updatedCount++;
        }));

      // ─── تسعير مقترح افتراضي ─── (seed_defaults)
      }else if(input.action==='seed_defaults'){
        const defaultCategoryPrices:Record<string,number>={
          laptops:350,displays:280,audio:45,gaming:850,network:110,storage:85,'hard-drives':75,power:65,printers:220,cameras:180,accessories:35
        };
        const specificProductPrices:Record<string,number>={
          'lap-thinkpad-t490s-001':320,
          'lap-elitebook-840-g7-002':380,
          'lap-latitude-7420-003':430,
          'disp-dell-u2722de-004':290,
          'aud-logitech-g432-005':45,
          'gam-asus-rog-zephyrus-g14-006':850,
          'net-tplink-deco-x50-007':110,
          'sto-samsung-980-pro-008':85,
          'pow-apc-back-ups-650va-009':65,
          'lap-thinkpad-p1-gen4-010':980
        };
        const products=await tx.product.findMany({where:{deletedAt:null},include:{variants:true}});
        for(const p of products){
          const basePrice=specificProductPrices[p.id]??defaultCategoryPrices[p.category]??120;
          const origPrice=Math.ceil((basePrice*1.15)/5)*5;
          const pPrice=new Prisma.Decimal(basePrice);
          const origPriceDecimal=new Prisma.Decimal(origPrice);
          const discountPct=new Prisma.Decimal(((origPrice-basePrice)/origPrice*100).toFixed(2));
          const pSpecs=(p.specs||{}) as Record<string,unknown>;
          await tx.product.update({where:{id:p.id},data:{
            priceUsd:pPrice,
            originalPriceUsd:origPriceDecimal,
            discountPercent:discountPct,
            priceUpdatedAt:new Date(),
            specs:{...pSpecs,originalPriceUsd:origPrice} as Prisma.InputJsonValue
          }});
          await Promise.all(p.variants.map(v=>{
            const vSpecs=(v.specs||{}) as Record<string,unknown>;
            return tx.productVariant.update({where:{id:v.id},data:{
              priceUsd:pPrice,
              originalPriceUsd:origPriceDecimal,
              discountPercent:discountPct,
              specs:{...vSpecs,originalPriceUsd:origPrice} as Prisma.InputJsonValue
            }});
          }));
          await tx.priceHistory.create({data:{
            productId:p.id,
            priceUsd:pPrice,
            originalPriceUsd:origPriceDecimal,
            discountPercent:discountPct,
            changedBy:userId,
            reason:'seed_defaults',
            changeType:'both'
          }});
          updatedCount+=p.variants.length;
        }

      // ─── تحديث أسعار يدوي (set_prices) ─── (legacy bulk)
      }else if(input.action==='set_prices'&&input.updates){
        const variantIds=input.updates.map(u=>u.variantId);
        const allVariants=await tx.productVariant.findMany({where:{id:{in:variantIds}},include:{product:true}});
        const variantMap=new Map(allVariants.map(v=>[v.id,v]));
        const byProduct=new Map<string,typeof input.updates>();
        for(const u of input.updates){
          const v=variantMap.get(u.variantId);
          if(!v)continue;
          const list=byProduct.get(v.productId)??[];
          list.push(u);
          byProduct.set(v.productId,list);
        }
        for(const [productId,updates] of byProduct){
          await Promise.all(updates.map(async u=>{
            const v=variantMap.get(u.variantId)!;
            const price=u.priceUsd!==null&&u.priceUsd!==''&&!isNaN(Number(u.priceUsd))
              ?new Prisma.Decimal(Number(u.priceUsd).toFixed(2)):null;
            const origPrice=u.originalPriceUsd!==null&&u.originalPriceUsd!==undefined&&u.originalPriceUsd!==''&&!isNaN(Number(u.originalPriceUsd))
              ?new Prisma.Decimal(Number(u.originalPriceUsd).toFixed(2)):null;
            const discountPct=origPrice&&price&&Number(origPrice)>Number(price)
              ?new Prisma.Decimal(((Number(origPrice)-Number(price))/Number(origPrice)*100).toFixed(2)):null;
            const currentSpecs=(v.specs||{}) as Record<string,unknown>;
            const newSpecs={...currentSpecs,originalPriceUsd:origPrice?Number(origPrice):null};
            await tx.productVariant.update({where:{id:v.id},data:{priceUsd:price,originalPriceUsd:origPrice,discountPercent:discountPct,specs:newSpecs as Prisma.InputJsonValue}});
            updatedCount++;
          }));
          const lastUpdate=updates[updates.length-1];
          const lastVariant=variantMap.get(lastUpdate.variantId)!;
          const lastPrice=lastUpdate.priceUsd!==null&&lastUpdate.priceUsd!==''&&!isNaN(Number(lastUpdate.priceUsd))
            ?new Prisma.Decimal(Number(lastUpdate.priceUsd).toFixed(2)):null;
          const lastOrigPrice=lastUpdate.originalPriceUsd!==null&&lastUpdate.originalPriceUsd!==undefined&&lastUpdate.originalPriceUsd!==''&&!isNaN(Number(lastUpdate.originalPriceUsd))
            ?new Prisma.Decimal(Number(lastUpdate.originalPriceUsd).toFixed(2)):null;
          const lastDiscountPct=lastOrigPrice&&lastPrice&&Number(lastOrigPrice)>Number(lastPrice)
            ?new Prisma.Decimal(((Number(lastOrigPrice)-Number(lastPrice))/Number(lastOrigPrice)*100).toFixed(2)):null;
          const currentProdSpecs=(lastVariant.product.specs||{}) as Record<string,unknown>;
          const newProdSpecs={...currentProdSpecs,originalPriceUsd:lastOrigPrice?Number(lastOrigPrice):null};
          if(lastPrice!==null||lastUpdate.negotiable!==undefined||lastOrigPrice!==null){
            await tx.product.update({
              where:{id:productId},
              data:{
                ...(lastPrice!==null?{priceUsd:lastPrice,priceUpdatedAt:new Date()}:{}),
                ...(lastOrigPrice!==null?{originalPriceUsd:lastOrigPrice,discountPercent:lastDiscountPct}:{}),
                ...(lastUpdate.negotiable!==undefined?{negotiable:lastUpdate.negotiable}:{}),
                specs:newProdSpecs as Prisma.InputJsonValue
              }
            });
          }
        }
      }

      await audit(tx,config,request,{action:'pricing.batch_updated',entity:'PricingConfig',entityId:'1',after:{action:input.action,updatedCount}});
      return {ok:true,updatedCount};
    });
  });

  // ─── سجل تاريخ الأسعار ─── GET /commerce/pricing/history
  app.get('/commerce/pricing/history',{config:{permission:'prices.edit'}},async request=>{
    const q=z.object({
      productId:z.string().optional(),
      category:z.string().optional(),
      changeType:z.enum(['price','discount','both','clear_discounts']).optional(),
      from:z.string().optional(),
      to:z.string().optional(),
      page:z.coerce.number().int().positive().default(1),
      pageSize:z.coerce.number().int().positive().max(200).default(50)
    }).parse(request.query);
    const where:Prisma.PriceHistoryWhereInput={
      ...(q.productId?{productId:q.productId}:{}),
      ...(q.changeType?{changeType:q.changeType}:{}),
      ...(q.from||q.to?{changedAt:{...(q.from?{gte:new Date(q.from)}:{}),...(q.to?{lte:new Date(q.to)}:{})}}:{}),
      ...(q.category?{product:{category:q.category}}:{})
    };
    const [total,items]=await Promise.all([
      db.priceHistory.count({where}),
      db.priceHistory.findMany({
        where,
        include:{
          product:{select:{title:true,model:true,category:true,slug:true}},
          user:{select:{name:true,role:true}}
        },
        orderBy:{changedAt:'desc'},
        skip:(q.page-1)*q.pageSize,
        take:q.pageSize
      })
    ]);
    return {total,page:q.page,pageSize:q.pageSize,items};
  });
  app.post('/commerce/bulk',{config:catalog},async request=>{
    const input=z.object({ids:z.array(z.string()).min(1).max(200),action:z.enum(['published','archived','delete','collection']),collectionId:z.string().optional()}).parse(request.body);
    if(input.action!=='collection'&&!can(request.auth!.user.role,'catalog.publish'))throw new ApiError(403,'forbidden');
    return transaction(db,async tx=>{
      // جلب جميع المنتجات مسبقاً بدفعة واحدة لتفادي مشكلة N+1 داخل المعاملة
      // Batch-fetch all products upfront to avoid N+1 queries inside the transaction
      const allProducts=await tx.product.findMany({where:{id:{in:input.ids}},include:{images:true,variants:true,brand:true}});
      const productMap=new Map(allProducts.map(p=>[p.id,p]));
      for(const id of input.ids){
        const p=productMap.get(id);
        if(!p)throw new ApiError(404,'not_found');
        if(input.action==='published'){
          const c=await tx.catalogCategory.findUniqueOrThrow({where:{slug:p.category}});
          if(!p.images.length||!p.brand.published||c.status!=='published'||!p.variants.some(v=>v.active))throw new ApiError(400,'publish_incomplete');
          for(const v of p.variants.filter(v=>v.active)){
            if(validateSpecs(await effectiveFields(tx,p),{...jsonObject(p.specs),...jsonObject(v.specs),...jsonObject(v.options)},true).length)throw new ApiError(400,'publish_incomplete');
          }
          await tx.product.update({where:{id},data:{status:'published',publishedAt:p.publishedAt??new Date()}});
          await audit(tx,config,request,{action:'catalog.bulk_published',entity:'Product',entityId:id});
        }else if(input.action==='collection'){
          if(!input.collectionId)throw new ApiError(400,'unknown_collection');
          await tx.collectionProduct.upsert({where:{collectionId_productId:{collectionId:input.collectionId,productId:id}},create:{collectionId:input.collectionId,productId:id},update:{}});
          await audit(tx,config,request,{action:'catalog.bulk_collection',entity:'Product',entityId:id});
        }else if(input.action==='delete'){
          await tx.product.update({where:{id},data:{deletedAt:new Date(),status:'archived'}});
          await audit(tx,config,request,{action:'catalog.bulk_delete',entity:'Product',entityId:id});
        }else{
          await tx.product.update({where:{id},data:{status:input.action}});
          await audit(tx,config,request,{action:'catalog.bulk_'+input.action,entity:'Product',entityId:id});
        }
      }
      return {ok:true};
    });
  });
  app.get('/commerce/export',{config:catalog},async(request,reply)=>{
    const kind=z.object({kind:z.enum(['variants','units']).default('variants')}).parse(request.query).kind;
    if(kind==='units'){
      if(!can(request.auth!.user.role,'inventory.manage'))throw new ApiError(403,'forbidden');
      // وضع حد أقصى للسلامة وترتيب محدد لتجنب استهلاك الذاكرة العالي
      // Add safety limit and deterministic ordering to prevent unbounded memory usage
      const rows=await db.inventoryUnit.findMany({where:{soldOrderId:null},take:10000,orderBy:{id:'asc'}});
      const quote=(v:unknown)=>'"'+String(v??'').replaceAll('"','""')+'"';
      const csv=[['id','variantId','serialNumber','condition','batteryHealthPct','inspection','defects','images'],...rows.map(u=>[u.id,u.variantId,u.serialNumber,u.condition,u.batteryHealthPct,JSON.stringify(u.inspection),JSON.stringify(u.defects),JSON.stringify(u.images)])].map(row=>row.map(quote).join(',')).join('\r\n');
      return reply.type('text/csv; charset=utf-8').header('Content-Disposition','attachment; filename=units.csv').send('\uFEFF'+csv);
    }
    // وضع حد أقصى وتحديد الحقول المطلوبة فقط من المنتج لتخفيف حمل قاعدة البيانات
    // Add safety limit and select only required product fields to optimize DB load
    const rows=await db.productVariant.findMany({include:{product:{select:{title:true,category:true,brandId:true}}},take:10000,orderBy:{sku:'asc'}});
    const quote=(v:unknown)=>'"'+String(v??'').replaceAll('"','""')+'"';
    const csv=[['id','productId','sku','priceUsd','quantity','inventoryMode','inventoryReviewed','options','specs','titleAr','titleEn','category','brandId'],...rows.map(v=>[v.id,v.productId,v.sku,v.priceUsd?.toFixed(2),v.quantity,v.inventoryMode,v.inventoryReviewed,JSON.stringify(v.options),JSON.stringify(v.specs),jsonObject(v.product.title).ar,jsonObject(v.product.title).en,v.product.category,v.product.brandId])].map(row=>row.map(quote).join(',')).join('\r\n');
    return reply.type('text/csv; charset=utf-8').header('Content-Disposition','attachment; filename=catalog.csv').send('\uFEFF'+csv);
  });
  app.post('/commerce/import',{config:inventory,bodyLimit:1024*1024},async request=>{
    if(!can(request.auth!.user.role,'catalog.edit')||!can(request.auth!.user.role,'prices.edit'))throw new ApiError(403,'forbidden');
    return importCsv(db,config,request);
  });
  app.get('/commerce/excel/stats',{config:catalog},async()=>{
    return getExportImportStats(db);
  });
  app.get('/commerce/excel/template',{config:catalog},async(request,reply)=>{
    const q=request.query as Record<string,string>;
    const buffer=await generateTemplate(q?.type);
    const fname=q?.type?`template-${q.type}.xlsx`:'import-template.xlsx';
    return reply
      .type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      .header('Content-Disposition',`attachment; filename="${fname}"`)
      .send(buffer);
  });
  app.get('/commerce/excel/export',{config:catalog},async(request,reply)=>{
    const res=await exportCatalogExcel(db,request.query as any);
    return reply
      .type(res.contentType)
      .header('Content-Disposition',`attachment; filename="${res.filename}"`)
      .send(res.buffer);
  });
  app.post('/commerce/excel/import',{config:inventory,bodyLimit:5*1024*1024},async request=>{
    if(!can(request.auth!.user.role,'catalog.edit')||!can(request.auth!.user.role,'prices.edit'))throw new ApiError(403,'forbidden');
    return importExcel(db,config,request);
  });
  app.post('/commerce/compatibility',{config:catalog},async request=>{
    const input=z.object({productId:z.string(),otherProductId:z.string(),verified:z.boolean(),portType:z.string().min(1).max(100),source:z.string().trim().min(5).max(2000),watts:z.string().regex(/^\d+(\.\d{1,2})?$/).refine(v=>Number(v)>0).nullable(),note:z.string().max(1000)}).parse(request.body);
    if(input.productId===input.otherProductId)throw new ApiError(400,'invalid_compatibility');
    return transaction(db,async tx=>{const before=await tx.productCompat.findUnique({where:{productId_otherProductId:{productId:input.productId,otherProductId:input.otherProductId}}});const after=await tx.productCompat.upsert({where:{productId_otherProductId:{productId:input.productId,otherProductId:input.otherProductId}},create:input,update:input});await audit(tx,config,request,{action:'compatibility.evidence_saved',entity:'ProductCompat',entityId:after.id,before,after});return {ok:true};});
  });
  app.post('/commerce/units/:id/availability',{config:inventory},async request=>{
    const input=z.object({available:z.boolean(),revision:z.string(),reason:z.string().trim().min(5).max(500)}).parse(request.body),id=(request.params as {id:string}).id;
    return transaction(db,async tx=>{const before=await tx.inventoryUnit.findUniqueOrThrow({where:{id}});revision(before,input.revision);if(before.soldOrderId)throw new ApiError(409,'unit_sold');const after=await tx.inventoryUnit.update({where:{id},data:{available:input.available}});if(before.available!==input.available)await tx.inventoryMovement.create({data:{variantId:before.variantId,unitId:id,delta:input.available?1:-1,reason:input.reason,userId:request.auth!.user.id}});await audit(tx,config,request,{action:'unit.availability_changed',entity:'InventoryUnit',entityId:id,before:{available:before.available},after:{available:input.available,reason:input.reason}});return after;}, 'Serializable');
  });
  app.post('/commerce/amazon/fetch',{config:catalog},async request=>{
    const input=z.object({input:z.string().min(1).max(500000)}).parse(request.body);
    return fetchAmazonImages(input.input);
  });
  app.post('/commerce/amazon/import',{config:catalog,bodyLimit:2*1024*1024},async request=>{
    const schema=z.object({
      imageUrls:z.array(z.string().url()).min(1).max(100),
      productId:z.string().optional(),
      altAr:z.string().max(190).optional(),
      altEn:z.string().max(190).optional(),
      replaceExisting:z.boolean().default(false),
      setAsPrimary:z.boolean().default(false),
    });
    return importAmazonImagesToStore(db,config,request,schema.parse(request.body));
  });

  app.get('/commerce/coupons', { config: coupons }, async (request) => {
    const q = z.object({
      page: z.coerce.number().int().positive().default(1),
      limit: z.coerce.number().int().positive().max(100).default(24),
      q: z.string().default(''),
      status: z.enum(['all', 'active', 'expired', 'scheduled', 'exhausted', 'paused']).default('all'),
      type: z.enum(['all', 'percentage', 'fixed_amount', 'free_shipping']).default('all'),
    }).parse(request.query);

    const now = new Date();
    const where: Prisma.CouponWhereInput = {};

    if (q.q.trim()) {
      const term = q.q.trim().toUpperCase();
      where.OR = [
        { code: { contains: term } },
      ];
    }

    if (q.type !== 'all') {
      where.discountType = q.type;
    }

    if (q.status === 'paused') {
      where.active = false;
    } else if (q.status === 'active') {
      where.active = true;
      where.AND = [
        { OR: [{ endDate: null }, { endDate: { gt: now } }] },
        { OR: [{ startDate: null }, { startDate: { lte: now } }] },
      ];
    } else if (q.status === 'expired') {
      where.endDate = { lte: now };
    } else if (q.status === 'scheduled') {
      where.startDate = { gt: now };
    }

    const [items, total] = await Promise.all([
      db.coupon.findMany({
        where,
        skip: (q.page - 1) * q.limit,
        take: q.limit,
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { orders: true, usages: true } } },
      }),
      db.coupon.count({ where }),
    ]);

    let filteredItems = items;
    if (q.status === 'exhausted') {
      filteredItems = items.filter((c) => c.usageLimitTotal !== null && c.usedCount >= c.usageLimitTotal);
    } else if (q.status === 'active') {
      filteredItems = items.filter((c) => c.usageLimitTotal === null || c.usedCount < c.usageLimitTotal);
    }

    return {
      items: filteredItems.map(couponToDto),
      total,
    };
  });

  app.get('/commerce/coupons/stats', { config: coupons }, async () => {
    const now = new Date();
    const [totalCoupons, activeCoupons, totalRedemptions, discountAgg, topCoupons] = await Promise.all([
      db.coupon.count(),
      db.coupon.count({
        where: {
          active: true,
          OR: [{ endDate: null }, { endDate: { gt: now } }],
          AND: [{ OR: [{ startDate: null }, { startDate: { lte: now } }] }],
        },
      }),
      db.couponUsage.count(),
      db.couponUsage.aggregate({
        _sum: { discountUsd: true },
      }),
      db.coupon.findMany({
        where: { usedCount: { gt: 0 } },
        orderBy: { usedCount: 'desc' },
        take: 5,
        include: { _count: { select: { orders: true, usages: true } } },
      }),
    ]);

    return {
      totalCoupons,
      activeCoupons,
      totalRedemptions,
      totalDiscountUsd: discountAgg._sum.discountUsd ? discountAgg._sum.discountUsd.toFixed(2) : '0.00',
      topCoupons: topCoupons.map(couponToDto),
    };
  });

  app.get('/commerce/coupons/:id', { config: coupons }, async (request) => {
    const id = (request.params as { id: string }).id;
    const coupon = await db.coupon.findUniqueOrThrow({
      where: { id },
      include: { _count: { select: { orders: true, usages: true } } },
    });

    const usages = await db.couponUsage.findMany({
      where: { couponId: id },
      include: {
        order: { select: { id: true, number: true } },
        customer: { select: { id: true, name: true, phone: true } },
      },
      orderBy: { usedAt: 'desc' },
      take: 100,
    });

    return {
      coupon: couponToDto(coupon),
      usages: usages.map((u) => ({
        id: u.id,
        couponId: u.couponId,
        orderId: u.orderId,
        orderNumber: u.order.number,
        customerId: u.customerId,
        customerName: u.customer.name,
        customerPhone: u.customerPhone ?? u.customer.phone,
        discountUsd: u.discountUsd.toFixed(2),
        discountYer: u.discountYer?.toFixed(2) ?? null,
        orderSubtotalUsd: u.orderSubtotalUsd.toFixed(2),
        usedAt: u.usedAt.toISOString(),
      })),
    };
  });

  app.post('/commerce/coupons', { config: coupons }, async (request) => {
    const input = CouponEdit.parse(request.body);
    const exists = await db.coupon.findUnique({ where: { code: input.code } });
    if (exists) throw new ApiError(409, 'coupon_code_exists');

    const created = await transaction(db, async (tx) => {
      const row = await tx.coupon.create({
        data: {
          code: input.code,
          title: input.title,
          description: input.description ?? undefined,
          discountType: input.discountType,
          discountValue: new Prisma.Decimal(input.discountValue),
          maxDiscountUsd: input.maxDiscountUsd != null ? new Prisma.Decimal(input.maxDiscountUsd) : null,
          minOrderAmountUsd: input.minOrderAmountUsd != null ? new Prisma.Decimal(input.minOrderAmountUsd) : null,
          maxOrderAmountUsd: input.maxOrderAmountUsd != null ? new Prisma.Decimal(input.maxOrderAmountUsd) : null,
          minItemQuantity: input.minItemQuantity ?? 1,
          startDate: input.startDate ? new Date(input.startDate) : null,
          endDate: input.endDate ? new Date(input.endDate) : null,
          usageLimitTotal: input.usageLimitTotal ?? null,
          usageLimitPerCustomer: input.usageLimitPerCustomer ?? 1,
          firstOrderOnly: input.firstOrderOnly,
          excludeDiscounted: input.excludeDiscounted,
          isPublic: input.isPublic,
          active: input.active,
          applicableCategories: input.applicableCategories,
          excludedCategories: input.excludedCategories,
          applicableBrands: input.applicableBrands,
          excludedBrands: input.excludedBrands,
          applicableProducts: input.applicableProducts,
          customerPhones: input.customerPhones,
        },
        include: { _count: { select: { orders: true, usages: true } } },
      });
      await audit(tx, config, request, {
        action: 'coupon.created',
        entity: 'Coupon',
        entityId: row.id,
        after: { code: row.code, discountType: row.discountType },
      });
      return row;
    });

    return couponToDto(created);
  });

  app.patch('/commerce/coupons/:id', { config: coupons }, async (request) => {
    const id = (request.params as { id: string }).id;
    const input = CouponEdit.partial().parse(request.body);

    const updated = await transaction(db, async (tx) => {
      const prior = await tx.coupon.findUniqueOrThrow({ where: { id } });

      if (input.code && input.code !== prior.code) {
        const dup = await tx.coupon.findUnique({ where: { code: input.code } });
        if (dup && dup.id !== id) throw new ApiError(409, 'coupon_code_exists');
      }

      const row = await tx.coupon.update({
        where: { id },
        data: {
          ...(input.code ? { code: input.code } : {}),
          ...(input.title ? { title: input.title } : {}),
          ...(input.description !== undefined ? { description: input.description ?? undefined } : {}),
          ...(input.discountType ? { discountType: input.discountType } : {}),
          ...(input.discountValue != null ? { discountValue: new Prisma.Decimal(input.discountValue) } : {}),
          ...(input.maxDiscountUsd !== undefined ? { maxDiscountUsd: input.maxDiscountUsd != null ? new Prisma.Decimal(input.maxDiscountUsd) : null } : {}),
          ...(input.minOrderAmountUsd !== undefined ? { minOrderAmountUsd: input.minOrderAmountUsd != null ? new Prisma.Decimal(input.minOrderAmountUsd) : null } : {}),
          ...(input.maxOrderAmountUsd !== undefined ? { maxOrderAmountUsd: input.maxOrderAmountUsd != null ? new Prisma.Decimal(input.maxOrderAmountUsd) : null } : {}),
          ...(input.minItemQuantity !== undefined ? { minItemQuantity: input.minItemQuantity } : {}),
          ...(input.startDate !== undefined ? { startDate: input.startDate ? new Date(input.startDate) : null } : {}),
          ...(input.endDate !== undefined ? { endDate: input.endDate ? new Date(input.endDate) : null } : {}),
          ...(input.usageLimitTotal !== undefined ? { usageLimitTotal: input.usageLimitTotal } : {}),
          ...(input.usageLimitPerCustomer !== undefined ? { usageLimitPerCustomer: input.usageLimitPerCustomer } : {}),
          ...(input.firstOrderOnly !== undefined ? { firstOrderOnly: input.firstOrderOnly } : {}),
          ...(input.excludeDiscounted !== undefined ? { excludeDiscounted: input.excludeDiscounted } : {}),
          ...(input.isPublic !== undefined ? { isPublic: input.isPublic } : {}),
          ...(input.active !== undefined ? { active: input.active } : {}),
          ...(input.applicableCategories ? { applicableCategories: input.applicableCategories } : {}),
          ...(input.excludedCategories ? { excludedCategories: input.excludedCategories } : {}),
          ...(input.applicableBrands ? { applicableBrands: input.applicableBrands } : {}),
          ...(input.excludedBrands ? { excludedBrands: input.excludedBrands } : {}),
          ...(input.applicableProducts ? { applicableProducts: input.applicableProducts } : {}),
          ...(input.customerPhones ? { customerPhones: input.customerPhones } : {}),
        },
        include: { _count: { select: { orders: true, usages: true } } },
      });

      await audit(tx, config, request, {
        action: 'coupon.updated',
        entity: 'Coupon',
        entityId: id,
        before: { code: prior.code, active: prior.active },
        after: { code: row.code, active: row.active },
      });
      return row;
    });

    return couponToDto(updated);
  });

  app.post('/commerce/coupons/:id/toggle', { config: coupons }, async (request) => {
    const id = (request.params as { id: string }).id;
    return transaction(db, async (tx) => {
      const prior = await tx.coupon.findUniqueOrThrow({ where: { id } });
      const nextActive = !prior.active;
      const updated = await tx.coupon.update({
        where: { id },
        data: { active: nextActive },
        include: { _count: { select: { orders: true, usages: true } } },
      });
      await audit(tx, config, request, {
        action: nextActive ? 'coupon.activated' : 'coupon.paused',
        entity: 'Coupon',
        entityId: id,
        before: { active: prior.active },
        after: { active: nextActive },
      });
      return couponToDto(updated);
    });
  });

  app.delete('/commerce/coupons/:id', { config: coupons }, async (request) => {
    const id = (request.params as { id: string }).id;
    return transaction(db, async (tx) => {
      const prior = await tx.coupon.findUniqueOrThrow({
        where: { id },
        include: { _count: { select: { orders: true, usages: true } } },
      });
      if (prior._count.orders > 0 || prior._count.usages > 0) {
        const updated = await tx.coupon.update({
          where: { id },
          data: { active: false },
        });
        await audit(tx, config, request, {
          action: 'coupon.deactivated_due_to_history',
          entity: 'Coupon',
          entityId: id,
        });
        return { ok: true, deactivated: true };
      }
      await tx.coupon.delete({ where: { id } });
      await audit(tx, config, request, {
        action: 'coupon.deleted',
        entity: 'Coupon',
        entityId: id,
      });
      return { ok: true, deleted: true };
    });
  });
}
