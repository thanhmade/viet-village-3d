'use strict';
// Executes the real scene builders, navigation, controls and transitions. The
// shared harness mocks WebGL rendering and authentication, not Google sign-in.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const createHarness=require('./harness.cjs');
const DONG='ngoai-lang-dong-tre';

function game(){
  const harness=createHarness();
  // Geometry/travel tests use a character that already completed admission.
  // Separate access tests cover the configured gameplay tutorial requirement.
  harness.context.VietVillageJourney.recordMovement(3);
  harness.context.VietVillageJourney.recordSkillUse();
  harness.run(`$('play').onclick();
    climate.clock='manual';climate.hour=21;climate.weather='rain';updateClimate(0,true);
    player.userData.inventory=['book','lotus'];progress.score=270;
    const dongSaved={player,body,scene,camera,renderer,auth:window.VietVillageAuth,inventory:player.userData.inventory,progress:JSON.stringify(progress),climate:JSON.stringify(climate)};
    function dongFrames(count){for(let i=0;i<count;i++)tick((last||0)+40);}
    function dongOutside(){const r=regionTravel.current,s=r.spawns[r.id==='lang-viet'?'from-dong-tre':'from-lang-viet'];player.position.set(s.x,s.y,s.z);regionTravel.update(0);}
    function dongNear(){regionTravel.update(0);const p=regionTravel.current.portal;player.position.set(p.x,regionTravel.current.groundHeight(p.x,p.z),p.z);regionTravel.update(0);}
    function dongChoose(){return regionTravel.currentId==='lang-viet'?regionTravel.chooseDestination('dong-tre').ok:regionTravel.interact();}
    function dongInventory(){const geometries=new Set(),materials=new Set();let objects=0;scene.traverse(o=>{objects++;if(o.geometry)geometries.add(o.geometry);for(const material of o.material?(Array.isArray(o.material)?o.material:[o.material]):[])materials.add(material);});return JSON.stringify({objects,geometries:geometries.size,materials:materials.size});}
  `);
  assert(harness.run('localWalking&&player.visible&&regionTravel.currentId==="lang-viet"'));
  return harness;
}

test('Đồng Tre has registered named entries, loads lazily and reuses an isolated cached scene',()=>{
  const {run}=game();
  run('const dongFactory=createDongTreRegion;let dongBuilds=0;window.createDongTreRegion=options=>{dongBuilds++;return dongFactory(options);};const originalRoot=regionTravel.current.root;');
  assert(run('regionTravel.destinations.some(r=>r.id==="ngoai-lang-dong-tre"&&r.spawnIds.includes("village-entry")&&r.spawnIds.includes("from-lang-viet"))'));
  assert(run('regionTravel.destinations.find(r=>r.id==="lang-viet").spawnIds.includes("from-dong-tre")'));
  assert(run(`regionTravel.canTravelTo('${DONG}','from-lang-viet')`));
  assert.equal(run('dongBuilds'),0,'Checking availability must not build a destination');
  run(`const preparedDong=regionTravel.prepare('${DONG}');`);
  assert.equal(run('dongBuilds'),1);
  assert(run('preparedDong.root!==originalRoot&&!preparedDong.root.visible&&originalRoot.visible&&preparedDong.root.parent===world'));
  assert(run(`regionTravel.prepare('${DONG}')===preparedDong`));assert.equal(run('dongBuilds'),1);
  assert.equal(run('regionTravel.currentId'),'lang-viet');
  assert.equal(run(`regionTravel.travelTo('${DONG}','invented-entry').code`),'region/unknown-spawn');
  assert.equal(run(`regionTravel.travelTo('${DONG}','__proto__').code`),'region/unknown-spawn');
});

