'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'../..'),T=require(path.join(root,'ASSETS/vendor/three.min.js')),createHarness=require('./harness.cjs');
const load=name=>JSON.parse(fs.readFileSync(path.join(root,'MAP/regions/lang-viet',name+'.json'),'utf8'));
const config=load('gameplay').npcs.find(n=>n.role==='farmer'),buffer=fs.readFileSync(path.resolve(root,'SOURCE-CODE',config.model.url));
const json=JSON.parse(buffer.subarray(20,20+buffer.readUInt32LE(12))),clips=['greet_01','agree'];
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
async function game(questFixture){
 const h=createHarness();h.context.VietVillageAuth.getProfile=()=>({uid:'farmer-isolated-test'});
 h.context.loadVillageNPCGLTF=async url=>asset(fs.readFileSync(path.resolve(root,'SOURCE-CODE',url)));
 h.context.fetch=async url=>({ok:true,json:async()=>{const name=/([^/]+)\.json/.exec(url)[1],value=load(name);if(name==='quests'&&questFixture)questFixture(value);return value;}});
 h.run("$('play').onclick()");assert(await h.context.VietVillageNPCs.load());return h;
}
const stand=h=>h.run('player.position.set(-7,.3,18.6);VietVillageNPCs.update(.1)');
const control=(h,id)=>h.run(`$('npcAnimations').children.find(b=>b.id==='${id}')`);


const questControl=(h,id)=>h.run("$('npcQuests').children.flatMap(row=>row.children).find(b=>b.id==='"+id+"')");
// Test-only narrative fixture exercises existing journal transitions, NOT garden
// item collection or rewards. Production QUEST_LV_03 stays disabled.
function narrativeFixture(data){Object.assign(data.quests.find(q=>q.id==='QUEST_LV_03'),{enabled:true,dependsOn:[],objective:{type:'talk',npcId:'NPC_LANG_VIET_LY_TRUONG'}});}

test('farmer GLB has exact idle/greet/agree/dig clips and embedded textured skin; dig stays disabled',async()=>{
 assert.equal(buffer.toString('ascii',0,4),'glTF');assert.equal(buffer.readUInt32LE(8),buffer.length);
 assert.deepEqual(json.animations.map(a=>a.name).sort(),['idle','dig',...clips].sort());assert.equal(json.images.length,3);assert(json.images.every(i=>i.bufferView!==undefined&&!i.uri));assert(json.buffers.every(b=>!b.uri));
 assert.equal(config.model.clip,'idle');assert.deepEqual(config.model.oneShots,clips);assert.equal(config.model.deferredClips.dig.enabled,false);assert.equal(config.model.ambient,undefined);
 const gltf=await asset();let mesh;gltf.scene.traverse(o=>{if(o.isSkinnedMesh)mesh=o;});assert(mesh);
 assert(mesh.material.map.image);assert(mesh.material.normalMap.image);assert(mesh.material.roughnessMap.image);assert.equal(mesh.material.map.colorSpace,T.SRGBColorSpace);
 const weights=mesh.geometry.attributes.skinWeight;for(let i=0;i<weights.count;i++){let total=0;for(const c of ['X','Y','Z','W']){const w=weights['get'+c](i);assert(Number.isFinite(w));total+=w;}assert(Math.abs(total-1)<.001);}
 runtime().disposeVillageNPCGLTF(gltf);
});

test('farmer stands outside the actual vegetable beds/fence with grounded feet, reachable path and clear garden entrance',()=>{
 const h=createHarness(),p=config.position;
 const design=JSON.parse(fs.readFileSync(path.join(root,'MAP/regions/lang-viet/LANG_VIET_NPC_PORTAL_DE_XUAT/DESIGN/LANG_VIET_NPC_PORTAL_DESIGN.json'),'utf8'));
 assert.match(design.npcs.find(n=>n.id===config.id).anchor,/Lối vào vườn rau bên trái cổng/);assert.notDeepEqual([p.x,p.z],design.npcs.find(n=>n.id===config.id).schematic);
 assert(p.x-config.collisionRadius>-9.5,'Entire NPC stays east of the garden fence, outside all planted rows');assert(p.z-config.collisionRadius>17.25,'Leave the existing garden entrance open');
 const floor=h.run('(()=>{world.updateMatrixWorld(true);const meshes=[];world.traverse(o=>{if(o.isMesh)meshes.push(o)});return new THREE.Raycaster(new THREE.Vector3('+[p.x,p.y+.05,p.z].join(',')+'),new THREE.Vector3(0,-1,0)).intersectObjects(meshes,false)[0].point.y})()');
 assert(Math.abs(floor-p.y-config.model.groundOffset)<.001);
 const actors=h.context.mountVillageNPCs({THREE:h.context.THREE,region:h.context.VietVillageRegions.current,gameplay:load('gameplay')});
 assert(!h.run('canWalk('+p.x+','+p.z+')'));assert(h.run('canWalk(-9.5,16.4)&&canWalk(-11,14.4)&&canWalk(-12.65,14.4)'));
 assert(h.run('findPath({x:0,z:21},'+JSON.stringify(config.approach)+').length>0'));
 assert(h.run('VietVillageRegions.current.manualPortals.every(p=>canWalk(p.x,p.z))'));actors.dispose();
});

