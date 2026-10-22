'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const createHarness=require('./harness.cjs');
for(const [slot,id,duration] of [[1,'axe.khai-son',3.4],[2,'axe.pha-giap',2.8],[3,'axe.cuong-phong',4.8]]){
 test(id+': game movement, HUD and interruption share the actual cast lifecycle',()=>{
  const h=createHarness(),c=h.context,w=c.VietVillageWeapons,events=[];
  c.VietVillageNPCs={...c.VietVillageNPCs,onSkillUsed:e=>events.push(e)};
  w.equip('axe');h.run('player.position.set(5,bridgeHeight(5,20),20);yaw=0;tick(1000);');
  const origin=h.run('player').position.clone();assert(w.cast(slot).ok);assert.equal(events.length,0,'use alone does not award a hit');assert(w.movementLocked);
  const b=c.document.getElementById('weaponSkill'+slot);assert.equal(b.getAttribute('data-skill-id'),id);assert(b.getAttribute('aria-label').length>5);
  assert.equal(w.cast(slot).reason,'cooldown');assert.equal(w.cast(slot===3?1:3).reason,'busy');
  h.run('keys.KeyW=true');for(let i=0;i<15;i++)h.run('tick((last||0)+40)');h.run('keys.KeyW=false');
  assert(h.run('player').position.distanceTo(origin)<1e-7,'movement cannot slide feet during the authored pose');
  w.equip('bow');w.equip('axe');assert.equal(w.state.active,0);assert.equal(w.cast(slot).reason,'cooldown','equip keeps cooldown');w.update(8);
  const socket=new c.THREE.Group();h.run('body').add(socket);w.setAvatarSocket(socket);socket.userData.axeTechniqueTime=0;socket.userData.axeTechniqueSkillId=id;
  assert(w.cast(slot).ok);w.update(.1);delete socket.userData.axeTechniqueTime;const count=events.length;w.update(duration+1);
  assert.equal(events.length,count,'interrupted anticipation cannot resolve a late strike');assert.equal(w.state.active,0);assert(!w.movementLocked);c.VietVillageGame.lock();
 });
}


test('Cuồng Phong remains busy through recovery after its cooldown has elapsed',()=>{
 const h=createHarness(),w=h.context.VietVillageWeapons;
 w.equip('axe');h.run('player.position.set(5,bridgeHeight(5,20),20);yaw=0;tick(1000);');
 assert(w.cast(3).ok);w.update(4.6);
 assert(w.movementLocked,'the 4.8s authored pose still owns movement');
 assert.equal(w.skills()[2].remaining,0);assert.equal(w.cast(3).reason,'busy');
 w.update(.21);assert.equal(w.state.active,0);assert(!w.movementLocked);
 assert(w.cast(3).ok);w.deactivate();assert.equal(w.state.active,0);assert(!w.movementLocked);
 assert(h.run('localWalking&&player.visible'),'stowing an axe keeps the actor present');
 h.context.VietVillageGame.lock();
});

test('axe callbacks after death or map departure cannot resolve another target',()=>{
 for(const interruption of ['death','map']){
  const h=createHarness(),c=h.context,w=c.VietVillageWeapons,events=[];
  c.VietVillageNPCs={...c.VietVillageNPCs,onSkillUsed:e=>events.push(e)};
  w.equip('axe');h.run('player.position.set(5,bridgeHeight(5,20),20);yaw=0;tick(1000);');
  assert(w.cast(3).ok);w.update(.8);
  if(interruption==='death')c.VietVillageJourney.takeDamage(1000);
  else assert.equal(c.VietVillageRegions.travelTo('lang-tan-thu','village-entry').ok,true);
  h.run('tick((last||0)+40)');const count=events.length;w.update(6);
  assert.equal(events.length,count);assert.equal(w.state.active,0);assert(!w.movementLocked);
  c.VietVillageGame.lock();
 }
});


