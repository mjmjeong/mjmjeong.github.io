(() => {
  const button = document.querySelector('.mobile-menu-toggle');
  const menu = document.querySelector('#mobile-navigation');
  if (!button || !menu) return;

  const setOpen = (open) => {
    button.setAttribute('aria-expanded', String(open));
    button.setAttribute('aria-label', open ? 'Close navigation menu' : 'Open navigation menu');
    menu.hidden = !open;
  };

  button.addEventListener('click', () => setOpen(menu.hidden));
  menu.addEventListener('click', (event) => {
    if (event.target.closest('a')) setOpen(false);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !menu.hidden) {
      setOpen(false);
      button.focus();
    }
  });
  document.addEventListener('click', (event) => {
    if (!menu.hidden && !menu.contains(event.target) && !button.contains(event.target)) {
      setOpen(false);
    }
  });
  window.matchMedia('(min-width: 800px)').addEventListener('change', (event) => {
    if (event.matches) setOpen(false);
  });
})();