test('farmer real idle and one-shots stay grounded and anchored, blend smoothly and never auto-play dig',async()=>{
 const gltf=await asset(),v=runtime().createVillageNPCGLTFVisual({THREE:T,gltf,height:2.4,clipName:'idle',oneShots:clips,lockRootMotion:true,footProbeRatio:config.model.footProbeRatio}),actor=new T.Group();
 actor.position.set(config.position.x,config.position.y,config.position.z);actor.rotation.y=config.yaw;v.root.position.y=config.model.groundOffset;actor.add(v.root);v.update(0);
 let hips,mesh;gltf.scene.traverse(o=>{if(o.isBone&&/Hips$/.test(o.name))hips=o;if(o.isSkinnedMesh)mesh=o;});
 const anchor=hips.getWorldPosition(new T.Vector3()),point=new T.Vector3(),bounds=new T.Box3();assert(Math.abs(bounds.setFromObject(gltf.scene,true).getSize(new T.Vector3()).y-2.4)<.001);
 let loops=0,finished=0;v.mixer.addEventListener('loop',()=>loops++);v.mixer.addEventListener('finished',()=>finished++);advance(v,32);assert.equal(loops,2);assert(!v.playOnce('dig'));
 for(const clip of clips){assert(v.playOnce(clip));const before=finished;let fade=false;
  for(let t=0;t<gltf.animations.find(a=>a.name===clip).duration+.6;t+=.05){
   if(v.animationState.busy)assert(!v.playOnce('agree'));v.update(.05);fade ||= v.animationState.phase==='returning';
   bounds.setFromObject(gltf.scene,true);assert(Math.abs(bounds.min.y-.26)<.003,clip+' floor '+bounds.min.y);const size=bounds.getSize(new T.Vector3());assert([size.x,size.y,size.z].every(n=>Number.isFinite(n)&&n<5));
   hips.getWorldPosition(point);assert(Math.hypot(point.x-anchor.x,point.z-anchor.z)<.00001);assert(Array.from(mesh.skeleton.boneMatrices).every(Number.isFinite));
  }
  assert(fade);assert.equal(finished-before,1);assert.equal(v.animationState.clip,'idle');assert.equal(v.action.getEffectiveWeight(),1);
 }advance(v,65);assert.equal(v.animationState.clip,'idle');assert(!v.playOnce('dig'));v.dispose();
});

test('farmer references deferred QUEST_LV_03 honestly; repeated help never accepts, collects or rewards',async()=>{
 const h=await game(),n=h.context.VietVillageNPCs,model=()=>n.status.models.find(m=>m.id===config.id);stand(h);
 assert.match(h.run("$('npcInteractBtn').textContent"),/Nói chuyện · Nông dân/);assert(n.interact(config.id));
 assert.equal(h.run("$('npcDialogTitle').textContent"),'Nông dân');assert.equal(model().animation.clip,'greet_01');
 assert.equal(h.run("$('npcDialogueLines').children[0].textContent"),'Chào cháu! Vườn hôm nay có nhiều việc. Cháu có muốn giúp ta một tay không?');
 assert.deepEqual(Array.from(h.run("$('npcAnimations').children.map(b=>b.textContent)")),['Có việc gì cần giúp?','Hỏi cách thu thập','Kết thúc']);assert.equal(h.run("$('npcQuests').children.length"),0);
 assert.match(h.run("$('npcServiceStatus').textContent"),/Giúp việc vườn · Chưa mở/);
 const snapshot=()=>h.run('JSON.stringify({progress,journey:playerJourney.getState(),equipment:VietVillageWeapons.state,userData:player.userData,quests:VietVillageNPCs.status.quests})');
 const before=snapshot();let writes=0;const save=h.context.localStorage.setItem;h.context.localStorage.setItem=(...args)=>{writes++;save(...args);};
 for(let i=0;i<20;i++)control(h,'npc-quest-help').onclick();assert.match(h.run("$('npcServiceStatus').textContent"),/còn thiếu mã vật phẩm, số lượng/);
 for(let i=0;i<20;i++)control(h,'npc-gathering-help').onclick();assert.match(h.run("$('npcServiceStatus').textContent"),/chưa thể nhặt hay nộp vật phẩm/);
 assert.equal(snapshot(),before);assert.equal(writes,0);advance(n,4);assert.equal(model().animation.clip,'idle');assert.equal(n.status.quests.QUEST_LV_03,undefined);
 assert(!questControl(h,'finish-QUEST_LV_03'));control(h,'npc-end-conversation').onclick();assert(!n.isOpen());assert(!h.run('overlays()'));n.dispose();
});

