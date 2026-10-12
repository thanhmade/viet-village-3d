'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'../..'),T=require(path.join(root,'ASSETS/vendor/three.min.js')),createHarness=require('./harness.cjs');
const load=name=>JSON.parse(fs.readFileSync(path.join(root,'MAP/regions/lang-viet',name+'.json'),'utf8'));
const config=load('gameplay').npcs.find(n=>n.role==='trainer'),file=path.resolve(root,'SOURCE-CODE',config.model.url),buffer=fs.readFileSync(file);
const json=JSON.parse(buffer.subarray(20,20+buffer.readUInt32LE(12))),clips=['bow','warm_up','box_02','front_kick_01','fold_arms'];
// Node verifies real GLB geometry, materials and animation. Only pixel decoding
// is stubbed; the browser check verifies actual JPEG/PNG decoding and WebGL.
global.THREE=T;global.self=global;global.createImageBitmap=async blob=>{
 const bytes=new Uint8Array(await blob.arrayBuffer());
 if(blob.type==='image/jpeg')assert.deepEqual([...bytes.slice(0,2)],[255,216]);
 else {assert.equal(blob.type,'image/png');assert.deepEqual([...bytes.slice(0,4)],[137,80,78,71]);}
 return {width:2048,height:2048,close(){}};
};
const loader=import(pathToFileURL(path.join(root,'ASSETS/vendor/gltf-r160/GLTFLoader.js')).href);
async function asset(bytes=buffer){const {GLTFLoader}=await loader;return new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.length),'');}
function runtime(){const c={THREE:T,console,document:{}};c.window=c;vm.createContext(c);vm.runInContext(fs.readFileSync(path.join(root,'CHARACTERS/npc-gltf.js'),'utf8'),c);return c;}
async function visual(){const gltf=await asset(),c=runtime(),v=c.createVillageNPCGLTFVisual({THREE:T,gltf,height:config.model.height,clipName:'idle',oneShots:clips,lockRootMotion:true});
 const actor=new T.Group();actor.position.set(config.position.x,config.position.y,config.position.z);actor.rotation.y=.6;v.root.position.y=config.model.groundOffset;actor.add(v.root);v.update(0);return {v,gltf,actor};}
function advance(v,seconds){for(let t=0;t<seconds;t+=.05)v.update(.05);}

test('trainer GLB contains all six exact clips and embedded base color, normal and roughness textures',()=>{
 assert.equal(buffer.toString('ascii',0,4),'glTF');assert.equal(buffer.readUInt32LE(8),buffer.length);
 assert.deepEqual(json.animations.map(a=>a.name).sort(),['idle',...clips].sort());assert.equal(json.images.length,3);assert(json.images.every(i=>i.bufferView!==undefined&&!i.uri));assert(json.buffers.every(b=>!b.uri));
 const material=json.materials[0];assert(material.normalTexture);assert(material.pbrMetallicRoughness.baseColorTexture);assert(material.pbrMetallicRoughness.metallicRoughnessTexture);
 assert.deepEqual(config.model.oneShots,clips);assert.equal(config.model.clip,'idle');assert.equal(config.model.lockRootMotion,true);
 const dialogue=load('dialogues').dialogues['vo-su'];assert.equal(dialogue.title,'Võ sư');assert.equal(dialogue.greetingClip,'bow');assert.deepEqual(dialogue.animationActions.map(a=>a.clip),clips.slice(1));assert.equal(dialogue.lines[0],'Muốn vững tay, trước hết phải vững thế. Con đã sẵn sàng luyện tập chưa?');
});

test('trainer anchor matches the actual training ground beside the existing temple and dummy',()=>{
 const h=createHarness();
 const floor=h.run(`(()=>{world.updateMatrixWorld(true);const meshes=[];world.traverse(o=>{if(o.isMesh)meshes.push(o);});const ray=new THREE.Raycaster(new THREE.Vector3(8.1,.4,-16.6),new THREE.Vector3(0,-1,0));return ray.intersectObjects(meshes,false)[0].point.y;})()`);
 assert(Math.abs(floor-(config.position.y+config.model.groundOffset))<.001);
 assert(config.position.x>6.45);assert(Math.hypot(config.position.x-10.7,config.position.z+16.4)>2.5);
 for(let i=0;i<32;i++){const a=i*Math.PI/16;assert(h.run(`langVietCanWalk(${8.1+Math.cos(a)*1.45},${-16.6+Math.sin(a)*1.45})`),'Animation clearance at '+i);}
 assert(h.run('findPath({x:0,z:16.5},{x:8.1,z:-14.6}).length>0'));
});

