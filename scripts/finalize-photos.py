import requests,io,json,shutil
from pathlib import Path
from PIL import Image
exec(Path('scripts/download-product-images.py').read_text().split('def download(item):')[0])
manifest=json.loads(Path('public/images/sources.json').read_text(encoding='utf8'))
id='lap-latitude-7420-003'
normalize(Image.open('review/dell-non-touch.png'),id)
entry=next(e for e in manifest['images'] if e['productId']==id)
entry['source']='https://i.dell.com/is/image/DellContent//content/dam/ss2/product-images/dell-client-products/notebooks/latitude-notebooks/latitude-14-7420/global-spi/ng/non-touch/notebook-latitude-14-7420-nt-relsize-500-ng.psd?fmt=png-alpha&wid=1000'
u='https://images.samsung.com/is/image/samsung/au-980-pro-nvme-m2-ssd-mz-v8p1t0bw-frontblack-292739022?wid=1600&fmt=png-alpha'
r=requests.get(u,timeout=30);r.raise_for_status();im=Image.open(io.BytesIO(r.content));im.save('review/ssd-final.png');normalize(im,'sto-samsung-980-pro-008')
entry=next(e for e in manifest['images'] if e['productId']=='sto-samsung-980-pro-008');entry['source']=u;entry['sourcePage']='https://www.samsung.com/au/memory-storage/nvme-ssd/980-pro-pcle-4-0-nvme-m-2-ssd-1tb-mz-v8p1t0bw/'
# Replace the old demo image aliases as well, so no Apple devices remain in public assets.
aliases={'laptop':'lap-thinkpad-t490s-001','laptop-design':'lap-thinkpad-p1-gen4-010','desktop':'disp-dell-u2722de-004','display-screen':'disp-dell-u2722de-004','headphones':'aud-logitech-g432-005','network':'net-tplink-deco-x50-007','storage':'sto-samsung-980-pro-008','gaming':'gam-asus-rog-zephyrus-g14-006','study':'lap-thinkpad-t490s-001','content':'lap-thinkpad-p1-gen4-010'}
for alias,id in aliases.items():
 shutil.copyfile(f'public/images/products/{id}-960.webp',f'public/images/{alias}.webp')
 next(e for e in manifest['images'] if e['productId']==id)['files'].append(f'/images/{alias}.webp')
im=Image.new('RGB',(960,640),'white')
# Existing old power alias is removed; legacy unused components use the local demo SVG.
Path('public/images/sources.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print('Replaced product photos and legacy aliases')
