'use strict';
let multiplayerWalking=false,localWalking=false,villageWeapons=null,playerJourney=null,playerHealthView=null,playerAvatar=null;
let playerExperience=null,experienceView=null;
let learningClient=null,learningView=null,learningCollectibles=null,learningPractice=null,gameHud=null;
// Walking/running speed (m/s): one source for movement and the character sheet.
const MOVE_SPEED=Object.freeze({walk:4.5,run:6.5});
let playerMotion=null,proceduralStride=0;
// Skill aiming. Mouse: the ground point under the cursor. Touch: the drag from
// the skill button, turned by the camera yaw (screen up = away from the camera).
const aimRay=new THREE.Raycaster(),aimPointer=new THREE.Vector2(),aimPlane=new THREE.Plane(new THREE.Vector3(0,1,0),0);
function aimFromScreen(x,y){if(!camera)return null;aimPointer.set(x/innerWidth*2-1,-y/innerHeight*2+1);aimRay.setFromCamera(aimPointer,camera);aimPlane.constant=-player.position.y;const p=new THREE.Vector3();return aimRay.ray.intersectPlane(aimPlane,p)?p:null;}
function aimFromDrag(nx,ny,range){const dx=nx*Math.cos(yaw)+ny*Math.sin(yaw),dz=-nx*Math.sin(yaw)+ny*Math.cos(yaw);return new THREE.Vector3(player.position.x+dx*range,player.position.y,player.position.z+dz*range);}
// Character sheet: read-only view of the live systems (no copy of any stat).
function characterSheet(){
 if(!gameInitialized)return null;
 const journey=playerJourney?.getState(),weapons=villageWeapons?.state,board=window.VietVillageNPCs?.questBoard,entries=board?.entries||[];
 return {experience:playerExperience?.getState()||null,health:journey?{hp:journey.hp,maxHp:journey.maxHp,alive:journey.alive}:null,tutorials:journey?.tutorials||null,movement:MOVE_SPEED,
  weapon:weapons?.enabled?{id:weapons.weaponId,name:weapons.weaponName,skills:villageWeapons.skills()}:null,
  completedQuests:entries.filter(e=>e.state==='completed').map(e=>({id:e.id,name:e.name,category:e.categoryLabel})),
  openQuests:entries.filter(e=>['active','ready'].includes(e.state)).length};
}
function openCharacterSheet(){if(!gameInitialized||!window.VietVillageAuth?.isAuthenticated())return Promise.resolve(false);return Promise.resolve(window.VietVillageCharacter?.openProfile?.()).then(ok=>{if(ok===false)toast('Đóng cửa sổ đang mở rồi thử lại để xem bảng nhân vật.');return ok;});}
function learningContext(){return {uid:window.VietVillageAuth?.getProfile?.()?.uid,authenticated:!!window.VietVillageAuth?.isAuthenticated(),
 alive:playerJourney?.getState().alive===true,mapId:regionTravel?.currentId,position:{x:player.position.x,y:player.position.y,z:player.position.z},
 transitioning:!!regionTravel?.status.transitioning||!!housePortalSystem?.status?.pending,insideHouse:!!insideHouse,
 inVillage:regionTravel?.currentId==='lang-viet'&&!insideHouse&&world.visible&&!housePreview.visible,
 canInteract:(localWalking||multiplayerWalking)&&gateView<0&&houseView<0&&!overlays()&&!document.hidden};}
