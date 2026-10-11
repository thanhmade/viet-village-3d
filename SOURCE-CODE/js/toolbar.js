/* The toolbar owns only its disclosure, layout and UI input events. */
(() => {
  const tools = document.querySelector?.('#gameTools');
  if (!tools) return;
  const toggle = document.getElementById('toolsToggle');
  const panel = document.getElementById('toolsPanel');
  const items = panel.querySelector('.tools-items');
  const mobile = matchMedia('(max-width: 700px)');
  const storageKey = 'viet-village-3d-toolbar-v1';
  const preferences = { desktop: false, mobile: true };
  let collapsed, layoutFrame;

  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    for (const layout of ['desktop', 'mobile']) {
      if (typeof saved?.[layout] === 'boolean') preferences[layout] = saved[layout];
    }
  } catch (_) { /* The controls still work if browser storage is unavailable. */ }

  const layoutKey = () => mobile.matches ? 'mobile' : 'desktop';
  const availableButtons = () => [...items.querySelectorAll('button')]
    .filter(button => !button.disabled && getComputedStyle(button).display !== 'none');

  function measure() {
    const viewportWidth = document.documentElement.clientWidth;
    const margin = mobile.matches ? 12 : 22;
    const gap = parseFloat(getComputedStyle(items).columnGap) || 0;
    const buttons = [...items.querySelectorAll('button')]
      .filter(button => getComputedStyle(button).display !== 'none');
    const naturalWidth = buttons.reduce((width, button) => width + button.getBoundingClientRect().width, 0)
      + Math.max(0, buttons.length - 1) * gap;
    const availableWidth = viewportWidth - margin * 2 - (mobile.matches ? 0 : toggle.offsetWidth + 18);
    const width = mobile.matches ? Math.min(280, availableWidth) : Math.min(naturalWidth + 4, availableWidth);
    panel.style.setProperty('--tools-panel-width', Math.max(0, Math.ceil(width)) + 'px');
    const availableHeight = innerHeight - (mobile.matches ? 78 : 126) - margin;
    const border = mobile.matches ? 2 : 0;
    panel.style.setProperty('--tools-limit-height', Math.max(0, availableHeight - border) + 'px');
    panel.style.setProperty('--tools-panel-height', Math.max(0, Math.min(items.scrollHeight + border, availableHeight)) + 'px');
  }

  function queueMeasure() {
    cancelAnimationFrame(layoutFrame);
    layoutFrame = requestAnimationFrame(measure);
  }

  function setCollapsed(value, persist = false) {
    collapsed = value;
    if (collapsed && panel.contains(document.activeElement)) toggle.focus({ preventScroll: true });
    panel.inert = collapsed;
    panel.setAttribute('aria-hidden', String(collapsed));
    toggle.setAttribute('aria-expanded', String(!collapsed));
    toggle.textContent = collapsed ? '☰ Công cụ' : '✕ Thu gọn';
    toggle.title = collapsed ? 'Mở công cụ' : 'Thu gọn công cụ';
    toggle.setAttribute('aria-label', toggle.title);
    tools.classList.toggle('is-collapsed', collapsed);
    if (persist) {
      preferences[layoutKey()] = collapsed;
      try { localStorage.setItem(storageKey, JSON.stringify(preferences)); } catch (_) { }
    }
    measure();
  }

  toggle.addEventListener('click', () => setCollapsed(!collapsed, true));
  panel.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (mobile.matches && button && !button.disabled) setCollapsed(true, true);
  });
  tools.addEventListener('keydown', event => {
    // Keep native button activation and menu navigation separate from scene input.
    // WASD still reaches the existing game handler, including after a pointer click on the toggle.
    if (['Enter', ' ', 'Escape', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
      'Home', 'End', 'PageUp', 'PageDown'].includes(event.key)) event.stopPropagation();
    if (event.key === 'Escape') {
      event.preventDefault();
      setCollapsed(true, true);
      toggle.focus({ preventScroll: true });
    } else if (event.target === toggle && event.key === 'ArrowDown') {
      event.preventDefault();
      setCollapsed(false, true);
      availableButtons()[0]?.focus({ preventScroll: true });
    }
  });
  // Let keyup reach the existing movement handler to release any previously held WASD key.
  for (const type of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'click', 'dblclick']) {
    tools.addEventListener(type, event => event.stopPropagation());
  }
  for (const type of ['touchstart', 'touchmove', 'touchend', 'wheel']) {
    tools.addEventListener(type, event => event.stopPropagation(), { passive: true });
  }
  const changeLayout = () => setCollapsed(preferences[layoutKey()]);
  mobile.addEventListener('change', changeLayout);
  addEventListener('resize', queueMeasure);
  // The HUD is hidden on the welcome screen; measure again when the game makes it visible.
  new ResizeObserver(queueMeasure).observe(toggle);
  new MutationObserver(queueMeasure).observe(items, {
    subtree: true, attributes: true, attributeFilter: ['style', 'class', 'hidden', 'disabled'],
    childList: true, characterData: true
  });
  setCollapsed(preferences[layoutKey()]);
  requestAnimationFrame(() => tools.classList.add('tools-ready'));
})();
