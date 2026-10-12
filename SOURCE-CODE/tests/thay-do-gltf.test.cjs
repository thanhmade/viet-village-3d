'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'../..'),T=require(path.join(root,'ASSETS/vendor/three.min.js')),createHarness=require('./harness.cjs');
const load=name=>JSON.parse(fs.readFileSync(path.join(root,'MAP/regions/lang-viet',name+'.json'),'utf8'));
const config=load('gameplay').npcs.find(n=>n.role==='teacher'),buffer=fs.readFileSync(path.resolve(root,'SOURCE-CODE',config.model.url));
const json=JSON.parse(buffer.subarray(20,20+buffer.readUInt32LE(12))),clips=['bow','agree','clap'];
global.THREE=T;global.self=global;global.createImageBitmap=async blob=>{
 const bytes=new Uint8Array(await blob.arrayBuffer());
 if(blob.type==='image/jpeg')assert.deepEqual([...bytes.slice(0,2)],[255,216]);
 else{assert.equal(blob.type,'image/png');assert.deepEqual([...bytes.slice(0,4)],[137,80,78,71]);}
 return {width:2048,height:2048,close(){}};
};
const loader=import(pathToFileURL(path.join(root,'ASSETS/vendor/gltf-r160/GLTFLoader.js')).href);
async function asset(bytes=buffer){const {GLTFLoader}=await loader;return new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.length),'');}
function runtime(){const c={THREE:T,console,document:{}};c.window=c;vm.createContext(c);for(const f of ['CHARACTERS/npc-gltf.js','SOURCE-CODE/js/npc-lesson.js'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),c);return c;}
function advance(n,seconds){for(let t=0;t<seconds;t+=.05)n.update(.05);}
async function game(fallback=false){
 const h=createHarness();h.context.VietVillageAuth.getProfile=()=>({uid:'teacher-isolated-test'});
 h.context.loadVillageNPCGLTF=async url=>asset(fs.readFileSync(path.resolve(root,'SOURCE-CODE',url)));
 h.context.fetch=async url=>({ok:true,json:async()=>{const name=/([^/]+)\.json/.exec(url)[1],value=load(name);if(fallback&&name==='dialogues')value.dialogues['thay-do'].lesson.bank='missing';return value;}});
 h.run("$('play').onclick()");assert(await h.context.VietVillageNPCs.load());return h;
}
const stand=h=>h.run('player.position.set(-9.8,.3,4.25);VietVillageNPCs.update(.1)');
const control=(h,id)=>h.run(`$('npcAnimations').children.find(b=>b.id==='${id}')`);
const answer=(h,index)=>h.run(`$('npcLesson').children.find(e=>e.className==='npc-actions').children[${index}]`);

