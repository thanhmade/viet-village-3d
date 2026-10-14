'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'../..'),T=require(path.join(root,'ASSETS/vendor/three.min.js')),createHarness=require('./harness.cjs');
const load=name=>JSON.parse(fs.readFileSync(path.join(root,'MAP/regions/lang-viet',name+'.json'),'utf8'));
const config=load('gameplay').npcs.find(n=>n.role==='healer'),buffer=fs.readFileSync(path.resolve(root,'SOURCE-CODE',config.model.url));
const json=JSON.parse(buffer.subarray(20,20+buffer.readUInt32LE(12))),clips=['bow','agree'];
global.THREE=T;global.self=global;global.createImageBitmap=async blob=>{
 const bytes=new Uint8Array(await blob.arrayBuffer());
 if(blob.type==='image/jpeg')assert.deepEqual([...bytes.slice(0,2)],[255,216]);
 else{assert.equal(blob.type,'image/png');assert.deepEqual([...bytes.slice(0,4)],[137,80,78,71]);}
 return {width:2048,height:2048,close(){}};
};
const loader=import(pathToFileURL(path.join(root,'ASSETS/vendor/gltf-r160/GLTFLoader.js')).href);
async function asset(bytes=buffer){const {GLTFLoader}=await loader;return new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.length),'');}
function runtime(){const c={THREE:T,console,document:{}};c.window=c;vm.createContext(c);for(const f of ['CHARACTERS/npc-gltf.js'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),c);return c;}
function advance(n,seconds){for(let t=0;t<seconds;t+=.05)n.update(.05);}
async function game(){
 const h=createHarness();h.context.VietVillageAuth.getProfile=()=>({uid:'healer-isolated-test'});
 h.context.loadVillageNPCGLTF=async url=>asset(fs.readFileSync(path.resolve(root,'SOURCE-CODE',url)));
 h.context.fetch=async url=>({ok:true,json:async()=>{const name=/([^/]+)\.json/.exec(url)[1],value=load(name);return value;}});
 h.run("$('play').onclick()");assert(await h.context.VietVillageNPCs.load());return h;
}
const stand=h=>h.run('player.position.set(12.2,.3,4.25);VietVillageNPCs.update(.1)');
const control=(h,id)=>h.run(`$('npcAnimations').children.find(b=>b.id==='${id}')`);

test('healer GLB and skin preserve exact clips, embedded textures and sleeve bone influences',async()=>{
 assert.equal(buffer.toString('ascii',0,4),'glTF');assert.equal(buffer.readUInt32LE(8),buffer.length);
 assert.deepEqual(json.animations.map(a=>a.name).sort(),['idle',...clips].sort());assert.equal(json.images.length,3);assert(json.images.every(i=>i.bufferView!==undefined&&!i.uri));assert(json.buffers.every(b=>!b.uri));
 assert.equal(config.model.clip,'idle');assert.deepEqual(config.model.oneShots,clips);
 const gltf=await asset();let mesh;gltf.scene.traverse(o=>{if(o.isSkinnedMesh)mesh=o;});assert(mesh);
 assert(mesh.material.map.image);assert(mesh.material.normalMap.image);assert(mesh.material.roughnessMap.image);assert.equal(mesh.material.map.colorSpace,T.SRGBColorSpace);
 const armBones=mesh.skeleton.bones.map((b,i)=>/Arm|Hand/.test(b.name)?i:-1).filter(i=>i>=0);assert(armBones.length>=4);
 const weights=mesh.geometry.attributes.skinWeight,indices=mesh.geometry.attributes.skinIndex;let influenced=0;
 for(let i=0;i<weights.count;i++){let total=0;for(const c of ['X','Y','Z','W']){const w=weights['get'+c](i),b=indices['get'+c](i);assert(Number.isFinite(w));total+=w;if(w>.1&&armBones.includes(b))influenced++;}assert(Math.abs(total-1)<.001);}
 assert(influenced>100);runtime().disposeVillageNPCGLTF(gltf);
});

test('healer is at the middle right house yard with grounded feet, clear approach and unblocked entry/return spawn',()=>{
 const h=createHarness(),p=config.position;
 const design=JSON.parse(fs.readFileSync(path.join(root,'MAP/regions/lang-viet/LANG_VIET_NPC_PORTAL_DE_XUAT/DESIGN/LANG_VIET_NPC_PORTAL_DESIGN.json'),'utf8'));
 assert.match(design.npcs.find(n=>n.id===config.id).anchor,/nhà giữa dãy phải/);assert(h.run('village.houses[4].x===11&&village.houses[4].z===0'));
 const floor=h.run(`(()=>{world.updateMatrixWorld(true);const m=[];world.traverse(o=>{if(o.isMesh)m.push(o)});return new THREE.Raycaster(new THREE.Vector3(${p.x},.4,${p.z}),new THREE.Vector3(0,-1,0)).intersectObjects(m,false)[0].point.y})()`);
 assert(Math.abs(floor-p.y-config.model.groundOffset)<.001);
 const actors=h.context.mountVillageNPCs({THREE:h.context.THREE,region:h.context.VietVillageRegions.current,gameplay:load('gameplay')});
 assert(!h.run(`canWalk(${p.x},${p.z})`));assert(h.run('canWalk(11,4.4)&&canWalk(9.35,4.4)'));assert(h.run(`canWalk(${config.approach.x},${config.approach.z})`));
 const route=h.run(`findPath({x:0,z:16.5},${JSON.stringify(config.approach)})`);assert(route.length>0);
 assert(Math.hypot(p.x-11,p.z-4.4)>config.collisionRadius+.62+.32);assert(Math.hypot(config.approach.x-11,config.approach.z-4.4)>.62+.32);
 actors.dispose();
});