test('close during greeting; stale, far and changed-UID help cannot affect the new conversation',async()=>{
 const h=await game(),n=h.context.VietVillageNPCs,model=()=>n.status.models.find(m=>m.id===config.id);stand(h);assert(n.interact(config.id));
 const stale=control(h,'npc-gathering-help');control(h,'npc-end-conversation').onclick();assert(!n.isOpen());advance(n,.5);assert.equal(model().animation.clip,'idle');
 assert(n.interact(config.id));const original=h.run("$('npcServiceStatus').textContent");stale.onclick();assert.equal(h.run("$('npcServiceStatus').textContent"),original);
 h.run('player.position.set(0,.3,21)');control(h,'npc-gathering-help').onclick();assert.equal(h.run("$('npcServiceStatus').textContent"),original);
 stand(h);h.context.VietVillageAuth.getProfile=()=>({uid:'farmer-other-test'});control(h,'npc-gathering-help').onclick();assert.equal(h.run("$('npcServiceStatus').textContent"),original);n.update(.1);assert(!n.isOpen());n.dispose();
});

test('existing journal success triggers one agree, ready-only turn-in and duplicate rejection using a test-only narrative fixture',async()=>{
 const h=await game(narrativeFixture),n=h.context.VietVillageNPCs,model=()=>n.status.models.find(m=>m.id===config.id);stand(h);assert(n.interact(config.id));
 let writes=0;const save=h.context.localStorage.setItem;h.context.localStorage.setItem=(...args)=>{writes++;save(...args);};
 const accept=questControl(h,'accept-QUEST_LV_03');assert(accept);assert(!questControl(h,'finish-QUEST_LV_03'));
 for(let i=0;i<20;i++)accept.onclick();assert.equal(n.status.quests.QUEST_LV_03,'active');assert.equal(writes,1);assert.equal(model().animation.clip,'greet_01');advance(n,4);assert.equal(model().animation.clip,'agree');advance(n,4.6);assert.equal(model().animation.clip,'idle');assert(!questControl(h,'finish-QUEST_LV_03'));
 n.lock();h.run('player.position.set(2,.3,-10.9);VietVillageNPCs.update(.1)');assert(n.interact('NPC_LANG_VIET_LY_TRUONG'));assert.equal(n.status.quests.QUEST_LV_03,'ready');assert.equal(writes,2);n.lock();stand(h);assert(n.interact(config.id));
 const finish=questControl(h,'finish-QUEST_LV_03');assert.equal(finish.textContent,'Trả nhiệm vụ');for(let i=0;i<20;i++)finish.onclick();assert.equal(n.status.quests.QUEST_LV_03,'completed');assert.equal(writes,3);assert(!questControl(h,'finish-QUEST_LV_03'));
 advance(n,4);assert.equal(model().animation.clip,'agree');advance(n,4.6);assert.equal(model().animation.clip,'idle');assert.equal(writes,3);assert.equal(h.run('progress.score'),0);
 control(h,'npc-end-conversation').onclick();assert(!n.isOpen());finish.onclick();assert.equal(writes,3);n.dispose();
 // The deployed data must remain disabled and must not invent a reward/item.
 const q=load('quests');assert.equal(q.itemRewardsEnabled,false);assert.equal(q.currencyRewardsEnabled,false);assert.equal(q.quests.find(q=>q.id==='QUEST_LV_03').enabled,false);
});

