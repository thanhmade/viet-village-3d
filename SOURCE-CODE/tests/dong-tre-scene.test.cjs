'use strict';
// Real bundled Three.js geometry and collision tests; no rendering or external service.
const assert=require('node:assert/strict');
const {test}=require('node:test');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const THREE=require('../../ASSETS/vendor/three.min.js');
const root=path.resolve(__dirname,'../..'),scope={};scope.window=scope;
vm.runInNewContext(fs.readFileSync(path.join(root,'MAP/regions/ngoai-lang-dong-tre/scene.js'),'utf8'),scope);
const create=()=>scope.createDongTreRegion({THREE});
function route(region,points){
  for(let i=1;i<points.length;i++){
    const [x1,z1]=points[i-1],[x2,z2]=points[i],steps=Math.max(1,Math.ceil(Math.hypot(x2-x1,z2-z1)/.05));
    for(let j=0;j<=steps;j++){
      const x=x1+(x2-x1)*j/steps,z=z1+(z2-z1)*j/steps;
      assert.equal(region.canWalk(x,z),true,`Blocked route at (${x.toFixed(3)},${z.toFixed(3)})`);
      assert.ok(Number.isFinite(region.groundHeight(x,z)));
    }
  }
}
function exactResource(relative){
  const file=path.resolve(root,'SOURCE-CODE',relative),projectRelative=path.relative(root,file);
  assert.ok(!path.isAbsolute(projectRelative)&&!projectRelative.startsWith('..'));
  let cursor=root;for(const part of projectRelative.split(path.sep)){assert.ok(fs.readdirSync(cursor).includes(part),'Missing or incorrectly cased reference: '+relative);cursor=path.join(cursor,part);}
  return fs.readFileSync(file);
}

test('Đồng Tre is an isolated hidden 3D scene with four real reference images and unique positioned landmarks',()=>{
  const r=create();assert.equal(r.id,'ngoai-lang-dong-tre');assert.match(r.name,/Đồng Tre/);
  assert.ok(r.root.isGroup);assert.equal(r.root.parent,null);assert.equal(r.root.visible,false);
  assert.deepEqual(Object.keys(scope).sort(),['createDongTreRegion','window']);
  assert.equal(new Set(r.landmarks.map(item=>item.id)).size,r.landmarks.length);
  assert.ok(r.landmarks.length>=10,'The scene includes the village entrance, stream, bridge and exploration landmarks');
  for(const item of r.landmarks)assert.ok([item.position.x,item.position.y,item.position.z].every(Number.isFinite),item.id);
  assert.equal(r.references.length,4);
  for(const ref of r.references){
    const bytes=exactResource(ref.path);assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
    assert.equal(bytes.readUInt32BE(16),1536);assert.equal(bytes.readUInt32BE(20),1024);assert.ok(ref.label);
  }
  r.dispose();
});

test('both named spawns and the complete manual interaction circle are flat, clear and connected to the front gate',()=>{
  const r=create();assert.equal(r.defaultSpawnId,'village-entry');assert.equal(r.spawn,r.spawns['village-entry']);
  assert.equal(r.spawns['village-entry'].z,15);assert.equal(r.spawns['from-lang-viet'].z,17);
  assert.equal(r.portal.activation,'interact');assert.equal(r.portal.x,0);assert.equal(r.portal.z,20.5);
  assert.equal(r.portal.radius,1);assert.equal(r.portal.interactionRadius,1.8);
  for(const spawn of Object.values(r.spawns)){
    assert.equal(r.canWalk(spawn.x,spawn.z),true);assert.equal(r.groundHeight(spawn.x,spawn.z),spawn.y);
    assert.ok(Math.hypot(spawn.x-r.portal.x,spawn.z-r.portal.z)>r.portal.interactionRadius+.25,'Arrival cannot request a return interaction immediately');
    route(r,[[spawn.x,spawn.z],[r.portal.x,r.portal.z]]);
  }
  for(let i=0;i<128;i++){
    const angle=i*Math.PI/64,x=r.portal.x+Math.cos(angle)*(r.portal.interactionRadius+.2),z=r.portal.z+Math.sin(angle)*(r.portal.interactionRadius+.2);
    assert.equal(r.canWalk(x,z),true,`Portal clearance ${x},${z}`);assert.equal(r.groundHeight(x,z),.3);
  }
  route(r,[[0,27],[r.portal.x,r.portal.z],[0,8]]);
  assert.equal(r.roofHeight(r.portal.x,r.portal.z),.3,'Manual interaction keeps the actor outside the gate roof');
  for(const [x,z] of [[25.01,0],[-25.01,0],[0,27.01],[0,-27.01],[NaN,0],[0,Infinity]])assert.equal(r.canWalk(x,z),false);
  r.dispose();
});

test('the exploration loop and cave approach are connected while buildings, well, tree and paddies remain solid',()=>{
  const r=create();
  route(r,[[0,15],[0,8],[0,0],[-9,-2],[-9,-9],[-9,-17],[0,-16],[10,-14],[14,-7],[9,-1],[0,-1],[0,0]]);
  route(r,[[0,17],[-12,17]]);route(r,[[0,17],[16,17]]);
  route(r,[[0,-16],[0,-24]]);
  for(const [x,z] of [[-12,13],[16,13],[7,15],[6,10.5],[-19,-9],[-19,-20]])assert.equal(r.canWalk(x,z),false,`Solid landmark at ${x},${z}`);
  r.dispose();
});

