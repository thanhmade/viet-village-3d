// A separate, short-lived viewer: it never changes the live player's controller
// or saved character. The caller owns when the creation/profile dialog is open.
export function createCharacterPreview({
 container,
 THREE: T = globalThis.THREE,
 load = globalThis.loadVillageNPCGLTF,
 createVisual = globalThis.createVillagePlayerGLTFVisual,
} = {}) {
 if (!container || !T?.WebGLRenderer || typeof load !== 'function' || typeof createVisual !== 'function') {
  throw new Error('Chưa tải đủ bộ xem mô hình 3D. Hãy thử lại.');
 }
 const doc = container.ownerDocument || document;
 const win = doc.defaultView || window;
 // Transparent canvas: the Làng Việt backdrop of the screen shows behind the model.
 const renderer = new T.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
 renderer.setClearColor?.(0x000000, 0);
 const canvas = renderer.domElement;
 renderer.setPixelRatio(Math.min(win.devicePixelRatio || 1, 1.5));
 renderer.outputColorSpace = T.SRGBColorSpace;
 renderer.toneMapping = T.ACESFilmicToneMapping;
 renderer.toneMappingExposure = 1.12;
 canvas.className = 'character-preview-canvas';
 canvas.tabIndex = 0;
 canvas.setAttribute('role', 'img');
 canvas.setAttribute('aria-label', 'Xem trước nhân vật 3D. Kéo để xoay, cuộn hoặc chụm hai ngón để phóng to. Phím mũi tên để xoay, cộng và trừ để phóng to hoặc thu nhỏ.');
 container.append(canvas);

 const scene = new T.Scene();
 scene.background = null;
 const camera = new T.PerspectiveCamera(40, 1, .05, 40);
 const target = new T.Vector3(0, 1.16, 0);
 scene.add(new T.HemisphereLight('#fffdf2', '#597a6d', 2.7));
 const keyLight = new T.DirectionalLight('#fff0d2', 3.0);
 keyLight.position.set(3.5, 5, 4); scene.add(keyLight);
 const fillLight = new T.DirectionalLight('#cdeaf1', 1.8);
 fillLight.position.set(-3, 2.2, -3); scene.add(fillLight);
 const floor = new T.Mesh(new T.CircleGeometry(1.35, 64), new T.MeshStandardMaterial({ color: '#c9b98f', roughness: 1, transparent: true, opacity: .82 }));
 floor.rotation.x = -Math.PI / 2; floor.position.y = -.018; scene.add(floor);
 const ring = new T.Mesh(new T.RingGeometry(1.36, 1.39, 64), new T.MeshBasicMaterial({ color: '#91ac92', side: T.DoubleSide }));
 ring.rotation.x = -Math.PI / 2; ring.position.y = -.012; scene.add(ring);

 const bindings = [], pointers = new Map();
 let visual = null, epoch = 0, disposed = false, contextLost = false;
 let active = false, raf = 0, lastFrame = 0, width = 0, height = 0;
 let theta = 0, phi = 1.43, distance = 4.65, modelHeight = 2.35, pinchDistance = null;
 function listen(node, type, handler, options) {
  node.addEventListener(type, handler, options);
  bindings.push(() => node.removeEventListener(type, handler, options));
 }
 function updateCamera() {
  camera.position.set(
   target.x + distance * Math.sin(phi) * Math.sin(theta),
   target.y + distance * Math.cos(phi),
   target.z + distance * Math.sin(phi) * Math.cos(theta),
  );
  camera.lookAt(target);
 }
 function visible() { return active && !disposed && !contextLost && !doc.hidden && width > 0 && height > 0; }
 function draw() { if (visible()) renderer.render(scene, camera); }
 function resize() {
  if (disposed) return;
  const bounds = container.getBoundingClientRect();
  const nextWidth = Math.floor(bounds.width), nextHeight = Math.floor(bounds.height);
  if (nextWidth <= 0 || nextHeight <= 0) { width = 0; height = 0; return; }
  if (nextWidth !== width || nextHeight !== height) {
   width = nextWidth; height = nextHeight;
   renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix();
  }
  draw();
 }
 function cancelFrame() { if (raf) win.cancelAnimationFrame(raf); raf = 0; lastFrame = 0; }
 function frame(time) {
  raf = 0;
  if (!active || disposed || contextLost || doc.hidden) return;
  if (width > 0 && height > 0 && (!lastFrame || time - lastFrame >= 1000 / 30)) {
   const dt = lastFrame ? Math.min((time - lastFrame) / 1000, .1) : 0;
   lastFrame = time; visual?.update(dt); draw();
  }
  raf = win.requestAnimationFrame(frame);
 }
 function start() {
  if (disposed || contextLost) return;
  active = true; resize();
  if (!doc.hidden && !raf) raf = win.requestAnimationFrame(frame);
 }
 function stop() { active = false; cancelFrame(); pointers.clear(); pinchDistance = null; }
 function resetView() { theta = 0; phi = 1.43; distance = 4.65 * modelHeight / 2.35; target.y = modelHeight * (1.16 / 2.35); updateCamera(); draw(); }
 function clearModel() { if (visual) { visual.dispose(); visual = null; } draw(); }
 function cancelError() { const error = new Error('Yêu cầu xem mẫu đã được thay thế.'); error.name = 'AbortError'; return error; }
 async function showModel(modelURL, visualOptions = {}) {
  if (disposed) throw cancelError();
  if (contextLost) throw new Error('Bộ xem 3D bị gián đoạn. Hãy đóng và mở lại màn hình nhân vật.');
  const attempt = ++epoch;
  modelHeight = Number.isFinite(visualOptions.height) && visualOptions.height > 0 ? visualOptions.height : 2.35;
  clearModel(); resetView();
  const gltf = await load(modelURL);
  if (disposed || contextLost || attempt !== epoch) {
   globalThis.disposeVillageNPCGLTF?.(gltf);
   throw cancelError();
  }
  // The shared helper owns/disposes this GLB after construction, including its
  // embedded textures, skeleton and actions. Each request gets its own instance.
  const next = createVisual({ ...visualOptions, THREE: T, gltf, height: modelHeight });
  if (disposed || attempt !== epoch) { next.dispose(); throw cancelError(); }
  visual = next; scene.add(visual.root); visual.returnToIdle(); visual.update(0); draw();
  return { stats: visual.stats, clips: visual.clips };
 }

 // Head-and-shoulders snapshot of the shown model for the in-game portrait.
 // Rendered once from a temporary close camera; the view is restored at once.
 function capturePortrait(size = 160) {
  if (!visual || disposed || contextLost || width <= 0 || height <= 0) return null;
  const saved = camera.position.clone(), head = new T.Vector3(0, modelHeight * .86, 0);
  camera.position.set(Math.sin(.35) * modelHeight * .5, modelHeight * .9, Math.cos(.35) * modelHeight * .5); camera.lookAt(head);
  renderer.render(scene, camera);
  let url = null;
  try {
   const out = doc.createElement('canvas'); out.width = out.height = size;
   const cw = canvas.width, ch = canvas.height, side = Math.min(cw, ch);
   out.getContext('2d').drawImage(canvas, (cw - side) / 2, (ch - side) / 2, side, side, 0, 0, size, size);
   url = out.toDataURL('image/png');
  } catch { url = null; }
  camera.position.copy(saved); updateCamera(); draw();
  return url;
 }
 function zoom(factor) { const scale = modelHeight / 2.35; distance = Math.max(2.8 * scale, Math.min(7.8 * scale, distance * factor)); updateCamera(); draw(); }
 function measurePinch() {
  if (pointers.size < 2) return null;
  const [a, b] = [...pointers.values()]; return Math.hypot(a.x - b.x, a.y - b.y);
 }
 listen(canvas, 'pointerdown', event => {
  if (event.pointerType === 'mouse' && event.button !== 0) return;
  event.preventDefault(); event.stopPropagation(); canvas.focus({ preventScroll: true });
  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  try { canvas.setPointerCapture(event.pointerId); } catch { /* Detached during closing. */ }
  pinchDistance = measurePinch();
 });
 listen(canvas, 'pointermove', event => {
  const before = pointers.get(event.pointerId); if (!before) return;
  event.preventDefault(); event.stopPropagation();
  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  if (pointers.size >= 2) {
   const nextDistance = measurePinch();
   if (pinchDistance > 0 && nextDistance > 0) zoom(pinchDistance / nextDistance);
   pinchDistance = nextDistance;
  } else {
   theta -= (event.clientX - before.x) * .008;
   phi = Math.max(.75, Math.min(1.8, phi - (event.clientY - before.y) * .005));
   updateCamera(); draw();
  }
 });
 function release(event) {
  if (!pointers.has(event.pointerId)) return;
  event.stopPropagation(); pointers.delete(event.pointerId); pinchDistance = measurePinch();
  try { canvas.releasePointerCapture(event.pointerId); } catch { /* Capture was already released. */ }
 }
 listen(canvas, 'pointerup', release); listen(canvas, 'pointercancel', release); listen(canvas, 'lostpointercapture', release);
 listen(canvas, 'wheel', event => {
  event.preventDefault(); event.stopPropagation();
  const units = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 300 : 1;
  zoom(Math.exp(Math.max(-.25, Math.min(.25, event.deltaY * units * .001))));
 }, { passive: false });
 listen(canvas, 'keydown', event => {
  if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '=', '-', 'Home'].includes(event.key)) return;
  event.preventDefault(); event.stopPropagation();
  if (event.key === 'Home') { resetView(); return; }
  if (event.key === '+' || event.key === '=') { zoom(.9); return; }
  if (event.key === '-') { zoom(1.1); return; }
  if (event.key === 'ArrowLeft') theta -= .12;
  if (event.key === 'ArrowRight') theta += .12;
  if (event.key === 'ArrowUp') phi = Math.max(.75, phi - .08);
  if (event.key === 'ArrowDown') phi = Math.min(1.8, phi + .08);
  updateCamera(); draw();
 });
 listen(canvas, 'contextmenu', event => event.preventDefault());
 listen(canvas, 'webglcontextlost', event => {
  event.preventDefault(); contextLost = true; ++epoch; cancelFrame();
  container.dispatchEvent(new win.CustomEvent('character-preview-error', { detail: 'Bộ xem 3D bị gián đoạn. Hãy đóng và mở lại màn hình nhân vật.' }));
 });
 listen(doc, 'visibilitychange', () => { cancelFrame(); if (active && !doc.hidden) start(); });
 const observer = typeof win.ResizeObserver === 'function' ? new win.ResizeObserver(resize) : null;
 if (observer) observer.observe(container); else listen(win, 'resize', resize);
 updateCamera(); resize();
 return Object.freeze({
  showModel, resetView, start, stop, capturePortrait,
  dispose() {
   if (disposed) return;
   disposed = true; ++epoch; stop(); observer?.disconnect(); bindings.forEach(remove => remove()); clearModel();
   floor.geometry.dispose(); floor.material.dispose(); ring.geometry.dispose(); ring.material.dispose();
   renderer.dispose(); renderer.forceContextLoss?.(); canvas.remove();
  },
 });
}
