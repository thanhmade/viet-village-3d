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
test('wave swept window hits each target only once even on a slow frame',()=>{
 const {core,events}=fixture();core.update(1.3);let hits=0;
 for(const event of events.filter(e=>e.type==='hit-window'))if(event.testTarget('near',{x:2.1,y:0,z:0},.05))hits++;
 core.update(.5);for(const event of events.filter(e=>e.type==='hit-window'))if(event.testTarget('near',{x:2.1,y:0,z:0},.05))hits++;
 assert.equal(hits,1);
 const wave=events.filter(e=>e.kind==='wave').at(-1);
 assert(!wave.testTarget('far',{x:3.6,y:0,z:0},.05));assert(!wave.testTarget('air',{x:2.7,y:2,z:0},.05));
 assert(wave.testTarget('outer',{x:3.1,y:0,z:0},.05));core.dispose();
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
