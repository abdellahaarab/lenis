import {useI18n} from './i18n';
const labels:Record<string,[string,string]>={ar:['العربية','Arabic'],en:['الإنجليزية','English'],model:['الموديل','Model'],title:['الاسم','Title'],packageTitle:['اسم الباقة','Package Title'],summary:['الوصف المختصر','Summary'],condition:['حالة الجهاز','Device condition'],stock:['التوفر','Availability'],warrantyMonths:['الضمان بالأشهر','Warranty months'],demo:['بيانات تجريبية','Illustrative product'],inspection:['الفحص','Inspection'],passed:['اجتاز الفحص','Inspection passed'],date:['تاريخ الفحص','Inspection date'],notes:['ملاحظات','Notes'],tags:['وسوم','Tags'],bestFor:['الاستخدامات المناسبة','Suitable uses'],specSources:['مصادر المواصفات','Specification sources'],storeName:['اسم المتجر','Store name'],englishName:['الاسم الإنجليزي','English name'],city:['المدينة','City'],tagline:['الشعار','Tagline'],warrantySlogan:['شعار الضمان','Warranty slogan'],foundedYear:['سنة التأسيس','Founded year'],address:['العنوان','Address'],phone:['رقم الهاتف','Phone'],whatsapp:['رقم واتساب الدولي','International WhatsApp number'],workingHours:['ساعات العمل','Working hours'],socialAccounts:['حسابات التواصل','Social accounts'],defaultCurrency:['العملة الافتراضية','Default currency'],officialAgentClaim:['ادعاء وكالة رسمية','Official agent claim'],demoNotice:['تنبيه البيانات التجريبية','Demo notice'],question:['السؤال','Question'],answer:['الإجابة','Answer'],category:['الفئة','Category'],conditionGrades:['درجات حالة الجهاز','Condition grades'],inspectionChecklist:['قائمة الفحص','Inspection checklist'],policy:['سياسة الضمان','Warranty policy'],grade:['الدرجة','Grade'],label:['التسمية','Label'],meaning:['المعنى','Meaning'],criteria:['المعايير','Criteria'],description:['الوصف','Description'],durationNote:['مدة الضمان','Warranty duration'],coverage:['التغطية','Coverage'],exclusions:['الاستثناءات','Exclusions'],replacementOrRepair:['الاستبدال أو الإصلاح','Replacement or repair'],immediateReplacementPeriod:['فترة الاستبدال الفوري','Immediate replacement period'],proofOfPurchase:['إثبات الشراء','Proof of purchase'],claimProcess:['طريقة طلب الضمان','Warranty claim process'],id:['المعرّف','Identifier'],slug:['الرابط الإنجليزي','URL slug'],key:['اسم المواصفة','Specification key'],name:['الاسم','Name'],categories:['تصنيفات العلامة','Brand categories'],published:['ظاهر في الموقع','Visible on site'],sort:['الترتيب','Order'],filterable:['يستخدم في الفلاتر','Available as filter'],cpu:['المعالج','CPU'],cpuGen:['جيل المعالج','CPU generation'],ramGB:['الرام GB','RAM GB'],storageGB:['التخزين GB','Storage GB'],storageType:['نوع التخزين','Storage type'],ramType:['نوع الرام','RAM type'],ramUpgradable:['قابلية ترقية الرام','RAM upgradable'],display:['مواصفات الشاشة','Display'],ports:['المنافذ','Ports'],batteryHealthPct:['صحة البطارية %','Battery health %'],gpu:['الرسوميات','GPU'],sizeIn:['المقاس بالبوصة','Size in inches'],res:['الدقة','Resolution'],touch:['شاشة لمس','Touchscreen'],hz:['التردد Hz','Refresh rate Hz'],panel:['نوع اللوحة','Panel type'],color:['اللون','Color'],keyboard:['لوحة المفاتيح','Keyboard'],weightKg:['الوزن (كجم)','Weight (kg)'],os:['نظام التشغيل','Operating system'],camera:['الكاميرا','Camera'],why:['سبب اختيار التجهيز','Why this setup'],problemSolved:['الحاجة التي يعالجها','Problem solved'],tiers:['مستويات التجهيز','Setup tiers'],items:['معرّفات المنتجات','Product identifiers'],price:['السعر','Price']};
const options:Record<string,string[]>={condition:['new','A','B','C'],grade:['new','A','B','C'],stock:['in_stock','low','order','sold'],defaultCurrency:['USD','YER']};
const nullableNumbers=new Set(['warrantyMonths','foundedYear','batteryHealthPct','usd','yer']);
const nullableLocalized=new Set(['address','workingHours']);
const multilineFields = new Set([
  'summary', 'description', 'notes', 'why', 'problemSolved',
  'coverage', 'exclusions', 'claimProcess', 'criteria', 'meaning'
]);