test('healer idle and both actions keep real geometry finite, sleeves attached, feet grounded and no root drift',async()=>{
 const gltf=await asset(),v=runtime().createVillageNPCGLTFVisual({THREE:T,gltf,height:2.4,clipName:'idle',oneShots:clips,lockRootMotion:true}),actor=new T.Group();
 actor.position.set(config.position.x,config.position.y,config.position.z);actor.rotation.y=-.7;v.root.position.y=config.model.groundOffset;actor.add(v.root);v.update(0);
 let hips,mesh;gltf.scene.traverse(o=>{if(o.isBone&&/Hips$/.test(o.name))hips=o;if(o.isSkinnedMesh)mesh=o;});
 const anchor=hips.getWorldPosition(new T.Vector3()),point=new T.Vector3(),bounds=new T.Box3();assert(Math.abs(bounds.setFromObject(gltf.scene,true).getSize(new T.Vector3()).y-2.4)<.001);
 let loops=0,finished=0;v.mixer.addEventListener('loop',()=>loops++);v.mixer.addEventListener('finished',()=>finished++);advance(v,32);assert.equal(loops,Math.floor(32/gltf.animations.find(a=>a.name==='idle').duration));
 for(const clip of clips){assert(v.playOnce(clip));const before=finished;let fade=false;
  for(let t=0;t<gltf.animations.find(a=>a.name===clip).duration+.6;t+=.05){
   if(v.animationState.busy)assert(!v.playOnce('agree'));v.update(.05);fade ||= v.animationState.phase==='returning';
   bounds.setFromObject(gltf.scene,true);assert(Math.abs(bounds.min.y-.3225)<.003,clip+' floor '+bounds.min.y);const size=bounds.getSize(new T.Vector3());assert([size.x,size.y,size.z].every(n=>Number.isFinite(n)&&n<5),'Exploding skin/sleeves');
   hips.getWorldPosition(point);assert(Math.hypot(point.x-anchor.x,point.z-anchor.z)<.00001);assert(Array.from(mesh.skeleton.boneMatrices).every(Number.isFinite));
  }
  assert(fade);assert.equal(finished-before,1);assert.equal(v.animationState.clip,'idle');assert.equal(v.action.getEffectiveWeight(),1);
 }v.dispose();
});

test('real healer changes HP once, clamps at max, updates HUD/effect and preserves progress and equipment across maps',async()=>{
 const h=await game(),n=h.context.VietVillageNPCs,j=h.context.VietVillageJourney,model=()=>n.status.models.find(m=>m.id===config.id);
 // Seed this isolated account through the legacy progression path, rather than
 // using the HP setter to replace the authoritative character level.
 h.context.localStorage.setItem('viet-village:character:v1:healer-isolated-test',JSON.stringify({schemaVersion:1,uid:'healer-isolated-test',level:7,exp:341}));
 h.context.VietVillageExperience.refresh();
 j.recordMovement(3);j.recordSkillUse();assert(j.takeDamage(63));assert.equal(j.getState().hp,37);
 assert(h.context.VietVillageWeapons.equip('sword'));
 const before=h.run('JSON.stringify(progress)'),tutorials=JSON.stringify(j.getState().tutorials),quests=JSON.stringify(n.status.quests),weapon=JSON.stringify(h.context.VietVillageWeapons.state);
 stand(h);assert(n.interact(config.id));assert.equal(model().animation.clip,'bow');assert.equal(h.run("$('npcDialogTitle').textContent"),'Thầy thuốc');
 control(h,'npc-heal').onclick();assert.equal(j.getState().hp,37,'Cannot overlap the greeting');advance(n,10);
 control(h,'npc-heal').onclick();assert.equal(j.getState().hp,100);assert.equal(model().animation.clip,'agree');assert.match(h.run("$('npcServiceStatus').textContent"),/100\/100/);
 assert.equal(h.run("$('healthBar').value"),100);assert.equal(h.run("$('healthReadout').textContent"),'100 / 100');assert(h.run("scene.getObjectByName('player-healing-effect').visible"));
 for(let i=0;i<20;i++)control(h,'npc-heal').onclick();assert.equal(j.getState().hp,100);advance(n,10);assert.equal(model().animation.clip,'idle');
 control(h,'npc-heal').onclick();assert.match(h.run("$('npcServiceStatus').textContent"),/HP đã đầy/);assert.equal(model().animation.clip,'idle');
 control(h,'npc-herbs').onclick();assert.match(h.run("$('npcServiceStatus').textContent"),/chưa mở/);assert.equal(JSON.stringify(n.status.quests),quests);
 assert.equal(h.run('JSON.stringify(progress)'),before);assert.equal(JSON.stringify(j.getState().tutorials),tutorials);assert.equal(j.getState().level,7);assert.equal(JSON.stringify(h.context.VietVillageWeapons.state),weapon);
 control(h,'npc-end-conversation').onclick();assert(!n.isOpen());assert(!h.run('overlays()'));
 const snapshot=JSON.stringify(j.getState());assert(h.context.VietVillageRegions.travelTo('ngoai-lang-dong-tre').ok);n.update(.1);assert.equal(JSON.stringify(j.getState()),snapshot);
 assert(h.context.VietVillageRegions.travelTo('lang-viet','from-dong-tre').ok);await n.load();n.update(.1);assert.equal(JSON.stringify(j.getState()),snapshot);assert.equal(n.status.count,8);
 assert(h.run("regionTravel.current.root.getObjectByName('NPC_LANG_VIET_THAY_THUOC').children.filter(c=>c.name==='npc-glb-visual').length===1"));n.dispose();
});

