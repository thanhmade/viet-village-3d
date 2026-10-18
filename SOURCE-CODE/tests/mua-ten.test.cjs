'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),T=require('../../ASSETS/vendor/three.min.js');
const Core=require('../js/vfx/weapon-vfx-core.js'),Rain=require('../js/vfx/bow-rain.js');require('../js/vfx/bow-skill-vfx.js');
function rig({quality='low',targets=[],walls=[]}={}){
 const scene=new T.Scene(),caster=new T.Group(),events=[],hits=[];caster.rotation.y=Math.PI;scene.add(caster);
 const vfx=new Core({THREE:T,scene,quality,getGroundY:()=>0,onEvent:e=>{events.push(e);if(['target-query','hit-window'].includes(e.type))for(const target of targets){const ok=e.testTarget(target.id,target.p,target.r??.25,target.height??2.2);if(e.type==='target-query')assert.equal(ok,false,'query never applies gameplay');if(ok){hits.push({id:target.id,shot:e.hitIndex});assert.equal(e.testTarget(target.id,target.p,target.r??.25,target.height??2.2),false,'no duplicate hit');}}}});
 const cast=vfx.cast('bow.mua-ten',{caster}),fx=vfx.effects[0];fx.bow.trace=(a,b)=>Rain.traceWorld(T,a,b,walls,()=>0);
 return {scene,caster,events,hits,vfx,fx,cast};
}
const target=(id,x,z,r=.25,y=0,height=2.2)=>({id,p:new T.Vector3(x,y,z),r,height});
for(const dt of [1/30,1/60,1/120,.41,6])test('all 12 descending tips reach terrain once at delta '+dt,()=>{
 const r=rig();while(r.vfx.time<4.8)r.vfx.update(dt);
 const impact=r.events.filter(e=>e.type==='impact');assert.equal(impact.length,12);assert.equal(new Set(impact.map(e=>e.hitIndex)).size,12);
 assert(impact.every(e=>e.contactKind==='ground'&&Math.abs(e.position.y)<1e-7));
 assert(impact.every(e=>e.contactTime>=2.46-1e-8&&e.contactTime<=4+1e-8));
 assert.equal(r.events.filter(e=>e.type==='release'&&e.kind==='rain-seed').length,1);assert.equal(r.events.filter(e=>e.type==='release'&&e.kind==='rain-arrow').length,12);
 assert.equal(r.events.filter(e=>e.type==='channel-open').length,1);assert.equal(r.vfx.effects.length,0);
 for(const e of r.events.filter(e=>['target-query','hit-window'].includes(e.type)))assert.equal(e.testTarget('retained',new T.Vector3(0,0,7),5),false);
 r.vfx.dispose();assert.deepEqual(r.scene.children,[r.caster]);
});
test('nearest target in vertical sweep wins even when lower target is enumerated first',()=>{
 const r=rig({targets:[target('lower',0,7,.3),target('upper',0,7,.6,4,1),target('outside',8,7),target('too-high',0,7,.5,12)]});r.vfx.update(6);
 assert.deepEqual(r.hits,[{id:'upper',shot:0}]);const hit=r.events.find(e=>e.type==='impact'&&e.hitIndex===0);assert.equal(hit.contactKind,'target');assert(hit.position.y>=5&&hit.position.y<5.8);r.vfx.dispose();
});
test('roof intercepts rain above targets; low ceiling blocks summoning before tip exits',()=>{
 const roof=new T.Box3(new T.Vector3(-4,3.8,3),new T.Vector3(4,4,11)),r=rig({walls:[roof],targets:Rain.shots.map(s=>target('below-'+s.index,Math.sin(s.angle)*s.radius,7+Math.cos(s.angle)*s.radius,.25))});r.vfx.update(6);
 assert.equal(r.hits.length,0);const impact=r.events.filter(e=>e.type==='impact');assert.equal(impact.length,12);assert(impact.every(e=>e.contactKind==='wall'&&Math.abs(e.position.y-4)<1e-7));r.vfx.dispose();
 const ceiling=new T.Box3(new T.Vector3(-2,2.5,-2),new T.Vector3(2,2.6,2)),c=rig({walls:[ceiling]});c.vfx.update(4.8);assert.equal(c.events.filter(e=>e.type==='cast-obstructed').length,1);assert.equal(c.events.filter(e=>e.type==='release').length,1);assert.equal(c.events.filter(e=>e.type==='impact').length,0);assert(c.vfx.cooldownRemaining('bow.mua-ten',c.caster)>0);c.vfx.dispose();
});
test('cancel at each phase disposes all owned geometries, materials and instance buffers once',()=>{
 for(const quality of ['low','medium','high'])for(const time of [.2,.9,1.5,2.7,4.5]){
  const r=rig({quality}),objects=[...r.fx.geometries,...r.fx.materials];r.fx.group.traverse(o=>{if(o.isInstancedMesh)objects.push(o);});const disposed=new Map(objects.map(o=>[o,0]));for(const o of objects)o.addEventListener('dispose',()=>disposed.set(o,disposed.get(o)+1));
  r.vfx.update(time);r.vfx.cancel(r.cast.handle);const before=r.events.length;r.vfx.update(.1);assert.equal(r.events.length,before);assert.equal(r.vfx.cast('bow.mua-ten',{caster:r.caster}).reason,'cooldown');assert([...disposed.values()].every(n=>n===1));r.vfx.dispose();assert.deepEqual(r.scene.children,[r.caster]);
 }
});
test('quality never changes the hit count; cancellation in a callback stops later events',()=>{
 for(const quality of ['low','medium','high']){const r=rig({quality,targets:[target('wide',0,7,4)]});r.vfx.update(6);assert.equal(r.hits.length,12);r.vfx.dispose();}
 const r=rig();r.vfx.onEvent=e=>{r.events.push(e);if(e.type==='release')r.vfx.cancel(e.handle);};r.vfx.update(6);assert.equal(r.events.filter(e=>e.type==='release').length,1);assert.equal(r.events.filter(e=>e.type==='impact').length,0);r.vfx.dispose();
});
test('village locks only the draw phase, restores limbs, and keeps the selected area fixed',()=>{
 const {context:c,run}=require('./harness.cjs')(),w=c.VietVillageWeapons,events=[];c.VietVillageNPCs={...c.VietVillageNPCs,onSkillUsed:e=>events.push(e)};
 assert(w.equip('bow'));run('player.position.set(5,bridgeHeight(5,20),20);yaw=0;tick(1000);');const body=run('body'),player=run('player'),origin=player.position.clone(),meshes=[...run('rightArm').children,...run('leftArm').children].filter(m=>m.isMesh),base=meshes.map(m=>({p:m.position.clone(),q:m.quaternion.clone(),s:m.scale.clone()}));
 assert(w.cast(3).ok);assert.equal(events.length,0);assert(w.movementLocked);assert.equal(w.cast(1).reason,'busy');assert.equal(w.cast(3).reason,'cooldown');run('keys.KeyW=true;');
 for(let i=0;i<44;i++){run('tick((last||0)+40)');assert(player.position.distanceTo(origin)<1e-7);}
 run('keys.KeyW=false;tick((last||0)+80)');assert.equal(w.movementLocked,false);assert.equal(body.getObjectByName('village-bow-draw-pose'),undefined);
 for(let i=0;i<meshes.length;i++){assert(meshes[i].position.equals(base[i].p));assert(meshes[i].quaternion.equals(base[i].q));assert(meshes[i].scale.equals(base[i].s));}
 assert(events.every(e=>e?.type==='target-query'),'circle and seed do not award practice');w.suspend();assert.equal(w.state.active,0);assert(w.skills()[2].remaining>0);c.VietVillageGame.lock();
});
test('linked pose interruption cancels the future rain even across a long frame',()=>{
 const {context:c,run}=require('./harness.cjs')(),w=c.VietVillageWeapons,events=[];c.VietVillageNPCs={...c.VietVillageNPCs,onSkillUsed:e=>events.push(e)};
 w.equip('bow');const socket=new c.THREE.Group();run('body').add(socket);w.setAvatarSocket(socket);socket.userData.bowDrawTime=0;socket.userData.bowDrawSkillId='bow.mua-ten';assert(w.cast(3).ok);w.update(.3);const n=events.length;delete socket.userData.bowDrawTime;w.update(6);assert.equal(events.length,n);assert.equal(w.state.active,0);assert.equal(w.movementLocked,false);c.VietVillageGame.lock();
});

