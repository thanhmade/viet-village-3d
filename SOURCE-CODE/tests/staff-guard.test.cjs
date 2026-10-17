'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const context={};vm.createContext(context);
for(const f of ['staff-guard.js','player-journey.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../js',f),'utf8'),context);
const skill=require('../js/vfx/staff-skill-config.js').skills.find(s=>s.id==='staff.ho-than');
test('guard clock and absorption agree at 15, 30, 60 and 144 Hz, with no heal or damage tick',()=>{
 for(const fps of [15,30,60,144]){
  const g=context.createStaffGuard();assert.equal(g.start(skill,{maxHp:100,ownerId:'a',handle:9}),true);
  const until=t=>{while(g.state&&g.state.age<t-1e-10)g.advance(Math.min(1/fps,t-g.state.age));};
  until(.249);assert.equal(g.absorb(10,'a').damage,10);
  until(.25);assert.equal(g.absorb(10,'a').damage,0);assert.equal(g.state.remaining,20);
  until(2.649);assert.equal(g.absorb(5,'a').damage,0);assert.equal(g.state.remaining,15);
  until(2.65);assert.equal(g.state,null);assert.equal(g.absorb(10,'a').damage,10);
 }
});
test('guard skips expired windows after a large delta, rejects invalid inputs and cannot cross owners',()=>{
 const g=context.createStaffGuard();
 for(const hp of [NaN,0,-1,Infinity])assert.equal(g.start(skill,{maxHp:hp}),false);
 g.start(skill,{maxHp:100,ownerId:'a'});g.advance(3);assert.equal(g.absorb(30,'a').damage,30);
 g.start(skill,{maxHp:100,ownerId:'a'});g.advance(.5);g.advance(NaN);g.advance(-1);
 for(const amount of [NaN,Infinity,-1,0])assert.equal(g.absorb(amount,'a').absorbed,0);
 assert.equal(g.state.remaining,30);assert.equal(g.absorb(5,'b').damage,5);assert.equal(g.state,null);
 g.start(skill,{maxHp:200});g.advance(.5);const hit=g.absorb(70);assert.equal(hit.absorbed,60);assert.equal(hit.damage,10);assert.equal(hit.broken,true);
 assert.equal(g.absorb(1).damage,1);g.cancel();assert.equal(g.state,null);
});
test('session health applies combat mitigation but malformed hooks cannot heal or grant immunity',()=>{
 for(const remaining of [undefined,NaN,Infinity,-1,11]){
  const j=context.createVillageJourney({getIdentity:()=>({authenticated:true,uid:'a'}),mitigateDamage:()=>remaining});
  j.takeDamage(10);assert.equal(j.getState().hp,90);
 }
 const j=context.createVillageJourney({getIdentity:()=>({authenticated:true,uid:'a'}),mitigateDamage:()=>{throw Error('failed');}});
 j.takeDamage(10);assert.equal(j.getState().hp,90);
 let reactions=0;const g=context.createStaffGuard();g.start(skill,{maxHp:100,ownerId:'a'});g.advance(.5);
 const health=context.createVillageJourney({getIdentity:()=>({authenticated:true,uid:'a'}),mitigateDamage:({amount,uid})=>g.absorb(amount,uid).damage,onDamage:()=>reactions++});
 health.takeDamage(10);assert.equal(health.getState().hp,100);assert.equal(reactions,0);
 health.takeDamage(25);assert.equal(health.getState().hp,95);assert.equal(reactions,1);
});