function initializeLearning(){
 const pause=()=>{clearMotion();resetHouseTravel();regionTravel?.reset();villageWeapons?.suspend();};
 const identity=()=>({authenticated:!!window.VietVillageAuth?.isAuthenticated(),uid:window.VietVillageAuth?.getProfile?.()?.uid});
 const withLock=globalThis.navigator?.locks?.request?(name,operation)=>navigator.locks.request(name,operation):undefined;
 // Static hosting has no quest server: answers there are labelled browser practice, never EXP.
 learningPractice=window.createLearningPracticeService({getIdentity:identity,storage:localStorage,withLock,getClient:()=>learningClient});
 learningClient=window.createLearningQuestClient({getIdentity:identity,storage:localStorage,withLock,
 invoke:async(method,data)=>{const transport=window.VietVillageLearningTransport;if(!transport)throw new Error('Dịch vụ đăng nhập chưa sẵn sàng.');
  return (await transport.mode?.())==='practice'?learningPractice.invoke(method,data,learningContext()):transport.invoke(method,data,learningContext());},
 getContext:learningContext,nearNpc:id=>window.VietVillageNPCs?.isNear(id),onChange:()=>{learningView?.render();window.VietVillageNPCs?.invalidateQuests?.();}});
 learningView=window.createLearningQuestView({document,client:learningClient,pause,notify:toast,
 canOpen:()=>gameInitialized&&!!window.VietVillageAuth?.isAuthenticated()&&!!window.VietVillageCharacter?.isReady(),
 guideNpc:id=>window.VietVillageNPCs.route(id),guidePoint:point=>{if(regionTravel.currentId!=='lang-viet'||!startRoaming())return false;waypoints=findPath(player.position,point);target=waypoints.shift()||null;toast(target?'Đang đi tìm thẻ học · Đến gần bấm G hoặc nút Nhặt.':'Chưa có đường tới thẻ học.');return !!target;}});
 window.VietVillageLearningView=learningView;
 learningCollectibles=window.createLearningCollectibles({THREE,region:regionTravel.current,client:learningClient,getState:learningContext,prompt:$('learningCollect'),notify:toast,findPath,
 onOpen:()=>learningView.open()});
 // Load the player's quest state now so NPC markers are right before any menu opens.
 void learningClient.load().then(()=>learningClient.refresh().catch(()=>{}),error=>toast(error.message));
}
// Tracker "Đi tới": normal pathfinding only, never a teleport or a remote accept/turn-in.
function questGoTo(entry){
 if(!entry||!gameInitialized||!window.VietVillageAuth?.isAuthenticated())return false;
 if(regionTravel?.currentId!=='lang-viet'||insideHouse){toast('Nhiệm vụ này ở ngoài trời Làng Việt. Hãy quay về làng.');return false;}
 if(entry.source==='learning'){
  const point=entry.objective?.spawn;
  if(entry.learning?.status==='accepted'&&point){if(!startRoaming())return false;waypoints=findPath(player.position,point);target=waypoints.shift()||null;toast(target?'Đang đi tìm thẻ học · Đến gần bấm G hoặc nút Nhặt.':'Chưa có đường tới thẻ học.');return !!target;}
  if(['collected','practice_pending'].includes(entry.learning?.status)){learningView?.open(null,entry.id);return true;}
 }
 const id=entry.state==='available'?entry.giverNpc:entry.state==='ready'?entry.turnInNpc:entry.objective?.targetNpc||entry.objective?.targetProp||entry.turnInNpc;
 return id?!!window.VietVillageNPCs?.route(id):false;
}
const pendingExperienceRewards=new Map();
let pondView=-1,pondChecks=null;
function showPondView(){
 if(!gameInitialized||!window.VietVillageAuth?.isAuthenticated())return false;
 if(insideHouse||regionTravel?.currentId!=='lang-viet'){toast('Ao sen ở ngoài trời trong MAP Làng Việt.');return false;}
 stopVillageWalk();clearMotion();world.visible=true;housePreview.visible=false;gateView=-1;houseView=-1;
 pondView=(pondView+1)%4;sceneryFocus.set(15,.5,18);sceneryRadius=Math.max(14,8/camera.aspect);yaw=[0,Math.PI,-Math.PI/2,Math.PI/2][pondView];pitch=.6;
 toast('Ao sen · '+['Phía nam','Phía bắc','Phía tây','Phía đông'][pondView]+' · Bấm Đi bộ để trở lại nhân vật.');return true;
}
function walkPondRoute(stops,label){
 // Normal pathfinding/movement only: never teleport a test account or change HP.
 if(!gameInitialized||!window.VietVillageAuth?.isAuthenticated()||overlays()||insideHouse||regionTravel?.currentId!=='lang-viet'||!window.VietVillageMapAssets?.status.pond.ready)return false;
 if(!canWalk(player.position.x,player.position.z)){toast('Vị trí hiện tại chưa có đường đi hợp lệ.');return false;}
 let previous={x:player.position.x,z:player.position.z},route=[];
 for(const point of stops){const part=findPath(previous,point);if(!part.length){toast('Không tìm được đường đi an toàn: '+label);return false;}route.push(...part);previous=point;}
 if(!startRoaming())return false;waypoints=route;target=waypoints.shift()||null;
 document.activeElement?.blur?.();if(pondChecks)pondChecks.route=label;toast(label+' · Nhân vật đi bằng cơ chế đường đi hiện có.');return !!target;
}
function installPondChecks(){
 const location=window.location;
 if(pondChecks||!location||!['localhost','127.0.0.1','[::1]'].includes(location.hostname)||new URLSearchParams(location.search).get('pondTest')!=='1')return;
 const panel=document.createElement('aside'),title=document.createElement('strong'),readout=document.createElement('pre'),actions=document.createElement('div');
 panel.id='pondTestPanel';panel.setAttribute('aria-label','Kiểm tra ao sen trên localhost');
 panel.style.cssText='position:fixed;left:12px;bottom:12px;z-index:22;pointer-events:auto;width:min(360px,calc(100vw - 24px));padding:12px;border:1px solid #b8cbb4;border-radius:12px;background:rgba(250,249,237,.97);color:#214e43;max-height:45vh;overflow:auto;';
 title.textContent='Kiểm tra ao sen · localhost';readout.id='pondTestReadout';readout.style.cssText='white-space:pre-wrap;overflow-wrap:anywhere;font:11px/1.4 monospace;margin:8px 0;';readout.setAttribute('aria-live','off');
 actions.style.cssText='display:flex;flex-wrap:wrap;gap:6px;';
 const add=(label,handler)=>{const button=document.createElement('button');button.type='button';button.textContent=label;button.style.cssText='padding:8px;border-radius:8px;font-size:12px;';button.onclick=handler;actions.append(button);};
 add('Đi qua cầu sang đông',()=>walkPondRoute([{x:8.2,z:18},{x:21.8,z:18}],'Qua cầu sang đông'));
 add('Đi qua cầu sang tây',()=>walkPondRoute([{x:21.8,z:18},{x:8.2,z:18}],'Qua cầu sang tây'));
 add('Đi vòng bờ nam',()=>walkPondRoute([{x:21.8,z:22.6},{x:15,z:23}],'Đi vòng bờ nam'));
 add('Xem ao gần',showPondView);add('Dừng đi',()=>{clearMotion();pondChecks.route='Đã dừng';updatePondChecks();});add('Đóng bảng',()=>{panel.hidden=true;});
 for(const name of ['pointerdown','pointermove','pointerup','pointercancel','click','dblclick','keydown','wheel','touchstart','touchmove','touchend'])panel.addEventListener(name,event=>event.stopPropagation());
 panel.append(title,actions,readout);$('hud').append(panel);pondChecks={panel,readout,route:'Chưa bắt đầu'};updatePondChecks();
}
function updatePondChecks(){
 if(!pondChecks||pondChecks.panel.hidden)return;
 const pond=window.VietVillageMapAssets?.status.pond||{},position=player.position;
 pondChecks.readout.textContent='MAP: '+(regionTravel?.currentId||'…')+(insideHouse?' · trong nhà':'')+'\nVị trí: '+[position.x,position.y,position.z].map(n=>n.toFixed(2)).join(', ')+'\nTuyến: '+pondChecks.route+'\nĐiểm đường còn lại: '+(waypoints.length+(target?1:0))+'\nAo nhập: '+(pond.ready?'Đã tải':'Chưa tải')+' · Gió: '+(pond.wind||'—')+'\n'+(pond.url||'Đang đọc đường dẫn mô hình');
}
function claimActivityExperience(kind,id){
 const uid=window.VietVillageAuth?.getProfile?.()?.uid;if(!uid||!playerExperience)return Promise.resolve(false);
 const key=uid+':'+kind+':'+id;
 if(pendingExperienceRewards.get(key)?.promise)return pendingExperienceRewards.get(key).promise;
 const entry={uid,kind,id,promise:null};pendingExperienceRewards.set(key,entry);
 entry.promise=playerExperience.complete(kind,id).then(()=>{pendingExperienceRewards.delete(key);return true;}).catch(error=>{
  if(window.VietVillageAuth?.getProfile?.()?.uid===uid){toast(error.message);$('experienceNotice').textContent=error.message;$('experienceNotice').hidden=false;}
  return false;
 }).finally(()=>{entry.promise=null;$('experienceRewardRetry').hidden=![...pendingExperienceRewards.values()].some(item=>item.uid===window.VietVillageAuth?.getProfile?.()?.uid);});
 return entry.promise;
}
function openScenery(){if(!window.VietVillageAuth?.isAuthenticated()||(window.VietVillageCharacter&&!window.VietVillageCharacter.isReady()))return;stopVillageWalk();if(insideHouse)leaveHouse();world.visible=true;housePreview.visible=false;active=false;clearMotion();$('home').classList.add('hidden');$('hud').style.display='block';gems.forEach(g=>g.visible=false);player.visible=false;portal.visible=false;treasure.visible=false;sceneryFocus.set(0,1,0);sceneryRadius=60;yaw=.55;pitch=.67;gateView=-1;houseView=-1;if(window.VietVillageOnline?.hasRoom())startRoomWalk();else startRoaming();}
function bindScenery(){yaw=.55;pitch=.67;$('pondBtn').onclick=showPondView;$('play').onclick=()=>window.VietVillageAuth?.enterGame(openScenery);$('walkBtn').onclick=startRoaming;$('houseBtn').onclick=()=>{if(regionTravel&&regionTravel.currentId!=='lang-viet')return;stopVillageWalk();world.visible=false;housePreview.visible=true;clearMotion();gateView=-1;houseView=(houseView+1)%4;sceneryFocus.set(11,2.0,0);sceneryRadius=Math.max(12,7.5/camera.aspect);yaw=[0,Math.PI,-Math.PI/2,Math.PI/2][houseView];pitch=.22;toast('Nhà dân · '+['Mặt trước','Mặt sau','Bên trái','Bên phải'][houseView]);};$('overviewBtn').onclick=()=>{stopVillageWalk();world.visible=true;housePreview.visible=false;gateView=-1;houseView=-1;sceneryFocus.set(0,1,0);sceneryRadius=60;yaw+=Math.PI/2;pitch=.67;};$('cameraBtn').onclick=()=>{stopVillageWalk();world.visible=true;housePreview.visible=false;gateView=-1;houseView=-1;sceneryFocus.set(0,1,0);sceneryRadius=60;yaw=.55;pitch=.67;};}
let clockT=0,climateElapsed=0,uiElapsed=0,nextFrameAt=0,contentLoading=true,contentWatchUntil=0;
const cameraDestination=new THREE.Vector3(),cameraOffset=new THREE.Vector3();
// Light camera shake from VFX impacts (Chấn Địa): added just before render and removed
// right after, so camera follow/collision never sees it. Player can turn it off (climate panel).
const CAMERA_SHAKE_KEY='viet-village:camera-shake',cameraShakeOffset=new THREE.Vector3();let cameraShakeAmount=0,cameraShakeTime=0;
function cameraShakeEnabled(){const box=$('cameraShake');return !box||box.checked;}
function addCameraShake(amount){if(!cameraShakeEnabled()||!(amount>0))return;cameraShakeAmount=Math.min(.18,Math.max(cameraShakeAmount,amount));}
function applyCameraShake(dt){cameraShakeOffset.set(0,0,0);if(cameraShakeAmount<.002){cameraShakeAmount=0;return;}cameraShakeTime+=dt;const a=cameraShakeAmount,k=cameraShakeTime*47;
 cameraShakeOffset.set(Math.sin(k*1.13)*a,Math.sin(k*1.71+1.3)*a*.8,Math.sin(k*.93+2.1)*a*.6);camera.position.add(cameraShakeOffset);cameraShakeAmount*=Math.exp(-dt*(window.StaffVFXConfig?.cameraShake?.decay||11));}
