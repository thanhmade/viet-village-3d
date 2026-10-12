'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'../..'),T=require(path.join(root,'ASSETS/vendor/three.min.js')),createHarness=require('./harness.cjs');
const load=name=>JSON.parse(fs.readFileSync(path.join(root,'MAP/regions/lang-viet',name+'.json'),'utf8'));
const config=load('gameplay').npcs.find(n=>n.role==='guard'),buffer=fs.readFileSync(path.resolve(root,'SOURCE-CODE',config.model.url));
const json=JSON.parse(buffer.subarray(20,20+buffer.readUInt32LE(12))),clips=['look_around','greet_01','agree'];
// Geometry/skin/animation are real; pixel decode alone is stubbed in Node.
// The localhost browser check covers texture decoding and rendering.
global.THREE=T;global.self=global;global.createImageBitmap=async blob=>{
 const bytes=new Uint8Array(await blob.arrayBuffer());
 if(blob.type==='image/jpeg')assert.deepEqual([...bytes.slice(0,2)],[255,216]);
 else{assert.equal(blob.type,'image/png');assert.deepEqual([...bytes.slice(0,4)],[137,80,78,71]);}
 return {width:2048,height:2048,close(){}};
};
const loader=import(pathToFileURL(path.join(root,'ASSETS/vendor/gltf-r160/GLTFLoader.js')).href);
async function asset(bytes=buffer){const {GLTFLoader}=await loader;return new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.length),'');}
function runtime(){const c={THREE:T,console,document:{}};c.window=c;vm.createContext(c);vm.runInContext(fs.readFileSync(path.join(root,'CHARACTERS/npc-gltf.js'),'utf8'),c);return c;}
function advance(n,seconds){for(let t=0;t<seconds;t+=.05)n.update(.05);}
async function game(){
 const h=createHarness();h.context.VietVillageAuth.getProfile=()=>({uid:'guard-isolated-test'});
 h.context.loadVillageNPCGLTF=async url=>asset(fs.readFileSync(path.resolve(root,'SOURCE-CODE',url)));
 h.context.fetch=async url=>({ok:true,json:async()=>load(/([^/]+)\.json/.exec(url)[1])});h.run("$('play').onclick()");assert(await h.context.VietVillageNPCs.load());return h;
}
const stand=h=>h.run('player.position.set(7.6,.3,21.6);VietVillageNPCs.update(.1)');
const button=(h,id)=>h.run(`$('npcAnimations').children.find(b=>b.id==='${id}')`);

test('guard GLB embeds textures and exact clips; walk remains in the source but is not a playable action',()=>{
 assert.equal(buffer.toString('ascii',0,4),'glTF');assert.equal(buffer.readUInt32LE(8),buffer.length);
 assert.deepEqual(json.animations.map(a=>a.name).sort(),['idle','walk',...clips].sort());
 assert.equal(json.images.length,3);assert(json.images.every(i=>i.bufferView!==undefined&&!i.uri));assert(json.buffers.every(b=>!b.uri));
 assert(json.materials[0].normalTexture);assert(json.materials[0].pbrMetallicRoughness.metallicRoughnessTexture);
 assert.deepEqual(config.model.oneShots,clips);assert.equal(config.model.clip,'idle');assert(config.model.lockRootMotion);
 const d=load('dialogues').dialogues['tuan-dinh'];assert.equal(d.title,'Tuần đinh');assert.equal(d.greetingClip,'greet_01');assert.equal(d.lines[0],'Chào mừng đến Làng Việt! Nếu mới tới, hãy vào sân đình gặp Lý trưởng để được hướng dẫn.');
});

test('guard position matches rendered ground inside the real gate, clears path and teleport activation',()=>{
 const h=createHarness(),p=config.position;
 const floor=h.run(`(()=>{world.updateMatrixWorld(true);const meshes=[];world.traverse(o=>{if(o.isMesh)meshes.push(o)});return new THREE.Raycaster(new THREE.Vector3(${p.x},.4,${p.z}),new THREE.Vector3(0,-1,0)).intersectObjects(meshes,false)[0].point.y})()`);
 assert(Math.abs(floor-(p.y+config.model.groundOffset))<.001);
 const gate=h.run('gateDesign');assert(p.z<gate.baseZ);assert(p.x>gate.width/2+config.collisionRadius);
 assert(Math.hypot(p.x,p.z-20)>config.collisionRadius+.8+2);
 for(let i=0;i<32;i++){const a=i*Math.PI/16;assert(h.run(`langVietCanWalk(${p.x+Math.cos(a)*.9},${p.z+Math.sin(a)*.9})`));}
 assert(h.run(`findPath({x:0,z:16.5},${JSON.stringify(config.approach)}).length>0`));
});

