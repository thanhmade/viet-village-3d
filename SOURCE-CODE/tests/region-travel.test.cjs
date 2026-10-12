'use strict';
// Real Three.js scene, navigation and game loop; rendering and Firebase are mocked by the harness.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const createHarness=require('./harness.cjs');

test('one shared village ring keeps both original connection IDs and safe arrival points',()=>{
 const {run}=game();
 assert.equal(run('regionTravel.current.manualPortals.length'),0);
 assert.equal(run('regionTravel.current.portal.activation'),'select');
 assert.equal(run("regionTravel.current.root.children.filter(item=>item.name.startsWith('cong-vung-')).length"),1);
 assert.equal(run("JSON.stringify(regionTravel.current.portal.choices.map(c=>[c.id,c.targetMapId,c.targetSpawnId]))"),JSON.stringify([
  ['dong-tre','ngoai-lang-dong-tre','from-lang-viet'],['lang-tan-thu','lang-tan-thu','village-entry']
 ]));
 run(`for(const c of regionTravel.current.portal.choices){const r=regionTravel.prepare(c.targetMapId),s=r.spawns[c.targetSpawnId];
  if(!r.canWalk(s.x,s.z)||Math.hypot(s.x-r.portal.x,s.z-r.portal.z)<=(r.portal.interactionRadius||r.portal.radius)+.4)throw Error('Unsafe arrival');}`);
});

test('crossing into the shared ring opens once, cancels movement and never travels on a timer or E',()=>{
 const {run}=game();
 run('regionTravel.update(0);yaw=0;keys.KeyW=true;regionFrames(15);');
 assert(run('regionTravel.isMenuOpen()&&overlays()'));
 run('const stoppedPose=player.position.clone();keys.KeyW=true;joystick.y=1;regionFrames(40);regionDwell(3);');
 assert(run('player.position.equals(stoppedPose)&&regionTravel.currentId==="lang-viet"'));
 assert.equal(run('regionTravel.interact()'),false);assert.equal(run('regionTravel.status.elapsed'),0);
 run("$('closeRegionDestinationMenu').onclick();regionTravel.reset();regionFrames(60);");
 assert(run('!regionTravel.isMenuOpen()&&!overlays()&&player.position.equals(stoppedPose)'));
 assert.equal(run("regionTravel.chooseDestination('lang-tan-thu').code"),'region/no-selection');
 // Motion works again, and only actual exit/reentry can reopen the picker.
 run('yaw=0;keys.KeyS=true;regionFrames(12);clearMotion();');assert(!run('player.position.equals(stoppedPose)'));
 run('keys.KeyW=true;regionFrames(15);clearMotion();');assert(run('regionTravel.isMenuOpen()'));
});

test('picker buttons use the same denial reason as atlas access and recheck state on selection',()=>{
 const {run,context}=game(),r=context.VietVillageRegions;
 run('outsideRegionPortal();standInRegionPortal();');
 const access=r.checkTravelAccess('ngoai-lang-dong-tre','from-lang-viet');
 assert.equal(access.code,'region/tutorial-required');
 assert(run("$('regionDestinationChoices').children[0].children[0].disabled"));
 assert.equal(run("$('regionDestinationChoices').children[0].children[1].textContent"),access.message);
 assert(!run("$('regionDestinationChoices').children[1].children[0].disabled"));
 context.VietVillageJourney.setCharacterState({alive:false});
 assert.equal(r.chooseDestination('lang-tan-thu').code,'region/character-dead');
 assert.equal(r.currentId,'lang-viet');assert(r.isMenuOpen());
 context.VietVillageJourney.setCharacterState({alive:true});
 r.closeMenu();run('outsideRegionPortal();standInRegionPortal();');
 assert(r.chooseDestination('lang-tan-thu').ok);assert(!r.isMenuOpen());
 assert.equal(r.chooseDestination('dong-tre').code,'region/no-selection','A second click cannot queue another transition');
});

