import requests,re
from pathlib import Path
s=requests.get('https://www.samsung.com/us/memory-storage/nvme-ssd/980-pro-pcie-4-0-nvme-ssd-1tb-sku-mz-v8p1t0b-am/',timeout=25).text
Path('review/samsung-us.html').write_text(s,encoding='utf8')
print('\n'.join(dict.fromkeys(re.findall(r'(?:https?:)?//[^\s"<>]+(?:V8P|980)[^\s"<>]+',s,re.I)))[:4000])