(()=>{const box=$('cameraShake');if(!box)return;try{box.checked=localStorage.getItem(CAMERA_SHAKE_KEY)!=='off';}catch(_){/* storage blocked: keep default */}
 box.addEventListener('change',()=>{try{localStorage.setItem(CAMERA_SHAKE_KEY,box.checked?'on':'off');}catch(_){/* not persisted */}if(!box.checked)cameraShakeAmount=0;});})();
function tick(ms){requestAnimationFrame(tick);experienceView?.update();if(document.hidden||!window.VietVillageAuth?.isAuthenticated()){villageWeapons?.suspend();window.VillagePerformance?.resetSample();resetHouseTravel();regionTravel?.reset();last=0;nextFrameAt=0;return;}
// The opaque atlas does not need a second GPU render underneath it. Room presence continues.
if(window.VietVillageAtlas?.isOpen()||window.VietVillageCharacter?.isOpen()){window.VietVillageOnline?.tick(last?Math.min((ms-last)/1000,.05):0);last=ms;nextFrameAt=0;window.VillagePerformance?.resetSample();return;}
const elapsed=ms-last,homeVisible=!$('home').classList.contains('hidden');
// Avoid rendering the same scene at 120/144 Hz, or continuously behind the landing panel.
const frameInterval=homeVisible?100:1000/60;
if(last&&ms<nextFrameAt-.5)return;
nextFrameAt=ms+frameInterval-(nextFrameAt&&ms-nextFrameAt<frameInterval?Math.max(0,ms-nextFrameAt):0);
const portalDt=last?Math.max(0,elapsed/1000):.016;
let dt=last?Math.max(0,Math.min(elapsed/1000,.05)):.016;last=ms;clockT+=dt;let t=clockT,avatarSpeed=0;
if(localWalking)player.visible=world.visible&&!insideHouse&&gateView<0&&houseView<0;
// Chuyển động sóng biển và mây.
water.material.color.setRGB(.29+Math.sin(t*.3)*.015,.62,.63);water.material.roughness=.32+Math.sin(t*.4)*.04;portalRing.rotation.z=t*.15;altar.rotation.y=t;altar.position.y=1.6+Math.sin(t*2)*.10;sparkles.rotation.y=t*.006;
for(let i=0;i<gems.length;i++){let g=gems[i];if(g.userData.taken)continue;g.position.y=g.userData.base+Math.sin(t*2.3+i)*.18;g.rotation.y=t*.9;}
if((active||multiplayerWalking||localWalking)&&world.visible&&!insideHouse&&!overlays()&&gateView<0&&houseView<0){
 let dx=0,dz=0;let ix=(keys.KeyD||keys.ArrowRight?1:0)-(keys.KeyA||keys.ArrowLeft?1:0)+joystick.x;let iz=(keys.KeyS||keys.ArrowDown?1:0)-(keys.KeyW||keys.ArrowUp?1:0)+joystick.y;
 const manualMovement=Math.abs(ix)+Math.abs(iz)>.08;
 if(manualMovement){target=null;waypoints=[];dx=ix*Math.cos(yaw)+iz*Math.sin(yaw);dz=-ix*Math.sin(yaw)+iz*Math.cos(yaw);}else if(target){while(target&&Math.hypot(target.x-player.position.x,target.z-player.position.z)<.2)target=waypoints.shift()||null;if(target){dx=target.x-player.position.x;dz=target.z-player.position.z;const distance=Math.hypot(dx,dz);dx/=distance;dz/=distance;}}
 const movement=playerMotion.step(dt,{x:dx,z:dz,speed:keys.ShiftLeft||keys.ShiftRight?MOVE_SPEED.run:MOVE_SPEED.walk,enabled:!villageWeapons?.movementLocked});
 avatarSpeed=movement.speed;
 if(manualMovement)playerJourney?.recordMovement(movement.distance);
 if(!playerAvatar?.isGLTF){
  proceduralStride+=movement.distance*2.5;const weight=Math.min(1,avatarSpeed/MOVE_SPEED.walk),blend=1-Math.exp(-16*dt);
  const stride=Math.sin(proceduralStride)*.5*weight;
  leftLeg.rotation.x+=(stride-leftLeg.rotation.x)*blend;rightLeg.rotation.x+=(-stride-rightLeg.rotation.x)*blend;
  leftArm.rotation.x+=(-stride*.65-leftArm.rotation.x)*blend;rightArm.rotation.x+=(stride*.65-rightArm.rotation.x)*blend;
  body.position.y=0;
 }

 for(let g of (active?gems:[])){if(!g.userData.taken&&Math.hypot(player.position.x-g.position.x,player.position.z-g.position.z)<1.15){g.userData.taken=true;g.visible=false;collected++;hud();beep(500+collected*160);toast(collected===3?'Đủ 3 tinh thể! Đến điểm sáng vàng trên bản đồ.':'Tinh thể '+collected+'/3 ✦');}}
 let near=Math.hypot(player.position.x-portal.position.x,player.position.z-portal.position.z)<3;$('interact').style.display=active&&near?'block':'none';$('interact').disabled=collected<3;$('interact').textContent=collected<3?'Cần đủ 3 tinh thể để mở cổng':'E · Giải câu đố';
}else {playerMotion?.step(dt,{enabled:false});$('interact').style.display='none';}
if(insideHouse){updateInterior(dt);}else if(gateView>=0){let positions=[[0,4.6,35],[0,4.6,13],[-11,4.6,24],[11,4.6,24]];camera.position.lerp(cameraDestination.set(...positions[gateView]),1-Math.exp(-dt*5));camera.lookAt(0,3.0,24);}else{if((multiplayerWalking||localWalking)&&world.visible){cameraOffset.set(player.position.x,player.position.y+1,player.position.z);
 // Smooth follow while walking; a teleport (spawn, house exit, map change) snaps so the collision-checked camera starts from the real focus.
 if(sceneryFocus.distanceToSquared(cameraOffset)>4)sceneryFocus.copy(cameraOffset);else sceneryFocus.lerp(cameraOffset,1-Math.exp(-10*dt));}const look=sceneryFocus;let desired=cameraDestination.copy(look).add(cameraOffset.set(Math.sin(yaw)*Math.cos(pitch)*sceneryRadius,Math.sin(pitch)*sceneryRadius,Math.cos(yaw)*Math.cos(pitch)*sceneryRadius));if((localWalking||multiplayerWalking)&&world.visible)desired=villageWalkingCameraTarget(look);camera.position.lerp(desired,1-Math.exp(-dt*5));if((localWalking||multiplayerWalking)&&world.visible)constrainVillageCamera(camera.position,look);camera.lookAt(look);}
climateElapsed+=dt;uiElapsed+=dt;
if(climateElapsed>=1/30){updateClimate(climateElapsed);window.VietVillageMapAssets?.update(clockT,climate,world.visible&&!insideHouse&&regionTravel?.currentId==='lang-viet');climateElapsed=0;}
playerHealthView?.update(dt);
if(uiElapsed>=.1){if(!contentWatchUntil)contentWatchUntil=ms+60000;contentLoading=ms<contentWatchUntil&&!!window.isVillageContentLoading?.();updatePondChecks();updateEntrances();if($('minimap').offsetParent!==null)minimap();gameHud?.update();window.VietVillageLandscape?.schedule();uiElapsed=0;}
if(playerAvatar?.isGLTF)body.position.y=0;playerAvatar?.update(dt,avatarSpeed);
regionTravel?.update(portalDt);window.VietVillageNPCs?.update(dt);learningCollectibles?.update(dt);housePortalSystem?.update(portalDt);villageWeapons?.update(dt);window.VietVillageOnline?.tick(dt);window.VillagePerformance?.beforeRender(ms);applyCameraShake(dt);renderer.render(scene,camera);camera.position.sub(cameraShakeOffset);window.VillagePerformance?.sample(ms,!overlays()&&!contentLoading);
}
let gameInitialized=false,gameInitializationStarted=false,enteredCharacterUid=null;
function initializeVillageGame(){
if(!window.VietVillageAuth?.isAuthenticated())return false;
if(gameInitializationStarted)return gameInitialized;
gameInitializationStarted=true;
try{
playerExperience=window.createVillageExperience({getIdentity:()=>({authenticated:!!window.VietVillageAuth?.isAuthenticated(),uid:window.VietVillageAuth?.getProfile?.()?.uid||null}),
 getMode:()=>window.VietVillageExperiencePolicy?.localOnly===false?'online-unavailable':'local',
 storage:{getItem:key=>localStorage.getItem(key),setItem:(key,value)=>localStorage.setItem(key,value)},
 withLock:globalThis.navigator?.locks?.request?(name,operation)=>navigator.locks.request(name,operation):null,
 onChange:()=>{experienceView?.update();window.VietVillageNPCs?.invalidateQuests?.();},onReward:result=>experienceView?.reward(result)});
experienceView=window.createVillageExperienceView({document,getState:()=>playerExperience.getState(),retry:()=>playerExperience.refresh()});
window.VietVillageExperience=playerExperience;
addEventListener('storage',event=>{if(event.key===null||event.key?.startsWith(playerExperience.storagePrefix))playerExperience.refresh();});
$('experienceRewardRetry').addEventListener('click',()=>{for(const item of pendingExperienceRewards.values())if(item.uid===window.VietVillageAuth?.getProfile?.()?.uid&&!item.promise)void claimActivityExperience(item.kind,item.id);});
playerJourney=window.createVillageJourney?.({getIdentity:()=>({authenticated:!!window.VietVillageAuth?.isAuthenticated(),uid:window.VietVillageAuth?.getProfile?.()?.uid||null}),storage:localStorage,notify:toast,getExperience:()=>playerExperience.getState(),
 // Session combat consumes guard before HP. VFX only observes the absorption result.
 mitigateDamage:hit=>villageWeapons?.absorbDamage(hit)??hit.amount})||null;
window.VietVillageJourney=playerJourney;
if(!THREE.WebGLRenderer)throw new Error('Không tải được Three.js.');renderer=new THREE.WebGLRenderer({antialias:false,powerPreference:'high-performance'});renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;$('view').append(renderer.domElement);if(matchMedia('(pointer:coarse)').matches)document.body.classList.add('touch');
// Hybrid devices: the touch layout (joystick, large skills) follows the input actually used.
addEventListener('pointerdown',e=>{if(e.pointerType==='touch')document.body.classList.add('touch');else if(e.pointerType==='mouse')document.body.classList.remove('touch');},{capture:true,passive:true});
// C opens/closes the character sheet (not while typing or inside another window).
addEventListener('keydown',e=>{if(e.code!=='KeyC'||e.repeat||e.ctrlKey||e.altKey||e.metaKey||['INPUT','TEXTAREA','SELECT'].includes(e.target?.tagName)||e.target?.isContentEditable)return;
 if(window.VietVillageCharacter?.isOpen()){if(window.VietVillageCharacter.state.mode==='profile'){e.preventDefault();window.VietVillageCharacter.close();}return;}
 if(!overlays()){e.preventDefault();void openCharacterSheet();}});
$('playerPortraitBtn')?.addEventListener('click',e=>{e.stopPropagation?.();void openCharacterSheet();});window.VillagePerformance=window.createVillagePerformance({renderer,getSun:()=>sun,getSize:()=>({width:innerWidth,height:innerHeight,dpr:devicePixelRatio,mobile:innerWidth<800||matchMedia('(pointer:coarse)').matches}),readout:$('performanceReadout'),storage:localStorage});$('quality').value=window.VillagePerformance.mode;quality();createWorld();bind();bindScenery();bindInterior();initClimate();initializeHouseTravel();initializeRegionTravel();void window.VietVillageMapAssets?.initialize({region:regionTravel.current,interior:interiorRoot,preview:housePreview,notify:toast});$('loading').classList.add('hidden');requestAnimationFrame(tick);renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();toast('Đồ họa bị gián đoạn. Hãy tải lại trang để tiếp tục.');});gameInitialized=true;
playerMotion=window.createVillagePlayerMotion({position:player.position,body,surfaceAt:villageMovementSurface,contextKey:()=>regionTravel?.currentId+':'+insideHouse});
window.VietVillagePlayerMotion=playerMotion;
villageWeapons=window.createVillageWeapons({THREE,scene,body,rightArm,leftArm,leftLeg,rightLeg,clearMotion,startRoaming,aim:{fromScreen:aimFromScreen,fromDrag:aimFromDrag},notify:toast,
 getQuality:()=>{const level=window.VillagePerformance?.policy?.level;return level>=3?'high':level>=2?'medium':'low';},
 getCasterHeight:()=>playerAvatar?.height||2.35,
 getProjectileBounds:()=>travelCameraBounds,
 onVfxEvent:event=>{if(event.type==='impact'&&event.shake>0)addCameraShake(event.shake);},
 onSkillUsed:skill=>{playerJourney?.recordSkillUse();if(!['staff.con-quet','staff.chan-dia','bow.xuyen-tien'].includes(skill.skillId))window.VietVillageNPCs?.onSkillUsed();playerAvatar?.onSkillUsed(skill);},
 onSkillHit:event=>window.VietVillageNPCs?.onSkillUsed(event),onSkillCancel:()=>playerAvatar?.cancelSkillPose?.(),
 getGroundY:point=>bridgeHeight(point.x,point.z),
 getState:()=>({authenticated:!!window.VietVillageAuth?.isAuthenticated(),uid:window.VietVillageAuth?.getProfile?.()?.uid||null,maxHp:playerJourney?.getState().maxHp,airborne:!!playerMotion?.airborne,poseBusy:!!playerAvatar?.state?.animation?.busy||!!playerMotion?.airborne,
 // HP 0 (defeat) blocks casting; update() then cancels any live skill visuals.
 canCast:gameInitialized&&!!window.VietVillageAuth?.isAuthenticated()&&playerJourney?.getState().alive!==false&&(localWalking||multiplayerWalking)&&world.visible&&!insideHouse&&!overlays()&&gateView<0&&houseView<0})});
