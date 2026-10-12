'use strict';
// The original self-contained atlas stays at its imported URL. This controller
// owns only the game dialog and an explicit, allowlisted destination lookup.
window.createVillageAtlas = function ({
  document: doc = window.document,
  catalog = window.VietVillageAtlasCatalog,
  connectViewer = window.connectVillageAtlasViewer,
  isAuthenticated, isReady, getRegions, pause
}) {
  const byId = id => doc.getElementById(id);
  const dialog = byId('worldAtlas'), button = byId('worldAtlasBtn');
  const frame = byId('worldAtlasFrame'), travel = byId('atlasTravelBtn');
  const name = byId('atlasSelectionName'), status = byId('atlasSelectionStatus');
  const loading = byId('atlasLoading'), loadText = byId('atlasLoadStatus'), retry = byId('atlasRetryBtn');
  let opened = false, loaded = false, busy = false, selected = null, bridge = null, loadTimer = null;
  let viewerURL = null;

  function targetFor(selection) {
    if (!selection || selection.kind === 'province' || !Object.hasOwn(catalog.links, selection.id)) return null;
    return catalog.links[selection.id];
  }
  function registeredTarget() {
    const target = targetFor(selected), regions = getRegions();
    if (!target?.mapId || !target.spawnId) return null;
    const entry = regions?.destinations.find(entry => entry.id === target.mapId);
    return entry?.spawnIds.includes(target.spawnId) ? target : null;
  }
  function renderSelection(checkedAccess = null) {
    name.textContent = selected?.name || 'Chọn khu vực để khám phá';
    const target = registeredTarget();
    const access = checkedAccess || (loaded && !busy && target && isAuthenticated()
      ? getRegions()?.checkTravelAccess(target.mapId, target.spawnId, {loadDestination: true}) : null);
    const allowed = !!(access?.ok && access.ready);
    travel.disabled = !allowed;
    travel.textContent = target ? 'Đến khu vực' : selected ? 'Chưa mở' : 'Đến khu vực';
    status.textContent = !selected ? 'Chọn địa danh trên bản đồ hoặc một làng trong danh sách.'
      : !target ? (selected.kind === 'province' ? 'Chưa mở · Chọn một địa danh hoặc làng để xem MAP 3D.' : 'Chưa mở · Khu vực này chưa có MAP 3D và điểm xuất hiện được đăng ký.')
      : allowed ? 'Sẵn sàng · ' + (access.requirements ? (access.requirements.mode==='testing'?'Thử nghiệm':'Chế độ chơi')+' · Cấp tối thiểu: '+access.requirements.minimumLevel+' · Phí: '+access.requirements.fee+' · ' : '') + 'Giữ nguyên nhân vật và trang bị khi di chuyển.'
      : access?.message || (loaded ? 'Chưa thể di chuyển · Hãy vào game và thử lại.' : 'Đang chờ tải bản đồ tổng.');
  }
  function select(selection) {
    if (!opened || !isAuthenticated() || busy) return;
    selected = { kind: selection.kind, id: selection.id, name: selection.name };
    renderSelection();
  }
  function failLoad(message) {
    clearTimeout(loadTimer); loadTimer = null; loaded = false;
    bridge?.dispose(); bridge = null;
    loading.hidden = false; retry.hidden = false; frame.style.visibility = 'hidden';
    loadText.textContent = 'Không tải được bản đồ tổng. ' + message + ' Bạn có thể thử lại hoặc trở lại game.';
    renderSelection();
  }
  function load() {
    viewerURL = new URL(catalog.viewerPath, doc.baseURI).href;
    clearTimeout(loadTimer); bridge?.dispose(); bridge = null; loaded = false;
    loading.hidden = false; retry.hidden = true; frame.style.visibility = 'hidden';
    loadText.textContent = 'Đang mở bản đồ Việt Nam…';
    renderSelection();
    loadTimer = setTimeout(() => failLoad('Quá thời gian chờ.'), 20000);
    frame.src = viewerURL;
  }
  frame.addEventListener('load', () => {
    try {
      if (frame.contentWindow?.location.href === 'about:blank') return;
      if (frame.contentWindow.location.href !== viewerURL) throw new Error('Đường dẫn trang xem không đúng.');
      bridge?.dispose();
      bridge = connectViewer(frame.contentWindow, { onSelect: select, onClose: close });
      clearTimeout(loadTimer); loadTimer = null; loaded = true;
      frame.style.visibility = ''; loading.hidden = true; retry.hidden = true;
      renderSelection();
    } catch (error) { failLoad(error.message); }
  });
  frame.addEventListener('error', () => failLoad('Không đọc được trang xem.'));

  function close({ restoreFocus = true } = {}) {
    if (!opened) return;
    opened = false; pause();
    dialog.close(); dialog.inert = true; dialog.setAttribute('aria-hidden', 'true');
    button.setAttribute('aria-expanded', 'false');
    if (restoreFocus && isAuthenticated()) {
      const panel = byId('toolsPanel');
      (panel?.hidden || panel?.inert ? byId('toolsToggle') : button)?.focus({ preventScroll: true });
    }
  }
  function open() {
    if (!isAuthenticated() || !isReady() || opened) return false;
    pause(); dialog.inert = false; dialog.setAttribute('aria-hidden', 'false');
    dialog.showModal(); opened = true; button.setAttribute('aria-expanded', 'true');
    byId('closeWorldAtlas').focus({ preventScroll: true });
    if (!loaded && loadTimer === null) load(); else renderSelection();
    return true;
  }
  function go() {
    if (!opened || !loaded || busy || !isAuthenticated()) return false;
    const target = registeredTarget();
    if (!target) { renderSelection(); return false; }
    const access = getRegions()?.checkTravelAccess(target.mapId, target.spawnId, {loadDestination: true});
    if (!access?.ok || !access.ready) { renderSelection(access); return false; }
    busy = true; travel.disabled = true; status.textContent = 'Đang chuẩn bị khu vực…';
    let result;
    try { result = getRegions().travelTo(target.mapId, target.spawnId); }
    catch (error) { result = { ok: false, message: error.message }; }
    busy = false;
    if (result?.ok) { close(); return true; }
    // Show the actual failure without silently rebuilding the failed map again.
    renderSelection(result || {ok:false});
    status.textContent = 'Không thể đến khu vực. Bạn vẫn ở MAP hiện tại. ' + (result?.message || 'Hãy thử lại.');
    return false;
  }
  button.addEventListener('click', open);
  byId('closeWorldAtlas').addEventListener('click', () => close());
  retry.addEventListener('click', load);
  travel.addEventListener('click', go);
  dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
  dialog.addEventListener('close', () => close());
  dialog.addEventListener('keydown', event => {
    event.stopPropagation();
    if (event.key === 'Escape') { event.preventDefault(); close(); }
  });
  for (const type of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'click', 'wheel', 'touchstart', 'touchmove', 'touchend']) {
    dialog.addEventListener(type, event => event.stopPropagation(), { passive: true });
  }
  return Object.freeze({ open, close, isOpen: () => opened });
};
