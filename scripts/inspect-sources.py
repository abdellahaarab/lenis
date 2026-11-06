import re,json,requests
from pathlib import Path
d=json.loads(Path('review/image-candidates.json').read_text())
for k in ['ssd','deco','hp']:
 print(k)
 print('\n'.join(u for u in d[k]['images'] if ('v8p1' in u.lower() or 'x50' in u.lower() or 'g7' in u.lower())))
for k in ['g14','dell']:
 s=Path(f'review/source-{k}.html').read_text(encoding='utf8')
 print(k, '\n'.join(dict.fromkeys(re.findall(r'(?:https?:)?//[^\s"<>]+(?:gain|DellContent)[^\s"<>]+',s)))[:3500])
for model,file in [('ThinkPad_T490s','ThinkPad_T490s_CT1_01.png'),('ThinkPad_P1_Gen_4','ThinkPad_P1_Gen_4_CT1_01.png')]:
 u=f'https://psrefstuff.lenovo.com/syspool/Sys/Image/ThinkPad/{model}/{file}'
 r=requests.get(u,timeout=20);print(model,r.status_code,r.headers.get('content-type'),u)
hp='https://support.hp.com/us-en/product/details/hp-elitebook-840-g7-notebook-pc/33386519'
r=requests.get(hp,timeout=20);Path('review/hp-support.html').write_text(r.text,encoding='utf8')
print('hp support',r.status_code,'\n'.join(re.findall(r'[^\s"<>]*prodimg[^\s"<>]*',r.text)[:10]))