export function ValueFields({value,onChange,name='',depth=0,hideEnglish}:{value:unknown;onChange:(value:unknown)=>void;name?:string;depth?:number;hideEnglish?:boolean}){
  const {lang, showEnglishFields}=useI18n(),ar=lang==='ar',label=labels[name]?.[ar?0:1]??name;
  const effectiveHideEnglish = hideEnglish !== undefined ? hideEnglish : !showEnglishFields;

  if (effectiveHideEnglish && name === 'en') return null;

  if(Array.isArray(value))return (
    <fieldset className="value-array-fieldset">
      <legend>{label}</legend>
      <div className="array-items-list">
        {value.map((v,i)=>(
          <div className="array-row" key={i}>
            <div className="array-input-cell">
              <ValueFields name={typeof v==='object'?'':name} value={v} depth={depth+1} hideEnglish={effectiveHideEnglish} onChange={next=>onChange(value.map((old,j)=>j===i?next:old))}/>
            </div>
            <div className="array-actions-cell">
              <button type="button" className="button secondary sm danger-tone" title={ar?'إزالة':'Remove'} onClick={()=>onChange(value.filter((_,j)=>j!==i))}>{ar?'إزالة':'Remove'}</button>
              <button type="button" className="button secondary sm" disabled={!i} title={ar?'تقديم':'Move earlier'} onClick={()=>{const next=[...value];[next[i-1],next[i]]=[next[i],next[i-1]];onChange(next);}}>{ar?'تقديم':'Move earlier'}</button>
            </div>
          </div>
        ))}
      </div>
      {(value.length===0||value.every(v=>typeof v==='string'))&&(
        <button type="button" className="button secondary sm add-val-btn" onClick={()=>onChange([...value,''])}>
          + {ar?'إضافة قيمة':'Add value'}
        </button>
      )}
    </fieldset>
  );

  if(value!==null&&typeof value==='object')return (
    <fieldset className="value-object-fieldset">
      <legend>{label}</legend>
      <div className="fields-grid">
        {Object.entries(value)
          .filter(([key])=>!['createdAt','updatedAt','logoMediaId','isAuthorizedDealer','claim'].includes(key))
          .filter(([key])=>!(effectiveHideEnglish && key === 'en'))
          .map(([key,v])=>(
            <ValueFields
              key={key}
              name={key}
              value={v}
              depth={depth+1}
              hideEnglish={effectiveHideEnglish}
              onChange={next=>{
                const currentObj = value as Record<string, unknown>;
                const nextObj = { ...currentObj, [key]: next };
                if (effectiveHideEnglish && key === 'ar' && ('en' in currentObj)) {
                  const curEn = currentObj.en;
                  if (!curEn || curEn === currentObj.ar) {
                    nextObj.en = next;
                  }
                }
                onChange(nextObj);
              }}
            />
          ))}
      </div>
    </fieldset>
  );

  if(typeof value==='boolean')return (
    <label className="checkbox-field">
      <input type="checkbox" disabled={name==='officialAgentClaim'} checked={value} onChange={e=>onChange(e.target.checked)}/>
      <span>{label}</span>
    </label>
  );

  if(options[name])return (
    <label>
      <span>{label}</span>
      <select value={String(value??'')} onChange={e=>onChange(e.target.value)}>
        {options[name].map(o=><option key={o}>{o}</option>)}
      </select>
    </label>
  );

  if(value===null&&nullableLocalized.has(name))return (
    <label>
      <span>{label}</span>
      <button type="button" className="button secondary sm" onClick={()=>onChange({ar:'',en:''})}>
        {ar?'إضافة معلومة مؤكدة':'Add confirmed information'}
      </button>
    </label>
  );

  const isMultiline = multilineFields.has(name);
  if(isMultiline) {
    return (
      <label className="textarea-field-label">
        <span className="field-label-text">{label}</span>
        <textarea
          rows={3}
          dir={name==='en'?'ltr':undefined}
          value={value==null?'':String(value)}
          placeholder={value===null?(ar?'غير محدد':'Not provided'):(ar?'أدخل التفاصيل والوصف…':'Enter description and details…')}
          onChange={e=>onChange(e.target.value===''?(value===null?null:''):e.target.value)}
          className="multiline-textarea"
        />
      </label>
    );
  }

  const number=typeof value==='number'||nullableNumbers.has(name);
  return (
    <label>
      <span className="field-label-text">{label}</span>
      <input
        dir={name==='en'||['slug','id','key','whatsapp','phone'].includes(name)?'ltr':undefined}
        type={number?'number':'text'}
        step={number?'any':undefined}
        value={value==null?'':String(value)}
        placeholder={value===null?(ar?'غير محدد':'Not provided'):undefined}
        onChange={e=>onChange(e.target.value===''?(number||value===null?null:''):number?Number(e.target.value):e.target.value)}
      />
    </label>
  );
}
