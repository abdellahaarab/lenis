import { chromium } from 'playwright';

async function testCategoriesCarousel() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', err => consoleErrors.push(err.message));

  console.log('Navigating to http://127.0.0.1:53000/ar...');
  await page.goto('http://127.0.0.1:53000/ar', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1500);

  const cat = await page.$('#categories');
  if (cat) {
    await cat.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000);
    
    // Screenshot initial state
    await cat.screenshot({ path: 'categories_carousel_light.png' });
    console.log('Saved categories_carousel_light.png');

    // Dark mode screenshot
    await page.evaluate(() => document.documentElement.classList.add('dark'));
    await page.waitForTimeout(500);
    await cat.screenshot({ path: 'categories_carousel_dark.png' });
    console.log('Saved categories_carousel_dark.png');
    await page.evaluate(() => document.documentElement.classList.remove('dark'));

    // Test clicking a category pill (e.g. "صوتيات")
    const audioBtn = await page.$('button[role="tab"]:has-text("صوتيات")');
    if (audioBtn) {
      console.log('Clicking "صوتيات" pill...');
      await audioBtn.click();
      await page.waitForTimeout(1500);
      await cat.screenshot({ path: 'categories_carousel_audio.png' });
      console.log('Saved categories_carousel_audio.png after clicking صوتيات');
    }

    // Mobile screenshot
    await page.setViewportSize({ width: 390, height: 844 });
    await cat.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await cat.screenshot({ path: 'categories_carousel_mobile.png' });
    console.log('Saved categories_carousel_mobile.png');

    // Inspect rendered elements
    const summary = await page.evaluate(() => {
      const el = document.querySelector('#categories');
      if (!el) return null;
      const pills = Array.from(el.querySelectorAll('.category-nav-pill')).map(p => ({
        text: p.innerText.trim(),
        isActive: p.classList.contains('is-active')
      }));
      const cards = Array.from(el.querySelectorAll('.carousel-card-item')).map(c => ({
        title: c.querySelector('h3')?.innerText,
        price: c.querySelector('.text-base')?.innerText,
        stars: c.querySelectorAll('svg.fill-amber-400').length,
        hasImage: !!c.querySelector('img')?.getAttribute('src')
      }));
      return {
        pillsCount: pills.length,
        activePill: pills.find(p => p.isActive)?.text,
        cardsCount: cards.length,
        sampleCard: cards[0]
      };
    });
    console.log('Summary:', JSON.stringify(summary, null, 2));
  } else {
    console.error('#categories not found');
  }

  if (consoleErrors.length > 0) {
    console.error('Console errors:', consoleErrors);
  } else {
    console.log('Zero console errors!');
  }

  await browser.close();
}

testCategoriesCarousel().catch(console.error);
