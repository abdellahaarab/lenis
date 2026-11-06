import {Prisma,type PrismaClient,type CatalogCategory} from '@prisma/client';
import {CartLines,type CartLineInput} from '@aljeel/shared';
import {createHash} from 'node:crypto';
import {variantInclude,offers,jsonObject,type VariantRow} from './commerce-catalog.js';
import {ApiError} from './errors.js';
import {transaction} from './db.js';
import type {AppConfig} from './config.js';
import type {FastifyRequest} from 'fastify';
import {audit} from './audit.js';
import {validateAndCalculateCoupon} from './coupon-service.js';
import type {CouponValidationResult} from '@aljeel/shared';
type Db=PrismaClient|Prisma.TransactionClient;
export type SnapshotItem={variantId:string;unitId:string|null;productId:string;sku:string;title:unknown;options:unknown;condition:string;inspection:unknown;defects:unknown;quantity:number;unitPriceUsd:string|null;linePriceUsd:string|null;packageId:string|null;priceIncluded?:boolean;images:string[];warrantyMonths:number|null};
export function normalizeLines(lines:CartLineInput[]):CartLineInput[]{
  const result=new Map<string,CartLineInput>();
  for(const line of lines){const key=JSON.stringify([line.variantId,line.unitId,line.packageId,[...(line.unitIds??[])].sort()]);const prior=result.get(key);const quantity=(prior?.quantity??0)+line.quantity;if(quantity>100||(line.unitId||line.unitIds?.length)&&quantity>1)throw new ApiError(400,'invalid_quantity');result.set(key,{...line,quantity});}
  return [...result.values()];
}
export async function cartPreview(db:Db,raw:unknown,couponCode?:string|null,customerId?:string|null){
  const lines=normalizeLines(CartLines.parse(raw)),items:SnapshotItem[]=[],errors:string[]=[];
  const pricing=await db.pricingConfig.findUnique({where:{id:1}});
  let subtotal=new Prisma.Decimal(0),hasUnpriced=false;
  const usedUnits=new Set<string>();
  // جلب كافة الفئات دفعة واحدة والبحث في الذاكرة لتجنب استعلامات N+1 في شجرة الفئات
  const allCategories=await db.catalogCategory.findMany();
  const categoryMap=new Map<string,CatalogCategory>(allCategories.map(c=>[c.slug,c]));
  // ذاكرة مؤقتة وجلب مسبق للمتغيرات لتفادي تكرار الاستعلامات
  const variantCache=new Map<string,VariantRow>();
  const directVariantIds=[...new Set(lines.map(l=>l.variantId).filter((id):id is string=>Boolean(id)))];
  if(directVariantIds.length){
    const prefetched=await db.productVariant.findMany({where:{id:{in:directVariantIds}},include:variantInclude});
    for(const v of prefetched)variantCache.set(v.id,v);
  }
  async function expand(variantId:string,quantity:number,unitId?:string,packageId:string|null=null){
    let v=variantCache.get(variantId);
    if(!v){
      v=(await db.productVariant.findUnique({where:{id:variantId},include:variantInclude}))??undefined;
      if(v)variantCache.set(variantId,v);
    }
    if(!v||!v.active||v.product.status!=='published'||v.product.deletedAt||!v.product.brand.published)throw new ApiError(409,'item_unavailable');
    let category:string|null=v.product.category;
    const seen=new Set<string>();while(category){if(seen.has(category))throw new ApiError(409,'item_unavailable');seen.add(category);const c=categoryMap.get(category);if(!c||c.status!=='published')throw new ApiError(409,'item_unavailable');category=c.parentSlug;}
    if(v.inventoryMode==='serialized'&&(!unitId||quantity!==1)||v.inventoryMode==='quantity'&&unitId)throw new ApiError(400,'select_unit');
    const o=offers(v).find(o=>o.unitId===unitId);
    if(!o?.available||v.inventoryMode==='quantity'&&v.quantity<quantity)throw new ApiError(409,'insufficient_stock');
    if(unitId){if(usedUnits.has(unitId))throw new ApiError(409,'duplicate_unit');usedUnits.add(unitId);}
    const price=o.priceUsd===null?null:new Prisma.Decimal(o.priceUsd).mul(quantity);
    const snapshot:SnapshotItem={variantId,unitId:unitId??null,productId:v.productId,sku:v.sku,title:v.product.title,options:v.options,condition:o.condition,inspection:o.inspection,defects:o.defects,quantity,unitPriceUsd:o.priceUsd,linePriceUsd:price?.toFixed(2)??null,packageId,images:o.images,warrantyMonths:o.warrantyMonths};
    items.push(snapshot);return price;
  }
  for(const line of lines){
    if(line.variantId){const amount=await expand(line.variantId,line.quantity,line.unitId);if(amount===null)hasUnpriced=true;else subtotal=subtotal.add(amount);}
    else{
      const p=await db.catalogPackage.findUnique({where:{id:line.packageId},include:{items:{include:{variant:true}}}});
      if(!p?.published)throw new ApiError(409,'item_unavailable');
      let amount=new Prisma.Decimal(0),unknown=false;const offset=items.length;const supplied=new Set(line.unitIds??[]);
      for(const part of p.items){
        if(part.variant.inventoryMode==='serialized'){
          const units=await db.inventoryUnit.findMany({where:{id:{in:[...supplied]},variantId:part.variantId,available:true}});
          if(units.length!==part.quantity*line.quantity)throw new ApiError(400,'select_package_units');
          for(const u of units){supplied.delete(u.id);const price=await expand(part.variantId,1,u.id,p.id);if(price===null)unknown=true;else amount=amount.add(price);}
        }else {const price=await expand(part.variantId,part.quantity*line.quantity,undefined,p.id);if(price===null)unknown=true;else amount=amount.add(price);}
      }
      if(supplied.size)throw new ApiError(400,'invalid_unit');
      if(p.priceMode==='fixed'){
        if(!p.priceUsd)throw new ApiError(409,'invalid_package_price');
        const fixed=p.priceUsd.mul(line.quantity);subtotal=subtotal.add(fixed);
        // Preserve bundle price separately; component prices are informational, not added again.
        for(const item of items.slice(offset)){item.linePriceUsd=null;item.priceIncluded=true;}
        items[offset].linePriceUsd=fixed.toFixed(2);
      }else if(unknown){hasUnpriced=true;subtotal=subtotal.add(amount);}else subtotal=subtotal.add(amount);
    }
  }
  // تجميع الكميات والتحقق من توفر المخزون عبر إعادة استخدام المتغيرات المحملة مسبقاً في الذاكرة دون استعلامات إضافية
  const quantities=new Map<string,number>();
  for(const item of items)if(!item.unitId)quantities.set(item.variantId,(quantities.get(item.variantId)??0)+item.quantity);
  for(const [id,qty]of quantities){const variant=variantCache.get(id);if(!variant||variant.quantity<qty)throw new ApiError(409,'insufficient_stock');}
  const rate=pricing?.usdToYer??null;
  let appliedCoupon: CouponValidationResult | null = null;
  let discountUsd = new Prisma.Decimal(0);
  let discountYer: Prisma.Decimal | null = null;
  let totalUsd = subtotal;
  let totalYer = rate ? subtotal.mul(rate) : null;

  if (couponCode) {
    const cust = customerId ? await db.customerAccount.findUnique({ where: { id: customerId }, select: { phone: true } }) : null;
    appliedCoupon = await validateAndCalculateCoupon(db, {
      code: couponCode,
      items,
      subtotalUsd: subtotal,
      customerId: customerId ?? null,
      customerPhone: cust?.phone ?? null,
      exchangeRate: rate,
    });
    if (appliedCoupon.valid) {
      discountUsd = new Prisma.Decimal(appliedCoupon.discountUsd);
      discountYer = appliedCoupon.discountYer ? new Prisma.Decimal(appliedCoupon.discountYer) : null;
      totalUsd = new Prisma.Decimal(appliedCoupon.totalUsd);
      totalYer = appliedCoupon.totalYer ? new Prisma.Decimal(appliedCoupon.totalYer) : null;
    }
  }

  const preview = {
    items,
    lines,
    subtotalUsd: subtotal.toFixed(2),
    subtotalYer: rate ? subtotal.mul(rate).toFixed(2) : null,
    discountUsd: discountUsd.toFixed(2),
    discountYer: discountYer ? discountYer.toFixed(2) : null,
    totalUsd: totalUsd.toFixed(2),
    totalYer: totalYer ? totalYer.toFixed(2) : null,
    appliedCoupon,
    hasUnpriced,
    usdToYer: rate?.toString() ?? null,
    rateAt: pricing?.updatedAt.toISOString() ?? null,
    deliveryFee: null,
    errors,
  };
  const previewToken=createHash('sha256').update(JSON.stringify(preview)).digest('hex');
  return {...preview,previewToken};
}
const transitions:Record<string,string[]>={
  new:['review','confirmed','cancelled'],
  review:['new','confirmed','cancelled'],
  confirmed:['review','preparing','cancelled'],
  preparing:['confirmed','ready_pickup','out_delivery','cancelled'],
  ready_pickup:['preparing','completed','cancelled'],
  out_delivery:['preparing','completed','cancelled'],
  completed:[],
  cancelled:['new','review']
};
export async function changeOrder(db:PrismaClient,config:AppConfig,request:FastifyRequest,id:string,status:string,revision:string){
  // Serializable required: order completion decrements inventory and must not race with concurrent orders
  return transaction(db,async tx=>{
    const order=await tx.commerceOrder.findUniqueOrThrow({where:{id}});
    if(order.status===status)return order;
    if(order.updatedAt.toISOString()!==revision)throw new ApiError(409,'content_changed');
    if(!transitions[order.status]?.includes(status))throw new ApiError(409,'invalid_transition');
    const method=jsonObject(order.fulfillment).method;
    if(status==='ready_pickup'&&method!=='pickup'||status==='out_delivery'&&method!=='delivery')throw new ApiError(409,'invalid_transition');
    if(status==='completed'){
      const items=order.items as unknown as SnapshotItem[];
      for(const item of [...items].sort((a,b)=>(a.variantId+(a.unitId??'')).localeCompare(b.variantId+(b.unitId??'')))){
        const v=await tx.productVariant.findUniqueOrThrow({where:{id:item.variantId}});
        if(item.unitId){const changed=await tx.inventoryUnit.updateMany({where:{id:item.unitId,variantId:v.id,available:true,soldOrderId:null},data:{available:false,soldOrderId:id}});if(changed.count!==1)throw new ApiError(409,'insufficient_stock');}
        else {const changed=await tx.productVariant.updateMany({where:{id:v.id,inventoryMode:'quantity',inventoryReviewed:true,quantity:{gte:item.quantity}},data:{quantity:{decrement:item.quantity}}});if(changed.count!==1)throw new ApiError(409,'insufficient_stock');}
        await tx.inventoryMovement.create({data:{variantId:v.id,unitId:item.unitId,delta:-item.quantity,orderId:id,userId:request.auth!.user.id,reason:'Order '+order.number+' completed'}});
        await tx.sale.create({data:{productId:item.productId,serialNumber:item.unitId?(await tx.inventoryUnit.findUniqueOrThrow({where:{id:item.unitId}})).serialNumber:null,priceUsd:item.unitPriceUsd,warrantyMonths:item.warrantyMonths,warrantyStart:new Date(),notes:'Order '+order.number+'; quantity '+item.quantity}});
      }
    }
    const after=await tx.commerceOrder.update({where:{id},data:{status,...(status==='completed'?{completedAt:new Date()}:{})}});
    await audit(tx,config,request,{action:'order.'+status,entity:'CommerceOrder',entityId:id,before:{status:order.status},after:{status}});return after;
  }, 'Serializable');
}

