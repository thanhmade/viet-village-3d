'use strict';
// Runs the real scene, navigation, interior, bridge and portal controller; WebGL/Firebase are mocked.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const createHarness=require('./harness.cjs');

function game(){
 const harness=createHarness();
 harness.run("$('play').onclick();climate.clock='manual';climate.hour=21;climate.weather='rain';updateClimate(1,true);player.userData.inventory=['book'];progress.score=270;let savedPlayer=player,savedInventory=player.userData.inventory;function travelFrames(count){for(let i=0;i<count;i++)tick((last||0)+40);}function dwellFor(seconds){while(seconds>1e-9){const step=Math.min(.1,seconds);housePortalSystem.update(step);seconds-=step;}}");
 assert(harness.run('gameInitialized&&localWalking&&player.visible&&!!housePortalSystem'));
 return harness;
}

test('all six direct transitions preserve player state and restore the matching safe yard spawn',()=>{
 const {run}=game();
 for(let index=0;index<6;index++){
  run(`body.rotation.y=1.23;enterHouse(${index});`);
  assert.equal(run('selectedHouse'),index);
  assert(run('insideHouse&&interiorRoot.visible&&!world.visible&&!player.visible&&!rainLines.visible'));
  assert(run(`player.position.distanceTo(new THREE.Vector3(housePortalConfigs[${index}].interiorSpawn.x,housePortalConfigs[${index}].interiorSpawn.y,housePortalConfigs[${index}].interiorSpawn.z))<1e-8`));
  assert(run('roomCanWalk(insidePosition.x,insidePosition.z)&&camera.position.distanceTo(insidePosition)<1e-8&&camera.fov===68'));
  assert.equal(run('VietVillageGame.getPose().mapId'),'house-'+(index+1));
  run('travelFrames(30);');assert(run('insideHouse'),'arrival must not trigger an immediate return');
  run('leaveHouse();');
  assert(run(`player.position.distanceTo(new THREE.Vector3(housePortalConfigs[${index}].yardSpawn.x,housePortalConfigs[${index}].yardSpawn.y,housePortalConfigs[${index}].yardSpawn.z))<1e-8`));
  assert(run('!insideHouse&&localWalking&&player.visible&&world.visible&&!interiorRoot.visible&&rainLines.visible&&camera.fov===48'));
  assert(run('body.rotation.y===1.23&&camera.position.y>player.position.y+1'));
  assert(run("player===savedPlayer&&player.userData.inventory===savedInventory&&savedInventory[0]==='book'&&progress.score===270&&climate.hour===21&&climate.weather==='rain'"));
  run('travelFrames(30);');assert(!run('insideHouse'),'yard spawn must remain outside the activation radius');
 }
});

test('six complete journeys follow actual movement through doorways, automatically enter and return',()=>{
 const {run}=game();
 for(let index=0;index<6;index++){
  run(`player.position.set(0,.3,21);approachHouse(${index});`);
  assert(run('!!target'),`house ${index+1}: entrance route exists`);
  run('for(let i=0;i<1800&&!insideHouse;i++)travelFrames(1);');
  assert(run('insideHouse'),`house ${index+1}: the actual movement loop reaches and activates the ring`);
  assert.equal(run('selectedHouse'),index);
  run('travelFrames(2);approachRoomExit();');assert(run('!!target'));
  run('for(let i=0;i<250&&insideHouse;i++)travelFrames(1);');
  assert(!run('insideHouse'),`house ${index+1}: the interior exit route activates its matching return`);
  assert(run(`player.position.distanceTo(new THREE.Vector3(housePortalConfigs[${index}].yardSpawn.x,housePortalConfigs[${index}].yardSpawn.y,housePortalConfigs[${index}].yardSpawn.z))<1e-8`));
  assert(run('canWalk(player.position.x,player.position.z)&&localWalking'));
 }
});

test('all four interior viewpoints can walk around furniture to the exit and joystick movement remains usable',()=>{
 const {run}=game();
 for(let view=0;view<4;view++){
  run(`enterHouse(4);roomView(${view});travelFrames(1);approachRoomExit();`);
  assert(run('!!target'),`interior view ${view}: route exists`);
  run('for(let i=0;i<400&&insideHouse;i++)travelFrames(1);');
  assert(!run('insideHouse'),`interior view ${view}: routed exit succeeds`);
 }
 run('enterHouse(4);roomView(0);let initialX=insidePosition.x;joystick.x=1;updateInterior(.1);');
 assert(run('insidePosition.x>initialX&&roomCanWalk(insidePosition.x,insidePosition.z)'));
 run('clearMotion();roomView(0);let initialZ=insidePosition.z;joystick.y=-1;updateInterior(.1);');
 assert(run('insidePosition.z<initialZ&&roomCanWalk(insidePosition.x,insidePosition.z)'));
 run("clearMotion();$('roomRight').onpointerdown({pointerId:1,preventDefault(){}});updateInterior(.1);");
 assert(run('keys.KeyD'));run("$('roomRight').onpointerup();");assert(!run('keys.KeyD'));
 assert(run('Math.abs(player.position.y-.03)<1e-8&&player.position.x===insidePosition.x&&player.position.z===insidePosition.z'));
});

