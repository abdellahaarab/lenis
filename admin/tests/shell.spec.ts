import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
const fixture = { id: randomUUID(), email: 'isolated-ui@example.test', name: 'حساب اختبار معزول', role: 'owner', isActive: true, mustChangePassword: false, totpEnabled: false, lastLoginAt: null, createdAt: '2026-10-02T00:00:00.000Z' };
for (const width of [360,1280]) for(const lang of ['ar','en']) test(`shell ${lang} at ${width}px`, async ({page}) => {
  await page.setViewportSize({width,height:900});
  await page.addInitScript(language=>localStorage.setItem('admin-language',language),lang);
  await page.route('**/api/admin/**', route => {
    const path=new URL(route.request().url()).pathname;
    const body=path.endsWith('/auth/session')?{user:fixture,csrfToken:'isolated-ui-csrf'}:path.endsWith('/dashboard')?{phase:'A',hasBusinessData:false}:path.endsWith('/users')?{items:[fixture],total:1,page:1,pageSize:20}:path.endsWith('/audit')?{items:[],total:0}:path.endsWith('/auth/sessions')?{items:[]}:{};
    return route.fulfill({json:body});
  });
  await page.goto('/admin/');
  await expect(page.locator('html')).toHaveAttribute('dir',lang==='ar'?'rtl':'ltr');
  await expect(page.getByRole('heading',{name:(lang==='ar'?'أهلاً بك، ':'Welcome back, ')+fixture.name,exact:true})).toBeVisible();
  const layout=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,overflowing:[...document.querySelectorAll('body *')].filter(element=>{const rect=element.getBoundingClientRect();return rect.width>0&&(rect.left< -1||rect.right>innerWidth+1);}).map(element=>({className:element.className,tag:element.tagName,width:element.getBoundingClientRect().width})).slice(0,12)}));
  expect(layout.scrollWidth,JSON.stringify(layout)).toBeLessThanOrEqual(layout.width);
  await page.screenshot({path:`test-results/admin-${lang}-${width}.png`,fullPage:true});
  await page.getByRole('button', { name: lang === 'ar' ? 'تبديل المظهر' : 'Switch theme', exact: true }).click();
  await expect(page.locator('html')).toHaveClass(/dark/);
  await page.screenshot({path:`test-results/admin-${lang}-${width}-dark.png`,fullPage:true});
  await page.goto('/admin/users');
  await expect(page.getByRole('heading',{name:lang==='ar'?'فريق العمل':'Team',exact:true})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.getByRole('button',{name:lang==='ar'?'إضافة موظف':'Add team member',exact:true}).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.goto('/admin/security');
  await expect(page.getByRole('heading',{name:lang==='ar'?'الحساب والأمان':'Account & security',exact:true})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('viewer cannot open staff page and navigation hides staff',async({page})=>{
  await page.route('**/api/admin/auth/session',route=>route.fulfill({json:{user:{...fixture,role:'viewer'},csrfToken:'test'}}));
  await page.goto('/admin/users');
  await expect(page.getByRole('heading',{name:'ليس لديك صلاحية لهذه الصفحة'})).toBeVisible();
  await expect(page.getByRole('link',{name:'فريق العمل',exact:true})).toHaveCount(0);
});
test('login and required password screen are responsive',async({page})=>{
  await page.setViewportSize({width:360,height:800});
  await page.route('**/api/admin/auth/session',route=>route.fulfill({status:401,json:{error:{code:'unauthenticated'}}}));
  await page.goto('/admin/'); await expect(page.getByRole('heading',{name:'أهلًا بعودتك'})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:'test-results/admin-login-360.png',fullPage:true});
  await page.unroute('**/api/admin/auth/session');
  await page.route('**/api/admin/auth/session',route=>route.fulfill({json:{user:{...fixture,mustChangePassword:true},csrfToken:'test'}}));
  await page.reload(); await expect(page.getByRole('heading',{name:'عيّن كلمة مرور خاصة بك'})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
