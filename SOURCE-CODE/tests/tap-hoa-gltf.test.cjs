'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'../..'),T=require(path.join(root,'ASSETS/vendor/three.min.js')),createHarness=require('./harness.cjs');
const load=name=>JSON.parse(fs.readFileSync(path.join(root,'MAP/regions/lang-viet',name+'.json'),'utf8'));
const config=load('gameplay').npcs.find(n=>n.role==='merchant'),buffer=fs.readFileSync(path.resolve(root,'SOURCE-CODE',config.model.url));
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
async function game(){
 const h=createHarness();h.context.VietVillageAuth.getProfile=()=>({uid:'merchant-isolated-test'});
 h.context.loadVillageNPCGLTF=async url=>asset(fs.readFileSync(path.resolve(root,'SOURCE-CODE',url)));
 h.context.fetch=async url=>({ok:true,json:async()=>{const name=/([^/]+)\.json/.exec(url)[1],value=load(name);return value;}});
 h.run("$('play').onclick()");assert(await h.context.VietVillageNPCs.load());return h;
}
const stand=h=>h.run('player.position.set(12.2,.36,14.4);VietVillageNPCs.update(.1)');
const control=(h,id)=>h.run(`$('npcAnimations').children.find(b=>b.id==='${id}')`);

test('merchant GLB and skin preserve exact clips, embedded textures and sleeve bone influences',async()=>{
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

test('merchant is at the front right house yard with grounded feet, clear approach and unblocked entry/return spawn',()=>{
 const h=createHarness(),p=config.position;
 const design=JSON.parse(fs.readFileSync(path.join(root,'MAP/regions/lang-viet/LANG_VIET_NPC_PORTAL_DE_XUAT/DESIGN/LANG_VIET_NPC_PORTAL_DESIGN.json'),'utf8'));
 assert.match(design.npcs.find(n=>n.id===config.id).anchor,/Nhà gần cổng bên phải/);assert(h.run('village.houses[5].x===11&&village.houses[5].z===10'));
 const floor=h.run(`(()=>{world.updateMatrixWorld(true);const m=[];world.traverse(o=>{if(o.isMesh)m.push(o)});return new THREE.Raycaster(new THREE.Vector3(${p.x},${p.y+.05},${p.z}),new THREE.Vector3(0,-1,0)).intersectObjects(m,false)[0].point.y})()`);
 assert(Math.abs(floor-p.y-config.model.groundOffset)<.001);
 const actors=h.context.mountVillageNPCs({THREE:h.context.THREE,region:h.context.VietVillageRegions.current,gameplay:load('gameplay')});
 assert(!h.run(`canWalk(${p.x},${p.z})`));assert(h.run('canWalk(11,14.4)&&canWalk(9.35,14.4)'));assert(h.run(`canWalk(${config.approach.x},${config.approach.z})`));
 const route=h.run(`findPath({x:0,z:16.5},${JSON.stringify(config.approach)})`);assert(route.length>0);
 assert(Math.hypot(p.x-11,p.z-14.4)>config.collisionRadius+.62+.32);assert(Math.hypot(config.approach.x-11,config.approach.z-14.4)>.62+.32);
 actors.dispose();
});

test('merchant idle and both actions keep real geometry finite, sleeves attached, feet grounded and no root drift',async()=>{
 const gltf=await asset(),v=runtime().createVillageNPCGLTFVisual({THREE:T,gltf,height:2.4,clipName:'idle',oneShots:clips,lockRootMotion:true,footProbeRatio:config.model.footProbeRatio}),actor=new T.Group();
 actor.position.set(config.position.x,config.position.y,config.position.z);actor.rotation.y=-.7;v.root.position.y=config.model.groundOffset;actor.add(v.root);v.update(0);
 let hips,mesh;gltf.scene.traverse(o=>{if(o.isBone&&/Hips$/.test(o.name))hips=o;if(o.isSkinnedMesh)mesh=o;});
 const anchor=hips.getWorldPosition(new T.Vector3()),point=new T.Vector3(),bounds=new T.Box3();assert(Math.abs(bounds.setFromObject(gltf.scene,true).getSize(new T.Vector3()).y-2.4)<.001);
 let loops=0,finished=0;v.mixer.addEventListener('loop',()=>loops++);v.mixer.addEventListener('finished',()=>finished++);advance(v,32);assert.equal(loops,Math.floor(32/gltf.animations.find(a=>a.name==='idle').duration));
 for(const clip of clips){assert(v.playOnce(clip));const before=finished;let fade=false;
  for(let t=0;t<gltf.animations.find(a=>a.name===clip).duration+.6;t+=.05){
   if(v.animationState.busy)assert(!v.playOnce('agree'));v.update(.05);fade ||= v.animationState.phase==='returning';
   bounds.setFromObject(gltf.scene,true);assert(Math.abs(bounds.min.y-.36)<.003,clip+' floor '+bounds.min.y);const size=bounds.getSize(new T.Vector3());assert([size.x,size.y,size.z].every(n=>Number.isFinite(n)&&n<5),'Exploding skin/sleeves');
   hips.getWorldPosition(point);assert(Math.hypot(point.x-anchor.x,point.z-anchor.z)<.00001);assert(Array.from(mesh.skeleton.boneMatrices).every(Number.isFinite));
  }
  assert(fade);assert.equal(finished-before,1);assert.equal(v.animationState.clip,'idle');assert.equal(v.action.getEffectiveWeight(),1);
 }v.dispose();
});

test('merchant exposes three choices; repeated buy/sell never changes money, items or progress and never fakes success',async()=>{
 const h=await game(),n=h.context.VietVillageNPCs,model=()=>n.status.models.find(m=>m.id===config.id);
 assert(h.context.VietVillageWeapons.equip('sword'));stand(h);n.update(.2);
 assert.match(h.run("$('npcInteractBtn').textContent"),/Nói chuyện · Người bán hàng/);assert(n.interact(config.id));
 assert.equal(h.run("$('npcDialogTitle').textContent"),'Người bán hàng');assert.equal(model().animation.clip,'greet_01');
 assert.equal(h.run("$('npcDialogueLines').children[0].textContent"),'Chào khách! Ghé xem ít đồ dùng nhé. Chuẩn bị đầy đủ rồi hãy lên đường.');
 assert(h.run("$('npcDialog').classList.contains('npc-demo-mode')"));
 assert.deepEqual(Array.from(h.run("$('npcAnimations').children.map(b=>b.textContent)")),['Mua hàng','Bán vật phẩm','Kết thúc']);
 assert.match(h.run("$('npcServiceStatus').textContent"),/Mua bán chưa sẵn sàng/);
 const snapshot=()=>h.run('JSON.stringify({progress,journey:playerJourney.getState(),equipment:VietVillageWeapons.state,userData:player.userData,quests:VietVillageNPCs.status.quests})');
 const before=snapshot();let writes=0;const save=h.context.localStorage.setItem;h.context.localStorage.setItem=(...args)=>{writes++;save(...args);};
 for(let i=0;i<20;i++)control(h,'npc-service-general-buy').onclick();assert.match(h.run("$('npcServiceStatus').textContent"),/Mua hàng chưa sẵn sàng/);
 for(let i=0;i<20;i++)control(h,'npc-service-general-sell').onclick();assert.match(h.run("$('npcServiceStatus').textContent"),/Bán vật phẩm chưa sẵn sàng/);
 assert.equal(snapshot(),before);assert.equal(writes,0);assert.equal(model().animation.clip,'greet_01');
 advance(n,4);assert.equal(model().animation.clip,'idle');assert.match(h.run("$('npcAnimationStatus').textContent"),/Mua hàng hoặc Bán vật phẩm/);assert.doesNotMatch(h.run("$('npcAnimationStatus').textContent"),/nghề rèn/);
 for(let i=0;i<20;i++){control(h,'npc-service-general-buy').onclick();control(h,'npc-service-general-sell').onclick();}
 assert.equal(model().animation.clip,'idle');assert.equal(snapshot(),before);assert.equal(writes,0);
 control(h,'npc-end-conversation').onclick();assert(!n.isOpen());assert(!h.run('overlays()'));n.dispose();
});

test('merchant closes during greeting; stale, out-of-range, unauthenticated and changed-account service callbacks do nothing',async()=>{
 const h=await game(),n=h.context.VietVillageNPCs,model=()=>n.status.models.find(m=>m.id===config.id);
 stand(h);assert(n.interact(config.id));const staleBuy=control(h,'npc-service-general-buy'),staleSell=control(h,'npc-service-general-sell');
 control(h,'npc-end-conversation').onclick();assert(!n.isOpen());assert(!h.run('overlays()'));advance(n,.5);assert.equal(model().animation.clip,'idle');
 assert(n.interact(config.id));advance(n,4);const original=h.run("$('npcServiceStatus').textContent");
 staleBuy.onclick();staleSell.onclick();assert.equal(h.run("$('npcServiceStatus').textContent"),original);
 h.run('player.position.set(0,.3,16.5)');control(h,'npc-service-general-buy').onclick();control(h,'npc-service-general-sell').onclick();assert.equal(h.run("$('npcServiceStatus').textContent"),original);
 stand(h);h.context.VietVillageAuth.isAuthenticated=()=>false;control(h,'npc-service-general-buy').onclick();assert.equal(h.run("$('npcServiceStatus').textContent"),original);
 h.context.VietVillageAuth.isAuthenticated=()=>true;h.context.VietVillageAuth.getProfile=()=>({uid:'merchant-other-test'});control(h,'npc-service-general-sell').onclick();assert.equal(h.run("$('npcServiceStatus').textContent"),original);
 n.update(.1);assert(!n.isOpen());n.dispose();
});

test('returning to village keeps one merchant and all six existing NPCs still interact',async()=>{
 const h=await game(),n=h.context.VietVillageNPCs;
 h.run('VietVillageJourney.recordMovement(3);VietVillageJourney.recordSkillUse()');
 const before=h.run('JSON.stringify(VietVillageJourney.getState())');assert(h.context.VietVillageRegions.travelTo('ngoai-lang-dong-tre').ok);n.update(.1);assert(!n.interact(config.id));
 assert(h.context.VietVillageRegions.travelTo('lang-viet','from-dong-tre').ok);n.update(.1);await n.load();assert.equal(n.status.count,8);assert.equal(h.run('JSON.stringify(VietVillageJourney.getState())'),before);
 assert(h.run("regionTravel.current.root.getObjectByName('NPC_LANG_VIET_TAP_HOA').children.filter(c=>c.name==='npc-glb-visual').length===1"));
 for(const [id,x,y,z,clip] of [['NPC_LANG_VIET_LY_TRUONG',2,.3,-10.9,'idle.001'],['NPC_LANG_VIET_VO_SU',8.1,.3,-14.6,'bow'],['NPC_LANG_VIET_TUAN_DINH',7.6,.3,21.6,'greet_01'],['NPC_LANG_VIET_THAY_DO',-9.8,.3,4.25,'bow'],['NPC_LANG_VIET_THAY_THUOC',12.2,.3,4.25,'bow'],['NPC_LANG_VIET_THO_REN',-9.8,.56,14.4,'greet_01']]){
  h.run('player.position.set('+[x,y,z].join(',')+');VietVillageNPCs.update(.1)');assert(n.interact(id));advance(n,.5);assert.equal(n.status.models.find(m=>m.id===id).animation.clip,clip);n.lock();
 }n.dispose();
});

test('missing merchant asset reports failure and keeps safe service notices and immediate close',async()=>{
 const h=createHarness();h.context.VietVillageAuth.getProfile=()=>({uid:'merchant-asset-failure'});
 h.context.loadVillageNPCGLTF=async url=>{if(url===config.model.url)throw Error('HTTP 404');return asset(fs.readFileSync(path.resolve(root,'SOURCE-CODE',url)));};
 h.context.fetch=async url=>({ok:true,json:async()=>load(/([^/]+)\.json/.exec(url)[1])});h.run("$('play').onclick()");const n=h.context.VietVillageNPCs;await n.load();stand(h);assert(n.interact(config.id));
 assert.equal(n.status.models.find(m=>m.id===config.id).state,'error');assert.match(h.run("$('npcAnimationStatus').textContent"),/Chưa tải được mô hình Người bán hàng/);
 for(const id of ['general-buy','general-sell']){control(h,'npc-service-'+id).onclick();assert.match(h.run("$('npcServiceStatus').textContent"),/chưa sẵn sàng/);}
 control(h,'npc-end-conversation').onclick();assert(!n.isOpen());n.dispose();
});
