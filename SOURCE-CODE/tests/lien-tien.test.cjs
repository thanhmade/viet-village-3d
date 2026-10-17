'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),T=require('../../ASSETS/vendor/three.min.js');
const Core=require('../js/vfx/weapon-vfx-core.js'),Volley=require('../js/vfx/bow-volley.js'),Piercing=require('../js/vfx/bow-piercing.js');require('../js/vfx/bow-skill-vfx.js');
function rig({quality='low',targets=[],walls=[]}={}){
 const scene=new T.Scene(),caster=new T.Group(),events=[],hits=[];caster.rotation.y=Math.PI;scene.add(caster);
 const vfx=new Core({THREE:T,scene,quality,onEvent:e=>{events.push(e);if(['target-query','hit-window'].includes(e.type))for(const target of targets){const ok=e.testTarget(target.id,target.p,target.r??.1,target.height??2.2);if(e.type==='target-query')assert.equal(ok,false,'query never applies gameplay');if(ok){hits.push({id:target.id,shot:e.hitIndex});assert.equal(e.testTarget(target.id,target.p,target.r??.1),false,'no duplicate hit');}}}});
 const cast=vfx.cast('bow.lien-tien',{caster}),fx=vfx.effects[0];fx.bow.trace=(a,b,r)=>Piercing.traceWorld(T,a,b,r,walls,()=>0);
 return {scene,caster,events,hits,vfx,fx,cast};
}
const target=(id,x,z,r=.1,y=0)=>({id,p:new T.Vector3(x,y,z),r});
for(const dt of [1/30,1/60,1/120,.47,4])test('three releases and first target per arrow at delta '+dt,()=>{
 // Deliberately enumerate the farther target first: iteration order must not decide the hit.
 const r=rig({targets:[target('far',0,8,2),target('near',0,4,1.2),target('behind',0,-2,1)]});
 while(r.vfx.time<2)r.vfx.update(dt);
 assert.deepEqual(r.hits,[{id:'near',shot:0},{id:'near',shot:1},{id:'near',shot:2}]);
 assert.deepEqual(r.events.filter(e=>e.type==='release').map(e=>e.hitIndex),[0,1,2]);assert.deepEqual(r.events.filter(e=>e.type==='release').map(e=>e.releaseTime),[.25,.37,.49]);
 assert.equal(r.events.filter(e=>e.type==='impact').length,3);assert.equal(r.vfx.effects.length,0);
 for(const e of r.events.filter(e=>['target-query','hit-window'].includes(e.type)))assert.equal(e.testTarget('retained',new T.Vector3(0,0,3),2),false);
 r.vfx.dispose();assert.deepEqual(r.scene.children,[r.caster]);
});
test('fan can hit separated targets; no damage outside the swept lane, height or range',()=>{
 const r=rig({targets:[target('right',.60,8),target('center',-.12,8),target('left',-.84,8),target('side',3,8),target('high',-.12,6,.1,4),target('too-far',-.12,12.5)]});
 r.vfx.update(4);assert.deepEqual(r.hits.map(h=>h.id),['right','center','left']);r.vfx.dispose();
});
test('nearest wall wins even if bounds are unsorted; no targets behind it',()=>{
 const far=new T.Box3(new T.Vector3(-2,0,8),new T.Vector3(2,3,8.5)),near=new T.Box3(new T.Vector3(-2,0,3),new T.Vector3(2,3,3.2));
 const r=rig({walls:[far,near],targets:[target('behind',0,6,2)]});r.vfx.update(4);assert.equal(r.hits.length,0);
 const impacts=r.events.filter(e=>e.type==='impact');assert.equal(impacts.length,3);assert(impacts.every(e=>e.contactKind==='wall'&&Math.abs(e.position.z-2.72)<1e-6));r.vfx.dispose();
});
test('point-blank sweep checks the segment before the muzzle and respects a closer wall',()=>{
 const r=rig({targets:[target('close',-.12,.35,.05)]});r.vfx.update(.251);assert.deepEqual(r.hits,[{id:'close',shot:0}]);r.vfx.dispose();
 const wall=new T.Box3(new T.Vector3(-2,0,.2),new T.Vector3(2,3,.3));
 const blocked=rig({walls:[wall],targets:[target('behind',0,2,1)]});blocked.vfx.update(4);assert.equal(blocked.hits.length,0);assert.equal(blocked.events.filter(e=>e.type==='impact').length,3);blocked.vfx.dispose();
});
test('empty sky is a miss; charge and reload never produce extra arrows',()=>{
 const r=rig();r.vfx.update(.249);assert.equal(r.events.filter(e=>e.type==='release').length,0);assert.equal(r.hits.length,0);
 r.vfx.update(.002);assert.equal(r.events.filter(e=>e.type==='release').length,1);r.vfx.update(2);assert.equal(r.events.filter(e=>e.type==='release').length,3);assert.equal(r.events.filter(e=>e.type==='impact').length,0);r.vfx.dispose();
});
test('cancel at every phase keeps cooldown and disposes owned resources exactly once',()=>{
 for(const quality of ['low','medium','high'])for(const time of [.1,.3,.42,.6,1.5]){
  const r=rig({quality}),disposed=new Map([...r.fx.geometries,...r.fx.materials].map(o=>[o,0]));for(const o of disposed.keys())o.addEventListener('dispose',()=>disposed.set(o,disposed.get(o)+1));
  r.vfx.update(time);r.vfx.cancel(r.cast.handle);const before=r.events.length;r.vfx.update(.1);assert.equal(r.events.length,before);assert.equal(r.vfx.cast('bow.lien-tien',{caster:r.caster}).reason,'cooldown');
  assert([...disposed.values()].every(n=>n===1));r.vfx.dispose();assert.deepEqual(r.scene.children,[r.caster]);
 }
});
test('quality changes only decoration, and reentrant cancel cannot emit later releases',()=>{
 for(const quality of ['low','medium','high']){const r=rig({quality,targets:[target('wide',0,4,2)]});r.vfx.update(4);assert.equal(r.hits.length,3);r.vfx.dispose();}
 const r=rig();r.vfx.onEvent=e=>{r.events.push(e);if(e.type==='release')r.vfx.cancel(e.handle);};r.vfx.update(4);assert.equal(r.events.filter(e=>e.type==='release').length,1);assert.equal(r.events.filter(e=>e.type==='impact').length,0);r.vfx.dispose();
});
test('village uses real contacts, keeps three pulses, blocks movement through draw and restores original limbs',()=>{
 const {context:c,run}=require('./harness.cjs')(),w=c.VietVillageWeapons,events=[];c.VietVillageNPCs={...c.VietVillageNPCs,onSkillUsed:e=>events.push(e)};
 assert(w.equip('bow'));run('player.position.set(5,bridgeHeight(5,20),20);yaw=0;tick(1000);');const body=run('body'),player=run('player'),origin=player.position.clone(),meshes=[...run('rightArm').children,...run('leftArm').children].filter(m=>m.isMesh),base=meshes.map(m=>({p:m.position.clone(),q:m.quaternion.clone(),s:m.scale.clone()}));
 assert(w.cast(2).ok);assert.equal(events.length,0);assert(w.movementLocked);assert.equal(w.cast(1).reason,'busy');assert.equal(w.cast(2).reason,'cooldown');run('keys.KeyW=true;');
 for(let i=0;i<23;i++){run('tick((last||0)+40)');assert(player.position.distanceTo(origin)<1e-7);}
 assert.equal(w.movementLocked,false);assert.equal(body.getObjectByName('village-bow-draw-pose'),undefined);assert(events.every(e=>e?.type==='target-query'),'empty space must not award practice');
 for(let i=0;i<meshes.length;i++){assert(meshes[i].position.equals(base[i].p));assert(meshes[i].quaternion.equals(base[i].q));assert(meshes[i].scale.equals(base[i].s));}
 w.suspend();assert.equal(w.state.active,0);assert(w.skills()[1].remaining>0);c.VietVillageGame.lock();
});
test('linked pose interruption cancels pending arrows even across a long frame',()=>{
 const {context:c,run}=require('./harness.cjs')(),w=c.VietVillageWeapons,events=[];c.VietVillageNPCs={...c.VietVillageNPCs,onSkillUsed:e=>events.push(e)};
 w.equip('bow');const socket=new c.THREE.Group();run('body').add(socket);w.setAvatarSocket(socket);socket.userData.bowDrawTime=0;socket.userData.bowDrawSkillId='bow.lien-tien';assert(w.cast(2).ok);w.update(.3);const n=events.length;delete socket.userData.bowDrawTime;w.update(5);assert.equal(events.length,n);assert.equal(w.state.active,0);assert.equal(w.movementLocked,false);c.VietVillageGame.lock();
});
test('real NPC practice journal changes only after a volley contact, not query or early cancellation',async()=>{
 const fs=require('node:fs'),path=require('node:path'),h=require('./harness.cjs')(),c=h.context,n=c.VietVillageNPCs,w=c.VietVillageWeapons;
 c.VietVillageAuth.getProfile=()=>({uid:'lien-practice'});c.fetch=async url=>({ok:true,json:async()=>JSON.parse(fs.readFileSync(path.resolve(__dirname,'../../MAP/regions/lang-viet',/([^/]+)\.json/.exec(url)[1]+'.json'),'utf8'))});
 h.run("$('play').onclick()");assert(await n.load());
 const stand=(x,z,yaw=0)=>h.run(`player.position.set(${x},bridgeHeight(${x},${z}),${z});body.rotation.y=${yaw};VietVillageNPCs.update(.11);`);
 stand(7.6,21.6);assert(n.interact('NPC_LANG_VIET_TUAN_DINH'));h.run("$('npcQuests').children[0].children.find(b=>b.id==='accept-QUEST_LV_01').onclick()");n.lock();
 stand(2,-10.9);assert(n.interact('NPC_LANG_VIET_LY_TRUONG'));h.run("$('npcQuests').children[0].children.find(b=>b.id==='finish-QUEST_LV_01').onclick()");n.lock();
 stand(8.1,-14.6);assert(n.interact('NPC_LANG_VIET_VO_SU'));h.run("$('npcQuests').children[0].children.find(b=>b.id==='accept-QUEST_LV_02').onclick()");n.lock();
 w.equip('bow');stand(10.7,-14.3,Math.PI);assert(w.cast(2).ok);assert.equal(n.status.quests.QUEST_LV_02,'active');w.update(.1);assert.equal(n.status.quests.QUEST_LV_02,'active');
 w.deactivate();w.update(4);assert.equal(n.status.quests.QUEST_LV_02,'active');w.equip('bow');w.update(4);assert(w.cast(2).ok);w.update(.249);assert.equal(n.status.quests.QUEST_LV_02,'active');w.update(1.1);
 assert.equal(n.status.quests.QUEST_LV_02,'ready');assert.equal(h.run('progress.score'),0);c.VietVillageGame.lock();
});
