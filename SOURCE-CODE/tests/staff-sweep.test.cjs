'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const T=require('../../ASSETS/vendor/three.min.js'),Core=require('../js/vfx/weapon-vfx-core.js'),Motion=require('../js/vfx/staff-sweep.js'),Config=require('../js/vfx/staff-skill-config.js');
require('../js/vfx/staff-skill-vfx.js');
const s=Config.skills[0];
function fixture(quality='low'){
 const scene=new T.Scene(),caster=new T.Group(),tip=new T.Object3D(),events=[];scene.add(caster,tip);
 const core=new Core({THREE:T,scene,quality,random:()=>.5,onEvent:e=>events.push(e)});
 tip.position.set(1,1.3,0);core.cast(s.id,{caster,weaponTip:tip});return {scene,caster,tip,events,core};
}
test('four stages are continuous, one release and no instantaneous full-radius impact',()=>{
 for(const fps of [30,60,120]){
  const {core,events,tip}=fixture();
  for(let i=1;i<=Math.ceil(s.duration*fps)+1;i++){
   const pose=Motion.sample(i/fps),a=pose.staffYaw;tip.position.set(Math.cos(a)*1.3,pose.handY,-Math.sin(a)*1.3);core.update(1/fps);
   if(core.time<s.phases.releaseAt)assert(!events.some(e=>e.type==='impact'));
  }
  assert.equal(events.filter(e=>e.type==='impact').length,1);assert.equal(events.filter(e=>e.type==='complete').length,1);assert.equal(core.effects.length,0);core.dispose();
 }
});
test('synchronous swept windows deduplicate targets, cover slow frames and expire after delivery',()=>{
 const {core,events}=fixture();let hits=0,outer=0;const retained=[];
 core.onEvent=e=>{events.push(e);if(e.type!=='hit-window')return;retained.push(e);
  if(e.testTarget('near',{x:2.1,y:0,z:0},.05))hits++;
  assert(!e.testTarget(null,{x:0,y:0,z:0},1));assert(!e.testTarget('bad',{x:0,y:0,z:0},-1));
  assert(!e.testTarget('self-invalid',{x:NaN,y:0,z:0},.05));
  if(e.kind==='wave'){
   assert(!e.testTarget('far',{x:3.6,y:0,z:0},.05));assert(!e.testTarget('air',{x:2.7,y:2,z:0},.05));
   if(e.testTarget('outer',{x:3.1,y:0,z:0},.05))outer++;
  }
 };
 core.update(1.3);core.update(.5);assert.equal(hits,1);assert.equal(outer,1);
 for(const e of retained)assert(!e.testTarget('late',{x:0,y:0,z:0},10),'retained callback cannot hit after its window');core.dispose();
});
test('slow direct swing covers its 160 degree sector, including front, without hitting behind',()=>{
 const {core,caster}=fixture();caster.rotation.y=Math.PI;let front=0,back=0,angle=0;
 core.onEvent=e=>{if(e.type==='hit-window'&&e.kind==='sweep'){
  angle=e.angle;front+=Number(e.testTarget('front',{x:0,y:0,z:1.5},.05));back+=Number(e.testTarget('back',{x:0,y:0,z:-1.5},.05));
 }};
 // Cast orientation in the fixture was -Z; prime heading at the new orientation before activeAt.
 core.update(.01);core.update(1.05);assert.equal(front,1);assert.equal(back,0);assert(Math.abs(angle-2.8)<1e-6);core.dispose();
});
test('trail newest sample follows actual weapon tip and does not rotate old history with actor',()=>{
 const {core,tip,caster}=fixture();core.update(.2);tip.position.set(2,1.2,.8);core.update(.1);
 const fx=core.effects[0],history=fx.sweep.samples.map(e=>e.point.clone());caster.rotation.y=1;caster.position.x=3;tip.position.set(3.2,1.1,1);core.update(.1);
 assert(fx.sweep.samples.some(e=>e.point.equals(history[0])));
 assert(fx.sweep.samples.at(-1).point.distanceTo(tip.position)<1e-7);
 for(const mesh of fx.sweep.ribbons)assert([...mesh.geometry.attributes.position.array].every(Number.isFinite));core.dispose();
});
test('one release stays at its launch location; debris falls and cancellation releases all owned GPU resources',()=>{
 const {core,caster,scene}=fixture('medium');core.update(1.15);const fx=core.effects[0],origin=fx.group.position.clone();
 caster.position.set(8,0,8);core.update(.1);assert(fx.group.position.equals(origin));
 const geometries=[...fx.geometries],materials=[...fx.materials],released=new Map();
 for(const resource of [...geometries,...materials])resource.addEventListener('dispose',()=>released.set(resource,(released.get(resource)||0)+1));
 core.cancelAll();assert.equal(core.pool.count,0);assert.equal(core.effects.length,0);assert(!scene.getObjectByName(s.id+'-vfx'));
 for(const resource of [...geometries,...materials])assert.equal(released.get(resource),1);core.dispose();
});
test('all quality levels stay within allocated buffers and work without a weapon tip',()=>{
 for(const quality of ['low','medium','high']){
  const scene=new T.Scene(),caster=new T.Group();scene.add(caster);const core=new Core({THREE:T,scene,quality});
  for(let cycle=0;cycle<10;cycle++){assert(core.cast(s.id,{caster}).ok);for(let i=0;i<120;i++)core.update(1/60);assert(core.pool.count<=core.pool.capacity);core.update(s.cooldown);}
  core.dispose();assert.equal(scene.children.length,1);
 }
});