test('guard real clips play once, blend back and keep feet and hips anchored throughout motion and rapid input',async()=>{
 const gltf=await asset(),v=runtime().createVillageNPCGLTFVisual({THREE:T,gltf,height:2.4,clipName:'idle',oneShots:clips,lockRootMotion:true});
 const actor=new T.Group();actor.position.set(6.3,.3,22.25);actor.rotation.y=config.yaw;v.root.position.y=-.05;actor.add(v.root);v.update(0);
 let hips,mesh;gltf.scene.traverse(o=>{if(o.isBone&&/Hips$/.test(o.name))hips=o;if(o.isSkinnedMesh)mesh=o;});
 assert(mesh.material.map.image);assert(mesh.material.normalMap.image);assert(mesh.material.roughnessMap.image);assert.equal(mesh.material.map.colorSpace,T.SRGBColorSpace);
 const bounds=new T.Box3(),anchor=hips.getWorldPosition(new T.Vector3()),point=new T.Vector3();
 assert(Math.abs(bounds.setFromObject(gltf.scene,true).getSize(new T.Vector3()).y-2.4)<.001);
 assert(v.stats.footProbes<256);assert(!v.playOnce('walk'));let finished=0,loops=0;v.mixer.addEventListener('finished',()=>finished++);v.mixer.addEventListener('loop',()=>loops++);
 advance(v,32);assert.equal(loops,2);assert.equal(v.animationState.clip,'idle');
 for(const name of clips){
  assert(v.playOnce(name));const before=finished;let fading=false;
  for(let t=0;t<gltf.animations.find(a=>a.name===name).duration+.6;t+=.05){
   if(v.animationState.busy)assert(!v.playOnce('agree'));v.update(.05);fading ||= v.animationState.phase==='returning';
   bounds.setFromObject(gltf.scene,true);assert(Math.abs(bounds.min.y-.25)<.003,name+' floor '+bounds.min.y);
   hips.getWorldPosition(point);assert(Math.hypot(point.x-anchor.x,point.z-anchor.z)<.00001,name+' drifts');
   assert.deepEqual(actor.position.toArray(),[6.3,.3,22.25]);
  }
  assert(fading);assert.equal(finished-before,1);assert.equal(v.animationState.clip,'idle');assert.equal(v.action.getEffectiveWeight(),1);
 }
 v.dispose();
});

test('ambient guard pauses during menus/other maps, yields to greeting, rejects repeated agree and routes to actual elder',async()=>{
 const h=await game(),n=h.context.VietVillageNPCs,guard=()=>n.status.models.find(m=>m.id===config.id),elder=()=>n.status.models.find(m=>m.id==='NPC_LANG_VIET_LY_TRUONG');
 stand(h);assert.equal(guard().state,'ready');assert.equal(guard().animation.clip,'idle');
 n.openDirectory();advance(n,40);assert.equal(guard().animation.clip,'idle');n.lock();
 // Find the first randomly scheduled look in the configured 18–30 second window.
 let waited=0;while(guard().animation.clip==='idle'&&waited<31){n.update(.1);waited+=.1;}
 assert(waited>=17.8&&waited<=30.2);assert.equal(guard().animation.clip,'look_around');
 assert(n.interact(config.id));assert.equal(guard().animation.phase,'returning');advance(n,.5);assert.equal(guard().animation.clip,'greet_01');
 const agree=button(h,'npc-animation-agree');assert(agree.disabled);agree.onclick();assert.equal(guard().animation.clip,'greet_01');advance(n,4);assert(!agree.disabled);
 agree.onclick();assert.equal(guard().animation.clip,'agree');for(let i=0;i<20;i++)agree.onclick();advance(n,5);assert.equal(guard().animation.clip,'idle');advance(n,40);assert.equal(guard().animation.clip,'idle','No ambient during conversation');
 h.run("$('npcActions').children.find(b=>b.id==='npc-action-elder-location').onclick()");assert.match(h.run("$('npcRouteStatus').textContent"),/sân đình/);
 const destination=load('gameplay').npcs.find(n=>n.role==='elder').approach;
 h.run("$('npcRouteStatus').children.find(b=>b.id==='npc-route-elder').onclick()");assert(!n.isOpen());assert(h.run('target'));const last=h.run('waypoints.at(-1)');assert(Math.hypot(last.x-destination.x,last.z-destination.z)<.01);
 assert.equal(elder().animation.clip,'idle.001');stand(h);assert(n.interact(config.id));advance(n,4);button(h,'npc-end-conversation').onclick();assert(!n.isOpen());assert(!h.run('overlays()'));
 h.run('VietVillageJourney.recordMovement(3);VietVillageJourney.recordSkillUse()');assert(h.context.VietVillageRegions.travelTo('ngoai-lang-dong-tre').ok);advance(n,40);assert.equal(guard().animation.clip,'idle');
 assert(h.context.VietVillageRegions.travelTo('lang-viet','from-dong-tre').ok);advance(n,.1);await n.load();assert.equal(n.status.count,8);assert(h.run("regionTravel.current.root.getObjectByName('NPC_LANG_VIET_TUAN_DINH').children.filter(c=>c.name==='npc-glb-visual').length===1"));
 // Regression: elder and trainer interactions still use their original clips.
 h.run('player.position.set(2,.31,-10.9);VietVillageNPCs.update(.1)');assert(n.interact('NPC_LANG_VIET_LY_TRUONG'));assert.equal(elder().animation.clip,'idle.001');n.lock();
 h.run('player.position.set(8.1,.3,-14.6);VietVillageNPCs.update(.1)');assert(n.interact('NPC_LANG_VIET_VO_SU'));assert.equal(n.status.models.find(m=>m.id==='NPC_LANG_VIET_VO_SU').animation.clip,'bow');n.dispose();
});