test('actual game bridge cancels early visits, overlay interruption and long frame gaps before a fresh 0.8 seconds',()=>{
 const {run}=game();
 run('housePortalSystem.update(0);let entry=housePortalConfigs[4].entry;player.position.set(entry.x,entry.y,entry.z);housePortalSystem.update(0);dwellFor(.79);');
 assert(!run('insideHouse'));assert(run('housePortalSystem.status.elapsed>.78'));
 run('player.position.x+=1;housePortalSystem.update(.01);');assert.equal(run('housePortalSystem.status.elapsed'),0);
 run('player.position.x-=1;housePortalSystem.update(0);dwellFor(.4);$("referenceGallery").classList.remove("hidden");housePortalSystem.update(.1);');
 assert.equal(run('housePortalSystem.status.elapsed'),0);assert(!run('insideHouse'));
 run('$("referenceGallery").classList.add("hidden");dwellFor(1);');assert(!run('insideHouse'),'must leave the ring after an overlay interrupts a visit');
 run('player.position.x+=1;housePortalSystem.update(0);player.position.x-=1;housePortalSystem.update(0);dwellFor(.79);');
 assert(!run('insideHouse'));run('housePortalSystem.update(.01);');assert(run('insideHouse'));
 run('leaveHouse();tick(1000);player.position.copy(entry);tick(1040);for(let i=0;i<18;i++)tick(last+40);');
 assert(!run('insideHouse'));assert(run('housePortalSystem.status.elapsed>.7'));
 run('tick(last+1000);');assert(!run('insideHouse'),'a stalled frame cannot satisfy continuous presence');
 assert.equal(run('housePortalSystem.status.elapsed'),0);
});

test('walking across a ring is too short to teleport, and failed preparation preserves village position',()=>{
 const {run}=game();
 run('let entry=housePortalConfigs[4].entry;player.position.set(entry.x-1,.33,entry.z);yaw=0;housePortalSystem.update(0);keys.KeyD=true;travelFrames(14);clearMotion();');
 assert(!run('insideHouse'));assert.equal(run('housePortalSystem.status.elapsed'),0);
 run("interiorPortalConfigs.delete(housePortalConfigs[4].interiorId);player.position.set(entry.x,entry.y,entry.z);let positionBefore=player.position.clone(),cameraBefore=camera.position.clone();housePortalSystem.update(0);dwellFor(.8);");
 assert(run('!insideHouse&&world.visible&&!interiorRoot.visible&&player.position.equals(positionBefore)&&camera.position.equals(cameraBefore)'));
 assert(run("$('toast').textContent.includes('Không thể vào nhà')"));
 assert(run('housePortalSystem.status.blocked'));run('dwellFor(2);');assert(!run('insideHouse'));
});

test('authentication loss disables portal transition without starting a second game or accepting an unverified session',()=>{
 const {run}=game();
 run('housePortalSystem.update(0);player.position.copy(housePortalConfigs[4].entry);housePortalSystem.update(0);dwellFor(.7);testAuthAllowed=false;housePortalSystem.update(.1);dwellFor(1);');
 assert(!run('insideHouse'));assert.equal(run('housePortalSystem.status.elapsed'),0);
 run('testAuthAllowed=true;dwellFor(1);');assert(!run('insideHouse'),'revalidation while standing in a portal must wait for leaving and reentry');
});

