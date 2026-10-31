import {createContext,useContext,useEffect,useState,type ReactNode} from 'react';
import {z} from 'zod';
import {ProductsArraySchema,BrandsArraySchema,FAQArraySchema,SiteDataSchema,WarrantyDataSchema,BundlesArraySchema,LocalizedTextSchema} from '@aljeel/shared';

const CatalogSchema=z.object({products:ProductsArraySchema,brands:BrandsArraySchema,faq:FAQArraySchema,site:SiteDataSchema,warranty:WarrantyDataSchema,bundles:BundlesArraySchema,categories:z.array(z.object({slug:z.string(),title:LocalizedTextSchema,parentSlug:z.string().nullable().optional()})),specs:z.array(z.object({key:z.string(),title:LocalizedTextSchema,filterable:z.boolean()})),homeImages:z.record(z.string(),z.string().nullable()).optional().default({}),pricing:z.object({usdToYer:z.string().nullable().optional()}).optional().default({usdToYer:'530'})});
type Catalog=z.infer<typeof CatalogSchema>;
const Context=createContext<Catalog|null>(null);
export function useCatalog(){const data=useContext(Context);if(!data)throw new Error('Catalog not loaded');return data;}
export function useExchangeRate(): number {
  const catalog = useContext(Context);
  const raw = catalog?.pricing?.usdToYer;
  const num = raw ? parseFloat(raw) : 530;
  return isNaN(num) || num <= 0 ? 530 : num;
}
export function useHomeImage(key:string,fallbackUrl?:string):string|null{
  const catalog=useContext(Context);
  if(!catalog)return fallbackUrl??null;
  const custom=catalog.homeImages?.[key];
  if(custom===null)return null;
  if(typeof custom==='string'&&custom.trim()!=='')return custom;
  return fallbackUrl??null;
}

export function CatalogProvider({children}:{children:ReactNode}){
  const [data,setData]=useState<Catalog|null>(null),[error,setError]=useState(false),[retry,setRetry]=useState(0);
  const ar=!location.pathname.startsWith('/en');
  useEffect(()=>{
    const abort=new AbortController();let active=true;
    const load=async()=>{
      try{
        const r=await fetch('/api/bootstrap',{signal:abort.signal});
        if(!r.ok)throw new Error('catalog');
        const payload=await r.json() as {brands?:unknown};
        // Older database brand rows may not have bilingual descriptions. Keep
        // the public catalog usable and use the brand name as a safe fallback.
        if(Array.isArray(payload.brands)){
          payload.brands=payload.brands.map((value:unknown)=>{
            if(!value||typeof value!=='object')return value;
            const brand=value as {name?:unknown;description?:{ar?:unknown;en?:unknown}|null};
            const name=typeof brand.name==='string'?brand.name:'';
            return {...brand,description:{
              ar:typeof brand.description?.ar==='string'&&brand.description.ar.trim()?brand.description.ar:name,
              en:typeof brand.description?.en==='string'&&brand.description.en.trim()?brand.description.en:name,
            }};
          });
        }
        const catalog=CatalogSchema.parse(payload);
        if(active){
          setData(catalog);
          setError(false);
        }
      }catch{
        if(active)setError(true);
      }
    };
    void load();
    // Refresh catalog data less frequently (every 2 minutes) to reduce server load.
    // The stale-while-revalidate HTTP header already ensures fresh-enough data.
    const interval=setInterval(()=>{if(document.visibilityState==='visible')void load();},120000);
    return()=>{active=false;abort.abort();clearInterval(interval);};
  },[retry]);
  if(!data)return <main id="main-content" className="page-shell" style={{paddingTop:140,minHeight:'100svh'}} aria-busy={!error}>{error?<><h1>{ar?'تعذّر تحميل بيانات المتجر':'Could not load store data'}</h1><p>{ar?'يرجى إعادة المحاولة.':'Please try again.'}</p><button onClick={()=>{setError(false);setRetry(v=>v+1);}}>{ar?'إعادة المحاولة':'Retry'}</button></>:<p role="status">{ar?'جارٍ تحميل بيانات المتجر…':'Loading store data…'}</p>}</main>;
  return <Context.Provider value={data}>{error&&<p role="status" className="page-shell">{ar?'تعذّر تحديث البيانات؛ تُعرض آخر نسخة محمّلة.':'Unable to refresh; showing the last loaded data.'}</p>}{children}</Context.Provider>;
}
