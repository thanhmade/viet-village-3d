/* Reusable procedural models from the v2 visualizer; owns only its meshes. */
window.createVillageWeaponModels = function (T) {
  const random = Math.random;
  const mat = (color, options = {}) => new T.MeshStandardMaterial({color, roughness: .55, ...options});
  const gold = mat(0xc5a85c, {metalness: .65, roughness: .38});
  function mesh(geometry, material, parent) { const object = new T.Mesh(geometry, material); object.castShadow = true; parent.add(object); return object; }
  function box(w,h,d,material,x,y,z,parent) { const object = mesh(new T.BoxGeometry(w,h,d), material, parent); object.position.set(x,y,z); return object; }
  const steel = mat(0xb8c1bb, { roughness: 0.28, metalness: 0.82 });
  const bladeEdge = mat(0xe1e6db, { roughness: 0.22, metalness: 0.7 });
  const shaftWood = mat(0x563b28), grip = mat(0x292a21), tassel = mat(0x7e2524);
  const weaponRig = new T.Group(); weaponRig.userData.localOnly = true;
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
    const info = { group, tip, gripPoint: new T.Vector3() }; models.set(id, info); return info;
  }
  function markGrip(model, handle) {
    // Anchor to the centre of the actual handle, not the model's display origin.
    handle.name = model.group.name + '-grip'; model.gripPoint.copy(handle.position);
    return handle;
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
    const handle = markGrip(m, cylinder(m.group, 0.063, 0.5, grip, 0, Math.PI / 2));
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
    markGrip(m, cylinder(m.group, .056, .37, grip, -.12));
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
    markGrip(m, cylinder(m.group, .047, .56, grip, -.65));
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
    const handle = cylinder(m.group,.054,.32,grip,0); handle.position.z = -.26; markGrip(m, handle);
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
    cylinder(m.group,.052,1.88,shaftWood,-.06);markGrip(m, cylinder(m.group,.058,.57,grip,-.6));
    for(const y of [-.93,-.32,.13,.77,.98]){cylinder(m.group,.068,.11,gold,y);ring(m.group,y,.071);}
    // Single broad blade with a short opposing spike, as in the supplied sheet.
    shapeMesh(m.group,[[-.07,1.05],[-.31,1.11],[-.62,1.4],[-.78,1.17],[-.85,.83],[-.8,.47],[-.66,.24],[-.47,.65],[-.26,.73],[-.06,.68]],steel,.09);
    shapeMesh(m.group,[[-.63,1.4],[-.79,1.18],[-.86,.83],[-.81,.47],[-.66,.24],[-.61,.43],[-.71,.78],[-.67,1.12]],bladeEdge,.095);
    shapeMesh(m.group,[[.02,1.03],[.19,1.04],[.33,.94],[.13,.92],[.03,.78]],steel,.08);
    const disk = mesh(new T.CylinderGeometry(.13,.13,.03,16),gold,m.group);disk.rotation.x = Math.PI/2;disk.position.set(-.42,.85,-.066);
    const pommel = mesh(new T.TorusGeometry(.075,.021,6,12),gold,m.group);pommel.position.y = -1.09;
    m.tip.position.set(-.65,1.3,0);
  }
  for (const model of models.values()) model.group.visible = false;
  return {root: weaponRig, models, dispose() {
    const geometries = new Set(), materials = new Set();
    weaponRig.traverse(object => { if(object.geometry) geometries.add(object.geometry); if(object.material) (Array.isArray(object.material) ? object.material : [object.material]).forEach(material => materials.add(material)); });
    weaponRig.removeFromParent(); geometries.forEach(geometry => geometry.dispose()); materials.forEach(material => material.dispose());
  }};
};