test('touch joystick enters the shared ring and the destination button explicitly travels',()=>{
 const {run}=game();
 run(`regionTravel.update(0);yaw=0;$('stick').onpointerdown({pointerId:9,clientX:56,clientY:20});
  for(let i=0;i<50&&!regionTravel.isMenuOpen();i++)regionFrames(1);$('stick').onpointerup();`);
 assert(run('regionTravel.isMenuOpen()&&joystick.x===0&&joystick.y===0&&target===null&&waypoints.length===0'));
 assert(run("$('regionDestinationChoices').children[1].children[0].onclick().ok"));
 assert.equal(run('regionTravel.currentId'),'lang-tan-thu');
 run('regionFrames(90);');assert.equal(run('regionTravel.currentId'),'lang-tan-thu');
 assert(!run('regionTravel.isMenuOpen()'));
});

function game(){
 const harness=createHarness();
 harness.run(`$('play').onclick();
  climate.clock='manual';climate.hour=21;climate.weather='rain';updateClimate(0,true);
  player.userData.inventory=['book','lotus'];progress.score=270;
  let savedPlayer=player,savedBody=body,savedInventory=player.userData.inventory,savedScene=scene,savedCamera=camera;
  function regionFrames(count){for(let i=0;i<count;i++)tick((last||0)+40);}
  function regionDwell(seconds){while(seconds>1e-9){const step=Math.min(.1,seconds);regionTravel.update(step);seconds-=step;}}
  function standInRegionPortal(){regionTravel.update(0);const r=regionTravel.current;player.position.set(r.portal.x,r.groundHeight(r.portal.x,r.portal.z),r.portal.z);regionTravel.update(0);}
  function transitionRegion(){standInRegionPortal();if(regionTravel.current.portal.activation==='select'){if(!regionTravel.chooseDestination('lang-tan-thu').ok)throw Error('Selection failed');}else regionDwell(.8);}
  function outsideRegionPortal(){const r=regionTravel.current;player.position.set(r.spawn.x,r.spawn.y,r.spawn.z);regionTravel.update(0);}
  function regionInventory(){const geometries=new Set(),materials=new Set();let objects=0;scene.traverse(object=>{objects++;if(object.geometry)geometries.add(object.geometry);if(object.material){for(const material of Array.isArray(object.material)?object.material:[object.material])materials.add(material);}});return JSON.stringify({objects,geometries:geometries.size,materials:materials.size});}
 `);
 assert(harness.run('localWalking&&player.visible&&regionTravel===window.VietVillageRegions'));
 assert.equal(harness.run('regionTravel.currentId'),'lang-viet');
 return harness;
}

test('region descriptors preserve the old village, refer to real reference files and provide safe playable 3D destinations',()=>{
 const {run,root}=game();
 run("let originalRegion=regionTravel.current;let preparedRegion=regionTravel.prepare('lang-tan-thu');");
 assert(run("regionTravel.current===originalRegion&&originalRegion.root.visible&&!preparedRegion.root.visible"),'preparing a map must not move the player or show it');
 assert(run("originalRegion.root.userData.regionId==='lang-viet'&&originalRegion.root.userData.preservedVillageGeometry"));
 assert.equal(run('originalRegion.references.length'),5);
 assert.equal(run('preparedRegion.references.length'),4);
 assert(run("originalRegion.root.getObjectByName('cong-vung-lang-viet')&&preparedRegion.root.getObjectByName('cong-vung-lang-tan-thu')"));
 assert(run('originalRegion.root!==preparedRegion.root&&originalRegion.root.parent===world&&preparedRegion.root.parent===world'));
 for(const id of ['lang-viet','lang-tan-thu']){
  const references=run(`regionTravel.prepare('${id}').references`);
  for(const reference of references)assert(fs.existsSync(path.resolve(root,'SOURCE-CODE',reference.path)),reference.path);
  run(`{const region=regionTravel.prepare('${id}');let meshes=0;region.root.traverse(object=>{if(object.isMesh)meshes+=object.isInstancedMesh?object.count:1;});
   if(meshes<40)throw new Error('Destination requires actual 3D geometry');
   if(!region.canWalk(region.spawn.x,region.spawn.z)||!region.canWalk(region.portal.x,region.portal.z))throw new Error('Unsafe spawn or portal');
   if(Math.hypot(region.spawn.x-region.portal.x,region.spawn.z-region.portal.z)<=region.portal.radius+.4)throw new Error('Arrival would retrigger portal');
   if(Math.abs(region.groundHeight(region.spawn.x,region.spawn.z)-region.spawn.y)>.12)throw new Error('Spawn is above or below its floor');
   for(let i=0;i<64;i++){const angle=i*Math.PI/32;if(!region.canWalk(region.portal.x+Math.cos(angle)*region.portal.radius,region.portal.z+Math.sin(angle)*region.portal.radius))throw new Error('Portal crosses collision');}
  }`);
 }
});

