import requests,json,io,concurrent.futures
from pathlib import Path
from PIL import Image,ImageChops,ImageOps
sources={
'lap-thinkpad-t490s-001':('https://psrefstuff.lenovo.com/syspool/Sys/Image/ThinkPad/ThinkPad_T490s/ThinkPad_T490s_CT1_01.png','https://psref.lenovo.com/Product/ThinkPad/ThinkPad_T490s'),
'lap-thinkpad-p1-gen4-010':('https://psrefstuff.lenovo.com/syspool/Sys/Image/ThinkPad/ThinkPad_P1_Gen_4/ThinkPad_P1_Gen_4_CT1_01.png','https://psref.lenovo.com/Product/ThinkPad/ThinkPad_P1_Gen_4'),
'gam-asus-rog-zephyrus-g14-006':('https://dlcdnwebimgs.asus.com/gain/87C641FC-4E5F-4073-B739-1C41E2783B96/w1000/h732','https://rog.asus.com/ca-en/laptops/rog-zephyrus/2021-rog-zephyrus-g14-series/gallery/'),
'aud-logitech-g432-005':('https://resource.logitechg.com/content/dam/gaming/en/products/g432/2025/g432-3qtr-front-left-angle-gallery-1.png','https://www.logitechg.com/en-us/shop/p/g432-7-1-surround-sound-gaming-headset'),
'net-tplink-deco-x50-007':('https://static.tp-link.com/upload/image-header/Deco_X50(2-pack)_Overview_normal_20211225093625r.png','https://www.tp-link.com/us/deco-mesh-wifi/product-family/deco-x50/'),
'lap-latitude-7420-003':('https://i.dell.com/is/image/DellContent/content/dam/ss2/product-images/dell-client-products/notebooks/latitude-notebooks/latitude-14-7420/global-spi/ng/touch/notebook-latitude-14-7420-t-relsize-500-ng.psd?fmt=png-alpha&wid=1200','https://www.dell.com/support/product-details/en-us/product/latitude-14-7420-2-in-1-laptop/overview'),
'disp-dell-u2722de-004':('https://i.dell.com/is/image/DellContent/content/dam/ss2/product-images/peripherals/output-devices/dell/monitors/u-series/u2722de/global-spi/ng/monitor-u2722de-relsize-500-ng.psd?fmt=png-alpha&wid=1200','https://www.dell.com/support/product-details/en-us/product/dell-u2722de-monitor'),
'sto-samsung-980-pro-008':('https://images.samsung.com/is/image/samsung/p6pim/us/mz-v8p1t0b-am/gallery/us-980-pro-nvme-m2-ssd-mz-v8p1t0b-am-550536602?wid=1600&fmt=png-alpha','https://www.samsung.com/us/memory-storage/nvme-ssd/980-pro-pcie-4-0-nvme-ssd-1tb-sku-mz-v8p1t0b-am/'),
}
Path('review/originals').mkdir(exist_ok=True)
def normalize(im,id):
 im=im.convert('RGBA');white=Image.new('RGBA',im.size,'white');white.alpha_composite(im);im=white.convert('RGB')
 difference=ImageChops.difference(im,Image.new('RGB',im.size,'white')).convert('L').point(lambda v:255 if v>18 else 0)
 box=difference.getbbox()
 if box:im=im.crop(box)
 files=[]
 for width in [480,960,1600]:
  canvas=Image.new('RGB',(width,round(width*2/3)),'white')
  art=ImageOps.contain(im,(round(width*.87),round(width*2/3*.84)),Image.Resampling.LANCZOS)
  canvas.paste(art,((canvas.width-art.width)//2,(canvas.height-art.height)//2))
  for fmt in ['webp','avif']:
   path=f'public/images/products/{id}-{width}.{fmt}'
   try:canvas.save(path,quality=78 if fmt=='webp' else 58);files.append('/'+path.removeprefix('public/'))
   except Exception:pass
 return files
def download(item):
 id,(url,page)=item
 try:
  r=requests.get(url,timeout=40);r.raise_for_status();im=Image.open(io.BytesIO(r.content))
  Path(f'review/originals/{id}.png').write_bytes(r.content)
  files=normalize(im,id)
  return {'productId':id,'files':files,'source':url,'sourcePage':page,'potentialLicense':'Manufacturer copyright; no redistribution permission established. Obtain written permission before commercial publication.','licensed':False,'demoOnly':True,'retrievedAt':'2026-10-02'}
 except Exception as e:return {'productId':id,'error':str(e)}
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as ex:result=list(ex.map(download,sources.items()))
Path('review/download-results.json').write_text(json.dumps(result,indent=2),encoding='utf8')
print(json.dumps([{'id':r['productId'],'files':len(r.get('files',[])),'error':r.get('error')} for r in result],indent=2))
# HP photo is extracted from its own official product data sheet.
try:
 import fitz
 url='https://www8.hp.com/h20195/v2/GetPDF.aspx/4AA7-6811ENUC.pdf'
 r=requests.get(url,timeout=40);r.raise_for_status();doc=fitz.open(stream=r.content,filetype='pdf')
 images=doc[0].get_images(full=True)
 entries=[(x,doc.extract_image(x[0])) for x in images]
 entries=[(x,d) for x,d in entries if d['width']>300 and d['height']>150]
 x,d=max(entries,key=lambda pair:pair[1]['width']*pair[1]['height'])
 im=Image.open(io.BytesIO(d['image']));files=normalize(im,'lap-elitebook-840-g7-002')
 im.save('review/originals/lap-elitebook-840-g7-002.png')
 result.append({'productId':'lap-elitebook-840-g7-002','files':files,'source':url,'sourcePage':url,'potentialLicense':'HP product data sheet copyright; extracted product image. Redistribution permission not established.','licensed':False,'demoOnly':True,'retrievedAt':'2026-10-02'})
 print('HP downloaded',im.size)
except Exception as e:print('HP failed',str(e))
result=[r for r in result if 'files' in r]
result.append({'productId':'pow-apc-back-ups-650va-009','files':['/images/products/ups-illustration.svg'],'source':'Local procedural SVG','sourcePage':None,'potentialLicense':'Project-authored illustration','licensed':True,'demoOnly':True,'retrievedAt':'2026-10-02'})
Path('public/images/sources.json').write_text(json.dumps({'images':result},ensure_ascii=False,indent=2)+'\n',encoding='utf8')
