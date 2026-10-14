'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
const createHarness=require('./harness.cjs'),root=path.resolve(__dirname,'../..'),THREE=require(path.join(root,'ASSETS/vendor/three.min.js'));
global.THREE=THREE;global.self=global;global.ProgressEvent=class{constructor(type,detail){Object.assign(this,{type},detail);}};
// Headless loader validates embedded PNG headers; browser checks actual pixels.
global.createImageBitmap=async blob=>{const b=Buffer.from(await blob.arrayBuffer());assert.equal(b.subarray(0,8).toString('hex'),'89504e470d0a1a0a');return {width:b.readUInt32BE(16),height:b.readUInt32BE(20),close(){}};};
const loaderPromise=import(pathToFileURL(path.join(root,'ASSETS/vendor/gltf-r160/GLTFLoader.js')).href),cache=new Map();
const catalog=()=>JSON.parse(fs.readFileSync(path.join(root,'MAP/regions/lang-viet/assets-3d.json'),'utf8'));
async function loadModel(url){
 const file=path.resolve(root,'SOURCE-CODE',url);assert(file.startsWith(root+path.sep));
 if(!cache.has(file))cache.set(file,(async()=>{const data=fs.readFileSync(file),{GLTFLoader}=await loaderPromise;return new GLTFLoader().parseAsync(data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength),'');})());
 return cache.get(file);
}
async function runtime({fail=false,missingClip=false,mobile=false}={}){
 const h=createHarness(),notices=[],requests=[];if(mobile)h.context.innerWidth=390;
 h.context.fetch=async()=>({ok:true,json:async()=>catalog()});
 const result=await h.context.VietVillageMapAssets.initialize({region:h.context.VietVillageRegions.current,interior:h.run('interiorRoot'),notify:message=>notices.push(message),load:async url=>{
  requests.push(url);if(fail&&url.includes('LV_AO_SEN_01_3D'))throw new Error('HTTP 404 test');
  const gltf=await loadModel(url);return missingClip&&url.includes('LV_AO_SEN_01_3D')?{...gltf,animations:gltf.animations.filter(c=>c.name!=='WIND_STRONG')}:gltf;
 }});
 return {h,notices,requests,result,pond:h.run("world.getObjectByName('assets-3d-pond')")};
}
test('imported pond preserves its named animated hierarchy through static batching and has one lotus set',async()=>{
 const {h,result,pond}=await runtime();assert.equal(result.errors.length,0);assert(pond);
 const instance=pond.children.find(o=>o.userData.assetId==='LV_AO_SEN_01');assert(instance?.userData.assetAnimated);
 const water=instance.getObjectByName('WATER_SURFACE');assert(water?.isMesh&&!water.isInstancedMesh);assert.equal(water.morphTargetInfluences.length,2);
 const imported=await loadModel(catalog().assets.find(a=>a.id==='LV_AO_SEN_01').url);
 for(const clip of imported.animations)for(const track of clip.tracks){const parsed=THREE.PropertyBinding.parseTrackName(track.name);assert(instance.getObjectByName(parsed.nodeName),track.name+' target lost');}
 assert(!pond.children.some(o=>o.userData.assetId==='LV_CUM_SEN_01'),'Imported pond already contains its lotus');
 assert(!h.run("world.getObjectByName('legacy-asset-pond').visible"));
 assert(h.context.VietVillageMapAssets.status.pond.ready);assert(h.context.VietVillageMapAssets.status.pond.url.includes('LV_AO_SEN_01_3D'));
 const before=water.parent;h.run("bakeStatic(world.getObjectByName('assets-3d-pond'))");assert.equal(water.parent,before,'Legacy bake must also preserve animation');
});
test('pond helper never restarts unchanged wind/water, restores calm and disposes only its cloned animation state',async()=>{
 const h=createHarness(),gltf=await loadModel(catalog().assets.find(a=>a.id==='LV_AO_SEN_01').url),clone=gltf.scene.clone(true),initial=clone.position.clone();
 const animator=h.context.createPondAnimator(THREE,clone,gltf.animations),water=clone.getObjectByName('WATER_SURFACE'),rest=water.morphTargetInfluences.slice();
 animator.setWater(true);animator.setWind('light');animator.update(.07);
 const light=animator.mixer.clipAction(THREE.AnimationClip.findByName(gltf.animations,'WIND_LIGHT')),time=light.time;
 animator.setWind('light');animator.setWater(true);animator.update(.05);assert(light.time>time,'Repeated wind setting restarted clip');assert.notDeepEqual(water.morphTargetInfluences,rest);
 animator.setWind('strong');assert.equal(light.isRunning(),false);assert.equal(animator.state.wind,'strong');
 animator.setWind('none');assert(clone.position.equals(initial));animator.setWater(false);assert.deepEqual(water.morphTargetInfluences,rest);
 let disposed=0;water.geometry.addEventListener('dispose',()=>disposed++);animator.dispose();animator.dispose();assert.equal(disposed,0,'Shared GLB resources must survive preview/game disposal');
 assert.equal(animator.state.disposed,true);
});
test('only the terrain below the successfully imported water is cut; basin is visible beneath the transparent water',async()=>{
 const {h}=await runtime(),terrain=[];h.run('world').traverse(node=>{if(node.userData.assetTerrain)terrain.push(node);});assert.equal(terrain.length,2);assert(terrain.every(m=>m.userData.pondCut));
 h.run('world').updateMatrixWorld(true);const ray=new THREE.Raycaster(new THREE.Vector3(15,2,19),new THREE.Vector3(0,-1,0));
 assert.equal(ray.intersectObjects(terrain,false).length,0,'Grass/earth still lies in water basin');
 ray.set(new THREE.Vector3(8,2,22),new THREE.Vector3(0,-1,0));assert(ray.intersectObjects(terrain,false).some(hit=>Math.abs(hit.point.y-.25)<.001),'Terrain outside pond changed');
 const pond=h.run("world.getObjectByName('assets-3d-pond')"),earth=pond.getObjectByName('EARTH_BANK');assert(earth);
 ray.set(new THREE.Vector3(15,2,19),new THREE.Vector3(0,-1,0));assert(ray.intersectObject(earth,false).some(hit=>hit.point.y<.25),'Supplied bed was lost');
});
test('new water collider keeps bridge, nearby NPC approaches, house spawns and existing MAP travel intact',async()=>{
 const {h}=await runtime(),api=h.context.VietVillageMapAssets;assert.equal(api.pondContainsWater(15,19),true);assert.equal(h.run('canWalk(15,19)'),false);
 for(let x=8.4;x<=21.6;x+=.2)assert(h.run(`canWalk(${x},18)`),'Bridge at '+x);
 for(const [x,z] of [[13.05,14.25],[12.2,14.4],[9.35,14.4],[6.3,22.25],[7.6,21.6]])assert(h.run(`canWalk(${x},${z})`),x+','+z);
 const g=JSON.parse(fs.readFileSync(path.join(root,'MAP/regions/lang-viet/gameplay.json'),'utf8'));
 for(const npc of g.npcs)assert(h.run(`findPath({x:0,z:16.5},${JSON.stringify(npc.approach)}).length>0`),npc.id);
 assert(h.run('housePortalConfigs.every(h=>canWalk(h.exteriorSpawn.x,h.exteriorSpawn.z))'));
 h.run("$('play').onclick();VietVillageJourney.recordMovement(3);VietVillageJourney.recordSkillUse();");
 for(let i=0;i<5;i++){assert(h.context.VietVillageRegions.travelTo('ngoai-lang-dong-tre').ok);assert(h.context.VietVillageRegions.travelTo('lang-viet','from-dong-tre').ok);}
});
test('failed imported pond reports its exact URL, keeps old scene explicitly, and does not cut terrain',async()=>{
 const {h,result,notices,pond}=await runtime({fail:true});assert.equal(pond,undefined);assert(result.errors.some(e=>e.id==='LV_AO_SEN_01'));
 assert(h.run("world.getObjectByName('legacy-asset-pond').visible"));assert.equal(h.context.VietVillageMapAssets.status.pond.ready,false);
 assert(notices.some(text=>text.includes('LV_AO_SEN_01_3D')&&text.includes('Đang giữ cảnh ao trước đó')));
 h.run('world').traverse(node=>{if(node.userData.assetTerrain)assert(!node.userData.pondCut);});
});
test('missing exact imported animation rejects integration instead of silently presenting a static replacement',async()=>{
 const {h,result}=await runtime({missingClip:true});assert(result.errors.some(e=>e.message.includes('WIND_STRONG')));assert.equal(h.context.VietVillageMapAssets.status.pond.ready,false);
});
test('mobile selects supplied LOD1 with the same geometry placement and actual animations',async()=>{
 const {h,result,requests,pond}=await runtime({mobile:true});assert.equal(result.errors.length,0);assert(requests.some(url=>url.endsWith('LV_AO_SEN_01_LOD1.glb')));
 assert(h.context.VietVillageMapAssets.status.pond.url.endsWith('LV_AO_SEN_01_LOD1.glb'));
 assert(pond.getObjectByName('WATER_SURFACE').morphTargetInfluences.length===2);
 h.context.VietVillageMapAssets.update(1,{rain:0,wet:0},true);h.context.VietVillageMapAssets.update(1.08,{rain:1,wet:.8},true);
 assert.equal(h.context.VietVillageMapAssets.status.pond.wind,'strong');
});
test('pond camera preserves the actor; local check routes use normal walking instead of teleporting',async()=>{
 const {h}=await runtime();h.run("$('play').onclick()");
 const before=h.run('player.position.clone()');assert.equal(h.run("$('pondBtn').onclick()"),true);assert(h.run('player.position').equals(before));
 assert.equal(h.run('sceneryFocus.x'),15);assert.equal(h.run('sceneryFocus.z'),18);assert.equal(h.run('sceneryRadius'),14);
 assert.equal(h.run('pondChecks'),null,'Normal URLs must not create local diagnostic UI');
 assert(h.run("walkPondRoute([{x:8.2,z:18},{x:21.8,z:18}],'test east')"));assert(h.run('player.position').equals(before),'Scheduling route must not teleport');
 let frame=0;while(h.run('!!target')&&frame<1400){frame++;h.run(`tick(${frame*33})`);}
 assert(frame<1400,'Walk route failed to finish');assert(Math.hypot(h.run('player.position.x')-21.8,h.run('player.position.z')-18)<.3);
 assert(h.run("walkPondRoute([{x:21.8,z:18},{x:8.2,z:18}],'test west')"));
 while(h.run('!!target')&&frame<2800){frame++;h.run(`tick(${frame*33})`);}
 assert(frame<2800);assert(Math.hypot(h.run('player.position.x')-8.2,h.run('player.position.z')-18)<.3);
 assert(h.run('canWalk(player.position.x,player.position.z)'));
 h.run('enterHouse(4)');const inside=h.run('insideHouse');assert.equal(h.run("$('pondBtn').onclick()"),false);assert.equal(h.run('insideHouse'),inside);
});
test('measured convex bank rocks block their actual footprints in both GLBs while NPC approaches and bridge stay clear',async()=>{
 for(const mobile of [false,true]){
  const {h}=await runtime({mobile}),api=h.context.VietVillageMapAssets,asset=catalog().assets.find(a=>a.id==='LV_AO_SEN_01');
  const placement=h.context.VietVillageAssetPlacements.groups.find(g=>g.id==='pond').placements.find(p=>p.id===asset.id),rocks=asset.bankColliders[mobile?'lod1':'main'];
  assert.equal(rocks.length,49);assert.equal(api.status.pond.bankColliders,49);let checked=0;
  for(const rock of rocks){
   const center=rock.hull.reduce((sum,p)=>[sum[0]+p[0]/rock.hull.length,sum[1]+p[1]/rock.hull.length],[0,0]),c=Math.cos(placement.yaw),s=Math.sin(placement.yaw);
   const x=placement.position[0]+placement.scale*(c*center[0]+s*center[1]),z=placement.position[2]+placement.scale*(-s*center[0]+c*center[1]);
   if(Math.abs(z-18)<.8&&x>=8.3&&x<=21.7)assert(api.canWalk(x,z),'Bridge must override a bank rock beneath its deck');
   else{assert.equal(api.canWalk(x,z),false,'Rock '+rock.id+' must block at '+x+','+z);checked++;}
   assert(api.canWalk(x,z,true),'Outdoor rock must not affect a house interior');
  }
  assert(checked>30);for(const [x,z] of [[13.05,14.25],[12.2,14.4],[8.2,18],[21.8,18],[15,23],[20,23]])assert(h.run(`canWalk(${x},${z})`),x+','+z);
 }
});