test('both directions use pathfinding; village entry opens the picker and Tân Thủ return uses dwell',()=>{
 const {run}=game();
 for(const destination of ['lang-tan-thu','lang-viet']){
  const source=run('regionTravel.currentId');
  assert(run('regionTravel.approachPortal()'));
  assert.equal(run('regionTravel.currentId'),source,'the toolbar action must only route the character');
  assert(run('!!target'));
  run(`for(let i=0;i<600&&regionTravel.currentId==='${source}'&&!regionTravel.isMenuOpen();i++)regionFrames(1);if(regionTravel.isMenuOpen())regionTravel.chooseDestination('lang-tan-thu');`);
  assert.equal(run('regionTravel.currentId'),destination);
  assert(run('player.position.distanceTo(new THREE.Vector3(regionTravel.current.spawn.x,regionTravel.current.spawn.y,regionTravel.current.spawn.z))<1e-8'));
  assert(run('canWalk(player.position.x,player.position.z)&&world.visible&&player.visible&&localWalking&&!insideHouse'));
  assert.equal(run('VietVillageGame.getPose().mapId'),destination==='lang-viet'?'village':'lang-tan-thu');
  run('regionFrames(30);');assert.equal(run('regionTravel.currentId'),destination,'arrival outside the ring must not bounce back');
 }
});

test('ten round trips preserve the same actor, inventory, equipment, progress and climate without rebuilding scenes',()=>{
 const {run,context}=game();
 assert(context.VietVillageWeapons.equip('sword'));
 run("let savedWeapons=villageWeapons;regionTravel.prepare('lang-tan-thu');let savedVillage=regionTravel.current,savedNewRegion=regionTravel.prepare('lang-tan-thu');yaw=.73;pitch=.61;sceneryRadius=8.5;body.rotation.y=1.23;let baselineObjects=regionInventory();");
 for(let i=0;i<10;i++)for(const destination of ['lang-tan-thu','lang-viet']){
  run('transitionRegion();');assert.equal(run('regionTravel.currentId'),destination);
  assert(run("player===savedPlayer&&body===savedBody&&scene===savedScene&&camera===savedCamera&&villageWeapons===savedWeapons&&player.userData.inventory===savedInventory&&savedInventory.join(',')==='book,lotus'&&progress.score===270"));
  assert.equal(context.VietVillageWeapons.state.weaponId,'sword');
  assert(run('yaw===.73&&pitch===.61&&sceneryRadius===8.5&&body.rotation.y===1.23'));
  assert(run("climate.hour===21&&climate.weather==='rain'&&climate.clock==='manual'"));
  assert(run('travelCameraBounds===regionTravel.current.cameraBounds'));
  assert(run('regionInventory()===baselineObjects'),'cached maps must not add duplicate meshes, materials, lights or portals on return');
 }
 assert.equal(run('regionTravel.status.loadedIds.length'),2);
 assert(run("regionTravel.prepare('lang-viet')===savedVillage&&regionTravel.prepare('lang-tan-thu')===savedNewRegion"));
});

