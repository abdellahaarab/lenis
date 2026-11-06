import fs from 'node:fs';
const luminance = h => {const rgb=h.match(/[a-f0-9]{2}/gi).map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722};
const pairs=[
 ['light','body','#201532','#f7f8fc'],['light','muted','#625b70','#f7f8fc'],['light','link','#322f83','#f7f8fc'],['light','muted on card','#625b70','#ffffff'],
 ['dark','body','#f6f1ff','#110c1b'],['dark','muted','#b8b0c6','#110c1b'],['dark','link','#b5b1ee','#110c1b'],['dark','muted on card','#b8b0c6','#1c1429'],['dark','link on card','#b5b1ee','#1c1429'],
 ['both','brand button text','#ffffff','#322f83'],['both','order button text','#201532','#f2a93b'],['both','demo label','#322f83','#f0eef8'],['both','screen text','#ddd9ff','#322f83']
];
const result=pairs.map(([theme,role,foreground,background])=>{const a=luminance(foreground),b=luminance(background),ratio=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);return {theme,role,foreground,background,ratio:+ratio.toFixed(2),AA:ratio>=4.5}});
fs.writeFileSync('review/homepage/contrast.json',JSON.stringify(result,null,2));console.table(result);
if(result.some(x=>!x.AA))process.exitCode=1;
