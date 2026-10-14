'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
const createHarness=require('./harness.cjs'),root=path.resolve(__dirname,'../..'),THREE=require(path.join(root,'ASSETS/vendor/three.min.js'));
global.THREE=THREE;global.self=global;global.ProgressEvent=class{constructor(type,detail){Object.assign(this,{type},detail);}};
// Node validates embedded PNG headers here; actual pixel decode is covered by
// the import audit and browser. No DOM image loader is available in this harness.
global.createImageBitmap=async blob=>{const b=Buffer.from(await blob.arrayBuffer());assert.equal(b.subarray(0,8).toString('hex'),'89504e470d0a1a0a');return {width:b.readUInt32BE(16),height:b.readUInt32BE(20),close(){}};};
const loaderPromise=import(pathToFileURL(path.join(root,'ASSETS/vendor/gltf-r160/GLTFLoader.js')).href);
const catalog=()=>JSON.parse(fs.readFileSync(path.join(root,'MAP/regions/lang-viet/assets-3d.json'),'utf8'));
const templates=new Map();
async function loadModel(url){
 const file=path.resolve(root,'SOURCE-CODE',url);assert(file.startsWith(root+path.sep));
 if(!templates.has(file))templates.set(file,(async()=>{const data=fs.readFileSync(file),{GLTFLoader}=await loaderPromise;return new GLTFLoader().parseAsync(data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength),'');})());
 return templates.get(file);
}
async function runtime(failId){
 const h=createHarness();h.context.fetch=async()=>({ok:true,json:async()=>catalog()});
 const result=await h.context.VietVillageMapAssets.initialize({region:h.context.VietVillageRegions.current,interior:h.run('interiorRoot'),preview:h.run('housePreview'),
  load:async url=>{if(failId&&url.includes(failId))throw new Error('Simulated unavailable GLB');return loadModel(url);}});
 return {h,result};
}
test('all ready reference assets load as genuine unrigged GLB and have finite geometry and named motion pivots',async()=>{
 const c=catalog(),ready=c.assets.filter(a=>a.url);assert.equal(ready.length,48);
 assert(!ready.some(a=>['LV_CUM_DA_01','LV_THUNG_GO_01'].includes(a.id)),'Unreadable references must not claim completed models');
 for(const item of ready){
  const gltf=await loadModel(item.url);let meshes=0,triangles=0;
  gltf.scene.traverse(node=>{assert(!node.isSkinnedMesh,item.id);if(node.isMesh){meshes++;triangles+=(node.geometry.index?.count||node.geometry.attributes.position.count)/3;
   for(const value of node.geometry.attributes.position.array)assert(Number.isFinite(value),item.id);}
  });assert(meshes>0&&triangles>12,item.id+' must contain volumetric geometry');
  const bounds=new THREE.Box3().setFromObject(gltf.scene);assert(bounds.min.y>=(item.sourceType==='imported-glb'?item.bounds.min[1]-.001:/AO_SEN/.test(item.id)?-.17:-.002),item.id+' below exported ground contract');
 }
});
test('actual GLBs replace legacy families atomically without duplicating the imported pond lotus cluster',async t=>{
 const {h,result}=await runtime();assert.equal(result.loaded,47);assert.equal(result.errors.length,0);assert.equal(result.groups,19);
 const placed=new Set();h.run('scene').traverse(node=>{if(node.userData.assetId)placed.add(node.userData.assetId);});
 for(const item of catalog().assets.filter(a=>a.url&&a.id!=='LV_CUM_SEN_01'))assert(placed.has(item.id),item.id+' has no placement');
 assert(!placed.has('LV_CUM_SEN_01'),'Supplied pond already contains lotus leaves/flowers; old extra cluster must not overlap');
 h.run('scene').traverse(node=>{if(node.userData.assetLegacy)assert.equal(node.visible,false,node.userData.assetLegacy);});
 assert(h.run("!!world.getObjectByName('preserved-boundary-rocks')"));
 let previewMeshes=0;h.run('housePreview').traverse(node=>{if(node.isMesh)previewMeshes++;});assert(previewMeshes>10,'The separate house preview retains its geometry before world-wide instancing');
 const initial=h.run('scene').children.length;
 await h.context.VietVillageMapAssets.initialize({region:h.context.VietVillageRegions.current,interior:h.run('interiorRoot')});assert.equal(h.run('scene').children.length,initial);
 let placements=0,meshBatches=0,instancedBatches=0,triangles=0;
 h.run('world').traverse(node=>{for(let p=node;p;p=p.parent)if(!p.visible)return;
  if(node.userData.assetId)placements++;
  if(node.isMesh){meshBatches++;if(node.isInstancedMesh)instancedBatches++;triangles+=(node.geometry.index?.count||node.geometry.attributes.position.count)/3*(node.isInstancedMesh?node.count:1);}
 });
 t.diagnostic(JSON.stringify({scope:'visible exterior source geometry, no GPU/frustum/shadow measurement',placements,meshBatches,instancedBatches,triangles}));
});
test('loaded assets retain NPC approaches, all house spawns, village spawns and the shared travel ring',async()=>{
 const {h}=await runtime();const g=JSON.parse(fs.readFileSync(path.join(root,'MAP/regions/lang-viet/gameplay.json'),'utf8'));
 for(const npc of [...g.npcs,...g.props])assert(h.run(`findPath({x:0,z:16.5},${JSON.stringify(npc.approach)}).length>0`),npc.id);
 assert(h.run('village.houses.every(h=>canWalk(h.x,h.z+4.4))'));
 assert(h.run('housePortalConfigs.every(h=>canWalk(h.exteriorSpawn.x,h.exteriorSpawn.z))'));
 for(const x of [0,5])assert(h.run(`canWalk(${x},16.5)`));
 for(let i=0;i<32;i++)assert(h.run(`canWalk(${Math.sin(i*Math.PI/16)*.8},${20+Math.cos(i*Math.PI/16)*.8})`));
 assert(!h.run('canWalk(-18,-6)'),'New well is solid');assert(!h.run('canWalk(18,10)'),'New cart is solid');
 h.run(`$('play').onclick();VietVillageJourney.recordMovement(3);VietVillageJourney.recordSkillUse();`);
 for(let i=0;i<5;i++){assert(h.context.VietVillageRegions.travelTo('ngoai-lang-dong-tre').ok);assert(h.context.VietVillageRegions.travelTo('lang-viet','from-dong-tre').ok);}
 for(let i=0;i<6;i++){
  h.run(`enterHouse(${i})`);assert(h.run('insideHouse&&roomCanWalk(player.position.x,player.position.z)'));
  assert(h.run('findRoomPath({x:0,z:.55},{x:0,z:2}).length>0'));h.run('leaveHouse()');assert(h.run('!insideHouse'));
 }
});
test('loaded temple steps and bridge match the collision floor height',async()=>{
 const {h}=await runtime();h.run(`world.updateMatrixWorld(true);var assetFloorMeshes=[];world.traverse(o=>{if(!o.isMesh)return;for(let p=o;p;p=p.parent)if(!p.visible)return;assetFloorMeshes.push(o);});`);
 for(const [x,z] of [[1.25,-16.55],[1.25,-15.7],[1.25,-15.3],[1.25,-14.5],[10,18],[15,18],[20,18]]){
  const error=h.run(`(()=>{const y=langVietGroundHeight(${x},${z}),ray=new THREE.Raycaster(new THREE.Vector3(${x},y+.09,${z}),new THREE.Vector3(0,-1,0));const hit=ray.intersectObjects(assetFloorMeshes,false)[0];return hit?Math.abs(y-hit.point.y):Infinity;})()`);
  assert(error<.065,`${x},${z}: model/floor mismatch ${error}`);
 }
 const actors=JSON.parse(fs.readFileSync(path.join(root,'MAP/regions/lang-viet/gameplay.json'),'utf8')).npcs;
 for(const npc of actors){const {x,y,z}=npc.position;const error=h.run(`(()=>{const ray=new THREE.Raycaster(new THREE.Vector3(${x},${y}+.12,${z}),new THREE.Vector3(0,-1,0));const hit=ray.intersectObjects(assetFloorMeshes,false)[0];return hit?Math.abs(${y}-hit.point.y):Infinity;})()`);assert(error<.07,npc.id+' ground '+error);}

});
test('a missing GLB preserves its original family while independent asset families still succeed',async()=>{
 const {h,result}=await runtime('LV_NHA_DAN_A');assert(result.errors.some(e=>e.id==='LV_NHA_DAN_A'));
 assert(h.run("world.getObjectByName('legacy-asset-house-1').visible"));assert(!h.run("world.getObjectByName('assets-3d-house-1')"));
 assert(!h.run("world.getObjectByName('legacy-asset-house-2').visible"));assert(h.run("!!world.getObjectByName('assets-3d-house-2')"));
 assert(h.run('housePortalConfigs.every(h=>canWalk(h.exteriorSpawn.x,h.exteriorSpawn.z))'));
});
test('wind preserves rooted transforms; calm resets foliage; hinge actions preserve pivots and can close again',async()=>{
 const {h}=await runtime(),api=h.context.VietVillageAssetMotion;
 const tree=(await loadModel('../MAP/models/lang-viet/LV_CAY_TRE_01.glb')).scene.clone(true),position=tree.position.clone();let leaves=[];
 tree.traverse(node=>{if(node.userData.motion==='wind')leaves.push(node);});assert(leaves.length>0);
 api.update(tree,1,.7);const first=leaves[0].rotation.z;api.update(tree,4,.7);assert.notEqual(leaves[0].rotation.z,first);assert(tree.position.equals(position));
 api.update(tree,4,0);for(const leaf of leaves)assert(leaf.rotation.equals(leaf.userData.assetBaseRotation));
 const chest=(await loadModel('../MAP/models/lang-viet/LV_RUONG_GO_01.glb')).scene.clone(true);let hinges=[];chest.traverse(node=>{if(node.userData.motion==='hinge')hinges.push(node);});assert(hinges.length>0);
 const positions=hinges.map(h=>h.position.clone());api.setHinges(chest,1);assert(hinges.some(h=>!h.rotation.equals(h.userData.assetBaseRotation)));
 const outer=new THREE.Group();outer.add(chest);api.update(outer,1,.5);
 api.setHinges(chest,0);hinges.forEach((node,i)=>{assert(node.rotation.equals(node.userData.assetBaseRotation));assert(node.position.equals(positions[i]));});
 assert(hinges.every(node=>Math.abs(node.rotation.x)+Math.abs(node.rotation.y)+Math.abs(node.rotation.z)<.001),'Outer map update must not overwrite the closed hinge rest pose');
});
test('old interior backdrop foliage stays outside the room walls and cannot protrude through a window',()=>{
 const h=createHarness(),colors=new Set([0x6f924d,0x8ba45c,0x50753a]);let checked=0;
 h.run('interiorRoot').traverse(node=>{
  if(!node.isMesh||!colors.has(node.material.color.getHex()))return;
  const points=node.geometry.attributes.position;
  for(let i=0;i<points.count;i++){
   assert(Math.abs(points.getX(i))>=4.05||Math.abs(points.getZ(i))>=3.05,'Backdrop foliage vertex intersects walkable room');checked++;
  }
 });assert(checked>0);
});
