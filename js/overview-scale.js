(() => {
  const mobile = window.matchMedia('(max-width: 799px)');
  const panels = [
    ['.research-overview-panel', '.research-overview-scale'],
  ];

  panels.forEach(([panelSelector, contentSelector]) => {
    const panel = document.querySelector(panelSelector);
    const content = panel?.querySelector(contentSelector);
    if (!content) return;
    const title = panel.querySelector('.research-overview-title');

    const resize = () => {
      panel.classList.add('is-scaled');
      panel.classList.add('is-measuring');
      // Desktop fits complete lines; mobile fits descriptions in up to two
      // lines while keeping continuation text aligned after the metadata.
      const lines = content.querySelectorAll('.research-period-content h3, .research-period-content li');
      if (lines.length && content.offsetWidth) {
        const bounds = content.getBoundingClientRect();
        const currentScale = bounds.width / content.offsetWidth;
        if (currentScale > 0) {
          const range = document.createRange();
          let lineEnd = bounds.left;
          lines.forEach(line => {
            const description = mobile.matches && line.querySelector('.research-paper-description');
            if (description) {
              const node = description.firstChild;
              range.selectNodeContents(description);
              const textBounds = range.getBoundingClientRect();
              let requiredWidth = textBounds.width;
              for (const match of node.textContent.matchAll(/\s+/g)) {
                range.setStart(node, 0);
                range.setEnd(node, match.index);
                const firstWidth = range.getBoundingClientRect().width;
                range.setStart(node, match.index + match[0].length);
                range.setEnd(node, node.length);
                requiredWidth = Math.min(requiredWidth, Math.max(firstWidth, range.getBoundingClientRect().width));
              }
              lineEnd = Math.max(lineEnd, textBounds.left + requiredWidth + 2 * currentScale);
              return;
            }
            range.selectNodeContents(line);
            lineEnd = Math.max(lineEnd, range.getBoundingClientRect().right);
          });
          const width = Math.ceil((lineEnd - bounds.left) / currentScale + 8);
          content.style.setProperty('--overview-width', `${width}px`);
        }
      }
      panel.classList.remove('is-measuring');
      const style = getComputedStyle(panel);
      const available = panel.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
      const scale = Math.min(1, Math.max(0, available / content.offsetWidth));
      panel.style.setProperty('--overview-scale', scale);
      // Transforms do not change flow height: reserve only the scaled height.
      panel.style.setProperty('--overview-height', `${(title?.offsetHeight || 0) + content.offsetHeight * scale}px`);
    };

    resize();
    window.addEventListener('resize', resize);
    if ('ResizeObserver' in window) {
      const observer = new ResizeObserver(resize);
      observer.observe(panel);
      observer.observe(content);
      if (title) observer.observe(title);
    }
    if (document.fonts) document.fonts.ready.then(resize);
  });
})();