test('the river cannot be crossed outside the bridge and both ramps match the actual 3D floor continuously',()=>{
  const r=create();
  for(const x of [-23,-18,-10,-3,3,10,18,23])for(const z of [1.4,4,6.6])assert.equal(r.canWalk(x,z),false,`Water must block walking at ${x},${z}`);
  for(let z=0;z<=8;z+=.025){
    assert.equal(r.canWalk(0,z),true);assert.ok(Math.abs(r.groundHeight(0,z+.025)-r.groundHeight(0,z))<.015,'No step-sized gap on bridge ramps');
  }
  assert.ok(Math.abs(r.groundHeight(0,0)-.3)<1e-8);assert.ok(Math.abs(r.groundHeight(0,8)-.3)<1e-8);assert.ok(Math.abs(r.groundHeight(0,4)-.8)<1e-8);
  r.root.updateMatrixWorld(true);
  const ray=new THREE.Raycaster(new THREE.Vector3(),new THREE.Vector3(0,-1,0));
  for(const [x,z] of [[0,.2],[0,1.5],[0,3],[0,4],[0,5.5],[0,7.8],[0,15],[0,20.5],[0,-22]]){
    ray.ray.origin.set(x,1.2,z);const hits=ray.intersectObject(r.root,true).filter(hit=>hit.object.isMesh&&!r.waterMeshes.includes(hit.object));
    assert.ok(hits.length,`Actual walking floor exists at ${x},${z}`);
    assert.ok(Math.abs(hits[0].point.y-r.groundHeight(x,z))<.035,`Floor helper ${r.groundHeight(x,z)} vs mesh ${hits[0].point.y} at ${x},${z}`);
  }
  r.dispose();
});

test('camera blockers and rain roof coverage follow solid scenery and leave exposed paths at their ground height',()=>{
  const r=create();assert.ok(r.cameraBounds.length>5);assert.ok(r.cameraBounds.every(box=>box.isBox3&&!box.isEmpty()));
  for(const [x,z] of [[-12,13],[16,13]]){
    assert.ok(r.roofHeight(x,z)>2);
    assert.ok(r.cameraBounds.some(box=>box.containsPoint(new THREE.Vector3(x,1.5,z))));
  }
  for(const [x,z] of [[0,15],[0,20.5],[0,4],[-9,-9]])assert.equal(r.roofHeight(x,z),r.groundHeight(x,z));
  assert.ok(r.roofHeight(0,-24)>2,'The cave has real overhead cover');
  r.dispose();
});

test('scenery stays within draw, triangle and light budgets and does not substitute photos for geometry',()=>{
  const r=create();let calls=0,triangles=0,instances=0,lights=0;
  r.root.traverse(o=>{
    if(o.isLight){lights++;assert.equal(o.castShadow,false);assert.equal(o.intensity,0);assert.ok(o.userData.baseIntensity>0);}
    if(!o.isMesh)return;
    const count=o.isInstancedMesh?o.count:1;calls++;instances+=count;
    triangles+=(o.geometry.index?o.geometry.index.count:o.geometry.attributes.position.count)/3*count;
    assert.ok(o.geometry.attributes.position.count>0);
    for(const material of Array.isArray(o.material)?o.material:[o.material])assert.equal(material.map,null,'Reference images remain in the gallery');
  });
  assert.ok(calls<90,`Draw calls: ${calls}`);assert.ok(triangles<80000,`Triangles: ${triangles}`);
  assert.ok(lights<=2);assert.equal(lights,r.lights.length);assert.ok(r.waterMeshes.length>0);
  assert.equal(calls,r.diagnostics.drawCalls);assert.equal(triangles,r.diagnostics.triangles);assert.equal(instances,r.diagnostics.instances);
  assert.ok(r.wetMaterials.length>3);assert.ok(r.lampGlowMaterials.length>0);r.dispose();
});

test('repeated builds are deterministic and dispose only their own shared geometry and materials once',()=>{
  const a=create(),b=create();assert.notEqual(a.root,b.root);assert.equal(a.diagnostics.instances,b.diagnostics.instances);
  const am=[],bm=[];a.root.traverse(o=>{if(o.isMesh)am.push(o);});b.root.traverse(o=>{if(o.isMesh)bm.push(o);});
  assert.equal(am.length,bm.length);
  for(let i=0;i<am.length;i++){assert.notEqual(am[i].material,bm[i].material);if(am[i].isInstancedMesh)assert.deepEqual(am[i].instanceMatrix.array,bm[i].instanceMatrix.array);}
  const resources=new Set();for(const mesh of am){resources.add(mesh.geometry);for(const material of Array.isArray(mesh.material)?mesh.material:[mesh.material])resources.add(material);}
  const counts=new Map();for(const resource of resources)resource.addEventListener('dispose',()=>counts.set(resource,(counts.get(resource)||0)+1));
  const scene=new THREE.Scene(),sentinel=new THREE.Group();scene.add(a.root,sentinel);a.dispose();a.dispose();
  assert.deepEqual(scene.children,[sentinel]);assert.equal(a.root.children.length,0);for(const resource of resources)assert.equal(counts.get(resource),1);
  assert.ok(b.root.children.length);assert.equal(b.canWalk(b.spawn.x,b.spawn.z),true);b.dispose();
});
