import { execSync } from 'child_process'

const html = execSync(
  `"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe" --headless=new --user-data-dir="%TEMP%\\edge-err" --dump-dom http://localhost:4173/`,
  { encoding: 'utf-8' }
)

console.log('HTML contains h1 text:');
const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
console.log(h1Match ? h1Match[1] : 'No H1 found');

const pMatch = html.match(/<p[^>]*class="[^"]*text-balance[^"]*"[^>]*>([\s\S]*?)<\/p>/);
console.log('P subtitle:');
console.log(pMatch ? pMatch[1] : 'No P found');
