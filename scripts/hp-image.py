import requests,concurrent.futures,io,json
from pathlib import Path
from PIL import Image
import pymupdf
exec(Path('scripts/download-product-images.py').read_text().split('def download(item):')[0])
urls=['https://h20195.www2.hp.com/v2/GetPDF.aspx/4AA7-6811ENUC.pdf','https://h20195.www2.hp.com/v2/GetDocument.aspx?docname=4AA7-6811ENUC','https://www.hp.com/h20195/v2/GetPDF.aspx/4AA7-6811ENUC.pdf']
def get(u):
 try:
  r=requests.get(u,timeout=25);print(u,r.status_code,r.headers.get('content-type'));return u,r.content
 except Exception as e:return u,b''
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as ex:results=list(ex.map(get,urls))
for u,data in results:
 if not data.startswith(b'%PDF'):continue
 doc=pymupdf.open(stream=data,filetype='pdf');entries=[doc.extract_image(x[0]) for x in doc[0].get_images(full=True)];print('HP embedded sizes',[(d['width'],d['height']) for d in entries])
 d=max((x for x in entries if x['width']>300 and x['height']>150),key=lambda d:d['width']*d['height']);im=Image.open(io.BytesIO(d['image']));im.save('review/originals/lap-elitebook-840-g7-002.png');files=normalize(im,'lap-elitebook-840-g7-002')
 manifest=json.loads(Path('public/images/sources.json').read_text(encoding='utf8'));manifest['images'].append({'productId':'lap-elitebook-840-g7-002','files':files,'source':u,'sourcePage':u,'potentialLicense':'HP data sheet copyright. Redistribution permission not established.','licensed':False,'demoOnly':True,'retrievedAt':'2026-10-02'});Path('public/images/sources.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf8');break
