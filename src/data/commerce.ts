import type {CartLineInput,SpecFieldInput,LaptopFacets} from '@aljeel/shared';
export type Customer={id:string;name:string;phone:string;phoneVerified:boolean};
export type Localized={ar:string;en:string};
const conditionLabels: Record<string, Localized> = {
  new: { ar: 'جديد', en: 'New' },
  open_box: { ar: 'مفتوح الكرتون', en: 'Open box' },
  like_new: { ar: 'شبه جديد', en: 'Like new' },
  refurbished: { ar: 'مجدّد', en: 'Refurbished' },
  used: { ar: 'مستعمل', en: 'Used' },
  defective: { ar: 'معيوب / تصفية', en: 'Defective' },
  A: { ar: 'مستعمل فئة A+', en: 'Grade A+' },
  B: { ar: 'مستعمل فئة B', en: 'Grade B' },
  C: { ar: 'مستعمل فئة C', en: 'Grade C' },
};
export function conditionText(condition: string | null | undefined, language: 'ar' | 'en'): string {
  return condition ? conditionLabels[condition]?.[language] ?? condition : '';
}
export function specText(value:unknown,language:'ar'|'en'):string{
  if(typeof value==='boolean')return language==='ar'?(value?'نعم':'لا'):(value?'Yes':'No');
  if(Array.isArray(value))return value.map(v=>specText(v,language)).join(' · ');
  if(value&&typeof value==='object'){const obj=value as Record<string,unknown>;if(typeof obj[language]==='string')return obj[language] as string;return Object.entries(obj).map(([key,v])=>inspectionTitle(key,language)+': '+specText(v,language)).join(' · ');}
  return value===null||value===undefined?'—':String(value);
}
export function inspectionTitle(key:string,language:'ar'|'en'){
  const labels:Record<string,Localized>={passed:{ar:'اجتاز الفحص',en:'Inspection passed'},date:{ar:'تاريخ الفحص',en:'Inspection date'},notes:{ar:'ملاحظات الفحص',en:'Inspection notes'},screen:{ar:'الشاشة',en:'Screen'},keyboard:{ar:'لوحة المفاتيح',en:'Keyboard'},ports:{ar:'المنافذ',en:'Ports'},battery:{ar:'البطارية',en:'Battery'}};
  return labels[key]?.[language]??key;
}
export type Offer={variantId:string;unitId?:string;sku:string;condition:string;priceUsd:string|null;originalPriceUsd?:string|null;priceYer?:string|null;originalPriceYer?:string|null;discountPercent?:number|null;specs:Record<string,unknown>;images:string[];available:boolean;batteryHealthPct:number|null;inspection:unknown;defects:Localized[];warrantyMonths:number|null;availabilityMode?:'in_stock'|'local_order'|'external_order';leadTimeDays?:number|null};
export type CatalogItem={product:{id:string;slug:string;category:string;brand:string;model:string;title:Localized;summary:Localized;images:string[];demo?:boolean};brandId?:string;offers:Offer[];fields:SpecFieldInput[]};
export type Facet={value:string;count:number;title?:string};
  export type SearchResult={items:CatalogItem[];total:number;page:number;pageSize:number;hasCatalog:boolean;categories:{slug:string;parentSlug:string|null;title:Localized}[];collections:{id:string;title:Localized}[];relatedSearches?:string[];facets:{brand:Facet[];condition:Facet[];collection:Facet[];specs:(SpecFieldInput&{values:Facet[]})[]};laptopFacets?:LaptopFacets;pricing:{usdToYer:string|null}|null};
export type ProductRecommendation={id:string;slug:string;category:string;brand:string;title:Localized;model:string;images:string[];condition:string;price:{usd:number|null;yer:string|null};specs:Record<string,unknown>};
  export type SearchSuggestions={items:{value:string;category:string;categoryTitle:string;count:number}[];categories:{slug:string;title:string;count:number}[]};
export type OrderItem={variantId:string;unitId:string|null;title:Localized;sku:string;quantity:number;unitPriceUsd:string|null;linePriceUsd:string|null;images:string[];packageId:string|null;priceIncluded?:boolean};
export type Preview={rawLines:CartLineInput[];items:OrderItem[];subtotalUsd:string;subtotalYer:string|null;hasUnpriced:boolean;usdToYer:string|null;previewToken:string|null;errors:string[];discountUsd?:string;discountYer?:string|null;totalUsd?:string;totalYer?:string|null;appliedCoupon?:any};
export type Order={id:string;number:string;status:string;items:OrderItem[];subtotalUsd:string;subtotalYer:string|null;hasUnpriced:boolean;currency:'USD'|'YER';createdAt:string;fulfillment:{method:string;address:string;notes:string};couponId?:string|null;couponCode?:string|null;discountUsd?:string|number|null;discountYer?:string|number|null;totalUsd?:string|number|null;totalYer?:string|number|null;couponDetails?:any};