test('actual mounted fallback axe edge matches the mirrored VFX anchor through chops and four turns',()=>{
 const h=createHarness(),c=h.context,T=c.THREE,w=c.VietVillageWeapons;
 w.equip('axe');h.run('player.position.set(5,bridgeHeight(5,20),20);yaw=0;tick(1000);');
 const body=h.run('body');
 for(const heading of [0,.73])for(const [slot,id] of [[1,'axe.khai-son'],[2,'axe.pha-giap'],[3,'axe.cuong-phong']]){
  const spec=c.AxeTechniques.spec(id);
  for(const time of [.4,spec.releaseAt,spec.impactAt,spec.activeEnd]){
   w.equip('axe');w.update(10);body.rotation.y=heading;assert(w.cast(slot).ok);w.update(time);body.updateWorldMatrix(true,true);
   const caster=body.getObjectByName('village-weapon-caster'),origin=caster.getWorldPosition(new T.Vector3());
   const forward=new T.Vector3(0,0,-1).applyQuaternion(caster.getWorldQuaternion(new T.Quaternion()));
   const expected=c.AxeTechniques.authoredTip(T,{skillId:id,time,position:origin,forward,handedness:-1});
   const tip=body.getObjectByName('axe-tip').getWorldPosition(new T.Vector3());
   assert(tip.distanceTo(expected.tip)<1e-6,id+' at '+time+' heading '+heading+' edge gap '+tip.distanceTo(expected.tip));
   if(id==='axe.khai-son'&&time===spec.impactAt)assert(Math.abs(tip.y-origin.y)<.10,'overhead axe edge reaches the floor');
  }
 }
 w.deactivate();h.context.VietVillageGame.lock();
});

test('fallback axe hands reach both shaft anchors without stretching, waist detachment or planted-foot sinking',()=>{
 const h=createHarness(),c=h.context,T=c.THREE,w=c.VietVillageWeapons;
 w.equip('axe');h.run('player.position.set(5,bridgeHeight(5,20),20);yaw=0;tick(1000);');
 const body=h.run('body'),player=h.run('player'),origin=player.position.clone();
 const right=h.run('rightArm'),left=h.run('leftArm'),legs=[h.run('rightLeg'),h.run('leftLeg')];
 const torso=body.children.find(part=>part.isMesh&&part.geometry.parameters.width===.65);
 const soleY=legs.map(leg=>leg.children[1].localToWorld(new T.Vector3(0,-.075,0)).y);
 for(const [slot,id] of [[1,'axe.khai-son'],[2,'axe.pha-giap'],[3,'axe.cuong-phong']]){
  w.equip('axe');w.update(10);assert(w.cast(slot).ok);
  const spec=c.AxeTechniques.spec(id);let previous=torso.quaternion.clone();
  for(let frame=1;frame<=Math.ceil(spec.duration*60);frame++){
   const time=frame/60;w.update(1/60);body.updateWorldMatrix(true,true);
   assert(torso.quaternion.angleTo(previous)<.14,id+' has a torso discontinuity at '+time);previous.copy(torso.quaternion);
   assert(player.position.distanceTo(origin)<1e-8,'the torso solve cannot move the controller');
   for(let i=0;i<legs.length;i++)assert(legs[i].children[1].localToWorld(new T.Vector3(0,-.075,0)).y>=soleY[i]-1e-7,'planted feet stay above their original floor');
   if(c.AxeTechniques.sample(id,time).weight<.999999)continue;
   const caster=body.getObjectByName('village-weapon-caster'),position=caster.getWorldPosition(new T.Vector3());
   const forward=new T.Vector3(0,0,-1).applyQuaternion(caster.getWorldQuaternion(new T.Quaternion()));
   const anchors=c.AxeTechniques.authoredTip(T,{skillId:id,time,position,forward,handedness:-1});
   for(const [arm,target] of [[right,anchors.palm],[left,anchors.front]]){
    const [upper,forearm]=arm.children.filter(part=>part.isMesh);
    const hand=forearm.localToWorld(new T.Vector3(0,.14,0));
    assert(hand.distanceTo(target)<1e-6,id+' loses shaft contact at '+time+': '+hand.distanceTo(target));
    assert(Math.abs(upper.scale.y*.40-.34)<1e-8);assert(Math.abs(forearm.scale.y*.28-.34)<1e-8);
   }
   const pivot=body.getObjectByName('village-axe-technique-pose');
   assert(torso.localToWorld(new T.Vector3(0,-.38,0)).distanceTo(pivot.localToWorld(new T.Vector3(0,.8,0)))<1e-7,'rigid torso rotation keeps the waist joined');
  }
 }
 w.deactivate();c.VietVillageGame.lock();
});
