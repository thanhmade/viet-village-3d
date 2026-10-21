'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),T=require('../../ASSETS/vendor/three.min.js');
const Core=require('../js/vfx/weapon-vfx-core.js'),Spear=require('../js/vfx/spear-techniques.js'),Collision=require('../js/vfx/bow-piercing.js'),Config=require('../js/vfx/spear-skill-config.js');
require('../js/vfx/spear-skill-vfx.js');
const target=(id,x,z,y=0)=>({id,p:new T.Vector3(x,y,z)});
function rig(id,{quality='low',targets=[],walls=[],reject=[]}={}){
 const scene=new T.Scene(),caster=new T.Group(),events=[],hits=[];scene.add(caster);caster.rotation.y=Math.PI;
 const vfx=new Core({THREE:T,scene,quality,getGroundY:()=>0,getEquippedWeapon:()=> 'spear',onEvent:e=>{
  events.push(e);if(['target-query','hit-window'].includes(e.type))for(const t of targets){if(e.type==='hit-window'&&reject.includes(t.id))continue;
   const ok=e.testTarget(t.id,t.p,.25,2.2);if(e.type==='target-query')assert.equal(ok,false);if(ok){hits.push(t.id);assert.equal(e.testTarget(t.id,t.p,.25,2.2),false);}}
 }});
 const cast=vfx.cast(id,{caster}),fx=vfx.effects[0];fx.spear.trace=(a,z,r)=>Collision.traceWorld(T,a,z,r,walls,()=>0);return {vfx,fx,cast,events,hits,caster,scene};
}
const [pierce,sweep,vortex]=Spear.skillIds;
test('Spear: ids, balance values and complete readable phase durations are preserved',()=>{
 assert.deepEqual(Config.skills.map(s=>[s.id,s.duration,s.cooldown,s.range,s.radius]),[[pierce,2.6,1.3,6,.5],[sweep,3.2,2,3.8,3.8],[vortex,4.2,4,4.3,4.3]]);
 for(const s of Config.skills){assert.equal(Spear.spec(s.id).poseDuration,s.duration);assert(Spear.spec(s.id).releaseAt>0);assert(Spear.spec(s.id).activeEnd<s.duration);}
});
for(const dt of [1/30,1/60,1/120,.43,5])test('Xuyên Kích: nearest accepted target once at dt '+dt,()=>{
 const r=rig(pierce,{targets:[target('far',-.08,5.5),target('near',-.08,3.5),target('side',2,3),target('high',-.24,3,5)]});
 while(r.vfx.time<2.61)r.vfx.update(dt);assert.deepEqual(r.hits,['near']);assert.equal(r.events.filter(e=>e.type==='release').length,1);
 const hit=r.events.filter(e=>e.type==='impact');assert.equal(hit.length,1);assert.equal(hit[0].hitIndex,0);assert.equal(hit[0].contactKind,'target');
 assert(Math.abs(hit[0].contactTime-(1.04+(2.75-r.fx.spear.start.z)/r.fx.spear.length*.54))<1e-6);assert.equal(r.vfx.effects.length,0);
 for(const event of r.events.filter(e=>e.testTarget))assert.equal(event.testTarget('retained',new T.Vector3()),false);r.vfx.dispose();
});
test('Xuyên Kích: walls before target and behind muzzle block; wall beyond target does not',()=>{
 for(const z of [.5,2.7,4.8]){const r=rig(pierce,{targets:[target('dummy',-.24,3.5)],walls:[new T.Box3(new T.Vector3(-2,0,z),new T.Vector3(2,3,z+.1))]});r.vfx.update(5);
  assert.deepEqual(r.hits,z<3.5?[]:['dummy']);const hit=r.events.find(e=>e.type==='impact');assert.equal(hit.contactKind,z<3.5?'wall':'target');if(z<3.5)assert(hit.position.z<z);r.vfx.dispose();}
});
test('Xuyên Kích: missed and out-of-range targets have no fabricated impact; ineligible target does not shield eligible one',()=>{
 let r=rig(pierce,{targets:[target('behind',-.24,-2),target('far',-.24,9)]});r.vfx.update(1.5);assert(r.fx.spear.flight.visible);assert(r.fx.spear.contactsVisual.every(f=>!f.group.visible));r.vfx.update(5);assert.equal(r.events.filter(e=>e.type==='impact').length,0);r.vfx.dispose();
 r=rig(pierce,{targets:[target('invalid',-.24,3),target('valid',-.24,5)],reject:['invalid']});r.vfx.update(5);assert.deepEqual(r.hits,['valid']);r.vfx.dispose();
});
test('Xuyên Kích: physical thrust catches near enemies before the released qi and still awards only one target',()=>{
 for(const z of [.5,.8,1])for(const dt of [1/60,5]){
  const r=rig(pierce,{targets:[target('far',-.08,4),target('near',-.08,z)]});while(r.vfx.time<2.61)r.vfx.update(dt);
  assert.deepEqual(r.hits,['near']);const impact=r.events.find(e=>e.type==='impact');assert.equal(impact.contactTime,1.04);assert.equal(impact.contactKind,'target');r.vfx.dispose();
 }
});
test('Xuyên Kích: close wall and close target follow nearest contact order, including rejected near targets',()=>{
 let r=rig(pierce,{targets:[target('near',-.08,.8)],walls:[new T.Box3(new T.Vector3(-2,0,.5),new T.Vector3(2,3,.6))]});r.vfx.update(5);assert.deepEqual(r.hits,[]);assert.equal(r.events.find(e=>e.type==='impact').contactKind,'wall');r.vfx.dispose();
 r=rig(pierce,{targets:[target('near',-.08,.5)],walls:[new T.Box3(new T.Vector3(-2,0,1.6),new T.Vector3(2,3,1.7))]});r.vfx.update(5);assert.deepEqual(r.hits,['near']);assert.equal(r.events.find(e=>e.type==='impact').contactKind,'target');r.vfx.dispose();
 r=rig(pierce,{targets:[target('invalid-near',-.08,.6),target('valid-far',-.08,4)],reject:['invalid-near']});r.vfx.update(5);assert.deepEqual(r.hits,['valid-far']);r.vfx.dispose();
});
test('Xuyên Kích: reentrant cancellation during the physical thrust never starts flight or later hits',()=>{
 for(const type of ['target-query','hit-window']){const r=rig(pierce);r.vfx.onEvent=e=>{r.events.push(e);if(e.phase==='thrust'&&e.type===type)r.vfx.cancel(r.cast.handle);if(e.type==='target-query')e.testTarget('near',new T.Vector3(-.08,0,.5));};r.vfx.update(5);assert.equal(r.events.filter(e=>e.type==='impact').length,0);assert(!r.events.some(e=>e.phase==='flight'));r.vfx.dispose();}
});
for(const id of [sweep,vortex])for(const dt of [1/30,1/60,1/120,.43,5])test(id+': authored contact order and one hit per target survive dt '+dt,()=>{
 const r=rig(id,{targets:[target('front',0,2.5),target('right',2.5,0),target('back',0,-2.5),target('left',-2.5,0),target('far',8,0),target('high',0,2.5,5)]});
 while(r.vfx.time<Spear.spec(id).duration+.01)r.vfx.update(dt);
 assert.deepEqual(r.hits,id===sweep?['front','right']:['right','back','left','front']);assert.equal(new Set(r.hits).size,r.hits.length);
 assert.equal(r.events.filter(e=>e.type==='release').length,1);assert.equal(r.events.filter(e=>e.type==='impact').length,r.hits.length);
 assert.equal(r.events.filter(e=>e.type==='ground-pulse').length,id===vortex?1:0);assert(r.events.filter(e=>e.type==='impact').every(e=>e.hitIndex===0));
 for(const event of r.events.filter(e=>e.testTarget))assert.equal(event.testTarget('retained',new T.Vector3()),false);r.vfx.dispose();
});
test('Spear sweeps: solid wall occludes target from body even when outer arc passes it',()=>{
 for(const id of [sweep,vortex]){const wall=new T.Box3(new T.Vector3(-.6,0,1),new T.Vector3(.6,3,1.4)),r=rig(id,{targets:[target('behind-wall',0,2.5),target('side',2.5,0)],walls:[wall]});r.vfx.update(5);assert.deepEqual(r.hits,['side']);r.vfx.dispose();}
});
test('Spear: no target contacts are invented for decorative wind, rings, final ground shock or second spin',()=>{
 for(const id of Spear.skillIds){const r=rig(id);r.vfx.update(5);assert.equal(r.events.filter(e=>e.type==='impact').length,0);assert.equal(r.hits.length,0);if(id===vortex)assert(r.events.find(e=>e.type==='ground-pulse').visualOnly);r.vfx.dispose();}
});
test('Spear: all quality tiers clean up unique resources once and retain cooldown on cancellation',()=>{
 for(const id of Spear.skillIds)for(const quality of ['low','medium','high'])for(const at of [.2,1.1,1.6]){
  const r=rig(id,{quality,targets:[target('dummy',0,2.5)]}),resources=[...r.fx.geometries,...r.fx.materials],counts=new Map(resources.map(x=>[x,0]));
  for(const resource of resources)resource.addEventListener('dispose',()=>counts.set(resource,counts.get(resource)+1));r.vfx.update(at);const hits=r.hits.length;assert(r.vfx.cancel(r.cast.handle));assert([...counts.values()].every(n=>n===1));
  r.vfx.update(.001);assert.equal(r.hits.length,hits);if(at<Config.skills.find(s=>s.id===id).cooldown-.001)assert.equal(r.vfx.cast(id,{caster:r.caster}).reason,'cooldown');r.vfx.dispose();assert.deepEqual(r.scene.children,[r.caster]);
 }
});
test('Spear: cancellation inside release, query or hit callback prevents subsequent contacts',()=>{
 for(const id of Spear.skillIds)for(const type of ['release','target-query','hit-window']){const r=rig(id,{targets:[target('dummy',0,2.5)]});r.vfx.onEvent=e=>{r.events.push(e);if(e.type===type)r.vfx.cancel(r.cast.handle);if(e.type==='target-query')e.testTarget('dummy',new T.Vector3(0,0,2.5));};r.vfx.update(5);assert.equal(r.events.filter(e=>e.type==='impact').length,0);assert.equal(r.vfx.effects.length,0);r.vfx.dispose();}
});
test('Spear: actor-local two-hand anchors transform correctly under rotated translated world parent',()=>{
 for(const id of Spear.skillIds){const r=rig(id),parent=new T.Group();r.scene.add(parent);parent.position.set(5,.8,-3);parent.rotation.y=.72;parent.add(r.caster);r.vfx.cancelAll({resetCooldowns:true});r.vfx.cast(id,{caster:r.caster});const fx=r.vfx.effects[0];r.vfx.update(Spear.spec(id).releaseAt);
  const origin=r.caster.getWorldPosition(new T.Vector3()),forward=new T.Vector3(0,0,-1).applyQuaternion(r.caster.getWorldQuaternion(new T.Quaternion())),anchor=Spear.authoredTip(T,{skillId:id,time:Spear.spec(id).releaseAt,position:origin,forward});
  assert(Math.abs(anchor.front.distanceTo(anchor.palm)-.55)<1e-9);assert(Math.abs(anchor.tip.distanceTo(anchor.palm)-1.883)<1e-9);if(id===pierce)assert(fx.spear.start.distanceTo(anchor.tip)<1e-8);r.vfx.dispose();
 }
});
test('Phá Trận: body and spear rotate together through two full turns without recovery unwinding',()=>{
 let previous=-Infinity;for(let t=1.15;t<4.201;t+=1/120){const s=Spear.sample(vortex,t);assert(s.bodyYaw>=previous-1e-7);assert(Math.abs(s.angle-s.bodyYaw-.45)<1e-8);previous=s.bodyYaw;}
 assert(Math.abs(Spear.sample(vortex,2.75).bodyYaw-Math.PI*4)<1e-9);assert(Math.abs(Spear.sample(vortex,4.2).bodyYaw-Math.PI*4)<1e-9);
});
