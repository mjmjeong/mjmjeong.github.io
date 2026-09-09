(() => {
  const toggle = document.querySelector('.theme-toggle');
  if (!toggle) return;
  const desktop = window.matchMedia('(min-width: 750px)');
  const apply = (dark) => {
    document.body.dataset.chromeTheme = dark ? 'dark' : 'light';
    toggle.setAttribute('aria-checked', String(dark));
    toggle.querySelector('.theme-label').textContent = dark ? 'Dark' : 'Light';
  };
  apply(false);
  desktop.addEventListener('change', () => apply(false));
  toggle.addEventListener('click', () => {
    const dark = desktop.matches && toggle.getAttribute('aria-checked') !== 'true';
    apply(dark);
  });
})();
