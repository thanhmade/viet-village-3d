/* Shared by the page and its DOM-free input regression checks. */
function createWeaponDemoInput({ canvas, windowTarget, documentTarget, onCastSlot, onPause, onCycle, onOrbit, onZoom }) {
  const keys = new Set(), pointers = new Map(), bindings = [];
  let disposed = false;
  const interactive = target => !!target?.closest?.('button,a[href],summary,input,select,textarea,[contenteditable="true"],[role="button"]');
  const bind = (target, type, callback, options) => {
    target.addEventListener(type, callback, options);
    bindings.push(() => target.removeEventListener(type, callback, options));
  };
  function release(id) {
    pointers.delete(id);
    if (canvas.hasPointerCapture?.(id)) canvas.releasePointerCapture(id);
  }
  function clear() {
    keys.clear();
    for (const id of [...pointers.keys()]) release(id);
  }
  bind(windowTarget, 'keydown', event => {
    if (event.defaultPrevented || event.isComposing || event.ctrlKey || event.altKey || event.metaKey || interactive(event.target)) return;
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) event.preventDefault();
    if (!event.repeat && /^Digit[123]$/.test(event.code)) onCastSlot(Number(event.code.slice(-1)) - 1);
    if (!event.repeat && event.code === 'Space') onPause();
    if (!event.repeat && ['KeyQ', 'KeyE'].includes(event.code)) onCycle(event.code === 'KeyE' ? 1 : -1);
    if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) keys.add(event.code);
  });
  // Always release a held movement key, including after focus moves into a menu.
  bind(windowTarget, 'keyup', event => keys.delete(event.code));
  bind(windowTarget, 'blur', clear);
  bind(documentTarget, 'visibilitychange', () => { if (documentTarget.hidden) clear(); });
  bind(documentTarget, 'focusin', event => { if (interactive(event.target)) keys.clear(); });
  bind(canvas, 'pointerdown', event => {
    if ((event.pointerType === 'mouse' && event.button !== 0) || pointers.size >= 2) return;
    event.preventDefault();
    canvas.focus?.({ preventScroll: true });
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    canvas.setPointerCapture(event.pointerId);
  });
  bind(canvas, 'pointermove', event => {
    const before = pointers.get(event.pointerId);
    if (!before) return;
    const after = { x: event.clientX, y: event.clientY };
    if (pointers.size === 1) onOrbit(after.x - before.x, after.y - before.y);
    else {
      const other = [...pointers].find(([id]) => id !== event.pointerId)[1];
      const previousGap = Math.hypot(before.x - other.x, before.y - other.y);
      const nextGap = Math.hypot(after.x - other.x, after.y - other.y);
      if (previousGap > 2 && nextGap > 2) onZoom(previousGap / nextGap);
    }
    pointers.set(event.pointerId, after);
  });
  bind(canvas, 'pointerup', event => release(event.pointerId));
  bind(canvas, 'pointercancel', event => release(event.pointerId));
  bind(canvas, 'lostpointercapture', event => pointers.delete(event.pointerId));
  bind(canvas, 'wheel', event => {
    event.preventDefault();
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? (canvas.clientHeight || 800) : 1;
    onZoom(Math.exp(Math.max(-1, Math.min(1, event.deltaY * unit * .001))));
  }, { passive: false });
  return { keys, clear, dispose() {
    if (disposed) return;
    disposed = true;
    bindings.splice(0).forEach(remove => remove());
    clear();
  } };
}

function createWeaponDemoFrameLoop({ requestFrame, cancelFrame, documentTarget, renderFrame }) {
  let frameId = null, last = null, running = false, disposed = false;
  function schedule() {
    if (running && !disposed && !documentTarget.hidden && frameId === null) frameId = requestFrame(tick);
  }
  function tick(now) {
    frameId = null;
    if (!running || disposed || documentTarget.hidden) { last = null; return; }
    const delta = last === null ? 0 : Math.max(0, Math.min((now - last) / 1000, .08));
    last = now;
    renderFrame(now, delta);
    schedule();
  }
  function visibilityChanged() {
    last = null;
    if (documentTarget.hidden) {
      if (frameId !== null) cancelFrame(frameId);
      frameId = null;
    } else schedule();
  }
  documentTarget.addEventListener('visibilitychange', visibilityChanged);
  return {
    start() { if (!disposed) { running = true; schedule(); } },
    dispose() {
      if (disposed) return;
      disposed = true; running = false;
      documentTarget.removeEventListener('visibilitychange', visibilityChanged);
      if (frameId !== null) cancelFrame(frameId);
      frameId = null; last = null;
    }
  };
}

function createWeaponDemoCleanup({ scene, renderer, vfx, bindings, skillBindings, input, stopFrames }) {
  let disposed = false;
  return () => {
    if (disposed) return;
    disposed = true;
    stopFrames();
    input.dispose();
    [...bindings.splice(0), ...skillBindings.splice(0)].forEach(remove => remove());
    vfx.dispose();
    const geometries = new Set(), materials = new Set(), textures = new Set(), instances = new Set(), shadows = new Set();
    scene.traverse(object => {
      if (object.geometry) geometries.add(object.geometry);
      if (object.isInstancedMesh) instances.add(object);
      if (object.shadow) shadows.add(object.shadow);
      for (const material of object.material ? (Array.isArray(object.material) ? object.material : [object.material]) : []) {
        materials.add(material);
        for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
      }
    });
    for (const resource of [...instances, ...shadows, ...geometries, ...textures, ...materials]) resource.dispose();
    renderer.dispose();
    renderer.domElement.remove();
  };
}