window.VietVillageWeapons=villageWeapons;
playerAvatar=window.createVillagePlayerAvatar({THREE,body,proceduralParts:body.children.filter(part=>part.userData.proceduralAvatarPart),motion:playerMotion,
 getState:()=>({authenticated:!!window.VietVillageAuth?.isAuthenticated(),hp:playerJourney?.getState().hp,
  visible:player.visible&&world.visible&&!insideHouse,
  canOpen:gameInitialized&&(localWalking||multiplayerWalking)&&world.visible&&!insideHouse&&!overlays()&&gateView<0&&houseView<0}),
 pause:()=>{clearMotion();resetHouseTravel();regionTravel?.reset();villageWeapons?.suspend();},notify:toast,
 onAttachment:socket=>villageWeapons?.setAvatarSocket(socket)});
window.VietVillagePlayerAvatar=playerAvatar;
window.VietVillageAtlas=window.createVillageAtlas({isAuthenticated:()=>!!window.VietVillageAuth?.isAuthenticated(),
 isReady:()=>gameInitialized&&$('home').classList.contains('hidden'),getRegions:()=>regionTravel,
 pause:()=>{clearMotion();resetHouseTravel();regionTravel?.reset();villageWeapons?.suspend();}});
playerHealthView=window.createVillageHealthView({THREE,scene,player,getState:()=>playerJourney.getState(),isVisible:()=>!!window.VietVillageAuth?.isAuthenticated()&&player.visible&&world.visible&&!insideHouse,readout:$('healthReadout'),bar:$('healthBar'),hud:$('healthHud')});
const npcRegion=regionTravel.current;
window.VietVillageNPCs=window.createVillageNPCController({THREE,region:npcRegion,storage:localStorage,
 getIdentity:()=>({authenticated:!!window.VietVillageAuth?.isAuthenticated(),uid:window.VietVillageAuth?.getProfile?.()?.uid}),
 getJourney:()=>playerJourney?.getState(),
 healPlayer:()=>playerJourney.healToFull(),onHealed:()=>playerHealthView.healed(),
 getLesson:definition=>window.resolveVillageLesson(definition,{core,advanced}),
 onActivityCompleted:claimActivityExperience,
 onLearningOpen:(npcId,questId)=>learningView?.open(npcId,questId),getLearningEntries:({level})=>learningClient?.questEntries?.({level})||[],
 getLevel:()=>{const s=playerExperience?.getState();return s?.status==='ready'?s.level:null;},getCamera:()=>camera,onQuestBoardChange:board=>gameHud?.render(board),
 getState:()=>({authenticated:!!window.VietVillageAuth?.isAuthenticated(),
  transitioning:regionTravel.status.transitioning||!!housePortalSystem?.status?.pending,
  inVillage:regionTravel.currentId==='lang-viet'&&!insideHouse&&world.visible&&!housePreview.visible,
  canInteract:(localWalking||multiplayerWalking)&&gateView<0&&houseView<0&&!overlays()&&!document.hidden,position:player.position,yaw:body.rotation.y}),
 pause:()=>{clearMotion();resetHouseTravel();regionTravel?.reset();villageWeapons?.suspend();},notify:toast,
 goTo:point=>{if(regionTravel.currentId!=='lang-viet'||!startRoaming())return false;
  waypoints=findPath(player.position,point);target=waypoints.shift()||null;
  document.activeElement?.blur?.();toast(target?'Đang đi tới dân làng · Đến gần nhấn F để trò chuyện.':'Hãy đi bộ lại gần dân làng.');return !!target;},
 loadData:async()=>{
  const result={};await Promise.all(['gameplay','dialogues','quests'].map(async name=>{
   const response=await fetch('../MAP/regions/lang-viet/'+name+'.json?v=20261012-farmer2');
   if(!response.ok)throw new Error(name+' (HTTP '+response.status+')');result[name]=await response.json();
  }));return result;
 }
});
if(typeof fetch==='function')window.VietVillageNPCs.load();
gameHud=window.createVillageGameHud?.({document,storage:localStorage,
 getCharacter:()=>window.VietVillageCharacter?.state?.character||null,getExperience:()=>playerExperience?.getState(),
 getRegionName:()=>regionTravel?.currentId||'',getBoard:()=>window.VietVillageNPCs?.questBoard,track:id=>window.VietVillageNPCs?.track(id),
 nameOf:id=>window.VietVillageNPCs?.nameOf?.(id),goTo:questGoTo,
 openDetail:entry=>{if(entry?.source==='learning')learningView?.open(null,entry.id);else window.VietVillageNPCs?.openDirectory();}})||null;