test('the Tân Thủ return still cancels dwell on early exit and frame stalls',()=>{
 const {run}=game();run('transitionRegion();standInRegionPortal();regionDwell(.79);');
 assert.equal(run('regionTravel.currentId'),'lang-tan-thu');assert(run('regionTravel.status.elapsed>.78'));
 run('outsideRegionPortal();');assert.equal(run('regionTravel.status.elapsed'),0);
 run('standInRegionPortal();regionDwell(.4);regionTravel.update(1);regionDwell(1);');
 assert.equal(run('regionTravel.currentId'),'lang-tan-thu');assert.equal(run('regionTravel.status.elapsed'),0);
 run('outsideRegionPortal();standInRegionPortal();regionDwell(.79);');assert.equal(run('regionTravel.currentId'),'lang-tan-thu');
 run('regionTravel.update(.01);');assert.equal(run('regionTravel.currentId'),'lang-viet');
});

test('overlays and expired authentication prevent opening and choosing destinations',()=>{
 const {run}=game();
 run("regionTravel.update(0);$('referenceGallery').classList.remove('hidden');player.position.set(0,.3,20);regionTravel.update(.1);");
 assert(!run('regionTravel.isMenuOpen()'));assert.equal(run('regionTravel.currentId'),'lang-viet');
 run("$('referenceGallery').classList.add('hidden');outsideRegionPortal();standInRegionPortal();testAuthAllowed=false;");
 assert.equal(run("regionTravel.chooseDestination('lang-tan-thu').code"),'region/auth-required');
 run('regionTravel.update(.1);');assert(!run('regionTravel.isMenuOpen()'));assert(!run('regionTravel.approachPortal()'));
 run('testAuthAllowed=true;regionDwell(1);');assert(!run('regionTravel.isMenuOpen()'));
 run('outsideRegionPortal();transitionRegion();');assert.equal(run('regionTravel.currentId'),'lang-tan-thu');
});

test('a failed picker destination stays disabled without repeated loads and preserves source pose',()=>{
 const {run}=game();
 run("const factory=createLangTanThuRegion;let loads=0;window.createLangTanThuRegion=()=>{loads++;throw Error('controlled map load failure');};outsideRegionPortal();standInRegionPortal();const pose=player.position.clone(),cameraPose=camera.position.clone(),source=regionTravel.current;");
 assert.equal(run('loads'),1);run('regionDwell(2);');assert.equal(run('loads'),1);
 assert(run('regionTravel.isMenuOpen()&&regionTravel.current===source&&player.position.equals(pose)&&camera.position.equals(cameraPose)'));
 assert(run("$('regionDestinationChoices').children[1].children[0].disabled"));
 assert.match(run("$('regionDestinationChoices').children[1].children[1].textContent"),/controlled map load failure/);
 run('regionTravel.closeMenu();window.createLangTanThuRegion=factory;regionDwell(1);');assert(!run('regionTravel.isMenuOpen()'));
 run('outsideRegionPortal();transitionRegion();');assert.equal(run('regionTravel.currentId'),'lang-tan-thu');
});

test('returning to Làng Việt preserves all six interiors while Tân Thủ cannot enter an unrelated village house',()=>{
 const {run}=game();
 run('transitionRegion();let newMapPosition=player.position.clone();enterHouse(0);');
 assert.equal(run('regionTravel.currentId'),'lang-tan-thu');
 assert(run('!insideHouse&&player.position.equals(newMapPosition)&&!interiorRoot.visible'));
 assert(run("$('houseBtn').disabled&&$('enterHouseBtn').disabled"));
 run('transitionRegion();');
 for(let index=0;index<6;index++){
  run(`enterHouse(${index});`);assert(run(`insideHouse&&selectedHouse===${index}&&interiorRoot.visible&&!world.visible`));
  assert(!run('regionTravel.approachPortal()'),'a region switch cannot start while inside a house');
  run('regionDwell(1);');assert.equal(run('regionTravel.currentId'),'lang-viet');
  run('leaveHouse();');assert(run(`!insideHouse&&world.visible&&player.position.distanceTo(new THREE.Vector3(housePortalConfigs[${index}].yardSpawn.x,housePortalConfigs[${index}].yardSpawn.y,housePortalConfigs[${index}].yardSpawn.z))<1e-8`));
 }
});

