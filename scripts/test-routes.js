import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

const routesToTest = [
  { url: 'http://localhost:4173/ar', expectedText: 'الجيل العربي الرقمي', name: 'Home Arabic' },
  { url: 'http://localhost:4173/ar/shop', expectedText: 'المتجر والكتالوج', name: 'Shop Arabic' },
  { url: 'http://localhost:4173/ar/shop/laptops', expectedText: 'لابتوبات وأجهزة', name: 'Shop Laptops' },
  { url: 'http://localhost:4173/ar/shop/laptops/lenovo-thinkpad-t490s-i5-8gb-256', expectedText: 'لينوفو ثينك باد T490s', name: 'Product Detail' },
  { url: 'http://localhost:4173/en/shop', expectedText: 'Store &amp; Catalog', name: 'Shop English' },
  { url: 'http://localhost:4173/ar/shop?brand=Lenovo', expectedText: 'Lenovo', name: 'Shop Filter Brand' },
  { url: 'http://localhost:4173/ar/warranty', expectedText: 'درجات حالة الجهاز', name: 'Warranty Page' },
  { url: 'http://localhost:4173/ar/warranty/inspection', expectedText: 'قائمة الفحص', name: 'Warranty Inspection' },
  { url: 'http://localhost:4173/ar/warranty/policy', expectedText: 'سياسة وشروط الضمان', name: 'Warranty Policy' },
  { url: 'http://localhost:4173/ar/faq', expectedText: 'الأسئلة الشائعة', name: 'FAQ Page' },
  { url: 'http://localhost:4173/ar/about', expectedText: 'من نحن', name: 'About Page' },
  { url: 'http://localhost:4173/ar/contact', expectedText: 'التواصل والموقع', name: 'Contact Page' },
  { url: 'http://localhost:4173/en/faq', expectedText: 'Frequently Asked Questions', name: 'FAQ English' },
  { url: 'http://localhost:4173/en/about', expectedText: 'About Us', name: 'About English' }
];

console.log('🧪 [ROUTE VERIFICATION] Testing SPA routes rendered in headless browser...\n');

let allPassed = true;

for (const route of routesToTest) {
  try {
    const cmd = `"${EDGE_PATH}" --headless=new --disable-gpu --user-data-dir="%TEMP%\\edge-route-${Date.now()}" --virtual-time-budget=4000 --dump-dom "${route.url}"`;
    const html = execSync(cmd, { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] });
    
    if (html.includes(route.expectedText)) {
      console.log(`✅ [PASS] ${route.name} (${route.url}) rendered: found "${route.expectedText}"`);
    } else {
      console.error(`❌ [FAIL] ${route.name} (${route.url}) missing: "${route.expectedText}"`);
      // Check if root div has content
      const hasRootContent = html.includes('id="root"') && !html.includes('<div id="root"></div>');
      console.log('   Root has content:', hasRootContent);
      allPassed = false;
    }
  } catch (err) {
    console.error(`❌ [ERROR] ${route.name}:`, err.message);
    allPassed = false;
  }
}

if (allPassed) {
  console.log('\n🎉 ALL ROUTES VERIFIED SUCCESSFULLY IN HEADLESS BROWSER!\n');
} else {
  console.error('\n❌ SOME ROUTE CHECKS FAILED.\n');
  process.exit(1);
}
