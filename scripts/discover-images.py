import requests,re,json,concurrent.futures
from pathlib import Path
pages={
't490s':'https://psref.lenovo.com/Product/ThinkPad/ThinkPad_T490s',
'p1':'https://psref.lenovo.com/Product/ThinkPad/ThinkPad_P1_Gen_4',
'g14':'https://rog.asus.com/ca-en/laptops/rog-zephyrus/2021-rog-zephyrus-g14-series/gallery/',
'g432':'https://www.logitechg.com/en-us/shop/p/g432-7-1-surround-sound-gaming-headset',
'deco':'https://www.tp-link.com/us/deco-mesh-wifi/product-family/deco-x50/',
'ssd':'https://www.samsung.com/au/memory-storage/nvme-ssd/980-pro-pcle-4-0-nvme-m-2-ssd-1tb-mz-v8p1t0bw/',
'dell':'https://www.dell.com/support/product-details/en-us/product/latitude-14-7420-2-in-1-laptop/overview',
'monitor':'https://www.dell.com/en-us/shop/dell-ultrasharp-27-usb-c-hub-monitor-u2722de/apd/210-ayzg/monitors-monitor-accessories',
'hp':'https://syndication.inc.hp.com/inpage/content/showcase/fr/fr/elite-family/elitebook-800-series.html'}
def get(item):
 k,u=item
 try:
  r=requests.get(u,timeout=30); s=r.text
  Path('review').mkdir(exist_ok=True)
  Path(f'review/source-{k}.html').write_text(s,encoding='utf8')
  urls=list(dict.fromkeys(re.findall(r'(?:https?:)?//[^\s"<>]+?\.(?:png|jpg|webp)(?:\?[^\s"<>]*)?',s,re.I)))
  rel=re.findall(r'(?:src|href|content)=["\']([^"\']+\.(?:jpg|png|webp))',s,re.I)
  return k,{'page':u,'status':r.status_code,'images':urls+rel}
 except Exception as e:return k,{'error':str(e)}
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as ex:
 out=dict(ex.map(get,pages.items()))
Path('review/image-candidates.json').write_text(json.dumps(out,indent=2),encoding='utf8')
for k,v in out.items():print(k,v.get('status'), '\n'.join(v.get('images',[])[:8]))
