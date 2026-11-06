import {useState,type FormEvent} from 'react';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {ProductEditSchema,can,type ProductEdit} from '@aljeel/shared';
import {api,ApiError} from './api';
import {useSession} from './App';
import {useI18n} from './i18n';
import {Loading,ErrorBox} from './components';
import {ValueFields} from './ValueFields';
import {HomeImagesManager} from './HomeImages';
import {AboutEditor, type AboutData} from './AboutEditor';
type Reference={brands:{id:string;name:string;logoMediaId?:string|null;description:{ar:string;en:string};categories:{categorySlug:string}[];published:boolean;sort:number;tagline?:{ar:string;en:string};claim?:string}[];categories:{slug:string;title:{ar:string;en:string};sort:number}[];specs:{key:string;title:{ar:string;en:string};filterable:boolean}[]};
type Media={id:string;originalPath:string;altAr:string;altEn:string};
function imageUrl(path: unknown){
  if(!path || typeof path !== 'string') return '';
  return path.replace('/api/media/','/api/admin/media/');
}
export function Catalog(){
  const {lang}=useI18n(),ar=lang==='ar',{user}=useSession(),client=useQueryClient();
  const products=useQuery({queryKey:['products'],queryFn:()=>api<{items:ProductEdit[]}>('/products')});
  const reference=useQuery({queryKey:['reference'],queryFn:()=>api<Reference>('/reference')});
  const media=useQuery({queryKey:['media'],queryFn:()=>api<{items:Media[]}>('/media')});
  const [edit,setEdit]=useState<ProductEdit|null>(null),[isNew,setIsNew]=useState(false),[error,setError]=useState(''),[detail,setDetail]=useState(''),[busy,setBusy]=useState(false),[preview,setPreview]=useState(false),[search,setSearch]=useState('');
  const say=(a:string,e:string)=>ar?a:e;
  if(products.isPending||reference.isPending||media.isPending)return <Loading/>;
  if(products.isError||reference.isError||media.isError)return <><ErrorBox code="disconnected"/><button className="button" onClick={()=>{void products.refetch();void reference.refetch();void media.refetch();}}>{say('إعادة المحاولة','Retry')}</button></>;
  function create(){setIsNew(true);setPreview(false);setError('');setEdit({id:crypto.randomUUID(),slug:'',category:reference.data!.categories[0]?.slug??'laptops',brand:reference.data!.brands[0]?.name??'',model:'',title:{ar:'',en:''},summary:{ar:'',en:''},condition:'new',status:'draft',warrantyMonths:null,price:{usd:null,yer:null,updatedAt:null,negotiable:false},stock:'order',specs:{},inspection:{passed:false,date:null,notes:{ar:'',en:''}},images:[],bestFor:[],tags:[],compatibleWith:[],specSources:[],demo:false});}
  async function save(event:FormEvent){
    event.preventDefault();
    if(!edit)return;
    setError('');
    setDetail('');
    const toSave = { ...edit };
    if (!toSave.slug || !toSave.slug.trim() || isNew) {
      const source = [toSave.brand, toSave.model].filter(Boolean).join(' ') || toSave.title.en || toSave.title.ar || 'product';
      toSave.slug = source.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').slice(0, 80) || 'product-' + Math.floor(Math.random() * 1000);
    }
    const parsed = ProductEditSchema.safeParse(toSave);
    if(!parsed.success){
      setError('validation_failed');
      setDetail(parsed.error.issues.map(i=>i.path.join('.')+': '+i.message).join(' · '));
      return;
    }
    setBusy(true);
    try{
      const saved=await api<ProductEdit>(isNew?'/products':'/products/'+toSave.id,{method:isNew?'POST':'PATCH',body:parsed.data});
      setEdit(saved);
      setIsNew(false);
      await client.invalidateQueries({queryKey:['products']});
    }catch(e){
      setError(e instanceof ApiError?e.code:'failed');
    }finally{
      setBusy(false);
    }
  }
  return <><div className="page-heading"><h1>{say('المنتجات','Products')}</h1><button className="button primary" onClick={create}>{say('إضافة منتج','Add product')}</button></div><ErrorBox code={error}/>{detail&&<p role="alert">{detail}</p>}
    {!edit?<><label>{say('بحث في المنتجات','Search products')}<input value={search} onChange={e=>setSearch(e.target.value)}/></label><div className="catalog-list">{products.data!.items.filter(p=>JSON.stringify([p.title,p.model,p.slug]).toLowerCase().includes(search.toLowerCase())).map(p=><button className="card product-row" key={p.id} onClick={()=>{setEdit(p);setIsNew(false);setPreview(false);setError('');}}>{p.images[0]&&<img src={imageUrl(p.images[0])} alt="" width="100" height="70"/>}<span><strong>{p.title[lang]}</strong><small>{p.model} · {say(p.status==='published'?'منشور':p.status==='archived'?'مؤرشف':'مسودة',p.status)}</small></span></button>)}</div>{!products.data!.items.length&&<p>{say('لا توجد منتجات بعد.','No products yet.')}</p>}</>:<form className="card content-editor" onSubmit={save}>
    <div className="toolbar"><button type="button" className="button secondary" onClick={()=>setEdit(null)}>{say('العودة للقائمة','Back to list')}</button><button type="button" className="button secondary" onClick={()=>setPreview(!preview)}>{say(preview?'متابعة التحرير':'معاينة قبل النشر',preview?'Continue editing':'Preview before publishing')}</button><button className="button primary" disabled={busy}>{say(busy?'جارٍ الحفظ…':'حفظ المنتج',busy?'Saving…':'Save product')}</button></div>
    {preview?<article className="product-preview"><h2>{edit.title[lang]}</h2><p>{edit.summary[lang]}</p><div className="media-grid">{edit.images.map(path=><img key={path} src={imageUrl(path)} alt={edit.title[lang]}/>)}</div><p>{edit.brand} · {edit.model} · {edit.condition} · {edit.stock}</p><p>{edit.price.usd===null?say('اسأل عن السعر','Ask for price'):edit.price.usd+' USD'}</p><p>{say('الضمان بالأشهر: ','Warranty months: ')}{edit.warrantyMonths??say('اسأل عن الضمان','Ask about warranty')}</p><dl>{Object.entries(edit.specs).map(([key,value])=><div key={key}><dt>{reference.data!.specs.find(s=>s.key===key)?.title[lang]??key}</dt><dd>{typeof value==='object'?JSON.stringify(value):String(value)}</dd></div>)}</dl><p>{say('هذه معاينة خاصة. لن يظهر المنتج للعامة إلا عند نشره.','Private preview. Public visibility requires publication.')}</p></article>:<>
    <div className="fields-grid"><label>{say('العلامة التجارية','Brand')}<select value={edit.brandId??reference.data!.brands.find(b=>b.name===edit.brand)?.id} onChange={e=>{const brand=reference.data!.brands.find(b=>b.id===e.target.value);if(brand)setEdit({...edit,brandId:brand.id,brand:brand.name});}}>{reference.data!.brands.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></label><label>{say('التصنيف','Category')}<select value={edit.category} onChange={e=>setEdit({...edit,category:e.target.value})}>{reference.data!.categories.map(c=><option key={c.slug} value={c.slug}>{c.title[lang]}</option>)}</select></label><label>{say('النشر','Publication')}<select disabled={!can(user.role,'catalog.publish')} value={edit.status} onChange={e=>setEdit({...edit,status:e.target.value as ProductEdit['status']})}>{['draft','published','archived'].map(s=><option key={s} value={s}>{say(s==='draft'?'مسودة':s==='published'?'منشور':'مؤرشف',s)}</option>)}</select></label></div>
    <ValueFields value={{model:edit.model,title:edit.title,summary:edit.summary,condition:edit.condition,stock:edit.stock,warrantyMonths:edit.warrantyMonths,demo:edit.demo,inspection:edit.inspection,bestFor:edit.bestFor,tags:edit.tags,specSources:edit.specSources}} onChange={value=>setEdit({...edit,...value as Partial<ProductEdit>})}/>
    <fieldset disabled={!can(user.role,'prices.edit')}><legend>{say('الأسعار','Prices')}</legend><div className="fields-grid">{(['usd','yer']as const).map(currency=><label key={currency}>{currency.toUpperCase()}<input type="text" inputMode="decimal" dir="ltr" value={edit.price[currency]??''} onChange={e=>setEdit({...edit,price:{...edit.price,[currency]:e.target.value||null}})} placeholder={say('اسأل عن السعر','Ask for price')}/></label>)}<label><input type="checkbox" checked={edit.price.negotiable} onChange={e=>setEdit({...edit,price:{...edit.price,negotiable:e.target.checked}})}/>{say('قابل للتفاوض','Negotiable')}</label></div></fieldset>
    <fieldset><legend>{say('المواصفات','Specifications')}</legend><ValueFields value={edit.specs} onChange={value=>setEdit({...edit,specs:value as ProductEdit['specs']})}/><select aria-label={say('إضافة مواصفة','Add specification')} value="" onChange={e=>{const key=e.target.value;if(key)setEdit({...edit,specs:{...edit.specs,[key]:['ramGB','storageGB','cpuGen','capacityGB','speedMbps','capacityVA','capacityWatts'].includes(key)?0:key==='ports'?[]:key==='display'?{sizeIn:0,res:''}:''}});}}><option value="">{say('أضف مواصفة…','Add specification…')}</option>{reference.data!.specs.filter(s=>!(s.key in edit.specs)).map(s=><option key={s.key} value={s.key}>{s.title[lang]}</option>)}</select></fieldset>
    <fieldset><legend>{say('الأجهزة المتوافقة','Compatible devices')}</legend>{products.data!.items.filter(p=>p.id!==edit.id).map(p=><label key={p.id}><input type="checkbox" checked={edit.compatibleWith.includes(p.id)} onChange={e=>setEdit({...edit,compatibleWith:e.target.checked?[...edit.compatibleWith,p.id]:edit.compatibleWith.filter(id=>id!==p.id)})}/>{p.title[lang]}</label>)}</fieldset>
    <fieldset><legend>{say('الصور — بالترتيب','Images — ordered')}</legend><div className="media-grid">{edit.images.map((path,index)=><div key={path}><img src={imageUrl(path)} alt={edit.title[lang]}/><button type="button" className="button secondary" disabled={!index} onClick={()=>{const next=[...edit.images];[next[index-1],next[index]]=[next[index],next[index-1]];setEdit({...edit,images:next});}}>{say('تقديم','Move earlier')}</button><button type="button" className="button secondary" onClick={()=>setEdit({...edit,images:edit.images.filter(p=>p!==path)})}>{say('إزالة من المنتج','Remove from product')}</button></div>)}</div><select aria-label={say('إضافة صورة','Add image')} value="" onChange={e=>{if(e.target.value)setEdit({...edit,images:[...edit.images,e.target.value]});}}><option value="">{say('اختر صورة من المكتبة…','Choose library image…')}</option>{media.data!.items.filter(m=>!edit.images.includes(m.originalPath)).map(m=><option key={m.id} value={m.originalPath}>{m.altAr||m.id}</option>)}</select></fieldset>
    </>}</form>}
  </>;
}

// ─────────────────────────────────────────────────────────────────────────────
// ContentSettings – redesigned, section-based layout
// ─────────────────────────────────────────────────────────────────────────────

type SiteValue = {
  storeName?:{ar:string;en:string};
  englishName?:string;
  tagline?:{ar:string;en:string};
  city?:{ar:string;en:string};
  address?:{ar:string;en:string}|null;
  foundedYear?:number|null;
  phone?:string;
  whatsapp?:string;
  workingHours?:{ar:string;en:string}|null;
  socialAccounts?:Record<string,string>;
  defaultCurrency?:string;
  warrantySlogan?:{ar:string;en:string};
  demoNotice?:{ar:string;en:string};
  [key:string]:unknown;
};

function SiteEditor({data,onChange,ar}:{data:SiteValue;onChange:(v:SiteValue)=>void;ar:boolean}){
  const { showEnglishFields } = useI18n();
  const set=(patch:Partial<SiteValue>)=>onChange({...data,...patch});
  const setL=(field:keyof SiteValue,lang:'ar'|'en',val:string)=>{
    const prev=(data[field] as {ar:string;en:string}|undefined);
    const nextAr = lang === 'ar' ? val : (prev?.ar ?? '');
    const nextEn = lang === 'en' ? val : ((!showEnglishFields || !prev?.en || prev.en === prev.ar) ? val : prev?.en ?? '');
    set({[field]:{ar: nextAr, en: nextEn}});
  };
  const addr=data.address as {ar:string;en:string}|null|undefined;
  const wh=data.workingHours as {ar:string;en:string}|null|undefined;
  return (
    <div className="cs-sections">

      {/* ── هوية المتجر */}
      <section className="cs-section">
        <div className="cs-section-header">
          <span className="cs-section-icon">🏪</span>
          <div>
            <h3 className="cs-section-title">{ar?'هوية المتجر':'Store Identity'}</h3>
            <p className="cs-section-sub">{ar?'الاسم والشعار وسنة التأسيس':'Name, tagline and founding year'}</p>
          </div>
        </div>
        <div className="cs-fields-grid">
          <label className="cs-field">
            <span className="cs-label">{ar?'اسم المتجر — عربي':'Store name — Arabic'}</span>
            <input value={data.storeName?.ar??''} onChange={e=>setL('storeName','ar',e.target.value)} placeholder={ar?'الجيل العربي الرقمي…':''}/>
          </label>
          {showEnglishFields && (
            <label className="cs-field">
              <span className="cs-label">{ar?'اسم المتجر — إنجليزي':'Store name — English'}</span>
              <input dir="ltr" value={data.storeName?.en??''} onChange={e=>setL('storeName','en',e.target.value)} placeholder="Al-Jeel Al-Arabi Al-Raqmi…"/>
            </label>
          )}
          {showEnglishFields && (
            <label className="cs-field">
              <span className="cs-label">{ar?'الاسم الإنجليزي القصير':'Short English name'}</span>
              <input dir="ltr" value={data.englishName??''} onChange={e=>set({englishName:e.target.value})} placeholder="Digital Arab Generation…"/>
            </label>
          )}
          <label className="cs-field">
            <span className="cs-label">{ar?'سنة التأسيس':'Founded year'}</span>
            <input type="number" dir="ltr" value={data.foundedYear??''} onChange={e=>set({foundedYear:e.target.value?Number(e.target.value):null})} placeholder="2020"/>
          </label>
          <label className="cs-field cs-field--full">
            <span className="cs-label">{ar?'شعار المتجر — عربي':'Tagline — Arabic'}</span>
            <input value={data.tagline?.ar??''} onChange={e=>setL('tagline','ar',e.target.value)}/>
          </label>
          {showEnglishFields && (
            <label className="cs-field cs-field--full">
              <span className="cs-label">{ar?'شعار المتجر — إنجليزي':'Tagline — English'}</span>
              <input dir="ltr" value={data.tagline?.en??''} onChange={e=>setL('tagline','en',e.target.value)}/>
            </label>
          )}
        </div>
      </section>

      {/* ── الموقع الجغرافي */}
      <section className="cs-section">
        <div className="cs-section-header">
          <span className="cs-section-icon">📍</span>
          <div>
            <h3 className="cs-section-title">{ar?'الموقع الجغرافي':'Location'}</h3>
            <p className="cs-section-sub">{ar?'المدينة والعنوان التفصيلي':'City and detailed address'}</p>
          </div>
        </div>
        <div className="cs-fields-grid">
          <label className="cs-field">
            <span className="cs-label">{ar?'المدينة — عربي':'City — Arabic'}</span>
            <input value={data.city?.ar??''} onChange={e=>setL('city','ar',e.target.value)} placeholder={ar?'صنعاء، اليمن':''}/>
          </label>
          {showEnglishFields && (
            <label className="cs-field">
              <span className="cs-label">{ar?'المدينة — إنجليزي':'City — English'}</span>
              <input dir="ltr" value={data.city?.en??''} onChange={e=>setL('city','en',e.target.value)} placeholder="Sana'a, Yemen"/>
            </label>
          )}
          {data.address!==undefined&&(<>
            <label className="cs-field cs-field--full">
              <span className="cs-label">{ar?'العنوان التفصيلي — عربي':'Full address — Arabic'}</span>
              <input
                value={addr?.ar??''}
                onChange={e=>{
                  const arVal = e.target.value;
                  const enVal = (!showEnglishFields || !addr?.en || addr.en === addr.ar) ? arVal : (addr?.en ?? '');
                  set({address:{ar:arVal,en:enVal}});
                }}
                placeholder={ar?'صنعاء، شارع صخر…':''}
              />
            </label>
            {showEnglishFields && (
              <label className="cs-field cs-field--full">
                <span className="cs-label">{ar?'العنوان التفصيلي — إنجليزي':'Full address — English'}</span>
                <input dir="ltr" value={addr?.en??''} onChange={e=>set({address:{ar:addr?.ar??'',en:e.target.value}})} placeholder="Sakhr Street, Sana'a, Yemen"/>
              </label>
            )}
          </>)}
        </div>
      </section>

      {/* ── بيانات التواصل */}
      <section className="cs-section">
        <div className="cs-section-header">
          <span className="cs-section-icon">📞</span>
          <div>
            <h3 className="cs-section-title">{ar?'بيانات التواصل':'Contact'}</h3>
            <p className="cs-section-sub">{ar?'رقم الهاتف وواتساب الدولي':'Phone and WhatsApp numbers'}</p>
          </div>
        </div>
        <div className="cs-fields-grid">
          <label className="cs-field">
            <span className="cs-label">{ar?'رقم الهاتف':'Phone number'}</span>
            <input dir="ltr" type="tel" value={data.phone??''} onChange={e=>set({phone:e.target.value})} placeholder="771001044"/>
          </label>
          <label className="cs-field">
            <span className="cs-label">{ar?'رقم واتساب الدولي':'WhatsApp (international)'}</span>
            <input dir="ltr" type="tel" value={data.whatsapp??''} onChange={e=>set({whatsapp:e.target.value})} placeholder="967771001044"/>
          </label>
        </div>
      </section>

      {/* ── ساعات العمل */}
      {data.workingHours!==undefined&&(
        <section className="cs-section">
          <div className="cs-section-header">
            <span className="cs-section-icon">🕐</span>
            <div>
              <h3 className="cs-section-title">{ar?'ساعات العمل':'Working Hours'}</h3>
              <p className="cs-section-sub">{ar?'أوقات الدوام الأسبوعية':'Weekly business schedule'}</p>
            </div>
          </div>
          <div className="cs-fields-grid">
            <label className="cs-field cs-field--full">
              <span className="cs-label">{ar?'ساعات العمل — عربي':'Working hours — Arabic'}</span>
              <input
                value={wh?.ar??''}
                onChange={e=>{
                  const arVal = e.target.value;
                  const enVal = (!showEnglishFields || !wh?.en || wh.en === wh.ar) ? arVal : (wh?.en ?? '');
                  set({workingHours:{ar:arVal,en:enVal}});
                }}
                placeholder={ar?'السبت – الخميس: 9:00 صباحاً – 9:00 مساءً':''}
              />
            </label>
            {showEnglishFields && (
              <label className="cs-field cs-field--full">
                <span className="cs-label">{ar?'ساعات العمل — إنجليزي':'Working hours — English'}</span>
                <input dir="ltr" value={wh?.en??''} onChange={e=>set({workingHours:{ar:wh?.ar??'',en:e.target.value}})} placeholder="Saturday – Thursday: 9:00 AM – 9:00 PM"/>
              </label>
            )}
          </div>
        </section>
      )}

      {/* ── حسابات التواصل الاجتماعي */}
      {data.socialAccounts!==undefined&&Object.keys(data.socialAccounts??{}).length>0&&(
        <section className="cs-section">
          <div className="cs-section-header">
            <span className="cs-section-icon">🌐</span>
            <div>
              <h3 className="cs-section-title">{ar?'حسابات التواصل الاجتماعي':'Social Accounts'}</h3>
              <p className="cs-section-sub">{ar?'روابط منصات التواصل':'Social media platform links'}</p>
            </div>
          </div>
          <div className="cs-fields-grid">
            {Object.entries(data.socialAccounts??{}).map(([platform,handle])=>(
              <label key={platform} className="cs-field">
                <span className="cs-label cs-label--platform">{platform}</span>
                <input dir="ltr" value={String(handle)} onChange={e=>set({socialAccounts:{...data.socialAccounts,[platform]:e.target.value}})} placeholder={`@${platform}...`}/>
              </label>
            ))}
          </div>
        </section>
      )}

      {/* ── الإعدادات والضمان */}
      <section className="cs-section">
        <div className="cs-section-header">
          <span className="cs-section-icon">⚙️</span>
          <div>
            <h3 className="cs-section-title">{ar?'الإعدادات والضمان':'Settings & Warranty'}</h3>
            <p className="cs-section-sub">{ar?'العملة الافتراضية وشعار الضمان':'Default currency and warranty tagline'}</p>
          </div>
        </div>
        <div className="cs-fields-grid">
          <label className="cs-field">
            <span className="cs-label">{ar?'العملة الافتراضية':'Default currency'}</span>
            <select value={data.defaultCurrency??'USD'} onChange={e=>set({defaultCurrency:e.target.value})}>
              <option value="USD">USD — {ar?'دولار أمريكي':'US Dollar'}</option>
              <option value="YER">YER — {ar?'ريال يمني':'Yemeni Rial'}</option>
            </select>
          </label>
          {data.warrantySlogan!==undefined&&(<>
            <label className="cs-field">
              <span className="cs-label">{ar?'شعار الضمان — عربي':'Warranty slogan — Arabic'}</span>
              <input value={data.warrantySlogan?.ar??''} onChange={e=>setL('warrantySlogan','ar',e.target.value)}/>
            </label>
            {showEnglishFields && (
              <label className="cs-field">
                <span className="cs-label">{ar?'شعار الضمان — إنجليزي':'Warranty slogan — English'}</span>
                <input dir="ltr" value={data.warrantySlogan?.en??''} onChange={e=>setL('warrantySlogan','en',e.target.value)}/>
              </label>
            )}
          </>)}
        </div>
      </section>

    </div>
  );
}

export function ContentSettings(){
  const {lang}=useI18n(),ar=lang==='ar',client=useQueryClient();
  const [key,setKey]=useState('site');
  const [value,setValue]=useState<unknown>(null);
  const [revision,setRevision]=useState('');
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  const [saved,setSaved]=useState(false);

  const query=useQuery({queryKey:['content',key],queryFn:()=>api<{value:unknown;updatedAt:string}>('/content/'+key)});

  const tabs=[
    {id:'site',      arLabel:'معلومات المتجر',   enLabel:'Store Details',   icon:'🏪'},
    {id:'homeImages',arLabel:'صور الصفحة الرئيسية', enLabel:'Homepage Images', icon:'🖼️'},
    {id:'about',     arLabel:'صفحة من نحن',      enLabel:'About Page',      icon:'🏢'},
    {id:'faq',       arLabel:'الأسئلة الشائعة',  enLabel:'FAQ',             icon:'❓'},
    {id:'warranty',  arLabel:'سياسة الضمان',     enLabel:'Warranty Policy', icon:'🛡️'},
    {id:'bundles',   arLabel:'التجهيزات',        enLabel:'Setups',          icon:'📦'},
  ];

  async function handleSubmit(e:FormEvent){
    e.preventDefault();setBusy(true);setError('');setSaved(false);
    try{
      let payloadValue = value ?? query.data!.value;
      if (key === 'site' && payloadValue && typeof payloadValue === 'object') {
        const s = { ...(payloadValue as Record<string, any>) };
        for (const field of ['storeName', 'city', 'tagline', 'address', 'workingHours', 'warrantySlogan', 'demoNotice']) {
          if (s[field] && typeof s[field] === 'object') {
            const arText = (s[field].ar || '').trim();
            const enText = (s[field].en || '').trim();
            s[field] = { ar: arText || enText, en: enText || arText };
          }
        }
        payloadValue = s;
      }
      const result=await api<{value:unknown;updatedAt:string}>('/content/'+key,{
        method:'PATCH',
        body:{value:payloadValue,revision:revision||query.data!.updatedAt}
      });
      setValue(result.value);setRevision(result.updatedAt);
      await client.invalidateQueries({queryKey:['content',key]});
      setSaved(true);setTimeout(()=>setSaved(false),3000);
    }catch(err){
      setError(err instanceof ApiError?err.code:'failed');
    }finally{setBusy(false);}
  }

  return (
    <div className="cs-page">

      {/* Page Header */}
      <div className="page-heading">
        <div>
          <h1>{ar?'محتوى المتجر':'Store Content'}</h1>
          <p className="muted" style={{fontSize:12,marginTop:4}}>
            {ar?'إدارة النصوص والبيانات الظاهرة في الموقع':'Manage texts and data displayed on the storefront'}
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="cs-tabs">
        {tabs.map(tab=>(
          <button
            key={tab.id}
            type="button"
            className={`cs-tab${key===tab.id?' cs-tab--active':''}`}
            onClick={()=>{setKey(tab.id);setValue(null);setRevision('');setError('');setSaved(false);}}
          >
            <span className="cs-tab-icon">{tab.icon}</span>
            <span>{ar?tab.arLabel:tab.enLabel}</span>
          </button>
        ))}
      </div>

      <ErrorBox code={error}/>

      {key==='homeImages' ? <HomeImagesManager /> : key==='about' ? (
        query.isPending?<Loading/>:query.isError?<ErrorBox code="failed"/>:(
          <AboutEditor
            ar={ar}
            data={(value ?? query.data!.value) as AboutData}
            onChange={next=>{setValue(next);if(!revision)setRevision(query.data!.updatedAt);}}
            onSave={handleSubmit}
            busy={busy}
            saved={saved}
          />
        )
      ) : query.isPending?<Loading/>:query.isError?<ErrorBox code="failed"/>:(
        <form onSubmit={handleSubmit}>
          {key==='site'?(
            <SiteEditor
              ar={ar}
              data={(value??query.data!.value) as SiteValue}
              onChange={next=>{setValue(next);if(!revision)setRevision(query.data!.updatedAt);}}
            />
          ):(
            <div className="cs-sections">
              <section className="cs-section">
                <ValueFields
                  value={value??query.data!.value}
                  name={key}
                  onChange={next=>{setValue(next);if(!revision)setRevision(query.data!.updatedAt);}}
                />
                {key==='faq'&&(
                  <button type="button" className="button secondary" style={{marginTop:12}} onClick={()=>{
                    setValue([...(value??query.data!.value) as unknown[],{id:crypto.randomUUID(),question:{ar:'',en:''},answer:{ar:'',en:''},category:''}]);
                    setRevision(revision||query.data!.updatedAt);
                  }}>
                    + {ar?'إضافة سؤال جديد':'Add new question'}
                  </button>
                )}
              </section>
            </div>
          )}

          {/* Save Footer */}
          <div className="cs-save-bar">
            {saved&&(
              <span className="cs-saved-badge">
                ✓ {ar?'تم الحفظ بنجاح':'Saved successfully'}
              </span>
            )}
            <button className="button primary" disabled={busy}>
              {busy?(ar?'جارٍ الحفظ…':'Saving…'):(ar?'حفظ التغييرات':'Save Changes')}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
export function ReferenceSettings({onlyBrands=false}:{onlyBrands?:boolean}={}){
  const {lang}=useI18n(),ar=lang==='ar',client=useQueryClient();const reference=useQuery({queryKey:['reference'],queryFn:()=>api<Reference>('/reference')});const brandMedia=useQuery({queryKey:['media'],queryFn:()=>api<{items:Media[]}>('/media')});const [kind,setKind]=useState('brands'),[value,setValue]=useState<unknown>(null),[error,setError]=useState('');
  if(reference.isPending)return <Loading/>;if(reference.isError)return <ErrorBox code="failed"/>;
  const options=kind==='brands'?reference.data.brands.map(b=>({label:b.name,value:{id:b.id,name:b.name,logoMediaId:b.logoMediaId??null,description:b.description,...(b.tagline?{tagline:b.tagline}:{}),...(b.claim?{claim:b.claim}:{}),categories:b.categories.map(c=>c.categorySlug),published:b.published,sort:b.sort}})):kind==='categories'?reference.data.categories.map(c=>({label:c.title[lang],value:c})):reference.data.specs.map(s=>({label:s.title[lang],value:s}));
  return <><h1>{ar?'العلامات والتصنيفات والفلاتر':'Brands, categories & filters'}</h1><ErrorBox code={error}/><div className="toolbar"><select aria-label={ar?'نوع البيانات':'Data type'} value={kind} onChange={e=>{setKind(e.target.value);setValue(null);}}>{(onlyBrands?[['brands','العلامات','Brands']]:[['brands','العلامات','Brands'],['categories','التصنيفات','Categories'],['specs','مواصفات الفلاتر','Filter specifications']]).map(([id,a,e])=><option key={id} value={id}>{ar?a:e}</option>)}</select><select aria-label={ar?'تعديل عنصر':'Edit item'} value="" onChange={e=>{if(e.target.value)setValue(options[Number(e.target.value)-1].value);}}><option value="">{ar?'اختر عنصرًا لتعديله':'Choose item to edit'}</option>{options.map((o,i)=><option key={i} value={i+1}>{o.label}</option>)}</select><button className="button primary" onClick={()=>setValue(kind==='brands'?{id:'',name:'',description:{ar:'',en:''},categories:[],published:false,sort:0}:kind==='categories'?{slug:'',title:{ar:'',en:''},sort:0}:{key:'',title:{ar:'',en:''},filterable:true})}>{ar?'إضافة جديد':'Add new'}</button></div>{value!==null&&<form className="card content-editor" onSubmit={async e=>{e.preventDefault();setError('');try{await api('/'+kind,{method:'POST',body:value});setValue(null);await client.invalidateQueries({queryKey:['reference']});}catch(e){setError(e instanceof ApiError?e.code:'failed');}}}>  <ValueFields value={value} onChange={setValue}/>{kind==="brands"&&<label>{ar?"شعار العلامة":"Brand logo"}<select value={String((value as {logoMediaId?:string}).logoMediaId??"")} onChange={e=>setValue({...value as object,logoMediaId:e.target.value||null})}><option value="">{ar?"بدون شعار":"No logo"}</option>{brandMedia.data?.items.map(m=><option key={m.id} value={m.id}>{m.altAr||m.id}</option>)}</select></label>}<button className="button primary">{ar?'حفظ':'Save'}</button></form>}</>;
}
export function MediaLibrary(){
  const {lang, showEnglishFields}=useI18n(),ar=lang==='ar',client=useQueryClient();const query=useQuery({queryKey:['media'],queryFn:()=>api<{items:Media[]}>('/media')});const [error,setError]=useState(''),[busy,setBusy]=useState(false),[altAr,setAltAr]=useState(''),[altEn,setAltEn]=useState('');
  return <><h1>{ar?'مكتبة الصور':'Image library'}</h1><ErrorBox code={error}/><section className="card content-editor"><p>{ar?'JPEG أو PNG أو WebP، بحد أقصى 4 ميجابايت. تُحفظ الصور مع قاعدة البيانات.':'JPEG, PNG or WebP, up to 4 MB. Images are stored with the database.'}</p><label>{ar?'وصف الصورة بالعربية':'Arabic description'}<input value={altAr} onChange={e=>setAltAr(e.target.value)}/></label>{showEnglishFields&&<label>{ar?'وصف الصورة بالإنجليزية':'English description'}<input value={altEn} onChange={e=>setAltEn(e.target.value)}/></label>}<label>{ar?'رفع صورة':'Upload image'}<input disabled={busy||!altAr||(showEnglishFields&&!altEn)} type="file" accept="image/jpeg,image/png,image/webp" onChange={async e=>{const file=e.target.files?.[0];if(!file)return;setError('');if(file.size>4*1024*1024){setError('image_too_large');return;}setBusy(true);try{const buffer=new Uint8Array(await file.arrayBuffer());let raw='';for(const byte of buffer)raw+=String.fromCharCode(byte);await api('/media',{method:'POST',body:{type:file.type,data:btoa(raw),altAr,altEn:altEn.trim()||altAr.trim()}});await client.invalidateQueries({queryKey:['media']});e.target.value='';}catch(error){setError(error instanceof ApiError?error.code:'failed');}finally{setBusy(false);}}}/></label></section>{query.isPending?<Loading/>:query.isError?<ErrorBox code="failed"/>:<div className="media-grid">{query.data!.items.map(m=><article className="card" key={m.id}><img src={imageUrl(m.originalPath)} alt={lang==='ar'?m.altAr:m.altEn}/><p>{lang==='ar'?m.altAr:m.altEn}</p><button className="button secondary" onClick={async()=>{if(!window.confirm(ar?'حذف هذه الصورة غير المستخدمة؟':'Delete this unused image?'))return;try{await api('/media/'+m.id,{method:'DELETE'});await client.invalidateQueries({queryKey:['media']});}catch(e){setError(e instanceof ApiError?e.code:'failed');}}}>{ar?'حذف الصورة':'Delete image'}</button></article>)}</div>}</>;
}
export { HomeImagesManager } from './HomeImages';
