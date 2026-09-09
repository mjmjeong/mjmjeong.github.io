(() => {
  const toggle = document.querySelector('.theme-toggle');
  if (!toggle) return;
  const apply = (dark) => {
    document.body.dataset.chromeTheme = dark ? 'dark' : 'light';
    toggle.setAttribute('aria-checked', String(dark));
    toggle.querySelector('.theme-label').textContent = dark ? 'Dark' : 'Light';
  };
  let saved = 'light';
  try { saved = localStorage.getItem('navigation-theme') || 'light'; } catch {}
  apply(saved === 'dark');
  toggle.addEventListener('click', () => {
    const dark = toggle.getAttribute('aria-checked') !== 'true';
    apply(dark);
    try { localStorage.setItem('navigation-theme', dark ? 'dark' : 'light'); } catch {}
  });
})();
