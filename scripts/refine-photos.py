import requests,re,json,io
from pathlib import Path
from PIL import Image
exec(Path('scripts/download-product-images.py').read_text().split('def download(item):')[0])
url='https://www.dell.com/en-us/shop/laptops/14-7420/spd/latitude-14-7420-2-in-1-laptop/s029l742014us'
t=requests.get(url,timeout=30).text
Path('review/dell-gallery.html').write_text(t,encoding='utf8')
assets=sorted(set(re.findall(r'(?:https:)?//i.dell.com[^"<> ]+',t)))
print('\n'.join(u for u in assets if '7420' in u)[:9000])
u='https://images.samsung.com/is/image/samsung/p6pim/us/mz-v8p1t0b-am/gallery/us-980-pro-nvme-m2-ssd-mz-v8p1t0b-am-550536604?wid=1600&fmt=png-alpha'
r=requests.get(u,timeout=30);r.raise_for_status();Path('review/ssd-clean.png').write_bytes(r.content)
