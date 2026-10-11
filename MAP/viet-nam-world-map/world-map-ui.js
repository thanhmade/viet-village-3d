(function () {
  'use strict';
  // Classic script: shares the existing r160 game; does not load another Three.js.
  const scriptURL = document.currentScript && document.currentScript.src;
  if (!scriptURL) return;
  const base = new URL('./', scriptURL);
  let root, viewport, stage, image, status, list, selectedTitle, selectedKind, selectedDescription, enter;
  let ready = false, pending = null, generation = 0, config, sites = [], selected = null, restoreFocus;
  let fit = 1, scale = 1, tx = 0, ty = 0, mapWidth = 1, mapHeight = 1, pinch = null;
  let previousInert = [];
  let gestureMoved = false, gestureOrigin = null;
  const points = new Map(), pins = new Map(), choices = new Map(), destinations = new Map();
  const byId = (id) => document.getElementById(id);
  const isOpen = () => !!root && !root.hidden;
  function element(tag, className, text) {
    const e = document.createElement(tag);
    if (className) e.className = className;
    if (text !== undefined) e.textContent = text;
    return e;
  }
  function button(text, label, action, className) {
    const b = element('button', className, text);
    b.type = 'button'; b.setAttribute('aria-label', label); b.onclick = action;
    return b;
  }
  function renderTransform() {
    if (!ready) return;
    const w = viewport.clientWidth, h = viewport.clientHeight;
    const sw = mapWidth * scale, sh = mapHeight * scale;
    tx = sw <= w ? (w - sw) / 2 : Math.max(w - sw - 30, Math.min(30, tx));
    ty = sh <= h ? (h - sh) / 2 : Math.max(h - sh - 30, Math.min(30, ty));
    stage.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
    stage.style.setProperty('--vwm-inverse-scale', String(1 / scale));
    root.dataset.zoom = (scale / fit).toFixed(3);
  }
  function fitMap() {
    if (!ready || !viewport.clientWidth || !viewport.clientHeight) return;
    fit = Math.min((viewport.clientWidth - 28) / mapWidth, (viewport.clientHeight - 28) / mapHeight);
    scale = fit; tx = (viewport.clientWidth - mapWidth * scale) / 2; ty = (viewport.clientHeight - mapHeight * scale) / 2;
    renderTransform();
  }
  function zoom(factor, x = viewport.clientWidth / 2, y = viewport.clientHeight / 2) {
    if (!ready) return;
    const next = Math.max(fit, Math.min(fit * config.maxZoom, scale * factor));
    const localX = (x - tx) / scale, localY = (y - ty) / scale;
    scale = next; tx = x - localX * scale; ty = y - localY * scale;
    renderTransform();
  }
  function focusSite() {
    if (!selected || !ready) return;
    const site = sites.find((s) => s.id === selected);
    scale = fit * Math.min(5, config.maxZoom);
    tx = viewport.clientWidth / 2 - (site.page_xy[0] - config.viewport[0]) * scale;
    ty = viewport.clientHeight / 2 - (site.page_xy[1] - config.viewport[1]) * scale;
    renderTransform();
  }
  function updateEntry() {
    const handler = destinations.get(selected);
    enter.disabled = !handler;
    enter.textContent = handler ? 'Vào khu vực' : 'Map chi tiết đang xây dựng';
  }
  function selectSite(id) {
    const site = sites.find((s) => s.id === id);
    if (!site) return;
    selected = id; root.dataset.selected = id;
    const detail = config.siteDetails[id] || {};
    selectedTitle.textContent = site.name;
    selectedKind.textContent = detail.kind || 'Địa danh';
    selectedDescription.textContent = detail.description || '';
    for (const [key, pin] of pins) pin.setAttribute('aria-pressed', String(key === id));
    for (const [key, choice] of choices) choice.setAttribute('aria-pressed', String(key === id));
    updateEntry();
    root.dispatchEvent(new CustomEvent('vietnam-map-select', { bubbles: true, detail: { id, name: site.name } }));
  }
  async function fetchJSON(filename) {
    const response = await fetch(new URL(filename, base));
    if (!response.ok) throw new Error(filename + ': HTTP ' + response.status);
    return response.json();
  }
  function loadImage(url) {
    return new Promise((resolve, reject) => {
      image.onload = () => { image.onload = image.onerror = null; resolve(); };
      image.onerror = () => { image.onload = image.onerror = null; reject(new Error('Không tải được ảnh nền')); };
      image.src = url;
    });
  }
  async function load() {
    if (ready || pending) return pending;
    const ticket = ++generation;
    status.textContent = 'Đang tải bản đồ…'; status.hidden = false;
    root.setAttribute('aria-busy', 'true'); byId('vwmRetry').hidden = true;
    pending = (async () => {
      try {
        const [settings, data] = await Promise.all([fetchJSON('map-config.json'), fetchJSON('diem-vao-map.json')]);
        if (!Array.isArray(settings.viewport) || settings.viewport.length !== 4 || !settings.viewport.every(Number.isFinite) || !Array.isArray(data.sites) || !data.sites.length || !Number.isFinite(settings.maxZoom) || settings.maxZoom < 1) throw new Error('Dữ liệu bản đồ không hợp lệ');
        const [x0, y0, x1, y1] = settings.viewport;
        if (x1 <= x0 || y1 <= y0 || data.sites.some((s) => !s.id || !s.name || !Array.isArray(s.page_xy) || s.page_xy.length !== 2 || !s.page_xy.every(Number.isFinite))) throw new Error('Tọa độ bản đồ không hợp lệ');
        await loadImage(new URL(settings.image, base).href);
        if (ticket !== generation) return;
        config = settings; sites = data.sites; mapWidth = x1 - x0; mapHeight = y1 - y0;
        stage.style.width = mapWidth + 'px'; stage.style.height = mapHeight + 'px';
        list.replaceChildren();
        for (const site of sites) {
          const pin = button('', site.name, (e) => { if (e.detail === 0 || !gestureMoved) selectSite(site.id); }, 'vwm-pin');
          pin.dataset.site = site.id; pin.title = site.name; pin.setAttribute('aria-pressed', 'false');
          pin.style.left = (site.page_xy[0] - x0) + 'px'; pin.style.top = (site.page_xy[1] - y0) + 'px';
          stage.append(pin); pins.set(site.id, pin);
          const choice = button(site.name, 'Chọn ' + site.name, () => selectSite(site.id), 'vwm-choice');
          choice.dataset.site = site.id; choice.setAttribute('aria-pressed', 'false');
          list.append(choice); choices.set(site.id, choice);
        }
        ready = true; root.dataset.ready = 'true'; status.hidden = true;
        selectSite(selected || sites[0].id); fitMap();
      } catch (error) {
        status.textContent = 'Chưa tải được bản đồ. Kiểm tra kết nối rồi bấm Thử lại.';
        byId('vwmRetry').hidden = false;
        console.warn('[VietnamWorldMap]', error.message);
      } finally {
        root.setAttribute('aria-busy', 'false'); pending = null;
      }
    })();
    return pending;
  }
  function open() {
    if (!root) init();
    if (isOpen()) return;
    restoreFocus = document.activeElement;
    if (typeof clearMotion === 'function') clearMotion();
    root.hidden = false; root.classList.remove('hidden');
    previousInert = [...document.body.children].filter((e) => e !== root && e.tagName !== 'SCRIPT').map((e) => [e, e.inert]);
    previousInert.forEach(([e]) => { e.inert = true; });
    document.body.classList.add('vwm-open'); byId('vwmClose').focus();
    if (ready) fitMap(); else load();
  }
  function close() {
    if (!isOpen()) return;
    points.clear(); pinch = null;
    root.hidden = true; root.classList.add('hidden');
    previousInert.forEach(([e, wasInert]) => { e.inert = wasInert; }); previousInert = [];
    document.body.classList.remove('vwm-open');
    if (typeof clearMotion === 'function') clearMotion();
    if (restoreFocus && restoreFocus.isConnected) restoreFocus.focus();
  }
  function coordinates(e) {
    const r = viewport.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top };
  }
  function resetPinch() {
    pinch = null;
    if (points.size === 2) {
      const [a, b] = [...points.values()], x = (a.x + b.x) / 2, y = (a.y + b.y) / 2;
      pinch = { distance: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)), scale, localX: (x - tx) / scale, localY: (y - ty) / scale };
    }
  }
  function bindNavigation() {
    viewport.addEventListener('pointerdown', (e) => {
      if (!ready || (e.pointerType === 'mouse' && e.button !== 0) || points.size >= 2) return;
      e.preventDefault(); viewport.focus({ preventScroll: true });
      if (!points.size) { gestureMoved = false; gestureOrigin = coordinates(e); }
      points.set(e.pointerId, coordinates(e));
      (e.target.closest('.vwm-pin') || viewport).setPointerCapture(e.pointerId);
      if (points.size === 2) gestureMoved = true;
      resetPinch();
    });
    viewport.addEventListener('pointermove', (e) => {
      if (!points.has(e.pointerId)) return;
      const before = points.get(e.pointerId), next = coordinates(e); points.set(e.pointerId, next);
      if (gestureOrigin && Math.hypot(next.x - gestureOrigin.x, next.y - gestureOrigin.y) > 6) gestureMoved = true;
      if (points.size === 2 && pinch) {
        const [a, b] = [...points.values()];
        scale = Math.max(fit, Math.min(fit * config.maxZoom, pinch.scale * Math.hypot(a.x - b.x, a.y - b.y) / pinch.distance));
        tx = (a.x + b.x) / 2 - pinch.localX * scale; ty = (a.y + b.y) / 2 - pinch.localY * scale;
      } else { tx += next.x - before.x; ty += next.y - before.y; }
      renderTransform();
    });
    for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) viewport.addEventListener(event, (e) => {
      points.delete(e.pointerId); resetPinch();
    });
    viewport.addEventListener('wheel', (e) => { e.preventDefault(); const p = coordinates(e); zoom(Math.exp(-e.deltaY * .0015), p.x, p.y); }, { passive: false });
    viewport.addEventListener('dblclick', (e) => { if (e.target.closest('button')) return; const p = coordinates(e); zoom(1.8, p.x, p.y); });
    viewport.addEventListener('keydown', (e) => {
      const offsets = { ArrowLeft: [45, 0], ArrowRight: [-45, 0], ArrowUp: [0, 45], ArrowDown: [0, -45] };
      if (offsets[e.key]) { e.preventDefault(); tx += offsets[e.key][0]; ty += offsets[e.key][1]; renderTransform(); }
      if (e.key === '+' || e.key === '=') { e.preventDefault(); zoom(1.4); }
      if (e.key === '-') { e.preventDefault(); zoom(1 / 1.4); }
    });
    new ResizeObserver(() => { if (isOpen()) fitMap(); }).observe(viewport);
    addEventListener('blur', () => { points.clear(); pinch = null; });
  }
  function init() {
    if (root) return;
    root = element('section', 'vwm hidden'); root.id = 'worldMapOverlay'; root.hidden = true;
    root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-labelledby', 'vwmHeading');
    // Static interface only. Geographic labels are not painted onto the map image.
    root.innerHTML = '<header class="vwm-header"><div><small>VIET VILLAGE 3D</small><h2 id="vwmHeading">Bản đồ Việt Nam</h2></div><button type="button" id="vwmClose" aria-label="Đóng bản đồ">✕ <span>Quay lại game</span></button></header><div class="vwm-layout"><div class="vwm-canvas"><div id="vwmViewport" class="vwm-viewport" tabindex="0" aria-label="Bản đồ không chữ. Kéo để di chuyển, cuộn hoặc chụm hai ngón để phóng to."><div id="vwmStage" class="vwm-stage"><img id="vwmImage" alt="Bản đồ hành chính Việt Nam không chữ, giữ hình học theo nguồn năm 2025" draggable="false"></div></div><div class="vwm-zoom"><button type="button" id="vwmPlus" aria-label="Phóng to">＋</button><button type="button" id="vwmMinus" aria-label="Thu nhỏ">−</button><button type="button" id="vwmFit" aria-label="Xem toàn bản đồ">⌖</button></div><div class="vwm-loading"><p id="vwmStatus" role="status"></p><button type="button" id="vwmRetry" hidden>Thử lại</button></div><p class="vwm-hint">Kéo để xem · Cuộn hoặc chụm hai ngón để phóng to</p></div><aside class="vwm-sidebar"><div class="vwm-side-scroll"><div class="vwm-section-label">ĐIỂM ĐẾN</div><nav id="vwmSites" class="vwm-sites" aria-label="Chọn địa danh"></nav><article class="vwm-detail" aria-live="polite"><small id="vwmKind">Chọn địa danh</small><h3 id="vwmSelected">Hành trình Việt Nam</h3><p id="vwmDescription">Chọn một điểm trên bản đồ hoặc trong danh sách.</p><div class="vwm-actions"><button type="button" id="vwmFocus">Xem vị trí</button><button type="button" id="vwmEnter" disabled>Map chi tiết đang xây dựng</button></div></article><div class="vwm-villages"><button type="button" id="vwmVillage">⌂ Về làng chính</button><button type="button" disabled>Làng tân thủ · đang xây dựng</button></div><p class="vwm-source">Nền hành chính 2025 · 1:9.000.000</p></div></aside></div>';
    document.body.append(root);
    viewport = byId('vwmViewport'); stage = byId('vwmStage'); image = byId('vwmImage'); status = byId('vwmStatus'); list = byId('vwmSites');
    selectedTitle = byId('vwmSelected'); selectedKind = byId('vwmKind'); selectedDescription = byId('vwmDescription'); enter = byId('vwmEnter');
    byId('vwmClose').onclick = close; byId('vwmPlus').onclick = () => zoom(1.4); byId('vwmMinus').onclick = () => zoom(1 / 1.4); byId('vwmFit').onclick = fitMap;
    byId('vwmPlus').textContent = '+';
    byId('vwmFit').innerHTML = '<svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 3H3v6m12-6h6v6M3 15v6h6m12-6v6h-6"/><circle cx="12" cy="12" r="3"/></svg>';
    byId('vwmVillage').textContent = 'Về làng chính';
    byId('vwmFocus').onclick = focusSite; byId('vwmRetry').onclick = load;
    byId('vwmVillage').onclick = () => { close(); if (typeof openScenery === 'function') openScenery(); };
    enter.onclick = async () => {
      const handler = destinations.get(selected); if (!handler) return;
      enter.disabled = true;
      try { await handler(sites.find((s) => s.id === selected)); close(); }
      catch (error) { selectedDescription.textContent = 'Chưa mở được khu vực. Hãy thử lại.'; console.warn('[VietnamWorldMap]', error.message); }
      finally { updateEntry(); }
    };
    const opener = byId('mapBtn');
    if (opener) { opener.onclick = open; opener.textContent = 'Bản đồ Việt Nam'; opener.title = 'Bản đồ tổng · Phím M'; }
    bindNavigation();
    document.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      const editing = e.target instanceof Element && e.target.closest('input,select,textarea,[contenteditable="true"]');
      if (!editing && e.code === 'KeyM') { e.preventDefault(); e.stopImmediatePropagation(); if (isOpen()) close(); else if (byId('home')?.classList.contains('hidden')) open(); return; }
      if (!isOpen()) return;
      if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); close(); }
      if (e.key === 'Tab') {
        const focusable = [...root.querySelectorAll('button:not(:disabled),[tabindex="0"]')].filter((e) => !e.hidden && e.getClientRects().length);
        const first = focusable[0], last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }, true);
  }
  window.VietnamWorldMap = { open, close, isOpen, select: selectSite, registerDestination(id, handler) {
    if (typeof handler !== 'function') throw new TypeError('Destination handler must be a function');
    destinations.set(id, handler); if (selected === id) updateEntry();
  } };
  if (document.readyState === 'interactive' || document.readyState === 'complete') init();
  else document.addEventListener('DOMContentLoaded', init, { once: true });
})();
