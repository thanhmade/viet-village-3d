'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),T=require('../../ASSETS/vendor/three.min.js');
const Core=require('../js/vfx/weapon-vfx-core.js'),Axe=require('../js/vfx/axe-techniques.js'),Collision=require('../js/vfx/bow-piercing.js'),Config=require('../js/vfx/axe-skill-config.js');
require('../js/vfx/axe-skill-vfx.js');
const [cleave,armor,cyclone]=Axe.skillIds,target=(id,x,z,y=0)=>({id,p:new T.Vector3(x,y,z)});
function rig(id,{targets=[],walls=[],quality='low',reject=[],ground=()=>0}={}){
 const scene=new T.Scene(),caster=new T.Group(),events=[],hits=[];caster.rotation.y=Math.PI;scene.add(caster);
 const vfx=new Core({THREE:T,scene,quality,getGroundY:ground,getEquippedWeapon:()=> 'axe',onEvent:e=>{
  events.push(e);if(['target-query','hit-window'].includes(e.type))for(const t of targets){if(e.type==='hit-window'&&reject.includes(t.id))continue;const hit=e.testTarget(t.id,t.p,.25,2.2);if(e.type==='target-query')assert.equal(hit,false);if(hit){hits.push(t.id);assert.equal(e.testTarget(t.id,t.p,.25,2.2),false);}}
 }});const cast=vfx.cast(id,{caster}),fx=vfx.effects[0];fx.axe.trace=(a,b,r)=>Collision.traceWorld(T,a,b,r,walls,ground);return {vfx,fx,cast,events,hits,caster,scene,targets};
}
test('Axe: original IDs and numeric balance preserved; timings allow anticipation, strike and recovery',()=>{
 assert.deepEqual(Config.skills.map(s=>[s.id,s.duration,s.cooldown,s.range,s.radius]),[[cleave,3.4,2.2,3.3,2.8],[armor,2.8,2.8,3,2.25],[cyclone,4.8,4.5,3.6,3.6]]);
 for(const s of Config.skills){const spec=Axe.spec(s.id);assert.equal(spec.poseDuration,s.duration);assert(spec.releaseAt>0);assert(spec.activeEnd<s.duration);assert.equal(Axe.sample(s.id,0).weight,0);assert.equal(Axe.sample(s.id,s.duration).weight,0);}
});
for(const id of [cleave,armor])for(const dt of [1/30,1/60,1/120,.43,6])test(id+': forward area, height, range, one contact per target and delta '+dt,()=>{
 const r=rig(id,{targets:[target('near',0,.5),target('front',0,2.2),target('side',1.3,1.8),target('behind',0,-2),target('far',0,6),target('high',0,2.2,5)]});while(r.vfx.time<Axe.spec(id).duration+.01)r.vfx.update(dt);
 assert.deepEqual(r.hits,['near','front','side']);assert.equal(r.events.filter(e=>e.type==='release').length,1);assert.equal(r.events.filter(e=>e.type==='impact'&&e.contactKind==='target').length,3);
 assert(r.events.filter(e=>e.type==='impact').every(e=>e.hitIndex===0));for(const e of r.events.filter(e=>e.testTarget))assert.equal(e.testTarget('retained',new T.Vector3(0,0,1)),false);assert.equal(r.vfx.effects.length,0);r.vfx.dispose();
});
for(const dt of [1/30,1/60,1/120,.43,6])test('Cuồng Phong: four directions hit once through four turns at delta '+dt,()=>{
 const r=rig(cyclone,{targets:[target('front',0,2.2),target('right',2.2,0),target('back',0,-2.2),target('left',-2.2,0),target('far',8,0),target('high',0,2.2,5)]});while(r.vfx.time<4.81)r.vfx.update(dt);
 assert.deepEqual([...r.hits].sort(),['back','front','left','right']);assert.equal(r.events.filter(e=>e.type==='impact').length,4);assert.equal(r.events.filter(e=>e.type==='release').length,1);r.vfx.dispose();
});
test('Cuồng Phong: target entering between rotations can be contacted once; leaving before a sweep cannot',()=>{
 const movable=target('moving',8,8),r=rig(cyclone,{targets:[movable]});r.vfx.update(1.5);assert.equal(r.hits.length,0);movable.p.set(0,0,2.2);for(let i=0;i<60;i++)r.vfx.update(1/60);assert.deepEqual(r.hits,['moving']);movable.p.set(8,0,8);r.vfx.update(3);assert.deepEqual(r.hits,['moving']);r.vfx.dispose();
});
test('Axe: wall occlusion remains valid when the external fan or orbit passes behind a wall',()=>{
 const wall=new T.Box3(new T.Vector3(-.6,0,.7),new T.Vector3(.6,3,1.0));for(const id of Axe.skillIds){const r=rig(id,{targets:[target('occluded',0,2.2),target('open-side',1.8,1.0)],walls:[wall]});r.vfx.update(6);assert.deepEqual(r.hits,['open-side']);r.vfx.dispose();}
});
test('Axe: wall behind target does not suppress a real contact',()=>{
 for(const id of Axe.skillIds){const r=rig(id,{targets:[target('front',0,2.2)],walls:[new T.Box3(new T.Vector3(-2,0,3),new T.Vector3(2,3,3.3))]});r.vfx.update(6);assert.deepEqual(r.hits,['front']);r.vfx.dispose();}
});
test('Phá Giáp: armor fragments require an accepted target; missed or host-rejected targets create none',()=>{
 for(const reject of [[],['dummy']]){const r=rig(armor,{targets:reject.length?[target('dummy',0,2.2)]:[],reject});r.vfx.update(1.1);assert(r.fx.axe.contactsVisual.every(c=>!c.armor&&!c.armorMesh.visible));assert.equal(r.events.filter(e=>e.type==='impact'&&e.contactKind==='target').length,0);r.vfx.dispose();}
 const r=rig(armor,{targets:[target('dummy',0,2.2)]});r.vfx.update(1.1);assert(r.fx.axe.contactsVisual.some(c=>c.armor&&c.armorMesh.visible));assert.equal(r.hits.length,1);r.vfx.dispose();
});
test('Khai Sơn: intended earth strike is visual-only and separate from target hits',()=>{
 const r=rig(cleave);r.vfx.update(1.4);assert(r.fx.axe.ground.visible);assert.equal(r.events.filter(e=>e.type==='impact').length,0);const pulse=r.events.find(e=>e.type==='ground-pulse');assert(pulse.visualOnly);assert(Math.abs(pulse.position.y)<1e-8);r.vfx.dispose();
});
test('Axe: wall in physical chopping path produces wall contact instead of ground eruption beyond wall',()=>{
 for(const id of [cleave,armor]){const r=rig(id,{walls:[new T.Box3(new T.Vector3(-2,0,.65),new T.Vector3(2,3,.85))]});r.vfx.update(Axe.spec(id).impactAt+.05);assert.equal(r.fx.axe.ground.visible,false);assert(r.events.some(e=>e.type==='impact'&&e.contactKind==='wall'));r.vfx.dispose();}
});
test('Axe: cancellation in release, candidate or accepted-hit callback cannot create later impacts',()=>{
 for(const id of Axe.skillIds)for(const type of ['release','target-query','hit-window']){const r=rig(id);r.vfx.onEvent=e=>{r.events.push(e);if(e.type===type)r.vfx.cancel(r.cast.handle);if(e.type==='target-query')e.testTarget('dummy',new T.Vector3(0,0,2.2));};r.vfx.update(6);assert.equal(r.events.filter(e=>e.type==='impact').length,0);assert.equal(r.vfx.effects.length,0);r.vfx.dispose();}
});
test('Axe: cancel before or after release destroys each resource once, keeps cooldown and leaves no ghosts',()=>{
 for(const id of Axe.skillIds)for(const quality of ['low','medium','high'])for(const at of [.2,1,1.5]){const r=rig(id,{quality,targets:[target('front',0,2.2)]}),resources=[...r.fx.geometries,...r.fx.materials],counts=new Map(resources.map(x=>[x,0]));resources.forEach(x=>x.addEventListener('dispose',()=>counts.set(x,counts.get(x)+1)));r.vfx.update(at);const hits=r.hits.length;assert(r.vfx.cancel(r.cast.handle));assert([...counts.values()].every(n=>n===1));r.vfx.update(.01);assert.equal(r.hits.length,hits);assert.equal(r.vfx.cast(id,{caster:r.caster}).reason,'cooldown');r.vfx.dispose();r.vfx.dispose();assert.deepEqual(r.scene.children,[r.caster]);assert([...counts.values()].every(n=>n===1));}
});
test('Axe: four-turn facing never unwinds during recovery; shaft and blade share authored socket transform',()=>{
 let last=-Infinity;for(let t=.65;t<=4.8;t+=1/120){const s=Axe.sample(cyclone,t);assert(s.bodyYaw>=last-1e-8);last=s.bodyYaw;assert(Math.abs(s.spinAngle-s.bodyYaw)<1e-9);}assert(Math.abs(Axe.sample(cyclone,4.8).bodyYaw-TAU4())<1e-8);
 for(const id of Axe.skillIds){const a=Axe.authoredTip(T,{skillId:id,time:Axe.spec(id).impactAt,position:new T.Vector3(3,.5,-2),forward:new T.Vector3(Math.sin(.8),0,Math.cos(.8))});assert(Math.abs(a.front.distanceTo(a.palm)-.42)<1e-8);assert(Math.abs(a.tip.distanceTo(a.palm)-Math.hypot(.455,1.33))<1e-8);}
 function TAU4(){return Math.PI*8;}
});
test('Axe: reflected procedural avatar keeps asymmetric blade edge on the reflected trail and ground',()=>{
 for(const id of Axe.skillIds)for(const time of [.5,1.08,1.35,2.2]){const args={skillId:id,time,position:new T.Vector3(),forward:new T.Vector3(0,0,1)},right=Axe.authoredTip(T,args),left=Axe.authoredTip(T,{...args,handedness:-1});for(const key of ['palm','front','tip']){const expected=right[key].clone();expected.x*=-1;assert(left[key].distanceTo(expected)<1e-8,id+' '+key+' asymmetric blade was not reflected');}}
 const tip=Axe.authoredTip(T,{skillId:cleave,time:1.35,position:new T.Vector3(),forward:new T.Vector3(0,0,1),handedness:-1}).tip;assert(tip.y<.15,'procedural blade floats above the ground eruption');
});
