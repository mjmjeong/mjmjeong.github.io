(() => {
  const toggle = document.querySelector('.theme-toggle');
  if (!toggle) return;
  const portraits = Array.from(document.querySelectorAll('img[data-dark-src]'), (img) => ({
    img,
    lightSrc: img.getAttribute('src'),
    hovered: false,
  }));
  const desktop = window.matchMedia('(min-width: 750px)');
  const updatePortrait = ({ img, lightSrc, hovered }) => {
    const dark = document.body.dataset.chromeTheme === 'dark';
    const showDarkPortrait = hovered ? !dark : dark;
    img.setAttribute('src', showDarkPortrait ? img.dataset.darkSrc : lightSrc);
  };
  portraits.forEach((portrait) => {
    portrait.img.addEventListener('pointerenter', (event) => {
      if (event.pointerType !== 'mouse') return;
      portrait.hovered = true;
      updatePortrait(portrait);
    });
    const resetHover = () => {
      portrait.hovered = false;
      updatePortrait(portrait);
    };
    portrait.img.addEventListener('pointerleave', resetHover);
    portrait.img.addEventListener('pointercancel', resetHover);
  });
  const apply = (dark) => {
    document.body.dataset.chromeTheme = dark ? 'dark' : 'light';
    toggle.setAttribute('aria-checked', String(dark));
    toggle.querySelector('.theme-label').textContent = dark ? 'Dark' : 'Light';
    portraits.forEach(updatePortrait);
  };
  apply(false);
  desktop.addEventListener('change', () => apply(false));
  toggle.addEventListener('click', () => {
    const dark = desktop.matches && toggle.getAttribute('aria-checked') !== 'true';
    apply(dark);
  });
})();
