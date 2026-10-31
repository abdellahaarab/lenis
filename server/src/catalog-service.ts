import {Prisma, type PrismaClient} from '@prisma/client';
import {ProductEditSchema,type ProductEdit,can} from '@aljeel/shared';
import type {FastifyRequest} from 'fastify';
import type {AppConfig} from './config.js';
import {transaction} from './db.js';
import {audit} from './audit.js';
import {ApiError} from './errors.js';
import {effectiveFields,validateSpecs,jsonObject,invalidateCatalogCache} from './commerce-catalog.js';
export const productInclude={brand:true,variants:{include:{units:{select:{available:true}}}},images:{orderBy:{sort:'asc' as const},include:{media:{select:{id:true,originalPath:true}}}},compatibleWith:true} satisfies Prisma.ProductInclude;
type Row=Prisma.ProductGetPayload<{include:typeof productInclude}>;
export function productDto(p:Row,admin=false){
  const variants=p.variants.filter(v=>v.active),priced=variants.filter(v=>v.priceUsd!==null).sort((a,b)=>a.priceUsd!.cmp(b.priceUsd!)),publicUsd=priced[0]?.priceUsd??null;
  const available=variants.some(v=>v.inventoryReviewed&&(v.inventoryMode==='quantity'?v.quantity>0:v.units.some(u=>u.available)));
  const origUsd = p.originalPriceUsd ? Number(p.originalPriceUsd) : null;
  const discPct = p.discountPercent ? Number(p.discountPercent) : (origUsd && publicUsd && origUsd > Number(publicUsd) ? Math.round(((origUsd - Number(publicUsd)) / origUsd) * 100) : null);
  return {id:p.id,slug:p.slug,category:p.category,brand:p.brand?.name??'',model:p.model,title:p.title,summary:p.summary,condition:p.condition,warrantyMonths:p.warrantyMonths,
    price:{
      usd:admin?p.priceUsd?.toFixed(2)??null:publicUsd===null?null:Number(publicUsd),
      originalUsd:origUsd,
      discountPercent:discPct,
      yer:admin?p.priceYer?.toFixed(2)??null:null,
      updatedAt:p.priceUpdatedAt?.toISOString()??null,
      negotiable:p.negotiable
    },
    stock:admin?p.stock:available?'in_stock':'order',specs:p.specs,bestFor:p.bestFor,compatibleWith:p.compatibleWith.map(c=>c.otherProductId),specSources:p.specSources,inspection:p.inspection,
    images:p.images.map(i=>i.media.originalPath),tags:p.tags,demo:p.demo,...(admin?{brandId:p.brandId,productTypeId:p.productTypeId,status:p.status,revision:p.updatedAt.toISOString()}:{}),};
}
export async function saveProduct(db:PrismaClient,config:AppConfig,request:FastifyRequest|null,input:ProductEdit,create=false,importing=false){
  const p=ProductEditSchema.parse(input);
  const result = await transaction(db,async tx=>{
    const before=await tx.product.findUnique({where:{id:p.id},include:productInclude});
    if(create&&before) throw new ApiError(409,'already_exists');
    if(!create&&!before) throw new ApiError(404,'not_found');
    if(before&&request&&input.revision!==undefined&&input.revision!==before.updatedAt.toISOString()) throw new ApiError(409,'content_changed');
    if(before?.publishedAt&&(before.slug!==p.slug||before.category!==p.category))await tx.productRedirect.upsert({where:{path:before.category+'/'+before.slug},create:{path:before.category+'/'+before.slug,productId:p.id},update:{productId:p.id}});
    if(request&&!can(request.auth!.user.role,'catalog.publish')&&(p.status!==before?.status||p.status==='published')) throw new ApiError(403,'forbidden');
    const priceChanged=(!before&& (p.price.usd!==null||p.price.yer!==null)) || Boolean(before&&(before.priceUsd?.toFixed(2)!==(p.price.usd===null?undefined:new Prisma.Decimal(p.price.usd).toFixed(2))||before.priceYer?.toFixed(2)!==(p.price.yer===null?undefined:new Prisma.Decimal(p.price.yer).toFixed(2))));
    if(priceChanged&&request&&!can(request.auth!.user.role,'prices.edit')) throw new ApiError(403,'forbidden');

    // Validate brand + category + productType in parallel
    const [brand,category,productTypeRow]=await Promise.all([
      p.brandId?tx.brand.findUnique({where:{id:p.brandId}}):tx.brand.findFirst({where:{name:p.brand}}),
      tx.catalogCategory.findUnique({where:{slug:p.category}}),
      p.productTypeId?tx.productType.findUnique({where:{id:p.productTypeId}}):null,
    ]);
    if(!brand) throw new ApiError(400,'unknown_brand');
    if(p.status==='published'&&!brand.published) throw new ApiError(400,'brand_not_published');
    if(!category) throw new ApiError(400,'unknown_category');
    if(p.status==='published'&&category.status!=='published')throw new ApiError(400,'category_not_published');
    if(p.productTypeId&&!productTypeRow)throw new ApiError(400,'unknown_type');

    const variants=await tx.productVariant.findMany({where:{productId:p.id,active:true}});
    const fields=await effectiveFields(tx,{category:p.category,productTypeId:p.productTypeId===undefined?before?.productTypeId:p.productTypeId});
    if(p.status==='published'&&!variants.length&&before)throw new ApiError(400,'publish_incomplete');
    for(const variant of variants.length?variants:[{specs:{},options:{}}])if(validateSpecs(fields,{...p.specs,...jsonObject(variant.specs),...jsonObject(variant.options)},p.status==='published').length)throw new ApiError(400,'publish_incomplete');

    const now=new Date();
    const values={slug:p.slug,category:p.category,brandId:brand.id,productTypeId:(p.productTypeId===undefined?before?.productTypeId:p.productTypeId)??null,model:p.model,title:p.title,summary:p.summary,condition:p.condition,status:p.status,demo:p.demo??false,warrantyMonths:p.warrantyMonths,
      priceUsd:p.price.usd,priceYer:p.price.yer,priceUpdatedAt:priceChanged?now:before?.priceUpdatedAt??(p.price.updatedAt?new Date(p.price.updatedAt):null),negotiable:p.price.negotiable,stock:p.stock,
      specs:p.specs as Prisma.InputJsonValue,bestFor:p.bestFor,specSources:p.specSources??[],tags:p.tags,inspection:p.inspection,publishedAt:p.status==='published'?before?.publishedAt??now:before?.publishedAt??null};
    if(before) await tx.product.update({where:{id:p.id},data:values}); else await tx.product.create({data:{id:p.id,...values}});

    if(!await tx.productVariant.count({where:{productId:p.id}}))
      await tx.productVariant.create({data:{id:p.id+'-default',productId:p.id,sku:p.id.slice(0,92)+'-default',optionKey:'[]',options:{},specs:{},images:[],priceUsd:p.price.usd,warrantyMonths:p.warrantyMonths,condition:p.condition,inventoryReviewed:false}});
    else if(priceChanged&&variants.length===1&&variants[0].optionKey==='[]')
      await tx.productVariant.update({where:{id:variants[0].id},data:{priceUsd:p.price.usd}});

    // ── Images: validate all in parallel, then batch-insert ──────────────────
    await tx.productImage.deleteMany({where:{productId:p.id}});
    if(p.images.length>0){
      const mediaRows = p.images.length > 0
        ? await tx.mediaAsset.findMany({ where: { originalPath: { in: p.images } } })
        : [];
      // Preserve order and detect missing images
      const mediaByPath = new Map(mediaRows.map(m => [m.originalPath, m]));
      const orderedMedia = p.images.map(path => mediaByPath.get(path) ?? null);
      const badIdx = orderedMedia.findIndex(m => !m);
      if (badIdx !== -1) throw new ApiError(400, 'unknown_image');
      await tx.productImage.createMany({
        data: orderedMedia.map((media, sort) => ({
          productId: p.id, mediaId: media!.id, sort, shot: 'front_closed' as const,
          altAr: String((p.title as Record<string, unknown>).ar ?? ''),
          altEn: String((p.title as Record<string, unknown>).en ?? ''),
        })),
      });
    }

    // ── Compatibility links: validate then batch-insert ───────────────────────
    await tx.productCompat.deleteMany({where:{productId:p.id}});
    const compatIds=[...new Set(p.compatibleWith)];
    if(compatIds.length>0){
      const [compatProducts]=await Promise.all([
        tx.product.findMany({where:{id:{in:compatIds}},select:{id:true}}),
      ]);
      const foundIds=new Set(compatProducts.map(r=>r.id));
      for(const id of compatIds){
        if(id===p.id) throw new ApiError(400,'invalid_compatibility');
        if(!foundIds.has(id)&&!importing) throw new ApiError(400,'unknown_product');
      }
      if(foundIds.size>0){
        await tx.productCompat.createMany({
          data:[...foundIds].filter(id=>id!==p.id).map(id=>{
            const old=before?.compatibleWith.find(c=>c.otherProductId===id);
            return {productId:p.id,otherProductId:id,...(old?{verified:old.verified,source:old.source,portType:old.portType,watts:old.watts,note:old.note}:{})};
          }),
          skipDuplicates:true,
        });
      }
    }

    // ── Labels: batch-insert tags + bestFor ───────────────────────────────────
    await tx.productLabel.deleteMany({where:{productId:p.id}});
    const labelData:[string,string[]][]=Object.entries({tag:p.tags,bestFor:p.bestFor});
    const allLabels=labelData.flatMap(([kind,values])=>[...new Set(values)].map(value=>({productId:p.id,kind,value})));
    if(allLabels.length>0) await tx.productLabel.createMany({data:allLabels,skipDuplicates:true});

    // ── Facets: batch-insert filterable spec values ───────────────────────────
    await tx.productFacet.deleteMany({where:{productId:p.id}});
    const definitions=await tx.specDefinition.findMany({where:{filterable:true}});
    const filterableKeys=new Set([...definitions.map(d=>d.key),...fields.filter(f=>f.filterable).map(f=>f.key)]);
    const facetData:Array<{productId:string;key:string;value:string}>=[];
    for(const key of filterableKeys){
      const value=(p.specs as Record<string,unknown>)?.[key];
      for(const v of Array.isArray(value)?value:[value]){
        if(typeof v==='string'||typeof v==='number'||typeof v==='boolean'){
          facetData.push({productId:p.id,key,value:String(v).slice(0,160)});
        }
      }
    }
    if(facetData.length>0) await tx.productFacet.createMany({data:facetData,skipDuplicates:true});

    if(priceChanged&&request) await tx.priceHistory.create({data:{productId:p.id,priceUsd:p.price.usd,priceYer:p.price.yer,changedBy:request.auth!.user.id}});
    const after=await tx.product.findUniqueOrThrow({where:{id:p.id},include:productInclude});
    await audit(tx,config,request,{action:importing?'catalog.imported':before?'catalog.updated':'catalog.created',entity:'Product',entityId:p.id,before:before?productDto(before,true):undefined,after:productDto(after,true)});
    return productDto(after,true);
  });
  invalidateCatalogCache();
  return result;
}



