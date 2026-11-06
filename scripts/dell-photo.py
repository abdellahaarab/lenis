import requests,io,concurrent.futures
from PIL import Image
from pathlib import Path
base='https://i.dell.com/is/image/DellContent//content/dam/ss2/product-images/dell-client-products/notebooks/latitude-notebooks/latitude-14-7420/global-spi/ng/'
paths=['notebook-latitude-14-7420-relsize-500-ng.psd','non-touch/notebook-latitude-14-7420-nt-relsize-500-ng.psd','non-touch/notebook-latitude-14-7420-relsize-500-ng.psd','nontouch/notebook-latitude-14-7420-nt-relsize-500-ng.psd','nt/notebook-latitude-14-7420-nt-relsize-500-ng.psd']
def get(p):
 try:
  u=base+p+'?fmt=png-alpha&wid=1000';r=requests.get(u,timeout=15);r.raise_for_status();im=Image.open(io.BytesIO(r.content));Path('review/dell-'+p.split('/')[0]+'.png').write_bytes(r.content);return (u,im.size)
 except Exception:return None
print(list(concurrent.futures.ThreadPoolExecutor(max_workers=5).map(get,paths)))
