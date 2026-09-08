(() => {
  const panels = [
    ['.research-overview-panel', '.research-overview-scale'],
  ];

  panels.forEach(([panelSelector, contentSelector]) => {
    const panel = document.querySelector(panelSelector);
    const content = panel?.querySelector(contentSelector);
    if (!content) return;

    const resize = () => {
      panel.classList.add('is-scaled');
      // Measure every unwrapped line, including its inset from the timeline,
      // so the longest title or publication determines the shared scale.
      const lines = content.querySelectorAll('.research-period-content h3, .research-period-content li');
      if (lines.length && content.offsetWidth) {
        const bounds = content.getBoundingClientRect();
        const currentScale = bounds.width / content.offsetWidth;
        if (currentScale > 0) {
          const range = document.createRange();
          let lineEnd = bounds.left;
          lines.forEach(line => {
            range.selectNodeContents(line);
            lineEnd = Math.max(lineEnd, range.getBoundingClientRect().right);
          });
          const width = Math.ceil((lineEnd - bounds.left) / currentScale + 8);
          content.style.setProperty('--overview-width', `${width}px`);
        }
      }
      const style = getComputedStyle(panel);
      const available = panel.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
      const scale = Math.min(1, Math.max(0, available / content.offsetWidth));
      panel.style.setProperty('--overview-scale', scale);
      // Transforms do not change flow height: reserve only the scaled height.
      panel.style.setProperty('--overview-height', `${content.offsetHeight * scale}px`);
    };

    resize();
    window.addEventListener('resize', resize);
    if ('ResizeObserver' in window) {
      const observer = new ResizeObserver(resize);
      observer.observe(panel);
      observer.observe(content);
    }
    if (document.fonts) document.fonts.ready.then(resize);
  });
})();