test('retry routing leaves a cancelled portal and touch joystick movement remains collision checked in the new region',()=>{
 const {run}=game();
 for(const destination of ['lang-tan-thu','lang-viet']){
  const source=run('regionTravel.currentId');
  run('standInRegionPortal();regionDwell(.4);regionTravel.closeMenu();regionTravel.reset();');
  assert(!run('regionTravel.status.armed'));assert(run('regionTravel.approachPortal()'));
  run(`var departed=false;for(let i=0;i<600&&regionTravel.currentId==='${source}';i++){regionFrames(1);const p=regionTravel.current.portal;if(regionTravel.currentId==='${source}'&&Math.hypot(player.position.x-p.x,player.position.z-p.z)>p.radius)departed=true;if(regionTravel.isMenuOpen())regionTravel.chooseDestination('lang-tan-thu');}`);
  assert(run('departed'),'retry must physically leave the blocked circle');assert.equal(run('regionTravel.currentId'),destination);
  if(destination==='lang-tan-thu'){
   run('let beforeJoystick=player.position.clone();yaw=0;joystick.x=1;regionFrames(3);clearMotion();');
   assert(run('player.position.distanceTo(beforeJoystick)>.01&&canWalk(player.position.x,player.position.z)'));
   assert(run('Math.abs(player.position.y-regionTravel.current.groundHeight(player.position.x,player.position.z))<1e-6'));
  }
 }
});

test('commit failure restores the complete camera pose and source scene before a safe retry',()=>{
 const {run,context}=game();
 const errors=[];context.console={...console,error:(...args)=>errors.push(args)};
 run(`standInRegionPortal();
  sceneryFocus.copy(player.position).add(new THREE.Vector3(0,1,0));
  camera.position.copy(villageWalkingCameraTarget(sceneryFocus));camera.lookAt(sceneryFocus);
  const rollbackRegion=regionTravel.current,rollbackPosition=player.position.clone(),rollbackCamera=camera.position.clone(),
   rollbackQuaternion=camera.quaternion.clone(),rollbackFocus=sceneryFocus.clone(),rollbackBounds=travelCameraBounds;
  const originalClimateUpdate=updateClimate;let failCommitOnce=true;
  updateClimate=function(...args){if(failCommitOnce){failCommitOnce=false;throw new Error('controlled climate commit failure');}return originalClimateUpdate(...args);};
  let failedChoice;try{failedChoice=regionTravel.chooseDestination('lang-tan-thu');}finally{updateClimate=originalClimateUpdate;}
 `);
 assert.equal(run('failedChoice.code'),'region/transition-failed');
 assert(run('!failCommitOnce'),'The failure must occur after commit changed the camera');
 assert(run('regionTravel.current===rollbackRegion&&rollbackRegion.root.visible'));
 assert(run("!regionTravel.prepare('lang-tan-thu').root.visible"));
 assert(run('player.position.equals(rollbackPosition)&&camera.position.equals(rollbackCamera)&&sceneryFocus.equals(rollbackFocus)&&travelCameraBounds===rollbackBounds'));
 assert(run('camera.quaternion.angleTo(rollbackQuaternion)<1e-7'),'Rollback must restore orientation immediately, before another render frame');
 assert(run("$('regionDestinationMessage').textContent.includes('controlled climate commit failure')"));
 run('regionDwell(1);');assert.equal(run('regionTravel.currentId'),'lang-viet','The failed visit remains disarmed');
 run('regionTravel.closeMenu();outsideRegionPortal();transitionRegion();');assert.equal(run('regionTravel.currentId'),'lang-tan-thu');
});

