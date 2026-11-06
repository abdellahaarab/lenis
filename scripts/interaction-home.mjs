import fs from 'node:fs';import {spawn} from 'node:child_process';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const proc=spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',['--headless=new','--remote-debugging-port=9341','--no-first-run',`--user-data-dir=${process.cwd()}/review/interaction-profile`,'about:blank'],{windowsHide:true,stdio:'ignore'});
let targets;for(let n=0;n<40;n++){try{targets=await(await fetch('http://127.0.0.1:9341/json')).json();if(targets.length)break}catch{}await sleep(250)}
const ws=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise(r=>ws.onopen=r);let n=0;const pending=new Map(),errors=[];let paused;
ws.onmessage=async e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p?.reject(m.error):p?.resolve(m.result)}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails);else if(m.method==='Fetch.requestPaused')await paused?.(m.params)};
const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++n;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}))});
const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description);return r.result?.value};
const report={};const base='http://127.0.0.1:4181';
const ready=async selector=>{for(let n=0;n<60;n++){if(await evaluate(`!!document.querySelector('${selector}')`))return;await sleep(200)}throw Error('Missing '+selector)};
try{
 await send('Page.enable');await send('Runtime.enable');await send('Page.bringToFront');await send('Emulation.setFocusEmulationEnabled',{enabled:true});await send('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});
 await send('Page.addScriptToEvaluateOnNewDocument',{source:`window.__vt=[];if(document.startViewTransition){const original=document.startViewTransition.bind(document);document.startViewTransition=callback=>{const names=()=>Array.from(document.querySelectorAll('img')).map(n=>getComputedStyle(n).viewTransitionName).filter(n=>n!=='none');const record={old:names()};window.__vt.push(record);const transition=original(async()=>{await callback();record.new=names()});transition.ready.then(()=>record.ready=true,e=>record.error=e.message);return transition}}`});
 await send('Page.navigate',{url:base+'/ar'});await ready('.catalog-media');await sleep(2500);
 await evaluate(`window.scrollTo({top:document.querySelector('#latest-products').getBoundingClientRect().top+scrollY-100,behavior:'instant'})`);await sleep(300);await evaluate(`document.querySelector('.catalog-media').click()`);await ready('.catalog-image[loading=eager]');await sleep(1200);
 report.transition=await evaluate(`({supported:!!document.startViewTransition,records:window.__vt,path:location.pathname,names:[...document.querySelectorAll('img')].map(n=>getComputedStyle(n).viewTransitionName).filter(n=>n!=='none'),imageLoaded:document.querySelector('.catalog-image[loading=eager]').naturalWidth>0})`);
 const shot=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync('review/homepage/product-detail.png',Buffer.from(shot.data,'base64'));
 await send('Page.navigate',{url:base+'/ar'});await ready('#contact');await sleep(600);
 await evaluate(`Object.defineProperty(navigator,'clipboard',{value:{writeText:async text=>{window.__brief=text}}});document.querySelector('#brief-details').value='';document.querySelector('.brief-buttons button').click()`);await sleep(200);report.brief=await evaluate(`({copied:window.__brief,button:document.querySelector('.brief-buttons button').textContent,noFakeWhatsapp:!document.querySelector('.brief-buttons a[href*=wa]')})`);
 await evaluate(`document.querySelector('.home-faq summary').click()`);report.faq=await evaluate(`({open:document.querySelector('.home-faq').open})`);
 // Mock only the manifest; real catalog and on-disk disabled manifest stay intact.
 paused=async ({requestId})=>send('Fetch.fulfillRequest',{requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:'application/json'}],body:Buffer.from(JSON.stringify({enabled:true,count:2,width:360,height:266,poster:'../../logo.webp',frames:['../../logo.webp','../../logo.webp']})).toString('base64')});
 await send('Fetch.enable',{patterns:[{urlPattern:'*sequences/desk/manifest.json*',requestStage:'Request'}]});await send('Page.navigate',{url:base+'/ar'});await ready('.frame-sequence canvas');await sleep(1000);report.manifest=await evaluate(`({switched:!!document.querySelector('.frame-sequence canvas'),proceduralAbsent:!document.querySelector('.desk-laptop'),canvasWidth:document.querySelector('.frame-sequence canvas').width,ready:getComputedStyle(document.querySelector('.frame-sequence canvas')).opacity})`);await send('Fetch.disable');
 report.errors=errors;
 fs.writeFileSync('review/homepage/interactions.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{ws.close();proc.kill()}