test('all real trainer actions play once, reject rapid input, blend back to idle, stay anchored and grounded',async()=>{
 const {v,gltf,actor}=await visual(),bounds=new T.Box3(),p=new T.Vector3();let mesh,hips;
 gltf.scene.traverse(o=>{if(o.isSkinnedMesh)mesh=o;if(o.isBone&&/Hips$/.test(o.name))hips=o;});assert(mesh&&hips);
 assert.equal(mesh.material.map.colorSpace,T.SRGBColorSpace);assert(mesh.material.normalMap.image);assert(mesh.material.roughnessMap.image);assert(mesh.material.metalnessMap.image);
 assert.equal(v.action.loop,T.LoopRepeat);assert.equal(v.action.repetitions,Infinity);assert(v.stats.footProbes<=256);
 assert(Math.abs(bounds.setFromObject(gltf.scene,true).getSize(new T.Vector3()).y-2.4)<.001);
 const anchor=hips.getWorldPosition(new T.Vector3()),position=actor.position.clone();let finished=0,loops=0;
 v.mixer.addEventListener('finished',()=>finished++);v.mixer.addEventListener('loop',()=>loops++);
 advance(v,32);assert.equal(loops,2);assert.equal(v.animationState.clip,'idle');
 for(const name of clips){
  const before=finished;assert(v.playOnce(name));for(let click=0;click<20;click++)assert.equal(v.playOnce(clips[click%clips.length]),false);
  const duration=gltf.animations.find(a=>a.name===name).duration;let returning=false;
  for(let t=0;t<duration+.6;t+=.05){
   v.update(.05);returning ||= v.animationState.phase==='returning';
   if(v.animationState.busy)assert.equal(v.playOnce('bow'),false);
   bounds.setFromObject(gltf.scene,true);assert(Math.abs(bounds.min.y-.25)<.002,name+' floor '+bounds.min.y);
   hips.getWorldPosition(p);assert(Math.hypot(p.x-anchor.x,p.z-anchor.z)<.00001,name+' drifts');
   assert(actor.position.equals(position));
  }
  assert(returning);assert.equal(finished-before,1);assert.equal(v.animationState.clip,'idle');assert.equal(v.animationState.busy,false);assert.equal(v.action.getEffectiveWeight(),1);
 }
 v.dispose();assert.equal(v.playOnce('bow'),false);
});

test('ending a demonstration fades out safely; rapid close/reopen cannot overlap actions',async()=>{
 const {v}=await visual();assert(v.playOnce('warm_up'));advance(v,.7);v.returnToIdle();assert.equal(v.animationState.phase,'returning');assert(!v.playOnce('bow'));advance(v,.4);assert.equal(v.animationState.clip,'idle');assert(v.playOnce('bow'));v.returnToIdle();v.returnToIdle();advance(v,.4);assert(v.playOnce('front_kick_01'));advance(v,3);assert.equal(v.animationState.clip,'idle');v.dispose();
});

test('missing interaction clip rejects the model explicitly instead of silently omitting an action',async()=>{
 const gltf=await asset();gltf.animations=gltf.animations.filter(a=>a.name!=='bow');assert.throws(()=>runtime().createVillageNPCGLTFVisual({THREE:T,gltf,height:2.4,clipName:'idle',oneShots:clips,lockRootMotion:true}),/bow/);
});

test('real NPC controller wires greeting, four demos and end; quests and elder remain intact',async()=>{
 const h=createHarness();h.context.VietVillageAuth.getProfile=()=>({uid:'trainer-test-only'});
 h.context.loadVillageNPCGLTF=async url=>asset(fs.readFileSync(path.resolve(root,'SOURCE-CODE',url)));
 h.context.fetch=async url=>({ok:true,json:async()=>load(/([^/]+)\.json/.exec(url)[1])});h.run("$('play').onclick()");const n=h.context.VietVillageNPCs;assert(await n.load());
 const status=id=>n.status.models.find(m=>m.id===id),trainer=()=>status(config.id),elder=()=>status('NPC_LANG_VIET_LY_TRUONG');
 assert.equal(trainer().state,'ready');assert.equal(elder().state,'ready');assert.equal(elder().animation.clip,'idle.001');
 const nodes=h.run(`regionTravel.current.root.getObjectByName('lang-viet-npcs').children.length`);
 h.run('player.position.set(8.1,.3,-14.6);VietVillageNPCs.update(.11)');assert(n.interact(config.id));
 assert.equal(trainer().animation.clip,'bow');assert.equal(h.run("$('npcDialogTitle').textContent"),'Võ sư');assert(h.run("$('npcAnimations').children.slice(0,4).every(b=>b.disabled)"));
 const end=h.run("$('npcAnimations').children.find(b=>b.id==='npc-end-conversation')");
 for(let i=0;i<70;i++)n.update(.1);assert.equal(trainer().animation.clip,'idle');
 for(const name of clips.slice(1)){
  const b=h.run(`$('npcAnimations').children.find(b=>b.id==='npc-animation-${name}')`);assert.equal(b.disabled,false);b.onclick();assert.equal(trainer().animation.clip,name);b.onclick();assert.equal(trainer().animation.clip,name);
  assert.equal(elder().animation.clip,'idle.001');for(let i=0;i<200;i++)n.update(.1);assert.equal(trainer().animation.clip,'idle');
 }
 assert.match(h.run("$('npcDemoGuidance').textContent"),/WASD/);
 h.run("$('npcAnimations').children.find(b=>b.id==='npc-animation-warm_up').onclick()");n.update(.1);
 end.onclick();assert.equal(n.isOpen(),false);assert(!h.run('overlays()'));
 assert(n.interact(config.id));assert.equal(trainer().animation.phase,'returning');
 for(let i=0;i<5;i++)n.update(.1);assert.equal(trainer().animation.clip,'bow');
 end.onclick();n.update(.1);
 h.run('player.position.set(2,.3,-10.9);VietVillageNPCs.update(.11)');assert(n.interact('NPC_LANG_VIET_LY_TRUONG'));assert.equal(h.run("$('npcDialogTitle').textContent"),'Lý trưởng');assert.equal(h.run("$('npcAnimations').children.length"),0);assert.equal(elder().animation.clip,'idle.001');n.lock();
 assert(await n.load());assert.equal(h.run(`regionTravel.current.root.getObjectByName('lang-viet-npcs').children.length`),nodes);assert.equal(n.status.count,8);n.dispose();
});
