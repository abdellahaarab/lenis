import { execSync } from 'child_process'

const script = `
  const title = document.querySelector('h1');
  console.log('H1:', title ? title.outerHTML : 'null');
  if (title) {
    const style = window.getComputedStyle(title);
    console.log('H1 opacity:', style.opacity, 'color:', style.color, 'display:', style.display, 'visibility:', style.visibility);
    const parent = title.parentElement;
    console.log('Parent opacity:', window.getComputedStyle(parent).opacity);
    const grandParent = parent.parentElement;
    console.log('GrandParent opacity:', window.getComputedStyle(grandParent).opacity, 'transform:', window.getComputedStyle(grandParent).transform);
  }
`

const cmd = `"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe" --headless=new --user-data-dir="%TEMP%\\edge-inspect" --dump-dom http://localhost:4173/`
const html = execSync(cmd, { encoding: 'utf-8' })
console.log('Total HTML length:', html.length)
console.log('Contains main:', html.includes('<main>'))
console.log('Contains section:', html.includes('<section'))
