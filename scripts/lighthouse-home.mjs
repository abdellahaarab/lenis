import fs from 'node:fs';
import {spawn} from 'node:child_process';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const browser=spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',['--headless=new','--remote-debugging-port=9339','--no-first-run',`--user-data-dir=${process.cwd()}/review/lighthouse-profile`,'about:blank'],{windowsHide:true,stdio:'ignore'});
try{
 for(let n=0;n<40;n++){try{await fetch('http://127.0.0.1:9339/json/version');break}catch{}await sleep(250)}
 const proc=spawn('cmd.exe',['/d','/s','/c','npx lighthouse http://127.0.0.1:4181/ar --port=9339 --only-categories=performance,accessibility,seo --output=json --output-path=review/homepage/lighthouse-final.json --quiet'],{windowsHide:true,stdio:'inherit'});
 const code=await new Promise(r=>proc.on('exit',r));if(code)throw Error('Lighthouse exit '+code);
 const report=JSON.parse(fs.readFileSync('review/homepage/lighthouse-final.json'));
 console.log(JSON.stringify({scores:Object.fromEntries(Object.entries(report.categories).map(([k,v])=>[k,v.score*100])),lcp:report.audits['largest-contentful-paint'].numericValue,cls:report.audits['cumulative-layout-shift'].numericValue,tbt:report.audits['total-blocking-time'].numericValue},null,2));
}finally{browser.kill()}
