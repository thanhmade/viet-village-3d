/* Disclosure only: existing game buttons keep their IDs and event handlers. */
(() => {
  const tools = document.querySelector?.('#gameTools');
  if (!tools) return;
  const toggle = document.getElementById('toolsToggle');
  const panel = document.getElementById('toolsPanel');
  const items = panel.querySelector('.tools-items');
  const mobile = matchMedia('(max-width: 700px)');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const storageKey = 'viet-village-3d-toolbar-v1';
  const preferences = { desktop: false, mobile: true };
  let collapsed, closeTimer = null, layoutFrame = null, restoringCommandFocus = false;
  const clearMotion = () => {
    if (!restoringCommandFocus) window.VietVillageGame?.clearMotion?.();
  };

  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    for (const layout of ['desktop', 'mobile']) {
      if (typeof saved?.[layout] === 'boolean') preferences[layout] = saved[layout];
    }
  } catch (_) { /* A blocked or damaged preference must not hide game controls. */ }

  const layoutKey = () => mobile.matches ? 'mobile' : 'desktop';
  const visibleButtons = () => [...items.querySelectorAll('button')]
    .filter(button => !button.hidden && getComputedStyle(button).display !== 'none');
  const availableButtons = () => visibleButtons().filter(button => !button.disabled);
  function measure() {
    layoutFrame = null;
    if (collapsed || panel.hidden) return;
    const margin = mobile.matches ? 12 : 22;
    const gap = parseFloat(getComputedStyle(items).columnGap) || 0;
    const buttons = visibleButtons();
    const naturalWidth = buttons.reduce((width, button) => width + button.getBoundingClientRect().width, 0)
      + Math.max(0, buttons.length - 1) * gap;
    const availableWidth = document.documentElement.clientWidth - margin * 2 - (mobile.matches ? 0 : toggle.offsetWidth + 18);
    const width = mobile.matches ? Math.min(280, availableWidth) : Math.min(naturalWidth + 4, availableWidth);
    panel.style.setProperty('--tools-panel-width', Math.max(0, Math.ceil(width)) + 'px');
    const availableHeight = innerHeight - (mobile.matches ? 78 : 126) - margin;
    const border = mobile.matches ? 2 : 0;
    panel.style.setProperty('--tools-limit-height', Math.max(0, availableHeight - border) + 'px');
    panel.style.setProperty('--tools-panel-height', Math.max(0, Math.min(items.scrollHeight + border, availableHeight)) + 'px');
  }
  function queueMeasure() {
    if (layoutFrame !== null) cancelAnimationFrame(layoutFrame);
    layoutFrame = requestAnimationFrame(measure);
  }
  function finishClosing() {
    closeTimer = null;
    if (collapsed) panel.hidden = true;
  }
  function setCollapsed(value, { persist = false, initial = false, preserveMotion = false } = {}) {
    if (closeTimer !== null) clearTimeout(closeTimer);
    closeTimer = null;
    collapsed = value;
    if (!initial && !preserveMotion) clearMotion();
    if (collapsed && panel.contains(document.activeElement)) {
      // A selected command may have just created a walking route. Returning
      // focus during automatic dismissal must not cancel that new command.
      restoringCommandFocus = preserveMotion;
      try { toggle.focus({ preventScroll: true }); }
      finally { restoringCommandFocus = false; }
    }
    panel.inert = collapsed;
    panel.setAttribute('aria-hidden', String(collapsed));
    toggle.setAttribute('aria-expanded', String(!collapsed));
    toggle.textContent = collapsed ? '☰ Công cụ' : '✕ Thu gọn';
    toggle.title = collapsed ? 'Mở công cụ' : 'Thu gọn công cụ';
    toggle.setAttribute('aria-label', toggle.title);
    if (!collapsed) {
      panel.hidden = false;
      // Measurement flushes the initial collapsed layout before the opening transition.
      measure();
    }
    tools.classList.toggle('is-collapsed', collapsed);
    if (collapsed) {
      if (initial || reducedMotion.matches) finishClosing();
      else closeTimer = setTimeout(finishClosing, 250);
    }
    if (persist) {
      preferences[layoutKey()] = collapsed;
      try { localStorage.setItem(storageKey, JSON.stringify(preferences)); } catch (_) { }
    }
    if (!collapsed) queueMeasure();
  }

  toggle.addEventListener('click', () => setCollapsed(!collapsed, { persist: true }));
  panel.addEventListener('click', event => {
    const button = event.target.closest?.('button');
    if (mobile.matches && button && !button.disabled) setCollapsed(true, { persist: true, preserveMotion: true });
  });
  tools.addEventListener('keydown', event => {
    // Native Enter/Space/Tab still work; scene shortcuts never receive menu keydown.
    event.stopPropagation();
    if (event.key === 'Escape') {
      event.preventDefault();
      setCollapsed(true, { persist: true });
      toggle.focus({ preventScroll: true });
    } else if (event.target === toggle && event.key === 'ArrowDown') {
      event.preventDefault();
      setCollapsed(false, { persist: true });
      availableButtons()[0]?.focus({ preventScroll: true });
    }
  });
  // Keep keyup bubbling so the game can release keys pressed before entering the menu.
  tools.addEventListener('focusin', clearMotion);
  for (const type of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'click', 'dblclick']) {
    tools.addEventListener(type, event => { event.stopPropagation(); if (type === 'pointerdown') clearMotion(); });
  }
  for (const type of ['touchstart', 'touchmove', 'touchend', 'wheel']) {
    tools.addEventListener(type, event => { event.stopPropagation(); if (type === 'touchstart') clearMotion(); }, { passive: true });
  }
  mobile.addEventListener('change', () => setCollapsed(preferences[layoutKey()]));
  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches && closeTimer !== null) { clearTimeout(closeTimer); finishClosing(); }
  });
  addEventListener('resize', queueMeasure);
  new ResizeObserver(queueMeasure).observe(toggle);
  new MutationObserver(queueMeasure).observe(items, {
    subtree: true, attributes: true, attributeFilter: ['style', 'class', 'hidden', 'disabled'],
    childList: true, characterData: true
  });
  setCollapsed(preferences[layoutKey()], { initial: true });
  requestAnimationFrame(() => tools.classList.add('tools-ready'));
})();
