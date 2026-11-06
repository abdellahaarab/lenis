import { execSync } from 'child_process'

const cmd = `"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe" --headless=new --user-data-dir="%TEMP%\\edge-inspect" --dump-dom http://localhost:4173/`
const html = execSync(cmd, { encoding: 'utf-8' })

// Find hero section
const heroIdx = html.indexOf('<section');
console.log('Section snippet:');
console.log(html.substring(heroIdx, heroIdx + 1200));
