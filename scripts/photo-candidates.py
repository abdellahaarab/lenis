import re,pathlib,html
for name,pattern in [('source-dell',r'https[^"<> ]*latitude[^"<> ]*psd[^"<> ]*'),('samsung-us',r'https[^"<> ]*55053660[0-9][^"<> ]*')]:
 t=pathlib.Path(f'review/{name}.html').read_text(encoding='utf8')
 print(name+'\n'+'\n'.join(html.unescape(u) for u in sorted(set(re.findall(pattern,t)))[:25]))