test('walking to either Đồng Tre connection never teleports automatically; an explicit nearby interaction travels once',()=>{
  const {run}=game();
  for(const [id,destination] of [['dong-tre',DONG],['lang-viet','lang-viet']]){
    const source=run('regionTravel.currentId');
    assert(run(`regionTravel.approachConnection('${id}')`));
    assert.equal(run('regionTravel.currentId'),source);assert(run('!!target'));
    run('for(let i=0;i<650&&(target||waypoints.length);i++)dongFrames(1);dongFrames(80);');
    assert.equal(run('regionTravel.currentId'),source,'Standing in the manual circle for several seconds must not activate it');
    if(source==='lang-viet')assert(run('regionTravel.isMenuOpen()'));else assert(run('regionTravel.status.manualArmed'));
    assert(run('dongChoose()'));assert.equal(run('regionTravel.currentId'),destination);
    assert(run('!regionTravel.status.manualArmed'));
    assert.equal(run('regionTravel.interact()'),false,'Arrival cannot immediately activate the return connection');
    run('dongFrames(30);');assert.equal(run('regionTravel.currentId'),destination);
    assert(run('canWalk(player.position.x,player.position.z)&&world.visible&&localWalking&&player.visible&&!insideHouse'));
    assert(run('regionTravel.interactionPortals.every(p=>Math.hypot(player.position.x-p.x,player.position.z-p.z)>p.interactionRadius+.25)'));
  }
});

test('ten manual round trips preserve actor, equipment, cooldown, progress, camera preferences and scene resources',()=>{
  const {run,context}=game();
  assert(context.VietVillageWeapons.equip('sword'));assert.equal(context.VietVillageWeapons.cast(1).ok,true);
  run(`const dongWeapons=villageWeapons;regionTravel.prepare('lang-tan-thu');regionTravel.prepare('${DONG}');const dongRoot=regionTravel.prepare('${DONG}').root,langRoot=regionTravel.current.root;
    yaw=.73;pitch=.61;sceneryRadius=8.5;body.rotation.y=1.23;villageWeapons.suspend();const dongBaseline=dongInventory();`);
  for(let round=0;round<10;round++)for(const destination of [DONG,'lang-viet']){
    run('dongOutside();dongNear();');assert(run('dongChoose()'));assert.equal(run('regionTravel.currentId'),destination);
    assert(run('player===dongSaved.player&&body===dongSaved.body&&scene===dongSaved.scene&&camera===dongSaved.camera&&renderer===dongSaved.renderer&&window.VietVillageAuth===dongSaved.auth&&villageWeapons===dongWeapons'));
    assert(run('player.userData.inventory===dongSaved.inventory&&JSON.stringify(progress)===dongSaved.progress&&JSON.stringify(climate)===dongSaved.climate'));
    assert(run('yaw===.73&&pitch===.61&&sceneryRadius===8.5&&body.rotation.y===1.23'));
    assert.equal(context.VietVillageWeapons.state.weaponId,'sword');
    assert.equal(context.VietVillageWeapons.cast(1).reason,'cooldown','Transition must not reset skill cooldown');
    assert.equal(context.VietVillageWeapons.state.active,0);assert.equal(context.VietVillageWeapons.state.particles,0);
    assert(run('travelCameraBounds===regionTravel.current.cameraBounds&&dongInventory()===dongBaseline'));
  }
  assert(run(`regionTravel.prepare('${DONG}').root===dongRoot&&regionTravel.prepare('lang-viet').root===langRoot`));
  assert.equal(run('regionTravel.status.loadedIds.length'),3);
  run('dongFrames(150);');assert.equal(context.VietVillageWeapons.cast(1).ok,true,'A preserved skill remains usable after its normal cooldown');
});

test('fresh E, held E, editable controls and authentication are enforced by the real keyboard binding',()=>{
  const {run,context}=game(),listeners=new Map();
  context.addEventListener=(name,fn)=>{if(!listeners.has(name))listeners.set(name,[]);listeners.get(name).push(fn);};
  run("regionTravel.travelTo('ngoai-lang-dong-tre','from-lang-viet');bind();");
  const emit=(type,details={})=>{const event={code:'KeyE',key:'e',repeat:false,target:{tagName:'DIV'},preventDefault(){},...details};for(const fn of listeners.get(type)||[])fn(event);};
  run('dongOutside();');emit('keydown');assert.equal(run('regionTravel.currentId'),DONG);
  run('dongNear();');emit('keydown',{repeat:true});assert.equal(run('regionTravel.currentId'),DONG);
  emit('keyup');
  for(const tagName of ['INPUT','TEXTAREA','SELECT','BUTTON']){emit('keydown',{target:{tagName}});assert.equal(run('regionTravel.currentId'),DONG);}
  emit('keydown',{target:{tagName:'DIV',isContentEditable:true}});assert.equal(run('regionTravel.currentId'),DONG);
  run('testAuthAllowed=false;');emit('keydown');assert.equal(run('regionTravel.currentId'),DONG);
  run('testAuthAllowed=true;dongOutside();dongNear();');emit('keydown');assert.equal(run('regionTravel.currentId'),'lang-viet');
  run('dongOutside();dongNear();');emit('keydown',{repeat:true});assert.equal(run('regionTravel.currentId'),'lang-viet','E never selects a picker destination');
  emit('keyup');emit('keydown');assert.equal(run('regionTravel.currentId'),'lang-viet');
});