test('teacher GLB and skin preserve exact clips, embedded textures and sleeve bone influences',async()=>{
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

test('teacher is at the middle left house yard with grounded feet, clear approach and unblocked entry/return spawn',()=>{
 const h=createHarness(),p=config.position;
 const design=JSON.parse(fs.readFileSync(path.join(root,'MAP/regions/lang-viet/LANG_VIET_NPC_PORTAL_DE_XUAT/DESIGN/LANG_VIET_NPC_PORTAL_DESIGN.json'),'utf8'));
 assert.match(design.npcs.find(n=>n.id===config.id).anchor,/nhà giữa dãy trái/);assert(h.run('village.houses[1].x===-11&&village.houses[1].z===0'));
 const floor=h.run(`(()=>{world.updateMatrixWorld(true);const m=[];world.traverse(o=>{if(o.isMesh)m.push(o)});return new THREE.Raycaster(new THREE.Vector3(${p.x},.4,${p.z}),new THREE.Vector3(0,-1,0)).intersectObjects(m,false)[0].point.y})()`);
 assert(Math.abs(floor-p.y-config.model.groundOffset)<.001);
 const actors=h.context.mountVillageNPCs({THREE:h.context.THREE,region:h.context.VietVillageRegions.current,gameplay:load('gameplay')});
 assert(!h.run(`canWalk(${p.x},${p.z})`));assert(h.run('canWalk(-11,4.4)&&canWalk(-12.65,4.4)'));assert(h.run(`canWalk(${config.approach.x},${config.approach.z})`));
 const route=h.run(`findPath({x:0,z:16.5},${JSON.stringify(config.approach)})`);assert(route.length>0);
 assert(Math.hypot(p.x+11,p.z-4.4)>config.collisionRadius+.62+.32);assert(Math.hypot(config.approach.x+11,config.approach.z-4.4)>.62+.32);
 actors.dispose();
});

test('teacher idle and all three actions keep real geometry finite, sleeves attached, feet grounded and no root drift',async()=>{
 const gltf=await asset(),v=runtime().createVillageNPCGLTFVisual({THREE:T,gltf,height:2.4,clipName:'idle',oneShots:clips,lockRootMotion:true}),actor=new T.Group();
 actor.position.set(config.position.x,config.position.y,config.position.z);actor.rotation.y=-.7;v.root.position.y=config.model.groundOffset;actor.add(v.root);v.update(0);
 let hips,mesh;gltf.scene.traverse(o=>{if(o.isBone&&/Hips$/.test(o.name))hips=o;if(o.isSkinnedMesh)mesh=o;});
 const anchor=hips.getWorldPosition(new T.Vector3()),point=new T.Vector3(),bounds=new T.Box3();assert(Math.abs(bounds.setFromObject(gltf.scene,true).getSize(new T.Vector3()).y-2.4)<.001);
 let loops=0,finished=0;v.mixer.addEventListener('loop',()=>loops++);v.mixer.addEventListener('finished',()=>finished++);advance(v,32);assert.equal(loops,2);
 for(const clip of clips){assert(v.playOnce(clip));const before=finished;let fade=false;
  for(let t=0;t<gltf.animations.find(a=>a.name===clip).duration+.6;t+=.05){
   if(v.animationState.busy)assert(!v.playOnce('clap'));v.update(.05);fade ||= v.animationState.phase==='returning';
   bounds.setFromObject(gltf.scene,true);assert(Math.abs(bounds.min.y-.3225)<.003,clip+' floor '+bounds.min.y);const size=bounds.getSize(new T.Vector3());assert([size.x,size.y,size.z].every(n=>Number.isFinite(n)&&n<5),'Exploding skin/sleeves');
   hips.getWorldPosition(point);assert(Math.hypot(point.x-anchor.x,point.z-anchor.z)<.00001);assert(Array.from(mesh.skeleton.boneMatrices).every(Number.isFinite));
  }
  assert(fade);assert.equal(finished-before,1);assert.equal(v.animationState.clip,'idle');assert.equal(v.action.getEffectiveWeight(),1);
 }v.dispose();
});

test('existing lesson bank is preferred; exact square fallback supports mistakes, retries, both event orders and duplicate rejection',()=>{
 const h=createHarness(),def=load('dialogues').dialogues['thay-do'].lesson;
 const existing=h.run(`resolveVillageLesson(${JSON.stringify(def)},{core,advanced})`);assert.equal(existing.id,'core:0');assert.equal(existing.question,h.run('core[0][2]'));assert.deepEqual(Array.from(existing.answers),Array.from(h.run('core[0][3]')));
 const c=runtime(),fallback=c.resolveVillageLesson(def),s=c.createVillageLessonSession(fallback);
 assert.equal(fallback.question,'Hình vuông cạnh 5 m có chu vi bao nhiêu?');assert.deepEqual(Array.from(fallback.answers),['10 m','20 m','25 m']);assert.equal(fallback.answers[fallback.correctIndex],'20 m');
 assert.equal(s.answer(-1).length,0);s.study();assert.equal(s.answer(0).length,0);assert.match(s.state.feedback,/5 × 4 = 20 m/);assert(!s.state.correct);
 assert.deepEqual(Array.from(s.answer(1)),['agree','clap']);assert(s.state.completed);assert.equal(s.answer(1).length,0);assert.equal(s.study().length,0);
 const reverse=c.createVillageLessonSession(fallback);assert.deepEqual(Array.from(reverse.answer(1)),['agree']);assert(!reverse.state.completed);assert.deepEqual(Array.from(reverse.study()),['clap']);assert(reverse.state.completed);
});

test('real dialogue queues bow → agree → clap once, allows immediate close, cancels stale reactions and preserves other NPCs/progress',async()=>{
 const h=await game(),n=h.context.VietVillageNPCs,teacher=()=>n.status.models.find(m=>m.id===config.id);
 stand(h);assert(n.interact(config.id));assert.equal(teacher().animation.clip,'bow');assert.equal(h.run("$('npcDialogTitle').textContent"),'Thầy đồ');assert.equal(n.status.lesson.id,'core:0');
 const before=h.run('JSON.stringify(progress)'),quests=JSON.stringify(n.status.quests);
 control(h,'npc-study').onclick();control(h,'npc-question').onclick();answer(h,1).onclick();assert.match(n.status.lesson.feedback,/Chưa đúng/);assert(!n.status.lesson.correct);
 answer(h,0).onclick();assert(n.status.lesson.completed);assert.equal(teacher().animation.clip,'bow','Answer while bowing must not overlap');for(let i=0;i<20;i++)answer(h,0).onclick();
 const phases=[];for(let i=0;i<520;i++){n.update(.05);const clip=teacher().animation.clip;if(phases.at(-1)!==clip)phases.push(clip);}
 assert.deepEqual(phases.filter(p=>p!=='idle'),['bow','agree','clap']);assert.equal(phases.at(-1),'idle');assert.equal(h.run('JSON.stringify(progress)'),before);assert.equal(JSON.stringify(n.status.quests),quests);
 // Closing during bow is immediate and does not leak a queued celebration.
 control(h,'npc-end-conversation').onclick();assert(!n.isOpen());assert(!h.run('overlays()'));assert(n.interact(config.id));
 control(h,'npc-study').onclick();control(h,'npc-question').onclick();answer(h,0).onclick();control(h,'npc-end-conversation').onclick();assert(!n.isOpen());advance(n,30);assert.equal(teacher().animation.clip,'idle');assert.equal(n.status.lesson,null);
 assert(n.interact(config.id));assert(!n.status.lesson.correct);advance(n,6.5);control(h,'npc-study').onclick();control(h,'npc-question').onclick();answer(h,0).onclick();advance(n,4.5);assert.equal(teacher().animation.clip,'clap');control(h,'npc-end-conversation').onclick();assert(!n.isOpen());advance(n,.5);assert.equal(teacher().animation.clip,'idle');
 // UID change closes the lesson and prevents delayed input from affecting it.
 assert(n.interact(config.id));const stale=control(h,'npc-study');h.context.VietVillageAuth.getProfile=()=>({uid:'teacher-other-test'});n.update(.1);assert(!n.isOpen());stale.onclick();assert.equal(n.status.lesson,null);
 for(const [id,x,z,clip] of [['NPC_LANG_VIET_LY_TRUONG',2,-10.9,'idle.001'],['NPC_LANG_VIET_VO_SU',8.1,-14.6,'bow'],['NPC_LANG_VIET_TUAN_DINH',7.6,21.6,'greet_01']]){h.run(`player.position.set(${x},.3,${z});VietVillageNPCs.update(.1)`);assert(n.interact(id));advance(n,.5);assert.equal(n.status.models.find(m=>m.id===id).animation.clip,clip);n.lock();}
 h.run('VietVillageJourney.recordMovement(3);VietVillageJourney.recordSkillUse()');assert(h.context.VietVillageRegions.travelTo('ngoai-lang-dong-tre').ok);n.update(.1);assert(!n.interact(config.id));assert(h.context.VietVillageRegions.travelTo('lang-viet','from-dong-tre').ok);n.update(.1);await n.load();assert.equal(n.status.count,8);assert(h.run("regionTravel.current.root.getObjectByName('NPC_LANG_VIET_THAY_DO').children.filter(c=>c.name==='npc-glb-visual').length===1"));n.dispose();
});

test('fallback lesson is wired to the same real dialogue and remains usable when the teacher model fails',async()=>{
 const h=await game(true),n=h.context.VietVillageNPCs;stand(h);assert(n.interact(config.id));assert.equal(n.status.lesson.id,'square-perimeter-5m');control(h,'npc-study').onclick();control(h,'npc-question').onclick();answer(h,2).onclick();assert.match(n.status.lesson.feedback,/5 × 4 = 20 m/);answer(h,1).onclick();assert(n.status.lesson.completed);n.dispose();
 const g=createHarness();g.context.VietVillageAuth.getProfile=()=>({uid:'teacher-load-failure'});g.context.loadVillageNPCGLTF=async()=>{throw Error('HTTP 404');};g.context.fetch=async url=>({ok:true,json:async()=>load(/([^/]+)\.json/.exec(url)[1])});g.run("$('play').onclick()");await g.context.VietVillageNPCs.load();stand(g);assert(g.context.VietVillageNPCs.interact(config.id));control(g,'npc-study').onclick();control(g,'npc-question').onclick();answer(g,0).onclick();assert(g.context.VietVillageNPCs.status.lesson.completed);control(g,'npc-end-conversation').onclick();assert(!g.context.VietVillageNPCs.isOpen());g.context.VietVillageNPCs.dispose();
});
