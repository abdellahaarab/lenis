import requests,json,io
from pathlib import Path
from PIL import Image
exec(Path('scripts/download-product-images.py').read_text().split('def download(item):')[0])
manifest=json.loads(Path('public/images/sources.json').read_text(encoding='utf8'))
for id in ['lap-latitude-7420-003','disp-dell-u2722de-004']:
 url,page=sources[id];url=url.replace('DellContent/content','DellContent//content').replace('fmt=png-alpha&wid=1200','fmt=jpg&wid=1000')
 r=requests.get(url,timeout=30);print(id,r.status_code,r.headers.get('content-type'))
 if r.status_code==200:
  im=Image.open(io.BytesIO(r.content));files=normalize(im,id);im.save(f'review/originals/{id}.png')
  manifest['images'].append({'productId':id,'files':files,'source':url,'sourcePage':page,'potentialLicense':'Manufacturer copyright; permission not established.','licensed':False,'demoOnly':True,'retrievedAt':'2026-10-02'})
import fitz
url='https://www8.hp.com/h20195/v2/GetPDF.aspx/4AA7-6811ENUC.pdf'
r=requests.get(url,timeout=40);print('hp',r.status_code,r.headers.get('content-type'))
doc=fitz.open(stream=r.content,filetype='pdf');entries=[doc.extract_image(x[0]) for x in doc[0].get_images(full=True)];print([(d['width'],d['height']) for d in entries])
d=max((x for x in entries if x['width']>300 and x['height']>150),key=lambda d:d['width']*d['height'])
im=Image.open(io.BytesIO(d['image']));im.save('review/originals/lap-elitebook-840-g7-002.png');files=normalize(im,'lap-elitebook-840-g7-002')
manifest['images'].append({'productId':'lap-elitebook-840-g7-002','files':files,'source':url,'sourcePage':url,'potentialLicense':'HP product datasheet copyright; permission not established.','licensed':False,'demoOnly':True,'retrievedAt':'2026-10-02'})
Path('public/images/sources.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf8')