(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const T = window.THREE;
  function fail(message) { $('error').hidden = false; $('error').textContent = message; }
  if (!T || !window.WeaponVFXCore) { fail('Chưa tải đủ mã 3D. Hãy giải nén toàn bộ gói, giữ nguyên ASSETS và SOURCE-CODE cùng cấp.'); return; }
  const Core = window.WeaponVFXCore;
  const configs = Core.getWeaponConfigs();
  if (configs.length !== 5) { fail('Chưa tải đủ năm vũ khí. Kiểm tra các file js/vfx trong gói.'); return; }
  const bindings = [], skillBindings = [];
  function listen(target, name, callback, options, owner = bindings) {
    target.addEventListener(name, callback, options);
    owner.push(() => target.removeEventListener(name, callback, options));
  }
  let renderer;
  try { renderer = new T.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' }); }
  catch (e) { fail('Không khởi tạo được WebGL. Bật tăng tốc phần cứng trong Chrome/Edge. Chi tiết: ' + e.message); return; }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.setSize(innerWidth, innerHeight);
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  $('stage').appendChild(renderer.domElement);
  const scene = new T.Scene();
  scene.background = new T.Color(0x162522);
  scene.fog = new T.FogExp2(0x182a25, 0.035);
  const camera = new T.PerspectiveCamera(44, innerWidth / innerHeight, 0.1, 120);
  scene.add(new T.HemisphereLight(0xb4d9c7, 0x343127, 1.4));
  const sun = new T.DirectionalLight(0xf7ddb1, 2.0);
  sun.position.set(-7, 12, 7); sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 0.5, far: 50 });
  sun.shadow.bias = -0.0005; scene.add(sun);
  const mat = (color, options = {}) => new T.MeshStandardMaterial({ color, roughness: 0.86, ...options });
  const stone = mat(0x605d4f), wood = mat(0x332c24), roof = mat(0x273b34), gold = mat(0xa38a50, { metalness: 0.45, roughness: 0.4 });
  const mesh = (g, m, parent = scene) => { const o = new T.Mesh(g, m); o.castShadow = true; o.receiveShadow = true; parent.add(o); return o; };
  const box = (w, h, d, m, x, y, z, parent = scene) => { const o = mesh(new T.BoxGeometry(w, h, d), m, parent); o.position.set(x, y, z); return o; };
  const floor = mesh(new T.PlaneGeometry(90, 90), mat(0x414c3f)); floor.rotation.x = -Math.PI / 2; floor.castShadow = false;
  const tiles = new T.InstancedMesh(new T.BoxGeometry(1.45, 0.1, 1.45), stone, 25 * 25);
  tiles.receiveShadow = true; tiles.castShadow = false; const dummy = new T.Object3D();
  let seed = 836, count = 0;
  function random() { seed = (Math.imul(seed, 1664525) + 1013904223) | 0; return (seed >>> 0) / 4294967296; }
  for (let x = -12; x <= 12; x++) for (let z = -12; z <= 12; z++) {
    dummy.position.set(x * 1.5, -0.056, z * 1.5); dummy.rotation.y = (random() - 0.5) * 0.014; dummy.updateMatrix();
    tiles.setMatrixAt(count, dummy.matrix);
    tiles.setColorAt(count++, new T.Color(0x605d4f).multiplyScalar(0.78 + random() * 0.38));
  }
  scene.add(tiles);
  // Sân đình giản lược làm nền xem hiệu ứng; không có tài nguyên tải mạng.
  const temple = new T.Group(); temple.position.z = -13; scene.add(temple);
  box(13, 0.5, 5.6, stone, 0, 0.2, 0, temple);
  box(11.4, 3.4, 0.25, wood, 0, 2.1, -1.7, temple);
  for (const x of [-5, -2.5, 0, 2.5, 5]) {
    const post = mesh(new T.CylinderGeometry(0.17, 0.2, 3.6, 10), wood, temple); post.position.set(x, 2.25, 1.6);
    box(0.5, 0.16, 0.5, stone, x, 0.5, 1.6, temple);
  }
  const leftRoof = box(7.1, 0.22, 6.5, roof, -3.15, 4.3, 0, temple); leftRoof.rotation.z = 0.16;
  const rightRoof = box(7.1, 0.22, 6.5, roof, 3.15, 4.3, 0, temple); rightRoof.rotation.z = -0.16;
  box(0.3, 0.28, 6.7, gold, 0, 4.86, 0, temple);
  for (const x of [-6.5, 6.5]) { const eave = box(1, 0.15, 6.7, roof, x, 3.94, 0, temple); eave.rotation.z = x > 0 ? 0.18 : -0.18; }
  for (const x of [-1.7, 1.7]) box(2.1, 2.4, 0.2, mat(0x694931), x, 1.85, -1.48, temple);
  box(3.5, 0.2, 1.2, stone, 0, 0.05, 3.1, temple);
  const foliage = mat(0x263d2f), trunks = mat(0x34372a);
  for (let i = 0; i < 21; i++) {
    const a = i / 21 * Math.PI * 2, r = 22 + random() * 6, h = 3.5 + random() * 4;
    const x = Math.sin(a) * r, z = Math.cos(a) * r;
    const trunk = mesh(new T.CylinderGeometry(0.17, 0.3, h, 6), trunks); trunk.position.set(x, h / 2, z);
    const crown = mesh(new T.IcosahedronGeometry(2.8, 1), foliage); crown.position.set(x, h + 1, z); crown.scale.set(1, 1.3, 1);
  }
  const lanterns = [];
  for (const x of [-7.6, 7.6]) {
    box(0.6, 0.4, 0.6, stone, x, 0.2, -7.2);
    const post = mesh(new T.CylinderGeometry(0.08, 0.11, 2.2, 8), wood); post.position.set(x, 1.4, -7.2);
    const lamp = mesh(new T.SphereGeometry(0.25, 12, 8), mat(0xffbd5e, { emissive: 0xffad36, emissiveIntensity: 1.4 })); lamp.position.set(x, 2.55, -7.2);
    const light = new T.PointLight(0xffba69, 6, 7, 2); light.position.copy(lamp.position); scene.add(light); lanterns.push(light);
  }
  const actor = new T.Group(); actor.userData.weaponId = 'staff'; scene.add(actor);
  const rig = new T.Group(); actor.add(rig);
  const robe = mat(0x264c47), cloth = mat(0x344e43), skin = mat(0xb79874), hair = mat(0x161e1c), boots = mat(0x202a25);
  const torso = mesh(new T.CylinderGeometry(0.31, 0.38, 0.8, 12), robe, rig); torso.position.y = 1.23;
  const skirt = mesh(new T.CylinderGeometry(0.33, 0.5, 0.57, 12), cloth, rig); skirt.position.y = 0.77;
  const sash = mesh(new T.CylinderGeometry(0.345, 0.365, 0.12, 12), gold, rig); sash.position.y = 1.03;
  const neck = mesh(new T.CylinderGeometry(0.105, 0.12, 0.2, 8), skin, rig); neck.position.y = 1.72;
  const head = mesh(new T.SphereGeometry(0.23, 18, 14), skin, rig); head.position.y = 1.95; head.scale.set(0.85, 1.08, 0.9);
  const hairCap = mesh(new T.SphereGeometry(0.232, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.6), hair, rig); hairCap.position.y = 1.97; hairCap.scale.set(0.86, 1.06, 0.93);
  const bun = mesh(new T.SphereGeometry(0.1, 10, 8), hair, rig); bun.position.set(0, 2.22, 0.05);
  box(0.35, 0.035, 0.08, gold, 0, 2.2, 0.05, rig);
  for (const side of [-1, 1]) {
    const leg = mesh(new T.CylinderGeometry(0.105, 0.09, 0.58, 8), cloth, rig); leg.position.set(side * 0.2, 0.4, 0);
    box(0.2, 0.18, 0.36, boots, side * 0.2, 0.09, -0.09, rig);
    const eye = mesh(new T.SphereGeometry(0.018, 6, 4), hair, rig); eye.position.set(side * 0.075, 1.97, -0.186);
  }
  const steel = mat(0xb8c1bb, { roughness: 0.28, metalness: 0.82 });
  const bladeEdge = mat(0xe1e6db, { roughness: 0.22, metalness: 0.7 });
  const shaftWood = mat(0x563b28), grip = mat(0x292a21), tassel = mat(0x7e2524);
  const weaponRig = new T.Group(); rig.add(weaponRig);
  const models = new Map();
  function cylinder(parent, radius, height, material, y, rotation = 0) {
    const o = mesh(new T.CylinderGeometry(radius, radius, height, 12), material, parent);
    o.position.y = y || 0; o.rotation.z = rotation; return o;
  }
  function shapeMesh(parent, points, material, depth = 0.05) {
    const shape = new T.Shape();
    points.forEach((p, i) => i ? shape.lineTo(p[0], p[1]) : shape.moveTo(p[0], p[1]));
    shape.closePath();
    const geometry = new T.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: 0.007, bevelSize: 0.008, bevelSegments: 1, steps: 1 });
    const o = mesh(geometry, material, parent); o.position.z = -depth / 2; return o;
  }
  function tube(parent, points, radius, material) {
    return mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p => new T.Vector3(...p))), 28, radius, 6, false), material, parent);
  }
  function ring(parent, y, radius = 0.055, material = gold) {
    const o = mesh(new T.TorusGeometry(radius, 0.013, 5, 16), material, parent);
    o.rotation.x = Math.PI / 2; o.position.y = y; return o;
  }
  function newModel(id) {
    const group = new T.Group(); group.name = 'weapon-' + id; weaponRig.add(group);
    const tip = new T.Object3D(); tip.name = id + '-tip'; group.add(tip);
    const info = { group, tip }; models.set(id, info); return info;
  }
  // The reference images are concept sheets. These meshes reproduce their main
  // silhouettes without pretending to include the final engraved game assets.
  {
    const m = newModel('staff');
    const shaft = cylinder(m.group, 0.055, 2.8, shaftWood, 0, Math.PI / 2);
    for (const x of [-1.3, -1.16, -0.3, 0.3, 1.16, 1.3]) {
      const cap = cylinder(m.group, Math.abs(x) > 1 ? 0.072 : 0.063, 0.12, gold, 0, Math.PI / 2); cap.position.x = x;
      const rim = ring(m.group, 0, Math.abs(x) > 1 ? 0.074 : 0.064); rim.rotation.set(0, Math.PI / 2, 0); rim.position.x = x;
    }
    const handle = cylinder(m.group, 0.063, 0.5, grip, 0, Math.PI / 2);
    for (let i = 0; i < 12; i++) {
      const r = ring(m.group, 0, 0.064, grip); r.rotation.set(0, Math.PI / 2, 0); r.position.x = -0.22 + i * 0.04;
    }
    for (const side of [-1, 1]) {
      tube(m.group, [[side * .42, .053, .025], [side * .65, .015, .054], [side * .83, -.043, .03], [side * 1.05, .035, .04]], .008, gold);
    }
    m.tip.position.x = 1.4;
  }
  {
    const m = newModel('sword');
    cylinder(m.group, .056, .37, grip, -.12);
    for (let i = 0; i < 8; i++) ring(m.group, -.28 + i * .045, .056, grip);
    cylinder(m.group, .072, .07, gold, -.32);
    const pommel = mesh(new T.SphereGeometry(.095, 12, 8), gold, m.group); pommel.position.y = -.39; pommel.scale.z = .52;
    shapeMesh(m.group, [[-.31,.03],[-.3,.13],[-.15,.17],[0,.23],[.15,.17],[.3,.13],[.31,.03],[.13,.055],[0,-.01],[-.13,.055]], gold, .085);
    shapeMesh(m.group, [[-.095,.16],[-.09,1.35],[0,1.62],[.09,1.35],[.095,.16]], steel, .045);
    shapeMesh(m.group, [[-.012,.18],[-.01,1.32],[0,1.61],[.012,1.32],[.012,.18]], bladeEdge, .066);
    const emblem = mesh(new T.TorusGeometry(.055,.012,5,12), gold, m.group); emblem.position.set(0,.1,-.055);
    m.tip.position.y = 1.62;
  }
  {
    const m = newModel('spear');
    cylinder(m.group, .04, 2.75, shaftWood, .1);
    cylinder(m.group, .047, .56, grip, -.65);
    for (const y of [-1.22,-.92,-.4,.38,1.24,1.43]) { cylinder(m.group,.055,.1,gold,y); ring(m.group,y,.057); }
    shapeMesh(m.group, [[0,2.04],[-.14,1.58],[-.09,1.41],[0,1.47],[.09,1.41],[.14,1.58]], steel,.065);
    shapeMesh(m.group, [[0,2.04],[-.018,1.52],[0,1.46],[.018,1.52]], bladeEdge,.075);
    const threads = new T.Group(); threads.position.y = 1.35; m.group.add(threads);
    for (let i = 0; i < 15; i++) {
      const angle = i / 15 * Math.PI * 2, dx = Math.sin(angle) * .09, dz = Math.cos(angle) * .09;
      tube(threads, [[dx,0,dz],[dx * 1.8,-.24,dz * 1.7],[dx * 2,-.47 + random() * .1,dz * 1.5]], .007, tassel);
    }
    const charm = mesh(new T.TorusGeometry(.045,.011,5,12),gold,m.group); charm.position.set(.1,1.06,-.1);
    m.tassel = threads; m.tip.position.y = 2.04;
  }
  {
    const m = newModel('bow');
    const limb = [[0,-1.07,.14],[0,-.87,-.08],[0,-.55,-.38],[0,-.25,-.31],[0,0,-.26],[0,.25,-.31],[0,.55,-.38],[0,.87,-.08],[0,1.07,.14]];
    tube(m.group,limb,.043,shaftWood);
    cylinder(m.group,.054,.32,grip,0).position.z = -.26;
    for (const y of [-.95,-.4,.4,.95]) {
      const goldPoint = limb.reduce((best,p) => Math.abs(p[1]-y)<Math.abs(best[1]-y)?p:best,limb[0]);
      const trim = mesh(new T.SphereGeometry(.057,8,6),gold,m.group);trim.position.set(0,y,goldPoint[2]);trim.scale.set(.8,1.6,.9);
    }
    const stringGeo = new T.BufferGeometry(); stringGeo.setAttribute('position',new T.Float32BufferAttribute([0,1.07,.14,0,0,.14,0,-1.07,.14],3));
    m.string = new T.Line(stringGeo,new T.LineBasicMaterial({color:0xb8a67b}));m.group.add(m.string);
    const arrow = new T.Group(); arrow.position.y = .035; m.group.add(arrow);
    const arrowShaft = cylinder(arrow,.012,1.6,shaftWood,0); arrowShaft.rotation.x = Math.PI/2;
    const arrowPoint = mesh(new T.ConeGeometry(.044,.17,4),steel,arrow);arrowPoint.rotation.x = -Math.PI/2;arrowPoint.position.z = -.85;
    for(const x of [-.035,.035])box(.018,.12,.16,gold,x,0,.62,arrow);
    m.arrow = arrow; m.tip.position.set(0,.035,-.93);
  }
  {
    const m = newModel('axe');
    cylinder(m.group,.052,1.88,shaftWood,-.06);cylinder(m.group,.058,.57,grip,-.6);
    for(const y of [-.93,-.32,.13,.77,.98]){cylinder(m.group,.068,.11,gold,y);ring(m.group,y,.071);}
    // Single broad blade with a short opposing spike, as in the supplied sheet.
    shapeMesh(m.group,[[-.07,1.05],[-.31,1.11],[-.62,1.4],[-.78,1.17],[-.85,.83],[-.8,.47],[-.66,.24],[-.47,.65],[-.26,.73],[-.06,.68]],steel,.09);
    shapeMesh(m.group,[[-.63,1.4],[-.79,1.18],[-.86,.83],[-.81,.47],[-.66,.24],[-.61,.43],[-.71,.78],[-.67,1.12]],bladeEdge,.095);
    shapeMesh(m.group,[[.02,1.03],[.19,1.04],[.33,.94],[.13,.92],[.03,.78]],steel,.08);
    const disk = mesh(new T.CylinderGeometry(.13,.13,.03,16),gold,m.group);disk.rotation.x = Math.PI/2;disk.position.set(-.42,.85,-.066);
    const pommel = mesh(new T.TorusGeometry(.075,.021,6,12),gold,m.group);pommel.position.y = -1.09;
    m.tip.position.set(-.65,1.3,0);
  }
  const leftHand = mesh(new T.SphereGeometry(.071,8,6),skin,weaponRig);
  const rightHand = mesh(new T.SphereGeometry(.071,8,6),skin,weaponRig);
  const arms = [-1,1].map(() => mesh(new T.CylinderGeometry(.079,.061,1,8),robe,rig));
  const unitY = new T.Vector3(0,1,0),handPosition = new T.Vector3(),shoulder = new T.Vector3(),difference = new T.Vector3();
  const targetMarker = mesh(new T.RingGeometry(.42,.46,32), new T.MeshBasicMaterial({color:0xa4a878,transparent:true,opacity:.5,side:T.DoubleSide,depthWrite:false}));
  targetMarker.rotation.x = -Math.PI/2; targetMarker.castShadow = false; targetMarker.position.y = .008;
  let weaponId = 'staff',selected,paused = false,auto = false,nextAuto = 0,sequenceIndex = 0;
  let pose = null,shake = 0,toastUntil = 0,referenceType = 'weapon';
  const log = [];
  const vfx = new Core({THREE:T,scene,quality:'medium',random,getGroundY:()=>0,getEquippedWeapon:caster=>caster.userData.weaponId,onEvent:event=>{
    log.push({type:event.type,skillId:event.skillId,weaponId:event.weaponId,time:event.time,position:event.position&&event.position.toArray?event.position.toArray():null});
    if(log.length>500)log.shift();
    if(event.type==='impact'&&$('camera-shake').checked)shake=.23;
  }});
  const byWeapon = new Map(configs.map(c=>[c.weaponId,c]));
  const bySkill = new Map(configs.flatMap(c=>c.skills.map(s=>[s.id,s])));
  const sequence = ['staff','sword','spear','bow','axe'].flatMap(id=>byWeapon.get(id).skills.map(s=>s.id));
  const fmt = n=>Number(n||0).toFixed(1).replace('.',',');
  const simulationTime = ()=>vfx.time;
  const typeNames = {sweep:'TẤN CÔNG QUÉT',shield:'PHÒNG THỦ',slam:'CHẤN ĐỘNG',slash:'CHÉM ĐƠN',orbit:'KIẾM TRẬN',wave:'KHÍ LỰC',thrust:'XUYÊN KÍCH',cone:'QUÉT PHÍA TRƯỚC',burst:'PHÁ TRẬN',projectile:'XUYÊN TIỄN',volley:'LIÊN TIỄN',rain:'MƯA TÊN',cleave:'BỔ MẠNH',strike:'PHÁ GIÁP',spin:'XOÁY DIỆN RỘNG',aoe:'DIỆN RỘNG',attack:'TẤN CÔNG'};
  const skillTypes = {'sword.nhat-kiem':'CHÉM LIÊN HOÀN','sword.kiem-hoa':'KIẾM HOA DIỆN RỘNG','sword.kiem-khi':'KIẾM KHÍ TẦM XA','spear.pha-tran':'PHÁ TRẬN DIỆN RỘNG','axe.pha-giap':'PHÁ GIÁP','axe.cuong-phong':'XOÁY DIỆN RỘNG'};
  const labels = {staff:'Côn',sword:'Kiếm',spear:'Thương',bow:'Cung',axe:'Rìu'};
  const weaponIcons = {
    staff:'<path d="M18 3l-5 26M16 4l4 1M12 28l4 1M15 12l3 1M14 17l3 1"/>',
    sword:'<path d="M16 3l-4 16 3 2 4-17-3-1ZM10 19l10 3M14 21l-2 7M10 28l4 1"/>',
    spear:'<path d="M16 2l-3 8 3 2 3-2-3-8ZM16 12v17M12 13l-1 7M20 13l1 7"/>',
    bow:'<path d="M15 3C26 11 26 21 15 29L15 3ZM9 16h18M24 13l3 3-3 3"/>',
    axe:'<path d="M16 6v23M16 7C10 7 8 4 7 3 2 11 4 18 6 20c2-6 4-7 10-7M16 7l8 4-8 2"/>'
  };
  const skillIcons = [
    '<circle cx="30" cy="30" r="25"/><path d="M14 40C41 45 53 20 36 12c8 21-1 29-22 28ZM12 31c4 14 19 17 32 10"/>',
    '<circle cx="30" cy="30" r="25"/><circle cx="30" cy="30" r="15"/><path d="M11 31h38M30 11v38M18 18l24 24M18 42l24-24"/>',
    '<circle cx="30" cy="30" r="25"/><path d="M30 10v25M12 44l12-9-5-10 11 10 9-15-3 15 13 9-18-5-19 5ZM11 49h39"/>'
  ];
  function toast(message){$('toast').textContent=message;$('toast').classList.add('show');toastUntil=performance.now()+2500;}
  function stopAuto(){auto=false;$('sequence').textContent='Xem 15 chiêu';}
  function updateReference(){
    $('reference-image').src='../ASSETS/reference/'+weaponId+'/'+(referenceType==='weapon'?'weapon-reference.png':'skills-reference.png');
    $('reference-image').alt='Ảnh tham chiếu '+(referenceType==='weapon'?'vũ khí ':'ba chiêu ')+byWeapon.get(weaponId).name;
  }
  function selectSkill(id){
    if(!bySkill.has(id))return false;
    selected=id;const s=bySkill.get(id);
    document.querySelectorAll('.skill').forEach(b=>{const match=b.dataset.skill===id;b.classList.toggle('selected',match);b.setAttribute('aria-pressed',String(match));});
    $('skill-duration').textContent=fmt(s.duration)+' giây';
    $('skill-range').textContent=s.type==='rain'?'Bán kính '+fmt(s.radius)+' m · tâm cách 5 m':['projectile','volley','thrust'].includes(s.type)?'Tầm '+fmt(s.range)+' m':'Bán kính '+fmt(s.radius)+' m';
    $('skill-cooldown').textContent='Hồi '+fmt(s.cooldown)+' giây';
    $('skill-description').textContent=s.description||'';$('cast-label').textContent='Thi triển '+s.name;return true;
  }
  function selectWeapon(id,manual=true){
    if(closed)return false;
    if(!byWeapon.has(id))return false;
    if(manual)stopAuto();
    vfx.cancelAll({resetCooldowns:false});pose=null;weaponId=id;actor.userData.weaponId=id;
    models.forEach((m,key)=>{m.group.visible=key===id;});
    const config=byWeapon.get(id);
    document.querySelectorAll('.weapon').forEach(b=>{const match=b.dataset.weapon===id;b.classList.toggle('selected',match);b.setAttribute('aria-pressed',String(match));});
    $('weapon-name').textContent=config.name;$('weapon-index').textContent=String(['staff','sword','spear','bow','axe'].indexOf(id)+1).padStart(2,'0')+' / 05';
    const primary=new T.Color(config.palette.primary);document.documentElement.style.setProperty('--jade','#'+primary.getHexString());
    skillBindings.splice(0).forEach(remove=>remove());
    $('skills').replaceChildren();
    config.skills.forEach((s,i)=>{
      const button=document.createElement('button');button.className='skill';button.dataset.skill=s.id;button.type='button';button.setAttribute('aria-pressed','false');
      button.innerHTML='<span class="sigil-icon"><svg viewBox="0 0 60 60" aria-hidden="true">'+skillIcons[i]+'</svg></span><span class="skill-copy"><small></small><strong></strong><span></span></span><span class="key"></span><span class="cooldown-fill"></span>';
      button.querySelector('small').textContent=['I','II','III'][i]+' · '+(skillTypes[s.id]||typeNames[s.type]||['CHIÊU THỨ NHẤT','CHIÊU THỨ HAI','CHIÊU THỨ BA'][i]);
      button.querySelector('strong').textContent=s.name;button.querySelector('.skill-copy>span').textContent=s.id==='staff.con-quet'?'Mở cung · Khép vòng · Bộc phát':'Tụ lực · Phát chiêu · Tan dần';button.querySelector('.key').textContent=s.slot||i+1;
      listen(button,'click',()=>cast(s.id),undefined,skillBindings);$('skills').appendChild(button);
    });
    selectSkill(config.skills[0].id);updateReference();$('active-label').textContent='Sẵn sàng · '+labels[id];animateActor(simulationTime());return true;
  }
  function cast(id=selected,manual=true){
    if(closed)return false;
    const s=bySkill.get(id);if(!s)return false;
    if(manual)stopAuto();
    if(paused){toast('Tiếp tục sân luyện để ra chiêu.');return false;}
    const desiredWeapon=id.split('.')[0];if(desiredWeapon!==weaponId)selectWeapon(desiredWeapon,false);
    selectSkill(id);
    if(pose&&vfx.effects.some(e=>e.handle===pose.handle)){toast('Đợi chiêu hiện tại kết thúc hoặc đổi vũ khí.');return false;}
    animateActor(simulationTime());actor.updateMatrixWorld(true);
    const forward=new T.Vector3(0,0,-1).applyQuaternion(actor.quaternion);
    const point=['projectile','volley','thrust','rain'].includes(s.type)?actor.position.clone().addScaledVector(forward,s.type==='rain'?5:Math.min(s.range||9,9)):null;
    if(point)point.y=0;
    // The staff passes its model too: Côn Quét's ribbon follows two points on the shaft.
    const result=vfx.cast(id,{caster:actor,weaponTip:models.get(weaponId).tip,weapon:['staff','sword'].includes(weaponId)?models.get(weaponId).group:null,point});
    if(!result.ok){toast(result.reason==='cooldown'?'Đang hồi chiêu · còn '+fmt(result.retryAfter)+' giây':'Chưa thi triển được: '+result.reason);return false;}
    pose={id,start:simulationTime(),handle:result.handle};$('active-label').textContent=s.name;return true;
  }
  ['staff','sword','spear','bow','axe'].forEach(id=>{
    const button=document.createElement('button');button.className='weapon';button.dataset.weapon=id;button.type='button';button.setAttribute('aria-label',byWeapon.get(id).name);
    button.innerHTML='<span class="weapon-icon"><svg viewBox="0 0 32 32" aria-hidden="true">'+weaponIcons[id]+'</svg></span><span>'+labels[id]+'</span>';
    listen(button,'click',()=>selectWeapon(id));$('weapons').appendChild(button);
  });
  document.querySelectorAll('[data-reference]').forEach(button=>listen(button,'click',()=>{
    referenceType=button.dataset.reference;document.querySelectorAll('[data-reference]').forEach(b=>b.classList.toggle('selected',b===button));updateReference();
  }));
  listen($('cast-selected'),'click',()=>cast());
  listen($('sequence'),'click',()=>{
    if(auto){stopAuto();return;}
    if(paused){toast('Tiếp tục sân luyện để xem các chiêu.');return;}
    vfx.cancelAll({resetCooldowns:false});pose=null;actor.position.set(0,0,0);actor.rotation.y=0;
    auto=true;nextAuto=simulationTime();sequenceIndex=0;$('sequence').textContent='Dừng trình diễn';
  });
  function reset(){
    if(closed)return false;
    vfx.cancelAll({resetCooldowns:true});pose=null;stopAuto();actor.position.set(0,0,0);actor.rotation.y=0;shake=0;
    $('active-label').textContent='Sẵn sàng · '+labels[weaponId];toast('Đã làm mới sân và hồi chiêu.');
  }
  listen($('reset'),'click',reset);
  listen($('quality'),'change',e=>{
    vfx.setQuality(e.target.value);pose=null;
    renderer.setPixelRatio(Math.min(devicePixelRatio,e.target.value==='high'?2:e.target.value==='low'?1:1.5));renderer.shadowMap.enabled=e.target.value!=='low';resize();
  });
  function pause(){paused=!paused;$('pause').textContent=paused?'Tiếp tục':'Tạm dừng';$('pause').setAttribute('aria-pressed',String(paused));}
  listen($('pause'),'click',pause);listen($('help-toggle'),'click',()=>$('help').classList.toggle('open'));
  let azimuth=.28,elevation=.46,distance=13.6;
  listen($('view-reset'),'click',()=>{azimuth=.28;elevation=.46;distance=13.6;});
  const canvas=renderer.domElement;
  canvas.tabIndex=0;
  canvas.setAttribute('aria-label','Sân luyện 3D. Kéo để xoay, chụm hoặc tách hai ngón để thu phóng.');
  const input=createWeaponDemoInput({canvas,windowTarget:window,documentTarget:document,
    onCastSlot:slot=>cast(byWeapon.get(weaponId).skills[slot].id),onPause:pause,
    onCycle:step=>{const order=['staff','sword','spear','bow','axe'];selectWeapon(order[(order.indexOf(weaponId)+step+5)%5]);},
    onOrbit:(dx,dy)=>{azimuth-=dx*.005;elevation=T.MathUtils.clamp(elevation+dy*.004,.12,1.15);},
    onZoom:ratio=>{distance=T.MathUtils.clamp(distance*ratio,6,25);}
  });
  const keys=input.keys;
  const target=new T.Vector3(),cameraOffset=new T.Vector3();
  function resize(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);}
  listen(window,'resize',resize);
  function animateActor(time){
    rig.rotation.set(0,0,0);rig.position.y=0;torso.rotation.set(0,0,0);
    weaponRig.position.set(.35,1.3,-.32);weaponRig.rotation.set(0,0,-.25);weaponRig.scale.setScalar(1);
    leftHand.position.set(-.15,0,0);rightHand.position.set(0,0,0);
    if(weaponId==='staff'){weaponRig.position.set(0,1.26,-.3);weaponRig.rotation.set(0,.18,-.15);leftHand.position.x=-.39;rightHand.position.x=.39;}
    if(weaponId==='sword'){weaponRig.rotation.set(-.52,.15,-.35);leftHand.position.set(-.08,-.23,.02);}
    if(weaponId==='spear'){weaponRig.rotation.set(-1.02,0,.12);leftHand.position.set(0,.43,0);rightHand.position.y=-.1;}
    if(weaponId==='bow'){weaponRig.position.set(-.18,1.35,-.48);weaponRig.rotation.set(0,0,-.02);leftHand.position.set(0,0,-.26);rightHand.position.set(.05,0,.18);}
    if(weaponId==='axe'){weaponRig.rotation.set(-.42,0,-.3);leftHand.position.set(0,-.3,0);}
    const model=models.get(weaponId);
    if(model.arrow){model.arrow.visible=true;model.arrow.position.z=0;}
    if(model.string){const attribute=model.string.geometry.attributes.position;attribute.setXYZ(1,0,0,.14);attribute.needsUpdate=true;}
    if(model.tassel)model.tassel.rotation.z=Math.sin(time*2)*.08;
    if(pose){
      const s=bySkill.get(pose.id),age=time-pose.start;
      if(age>=s.duration||!vfx.effects.some(e=>e.handle===pose.handle)){pose=null;}
      else{
        const progress=T.MathUtils.clamp((age-s.activeAt)/Math.max(.01,s.activeEnd-s.activeAt),0,1);
        const windup=T.MathUtils.clamp(age/Math.max(.01,s.activeAt),0,1);
        if(s.type==='shield'||s.localId==='ho-than'){weaponRig.position.set(.24,1.23,-.1);weaponRig.rotation.z=-.95;rig.position.y=Math.sin(age*2)*.015;}
        else if(weaponId==='staff'){
          if(s.localId==='chan-dia'){const slam=window.StaffSlam.sample(age,s);rig.position.y=slam.lift;weaponRig.rotation.set(0,0,-slam.staffPitch);weaponRig.position.set(slam.handX,slam.handY,-slam.handZ);leftHand.position.set(-.294,0,0);rightHand.position.set(0,0,0);}
          else{const sweep=window.StaffSweep.sample(age,s);weaponRig.rotation.set(0,sweep.staffYaw,0);weaponRig.position.set(0,sweep.handY,-sweep.handZ);torso.rotation.y=sweep.torsoYaw;}
        }else if(weaponId==='sword'){
          if(s.localId==='nhat-kiem'){
            const strike=window.SwordStrike.sample(age),anchor=window.SwordStrike.authoredBlade(T,new T.Vector3(),new T.Vector3(0,0,-1),age);
            weaponRig.scale.setScalar(.7);weaponRig.quaternion.copy(anchor.rotation);weaponRig.position.copy(anchor.palm).add(new T.Vector3(0,.084,0).applyQuaternion(anchor.rotation));
            rightHand.position.set(0,-.12,0);leftHand.position.copy(weaponRig.worldToLocal(rig.localToWorld(new T.Vector3(-.33,1.56,-.19))));torso.rotation.y=-strike.torsoYaw*strike.weight;
          }else if(s.localId==='kiem-hoa'){rig.rotation.y=progress*Math.PI*2;weaponRig.rotation.z=-.5;}
          else{weaponRig.rotation.x=age<s.activeAt?-.4+windup*.8:.4-progress*2.2;weaponRig.position.z-=Math.sin(progress*Math.PI)*.25;}
        }else if(weaponId==='spear'){
          weaponRig.rotation.x=-1.02-(s.localId==='pha-tran'?.25:0);weaponRig.position.z=age<s.activeAt?-.3+windup*.3:-.3-Math.sin(progress*Math.PI)*.8;
          if(s.localId==='thuong-phong')rig.rotation.y=progress*Math.PI*1.45;
        }else if(weaponId==='bow'){
          const volley=s.localId==='lien-tien'?window.BowVolley.sample(age):null,rain=s.localId==='mua-ten'?window.BowRain.sample(age):null;
          const draw=rain?rain.draw:volley?volley.draw:s.localId==='xuyen-tien'?window.BowPiercing.sample(age).draw:(age<s.activeAt?windup:Math.max(0,1-progress*7))*.42,attribute=model.string.geometry.attributes.position;
          attribute.setXYZ(1,0,.035,.14+draw);attribute.needsUpdate=true;model.string.geometry.computeBoundingSphere();
          model.arrow.position.z=-.66+draw;model.arrow.visible=rain?rain.arrowVisible:volley?volley.arrowVisible:age<s.activeAt;model.tip.position.set(0,.035,-.93+model.arrow.position.z);rightHand.position.set(0,.035,.14+draw);
          if(s.localId==='xuyen-tien'){
            // This presentation rig faces -Z and uses full-size weapons; match the runtime release point.
            weaponRig.position.set(.12,1.7295,-.427);weaponRig.rotation.set(0,0,0);leftHand.position.set(0,0,-.26);
          }
          if(volley){
            // Match the game's 0.7-scale bow and three authored fan release anchors.
            weaponRig.scale.setScalar(.7);weaponRig.position.set(.12,1.74,-.298).applyAxisAngle(unitY,volley.yaw);weaponRig.rotation.set(0,volley.yaw,0);leftHand.position.set(0,0,-.26);
          }
          if(rain){
            weaponRig.scale.setScalar(.7);weaponRig.rotation.set(-rain.pitch,0,0);
            const gripOffset=new THREE.Vector3(0,0,-.26*.7).applyQuaternion(weaponRig.quaternion);
            weaponRig.position.set(.12,rain.handY,-rain.handZ).sub(gripOffset);leftHand.position.set(0,0,-.26);
          }
        }else if(weaponId==='axe'){
          if(s.localId==='cuong-phong'){rig.rotation.y=progress*Math.PI*4;weaponRig.rotation.set(-1.05,0,-.5);}
          else{weaponRig.rotation.x=age<s.activeAt?-.4+windup*1.2:.8-progress*2.5;rig.position.y=-Math.sin(progress*Math.PI)*.1;}
        }
      }
    }else rig.position.y=Math.sin(time*1.5)*.008;
    rig.updateMatrixWorld(true);
    for(let i=0;i<2;i++){
      (i===0?leftHand:rightHand).getWorldPosition(handPosition);rig.worldToLocal(handPosition);shoulder.set(i===0?-.3:.3,1.5,0);
      difference.copy(handPosition).sub(shoulder);arms[i].position.copy(shoulder).addScaledVector(difference,.5);arms[i].scale.y=difference.length();arms[i].quaternion.setFromUnitVectors(unitY,difference.normalize());
    }
    const current=bySkill.get(selected),forward=new T.Vector3(0,0,-1).applyQuaternion(actor.quaternion);
    const targetDistance=weaponId==='bow'?(current.localId==='mua-ten'?5:Math.min(current.range||9,9)):current.forwardOffset||1.8;
    targetMarker.position.copy(actor.position).addScaledVector(forward,targetDistance);targetMarker.position.y=.008;targetMarker.visible=weaponId==='bow';
  }
  let closed=false;
  function frame(now,delta){
    if(closed)return;
    const dt=paused?0:delta;
    if(dt&&(!pose||bySkill.get(pose.id).type==='shield'||bySkill.get(pose.id).localId==='ho-than')){
      const dx=Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft'));
      const dz=Number(keys.has('KeyS')||keys.has('ArrowDown'))-Number(keys.has('KeyW')||keys.has('ArrowUp'));
      if(dx||dz){const length=Math.hypot(dx,dz);actor.position.x=T.MathUtils.clamp(actor.position.x+dx/length*dt*3,-8,8);actor.position.z=T.MathUtils.clamp(actor.position.z+dz/length*dt*3,-8,8);actor.rotation.y=Math.atan2(-dx,-dz);}
    }
    if(auto&&!paused&&simulationTime()>=nextAuto){
      const id=sequence[sequenceIndex],desired=id.split('.')[0];if(desired!==weaponId)selectWeapon(desired,false);
      if(cast(id,false)){
        nextAuto=simulationTime()+bySkill.get(id).duration+.7;sequenceIndex++;
        $('sequence').textContent='Dừng · '+sequenceIndex+' / 15';
        if(sequenceIndex===sequence.length){auto=false;$('sequence').textContent='Xem lại 15 chiêu';}
      }else nextAuto=simulationTime()+.35;
    }
    animateActor(simulationTime()+dt);vfx.update(dt);
    if(pose){
      const s=bySkill.get(pose.id),age=simulationTime()-pose.start;
      $('timeline-progress').style.width=Math.min(100,age/s.duration*100)+'%';
      $('phase-label').textContent=paused?'Đã tạm dừng':s.id==='staff.con-quet'?window.StaffSweep.sample(age,s).phase:s.id==='staff.chan-dia'?window.StaffSlam.sample(age,s).phase:age<s.activeAt?'Tụ lực':age<s.activeEnd?s.type==='shield'?'Duy trì khiên':'Phát chiêu':'Tan dần';
    }else{$('timeline-progress').style.width='0%';$('phase-label').textContent=paused?'Đã tạm dừng':'Sẵn sàng';}
    document.querySelectorAll('.skill').forEach(button=>{
      const s=bySkill.get(button.dataset.skill),cd=vfx.cooldownRemaining(s.id,actor);button.querySelector('.cooldown-fill').style.width=Math.min(100,cd/s.cooldown*100)+'%';button.querySelector('.key').textContent=cd>0?fmt(cd):s.slot;
    });
    const remaining=vfx.cooldownRemaining(selected,actor);$('cast-selected').disabled=paused||remaining>0||!!pose;
    $('cast-label').textContent=remaining>0?'Hồi chiêu · '+fmt(remaining)+' giây':'Thi triển '+bySkill.get(selected).name;
    const mobile=innerWidth<=850;target.set(actor.position.x,1.05,actor.position.z);
    cameraOffset.set(Math.sin(azimuth)*Math.cos(elevation)*distance,Math.sin(elevation)*distance,Math.cos(azimuth)*Math.cos(elevation)*distance);camera.position.copy(target).add(cameraOffset);camera.lookAt(target);
    camera.setViewOffset(innerWidth,innerHeight,mobile?0:-Math.min(185,innerWidth*.125),mobile?80:0,innerWidth,innerHeight);
    if(shake>0){camera.position.x+=Math.sin(simulationTime()*83)*shake*.15;camera.position.y+=Math.cos(simulationTime()*69)*shake*.12;shake=Math.max(0,shake-dt);}
    lanterns.forEach((light,i)=>{light.intensity=6+Math.sin(simulationTime()*4+i)*.5;});renderer.render(scene,camera);
    if(now>toastUntil)$('toast').classList.remove('show');
  }
  const frameLoop=createWeaponDemoFrameLoop({requestFrame:callback=>requestAnimationFrame(callback),
    cancelFrame:id=>cancelAnimationFrame(id),documentTarget:document,renderFrame:frame});
  selectWeapon('staff',false);frameLoop.start();
  const shutdown=createWeaponDemoCleanup({scene,renderer,vfx,bindings,skillBindings,input,
    stopFrames:()=>{closed=true;frameLoop.dispose();}});
  window.weaponDemo={scene,camera,renderer,actor,vfx,models,selectWeapon,selectSkill,cast,reset,log,get paused(){return paused;},shutdown};
})();
