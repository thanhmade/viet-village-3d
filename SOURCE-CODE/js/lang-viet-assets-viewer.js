// Standalone inspection page. No auth/profile/game state is loaded or modified.
const $ = id => document.getElementById(id);
const T = globalThis.THREE;
const catalogURL = new URL('../../MAP/regions/lang-viet/assets-3d.json', import.meta.url);
const loaderURL = new URL('../../ASSETS/vendor/gltf-r160/GLTFLoader.js', import.meta.url);
const angleLabels = { FRONT: 'Trước', RIGHT: 'Phải', LEFT: 'Trái', BACK: 'Sau' };
let catalog = [], selected = null, epoch = 0, model = null, currentAngle = 'FRONT', loaderPromise;
let pondAnimator = null, selectedVariant = 'main';
let renderer, scene, camera, hemisphere, sunlight, floor, wrapper;
let radius = 4, distance = 8, theta = 0, phi = 1.2, target, running = true, lostContext = false;
let frame = 0, lastFrame = 0, testRunning = false, overviewRunning = false, disposed = false;
const pointers = new Map();
let pinchDistance = null;

function setStatus(message, state = 'loading') {
  $('assetStatus').textContent = message;
  $('assetStatus').dataset.state = state;
}
function isImportedPond(asset = selected) { return asset?.id === 'LV_AO_SEN_01' && asset.sourceType === 'imported-glb'; }
function createImportedPondAnimator(asset, gltf) {
  if (!isImportedPond(asset)) return null;
  const required = ['WIND_LIGHT', 'WIND_STRONG', 'WATER_RIPPLE'];
  const missing = required.filter(name => !gltf.animations?.some(clip => clip.name === name));
  if (missing.length) throw new Error('GLB ao thiếu hoạt ảnh: ' + missing.join(', '));
  const create = globalThis.VietVillagePondAnimation?.createPondAnimator;
  if (typeof create !== 'function') throw new Error('Chưa tải bộ điều khiển hoạt ảnh ao sen.');
  return create(T, gltf.scene, gltf.animations);
}
function applyPondControls() {
  if (!pondAnimator) return;
  pondAnimator.setWind($('pondWind').value);
  pondAnimator.setWater($('pondWater').checked);
  const wind = { none: 'Không gió · tư thế nghỉ', light: 'WIND_LIGHT', strong: 'WIND_STRONG' }[$('pondWind').value];
  $('pondAnimationStatus').textContent = `${wind} · ${$('pondWater').checked ? 'WATER_RIPPLE đang phát' : 'Gợn nước đã tắt'} · mỗi lần chỉ một clip gió.`;
}
function release(root) {
  if (!root) return;
  const geometries = new Set(), materials = new Set(), textures = new Set();
  root.traverse(node => {
    if (node.geometry) geometries.add(node.geometry);
    for (const material of node.material ? (Array.isArray(node.material) ? node.material : [node.material]) : []) {
      materials.add(material);
      for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
    }
  });
  geometries.forEach(value => value.dispose());
  materials.forEach(value => value.dispose());
  textures.forEach(value => { value.source?.data?.close?.(); value.dispose(); });
  root.removeFromParent();
}
async function loadAsset(url) {
  loaderPromise ||= import(loaderURL.href).catch(error => { loaderPromise = null; throw error; });
  const { GLTFLoader } = await loaderPromise;
  const manager = new T.LoadingManager(), failed = [];
  manager.onError = resource => failed.push(resource);
  const gltf = await new GLTFLoader(manager).loadAsync(new URL(url, document.baseURI).href);
  if (failed.length) { release(gltf.scene); throw new Error('Tài nguyên mô hình không tải được.'); }
  return gltf;
}
function inspect(root) {
  let meshes = 0, triangles = 0, vertices = 0, materials = new Set(), textures = new Set();
  root.updateMatrixWorld(true);
  root.traverse(node => {
    if (!node.isMesh) return;
    meshes++;
    const position = node.geometry?.attributes.position;
    if (!position?.count) throw new Error('Mesh thiếu đỉnh hình học.');
    for (const coordinate of position.array) if (!Number.isFinite(coordinate)) throw new Error('Tọa độ hình học không hữu hạn.');
    vertices += position.count;
    triangles += (node.geometry.index?.count || position.count) / 3;
    for (const material of Array.isArray(node.material) ? node.material : [node.material]) {
      if (!material) throw new Error('Mesh thiếu vật liệu.');
      materials.add(material);
      for (const value of Object.values(material)) if (value?.isTexture) {
        if (!value.image) throw new Error('Texture chưa tải.');
        textures.add(value);
      }
    }
  });
  const box = new T.Box3().setFromObject(root), size = box.getSize(new T.Vector3());
  if (!meshes || ![size.x, size.y, size.z].every(value => Number.isFinite(value) && value > 0)) throw new Error('Mô hình rỗng hoặc kích thước không hợp lệ.');
  return { meshes, triangles: Math.round(triangles), vertices, materials: materials.size, textures: textures.size, size, box };
}
function stat(label, text) {
  const term = document.createElement('dt'), value = document.createElement('dd');
  term.textContent = label; value.textContent = text; $('assetStats').append(term, value);
}
function updateCamera() {
  if (!camera) return;
  camera.position.set(target.x + distance * Math.sin(phi) * Math.sin(theta), target.y + distance * Math.cos(phi), target.z + distance * Math.sin(phi) * Math.cos(theta));
  camera.lookAt(target);
}
function resize() {
  if (!renderer || !camera) return;
  const box = $('assetViewport').getBoundingClientRect();
  if (box.width < 1 || box.height < 1) return;
  renderer.setSize(Math.floor(box.width), Math.floor(box.height), false);
  camera.aspect = box.width / box.height; camera.updateProjectionMatrix();
}
function zoom(factor) {
  distance = T.MathUtils.clamp(distance * factor, radius * .55, radius * 7);
  updateCamera();
}
function changeReference() {
  const img = $('referenceImage'), url = selected?.references?.[currentAngle];
  $('referenceAngle').textContent = '· ' + angleLabels[currentAngle];
  img.hidden = true; img.removeAttribute('src');
  if (!url) { $('referenceStatus').textContent = 'Góc này chưa có ảnh đọc được. Xem ghi chú về nguồn bị thiếu hoặc lỗi.'; return; }
  const expected = new URL(url, document.baseURI).href;
  img.alt = `${selected.name || selected.id} — góc ${angleLabels[currentAngle].toLowerCase()}`;
  $('referenceStatus').textContent = 'Đang tải ảnh tham chiếu…';
  img.onload = () => { if (img.src !== expected) return; img.hidden = false; $('referenceStatus').textContent = `Ảnh tham chiếu đã đọc được · ${img.naturalWidth} × ${img.naturalHeight} px. Không dùng ảnh phẳng thay thế hình học 3D.`; };
  img.onerror = () => { if (img.src !== expected) return; img.hidden = true; $('referenceStatus').textContent = 'Không tải được ảnh tham chiếu tại đường dẫn đã đăng ký.'; };
  img.src = expected;
}
function setView(angle, reset = false) {
  currentAngle = angle;
  // The supplied pond package explicitly labels RIGHT as camera -X and LEFT
  // as +X. Keep the existing convention for every other catalog model.
  theta = (isImportedPond() ? { FRONT: 0, RIGHT: -Math.PI / 2, LEFT: Math.PI / 2, BACK: Math.PI }
    : { FRONT: 0, RIGHT: Math.PI / 2, LEFT: -Math.PI / 2, BACK: Math.PI })[angle];
  phi = isImportedPond() ? .96 : 1.22;
  if (reset) distance = radius * 2.7 / Math.min(1, camera?.aspect || 1);
  updateCamera();
  document.querySelectorAll('[data-view]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.view === angle)));
  changeReference();
}
function configureMotion() {
  const importedPond = isImportedPond();
  $('pondControls').hidden = !importedPond;
  $('genericWindControl').hidden = importedPond; $('genericHingeControl').hidden = importedPond; $('calmAsset').hidden = importedPond;
  $('pondVariant').value = selectedVariant;
  $('pondVariant').disabled = !importedPond || !selected?.lod1Url;
  $('pondWind').disabled = !pondAnimator; $('pondWater').disabled = !pondAnimator;
  if (!pondAnimator) $('pondAnimationStatus').textContent = 'Đang tải mô hình và kiểm tra ba clip của chính GLB…';
  const supportsWind = !!model && selected?.motion?.includes('wind') && !!globalThis.VietVillageAssetMotion;
  const supportsHinge = !!model && selected?.motion?.includes('hinge') && !!globalThis.VietVillageAssetMotion;
  $('assetWind').disabled = !supportsWind; $('calmAsset').disabled = !supportsWind;
  $('assetHinge').disabled = !supportsHinge; $('assetHinge').value = '0'; $('hingeValue').textContent = 'Đóng';
  $('motionNote').textContent = importedPond
    ? 'Ao dùng clip WIND_LIGHT / WIND_STRONG theo node và WATER_RIPPLE theo morph target. Hai mức chi tiết tải thay thế nhau, không hiển thị chồng.'
    : supportsWind || supportsHinge
    ? 'Chuyển động bằng mã runtime trên node cây / bản lề; không phải clip rig trong GLB.'
    : 'Tài nguyên tĩnh. Không có hoạt ảnh hoặc điều khiển chuyển động được đăng ký.';
}
async function selectAsset(id) {
  if (selected?.id !== id) selectedVariant = 'main';
  selected = catalog.find(item => item.id === id);
  if (!selected) return;
  const attempt = ++epoch, asset = selected, variant = selectedVariant;
  pondAnimator?.dispose(); pondAnimator = null;
  if (model) { release(model); model = null; }
  $('assetName').textContent = asset.name || asset.id;
  $('assetIntro').textContent = isImportedPond(asset)
    ? 'Mô hình GLB có sẵn được nhập nguyên từ gói nguồn, kèm texture và ba clip gió/gợn nước. Chọn Tiêu chuẩn hoặc LOD1 để đối chiếu; trang này không thay đổi hồ sơ người chơi.'
    : 'Mô hình được dựng bằng hình học 3D từ ảnh tham chiếu. Kích thước là đề xuất; ảnh tham chiếu chỉ dùng để đối chiếu. Trang này không thay đổi hồ sơ người chơi.';
  $('assetCode').textContent = asset.id;
  $('assetStats').replaceChildren(); $('assetAssumptions').replaceChildren();
  for (const note of asset.assumptions || []) {
    const li = document.createElement('li'); li.textContent = String(note); $('assetAssumptions').append(li);
  }
  $('retryAsset').hidden = true;
  configureMotion(); changeReference();
  if (asset.status !== 'built' || !asset.url) {
    setStatus('Chưa dựng: nguồn tham chiếu chưa đủ hoặc bị lỗi. Không hiển thị mô hình thay thế.', 'error'); return;
  }
  if (!renderer || lostContext) { setStatus('Khung WebGL chưa sẵn sàng. Hãy tải lại trang.', 'error'); return; }
  const url = isImportedPond(asset) && variant === 'lod1' ? asset.lod1Url : asset.url;
  if (!url) { setStatus('Chưa đăng ký đường dẫn LOD1 cho ao sen.', 'error'); return; }
  setStatus('Đang tải GLB: ' + asset.id + (isImportedPond(asset) ? (variant === 'lod1' ? ' · LOD1' : ' · Tiêu chuẩn') : ''));
  let next, nextPondAnimator;
  try {
    const gltf = await loadAsset(url); next = gltf.scene;
    if (attempt !== epoch || disposed) { release(next); return; }
    const stats = inspect(next);
    nextPondAnimator = createImportedPondAnimator(asset, gltf);
    model = next; pondAnimator = nextPondAnimator; wrapper.add(model); configureMotion(); applyPondControls();
    const center = stats.box.getCenter(new T.Vector3());
    wrapper.position.set(-center.x, -stats.box.min.y, -center.z);
    radius = Math.max(stats.size.length() * .5, .15);
    target.set(0, stats.size.y * .5, 0);
    floor.scale.setScalar(Math.max(stats.size.x, stats.size.z, .3) * .75);
    camera.near = Math.max(.005, radius / 1000); camera.far = radius * 100; camera.updateProjectionMatrix();
    setView(currentAngle, true);
    const decimal = value => value.toLocaleString('vi-VN', { maximumFractionDigits: 2 });
    stat('Kích thước đề xuất', [stats.size.x, stats.size.y, stats.size.z].map(decimal).join(' × ') + ' m');
    stat('Mesh / vật liệu', stats.meshes + ' / ' + stats.materials);
    stat('Tam giác', stats.triangles.toLocaleString('vi-VN'));
    stat('Texture đã tải', String(stats.textures));
    stat('Clip trong GLB', String(gltf.animations?.length || 0));
    if (isImportedPond(asset)) {
      stat('Phiên bản đang xem', variant === 'lod1' ? 'LOD1 · giảm chi tiết' : 'Tiêu chuẩn');
      stat('Tên clip thực tế', gltf.animations.map(clip => clip.name).join(', '));
      stat('Quy ước góc', 'Trước +Z · Phải −X · Trái +X · Sau −Z');
    }
    setStatus('Đã tải mô hình 3D. Kiểm tra bằng bốn góc và xoay tự do.', 'ready');
  } catch (error) {
    nextPondAnimator?.dispose(); if (pondAnimator === nextPondAnimator) pondAnimator = null;
    if (next) { if (model === next) model = null; release(next); }
    if (attempt !== epoch || disposed) return;
    configureMotion();
    setStatus('Lỗi tải mô hình: ' + error.message, 'error'); $('retryAsset').hidden = false;
  }
}
async function testAll() {
  if (testRunning) return;
  testRunning = true; $('testAllAssets').disabled = true; $('testResults').replaceChildren();
  let passed = 0, failed = 0, blocked = 0;
  for (let index = 0; index < catalog.length && !disposed; index++) {
    const asset = catalog[index], li = document.createElement('li');
    $('testProgress').textContent = `Đang kiểm tra ${index + 1} / ${catalog.length}: ${asset.id}`;
    let gltf, testAnimator;
    try {
      if (asset.status !== 'built' || !asset.url) { blocked++; li.textContent = asset.id + ' · Chưa dựng / thiếu nguồn'; }
      else {
        gltf = await loadAsset(asset.url); const stats = inspect(gltf.scene);
        testAnimator = createImportedPondAnimator(asset, gltf);
        if (testAnimator) {
          testAnimator.setWind('light'); testAnimator.setWater(true); testAnimator.update(.1);
          testAnimator.setWind('strong'); testAnimator.update(.1); testAnimator.setWind('none'); testAnimator.setWater(false);
        } else {
          globalThis.VietVillageAssetMotion?.update(gltf.scene, .5, .3);
          globalThis.VietVillageAssetMotion?.setHinges(gltf.scene, .5);
        }
        if (gltf.animations?.some(clip => !Number.isFinite(clip.duration))) throw new Error('Clip có thời lượng sai.');
        passed++; li.className = 'passed'; li.textContent = `${asset.id} · Đạt · ${stats.triangles.toLocaleString('vi-VN')} tam giác`;
      }
    } catch (error) { failed++; li.className = 'failed'; li.textContent = `${asset.id} · Lỗi: ${error.message}`; }
    finally { testAnimator?.dispose(); if (gltf) release(gltf.scene); }
    $('testResults').append(li);
  }
  $('testProgress').textContent = `Kết quả tải và cấu trúc: ${passed} đạt · ${failed} lỗi · ${blocked} chưa dựng. Chưa xác nhận chất lượng trực quan từng mô hình.`;
  testRunning = false; $('testAllAssets').disabled = false;
}
async function showOverview() {
  if (overviewRunning || !catalog.length) return;
  overviewRunning = true; $('showAssetOverview').disabled = true;
  $('assetOverview').hidden = false; $('overviewGrid').replaceChildren();
  $('assetOverview').scrollIntoView({ behavior: 'smooth', block: 'start' });
  let thumbnailRenderer, thumbnailFloor, count = 0, failed = 0, blocked = 0;
  try {
    // One small reusable WebGL context renders every asset sequentially. Each
    // loaded GLB is disposed immediately after capture; no model cache is held.
    thumbnailRenderer = new T.WebGLRenderer({ antialias: true, powerPreference: 'low-power', preserveDrawingBuffer: true });
    thumbnailRenderer.setSize(256, 192, false); thumbnailRenderer.setPixelRatio(1);
    thumbnailRenderer.outputColorSpace = T.SRGBColorSpace; thumbnailRenderer.toneMapping = T.ACESFilmicToneMapping; thumbnailRenderer.toneMappingExposure = 1.15;
    const thumbnailScene = new T.Scene(); thumbnailScene.background = new T.Color('#dce5d3');
    thumbnailScene.add(new T.HemisphereLight('#fff4dc', '#69795b', 2.5));
    const light = new T.DirectionalLight('#fff0d5', 3); light.position.set(7, 10, 5); thumbnailScene.add(light);
    thumbnailFloor = new T.Mesh(new T.CircleGeometry(1, 48), new T.MeshStandardMaterial({ color: '#c0cbb5', roughness: 1 }));
    thumbnailFloor.rotation.x = -Math.PI / 2; thumbnailFloor.position.y = -.015; thumbnailScene.add(thumbnailFloor);
    const thumbnailCamera = new T.PerspectiveCamera(35, 4 / 3, .01, 1000), holder = new T.Group(); thumbnailScene.add(holder);
    for (let index = 0; index < catalog.length && !disposed; index++) {
      const asset = catalog[index], card = document.createElement('article'), title = document.createElement('h3'), caption = document.createElement('p');
      card.className = 'overview-card'; title.textContent = asset.id + ' · ' + (asset.name || '');
      $('overviewProgress').textContent = `Đang dựng ảnh 3D ${index + 1} / ${catalog.length}: ${asset.id}`;
      let gltf;
      try {
        if (asset.status !== 'built' || !asset.url) {
          blocked++; const placeholder = document.createElement('div'); placeholder.className = 'overview-placeholder'; placeholder.textContent = 'Chưa dựng · thiếu ảnh tham chiếu đọc được'; card.append(placeholder);
          caption.textContent = 'Không dùng mô hình thay thế để báo hoàn thành.';
        } else {
          gltf = await loadAsset(asset.url); const stats = inspect(gltf.scene), center = stats.box.getCenter(new T.Vector3()), extent = Math.max(stats.size.length() * .5, .15);
          holder.add(gltf.scene); holder.position.set(-center.x, -stats.box.min.y, -center.z);
          thumbnailFloor.scale.setScalar(Math.max(stats.size.x, stats.size.z, .3) * .75);
          thumbnailCamera.near = Math.max(.001, extent / 1000); thumbnailCamera.far = extent * 100; thumbnailCamera.updateProjectionMatrix();
          const focus = new T.Vector3(0, stats.size.y * .45, 0);
          thumbnailCamera.position.copy(focus).add(new T.Vector3(1.5, 1.15, 2).normalize().multiplyScalar(extent * 3.4)); thumbnailCamera.lookAt(focus);
          thumbnailRenderer.render(thumbnailScene, thumbnailCamera);
          const img = document.createElement('img'), button = document.createElement('button');
          img.src = thumbnailRenderer.domElement.toDataURL('image/png'); img.width = 256; img.height = 192; img.alt = 'Mô hình 3D ' + (asset.name || asset.id);
          button.type = 'button'; button.setAttribute('aria-label', 'Kiểm tra ' + (asset.name || asset.id)); button.append(img);
          button.addEventListener('click', () => { $('assetSelect').value = asset.id; void selectAsset(asset.id); $('assetViewport').scrollIntoView({ behavior: 'smooth', block: 'center' }); });
          card.append(button); caption.textContent = `${stats.triangles.toLocaleString('vi-VN')} tam giác · ${stats.meshes} mesh`; count++;
        }
      } catch (error) {
        failed++; const placeholder = document.createElement('div'); placeholder.className = 'overview-placeholder'; placeholder.textContent = 'Lỗi dựng ảnh 3D'; card.append(placeholder); caption.textContent = error.message;
      } finally { if (gltf) release(gltf.scene); }
      card.append(title, caption); $('overviewGrid').append(card);
      // Permit input/paint between thumbnail captures without holding geometry.
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    $('overviewProgress').textContent = `${count} ảnh dựng từ GLB · ${failed} lỗi · ${blocked} chưa dựng. Bảng này hỗ trợ kiểm tra hình dáng; chưa thay thế kiểm tra đặt vật thể trong game.`;
  } catch (error) { $('overviewProgress').textContent = 'Không tạo được bảng 3D: ' + error.message; }
  finally {
    release(thumbnailFloor); thumbnailRenderer?.dispose(); thumbnailRenderer?.forceContextLoss();
    overviewRunning = false; $('showAssetOverview').disabled = false;
  }
}
function initializeRenderer() {
  if (!T?.WebGLRenderer) throw new Error('Chưa tải thư viện Three.js nội bộ.');
  renderer = new T.WebGLRenderer({ antialias: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5)); renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
  scene = new T.Scene(); scene.background = new T.Color('#dce5d3');
  camera = new T.PerspectiveCamera(40, 1, .01, 1000); target = new T.Vector3(0, 1, 0);
  hemisphere = new T.HemisphereLight('#fff4dc', '#69795b', 2.5); scene.add(hemisphere);
  sunlight = new T.DirectionalLight('#fff0d5', 3); sunlight.position.set(7, 10, 5); scene.add(sunlight);
  floor = new T.Mesh(new T.CircleGeometry(1, 64), new T.MeshStandardMaterial({ color: '#c0cbb5', roughness: 1 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -.015; scene.add(floor);
  wrapper = new T.Group(); scene.add(wrapper);
  const canvas = renderer.domElement;
  canvas.tabIndex = 0; canvas.setAttribute('role', 'img'); canvas.setAttribute('aria-label', 'Mô hình 3D có thể kéo để xoay, cuộn để phóng, phím mũi tên và cộng trừ để điều khiển.');
  $('assetViewport').append(canvas); $('viewportFallback').hidden = true;
  const pinch = () => { if (pointers.size < 2) return null; const [a, b] = [...pointers.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };
  canvas.addEventListener('pointerdown', event => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    event.preventDefault(); canvas.focus({ preventScroll: true }); pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    canvas.setPointerCapture(event.pointerId); pinchDistance = pinch();
  });
  canvas.addEventListener('pointermove', event => {
    const before = pointers.get(event.pointerId); if (!before) return;
    event.preventDefault(); pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size >= 2) { const next = pinch(); if (pinchDistance > 0 && next > 0) zoom(pinchDistance / next); pinchDistance = next; }
    else { theta -= (event.clientX - before.x) * .008; phi = T.MathUtils.clamp(phi - (event.clientY - before.y) * .005, .12, Math.PI * .49); updateCamera(); }
  });
  const releasePointer = event => { pointers.delete(event.pointerId); pinchDistance = pinch(); };
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(name => canvas.addEventListener(name, releasePointer));
  canvas.addEventListener('wheel', event => { event.preventDefault(); zoom(Math.exp(event.deltaY * .001)); }, { passive: false });
  canvas.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '=', '-', '0'].includes(event.key)) return;
    event.preventDefault();
    if (event.key === 'ArrowLeft') theta -= .12;
    if (event.key === 'ArrowRight') theta += .12;
    if (event.key === 'ArrowUp') phi = Math.max(.12, phi - .08);
    if (event.key === 'ArrowDown') phi = Math.min(Math.PI * .49, phi + .08);
    if (['+', '='].includes(event.key)) zoom(.9);
    if (event.key === '-') zoom(1.1);
    if (event.key === '0') setView('FRONT', true);
    updateCamera();
  });
  canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); lostContext = true; setStatus('WebGL bị gián đoạn. Đang chờ khôi phục.', 'error'); });
  canvas.addEventListener('webglcontextrestored', () => { lostContext = false; if (selected) void selectAsset(selected.id); });
  const observer = new ResizeObserver(resize); observer.observe($('assetViewport'));
  window.addEventListener('pagehide', event => {
    running = false; cancelAnimationFrame(frame); frame = 0;
    if (event.persisted) return;
    disposed = true; epoch++; observer.disconnect(); pondAnimator?.dispose(); pondAnimator = null; release(model); release(floor); renderer.dispose();
  });
  window.addEventListener('pageshow', event => {
    if (event.persisted && !disposed) { running = true; resize(); if (!frame && !document.hidden) frame = requestAnimationFrame(tick); }
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(frame); frame = 0; pointers.clear(); pinchDistance = null; }
    else if (running && !disposed && !frame) { lastFrame = 0; frame = requestAnimationFrame(tick); }
  });
  resize(); updateCamera();
  function tick(time) {
    if (!running) return;
    frame = requestAnimationFrame(tick);
    if (document.hidden || lostContext || time - lastFrame < 1000 / 30) return;
    const dt = lastFrame ? Math.min((time - lastFrame) / 1000, .1) : 0;
    lastFrame = time;
    if (pondAnimator) pondAnimator.update(dt);
    else if (model) globalThis.VietVillageAssetMotion?.update(model, time / 1000, $('assetWind').disabled ? 0 : Number($('assetWind').value));
    renderer.render(scene, camera);
  }
  frame = requestAnimationFrame(tick);
}
async function initializeCatalog() {
  setStatus('Đang tải danh mục…'); $('retryAsset').hidden = true;
  try {
    const response = await fetch(catalogURL, { cache: 'no-store' });
    if (!response.ok) throw new Error('HTTP ' + response.status + ' khi tải assets-3d.json');
    const data = await response.json();
    if (!Array.isArray(data.assets) || !data.assets.length) throw new Error('Danh mục chưa có tài nguyên.');
    catalog = data.assets;
    const requestedId = new URLSearchParams(location.search).get('asset');
    if (requestedId) {
      const requested = catalog.find(asset => asset.id === requestedId);
      if (!requested) throw new Error('Không có mã tài nguyên được yêu cầu: ' + requestedId);
      catalog = [requested];
    }
    $('assetSelect').replaceChildren();
    for (const asset of catalog) {
      const option = document.createElement('option'); option.value = asset.id;
      option.textContent = (asset.name || asset.id) + (asset.status === 'built' ? '' : ' · Chưa dựng'); $('assetSelect').append(option);
    }
    $('assetSelect').disabled = false; $('testAllAssets').disabled = false; $('showAssetOverview').disabled = false;
    const built = catalog.filter(asset => asset.status === 'built').length;
    $('catalogSummary').textContent = `${catalog.length} tài nguyên · ${built} GLB · ${catalog.length - built} chờ nguồn`;
    const first = catalog.find(asset => asset.status === 'built') || catalog[0];
    $('assetSelect').value = first.id; await selectAsset(first.id);
  } catch (error) { setStatus('Không đọc được danh mục: ' + error.message, 'error'); $('retryAsset').hidden = false; }
}
$('assetSelect').addEventListener('change', event => void selectAsset(event.target.value));
$('retryAsset').addEventListener('click', () => void (selected ? selectAsset(selected.id) : initializeCatalog()));
document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => setView(button.dataset.view, true)));
$('resetAssetView').addEventListener('click', () => setView(currentAngle, true));
$('testAllAssets').addEventListener('click', () => void testAll());
$('showAssetOverview').addEventListener('click', () => void showOverview());
$('closeAssetOverview').addEventListener('click', () => { $('assetOverview').hidden = true; $('showAssetOverview').focus(); });
$('assetWind').addEventListener('input', event => { $('windValue').textContent = Math.round(Number(event.target.value) * 100) + '%'; });
$('calmAsset').addEventListener('click', () => { $('assetWind').value = '0'; $('windValue').textContent = '0%'; });
$('assetHinge').addEventListener('input', event => { if (!model) return; const value = Number(event.target.value); globalThis.VietVillageAssetMotion?.setHinges(model, value); $('hingeValue').textContent = value === 0 ? 'Đóng' : Math.round(value * 100) + '%'; });
$('pondVariant').addEventListener('change', event => { if (!isImportedPond()) return; selectedVariant = event.target.value === 'lod1' ? 'lod1' : 'main'; void selectAsset(selected.id); });
$('pondWind').addEventListener('change', applyPondControls);
$('pondWater').addEventListener('change', applyPondControls);
$('assetLighting').addEventListener('change', event => {
  if (!scene) return; const night = event.target.value === 'night';
  scene.background.set(night ? '#192d3b' : '#dce5d3'); hemisphere.intensity = night ? .5 : 2.5; sunlight.intensity = night ? .55 : 3;
  sunlight.color.set(night ? '#b5cfee' : '#fff0d5');
});
if (location.protocol === 'file:') {
  setStatus('Hãy chạy START-SERVER.bat hoặc START-GAME.bat, rồi mở trang này qua localhost. Không mở bằng file://.', 'error');
  $('viewportFallback').textContent = 'Cần máy chủ HTTP local để tải GLB.';
} else {
  try { initializeRenderer(); void initializeCatalog(); }
  catch (error) { setStatus('Không mở được bộ xem: ' + error.message, 'error'); $('viewportFallback').textContent = error.message; }
}
