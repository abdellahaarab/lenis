import fs from 'node:fs';
import { spawn } from 'node:child_process';

const sleep = ms => new Promise(r => setTimeout(r, ms));
const port = 9339;
const proc = spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', [
  '--headless=new',
  '--disable-gpu',
  `--remote-debugging-port=${port}`,
  '--no-first-run',
  '--no-default-browser-check',
  `--user-data-dir=${process.cwd()}/review/shot-profile-${Date.now()}`,
  'about:blank'
], { windowsHide: true, stdio: 'ignore' });

try {
  let targets;
  for (let i = 0; i < 40; i++) {
    try {
      targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
      if (targets.length) break;
    } catch {}
    await sleep(250);
  }
  if (!targets?.length) throw new Error('Could not connect to browser');

  const ws = new WebSocket(targets.find(t => t.type === 'page').webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);

  let next = 1;
  const pending = new Map();
  ws.onmessage = e => {
    const m = JSON.parse(e.data);
    if (m.id) {
      const p = pending.get(m.id);
      if (p) {
        pending.delete(m.id);
        m.error ? p.reject(m.error) : p.resolve(m.result);
      }
    }
  };

  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = next++;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error('Timeout: ' + method)); }, 25000);
    pending.set(id, {
      resolve: r => { clearTimeout(timer); resolve(r); },
      reject: e => { clearTimeout(timer); reject(e); }
    });
    ws.send(JSON.stringify({ id, method, params }));
  });

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: 'http://localhost:5173/ar' });
  await sleep(3500);

  // Setups
  await send('Runtime.evaluate', { expression: 'document.querySelector("#setups").scrollIntoView({behavior:"instant"})' });
  await sleep(800);
  let shot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('review/redesign/section-setups.png', Buffer.from(shot.data, 'base64'));

  // Catalog
  await send('Runtime.evaluate', { expression: 'document.querySelector("#latest-products").scrollIntoView({behavior:"instant"})' });
  await sleep(800);
  shot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('review/redesign/section-catalog.png', Buffer.from(shot.data, 'base64'));

  // Inspection
  await send('Runtime.evaluate', { expression: 'document.querySelector("#inspection").scrollIntoView({behavior:"instant"})' });
  await sleep(800);
  shot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('review/redesign/section-inspection.png', Buffer.from(shot.data, 'base64'));

  // Workflow & Brief
  await send('Runtime.evaluate', { expression: 'document.querySelector("#business").scrollIntoView({behavior:"instant"})' });
  await sleep(800);
  shot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('review/redesign/section-workflow.png', Buffer.from(shot.data, 'base64'));

  // Brief & Contact
  await send('Runtime.evaluate', { expression: 'document.querySelector("#contact").scrollIntoView({behavior:"instant"})' });
  await sleep(800);
  shot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('review/redesign/section-brief.png', Buffer.from(shot.data, 'base64'));

  console.log('ALL_SECTIONS_CAPTURED');
  ws.close();
} catch (err) {
  console.error(err);
} finally {
  proc.kill();
}
