import json
from pathlib import Path
def read(file):return json.loads(Path(file).read_text(encoding='utf-8-sig'))
def write(file,data):Path(file).write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
products=read('src/data/products.json')
old='aud-shure-mv7-005';new='aud-logitech-g432-005'
for p in products:
 p['compatibleWith']=[new if x==old else x for x in p['compatibleWith']]
 p['inspection']={'passed':False,'date':None,'notes':{'ar':'نموذج تجريبي؛ الفحص الفعلي ينتظر جهاز المتجر.','en':'Demo model; physical inspection awaits store inventory.'}}
 if p['id']==old:
  p.update(id=new,slug='logitech-g432-wired-gaming-headset',model='G432',brand='Logitech',title={'ar':'سماعة لوجيتك G432 للألعاب','en':'Logitech G432 Wired Gaming Headset'},summary={'ar':'سماعة ألعاب سلكية بميكروفون قابل للرفع واتصال USB أو 3.5 مم.','en':'Wired gaming headset with a flip-to-mute microphone and USB or 3.5 mm connectivity.'},specs={'connectionType':'USB / 3.5 mm','frequencyResponse':'20 Hz – 20 kHz','ports':['USB','3.5 mm'],'weightKg':.259},specSources=['https://www.logitechg.com/en-us/shop/p/g432-7-1-surround-sound-gaming-headset'])
 if p['category']=='power':
  p['brand']='غير محددة';p['model']='UPS 650VA (demo)';p['slug']='demo-ups-650va';p['title']['en']='Demo UPS 650VA / 360W — brand unconfirmed'
  p['images']=['/images/products/ups-illustration.svg']
 p['connections']=[{'targetId':x,'port':None,'watts':None,'verified':False,'source':None} for x in p['compatibleWith']]
 # Images are assigned by the download script, only to the corresponding model.
 if p['category']!='power':p['images']=[f"/images/products/{p['id']}-960.webp"]
write('src/data/products.json',products)
bundles=read('src/data/bundles.json')
for b in bundles:
 for tier in b['tiers']:tier['items']=[new if x==old else x for x in tier['items']]
 if b['id']=='study':
  b['summary']={'ar':'لابتوب خفيف وتخزين سريع للدراسة.','en':'A light laptop and fast storage for study.'}
  b['tiers'][0]['summary']={'ar':'ثينك باد T490s مع قرص Samsung 980 PRO. توافق القرص مع الجهاز يحتاج تحققًا.','en':'ThinkPad T490s with Samsung 980 PRO. Drive compatibility needs verification.'}
 if b['id']=='work':b['why']={'ar':'مساحة إضافية للشاشة وتجهيز طاقة احتياطية. التوافق وزمن التشغيل يحتاجان تحققًا.','en':'Extra screen space and backup power. Compatibility and runtime require verification.'}
 if b['id']=='content':
  b['summary']={'ar':'محطة عمل متنقلة، سماعة بميكروفون، وتخزين سريع.','en':'A mobile workstation, headset with microphone, and fast storage.'}
  b['tiers'][0]['summary']={'ar':'ثينك باد P1 مع سماعة Logitech G432 وقرص Samsung 980 PRO.','en':'ThinkPad P1 with Logitech G432 and Samsung 980 PRO.'}
 if b['id']=='gaming':
  b['summary']={'ar':'لابتوب ASUS للألعاب مع منظومة اتصال TP-Link.','en':'An ASUS gaming laptop with TP-Link connectivity.'}
  b['problemSolved']={'ar':'تجهيز مقترح للألعاب؛ استقرار الشبكة يُختبر في موقع الاستخدام.','en':'A suggested gaming setup; network stability is tested at the installation site.'}
  b['tiers'][0]['summary']={'ar':'Zephyrus G14 مع Deco X50. التوافق الشبكي يحتاج تحققًا.','en':'Zephyrus G14 with Deco X50. Network compatibility needs verification.'}
write('src/data/bundles.json',bundles)
Path('public/images/products').mkdir(parents=True,exist_ok=True)
Path('public/images/products/ups-illustration.svg').write_text('''<svg xmlns="http://www.w3.org/2000/svg" width="960" height="640" viewBox="0 0 960 640"><rect width="960" height="640" fill="white"/><path d="M350 100h210l50 35v385H350z" fill="#343947"/><path d="M560 100l50 35v385h-50z" fill="#202534"/><rect x="390" y="166" width="122" height="78" rx="10" fill="#151b25"/><rect x="402" y="180" width="96" height="46" rx="5" fill="#b5b1ee"/><path d="M398 300h108m-108 24h108m-108 24h108m-108 24h108m-108 24h108" stroke="#737c91" stroke-width="8"/><text x="480" y="590" fill="#625b70" text-anchor="middle" font-family="Arial" font-size="24">Illustration — demo UPS</text></svg>''',encoding='utf8')