test('real NPC practice journal changes only after a falling-arrow contact, not query or early cancellation',async()=>{
 const fs=require('node:fs'),path=require('node:path'),h=require('./harness.cjs')(),c=h.context,n=c.VietVillageNPCs,w=c.VietVillageWeapons;
 c.VietVillageAuth.getProfile=()=>({uid:'rain-practice'});c.fetch=async url=>({ok:true,json:async()=>JSON.parse(fs.readFileSync(path.resolve(__dirname,'../../MAP/regions/lang-viet',/([^/]+)\.json/.exec(url)[1]+'.json'),'utf8'))});
 h.run("$('play').onclick()");assert(await n.load());
 const stand=(x,z,yaw=0)=>h.run(`player.position.set(${x},bridgeHeight(${x},${z}),${z});body.rotation.y=${yaw};VietVillageNPCs.update(.11);`);
 stand(7.6,21.6);assert(n.interact('NPC_LANG_VIET_TUAN_DINH'));h.run("$('npcQuests').children[0].children.find(b=>b.id==='accept-QUEST_LV_01').onclick()");n.lock();
 stand(2,-10.9);assert(n.interact('NPC_LANG_VIET_LY_TRUONG'));h.run("$('npcQuests').children[0].children.find(b=>b.id==='finish-QUEST_LV_01').onclick()");n.lock();
 stand(8.1,-14.6);assert(n.interact('NPC_LANG_VIET_VO_SU'));h.run("$('npcQuests').children[0].children.find(b=>b.id==='accept-QUEST_LV_02').onclick()");n.lock();
 w.equip('bow');stand(10.7,-14.3,Math.PI);assert(w.cast(3,{point:new c.THREE.Vector3(10.7,.3,-16.4)}).ok);assert.equal(n.status.quests.QUEST_LV_02,'active');w.update(.1);assert.equal(n.status.quests.QUEST_LV_02,'active');
 w.deactivate();w.update(4);assert.equal(n.status.quests.QUEST_LV_02,'active');w.equip('bow');w.update(5);assert(w.cast(3,{point:new c.THREE.Vector3(10.7,.3,-16.4)}).ok);w.update(2.1);assert.equal(n.status.quests.QUEST_LV_02,'active');w.update(.5);
 assert.equal(n.status.quests.QUEST_LV_02,'ready');assert.equal(h.run('progress.score'),0);c.VietVillageGame.lock();
});