test('region and interior switches refresh night lights without leaking lights from hidden maps',()=>{
 const {run}=game();
 assert(run('villageLights.some(item=>item.lamp.visible)'),'Existing village lamps work at 21:00');
 run('transitionRegion();');
 assert(run('villageLights.every(item=>!item.lamp.visible&&!item.lamp.castShadow&&item.lamp.intensity===0&&item.windowLamps.every(light=>!light.visible&&light.intensity===0))'));
 assert(run('regionTravel.current.lights.some(light=>light.visible&&light.intensity>0)'));
 assert(run('regionTravel.current.lights.filter(light=>light.visible).length<=VillagePerformance.policy.houseLights'));
 assert(run('regionTravel.current.lights.every(light=>!light.castShadow)'));
 assert(run('regionTravel.current.lampGlowMaterials.every(material=>material.emissiveIntensity>0)'));
 run('climate.hour=12;updateClimate(0,true);');
 assert(run('regionTravel.current.lights.every(light=>!light.visible&&light.intensity===0)'));
 assert(run('regionTravel.current.lampGlowMaterials.every(material=>material.emissiveIntensity===0)'));
 run('climate.hour=21;updateClimate(0,true);transitionRegion();');
 assert(run('villageLights.some(item=>item.lamp.visible)'));
 assert(run("regionTravel.prepare('lang-tan-thu').lights.every(light=>!light.visible)"));
 run('enterHouse(0);');
 assert(run('insideHouse&&roomLight.visible&&roomLight.intensity>0'));
 assert(run('villageLights.every(item=>!item.lamp.visible&&item.windowLamps.every(light=>!light.visible))'));
 assert(run("regionTravel.prepare('lang-tan-thu').lights.every(light=>!light.visible)"));
 run('leaveHouse();');assert(run('villageLights.some(item=>item.lamp.visible)&&!roomLight.visible'));
});

test('registered destination metadata and named spawns reject invented destinations before building or mutating the scene',()=>{
 const {run}=game();
 assert.deepEqual(JSON.parse(run('JSON.stringify(regionTravel.destinations)')),[
  {id:'lang-viet',name:'Làng Việt',defaultSpawnId:'village-entry',spawnIds:['village-entry','from-dong-tre']},
  {id:'lang-tan-thu',name:'Làng Tân Thủ',defaultSpawnId:'village-entry',spawnIds:['village-entry']},
  {id:'ngoai-lang-dong-tre',name:'Ngoại ô Làng Việt – Đồng Tre',defaultSpawnId:'village-entry',spawnIds:['village-entry','from-lang-viet']}
 ]);
 assert(run('Object.isFrozen(regionTravel.destinations)&&regionTravel.destinations.every(item=>Object.isFrozen(item)&&Object.isFrozen(item.spawnIds))'));
 run('const realRegionFactory=window.createLangTanThuRegion;let factoryCalls=0;window.createLangTanThuRegion=(options)=>{factoryCalls++;return realRegionFactory(options);};const beforeBadIds=regionInventory(),beforeBadPosition=player.position.clone();');
 for(const [mapId,spawnId,code] of [['unknown-map','village-entry','region/unknown-map'],['village','village-entry','region/unknown-map'],
  ['lang-tan-thu','unregistered','region/unknown-spawn'],['lang-tan-thu','__proto__','region/unknown-spawn'],['lang-viet','constructor','region/unknown-spawn']]){
  const args=JSON.stringify(mapId)+','+JSON.stringify(spawnId);
  assert.equal(run(`regionTravel.canTravelTo(${args})`),false);
  assert.equal(run(`regionTravel.travelTo(${args}).code`),code);
 }
 assert(run('factoryCalls===0&&regionInventory()===beforeBadIds&&player.position.equals(beforeBadPosition)&&regionTravel.status.loadedIds.length===1'));
 assert(run("regionTravel.canTravelTo('lang-tan-thu')"));
 assert.equal(run('factoryCalls'),0,'Checking availability must not build the hidden destination');
 run('window.createLangTanThuRegion=undefined;');
 assert.equal(run("regionTravel.canTravelTo('lang-tan-thu')"),false);
 assert.equal(run("regionTravel.travelTo('lang-tan-thu').code"),'region/unavailable');
 run('window.createLangTanThuRegion=realRegionFactory;');
});

