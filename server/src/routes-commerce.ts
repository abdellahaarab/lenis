import type {FastifyInstance,FastifyRequest,FastifyReply} from 'fastify';
import {Prisma,type PrismaClient} from '@prisma/client';
import {z} from 'zod';
import {CartLines,Checkout,CustomerCredentials,CustomerRegistration,OrderStatuses,CouponValidate} from '@aljeel/shared';
import {hashPassword,verifyPassword,randomToken,hashToken,safeEqual} from './security.js';
import {ApiError} from './errors.js';
import type {AppConfig} from './config.js';
import {catalogSearch,catalogSuggestions,publishedRows,offers,effectiveFields,priceInYer,getCollectionBySlug,getPublishedCollections} from './commerce-catalog.js';
import {productDto} from './catalog-service.js';
import {cartPreview,normalizeLines} from './commerce-cart.js';
import {validateAndCalculateCoupon,recordCouponRedemption} from './coupon-service.js';
import {transaction} from './db.js';
import {audit} from './audit.js';
export async function commerceRoutes(app:FastifyInstance,db:PrismaClient,config:AppConfig){
  app.get('/api/shop/catalog',{config:{rateLimit:{max:60,timeWindow:'1 minute'}}},async (request,reply)=>{
    reply.header('Cache-Control','public, max-age=20, stale-while-revalidate=60');
    const params=new URL(request.url,'http://local').searchParams;
    for(const key of ['min','max'])if(params.has(key)&&!/^\d{1,12}(\.\d{1,2})?$/.test(params.get(key)!))throw new ApiError(400,'invalid_price');
    return catalogSearch(db,params);
  });
  app.get('/api/shop/suggestions',{config:{rateLimit:{max:40,timeWindow:'1 minute'}}},async (request,reply)=>{
    reply.header('Cache-Control','private, max-age=15, stale-while-revalidate=30');
    const params=new URL(request.url,'http://local').searchParams;
    const query=(params.get('q')??'').slice(0,80);
    const language=params.get('lang')==='en'?'en':'ar';
    return catalogSuggestions(db,query,language);
  });
  app.get('/api/shop/collections',async(_request,reply)=>{
    reply.header('Cache-Control','public, max-age=15, stale-while-revalidate=45');
    return getPublishedCollections(db);
  });
  app.get('/api/shop/collections/:slug',async (request,reply)=>{
    reply.header('Cache-Control','public, max-age=15, stale-while-revalidate=45');
    const slug=z.string().max(160).parse((request.params as {slug:string}).slug);
    return getCollectionBySlug(db,slug);
  });
  app.get('/api/shop/products/:slug',async (request,reply)=>{
    reply.header('Cache-Control','public, max-age=20, stale-while-revalidate=60');
    const slug=z.string().max(160).parse((request.params as {slug:string}).slug);
    const category=z.object({category:z.string().max(100).optional()}).parse(request.query).category;
    const cache=await publishedRows(db);
    const {rows}=cache;
    let selected=rows.filter(v=>v.product.slug===slug);
    if(category){const redirect=await db.productRedirect.findUnique({where:{path:category+'/'+slug}});if(redirect)selected=rows.filter(v=>v.productId===redirect.productId);}
    if(!selected.length){const redirects=await db.productRedirect.findMany({where:{path:{endsWith:'/'+slug}}});selected=rows.filter(v=>redirects.some(r=>r.productId===v.productId));}
    if(!selected.length)throw new ApiError(404,'not_found');
    const pricing=await db.pricingConfig.findUnique({where:{id:1}});
    return {product:productDto(selected[0].product),brandId:selected[0].product.brandId,offers:selected.flatMap(offers).map(o=>({...o,priceYer:priceInYer(o.priceUsd,pricing?.usdToYer),originalPriceYer:priceInYer(o.originalPriceUsd??null,pricing?.usdToYer)})),fields:await effectiveFields(db,selected[0].product)};
  });
  app.get('/api/shop/packages',async(_request,reply)=>{
    reply.header('Cache-Control','public, max-age=15, stale-while-revalidate=45');
    const {rows}=await publishedRows(db),packages=await db.catalogPackage.findMany({where:{published:true},include:{items:true}});
    return {items:packages.map(p=>{
      const items=p.items.map(part=>{const v=rows.find(v=>v.id===part.variantId);return {variantId:part.variantId,quantity:part.quantity,title:v?.product.title??{},sku:v?.sku??'',inventoryMode:v?.inventoryMode??'quantity',offers:v?offers(v):[],available:Boolean(v&&v.inventoryReviewed&&(v.inventoryMode==='quantity'?v.quantity>=part.quantity:v.units.filter(u=>u.available).length>=part.quantity))};});
      const allPriced=items.every(i=>i.offers[0]?.priceUsd!==null&&i.offers.length);
      const sum=allPriced?items.reduce((sum,i)=>sum.add(new Prisma.Decimal(i.offers[0].priceUsd!).mul(i.quantity)),new Prisma.Decimal(0)):null;
      return {id:p.id,slug:p.slug,title:p.title,description:p.description,priceUsd:p.priceMode==='fixed'?p.priceUsd?.toFixed(2)??null:sum?.toFixed(2)??null,available:items.length>0&&items.every(i=>i.available),items};
    })};
  });
  const cookieOptions={httpOnly:true,sameSite:'lax' as const,secure:config.COOKIE_SECURE,path:'/api/shop'};
  async function customer(request:FastifyRequest,required=true){
    const session=request.cookies.store_session?await db.customerSession.findUnique({where:{id:hashToken(request.cookies.store_session)},include:{customer:true}}):null;
    if(!session||session.expiresAt.getTime()<=Date.now()||!session.customer.active){if(required)throw new ApiError(401,'unauthenticated');return null;}
    return session.customer;
  }
  async function cart(request:FastifyRequest,reply:FastifyReply){
    const account=await customer(request,false);
    if(account){let c=await db.shoppingCart.findUnique({where:{customerId:account.id}});if(!c)c=await db.shoppingCart.create({data:{id:hashToken(randomToken()),customerId:account.id,items:[]}});return c;}
    let raw=request.cookies.store_cart;
    if(!raw){raw=randomToken();reply.setCookie('store_cart',raw,{...cookieOptions,maxAge:60*60*24*30});}
    const id=hashToken(raw);return db.shoppingCart.upsert({where:{id},create:{id,items:[]},update:{}});
  }
  await app.register(async store=>{
    store.addHook('onRequest',async(request,reply)=>{
      reply.header('Cache-Control','no-store');
      if(!['GET','HEAD','OPTIONS'].includes(request.method)){
        const signed=request.cookies.store_csrf,unsigned=signed?request.unsignCookie(signed):null,header=request.headers['x-csrf-token'];
        if(!request.headers.origin||!config.ALLOWED_ORIGINS.includes(request.headers.origin)||!unsigned?.valid||!unsigned.value||typeof header!=='string'||!safeEqual(header,unsigned.value))throw new ApiError(403,'csrf_invalid');
      }
    });
    store.get('/csrf',async(_request,reply)=>{const csrfToken=randomToken();reply.setCookie('store_csrf',csrfToken,{...cookieOptions,signed:true,maxAge:3600});return {csrfToken};});
    store.get('/account',async request=>{const c=await customer(request,false);return {customer:c?{id:c.id,name:c.name,phone:c.phone,phoneVerified:c.phoneVerified}:null};});
    async function signIn(request:FastifyRequest,reply:FastifyReply,register=false){
      const input=register?CustomerRegistration.parse(request.body):CustomerCredentials.parse(request.body);
      let c=await db.customerAccount.findUnique({where:{phone:input.phone}});
      if(register){if(c)throw new ApiError(409,'already_exists');c=await db.customerAccount.create({data:{name:CustomerRegistration.parse(input).name,phone:input.phone,passwordHash:await hashPassword(input.password)}});}
      else if(!c||!c.active||!await verifyPassword(c.passwordHash,input.password))throw new ApiError(401,'invalid_credentials');
      const raw=randomToken();
      await transaction(db,async tx=>{
        await tx.customerSession.create({data:{id:hashToken(raw),customerId:c!.id,expiresAt:new Date(Date.now()+7*86400000)}});
        const guest=request.cookies.store_cart?await tx.shoppingCart.findUnique({where:{id:hashToken(request.cookies.store_cart)}}):null;
        const existing=await tx.shoppingCart.findUnique({where:{customerId:c!.id}});
        const accumulated=CartLines.parse(existing?.items??[]);
        for(const line of CartLines.parse(guest?.items??[])){
          const prior=accumulated.find(p=>p.variantId===line.variantId&&p.unitId===line.unitId&&p.packageId===line.packageId&&JSON.stringify([...(p.unitIds??[])].sort())===JSON.stringify([...(line.unitIds??[])].sort()));
          if(prior)prior.quantity=line.unitId||line.unitIds?.length?1:Math.min(100,prior.quantity+line.quantity);else accumulated.push(line);
        }
        const merged=normalizeLines(accumulated);
        // Invalid or no longer available lines stay visible for removal, but cannot be ordered.
        await tx.shoppingCart.upsert({where:{customerId:c!.id},create:{id:hashToken(randomToken()),customerId:c!.id,items:merged as Prisma.InputJsonValue},update:{items:merged as Prisma.InputJsonValue}});
        if(guest&&!guest.customerId)await tx.shoppingCart.delete({where:{id:guest.id}});
        await audit(tx,config,request,{action:register?'customer.registered':'customer.login',entity:'CustomerAccount',entityId:c!.id});
      });
      reply.setCookie('store_session',raw,{...cookieOptions,maxAge:7*86400});reply.clearCookie('store_cart',{path:'/api/shop'});
      return {customer:{id:c!.id,name:c!.name,phone:c!.phone,phoneVerified:c!.phoneVerified}};
    }
    store.post('/register',{config:{rateLimit:{max:5,timeWindow:'15 minutes'}}},(r,p)=>signIn(r,p,true));
    store.post('/login',{config:{rateLimit:{max:8,timeWindow:'15 minutes'}}},(r,p)=>signIn(r,p));
    store.post('/logout',async(request,reply)=>{if(request.cookies.store_session)await db.customerSession.deleteMany({where:{id:hashToken(request.cookies.store_session)}});reply.clearCookie('store_session',{path:'/api/shop'});return {ok:true};});
    store.post('/reset', {config:{rateLimit:{max:8,timeWindow:'15 minutes'}}},async request=>{
      const input=z.object({token:z.string().min(30).max(100),password:z.string().min(10).max(128)}).parse(request.body),id=hashToken(input.token),passwordHash=await hashPassword(input.password);
      return transaction(db,async tx=>{const reset=await tx.customerReset.findUnique({where:{id}});if(!reset||reset.usedAt||reset.expiresAt.getTime()<=Date.now())throw new ApiError(400,'reset_expired');const used=await tx.customerReset.updateMany({where:{id,usedAt:null,expiresAt:{gt:new Date()}},data:{usedAt:new Date()}});if(used.count!==1)throw new ApiError(400,'reset_expired');await tx.customerAccount.update({where:{id:reset.customerId},data:{passwordHash}});await tx.customerSession.deleteMany({where:{customerId:reset.customerId}});await audit(tx,config,request,{action:'customer.password_reset',entity:'CustomerAccount',entityId:reset.customerId});return {ok:true};});
    });
    store.get('/cart',async(request,reply)=>{
      const c=await cart(request,reply);
      const couponCode = (request.query as { coupon?: string })?.coupon || null;
      const account = await customer(request, false);
      try{return {...await cartPreview(db,c.items, couponCode, account?.id),rawLines:c.items};}catch(error){if(!(error instanceof ApiError))throw error;return {rawLines:c.items,items:[],errors:[error.code],previewToken:null};}
    });
    store.post('/coupon/validate', async (request, reply) => {
      const input = CouponValidate.parse(request.body);
      const c = await cart(request, reply);
      const account = await customer(request, false);
      const preview = await cartPreview(db, c.items);
      const pricing = await db.pricingConfig.findUnique({ where: { id: 1 } });
      const result = await validateAndCalculateCoupon(db, {
        code: input.code,
        items: preview.items,
        subtotalUsd: new Prisma.Decimal(preview.subtotalUsd),
        customerId: account?.id ?? null,
        customerPhone: account?.phone ?? null,
        exchangeRate: pricing?.usdToYer ?? null,
      });
      return result;
    });
    store.get('/coupons/public', async (_request, reply) => {
      reply.header('Cache-Control', 'public, max-age=30, stale-while-revalidate=60');
      const now = new Date();
      const publicCoupons = await db.coupon.findMany({
        where: {
          isPublic: true,
          active: true,
          OR: [{ endDate: null }, { endDate: { gt: now } }],
          AND: [{ OR: [{ startDate: null }, { startDate: { lte: now } }] }],
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });
      const available = publicCoupons
        .filter((c) => c.usageLimitTotal === null || c.usedCount < c.usageLimitTotal)
        .map((c) => ({
          code: c.code,
          title: c.title,
          description: c.description,
          discountType: c.discountType,
          discountValue: Number(c.discountValue),
          maxDiscountUsd: c.maxDiscountUsd ? Number(c.maxDiscountUsd) : null,
          minOrderAmountUsd: c.minOrderAmountUsd ? Number(c.minOrderAmountUsd) : null,
          endDate: c.endDate ? c.endDate.toISOString() : null,
        }));
      return { items: available };
    });
    store.post('/cart',async(request,reply)=>{
      const input=z.object({items:CartLines}).parse(request.body),c=await cart(request,reply),lines=normalizeLines(input.items);
      await cartPreview(db,lines);
      await db.shoppingCart.update({where:{id:c.id},data:{items:lines as Prisma.InputJsonValue}});
      return {ok:true};
    });
    store.delete('/cart/:index',async(request,reply)=>{
      const c=await cart(request,reply),index=z.coerce.number().int().min(0).parse((request.params as {index:string}).index),lines=CartLines.parse(c.items);lines.splice(index,1);await db.shoppingCart.update({where:{id:c.id},data:{items:lines as Prisma.InputJsonValue}});return {ok:true};
    });
    store.post('/orders',async(request,reply)=>{
      const c=await customer(request),input=Checkout.parse(request.body);
      const order=await transaction(db,async tx=>{
        const prior=await tx.commerceOrder.findUnique({where:{customerId_idempotencyKey:{customerId:c!.id,idempotencyKey:input.idempotencyKey}}});if(prior)return prior;
        const shopping=await tx.shoppingCart.findUnique({where:{customerId:c!.id}}),preview=await cartPreview(tx,shopping?.items??[],input.couponCode,c!.id);
        if(!preview.items.length)throw new ApiError(400,'empty_cart');
        if(preview.previewToken!==input.previewToken)throw new ApiError(409,'prices_changed');
        if(input.currency==='YER'&&!preview.usdToYer)throw new ApiError(409,'rate_not_set');
        if(input.couponCode&&!preview.appliedCoupon?.valid)throw new ApiError(409,'coupon_invalid');
        // Use MAX to avoid race condition: two concurrent orders with COUNT could get the same number
        const lastOrder = await tx.commerceOrder.findFirst({ orderBy: { createdAt: 'desc' }, select: { number: true } });
        const lastNum = lastOrder?.number ? parseInt(lastOrder.number.replace('AR-', ''), 10) : 1000;
        const orderNumber = `AR-${(isNaN(lastNum) ? 1000 : lastNum) + 1}`;
        const discountUsd = preview.discountUsd ? new Prisma.Decimal(preview.discountUsd) : new Prisma.Decimal(0);
        const discountYer = preview.discountYer ? new Prisma.Decimal(preview.discountYer) : null;
        const totalUsd = preview.totalUsd ? new Prisma.Decimal(preview.totalUsd) : new Prisma.Decimal(preview.subtotalUsd);
        const totalYer = preview.totalYer ? new Prisma.Decimal(preview.totalYer) : (preview.subtotalYer ? new Prisma.Decimal(preview.subtotalYer) : null);
        const order=await tx.commerceOrder.create({
          data:{
            number:orderNumber,
            customerId:c!.id,
            idempotencyKey:input.idempotencyKey,
            currency:input.currency,
            usdToYer:preview.usdToYer,
            rateAt:preview.rateAt?new Date(preview.rateAt):null,
            subtotalUsd:preview.subtotalUsd,
            subtotalYer:preview.subtotalYer,
            couponId:preview.appliedCoupon?.valid?preview.appliedCoupon.coupon.id:null,
            couponCode:preview.appliedCoupon?.valid?preview.appliedCoupon.coupon.code:null,
            discountUsd,
            discountYer,
            totalUsd,
            totalYer,
            couponDetails:preview.appliedCoupon?.valid?(preview.appliedCoupon as unknown as Prisma.InputJsonValue):undefined,
            hasUnpriced:preview.hasUnpriced,
            items:preview.items as unknown as Prisma.InputJsonValue,
            fulfillment:input.fulfillment,
            customerSnapshot:{name:c!.name,phone:c!.phone,phoneVerified:c!.phoneVerified}
          }
        });
        if(preview.appliedCoupon?.valid){
          await recordCouponRedemption(tx,{
            couponId:preview.appliedCoupon.coupon.id,
            orderId:order.id,
            customerId:c!.id,
            discountUsd,
            discountYer,
            orderSubtotalUsd:new Prisma.Decimal(preview.subtotalUsd),
            customerPhone:c!.phone,
          });
        }
        await tx.shoppingCart.update({where:{id:shopping!.id},data:{items:[]}});
        await audit(tx,config,request,{action:'order.created',entity:'CommerceOrder',entityId:order.id});return order;
      }, 'Serializable');return reply.code(201).send(order);
    });
    store.get('/orders',async request=>{const c=await customer(request);return {items:await db.commerceOrder.findMany({where:{customerId:c!.id},orderBy:{createdAt:'desc'},take:100})};});
    store.get('/orders/:id',async request=>{
      const c=await customer(request),order=await db.commerceOrder.findFirst({where:{id:(request.params as {id:string}).id,customerId:c!.id}});if(!order)throw new ApiError(404,'not_found');
      const pricing=await db.pricingConfig.findUnique({where:{id:1}});
      return {order,whatsapp:pricing?.whatsapp??null};
    });
    store.post('/orders/:id/cancel',async request=>{
      const c=await customer(request),id=(request.params as {id:string}).id;
      return transaction(db,async tx=>{const changed=await tx.commerceOrder.updateMany({where:{id,customerId:c!.id,status:{in:[OrderStatuses[0],OrderStatuses[1]]}},data:{status:'cancelled'}});if(!changed.count)throw new ApiError(409,'cannot_cancel');await audit(tx,config,request,{action:'order.customer_cancelled',entity:'CommerceOrder',entityId:id});return {ok:true};});
    });
  },{prefix:'/api/shop'});
}
