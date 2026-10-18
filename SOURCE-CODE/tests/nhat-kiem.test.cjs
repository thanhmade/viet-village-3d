'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),T=require('../../ASSETS/vendor/three.min.js');
const Core=require('../js/vfx/weapon-vfx-core.js'),Sword=require('../js/vfx/sword-strike.js'),Collision=require('../js/vfx/bow-piercing.js');require('../js/vfx/sword-skill-vfx.js');
function rig({quality='low',targets=[],walls=[]}={}){
 const scene=new T.Scene(),caster=new T.Group(),events=[],hits=[];caster.rotation.y=Math.PI;scene.add(caster);
 const vfx=new Core({THREE:T,scene,quality,getGroundY:()=>0,onEvent:e=>{events.push(e);if(['target-query','hit-window'].includes(e.type))for(const target of targets){const ok=e.testTarget(target.id,target.p,target.r??.25,target.height??2.2);if(e.type==='target-query')assert.equal(ok,false);if(ok){hits.push({id:target.id,hit:e.hitIndex,phase:e.phase});assert.equal(e.testTarget(target.id,target.p,target.r??.25,target.height??2.2),false);}}}});
 const cast=vfx.cast('sword.nhat-kiem',{caster}),fx=vfx.effects[0];fx.strike.trace=(a,b,r)=>Collision.traceWorld(T,a,b,r,walls,()=>0);
 return {scene,caster,events,hits,vfx,fx,cast};
}
const target=(id,x,z,r=.25,y=0,height=2.2)=>({id,p:new T.Vector3(x,y,z),r,height});
for(const dt of [1/30,1/60,1/120,.43,5])test('three cuts and qi share one hit per target at delta '+dt,()=>{
 const r=rig({targets:[target('near',0,1.25)]});while(r.vfx.time<1.8)r.vfx.update(dt);
 assert.deepEqual(r.hits.map(h=>[h.id,h.hit]),[['near',0]]);assert.equal(r.events.filter(e=>e.type==='release').length,1);assert.equal(r.events.filter(e=>e.type==='impact').length,1);assert.equal(r.vfx.effects.length,0);
 for(const e of r.events.filter(e=>['target-query','hit-window'].includes(e.type)))assert.equal(e.testTarget('retained',new T.Vector3(0,0,1),1),false);
 r.vfx.dispose();assert.deepEqual(r.scene.children,[r.caster]);
});
test('flying qi reaches the nearest forward target, never behind/above/outside range',()=>{
 const r=rig({targets:[target('far',0,3.5),target('near',0,2.65),target('behind',0,-1),target('side',3,2),target('high',0,2.7,.25,4),target('outside',0,4.5)]});r.vfx.update(5);
 assert.deepEqual(r.hits.map(h=>h.id),['near']);assert.equal(r.hits[0].phase,'wave');r.vfx.dispose();
});
test('wall intercepts qi and point-blank obstruction suppresses later cuts and release',()=>{
 const wall=new T.Box3(new T.Vector3(-3,0,2.3),new T.Vector3(3,3,2.5)),r=rig({walls:[wall],targets:[target('behind',0,3)]});r.vfx.update(5);assert.equal(r.hits.length,0);const impacts=r.events.filter(e=>e.type==='impact');assert.equal(impacts.length,1);assert.equal(impacts[0].contactKind,'wall');assert(Math.abs(impacts[0].position.z-2.18)<1e-6);r.vfx.dispose();
 const close=new T.Box3(new T.Vector3(-3,0,.6),new T.Vector3(3,3,.8)),p=rig({walls:[close],targets:[target('behind',0,1.3)]});p.vfx.update(5);assert.equal(p.hits.length,0);assert.equal(p.events.filter(e=>e.type==='release').length,0);assert.equal(p.events.filter(e=>e.type==='impact').length,1);p.vfx.dispose();
});
test('empty space has a fading crescent but no contact flash, dust or practice',()=>{
 const r=rig();r.vfx.update(1.35);assert(r.fx.strike.wave.visible);assert(r.fx.strike.waveMeshes.every(m=>m.material.uniforms.uOpacity.value<1));assert.equal(r.events.filter(e=>e.type==='impact').length,0);for(const name of ['impact','impactWarm','burst','dust','rocks'])assert.equal(r.fx.strike[name].visible,false,name+' must require contact');r.vfx.update(.5);assert.equal(r.vfx.effects.length,0);r.vfx.dispose();
});
test('ribbons sample the held blade endpoints and disappear after cancellation',()=>{
 const r=rig(),weapon=new T.Group(),tip=new T.Object3D();tip.position.y=1.62;weapon.add(tip);r.scene.add(weapon);r.fx.weapon=weapon;r.fx.weaponTip=tip;
 const origin=new T.Vector3(),forward=new T.Vector3(0,0,1),at=.35,p=Sword.authoredBlade(T,origin,forward,at);weapon.quaternion.copy(p.rotation);weapon.scale.setScalar(.7);weapon.position.copy(p.palm).add(new T.Vector3(0,.084,0).applyQuaternion(p.rotation));r.vfx.update(at);
 const lane=r.fx.strike.lanes[0],last=lane.samples.at(-1);assert(last.tip.distanceTo(tip.getWorldPosition(new T.Vector3()))<1e-8);assert(last.base.distanceTo(weapon.localToWorld(new T.Vector3(0,.16,0)))<1e-8);assert(lane.layers.every(l=>l.mesh.visible));r.vfx.cancel(r.cast.handle);assert.equal(r.fx.group.parent,null);r.vfx.dispose();
});
test('cancel at each phase preserves cooldown and disposes each owned resource once',()=>{
 for(const quality of ['low','medium','high'])for(const time of [.1,.4,.7,1.06,1.4]){const r=rig({quality}),objects=[...r.fx.geometries,...r.fx.materials,r.fx.strike.rocks],disposed=new Map(objects.map(o=>[o,0]));for(const o of objects)o.addEventListener('dispose',()=>disposed.set(o,disposed.get(o)+1));r.vfx.update(time);r.vfx.cancel(r.cast.handle);const count=r.events.length;r.vfx.update(.01);assert.equal(r.events.length,count);assert.equal(r.vfx.cast('sword.nhat-kiem',{caster:r.caster}).reason,'cooldown');assert([...disposed.values()].every(n=>n===1));r.vfx.dispose();}
});
test('quality keeps hit logic, and reentrant cancellation cannot launch a ghost wave',()=>{
 for(const quality of ['low','medium','high']){const r=rig({quality,targets:[target('near',0,1.3)]});r.vfx.update(5);assert.equal(r.hits.length,1);r.vfx.dispose();}
 const r=rig();r.vfx.onEvent=e=>{r.events.push(e);if(e.type==='target-query')r.vfx.cancel(r.cast.handle);};r.vfx.update(5);assert.equal(r.events.filter(e=>e.type==='release'||e.type==='impact').length,0);r.vfx.dispose();
});
test('village controller locks the pose, restores procedural limbs, and rejects interrupted linked pose',()=>{
 const {context:c,run}=require('./harness.cjs')(),w=c.VietVillageWeapons,events=[];c.VietVillageNPCs={...c.VietVillageNPCs,onSkillUsed:e=>events.push(e)};w.equip('sword');run('player.position.set(5,bridgeHeight(5,20),20);yaw=0;tick(1000);');const player=run('player'),origin=player.position.clone(),meshes=[...run('rightArm').children,...run('leftArm').children].filter(m=>m.isMesh),base=meshes.map(m=>({p:m.position.clone(),q:m.quaternion.clone(),s:m.scale.clone()}));
 assert(w.cast(1).ok);assert.equal(events.length,0);assert(w.movementLocked);assert.equal(w.cast(2).reason,'busy');assert.equal(w.cast(1).reason,'cooldown');run('keys.KeyW=true;');for(let i=0;i<37;i++){run('tick((last||0)+40)');assert(player.position.distanceTo(origin)<1e-7);}run('keys.KeyW=false;tick((last||0)+80)');assert.equal(w.movementLocked,false);
 for(let i=0;i<meshes.length;i++){assert(meshes[i].position.equals(base[i].p));assert(meshes[i].quaternion.equals(base[i].q));assert(meshes[i].scale.equals(base[i].s));}assert(events.every(e=>e?.type==='target-query'));w.suspend();w.equip('sword');w.update(2);
 const socket=new c.THREE.Group();run('body').add(socket);w.setAvatarSocket(socket);socket.userData.swordStrikeTime=0;assert(w.cast(1).ok);w.update(.1);const count=events.length;delete socket.userData.swordStrikeTime;w.update(4);assert.equal(events.length,count);assert.equal(w.state.active,0);c.VietVillageGame.lock();
});

