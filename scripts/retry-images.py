import requests,json,io,concurrent.futures
from pathlib import Path
from PIL import Image
exec(Path('scripts/download-product-images.py').read_text().split('def download(item):')[0])
def get(item):
 id,url,page=item
 try:
  if id=='lap-elitebook-840-g7-002':
   import fitz
   r=requests.get(url,timeout=45);r.raise_for_status();doc=fitz.open(stream=r.content,filetype='pdf')
   entries=[doc.extract_image(x[0]) for x in doc[0].get_images(full=True)]
   print('HP embedded images',[(d['width'],d['height']) for d in entries])
   d=max((x for x in entries if x['width']>300 and x['height']>150),key=lambda d:d['width']*d['height']);im=Image.open(io.BytesIO(d['image']))
  elif Path(f'review/originals/{id}.png').exists():im=Image.open(f'review/originals/{id}.png')
  else:
   r=requests.get(url,timeout=45);r.raise_for_status();im=Image.open(io.BytesIO(r.content))
  im.save(f'review/originals/{id}.png');files=normalize(im,id)
  return {'productId':id,'files':files,'source':url,'sourcePage':page,'potentialLicense':'Manufacturer copyright; redistribution permission not established.','licensed':False,'demoOnly':True,'retrievedAt':'2026-10-02'}
 except Exception as e:print(id,str(e));return None
jobs=[]
for id in ['lap-latitude-7420-003','disp-dell-u2722de-004']:
 url,page=sources[id];url=url.replace('DellContent/content','DellContent//content').replace('fmt=png-alpha&wid=1200','fmt=jpg&hei=367&wid=500');jobs.append((id,url,page))
url='https://www8.hp.com/h20195/v2/GetPDF.aspx/4AA7-6811ENUC.pdf';jobs.append(('lap-elitebook-840-g7-002',url,url))
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as ex:results=list(ex.map(get,jobs))
manifest=json.loads(Path('public/images/sources.json').read_text(encoding='utf8'))
for record in results:
 if record:manifest['images']=[r for r in manifest['images'] if r['productId']!=record['productId']]+[record]
Path('public/images/sources.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf8')
print('Completed:',[r['productId'] for r in results if r])