test('direct travel both ways and to the same map preserves player state and skill cooldown while the map overlay remains open',()=>{
 const {run,context}=game();
 assert(context.VietVillageWeapons.equip('sword'));
 assert.equal(context.VietVillageWeapons.cast(1).ok,true);
 run(`const directAuth=window.VietVillageAuth,directRenderer=renderer,directWeapons=villageWeapons;
  const directProgress=JSON.stringify(progress),directClimate=JSON.stringify(climate);
  yaw=.73;pitch=.61;sceneryRadius=8.5;body.rotation.y=1.23;
  $('referenceGallery').classList.remove('hidden');
 `);
 for(const id of ['lang-tan-thu','lang-viet','lang-viet','lang-tan-thu']){
  assert(run('overlays()'),'The UI overlay can remain open during the synchronous call');
  assert.equal(run(`regionTravel.canTravelTo('${id}','village-entry')`),true);
  assert.deepEqual(JSON.parse(run(`JSON.stringify(regionTravel.travelTo('${id}','village-entry'))`)),{ok:true,mapId:id,spawnId:'village-entry'});
  assert(run('regionTravel.current.spawn===regionTravel.current.spawns[regionTravel.current.defaultSpawnId]'));
  assert(run('player.position.distanceTo(new THREE.Vector3(...Object.values(regionTravel.current.spawns["village-entry"])))<1e-8'));
  assert(run('canWalk(player.position.x,player.position.z)&&Math.hypot(player.position.x-regionTravel.current.portal.x,player.position.z-regionTravel.current.portal.z)>regionTravel.current.portal.radius+.4'));
  assert(run('player===savedPlayer&&body===savedBody&&scene===savedScene&&camera===savedCamera&&renderer===directRenderer&&villageWeapons===directWeapons&&window.VietVillageAuth===directAuth'));
  assert(run('player.userData.inventory===savedInventory&&JSON.stringify(progress)===directProgress&&JSON.stringify(climate)===directClimate'));
  assert(run('yaw===.73&&pitch===.61&&sceneryRadius===8.5&&body.rotation.y===1.23&&localWalking&&player.visible'));
  assert(run('!regionTravel.status.armed&&overlays()'),'Travel disarms the portal and leaves overlay ownership to its UI');
  assert.equal(context.VietVillageWeapons.state.weaponId,'sword');
 }
 run("$('referenceGallery').classList.add('hidden');");
 assert.equal(context.VietVillageWeapons.cast(1).reason,'cooldown','Travel cannot reset a skill cooldown');
 assert.equal(context.VietVillageWeapons.cast(2).ok,true,'Other skills still work after travel');
 assert.equal(run('regionTravel.status.loadedIds.length'),2);
});