test('healer rejects far away, dead, stale and changed-UID input; closing cancels bow or agree immediately',async()=>{
 const h=await game(),n=h.context.VietVillageNPCs,j=h.context.VietVillageJourney,model=()=>n.status.models.find(m=>m.id===config.id);
 stand(h);j.takeDamage(40);assert(n.interact(config.id));advance(n,10);const stale=control(h,'npc-heal');
 h.run('player.position.set(0,.3,16.5)');stale.onclick();assert.equal(j.getState().hp,60);assert.match(h.run("$('npcServiceStatus').textContent"),/đứng gần/);
 stand(h);j.takeDamage(1000);stale.onclick();assert.equal(j.getState().hp,0);assert(!j.getState().alive);assert.match(h.run("$('npcServiceStatus').textContent"),/hồi sinh/);n.update(.1);assert(!n.isOpen());
 j.setCharacterState({alive:true,hp:30});assert(n.interact(config.id));advance(n,10);stale.onclick();assert.equal(j.getState().hp,30,'Old handler from same NPC must not affect new conversation');
 control(h,'npc-heal').onclick();assert.equal(model().animation.clip,'agree');control(h,'npc-end-conversation').onclick();assert(!n.isOpen());advance(n,.5);assert.equal(model().animation.clip,'idle');
 j.takeDamage(20);assert(n.interact(config.id));assert.equal(model().animation.clip,'bow');control(h,'npc-end-conversation').onclick();advance(n,.5);assert.equal(model().animation.clip,'idle');assert.equal(j.getState().hp,80);
 assert(n.interact(config.id));advance(n,10);const changed=control(h,'npc-heal');h.context.VietVillageAuth.getProfile=()=>({uid:'healer-other-isolated-test'});changed.onclick();assert.match(h.run("$('npcServiceStatus').textContent"),/Phiên đăng nhập/);n.update(.1);assert(!n.isOpen());
 assert.equal(j.getState().hp,100);changed.onclick();assert.equal(j.getState().hp,100);n.dispose();
});

test('health rejects invalid damage, cannot heal dead/signed-out, does not persist health or change tutorial storage',()=>{
 const h=createHarness(),j=h.context.VietVillageJourney;h.context.VietVillageAuth.getProfile=()=>({uid:'health-test'});j.recordMovement(3);j.recordSkillUse();
 const stored=h.context.localStorage.getItem('viet-village:journey:v1:health-test');assert(stored);
 for(const v of [0,-1,NaN,Infinity,'40',undefined])assert.equal(j.takeDamage(v),false);
 assert.equal(j.getState().hp,100);assert.equal(j.healToFull().code,'full');j.setCharacterState({hp:150});assert.equal(j.getState().hp,100);
 j.takeDamage(99.5);assert.equal(j.getState().hp,.5);assert.equal(j.healToFull().amount,99.5);j.takeDamage(100);assert.equal(j.getState().hp,0);assert.equal(j.healToFull().code,'not-alive');
 assert.equal(h.context.localStorage.getItem('viet-village:journey:v1:health-test'),stored);
 h.context.testAuthAllowed=false;assert.equal(j.healToFull().code,'signed-out');assert(!j.takeDamage(1));
});

test('all four existing NPCs still interact with exact greeting clips after adding healer',async()=>{
 const h=await game(),n=h.context.VietVillageNPCs;
 for(const [id,x,z,clip] of [['NPC_LANG_VIET_LY_TRUONG',2,-10.9,'idle.001'],['NPC_LANG_VIET_VO_SU',8.1,-14.6,'bow'],['NPC_LANG_VIET_TUAN_DINH',7.6,21.6,'greet_01'],['NPC_LANG_VIET_THAY_DO',-9.8,4.25,'bow']]){
  h.run(`player.position.set(${x},.3,${z});VietVillageNPCs.update(.1)`);assert(n.interact(id));advance(n,.5);assert.equal(n.status.models.find(m=>m.id===id).animation.clip,clip);n.lock();
 }n.dispose();
});

