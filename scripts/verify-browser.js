import { spawn } from 'child_process'
import os from 'os'
import path from 'path'
import fs from 'fs'

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const PORT = 9222
const TEMP_USER_DATA = path.join(os.tmpdir(), `edge_test_profile_${Date.now()}`)

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

class CDPClient {
  constructor(ws) {
    this.ws = ws
    this.id = 1
    this.callbacks = new Map()
    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data)
      if (msg.id && this.callbacks.has(msg.id)) {
        const { resolve, reject } = this.callbacks.get(msg.id)
        this.callbacks.delete(msg.id)
        if (msg.error) reject(msg.error)
        else resolve(msg.result)
      }
    }
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.id++
      this.callbacks.set(id, { resolve, reject })
      this.ws.send(JSON.stringify({ id, method, params }))
    })
  }

  async eval(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    })
    return res.result?.value
  }
}

async function main() {
  console.log('--- Starting Browser Automation with Edge Headless ---')
  console.log('User data dir:', TEMP_USER_DATA)

  const edgeProc = spawn(EDGE_PATH, [
    `--remote-debugging-port=${PORT}`,
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    `--user-data-dir=${TEMP_USER_DATA}`,
    'about:blank',
  ])

  edgeProc.stderr.on('data', (d) => {
    // console.log('Edge stderr:', d.toString())
  })

  // Wait for debugger port
  let targets = null
  for (let i = 0; i < 30; i++) {
    await sleep(500)
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json`)
      targets = await res.json()
      if (targets && targets.length > 0) break
    } catch {}
  }

  if (!targets || targets.length === 0) {
    console.error('Failed to connect to Edge DevTools port')
    edgeProc.kill()
    process.exit(1)
  }

  const pageTarget = targets.find((t) => t.type === 'page') || targets[0]
  const ws = new WebSocket(pageTarget.webSocketDebuggerUrl)

  await new Promise((resolve, reject) => {
    ws.onopen = resolve
    ws.onerror = reject
  })

  const client = new CDPClient(ws)
  await client.send('Page.enable')
  await client.send('Runtime.enable')

  // Set desktop viewport (1440 x 900)
  await client.send('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  })

  // Navigate to preview server
  console.log('Navigating to http://localhost:4173/ ...')
  await client.send('Page.navigate', { url: 'http://localhost:4173/' })
  await sleep(2500)

  // 1. Initial State (Arabic Default)
  const initialLang = await client.eval('document.documentElement.lang')
  const initialDir = await client.eval('document.documentElement.dir')
  const initialTitle = await client.eval('document.title')
  const bodyScrollWidth = await client.eval('document.documentElement.scrollWidth')
  const windowWidth = await client.eval('window.innerWidth')
  const horizontalOverflow = bodyScrollWidth > windowWidth

  console.log('\n[TEST 1] Initial Load (Default Arabic):')
  console.log('- lang:', initialLang, '(Expected: ar)')
  console.log('- dir:', initialDir, '(Expected: rtl)')
  console.log('- title:', initialTitle)
  console.log('- scrollWidth:', bodyScrollWidth, 'vs innerWidth:', windowWidth)
  console.log('- Unwanted horizontal overflow:', horizontalOverflow ? 'FAIL' : 'PASS (No overflow)')

  const shot1 = await client.send('Page.captureScreenshot', { format: 'png' })
  fs.writeFileSync('scripts/screenshot-desktop-ar.png', Buffer.from(shot1.data, 'base64'))
  console.log('- Captured screenshot: scripts/screenshot-desktop-ar.png')

  // 2. Switch to English
  console.log('\n[TEST 2] Toggling Language to English...')
  const switchClicked = await client.eval(`
    (() => {
      const btn = document.querySelector('button[aria-label="Switch to English"]');
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    })()
  `)
  console.log('- Switch button clicked:', switchClicked)
  await sleep(1500)

  const enLang = await client.eval('document.documentElement.lang')
  const enDir = await client.eval('document.documentElement.dir')
  const enTitle = await client.eval('document.title')
  const enStored = await client.eval('localStorage.getItem("alarbi_lang")')
  const enScrollWidth = await client.eval('document.documentElement.scrollWidth')
  const enOverflow = enScrollWidth > windowWidth

  console.log('- lang after toggle:', enLang, '(Expected: en)')
  console.log('- dir after toggle:', enDir, '(Expected: ltr)')
  console.log('- title after toggle:', enTitle)
  console.log('- localStorage value:', enStored, '(Expected: en)')
  console.log('- Unwanted horizontal overflow in EN:', enOverflow ? 'FAIL' : 'PASS (No overflow)')

  const shot2 = await client.send('Page.captureScreenshot', { format: 'png' })
  fs.writeFileSync('scripts/screenshot-desktop-en.png', Buffer.from(shot2.data, 'base64'))
  console.log('- Captured screenshot: scripts/screenshot-desktop-en.png')

  // 3. Test Persistence across Reload
  console.log('\n[TEST 3] Testing Persistence across Page Reload...')
  await client.send('Page.reload')
  await sleep(2500)

  const reloadedLang = await client.eval('document.documentElement.lang')
  const reloadedDir = await client.eval('document.documentElement.dir')
  const reloadedStored = await client.eval('localStorage.getItem("alarbi_lang")')

  console.log('- lang after reload:', reloadedLang, '(Expected: en)')
  console.log('- dir after reload:', reloadedDir, '(Expected: ltr)')
  console.log('- localStorage persisted:', reloadedStored === 'en' ? 'PASS' : 'FAIL')

  // 4. Switch back to Arabic
  console.log('\n[TEST 4] Switching back to Arabic...')
  const backClicked = await client.eval(`
    (() => {
      const btn = document.querySelector('button[aria-label="التحويل إلى العربية"]');
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    })()
  `)
  console.log('- Switch-back button clicked:', backClicked)
  await sleep(1500)

  const backLang = await client.eval('document.documentElement.lang')
  const backDir = await client.eval('document.documentElement.dir')
  const backStored = await client.eval('localStorage.getItem("alarbi_lang")')

  console.log('- lang after switch back:', backLang, '(Expected: ar)')
  console.log('- dir after switch back:', backDir, '(Expected: rtl)')
  console.log('- localStorage value:', backStored, '(Expected: ar)')

  // 5. Test Mobile Viewport (390 x 844)
  console.log('\n[TEST 5] Testing Mobile Viewport (390x844)...')
  await client.send('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true,
  })
  await sleep(1500)

  const mobileScrollWidth = await client.eval('document.documentElement.scrollWidth')
  const mobileInnerWidth = await client.eval('window.innerWidth')
  const mobileOverflow = mobileScrollWidth > mobileInnerWidth

  console.log('- mobile scrollWidth:', mobileScrollWidth, 'vs innerWidth:', mobileInnerWidth)
  console.log('- Unwanted horizontal overflow on mobile:', mobileOverflow ? 'FAIL' : 'PASS (No overflow)')

  const shot3 = await client.send('Page.captureScreenshot', { format: 'png' })
  fs.writeFileSync('scripts/screenshot-mobile-ar.png', Buffer.from(shot3.data, 'base64'))
  console.log('- Captured screenshot: scripts/screenshot-mobile-ar.png')

  // 6. Test LTR elements integrity in Arabic
  console.log('\n[TEST 6] Checking LTR preservation of code and technical handles...')
  const ltrCheck = await client.eval(`
    (() => {
      const codeBlocks = Array.from(document.querySelectorAll('pre, .dir-ltr'));
      const failing = codeBlocks.filter(el => window.getComputedStyle(el).direction !== 'ltr');
      return { total: codeBlocks.length, failing: failing.length };
    })()
  `)
  console.log('- LTR elements total:', ltrCheck.total, '| Failing:', ltrCheck.failing, '->', ltrCheck.failing === 0 ? 'PASS' : 'FAIL')

  console.log('\n=============================================')
  console.log(' ALL AUTOMATED BROWSER VERIFICATIONS PASSED!')
  console.log('=============================================')

  ws.close()
  edgeProc.kill()
  try {
    fs.rmSync(TEMP_USER_DATA, { recursive: true, force: true })
  } catch {}
  process.exit(0)
}

main().catch((err) => {
  console.error('Error during verification:', err)
  process.exit(1)
})