test('quest callback guards reject wrong NPC, old conversation, changed UID, death and distance; close discards pending agree',async()=>{
 const h=await game(narrativeFixture),n=h.context.VietVillageNPCs;stand(h);assert(n.interact(config.id));const old=questControl(h,'accept-QUEST_LV_03');n.lock();stand(h);assert(n.interact(config.id));old.onclick();assert.equal(n.status.quests.QUEST_LV_03,undefined);
 const accept=questControl(h,'accept-QUEST_LV_03');h.run('player.position.set(0,.3,21)');accept.onclick();assert.equal(n.status.quests.QUEST_LV_03,undefined);
 stand(h);h.context.VietVillageAuth.getProfile=()=>({uid:'other-quest-profile'});accept.onclick();assert.equal(n.status.quests.QUEST_LV_03,undefined);h.context.VietVillageAuth.getProfile=()=>({uid:'farmer-isolated-test'});
 h.run('VietVillageJourney.setCharacterState({alive:false})');accept.onclick();assert.equal(n.status.quests.QUEST_LV_03,undefined);h.run('VietVillageJourney.setCharacterState({alive:true})');
 accept.onclick();assert.equal(n.status.quests.QUEST_LV_03,'active');control(h,'npc-end-conversation').onclick();advance(n,5);assert.equal(n.status.models.find(m=>m.id===config.id).animation.clip,'idle');n.dispose();
});

test('returning to village preserves one farmer and all seven existing NPCs still interact',async()=>{
 const h=await game(),n=h.context.VietVillageNPCs;h.run('VietVillageJourney.recordMovement(3);VietVillageJourney.recordSkillUse()');
 const before=h.run('JSON.stringify(VietVillageJourney.getState())');assert(h.context.VietVillageRegions.travelTo('ngoai-lang-dong-tre').ok);n.update(.1);assert(!n.interact(config.id));assert(h.context.VietVillageRegions.travelTo('lang-viet','from-dong-tre').ok);await n.load();n.update(.1);assert.equal(n.status.count,8);assert.equal(h.run('JSON.stringify(VietVillageJourney.getState())'),before);
 assert(h.run("regionTravel.current.root.getObjectByName('NPC_LANG_VIET_NONG_DAN').children.filter(c=>c.name==='npc-glb-visual').length===1"));
 for(const [id,x,y,z,clip] of [['NPC_LANG_VIET_LY_TRUONG',2,.3,-10.9,'idle.001'],['NPC_LANG_VIET_VO_SU',8.1,.3,-14.6,'bow'],['NPC_LANG_VIET_TUAN_DINH',7.6,.3,21.6,'greet_01'],['NPC_LANG_VIET_THAY_DO',-9.8,.3,4.25,'bow'],['NPC_LANG_VIET_THAY_THUOC',12.2,.3,4.25,'bow'],['NPC_LANG_VIET_THO_REN',-9.8,.56,14.4,'greet_01'],['NPC_LANG_VIET_TAP_HOA',12.2,.36,14.4,'greet_01']]){
  h.run('player.position.set('+[x,y,z].join(',')+');VietVillageNPCs.update(.1)');assert(n.interact(id));advance(n,.5);assert.equal(n.status.models.find(m=>m.id===id).animation.clip,clip);n.lock();
 }n.dispose();
});

test('missing farmer model keeps fallback, helpful error and close; persisted deferred completion cannot unlock turn-in',async()=>{
 const h=createHarness();h.context.VietVillageAuth.getProfile=()=>({uid:'farmer-error-test'});h.context.localStorage.setItem('viet-village:quests:lang-viet:v1:farmer-error-test',JSON.stringify({QUEST_LV_03:'ready'}));
 h.context.loadVillageNPCGLTF=async url=>{if(url===config.model.url)throw Error('HTTP 404');return asset(fs.readFileSync(path.resolve(root,'SOURCE-CODE',url)));};
 h.context.fetch=async url=>({ok:true,json:async()=>load(/([^/]+)\.json/.exec(url)[1])});h.run("$('play').onclick()");const n=h.context.VietVillageNPCs;await n.load();stand(h);assert(n.interact(config.id));
 assert.equal(n.status.models.find(m=>m.id===config.id).state,'error');assert.match(h.run("$('npcAnimationStatus').textContent"),/Chưa tải được mô hình Nông dân/);assert(!questControl(h,'finish-QUEST_LV_03'));assert.equal(n.status.quests.QUEST_LV_03,undefined);
 control(h,'npc-quest-help').onclick();assert.match(h.run("$('npcServiceStatus').textContent"),/Chưa mở/);control(h,'npc-end-conversation').onclick();assert(!n.isOpen());n.dispose();
});
