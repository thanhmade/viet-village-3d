'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const T = require('../../ASSETS/vendor/three.min.js');
const Core = require('../js/vfx/weapon-vfx-core.js');
require('../js/vfx/staff-skill-vfx.js');
require('../js/vfx/staff-skill-effects.js');
const config = require('../js/vfx/staff-vfx-config.js');
const s = Core.getWeaponConfigs().find(c=>c.weaponId==='staff').skills.find(s=>s.id==='staff.chan-dia');
function rig(quality='low', ground=()=>0) {
  const scene=new T.Scene(), caster=new T.Group(), hits=[], events=[];
  caster.position.y=ground(caster.position); scene.add(caster);
  const targets=[['near',.3,0],['middle',2,0],['edge',4.4,0],['outside',4.8,0],['air',2,2]];
  const vfx=new Core({THREE:T,scene,quality,getGroundY:ground,onEvent:e=>{
    events.push(e);
    if(e.type==='hit-window')for(const [id,d,up] of targets){
      const p=e.position.clone().add(new T.Vector3(d,0,0));p.y=ground(p)+up;
      if(e.testTarget(id,p,.05))hits.push({id,age:vfx.effects[0].age});
      assert.equal(e.testTarget(id,p,.05),false,'no duplicate or invalid target');
    }
  }});
  return {scene,caster,hits,events,vfx};
}
for(const [name,dt] of [['30 FPS',1/30],['60 FPS',1/60],['120 FPS',1/120],['long frames',.47],['one skipped timeline',8]]) {
  test('swept wave gives one hit per target at '+name,()=>{
    const r=rig();r.vfx.cast(s.id,{caster:r.caster});
    while(r.vfx.time<s.duration+.1)r.vfx.update(dt);
    assert.deepEqual(r.hits.map(h=>h.id).sort(),['edge','middle','near']);
    assert.equal(r.events.filter(e=>e.type==='impact').length,1);
    assert(r.hits.every(h=>h.age>=s.activeAt));
    if(dt<.1){assert(r.hits[0].age<r.hits[1].age);assert(r.hits[1].age<r.hits[2].age);}
    r.vfx.dispose();
  });
}
test('no hit before contact; canceled or retained callbacks cannot hit later',()=>{
  const r=rig();let cast=r.vfx.cast(s.id,{caster:r.caster});r.vfx.update(s.activeAt-.01);
  assert.equal(r.hits.length,0);r.vfx.cancel(cast.handle);r.vfx.update(4);assert.equal(r.hits.length,0);
  cast=r.vfx.cast(s.id,{caster:r.caster});r.vfx.update(s.activeAt+.1);
  const event=r.events.find(e=>e.type==='hit-window');assert(event);
  assert.equal(event.testTarget('late',event.position,0),false);
  const count=r.hits.length;r.vfx.cancel(cast.handle);r.vfx.update(s.duration+.1);assert.equal(r.hits.length,count);r.vfx.dispose();
});
test('sloped terrain target feet are tested against terrain at the target, not impact height',()=>{
  const r=rig('low',p=>.45*p.x);r.vfx.cast(s.id,{caster:r.caster});r.vfx.update(s.duration+.1);
  assert.deepEqual(r.hits.map(h=>h.id).sort(),['edge','middle','near']);r.vfx.dispose();
});
test('all art tiers keep the same gameplay and cleanup temporary slabs',()=>{
  for(const tier of ['low','medium','high']){
    const r=rig(tier);r.vfx.cast(s.id,{caster:r.caster});const fx=r.vfx.effects[0];
    r.vfx.update(s.activeAt+.18);
    assert(fx.slam.slabs.mesh.visible);assert.equal(fx.slam.slabs.mesh.count,config.slam.slabs[tier]);
    const matrix=new T.Matrix4();fx.slam.slabs.mesh.getMatrixAt(0,matrix);assert(matrix.elements.every(Number.isFinite));
    r.vfx.update(s.duration+.1);assert.deepEqual(r.hits.map(h=>h.id).sort(),['edge','middle','near']);
    assert.equal(fx.group.parent,null);r.vfx.dispose();assert.deepEqual(r.scene.children,[r.caster]);
  }
});
test('cooldown survives cancel; wrong weapon never starts a cast',()=>{
  const r=rig();const cast=r.vfx.cast(s.id,{caster:r.caster});r.vfx.cancel(cast.handle);
  assert.equal(r.vfx.cast(s.id,{caster:r.caster}).reason,'cooldown');r.vfx.dispose();
  const v=new Core({THREE:T,scene:new T.Scene(),getEquippedWeapon:()=> 'sword'});
  assert.equal(v.cast(s.id,{caster:new T.Group()}).reason,'wrong-weapon');v.dispose();
});