test('the existing touch joystick reaches the manual gate and the nearby button performs one safe return',()=>{
  const {run}=game();assert.equal(run(`regionTravel.travelTo('${DONG}','from-lang-viet').ok`),true);
  run(`regionTravel.update(0);yaw=0;const touchStart=player.position.clone();
    $('stick').onpointerdown({pointerId:8,clientX:56,clientY:94});
    for(let i=0;i<30&&!regionTravel.status.nearInteractionId;i++)dongFrames(1);
    $('stick').onpointerup();dongFrames(30);`);
  assert.equal(run('regionTravel.currentId'),DONG);assert(run('player.position.distanceTo(touchStart)>.5'));
  assert.equal(run("$('regionInteractBtn').style.display"),'block');assert.equal(run("$('regionInteractBtn').disabled"),false);
  assert(run("$('regionInteractBtn').onclick()"));assert.equal(run('regionTravel.currentId'),'lang-viet');
  assert.equal(run("$('regionInteractBtn').onclick()"),false);assert.equal(run("$('regionInteractBtn').style.display"),'none');
  assert(run('joystick.x===0&&joystick.y===0&&target===null&&waypoints.length===0'));
  assert(run('player.position.x===5&&player.position.z===16.5&&canWalk(player.position.x,player.position.z)'));
});

test('overlays, hidden tabs, preview modes, houses and leaving the interaction area cancel manual eligibility',()=>{
  const {run}=game();run("regionTravel.travelTo('ngoai-lang-dong-tre','from-lang-viet');");
  for(const [block,unblock] of [
    ["$('referenceGallery').classList.remove('hidden')","$('referenceGallery').classList.add('hidden')"],
    ['document.hidden=true','document.hidden=false'],['testAuthAllowed=false','testAuthAllowed=true'],
    ['housePreview.visible=true','housePreview.visible=false'],['gateView=0','gateView=-1'],
    ['localWalking=false','localWalking=true'],['insideHouse=true','insideHouse=false']
  ]){
    run('dongOutside();dongNear();'+block+';regionTravel.update(0);');
    assert.equal(run('regionTravel.interact()'),false,block);assert.equal(run('regionTravel.currentId'),DONG);
    run(unblock+';regionTravel.update(0);');assert.equal(run('regionTravel.interact()'),false,'Leaving and returning is required after suspension');
  }
  run('dongOutside();');assert.equal(run('regionTravel.interact()'),false,'An armed actor must still be nearby');
  run('dongNear();');assert.equal(run('regionTravel.interact({repeat:true})'),false);
  assert(run('regionTravel.interact()'));assert.equal(run('regionTravel.currentId'),'lang-viet');
});

