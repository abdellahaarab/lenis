from fontTools import subset
from pathlib import Path
from fontTools.ttLib import TTFont
for name in ['Light','Regular','SemiBold','Bold']:
 font=TTFont(f'public/LinaRound-{name}.otf');font.flavor='woff2';font.save(f'public/LinaRound-{name}.woff2')
 print(name,Path(f'public/LinaRound-{name}.woff2').stat().st_size)
for name in ['Regular','Bold','ExtraBold']:
 path=Path(f'public/MPLUSRounded1c-{name}.ttf')
 options=subset.Options();options.flavor='woff2'
 font=subset.load_font(str(path),options)
 engine=subset.Subsetter(options=options)
 engine.populate(unicodes=list(range(0x20,0x250))+list(range(0x2000,0x2070))+[0x20ac,0x221e,0x2713])
 engine.subset(font)
 target=Path(f'public/MPLUSRounded1c-{name}-latin.woff2')
 subset.save_font(font,str(target),options)
 print(path.name,path.stat().st_size,'->',target.stat().st_size)
