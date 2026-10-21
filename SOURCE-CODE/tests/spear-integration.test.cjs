'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const createHarness=require('./harness.cjs');
for(const [slot,id,duration] of [[1,'spear.xuyen-kich',2.6],[2,'spear.thuong-phong',3.2],[3,'spear.pha-tran',4.2]]){
 test(id+': game movement, HUD and interruption share the actual cast lifecycle',()=>{
  const h=createHarness(),c=h.context,w=c.VietVillageWeapons,events=[];
  c.VietVillageNPCs={...c.VietVillageNPCs,onSkillUsed:e=>events.push(e)};
  w.equip('spear');h.run('player.position.set(5,bridgeHeight(5,20),20);yaw=0;tick(1000);');
  const origin=h.run('player').position.clone();assert(w.cast(slot).ok);assert.equal(events.length,0,'use alone does not award a hit');assert(w.movementLocked);
  const b=c.document.getElementById('weaponSkill'+slot);assert.equal(b.getAttribute('data-skill-id'),id);assert(b.getAttribute('aria-label').length>5);
  assert.equal(w.cast(slot).reason,'cooldown');assert.equal(w.cast(slot===3?1:3).reason,'busy');
  h.run('keys.KeyW=true');for(let i=0;i<15;i++)h.run('tick((last||0)+40)');h.run('keys.KeyW=false');
  assert(h.run('player').position.distanceTo(origin)<1e-7,'movement cannot slide feet during the authored pose');
  w.equip('bow');w.equip('spear');assert.equal(w.state.active,0);assert.equal(w.cast(slot).reason,'cooldown','equip keeps cooldown');w.update(8);
  const socket=new c.THREE.Group();h.run('body').add(socket);w.setAvatarSocket(socket);socket.userData.spearTechniqueTime=0;socket.userData.spearTechniqueSkillId=id;
  assert(w.cast(slot).ok);w.update(.1);delete socket.userData.spearTechniqueTime;const count=events.length;w.update(duration+1);
  assert.equal(events.length,count,'interrupted anticipation cannot resolve a late strike');assert.equal(w.state.active,0);assert(!w.movementLocked);c.VietVillageGame.lock();
 });
}
