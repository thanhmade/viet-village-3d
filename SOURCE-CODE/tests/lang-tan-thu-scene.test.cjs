'use strict';
// Structural and navigation checks use the real bundled Three.js, not a rendered screenshot.
const assert=require('node:assert/strict');
const {test}=require('node:test');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const THREE=require('../../ASSETS/vendor/three.min.js');
const context={};context.window=context;vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(__dirname,'../../MAP/regions/lang-tan-thu/scene.js'),'utf8'),context);
const create=()=>context.createLangTanThuRegion({THREE});
function route(region,points){
  for(let i=1;i<points.length;i++){
    const [x1,z1]=points[i-1],[x2,z2]=points[i],steps=Math.ceil(Math.hypot(x2-x1,z2-z1)/.05);
    for(let j=0;j<=steps;j++){const x=x1+(x2-x1)*j/steps,z=z1+(z2-z1)*j/steps;assert.equal(region.canWalk(x,z),true,`blocked route at (${x.toFixed(3)},${z.toFixed(3)})`);assert.ok(Number.isFinite(region.groundHeight(x,z)));}
  }
}

test('region builds only its own hidden Three.js root and has the coherent reference landmarks',()=>{
  const region=create();assert.equal(region.id,'lang-tan-thu');assert.equal(region.name,'Làng Tân Thủ');assert.ok(region.root.isGroup);assert.equal(region.root.parent,null);assert.equal(region.root.visible,false);
  assert.deepEqual(Object.keys(context).sort(),['createLangTanThuRegion','window']);
  assert.equal(new Set(region.landmarks.map(l=>l.id)).size,region.landmarks.length);
  for(const landmark of region.landmarks){assert.equal(landmark.position.x,landmark.x);assert.equal(landmark.position.z,landmark.z);assert.equal(landmark.position.y,.3);}
  assert.equal(region.references.length,4);for(const reference of region.references)assert.equal(fs.existsSync(path.resolve(__dirname,'..',reference.path)),true,reference.path);
  const homes=region.landmarks.filter(l=>l.type==='home');assert.equal(homes.length,4);assert.equal(homes.filter(l=>l.roof==='straw').length,3);assert.equal(homes.filter(l=>l.roof==='tile').length,1);
  for(const type of ['community-house','gate','banyan','well','training','stream','bridge','dock','boat','fence'])assert.equal(region.landmarks.filter(l=>l.type===type).length,1,type);
  assert.equal(region.landmarks.filter(l=>l.type==='rice-paddy').length,2);
  assert.equal(region.landmarks.find(l=>l.type==='community-house').z,-19);assert.equal(region.landmarks.find(l=>l.type==='gate').z,24);
  assert.equal(region.landmarks.find(l=>l.type==='stream').x,18);region.dispose();
});

test('spawn and the complete return-ring area are flat, outside obstacles and connected through the gate',()=>{
  const r=create();assert.equal(r.canWalk(r.spawn.x,r.spawn.z),true);assert.equal(r.spawn.z,16.5);assert.equal(r.portal.z,20);
  assert.ok(Math.hypot(r.spawn.x-r.portal.x,r.spawn.z-r.portal.z)>r.portal.radius+.28,'Arrival is outside the trigger and actor clearance');
  for(let i=0;i<128;i++){
    const angle=i*Math.PI/64,x=r.portal.x+Math.cos(angle)*(r.portal.radius+.25),z=r.portal.z+Math.sin(angle)*(r.portal.radius+.25);
    assert.equal(r.canWalk(x,z),true);assert.equal(r.groundHeight(x,z),.3);assert.equal(r.roofHeight(x,z),.3,'The complete ring is clear of the gate canopy');
  }
  route(r,[[0,27],[r.portal.x,r.portal.z],[r.spawn.x,r.spawn.z],[0,-14.35]]);
  assert.equal(r.canWalk(2.55,24),false,'Gate post is solid');assert.equal(r.canWalk(5,24),false,'Front fence remains solid');
  assert.equal(r.canWalk(26,0),false);assert.equal(r.canWalk(0,28),false);assert.equal(r.canWalk(NaN,0),false);r.dispose();
});

test('routes connect house verandas, well, banyan, training yard, bridge and wharf without crossing solids',()=>{
  const r=create(),start=[r.spawn.x,r.spawn.z];
  for(const home of r.landmarks.filter(l=>l.type==='home'))route(r,[start,[0,home.frontZ],[home.x,home.frontZ],[home.x,home.z+2.6]]);
  route(r,[start,[0,14],[-2.5,14]]);route(r,[start,[0,9],[-3.6,9]]);
  route(r,[start,[0,11.5],[7.5,11.5],[7.5,13.5]]);
  route(r,[start,[0,8],[22.5,8],[22.5,10.5]]);
  route(r,[start,[0,-6.1],[12,-6.1],[12,-13],[16.5,-13]]);
  for(const home of r.landmarks.filter(l=>l.type==='home'||l.type==='community-house'))assert.equal(r.canWalk(home.x,home.z),false,'Closed house walls block entry');
  for(const [x,z] of [[-17,0],[-17,15],[-7,9],[-4,14],[6.4,13],[9,13],[7.5,16]])assert.equal(r.canWalk(x,z),false,`solid landmark ${x},${z}`);
  r.dispose();
});