let csrf='';
export async function shopApi<T>(path:string,method='GET',body?:unknown):Promise<T>{
  if(method!=='GET'&&!csrf){const r=await fetch('/api/shop/csrf',{credentials:'include'});if(!r.ok)throw new Error('disconnected');if(!r.headers.get('content-type')?.includes('application/json'))throw new Error('service_not_configured');csrf=(await r.json()).csrfToken;}
  const response=await fetch('/api/shop'+path,{method,credentials:'include',headers:{...(body!==undefined?{'Content-Type':'application/json'}:{}),...(method!=='GET'?{'X-CSRF-Token':csrf}:{})},...(body!==undefined?{body:JSON.stringify(body)}:{})});
  if(!response.headers.get('content-type')?.includes('application/json'))throw new Error('service_not_configured');
  const data=await response.json();if(!response.ok){if(data.error?.code==='csrf_invalid')csrf='';throw new Error(data.error?.code??'request_failed');}return data;
}

export type CartExtraMeta = {
  title?: Localized;
  priceUsd?: string | null;
  images?: string[];
  tierName?: Localized;
  itemTitles?: Localized[];
};

export type StoredCartLine = CartLineInput & {
  meta?: CartExtraMeta;
};

const LOCAL_CART_KEY = 'alarbi_local_cart_v1';

export function getLocalCartLines(): StoredCartLine[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_CART_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalCartLines(lines: StoredCartLine[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_CART_KEY, JSON.stringify(lines));
  } catch {}
}

export function getLocalCartPreview(): Preview {
  const lines = getLocalCartLines();
  let totalUsd = 0;
  let hasUnpriced = false;

  const items: OrderItem[] = lines.map((line, idx) => {
    if (line.packageId) {
      const title: Localized = line.meta?.title || { ar: 'باقة من المتجر', en: 'Store bundle' };
      const images: string[] = line.meta?.images?.length ? line.meta.images : ['/logo.webp'];
      const unitPrice = line.meta?.priceUsd ? line.meta.priceUsd : null;
      if (unitPrice) {
        totalUsd += parseFloat(unitPrice) * line.quantity;
      } else {
        hasUnpriced = true;
      }
      return {
        variantId: `pkg-${line.packageId}-${idx}`,
        unitId: null,
        title,
        sku: `PKG-${line.packageId.toUpperCase()}`,
        quantity: line.quantity,
        unitPriceUsd: unitPrice,
        linePriceUsd: unitPrice ? (parseFloat(unitPrice) * line.quantity).toFixed(2) : null,
        images,
        packageId: line.packageId
      };
    } else {
      const title: Localized = line.meta?.title || { ar: 'منتج من المتجر', en: 'Store product' };
      const images: string[] = line.meta?.images?.length ? line.meta.images : ['/logo.webp'];
      const unitPrice = line.meta?.priceUsd || null;
      if (unitPrice) {
        totalUsd += parseFloat(unitPrice) * line.quantity;
      } else {
        hasUnpriced = true;
      }
      return {
        variantId: line.variantId || `prod-${idx}`,
        unitId: line.unitId || null,
        title,
        sku: line.variantId || `ITEM-${idx}`,
        quantity: line.quantity,
        unitPriceUsd: unitPrice,
        linePriceUsd: unitPrice ? (parseFloat(unitPrice) * line.quantity).toFixed(2) : null,
        images,
        packageId: null
      };
    }
  });

  return {
    rawLines: lines,
    items,
    subtotalUsd: totalUsd > 0 ? totalUsd.toFixed(2) : '0.00',
    subtotalYer: null,
    hasUnpriced,
    usdToYer: null,
    previewToken: 'local-preview-token',
    errors: []
  };
}

export async function addCart(line: CartLineInput, meta?: CartExtraMeta) {
  // 1. Update resilient local storage
  const lines = getLocalCartLines();
  const existingIndex = line.packageId
    ? lines.findIndex((l) => l.packageId === line.packageId)
    : lines.findIndex((l) => l.variantId === line.variantId && l.unitId === line.unitId);

  if (existingIndex >= 0) {
    lines[existingIndex].quantity += (line.quantity || 1);
    if (meta) lines[existingIndex].meta = { ...lines[existingIndex].meta, ...meta };
  } else {
    lines.push({ ...line, quantity: line.quantity || 1, meta });
  }
  saveLocalCartLines(lines);
  window.dispatchEvent(new Event('store-cart-changed'));

  // 2. Synchronize with server if available
  try {
    const cart = await shopApi<Preview>('/cart');
    if (!(line.unitId && cart.rawLines.some((l) => l.unitId === line.unitId))) {
      await shopApi('/cart', 'POST', { items: [...cart.rawLines, line] });
    }
  } catch {
    // Graceful offline fallback
  }
}