test('village adapter waits for contact; jumping during windup cancels without resetting cooldown',()=>{
  const {run,context}=require('./harness.cjs')();const w=context.VietVillageWeapons,seen=[];
  context.VietVillageNPCs={...context.VietVillageNPCs,onSkillUsed:e=>seen.push(e)};
  assert(w.equip('staff'));assert(w.cast(3).ok);assert.equal(seen.length,0,'no practice reward on button press');
  w.update(.5);assert.equal(seen.length,0);w.update(s.activeAt-.5+.01);assert(seen.some(e=>e?.kind==='ground-wave'));
  w.suspend();w.update(4);assert(w.cast(2).ok);assert(w.cast(3).ok);assert.equal(w.state.active,2);const before=seen.length;
  assert(run('playerMotion.jump()'));w.update(.8);assert.equal(seen.length,before,'jump cancels before release');
  assert.equal(w.state.active,1,'an existing shield survives cancellation of the ground strike');
  assert(w.onPlayerHit(new context.THREE.Vector3(0,1,0)),'shield still responds to a real hit');
  assert(w.skills().find(s=>s.slot===3).remaining>0);context.VietVillageGame.lock();
});

test('gathering aura surrounds the airborne body, fades at contact and disposes at every phase',()=>{
  const Slam=require('../js/vfx/staff-slam.js');
  for(const tier of ['low','medium','high'])for(const age of [.4,1.1,2.3,3.65,4.2,5.1]){
    const r=rig(tier),cast=r.vfx.cast(s.id,{caster:r.caster}),fx=r.vfx.effects[0];
    r.vfx.update(age);const a=fx.slam.aura;
    assert.equal(a.bands.length,tier==='low'?2:3);
    assert(Math.abs(a.root.position.y-(Slam.sample(age).lift+fx.casterHeight*.56))<1e-7);
    assert.equal(a.root.visible,age<s.activeAt);
    if(age<s.activeAt){assert(a.light.intensity>0);assert.equal(r.events.filter(e=>e.type==='impact').length,0);}
    else {assert.equal(a.light.intensity,0);assert.equal(a.seal.visible,false);}
    let disposed=0;a.bands[0].material.addEventListener('dispose',()=>disposed++);
    r.vfx.cancel(cast.handle);assert.equal(disposed,1);assert.equal(fx.group.parent,null);
    const hits=r.hits.length;r.vfx.update(8);assert.equal(r.hits.length,hits);r.vfx.dispose();
  }
});

test('interrupted linked avatar never releases its ground wave, even across a skipped timeline',()=>{
  const {context:c,run}=require('./harness.cjs')(),w=c.VietVillageWeapons,seen=[];
  c.VietVillageNPCs={...c.VietVillageNPCs,onSkillUsed:e=>seen.push(e)};
  w.equip('staff');const socket=new c.THREE.Group();run('body').add(socket);w.setAvatarSocket(socket);
  socket.userData.staffSlamTime=0;assert(w.cast(3).ok);assert(w.movementLocked);w.update(2.2);
  delete socket.userData.staffSlamTime;w.update(8);
  assert.equal(seen.length,0);assert.equal(w.movementLocked,false);assert.equal(w.state.active,0);c.VietVillageGame.lock();
});

test('original avatar leaps and gathers with a grounded controller, blocks movement for 5.4s and restores limbs',()=>{
  const {context:c,run}=require('./harness.cjs')(),w=c.VietVillageWeapons,T=c.THREE;
  w.equip('staff');run('player.position.set(5,bridgeHeight(5,20),20);yaw=0;tick(1000);');
  const player=run('player'),origin=player.position.clone(),body=run('body');
  const meshes=[...run('leftArm').children,...run('rightArm').children].filter(o=>o.isMesh);
  const baseline=meshes.map(m=>({p:m.position.clone(),s:m.scale.clone(),q:m.quaternion.clone()}));
  assert(w.cast(3).ok);run('keys.KeyW=true;');let checkedAir=false,checkedImpact=false;
  for(let frame=1;frame<=135;frame++){
    run('tick((last||0)+40)');const t=frame*.04;
    assert(player.position.distanceTo(origin)<1e-7,'controller stays fixed during the skill');
    if(t>2&&t<2.05){const pivot=body.getObjectByName('village-staff-slam-pose');assert(pivot.position.y>1.25);checkedAir=true;}
    if(t>3.9&&t<3.95){const staff=body.getObjectByName('weapon-staff');const tip=staff.localToWorld(new T.Vector3(1.4,0,0));assert(Math.abs(tip.y-origin.y)<.01);checkedImpact=true;}
  }
  assert(checkedAir&&checkedImpact);assert.equal(w.movementLocked,false);assert.equal(body.getObjectByName('village-staff-slam-pose'),undefined);
  for(let i=0;i<meshes.length;i++){assert(meshes[i].position.equals(baseline[i].p));assert(meshes[i].scale.equals(baseline[i].s));assert(meshes[i].quaternion.equals(baseline[i].q));}
  assert.equal(body.getObjectByName('village-local-weapon').parent,run('rightArm'));
  run('tick((last||0)+40)');assert(player.position.distanceTo(origin)>0,'movement resumes after the skill');c.VietVillageGame.lock();
});