test('river is impassable except the guarded bridge and wharf; bridge ramps have a continuous floor',()=>{
  const r=create();for(const z of [-22,-18,-5,0,4,12,18,22])for(const x of [15.4,16,18,20.6])assert.equal(r.canWalk(x,z),false);
  for(let x=13.8;x<=22.2;x+=.025){assert.equal(r.canWalk(x,8),true);assert.ok(Math.abs(r.groundHeight(x+.025,8)-r.groundHeight(x,8))<.008);}
  assert.ok(Math.abs(r.groundHeight(18,8)-.95)<1e-8);assert.equal(r.groundHeight(14.2,8),.3);assert.equal(r.groundHeight(21.8,8),.3);
  for(const z of [6.5,9.5])assert.equal(r.canWalk(18,z),false,'Bridge handrail blocks stepping off');
  assert.equal(r.canWalk(16.5,-13),true);assert.equal(r.canWalk(18.5,-13),false,'Boat is scenery, not a walking surface');
  assert.ok(r.groundHeight(16.5,-13)>.5);r.dispose();
});

test('ground-height helpers coincide with the actual bridge, dock, steps and veranda geometry',()=>{
  const r=create(),surfaces=r.root.children.filter(o=>o.isMesh&&['tan-thu-planks','tan-thu-stone'].includes(o.material.name));
  const ray=new THREE.Raycaster(new THREE.Vector3(),new THREE.Vector3(0,-1,0));
  for(const [x,z] of [[14.5,8],[15.8,8],[18,8],[20.7,8],[21.5,8],[13.8,-13],[16,-13],[7,2.6],[7,3.12],[7,3.37],[7,3.67]]){
    ray.ray.origin.set(x,1.25,z);const hits=ray.intersectObjects(surfaces,false);assert.ok(hits.length,`A real floor exists at ${x},${z}`);
    assert.ok(Math.abs(hits[0].point.y-r.groundHeight(x,z))<.028,`helper ${r.groundHeight(x,z)} vs mesh ${hits[0].point.y} at ${x},${z}`);
  }
  r.dispose();
});

test('roof coverage and camera blockers cover buildings, gate and canopy; exposed floor remains uncovered',()=>{
  const r=create();assert.equal(r.roofHeight(r.spawn.x,r.spawn.z),.3);assert.equal(r.roofHeight(18,8),r.groundHeight(18,8));
  for(const [x,z,height] of [[0,-19,5],[-7,-10,4],[-7,9,8],[0,24,4]])assert.ok(r.roofHeight(x,z)>height);
  assert.ok(r.cameraBounds.every(b=>b.isBox3&&!b.isEmpty()));
  assert.ok(r.cameraBounds.some(b=>b.containsPoint(new THREE.Vector3(0,4.2,24))),'Gate canopy blocks the camera');
  assert.ok(r.cameraBounds.some(b=>b.containsPoint(new THREE.Vector3(-7,7,9))),'Banyan canopy blocks the camera');
  assert.ok(r.cameraBounds.some(b=>b.containsPoint(new THREE.Vector3(7,1.5,0))),'House wall blocks the camera');r.dispose();
});

test('all scenery is real batched geometry within the rendering and light budgets',()=>{
  const r=create();let calls=0,triangles=0,instances=0,lightCount=0;
  r.root.traverse(o=>{
    if(o.isLight){lightCount++;assert.equal(o.castShadow,false);assert.equal(o.intensity,0);assert.ok(o.userData.baseIntensity>0);}
    if(o.isMesh){assert.equal(o.isInstancedMesh,true);assert.equal(o.material.map,null,'No reference image is used as a fake scene');assert.ok(o.geometry.attributes.position.count>0);assert.ok(o.boundingSphere.radius>0);calls++;instances+=o.count;triangles+=(o.geometry.index?o.geometry.index.count:o.geometry.attributes.position.count)/3*o.count;}
  });
  assert.ok(calls<120);assert.ok(triangles<90000);assert.equal(lightCount,2);assert.equal(r.lights.length,2);
  assert.equal(calls,r.diagnostics.drawCalls);assert.equal(triangles,r.diagnostics.triangles);assert.equal(instances,r.diagnostics.instances);
  assert.equal(r.waterMeshes.length,1,'River and paddy water share one batch');assert.ok(r.waterMeshes[0].count>=3);
  assert.ok(r.wetMaterials.length>5);assert.equal(r.lampGlowMaterials.length,1);assert.ok(r.lampGlowMaterials[0].emissive);
  r.dispose();
});

test('builds are deterministic and independent; disposal releases shared resources exactly once',()=>{
  const a=create(),b=create();assert.notEqual(a.root,b.root);assert.equal(a.diagnostics.instances,b.diagnostics.instances);
  const am=a.root.children.filter(o=>o.isMesh),bm=b.root.children.filter(o=>o.isMesh);
  assert.equal(am.length,bm.length);for(let i=0;i<am.length;i++){assert.deepEqual(am[i].instanceMatrix.array,bm[i].instanceMatrix.array);assert.notEqual(am[i].material,bm[i].material);}
  const resources=new Set();for(const mesh of am){resources.add(mesh.geometry);resources.add(mesh.material);}
  const counts=new Map();for(const value of resources)value.addEventListener('dispose',()=>counts.set(value,(counts.get(value)||0)+1));
  const scene=new THREE.Scene(),sentinel=new THREE.Group();scene.add(a.root,sentinel);a.dispose();a.dispose();
  assert.deepEqual(scene.children,[sentinel]);assert.equal(a.root.children.length,0);for(const value of resources)assert.equal(counts.get(value),1);
  assert.equal(b.canWalk(b.spawn.x,b.spawn.z),true);assert.ok(b.root.children.length);b.dispose();
});