test('real NPC practice journal changes only after a sword contact, not query or early cancellation',async()=>{
 const fs=require('node:fs'),path=require('node:path'),h=require('./harness.cjs')(),c=h.context,n=c.VietVillageNPCs,w=c.VietVillageWeapons;
 c.VietVillageAuth.getProfile=()=>({uid:'sword-practice'});c.fetch=async url=>({ok:true,json:async()=>JSON.parse(fs.readFileSync(path.resolve(__dirname,'../../MAP/regions/lang-viet',/([^/]+)\.json/.exec(url)[1]+'.json'),'utf8'))});
 h.run("$('play').onclick()");assert(await n.load());
 const stand=(x,z,yaw=0)=>h.run(`player.position.set(${x},bridgeHeight(${x},${z}),${z});body.rotation.y=${yaw};VietVillageNPCs.update(.11);`);
 stand(7.6,21.6);assert(n.interact('NPC_LANG_VIET_TUAN_DINH'));h.run("$('npcQuests').children[0].children.find(b=>b.id==='accept-QUEST_LV_01').onclick()");n.lock();
 stand(2,-10.9);assert(n.interact('NPC_LANG_VIET_LY_TRUONG'));h.run("$('npcQuests').children[0].children.find(b=>b.id==='finish-QUEST_LV_01').onclick()");n.lock();
 stand(8.1,-14.6);assert(n.interact('NPC_LANG_VIET_VO_SU'));h.run("$('npcQuests').children[0].children.find(b=>b.id==='accept-QUEST_LV_02').onclick()");n.lock();
 w.equip('sword');stand(10.7,-14.3,Math.PI);assert(w.cast(1).ok);assert.equal(n.status.quests.QUEST_LV_02,'active');w.update(.1);assert.equal(n.status.quests.QUEST_LV_02,'active');
 w.deactivate();w.update(4);assert.equal(n.status.quests.QUEST_LV_02,'active');w.equip('sword');w.update(4);assert(w.cast(1).ok);w.update(.95);assert.equal(n.status.quests.QUEST_LV_02,'active');w.update(.5);
 assert.equal(n.status.quests.QUEST_LV_02,'ready');assert.equal(h.run('progress.score'),0);c.VietVillageGame.lock();
});
