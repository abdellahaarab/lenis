import fs from 'node:fs';
import {spawn} from 'node:child_process';
const sleep = ms => new Promise(r=>setTimeout(r,ms));
const proc=spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',['--headless=new','--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows','--remote-debugging-port=9337','--no-first-run','--no-default-browser-check',`--user-data-dir=${process.cwd()}/review/audit-profile-${Date.now()}`,'about:blank'],{windowsHide:true,stdio:'ignore'});
let targets;
for(let i=0;i<40;i++){try{targets=await(await fetch('http://127.0.0.1:9337/json')).json();if(targets.length)break;}catch{}await sleep(250)}
if(!targets?.length)throw Error('No browser');
const ws=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise(r=>ws.onopen=r);
let next=1;const pending=new Map();const events=[];
ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);if(p){pending.delete(m.id);m.error?p.reject(m.error):p.resolve(m.result)}}else events.push(m)};
const send=(method,params={})=>new Promise((resolve,reject)=>{const id=next++;const timer=setTimeout(()=>{pending.delete(id);reject(Error('Timeout: '+method))},25000);pending.set(id,{resolve:r=>{clearTimeout(timer);resolve(r)},reject:e=>{clearTimeout(timer);reject(e)}});ws.send(JSON.stringify({id,method,params}))});
const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result?.value};
await send('Page.enable');await send('Runtime.enable');await send('Network.enable');
await send('Page.bringToFront');await send('Emulation.setFocusEmulationEnabled',{enabled:true});
const init=`window.__metrics={lcp:0,cls:0,longTasks:[]};new PerformanceObserver(l=>{for(const e of l.getEntries())window.__metrics.lcp=e.startTime}).observe({type:'largest-contentful-paint',buffered:true});new PerformanceObserver(l=>{for(const e of l.getEntries())if(!e.hadRecentInput)window.__metrics.cls+=e.value}).observe({type:'layout-shift',buffered:true});new PerformanceObserver(l=>{window.__metrics.longTasks.push(...l.getEntries().map(e=>e.duration))}).observe({type:'longtask',buffered:true});`;
await send('Page.addScriptToEvaluateOnNewDocument',{source:init});
fs.mkdirSync('review/homepage',{recursive:true});const report={screens:[],story:[],checks:[]};
const screenshot=async name=>{const s=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(`review/homepage/${name}.png`,Buffer.from(s.data,'base64'))};
const base=process.env.AUDIT_URL??'http://127.0.0.1:4181';
const mounted=async()=>{for(let n=0;n<50;n++){if(await evaluate('!!document.querySelector(".desk-stage")'))return;await sleep(400)}throw Error('Home did not mount')};
try{
 for(const width of [360,768,1280])for(const theme of ['light','dark']){
  console.log('Capture',width,theme);
  await send('Emulation.setDeviceMetricsOverride',{width,height:width===360?800:900,deviceScaleFactor:1,mobile:width===360});
  await send('Page.navigate',{url:base+'/ar'});await mounted();await evaluate(`localStorage.setItem('alarbi_theme','${theme}')`);await send('Page.reload');await mounted();await sleep(2600);await evaluate('Promise.race([document.fonts.ready.then(()=>true),new Promise(r=>setTimeout(()=>r(false),3000))])');
  await screenshot(`${width}-${theme}-hero`);
  const result=await evaluate(`({width:innerWidth,clientWidth:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth,title:document.querySelector('h1')?.textContent,stage:document.querySelector('.stage-sticky')?.getBoundingClientRect().toJSON(),metrics:window.__metrics,images:[...document.images].filter(i=>i.complete&&!i.naturalWidth).map(i=>i.src)})`);
  report.screens.push({width,theme,...result});
  await evaluate(`window.scrollTo({top:document.querySelector('#latest-products').getBoundingClientRect().top+scrollY-100,behavior:'instant'})`);await sleep(1100);await screenshot(`${width}-${theme}-products`);
  const full=await evaluate('document.documentElement.scrollHeight');const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip:{x:0,y:0,width,height:full,scale:1}});fs.writeFileSync(`review/homepage/${width}-${theme}-full.png`,Buffer.from(shot.data,'base64'));
 }
 await send('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});await send('Page.navigate',{url:base+'/ar'});await sleep(2800);
 for(const p of [0,.27,.46,.62,.74,.79,.85,.94,1,.62,.27,0]){
  await evaluate(`window.scrollTo({top:(document.querySelector('.desk-story').offsetHeight-innerHeight+86)*${p},behavior:'instant'})`);await sleep(800);
  report.story.push(await evaluate(`({p:${p},actual:document.querySelector('.desk-stage').dataset.progress,lid:document.querySelector('.laptop-lid').style.transform,monitor:getComputedStyle(document.querySelector('.desk-monitor')).opacity,screen:getComputedStyle(document.querySelector('.laptop-screen')).opacity,wire:getComputedStyle(document.querySelector('.connection-active')).opacity,ups:getComputedStyle(document.querySelector('.ups-signal')).opacity})`));
  if([.27,.62,.79,.85].includes(p))await screenshot(`story-${p}`);
 }
 await evaluate(`window.scrollTo({top:document.querySelector('#setups').getBoundingClientRect().top+scrollY-86+1300,behavior:'instant'})`);await sleep(1000);await screenshot('setups-rtl');
 await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});await send('Page.navigate',{url:base+'/ar'});await sleep(1800);
 report.checks.push({name:'reduced',...await evaluate(`({lite:!!document.querySelector('.story-lite'),height:document.querySelector('.desk-story').offsetHeight,chapters:document.querySelectorAll('.story-chapter').length,overflow:document.documentElement.scrollWidth>innerWidth})`)});await screenshot('reduced-motion');
 await send('Emulation.setEmulatedMedia',{features:[]});await send('Emulation.setDeviceMetricsOverride',{width:360,height:800,deviceScaleFactor:1,mobile:true});await send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:200000,uploadThroughput:93750,connectionType:'cellular4g'});await send('Emulation.setCPUThrottlingRate',{rate:4});await send('Network.setCacheDisabled',{cacheDisabled:true});await send('Page.navigate',{url:base+'/ar'});await sleep(7000);report.mobileMetrics=await evaluate('window.__metrics');
 await mounted();await evaluate('Promise.race([document.fonts.ready.then(()=>true),new Promise(r=>setTimeout(()=>r(false),8000))])');await sleep(2600);report.mobileMetrics=await evaluate('({...window.__metrics,loaded:!!document.querySelector("h1"),resources:performance.getEntriesByType("resource").map(r=>({name:r.name.split("/").pop(),bytes:r.encodedBodySize,duration:r.duration}))})');
 console.log('Mobile',JSON.stringify(report.mobileMetrics));fs.writeFileSync('review/homepage/metrics.json',JSON.stringify(report,null,2));
 await screenshot('mobile-4g');
 report.smoothness=await evaluate(`new Promise(resolve=>{const times=[];const start=performance.now();let last,done=false,frame;function finish(){if(done)return;done=true;cancelAnimationFrame(frame);times.sort((a,b)=>a-b);const elapsed=performance.now()-start;resolve({frames:times.length,elapsed,fps:times.length/(elapsed/1000),p95:times[Math.floor(times.length*.95)],over34ms:times.filter(n=>n>34).length})}function tick(){if(done)return;const t=performance.now();if(last)times.push(t-last);last=t;window.scrollTo({top:Math.min(2800,(t-start)*.65),behavior:'instant'});if(t-start<5000)frame=requestAnimationFrame(tick);else finish()}frame=requestAnimationFrame(tick);setTimeout(finish,5500)})`);
 console.log('Frames',JSON.stringify(report.smoothness));
 await send('Emulation.setCPUThrottlingRate',{rate:1});await send('Network.emulateNetworkConditions',{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1});await send('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});await send('Page.navigate',{url:base+'/en'});await mounted();await sleep(2600);report.checks.push({name:'English',...await evaluate(`({lang:document.documentElement.lang,dir:document.documentElement.dir,overflow:document.documentElement.scrollWidth>innerWidth,title:document.querySelector('h1')?.textContent})`)});await screenshot('english');
 await send('Emulation.setDeviceMetricsOverride',{width:360,height:800,deviceScaleFactor:1,mobile:true});await send('Page.navigate',{url:base+'/ar'});await mounted();await sleep(2600);
 for(const p of [.27,.62,.85]){await evaluate(`window.scrollTo({top:(document.querySelector('.desk-story').offsetHeight-innerHeight+68)*${p},behavior:'instant'})`);await sleep(900);await screenshot('mobile-story-'+p)}
 // Save-data uses the same static story without a pinned rail.
 await send('Page.addScriptToEvaluateOnNewDocument',{source:'Object.defineProperty(navigator,"connection",{value:{saveData:true,addEventListener(){},removeEventListener(){}}})'});await send('Page.navigate',{url:base+'/ar'});await mounted();await sleep(900);report.checks.push({name:'saveData',...await evaluate('({lite:!!document.querySelector(".story-lite"),chapters:document.querySelectorAll(".story-chapter").length,overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth})')});await screenshot('save-data');
 await send('Emulation.setScriptExecutionDisabled',{value:true});await send('Page.navigate',{url:base+'/ar'});await sleep(1300);const doc=await send('DOM.getDocument');const html=await send('DOM.getOuterHTML',{nodeId:doc.root.nodeId});report.checks.push({name:'no-JS',fallback:html.outerHTML.includes('static-products'),products:(html.outerHTML.match(/<article>/g)||[]).length/2});await screenshot('no-javascript');
 report.errors=events.filter(e=>e.method==='Runtime.exceptionThrown').map(e=>e.params.exceptionDetails);
 fs.writeFileSync('review/homepage/metrics.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{fs.writeFileSync('review/homepage/metrics.json',JSON.stringify(report,null,2));ws.close();proc.kill()}
