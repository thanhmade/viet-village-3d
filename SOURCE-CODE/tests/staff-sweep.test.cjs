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
test('continuous spin keeps one auxiliary wave and completes once',()=>{
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
test('360 degree sweep covers every quadrant across long frames and never re-hits a target',()=>{
 for(const dt of [1/120,1/60,1/30,.23,.30,1.8]){
  const {core}=fixture();const hits=new Map();
  core.onEvent=e=>{if(e.type==='hit-window'&&e.kind==='sweep'){
   for(let i=0;i<16;i++){const a=i*Math.PI/8;if(e.testTarget(i,{x:Math.sin(a)*1.7,y:0,z:Math.cos(a)*1.7},.05))hits.set(i,(hits.get(i)||0)+1);}
  }};
  for(let t=0;t<1.8;t+=dt)core.update(Math.min(dt,1.8-t));
  assert.equal(hits.size,16,'all directions at dt='+dt);for(const count of hits.values())assert.equal(count,1);core.dispose();
 }
});
test('spin hits are active immediately and during the final rotation, following the caster after the wave',()=>{
 const {core,caster}=fixture();let first=0,last=0;
 core.onEvent=e=>{if(e.type==='hit-window'&&e.kind==='sweep'){
  if(core.time<.01)first+=Number(e.testTarget('first',{x:0,y:0,z:-1.7},.2));
  if(core.time>1.7){assert.equal(e.position.x,8);assert.equal(e.position.z,8);last+=Number(e.testTarget('last',e.position,.1));}
 }};
 core.update(.001);core.update(1.5);caster.position.set(8,0,8);core.update(.298);assert.equal(first,1);assert.equal(last,1);core.cancelAll();core.update(10);assert.equal(last,1);core.dispose();
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