export async function removeCartItem(index: number) {
  const lines = getLocalCartLines();
  if (index >= 0 && index < lines.length) {
    lines.splice(index, 1);
    saveLocalCartLines(lines);
    window.dispatchEvent(new Event('store-cart-changed'));
  }
  try {
    await shopApi(`/cart/${index}`, 'DELETE');
  } catch {}
}

export async function updateCartQuantity(index: number, quantity: number) {
  const lines = getLocalCartLines();
  if (index >= 0 && index < lines.length && quantity >= 1) {
    lines[index].quantity = quantity;
    saveLocalCartLines(lines);
    window.dispatchEvent(new Event('store-cart-changed'));
  }
  try {
    await shopApi('/cart', 'POST', {
      items: lines.map((l) => ({ variantId: l.variantId, packageId: l.packageId, quantity: l.quantity, unitId: l.unitId }))
    });
  } catch {}
}

export function clearCart() {
  saveLocalCartLines([]);
  window.dispatchEvent(new Event('store-cart-changed'));
}
export const commerceCopy={
  ar:{close:'إغلاق',filterHint:'حدد الفلاتر ثم اعرض النتائج.',from:'ابتداءً من',included:'مشمول في سعر الباقة',shop:'اختر التقنية المناسبة لك',intro:'تصفّح حسب القسم والمواصفات، وأكمل طلبك عبر واتساب من السلة.',search:'ابحث عن جهاز أو موديل أو SKU',all:'كل الأقسام',filters:'الفلاتر',apply:'عرض النتائج',reset:'مسح الكل',brand:'العلامة',condition:'الحالة',collection:'المجموعات',available:'المتوفر فقط',min:'من $',max:'إلى $',newest:'الأحدث',relevance:'الأكثر صلة',priceAsc:'السعر: الأقل أولًا',priceDesc:'السعر: الأعلى أولًا',name:'الاسم',battery:'صحة البطارية',empty:'المنتجات قيد التجهيز',emptyNote:'سيظهر الكتالوج هنا بعد نشر المنتجات من الإدارة.',noResults:'لا توجد نتائج لهذه الاختيارات',results:'منتج',previous:'السابق',next:'التالي',add:'أضف للسلة',choose:'اختر المواصفات',details:'التفاصيل',ask:'اسأل عن السعر',unknown:'السعر يُؤكد بالتواصل',unavailable:'غير متوفر حاليًا',demo:'منتج توضيحي',cart:'السلة',account:'حسابي',quantity:'الكمية',remove:'حذف',subtotal:'مجموع الأصناف المسعّرة',deliveryFee:'رسوم التوصيل تُؤكد بعد التواصل',noReservation:'الطلب لا يحجز المخزون؛ يُؤكد التوفر مع المتجر.',currency:'عملة العرض',pickup:'استلام من المتجر',delivery:'توصيل',address:'عنوان التوصيل',notes:'ملاحظات',checkout:'اعتماد الطلب',loginRequired:'سجّل الدخول لاعتماد الطلب',login:'دخول',register:'إنشاء حساب',fullName:'الاسم',phone:'الهاتف الدولي',password:'كلمة المرور',forgot:'لاستعادة الحساب، تواصل مع المتجر للتحقق من هويتك والحصول على رابط مؤقت.',orders:'طلباتي',logout:'خروج',follow:'متابعة الطلب عبر واتساب',saved:'تم حفظ الطلب',notSent:'فتح واتساب لا يعني إرسال الرسالة. راجعها ثم أرسلها بنفسك.',noWhatsapp:'رقم واتساب لم يُضبط بعد؛ الطلب محفوظ ويمكن متابعته في حسابك.',cancel:'إلغاء الطلب',emptyCart:'سلتك فارغة',continue:'متابعة التسوق',rateMissing:'سعر صرف الريال لم يُضبط بعد',retry:'إعادة المحاولة',loading:'جارٍ التحميل…',unit:'القطعة',inspection:'الفحص',defects:'ملاحظات الحالة',chooseUnit:'اختر القطعة المنفردة',added:'أُضيف إلى السلة',packages:'باقات متكاملة',resetPassword:'تعيين كلمة مرور جديدة',save:'حفظ',stock:'التوفر',cpuFamily:'عائلة المعالج',cpuGen:'الجيل',ram:'الذاكرة (RAM)',storage:'سعة التخزين (SSD)',gpu:'كرت الشاشة',screenSize:'مقاس الشاشة',touch:'شاشة لمس',performance:'الأعلى أداءً',highestRam:'الأكبر ذاكرة',laptopsSection:'قسم اللابتوبات',laptopsIntro:'فلترة فائقة الذكاء بحسب معمارية المعالج، الذاكرة، التخزين، وكرت الشاشة.'},
  en:{close:'Close',filterHint:'Choose filters, then show results.',from:'From',included:'Included in bundle price',shop:'Find the right technology',intro:'Browse by section and specs. Follow your order on WhatsApp from your cart.',search:'Search device, model or SKU',all:'All categories',filters:'Filters',apply:'Show results',reset:'Clear all',brand:'Brand',condition:'Condition',collection:'Collections',available:'Available only',min:'From $',max:'To $',newest:'Newest',relevance:'Most relevant',priceAsc:'Price: low to high',priceDesc:'Price: high to low',name:'Name',battery:'Battery health',empty:'Products are being prepared',emptyNote:'The catalog will appear here when products are published.',noResults:'No results for these filters',results:'products',previous:'Previous',next:'Next',add:'Add to cart',choose:'Choose options',details:'Details',ask:'Ask for price',unknown:'Price confirmed by the store',unavailable:'Currently unavailable',demo:'Illustrative product',cart:'Cart',account:'My account',quantity:'Quantity',remove:'Remove',subtotal:'Subtotal of priced items',deliveryFee:'Delivery fee confirmed after contact',noReservation:'Orders do not reserve stock. Availability is confirmed with the store.',currency:'Display currency',pickup:'Store pickup',delivery:'Delivery',address:'Delivery address',notes:'Notes',checkout:'Confirm order',loginRequired:'Sign in to confirm your order',login:'Sign in',register:'Create account',fullName:'Name',phone:'International phone',password:'Password',forgot:'Contact the store for identity verification and a temporary recovery link.',orders:'My orders',logout:'Sign out',follow:'Follow order on WhatsApp',saved:'Order saved',notSent:'Opening WhatsApp does not send a message. Review it and send it yourself.',noWhatsapp:'WhatsApp is not configured yet. Your order is saved in your account.',cancel:'Cancel order',emptyCart:'Your cart is empty',continue:'Continue shopping',rateMissing:'YER exchange rate is not configured',retry:'Retry',loading:'Loading…',unit:'Unit',inspection:'Inspection',defects:'Condition notes',chooseUnit:'Choose an individual unit',added:'Added to cart',packages:'Complete bundles',resetPassword:'Set a new password',save:'Save',stock:'Availability',cpuFamily:'Processor Family',cpuGen:'Generation',ram:'Memory (RAM)',storage:'Storage (SSD)',gpu:'Graphics',screenSize:'Screen Size',touch:'Touchscreen',performance:'Performance',highestRam:'Highest RAM',laptopsSection:'Laptops Section',laptopsIntro:'High-precision filtering by processor architecture, RAM, storage, and graphics tier.'}
};
export const orderLabels={ar:{new:'جديد',review:'قيد المراجعة',confirmed:'مؤكد',preparing:'قيد التجهيز',ready_pickup:'جاهز للاستلام',out_delivery:'خرج للتوصيل',completed:'مكتمل',cancelled:'ملغى'},en:{new:'New',review:'Under review',confirmed:'Confirmed',preparing:'Preparing',ready_pickup:'Ready for pickup',out_delivery:'Out for delivery',completed:'Completed',cancelled:'Cancelled'}};
export const errorLabels:Record<string,Localized>={service_not_configured:{ar:'خدمة الحسابات والسلة غير جاهزة على الاستضافة. يرجى المحاولة لاحقًا.',en:'Account and cart services are not configured on the hosting server. Please try later.'},insufficient_stock:{ar:'بعض الأصناف لم تعد متوفرة بهذه الكمية. عدّل السلة.',en:'Some items are unavailable in this quantity. Update your cart.'},prices_changed:{ar:'تغيرت الأسعار أو سعر الصرف. راجع المبالغ الجديدة واعتمد الطلب مجددًا.',en:'Prices or the exchange rate changed. Review and confirm again.'},invalid_credentials:{ar:'الهاتف أو كلمة المرور غير صحيحة.',en:'Incorrect phone or password.'},already_exists:{ar:'هذا الهاتف مسجل مسبقًا.',en:'This phone is already registered.'},item_unavailable:{ar:'أحد الأصناف لم يعد متاحًا. احذفه من السلة.',en:'An item is no longer available. Remove it from the cart.'},unauthenticated:{ar:'سجّل الدخول للمتابعة.',en:'Sign in to continue.'},rate_limited:{ar:'محاولات كثيرة. انتظر ثم حاول.',en:'Too many attempts. Please wait.'},validation_failed:{ar:'راجع الحقول المدخلة.',en:'Please check the fields.'},reset_expired:{ar:'رابط الاستعادة انتهى أو استُخدم.',en:'Recovery link expired or already used.'}};
export function errorText(code:string,lang:'ar'|'en'){return errorLabels[code]?.[lang]??(lang==='ar'?'تعذّر إكمال العملية. أعد المحاولة.':'Could not complete this action. Please try again.');}