test('retry helpers leave a blocked ring before approaching it again in both maps',()=>{
 const {run}=game();
 for(const index of [2,5]){
  run(`player.position.set(0,.3,21);housePortalSystem.update(0);player.position.copy(housePortalConfigs[${index}].entry);housePortalSystem.update(0);dwellFor(.4);resetHouseTravel();`);
  assert(run('housePortalSystem.status.blocked&&!insideHouse'));
  run(`approachHouse(${index});let leftEntry${index}=false;for(let i=0;i<250&&!insideHouse;i++){
   travelFrames(1);const entry=housePortalConfigs[${index}].entry;
   if(!insideHouse&&Math.hypot(player.position.x-entry.x,player.position.z-entry.z)>entry.radius)leftEntry${index}=true;
  }`);
  assert(run(`leftEntry${index}&&insideHouse&&selectedHouse===${index}`),'entry retry must physically leave the circle, rearm and enter');
  run(`travelFrames(1);insidePosition.set(0,1.55,2);housePortalSystem.update(0);dwellFor(.4);resetHouseTravel();`);
  assert(run('housePortalSystem.status.blocked&&insideHouse'));
  run(`approachRoomExit();let leftExit${index}=false;for(let i=0;i<250&&insideHouse;i++){
   travelFrames(1);const exit=housePortalConfigs[${index}].interiorExit;
   if(insideHouse&&Math.hypot(insidePosition.x-exit.x,insidePosition.z-exit.z)>exit.radius)leftExit${index}=true;
  }`);
  assert(run(`leftExit${index}&&!insideHouse`),'exit retry must physically leave the circle, rearm and return');
  assert(run(`player.position.distanceTo(new THREE.Vector3(housePortalConfigs[${index}].yardSpawn.x,housePortalConfigs[${index}].yardSpawn.y,housePortalConfigs[${index}].yardSpawn.z))<1e-8`));
 }
});

test('walking camera has an unobstructed ray at the gate and all six return spawns without changing user angles',()=>{
 const {run}=game();
 run(`let cameraChecks=[];
 function cameraRayClear(look,position){
  const direction=position.clone().sub(look),distance=direction.length();
  if(!Number.isFinite(distance)||distance<.099)return false;
  const ray=new THREE.Ray(look,direction.normalize()),hit=new THREE.Vector3();
  return !travelCameraBounds.some(bounds=>ray.intersectBox(bounds,hit)&&hit.distanceTo(look)<distance-1e-6);
 }
 const cameraSpawns=[{x:0,y:.3,z:21},...housePortalConfigs.map(entry=>entry.yardSpawn)];
 for(let index=0;index<cameraSpawns.length;index++)for(const angle of [0,.5,Math.PI/2,Math.PI,Math.PI*1.5])for(const elevation of [.2,.57,1]){
  const spawn=cameraSpawns[index];player.position.set(spawn.x,spawn.y,spawn.z);clearMotion();
  yaw=angle;pitch=elevation;sceneryRadius=8.5;
  const look=player.position.clone().add(new THREE.Vector3(0,1,0)),desired=villageWalkingCameraTarget(look).clone();
  const targetClear=cameraRayClear(look,desired);
  camera.position.set(0,4,29);travelFrames(1);
  cameraChecks.push({index,angle,elevation,targetClear,targetDistance:desired.distanceTo(look),frameClear:cameraRayClear(look,camera.position),unchanged:yaw===angle&&pitch===elevation&&sceneryRadius===8.5});
 }`);
 assert.equal(run('cameraChecks.length'),105);
 assert(run('cameraChecks.every(check=>check.targetClear)'),JSON.stringify(run('cameraChecks.filter(check=>!check.targetClear)')));
 assert(run('cameraChecks.every(check=>check.frameClear)'),JSON.stringify(run('cameraChecks.filter(check=>!check.frameClear)')));
 assert(run('cameraChecks.every(check=>check.unchanged)'),'collision avoidance must not rewrite the stored orbit controls');
 assert(run('cameraChecks.find(check=>check.index===0&&check.angle===0&&check.elevation===.57).targetDistance>=7'),'initial gate view must clear the roof without enlarging the avatar through excessive camera shortening');
 run(`const sideHouse=village.houses[4];player.position.set(sideHouse.x+3.5,.3,sideHouse.z);
  yaw=Math.PI/2;pitch=.57;sceneryRadius=8.5;
  const sideLook=player.position.clone().add(new THREE.Vector3(0,1,0)),sideTarget=villageWalkingCameraTarget(sideLook).clone();
  const sidePosition=sideLook.clone().add(new THREE.Vector3(8.5,0,0));constrainVillageCamera(sidePosition,sideLook);`);
 assert(run('canWalk(player.position.x,player.position.z)&&travelCameraBounds[4].containsPoint(sideLook)'),'the narrow side path is valid despite the conservative roof box');
 assert(run('Number.isFinite(sideTarget.x)&&Number.isFinite(sideTarget.y)&&Number.isFinite(sideTarget.z)&&sideTarget.distanceTo(sideLook)>8.4'));
 assert(run('sidePosition.distanceTo(sideLook)>8.4'),'an enclosing conservative box must not snap the camera to its nearby exit face');
 assert(run('yaw===Math.PI/2&&pitch===.57&&sceneryRadius===8.5'));
});
