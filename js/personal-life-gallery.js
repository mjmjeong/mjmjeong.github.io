(() => {
  const gallery = document.getElementById('personal-life-gallery');
  const previous = document.querySelector('[data-gallery-direction="previous"]');
  const next = document.querySelector('[data-gallery-direction="next"]');
  if (!gallery || !previous || !next) return;

  const updateButtons = () => {
    previous.disabled = gallery.scrollLeft <= 2;
    next.disabled = gallery.scrollLeft + gallery.clientWidth >= gallery.scrollWidth - 2;
  };

  const move = (direction) => {
    const photo = gallery.querySelector('li');
    if (!photo) return;
    const gap = parseFloat(getComputedStyle(gallery).gap) || 0;
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    gallery.scrollBy({
      left: direction * (photo.getBoundingClientRect().width + gap),
      behavior: reducedMotion ? 'auto' : 'smooth'
    });
  };

  previous.addEventListener('click', () => move(-1));
  next.addEventListener('click', () => move(1));
  gallery.addEventListener('scroll', updateButtons, { passive: true });
  window.addEventListener('resize', updateButtons);
  updateButtons();
})();
