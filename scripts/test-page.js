async function test() {
  try {
    const res = await fetch('http://localhost:4173/');
    const text = await res.text();
    console.log('HTTP Status:', res.status);
    console.log('Includes lang="ar":', text.includes('lang="ar"'));
    console.log('Includes dir="rtl":', text.includes('dir="rtl"'));
    console.log('Includes Cairo font:', text.includes('family=Cairo'));
    console.log('Includes script pre-hydration:', text.includes('alarbi_lang'));
  } catch (err) {
    console.error('Fetch error:', err.message);
  }
}
test();