window.VietVillageLandscape=window.createVillageLandscape?.({document,win:window,
 getPhase:()=>!window.VietVillageAuth?.isAuthenticated()?'auth':window.VietVillageCharacter?.isOpen()?'character':gameInitialized&&window.VietVillageCharacter?.isReady()?'game':'none',
 releaseInputs:()=>{releaseGameInputs();villageWeapons?.suspend();resetHouseTravel();regionTravel?.reset();},
 openCharacter:()=>window.VietVillageCharacter?.openProfile?.(),logout:()=>$('logoutBtn')?.click()})||null;
initializeLearning();
installPondChecks();$('home').classList.remove('hidden');return true;
}catch(e){$('loading').classList.add('hidden');$('fatal').style.display='block';$('fatal').textContent='Chưa khởi động được đồ họa 3D. Hãy mở bằng Chrome/Edge/Safari mới và bật tăng tốc phần cứng. Chi tiết: '+e.message;$('play').disabled=true;$('homeLevels').disabled=true;console.error(e);}

return false;
}
function stopRoomWalk(){multiplayerWalking=false;if(gameInitialized){clearMotion();if(!localWalking)player.visible=false;}}
function stopVillageWalk(){playerMotion?.reset();resetHouseTravel();regionTravel?.reset();document.body.classList.remove('walking');localWalking=false;stopRoomWalk();villageWeapons?.suspend();document.body.classList.remove('weapons-roaming');}
function stopRoaming(){playerMotion?.reset();resetHouseTravel();regionTravel?.reset();document.body.classList.remove('walking');localWalking=false;clearMotion();if(!multiplayerWalking)player.visible=false;}
function startRoaming(){
 if(!gameInitialized||!window.VietVillageAuth?.isAuthenticated()||(window.VietVillageCharacter&&!window.VietVillageCharacter.isReady()))return false;
 if(insideHouse)leaveHouse();world.visible=true;housePreview.visible=false;gateView=-1;houseView=-1;
 if(!Number.isFinite(villageMovementSurface(player.position.x,player.position.z))){
  const point=regionTravel?.current.spawn;const spawn=[...(point?[[point.x,point.z]]:[]),[0,21],[0,18],[-3,18]].find(([x,z])=>canWalk(x,z));
  if(!spawn)return false;player.position.set(spawn[0],bridgeHeight(...spawn),spawn[1]);
 }
 localWalking=true;clearMotion();$('home').classList.add('hidden');$('hud').style.display='block';player.visible=true;sceneryFocus.copy(player.position);sceneryRadius=8.5;pitch=.57;yaw=0;document.body.classList.add('walking');resetHouseTravel();regionTravel?.reset();
 $('helpText').textContent='WASD / cần điều khiển: đi · Shift: chạy · Space / Nhảy: vượt vật cản thấp · Đứng trong vòng xanh để vào nhà';
 regionTravel?.refreshUI();return true;
}
function startRoomWalk(){
 if(!gameInitialized||!window.VietVillageAuth?.isAuthenticated()||!window.VietVillageOnline?.hasRoom())return;
 if(insideHouse)leaveHouse();world.visible=true;housePreview.visible=false;gateView=-1;houseView=-1;multiplayerWalking=true;document.body.classList.add('walking');resetHouseTravel();regionTravel?.reset();
 clearMotion();$('home').classList.add('hidden');$('hud').style.display='block';player.visible=true;sceneryRadius=11;pitch=.6;regionTravel?.refreshUI();
}
function lockVillageGame(){
 learningView?.lock();learningClient?.lock();learningCollectibles?.lock();gameHud?.lock();
 playerExperience?.lock();pendingExperienceRewards.clear();if($('experienceRewardRetry'))$('experienceRewardRetry').hidden=true;
 playerAvatar?.lock();
 window.VietVillageRegions?.closeMenu({restoreFocus:false});
 playerJourney?.lock();playerHealthView?.clear();
 window.VietVillageNPCs?.lock();
 window.VietVillageAtlas?.close({restoreFocus:false});
 if(gameInitialized){villageWeapons?.lock();clearMotion();if(insideHouse)leaveHouse();stopVillageWalk();active=false;
  for(const id of ['quiz','levels','complete','referenceGallery','climatePanel','roomControls','roomPanel'])$(id).classList.add('hidden');}
 $('hud').style.display='none';$('home').classList.remove('hidden');
}
window.VietVillageGame=Object.freeze({
 pauseCharacterSetup(){releaseGameInputs();resetHouseTravel();regionTravel?.reset();villageWeapons?.suspend();},
 releaseInputs:()=>releaseGameInputs(),setPortrait:url=>gameHud?.setPortrait(url),characterSheet,
 canOpenCharacter:()=>gameInitialized&&!overlays(),
 applyCharacter:record=>{const model=window.VietVillageCharacterModels?.find(item=>item.id===record?.modelId&&item.available);return model?playerAvatar.select(model.avatarId):Promise.resolve(false);},
 enterCharacter({newCharacter=false}={}){
  if(!window.VietVillageAuth?.isAuthenticated()||!window.VietVillageCharacter?.isReady())return false;
  const uid=window.VietVillageAuth.getProfile()?.uid;if(!uid)return false;
  // Preserve the existing live position on re-authentication. A fresh page or
  // another UID uses the registered safe spawn; no new position store is invented.
  const firstEntry=enteredCharacterUid!==uid;
  openScenery();
  if(firstEntry){const result=regionTravel.travelTo('lang-viet','village-entry');if(!result.ok)return false;}
  enteredCharacterUid=uid;return true;
 },
 initialize:initializeVillageGame,lock:lockVillageGame,
 isReady:()=>gameInitialized,scene:()=>scene,avatarTemplate:()=>player,clearMotion,startRoomWalk,stopRoomWalk,startRoaming,stopRoaming,
 canRenderPeers:()=>gameInitialized&&!overlays()&&(insideHouse||world.visible),
 getPose:()=>!gameInitialized?null:insideHouse?{x:insidePosition.x,y:.3,z:insidePosition.z,yaw:insideYaw,mapId:'house-'+(selectedHouse+1),moving:!!(keys.KeyW||keys.KeyS||keys.KeyA||keys.KeyD)}:
 {x:player.position.x,y:player.position.y,z:player.position.z,yaw:body.rotation.y,mapId:regionTravel?.current.networkMapId||'village',moving:(multiplayerWalking||localWalking)&&!!(keys.KeyW||keys.KeyS||keys.KeyA||keys.KeyD||keys.ArrowUp||keys.ArrowDown||keys.ArrowLeft||keys.ArrowRight||Math.abs(joystick.x)+Math.abs(joystick.y)>.08||target)}});
