// Apply correct language, direction and theme on load to prevent flash
try {
  const savedLang = localStorage.getItem('alarbi_lang') || 'ar';
  const dir = savedLang === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.lang = savedLang;
  document.documentElement.dir = dir;

  const savedTheme = localStorage.getItem('alarbi_theme') || 'light';
  if (savedTheme === 'light') {
    document.documentElement.classList.remove('dark');
    document.documentElement.classList.add('light');
  } else {
    document.documentElement.classList.remove('light');
    document.documentElement.classList.add('dark');
  }
} catch {}
