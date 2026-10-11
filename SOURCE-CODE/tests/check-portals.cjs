const assert=require('assert');
const {run}=require('./harness.cjs')();
const flush=()=>new Promise(resolve=>setImmediate(resolve));
async function frames(n){for(let i=0;i<n;i++){run('tick(last+40)');await flush();}}
(async()=>{
  run("$('play').onclick();climate.clock='manual';climate.hour=20;player.userData.inventory=['book'];progress.score=270;");
  assert(run('roaming&&player.visible&&!active'));
  assert.equal(run('new Set(housePortalConfigs.map(h=>h.id)).size'),6);
  assert.equal(run('new Set(housePortalConfigs.map(h=>h.interiorId)).size'),6);
  assert(run('housePortalVisuals.length===6&&!!interiorExitPortal'));
  // Every perimeter sample is flat and clear of steps; both spawn regions are clear.
  for(let i=0;i<6;i++){
    assert(run(`(()=>{const h=housePortalConfigs[${i}],r=h.entry.radius+.13;
      if(!canWalk(h.yardSpawn.x,h.yardSpawn.z)||!roomCanWalk(h.roomSpawn.x,h.roomSpawn.z))return false;
      if(Math.hypot(h.entry.x-h.yardSpawn.x,h.entry.z-h.yardSpawn.z)<=r)return false;
      if(h.entry.z-r<=village.houses[${i}].z+3.53)return false;
      for(let j=0;j<32;j++){const a=j*Math.PI/16,x=h.entry.x+Math.sin(a)*r,z=h.entry.z+Math.cos(a)*r;
        if(!canWalk(x,z)||Math.abs(bridgeHeight(x,z)-(h.entry.y-.035))>.04)return false;}
      return true;})()`),`flat, walkable ring ${i}`);
    run(`player.position.set(0,.3,21);beginVillageWalk();approachHouse(${i});`);
    assert(run('!!target'),'route exists');
    for(let n=0;n<1800&&!run('insideHouse');n++)await frames(1);
    assert(run('insideHouse'),`automatic entry ${i}`);assert.equal(run('selectedHouse'),i);
    assert(run('roomCanWalk(player.position.x,player.position.z)&&!portalAtActor()'));
    assert.equal(run('camera.fov'),68);assert(run('!world.visible&&interiorRoot.visible&&!rainLines.visible'));
    assert.equal(run('progress.score'),270);assert.equal(run('player.userData.inventory[0]'),'book');
    await frames(25);assert(run('insideHouse'),'arrival never bounces back');
    run('approachRoomExit()');
    for(let n=0;n<200&&run('insideHouse');n++)await frames(1);
    assert(!run('insideHouse'),`exit ${i}`);
    assert(run(`player.position.distanceTo(new THREE.Vector3(housePortalConfigs[${i}].yardSpawn.x,housePortalConfigs[${i}].yardSpawn.y,housePortalConfigs[${i}].yardSpawn.z))<1e-8`));
    assert(run('canWalk(player.position.x,player.position.z)&&!portalAtActor()&&roaming'));
    assert.equal(run('camera.fov'),48);assert.equal(run('climate.hour'),20);
    assert(run('camera.position.y>player.position.y+1'),'exterior camera returns above the actor');
    await frames(25);assert(!run('insideHouse'),'yard does not re-trigger');
  }
  // Re-enter from the actual return spawn.
  run('approachHouse(5)');for(let n=0;n<250&&!run('insideHouse');n++)await frames(1);
  assert(run('insideHouse&&selectedHouse===5'));run('leaveHouse()');await frames(1);
  // A player crossing the centre at walking speed leaves before 0.8 s.
  run('beginVillageWalk();let testEntry=housePortalConfigs[4].entry;player.position.set(testEntry.x-1,.33,testEntry.z);keys={KeyD:true};');
  await frames(13);assert(!run('insideHouse'));assert.equal(run('housePortalSystem.elapsed'),0);
  run('keys={};player.position.set(testEntry.x,.33,testEntry.z)');await frames(10);
  assert(run('housePortalSystem.elapsed>0&&housePortalSystem.elapsed<.8'));
  run('player.position.x+=1');await frames(1);assert.equal(run('housePortalSystem.elapsed'),0);
  run('player.position.x-=1');await frames(19);assert(!run('insideHouse'));
  await frames(2);assert(run('insideHouse'),'fresh full dwell is required');
  for(let view=0;view<4;view++){
    run(`roomView(${view});approachRoomExit()`);
    assert(run('!!target'),'exit route from every furniture view');
    for(let n=0;n<350&&run('insideHouse');n++)await frames(1);
    assert(!run('insideHouse'),`exit around furniture from view ${view}`);
    run('enterHouse(4)');await frames(1);
  }
  // Mobile joystick, pointer buttons and yaw-relative movement use the same actor.
  run('roomView(0);joystick={x:1,y:0};');const x=run('insidePosition.x');await frames(5);
  assert(run('insidePosition.x')>x);run('clearMotion();roomView(0);joystick={x:0,y:-1};');const z=run('insidePosition.z');await frames(5);
  assert(run('insidePosition.z')<z);
  run("clearMotion();$('roomRight').onpointerdown({pointerId:1,preventDefault(){}});");await frames(2);assert(run('keys.KeyD'));run("$('roomRight').onpointerup();");assert(!run('keys.KeyD'));
  run('leaveHouse();beginVillageWalk();player.position.set(testEntry.x,.33,testEntry.z)');await frames(5);
  run("$('referenceBtn').onclick()");await frames(25);assert(!run('insideHouse'));assert.equal(run('housePortalSystem.elapsed'),0);
  run("$('closeReferences').onclick();player.position.x+=1;");await frames(1);
  // Simulated load failure: coordinates, camera and map stay intact, error is visible.
  run("housePortalSystem.prepare=()=>Promise.reject(new Error('Test load failure'));player.position.set(testEntry.x,.33,testEntry.z);let beforeFailure=player.position.clone();");
  await frames(25);assert(!run('insideHouse'));assert(run('world.visible&&player.position.equals(beforeFailure)'));
  assert(run("$('portalStatus').textContent.includes('Test load failure')"));
  // Standalone timing and late-readiness tests do not rely on rendering or frame rate.
  run(`let changes=0,errors=0,resolveMap;let fakePortal={};
    let dwell=new PortalDwellController({prepare:()=>new Promise(r=>resolveMap=r),transition:()=>changes++,onError:()=>errors++});
    dwell.update(0,fakePortal);dwell.update(.79,fakePortal);`);await flush();run('resolveMap()');await flush();run('dwell.update(0,fakePortal)');assert.equal(run('changes'),0);
  run('dwell.update(.01,fakePortal)');assert.equal(run('changes'),1);
  run('dwell.update(3,fakePortal)');assert.equal(run('changes'),1);
  run('dwell.update(0,null);dwell.update(0,fakePortal);dwell.update(.8,fakePortal)');await flush();run('resolveMap()');await flush();run('dwell.update(0,fakePortal)');assert.equal(run('changes'),2);
  run('dwell.update(0,null);dwell.update(0,fakePortal);dwell.update(.8,fakePortal)');await flush();run('dwell.update(0,null);resolveMap()');await flush();run('dwell.update(0,null)');assert.equal(run('changes'),2,'leaving cancels late map readiness');
  console.log('PASS: six full routed entry/exit journeys; unique IDs; flat ring clearance; safe spawn/fences; state preservation; re-entry; crossing/cancel/0.8 s threshold; joystick/buttons; overlay cancellation; load failure stays in village; late readiness and anti-loop lock.');
})().catch(error=>{console.error(error);process.exitCode=1;});