test('direct travel requires a verified in-game exterior and rejects unsafe cached spawn without moving the actor',()=>{
 const {run}=game();
 run('let guardedPosition=player.position.clone();testAuthAllowed=false;');
 assert.equal(run("regionTravel.travelTo('lang-tan-thu').code"),'region/auth-required');
 assert.equal(run("regionTravel.canTravelTo('lang-tan-thu')"),false);
 run("testAuthAllowed=true;$('home').classList.remove('hidden');");
 assert.equal(run("regionTravel.travelTo('lang-tan-thu').code"),'region/not-in-game');
 assert(run('player.position.equals(guardedPosition)&&regionTravel.status.loadedIds.length===1'));
 run("$('home').classList.add('hidden');enterHouse(0);guardedPosition=player.position.clone();");
 assert.equal(run("regionTravel.canTravelTo('lang-tan-thu')"),false);
 const blocked=JSON.parse(run("JSON.stringify(regionTravel.travelTo('lang-tan-thu'))"));
 assert.equal(blocked.code,'region/inside-house');assert.match(blocked.message,/ra sân/);
 assert(run('insideHouse&&player.position.equals(guardedPosition)&&regionTravel.currentId==="lang-viet"'));
 run("leaveHouse();const unsafeRegion=regionTravel.prepare('lang-tan-thu');const safeSpawnY=unsafeRegion.spawn.y;unsafeRegion.spawn.y=20;guardedPosition=player.position.clone();");
 assert.equal(run("regionTravel.canTravelTo('lang-tan-thu')"),false);
 assert.equal(run("regionTravel.travelTo('lang-tan-thu').code"),'region/unsafe-spawn');
 assert(run('player.position.equals(guardedPosition)&&regionTravel.currentId==="lang-viet"&&!unsafeRegion.root.visible'));
 run('unsafeRegion.spawn.y=safeSpawnY;');
 assert.equal(run("regionTravel.travelTo('lang-tan-thu').ok"),true);
});

test('direct destination build and commit failures return errors and preserve the playable source or overview',()=>{
 const {run}=game();
 run(`const workingFactory=window.createLangTanThuRegion;
  window.createLangTanThuRegion=()=>{throw new Error('controlled direct build failure');};
  const directBuildInventory=regionInventory(),directBuildPosition=player.position.clone(),directBuildCamera=camera.position.clone(),directBuildOrientation=camera.quaternion.clone();
 `);
 const failure=JSON.parse(run("JSON.stringify(regionTravel.travelTo('lang-tan-thu'))"));
 assert.equal(failure.ok,false);assert.equal(failure.code,'region/load-failed');assert.match(failure.message,/controlled direct build failure/);
 assert(run('regionInventory()===directBuildInventory&&player.position.equals(directBuildPosition)&&camera.position.equals(directBuildCamera)&&camera.quaternion.angleTo(directBuildOrientation)<1e-7&&regionTravel.currentId==="lang-viet"'));
 run(`window.createLangTanThuRegion=workingFactory;$('overviewBtn').onclick();
  const beforeDirectCommit={position:player.position.clone(),camera:camera.position.clone(),orientation:camera.quaternion.clone(),focus:sceneryFocus.clone(),radius:sceneryRadius,pitch,root:regionTravel.current.root};
  const savedClimateUpdate=updateClimate;let directCommitFails=true;
  updateClimate=function(...args){if(directCommitFails){directCommitFails=false;throw new Error('controlled direct commit failure');}return savedClimateUpdate(...args);};
  let directCommitResult;try{directCommitResult=regionTravel.travelTo('lang-tan-thu');}finally{updateClimate=savedClimateUpdate;}
 `);
 assert.equal(run('directCommitResult.code'),'region/transition-failed');
 assert(run('regionTravel.current.root===beforeDirectCommit.root&&beforeDirectCommit.root.visible&&world.visible&&!housePreview.visible&&!localWalking&&!player.visible'));
 assert(run('player.position.equals(beforeDirectCommit.position)&&camera.position.equals(beforeDirectCommit.camera)&&camera.quaternion.angleTo(beforeDirectCommit.orientation)<1e-7&&sceneryFocus.equals(beforeDirectCommit.focus)&&sceneryRadius===beforeDirectCommit.radius&&pitch===beforeDirectCommit.pitch'));
 assert.equal(run("regionTravel.travelTo('lang-tan-thu').ok"),true);
 assert(run('localWalking&&player.visible&&world.visible&&!housePreview.visible&&gateView===-1&&houseView===-1'));
 assert.equal(run("regionTravel.travelTo('lang-tan-thu').ok"),true,'The same map can safely return to its named entry');
});
