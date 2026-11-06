from PIL import Image,ImageDraw
from pathlib import Path
files=list(Path('public/images/products').glob('*480.webp'))
canvas=Image.new('RGB',(1000,340*((len(files)+2)//3)),'#eeeef5');draw=ImageDraw.Draw(canvas)
for i,f in enumerate(files):
 im=Image.open(f);im.thumbnail((310,250));x=(i%3)*333;y=(i//3)*340;canvas.paste(im,(x+(310-im.width)//2,y));draw.text((x+5,y+265),f.stem,fill='black')
canvas.save('review/product-contact-sheet.jpg')
