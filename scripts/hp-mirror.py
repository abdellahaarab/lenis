import requests,io,json
from pathlib import Path
from PIL import Image
import pymupdf
exec(Path('scripts/download-product-images.py').read_text().split('def download(item):')[0])
u='https://cdn.panacompu.com/doc/pd/hp-elitebook-840-g7-datasheet.pdf'
r=requests.get(u,timeout=25);r.raise_for_status();doc=pymupdf.open(stream=r.content,filetype='pdf');print(doc[0].get_text()[:110]);entries=[doc.extract_image(x[0]) for x in doc[0].get_images(full=True)];print([(x['width'],x['height']) for x in entries]);d=max((x for x in entries if x['width']>300 and x['height']>150),key=lambda d:d['width']*d['height']);im=Image.open(io.BytesIO(d['image']));im.save('review/originals/lap-elitebook-840-g7-002.png');files=normalize(im,'lap-elitebook-840-g7-002')
manifest=json.loads(Path('public/images/sources.json').read_text(encoding='utf8'));manifest['images'].append({'productId':'lap-elitebook-840-g7-002','files':files,'source':u,'sourcePage':'https://www8.hp.com/h20195/v2/GetPDF.aspx/4AA7-6811ENUC.pdf','manufacturer':'HP','potentialLicense':'HP manufacturer datasheet 4AA7-6811, mirrored by distributor because HP endpoint is unavailable. Image copyright HP; redistribution permission not established.','licensed':False,'demoOnly':True,'retrievedAt':'2026-10-02'});Path('public/images/sources.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf8')
