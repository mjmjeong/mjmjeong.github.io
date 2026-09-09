(() => {
  const toggle = document.querySelector('.theme-toggle');
  if (!toggle) return;
  const portraits = Array.from(document.querySelectorAll('img[data-dark-src]'), (img) => ({
    img,
    lightSrc: img.getAttribute('src'),
  }));
  const desktop = window.matchMedia('(min-width: 750px)');
  const apply = (dark) => {
    document.body.dataset.chromeTheme = dark ? 'dark' : 'light';
    toggle.setAttribute('aria-checked', String(dark));
    toggle.querySelector('.theme-label').textContent = dark ? 'Dark' : 'Light';
    portraits.forEach(({ img, lightSrc }) => {
      img.setAttribute('src', dark ? img.dataset.darkSrc : lightSrc);
    });
  };
  apply(false);
  desktop.addEventListener('change', () => apply(false));
  toggle.addEventListener('click', () => {
    const dark = desktop.matches && toggle.getAttribute('aria-checked') !== 'true';
    apply(dark);
  });
})();
