'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),T=require('../../ASSETS/vendor/three.min.js');
const Core=require('../js/vfx/weapon-vfx-core.js'),Bow=require('../js/vfx/bow-piercing.js');require('../js/vfx/bow-skill-vfx.js');
function rig({tier='low',wall=null,targets=[]}={}){
 const scene=new T.Scene(),caster=new T.Group(),events=[],hits=[];caster.rotation.y=Math.PI;scene.add(caster);
 const vfx=new Core({THREE:T,scene,quality:tier,onEvent:e=>{events.push(e);if(e.type==='hit-window')for(const [id,x,z,y=0] of targets){const p=new T.Vector3(x,y,z);if(e.testTarget(id,p,.25))hits.push(id);assert.equal(e.testTarget(id,p,.25),false);}}});
 const cast=vfx.cast('bow.xuyen-tien',{caster}),fx=vfx.effects[0];fx.bow.trace=(a,b,r)=>Bow.traceWorld(T,a,b,r,wall?[wall]:[],()=>0);
 return {scene,caster,events,hits,vfx,fx,cast};
}
for(const dt of [1/30,1/60,1/120,.47,4])test('swept piercing path, dedup and nearest wall at delta '+dt,()=>{
 const wall=new T.Box3(new T.Vector3(-1,0,8),new T.Vector3(1,3,8.4));
 const r=rig({wall,targets:[['near',-.12,3],['second',-.12,6],['behind',-.12,10],['side',1,4],['high',-.12,4,4]]});
 while(r.vfx.time<1.6)r.vfx.update(dt);
 assert.deepEqual(r.hits,['near','second']);assert.equal(r.events.filter(e=>e.type==='release').length,1);assert.equal(r.events.filter(e=>e.type==='impact').length,3);
 const impact=r.events.filter(e=>e.type==='impact').at(-1);assert(Math.abs(impact.position.z-7.74)<1e-6);
 const event=r.events.find(e=>e.type==='hit-window');assert.equal(event.testTarget('late',new T.Vector3(-.12,0,5),.25),false);
 assert.equal(r.vfx.effects.length,0);r.vfx.dispose();assert.deepEqual(r.scene.children,[r.caster]);
});
test('miss, blocked muzzle, release gate and terrain have no phantom target hit',()=>{
 const miss=rig();miss.vfx.update(2);assert.equal(miss.events.filter(e=>e.type==='impact').length,0);miss.vfx.dispose();
 const r=rig({wall:new T.Box3(new T.Vector3(-1,0,.4),new T.Vector3(1,3,.7)),targets:[['behind',-.12,3]]});
 r.vfx.update(.17);assert.equal(r.hits.length,0);assert(!r.fx.bow.released);r.vfx.update(.04);assert.equal(r.hits.length,0);assert.equal(r.fx.bow.flight.visible,false);assert.equal(r.events.filter(e=>e.type==='impact').length,1);r.vfx.dispose();
 const hit=Bow.traceWorld(T,new T.Vector3(0,1,0),new T.Vector3(0,1,10),.1,[],p=>p.z>4?2:0);assert(hit.point.z>=4&&hit.point.z<4.2);
});
test('all quality levels dispose each owned resource once; cancel never releases later or resets cooldown',()=>{
 for(const tier of ['low','medium','high'])for(const age of [.08,.3,1.2]){
  const r=rig({tier});const counters=new Map([...r.fx.geometries,...r.fx.materials].map(o=>[o,0]));for(const o of counters.keys())o.addEventListener('dispose',()=>counters.set(o,counters.get(o)+1));
  r.vfx.update(age);r.vfx.cancel(r.cast.handle);const n=r.events.length;r.vfx.update(.1);assert.equal(r.events.length,n);assert.equal(r.vfx.cast('bow.xuyen-tien',{caster:r.caster}).reason,'cooldown');
  assert([...counters.values()].every(n=>n===1));r.vfx.dispose();assert.deepEqual(r.scene.children,[r.caster]);
 }
});
test('village button press has no practice hit; draw locks movement, reset restores bow and procedural arms',()=>{
 const {context:c,run}=require('./harness.cjs')(),w=c.VietVillageWeapons,seen=[];
 c.VietVillageNPCs={...c.VietVillageNPCs,onSkillUsed:e=>seen.push(e)};
 assert(w.equip('bow'));run('player.position.set(5,bridgeHeight(5,20),20);yaw=0;tick(1000);');
 const body=run('body'),meshes=[...run('leftArm').children,...run('rightArm').children].filter(o=>o.isMesh),base=meshes.map(m=>({p:m.position.clone(),q:m.quaternion.clone(),s:m.scale.clone()}));
 assert(w.cast(1).ok);assert(w.movementLocked);assert.equal(seen.length,0);assert.equal(w.cast(2).reason,'busy');
 w.update(.12);assert.equal(seen.length,0);assert(body.getObjectByName('village-bow-draw-pose'));
 w.update(.1);assert(seen.some(e=>e.kind==='piercing-arrow'));w.update(.5);assert.equal(w.movementLocked,false);assert.equal(body.getObjectByName('village-bow-draw-pose'),undefined);
 for(let i=0;i<meshes.length;i++){assert(meshes[i].position.equals(base[i].p));assert(meshes[i].quaternion.equals(base[i].q));assert(meshes[i].scale.equals(base[i].s));}
 w.suspend();assert.equal(w.state.active,0);assert(w.skills()[0].remaining>0);c.VietVillageGame.lock();
});
test('interrupted avatar draw cancels across skipped frames before any release',()=>{
 const {context:c,run}=require('./harness.cjs')(),w=c.VietVillageWeapons,seen=[];
 c.VietVillageNPCs={...c.VietVillageNPCs,onSkillUsed:e=>seen.push(e)};w.equip('bow');const socket=new c.THREE.Group();run('body').add(socket);w.setAvatarSocket(socket);socket.userData.bowDrawTime=0;
 assert(w.cast(1).ok);delete socket.userData.bowDrawTime;w.update(4);assert.equal(seen.length,0);assert.equal(w.state.active,0);c.VietVillageGame.lock();
});