test('factory failure, unsafe named spawn and transition failure retain the source scene and allow a deliberate retry',()=>{
  const {run,context}=game(),errors=[];context.console={...console,error:(...args)=>errors.push(args)};
  run(`const goodDongFactory=window.createDongTreRegion;let failedBuildCalls=0;window.createDongTreRegion=()=>{failedBuildCalls++;throw new Error('controlled Đồng Tre build failure');};
    dongOutside();dongNear();const failedTravelPosition=player.position.clone(),failedTravelCamera=camera.position.clone(),failedTravelRoot=regionTravel.current.root,failedTravelBounds=travelCameraBounds;
  `);
  assert.equal(run('regionTravel.interact()'),false);assert.equal(run('failedBuildCalls'),1);
  assert(run('regionTravel.current.root===failedTravelRoot&&failedTravelRoot.visible&&player.position.equals(failedTravelPosition)&&camera.position.equals(failedTravelCamera)&&travelCameraBounds===failedTravelBounds'));
  assert.equal(run('regionTravel.status.loadedIds.length'),2);assert.equal(run('regionTravel.interact()'),false);assert.equal(run('failedBuildCalls'),1);
  run('window.createDongTreRegion=goodDongFactory;');assert.equal(run('regionTravel.interact()'),false,'A failed visit remains disarmed after the loader recovers');
  run(`const unsafeDong=regionTravel.prepare('${DONG}'),goodSpawn=unsafeDong.spawns['from-lang-viet'],goodDongWalk=unsafeDong.canWalk;unsafeDong.canWalk=(x,z)=>!(x===goodSpawn.x&&z===goodSpawn.z)&&goodDongWalk(x,z);`);
  assert.equal(run(`regionTravel.travelTo('${DONG}','from-lang-viet').code`),'region/unsafe-spawn');
  assert.equal(run('regionTravel.currentId'),'lang-viet');
  run(`unsafeDong.canWalk=goodDongWalk;regionTravel.closeMenu();dongOutside();dongNear();
    const beforeCommit={region:regionTravel.current,position:player.position.clone(),camera:camera.position.clone(),orientation:camera.quaternion.clone(),focus:sceneryFocus.clone(),bounds:travelCameraBounds};
    const realDongClimate=updateClimate;let dongCommitFailure=true;updateClimate=function(...args){if(dongCommitFailure){dongCommitFailure=false;throw new Error('controlled Đồng Tre commit failure');}return realDongClimate(...args);};
    let failedDongCommit;try{failedDongCommit=dongChoose();}finally{updateClimate=realDongClimate;}
  `);
  assert.equal(run('failedDongCommit'),false);assert.equal(run('dongCommitFailure'),false);
  assert(run('regionTravel.current===beforeCommit.region&&beforeCommit.region.root.visible&&!unsafeDong.root.visible&&player.position.equals(beforeCommit.position)&&camera.position.equals(beforeCommit.camera)&&camera.quaternion.angleTo(beforeCommit.orientation)<1e-7&&sceneryFocus.equals(beforeCommit.focus)&&travelCameraBounds===beforeCommit.bounds'));
  assert.equal(run('regionTravel.interact()'),false);run('regionTravel.closeMenu();dongOutside();dongNear();');assert(run('dongChoose()'));
  assert.equal(run('regionTravel.currentId'),DONG);
});

test('Đồng Tre navigation uses its river bridge, floor and lights while Làng Việt opens a shared destination picker',()=>{
  const {run}=game();assert.equal(run(`regionTravel.travelTo('${DONG}').ok`),true);
  assert.equal(run('VietVillageGame.getPose().mapId'),DONG);
  run('player.position.set(0,.3,8);target={x:0,z:0};waypoints=[];for(let i=0;i<150&&target;i++)dongFrames(1);');
  assert(run('Math.hypot(player.position.x,player.position.z)<.25&&canWalk(player.position.x,player.position.z)'));
  assert(run('Math.abs(player.position.y-regionTravel.current.groundHeight(player.position.x,player.position.z))<.01'));
  assert(run('!canWalk(8,4)&&canWalk(0,4)&&bridgeHeight(0,4)>.3'));
  assert(run('regionTravel.current.lights.some(light=>light.visible&&light.intensity>0)&&villageLights.every(item=>!item.lamp.visible)'));
  run('climate.hour=12;updateClimate(0,true);');assert(run('regionTravel.current.lights.every(light=>!light.visible&&light.intensity===0)'));
  assert.equal(run("regionTravel.travelTo('lang-viet').ok"),true);
  run('regionTravel.update(0);const oldGate=regionTravel.current.portal;player.position.set(oldGate.x,regionTravel.current.groundHeight(oldGate.x,oldGate.z),oldGate.z);regionTravel.update(0);for(let i=0;i<7;i++)regionTravel.update(.1);regionTravel.update(.09);');
  assert.equal(run('regionTravel.currentId'),'lang-viet');assert.equal(run('regionTravel.interact()'),false,'E for Đồng Tre must not operate the Tân Thủ auto gate');
  run('regionTravel.update(.01);');assert.equal(run('regionTravel.currentId'),'lang-viet');assert(run('regionTravel.isMenuOpen()'));assert(run("regionTravel.chooseDestination('lang-tan-thu').ok"));assert.equal(run('regionTravel.currentId'),'lang-tan-thu');
});
