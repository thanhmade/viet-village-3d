'use strict';
let multiplayerWalking=false,localWalking=false,villageWeapons=null,playerJourney=null,playerHealthView=null;
function openScenery(){if(!window.VietVillageAuth?.isAuthenticated())return;stopVillageWalk();if(insideHouse)leaveHouse();world.visible=true;housePreview.visible=false;active=false;clearMotion();$('home').classList.add('hidden');$('hud').style.display='block';gems.forEach(g=>g.visible=false);player.visible=false;portal.visible=false;treasure.visible=false;sceneryFocus.set(0,1,0);sceneryRadius=60;yaw=.55;pitch=.67;gateView=-1;houseView=-1;if(window.VietVillageOnline?.hasRoom())startRoomWalk();else startRoaming();}
function bindScenery(){yaw=.55;pitch=.67;$('play').onclick=()=>window.VietVillageAuth?.enterGame(openScenery);$('walkBtn').onclick=startRoaming;$('houseBtn').onclick=()=>{if(regionTravel&&regionTravel.currentId!=='lang-viet')return;stopVillageWalk();world.visible=false;housePreview.visible=true;clearMotion();gateView=-1;houseView=(houseView+1)%4;sceneryFocus.set(11,2.0,0);sceneryRadius=Math.max(12,7.5/camera.aspect);yaw=[0,Math.PI,-Math.PI/2,Math.PI/2][houseView];pitch=.22;toast('Nhà dân · '+['Mặt trước','Mặt sau','Bên trái','Bên phải'][houseView]);};$('overviewBtn').onclick=()=>{stopVillageWalk();world.visible=true;housePreview.visible=false;gateView=-1;houseView=-1;sceneryFocus.set(0,1,0);sceneryRadius=60;yaw+=Math.PI/2;pitch=.67;};$('cameraBtn').onclick=()=>{stopVillageWalk();world.visible=true;housePreview.visible=false;gateView=-1;houseView=-1;sceneryFocus.set(0,1,0);sceneryRadius=60;yaw=.55;pitch=.67;};}
let clockT=0,climateElapsed=0,uiElapsed=0,nextFrameAt=0;
const cameraDestination=new THREE.Vector3(),cameraOffset=new THREE.Vector3();
function tick(ms){requestAnimationFrame(tick);if(document.hidden||!window.VietVillageAuth?.isAuthenticated()){villageWeapons?.suspend();window.VillagePerformance?.resetSample();resetHouseTravel();regionTravel?.reset();last=0;nextFrameAt=0;return;}
// The opaque atlas does not need a second GPU render underneath it. Room presence continues.
if(window.VietVillageAtlas?.isOpen()){window.VietVillageOnline?.tick(last?Math.min((ms-last)/1000,.05):0);last=ms;nextFrameAt=0;window.VillagePerformance?.resetSample();return;}
const elapsed=ms-last,homeVisible=!$('home').classList.contains('hidden');
// Avoid rendering the same scene at 120/144 Hz, or continuously behind the landing panel.
const frameInterval=homeVisible?100:1000/60;
if(last&&ms<nextFrameAt-.5)return;
nextFrameAt=ms+frameInterval-(nextFrameAt&&ms-nextFrameAt<frameInterval?Math.max(0,ms-nextFrameAt):0);
const portalDt=last?Math.max(0,elapsed/1000):.016;
let dt=last?Math.max(0,Math.min(elapsed/1000,.05)):.016;last=ms;clockT+=dt;let t=clockT;
if(localWalking)player.visible=world.visible&&!insideHouse&&gateView<0&&houseView<0;
// Chuyển động sóng biển và mây.
water.material.color.setRGB(.29+Math.sin(t*.3)*.015,.62,.63);water.material.roughness=.32+Math.sin(t*.4)*.04;portalRing.rotation.z=t*.15;altar.rotation.y=t;altar.position.y=1.6+Math.sin(t*2)*.10;sparkles.rotation.y=t*.006;
for(let i=0;i<gems.length;i++){let g=gems[i];if(g.userData.taken)continue;g.position.y=g.userData.base+Math.sin(t*2.3+i)*.18;g.rotation.y=t*.9;}
if((active||multiplayerWalking||localWalking)&&world.visible&&!insideHouse&&!overlays()&&gateView<0&&houseView<0){
 let dx=0,dz=0;let ix=(keys.KeyD||keys.ArrowRight?1:0)-(keys.KeyA||keys.ArrowLeft?1:0)+joystick.x;let iz=(keys.KeyS||keys.ArrowDown?1:0)-(keys.KeyW||keys.ArrowUp?1:0)+joystick.y;
 const manualMovement=Math.abs(ix)+Math.abs(iz)>.08;
 if(manualMovement){target=null;waypoints=[];dx=ix*Math.cos(yaw)+iz*Math.sin(yaw);dz=-ix*Math.sin(yaw)+iz*Math.cos(yaw);}else if(target){dx=target.x-player.position.x;dz=target.z-player.position.z;if(Math.hypot(dx,dz)<.2){target=waypoints.shift()||null;dx=dz=0;}}
 let len=Math.hypot(dx,dz);if(len>.01){let speed=(keys.ShiftLeft||keys.ShiftRight?6.5:4.5);const oldX=player.position.x,oldZ=player.position.z;player.position.x+=dx/len*speed*dt;player.position.z+=dz/len*speed*dt;if(!canWalk(player.position.x,player.position.z)){
 if(canWalk(player.position.x,oldZ))player.position.z=oldZ;
 else if(canWalk(oldX,player.position.z))player.position.x=oldX;
 else {player.position.x=oldX;player.position.z=oldZ;target=null;waypoints=[];}
}player.position.y=bridgeHeight(player.position.x,player.position.z);
if(manualMovement)playerJourney?.recordMovement(Math.hypot(player.position.x-oldX,player.position.z-oldZ));
let desired=Math.atan2(dx,dz);body.rotation.y+=Math.atan2(Math.sin(desired-body.rotation.y),Math.cos(desired-body.rotation.y))*Math.min(1,dt*12);leftLeg.rotation.x=Math.sin(t*11)*.5;rightLeg.rotation.x=-leftLeg.rotation.x;leftArm.rotation.x=-leftLeg.rotation.x*.65;rightArm.rotation.x=leftLeg.rotation.x*.65;body.position.y=Math.sin(t*22)*.045;}else{leftLeg.rotation.x*=.8;rightLeg.rotation.x*=.8;leftArm.rotation.x*=.8;rightArm.rotation.x*=.8;body.position.y=Math.sin(t*2)*.015;}
 for(let g of (active?gems:[])){if(!g.userData.taken&&Math.hypot(player.position.x-g.position.x,player.position.z-g.position.z)<1.15){g.userData.taken=true;g.visible=false;collected++;hud();beep(500+collected*160);toast(collected===3?'Đủ 3 tinh thể! Đến điểm sáng vàng trên bản đồ.':'Tinh thể '+collected+'/3 ✦');}}
 let near=Math.hypot(player.position.x-portal.position.x,player.position.z-portal.position.z)<3;$('interact').style.display=active&&near?'block':'none';$('interact').disabled=collected<3;$('interact').textContent=collected<3?'Cần đủ 3 tinh thể để mở cổng':'E · Giải câu đố';
}else $('interact').style.display='none';
if(insideHouse){updateInterior(dt);}else if(gateView>=0){let positions=[[0,4.6,35],[0,4.6,13],[-11,4.6,24],[11,4.6,24]];camera.position.lerp(cameraDestination.set(...positions[gateView]),1-Math.exp(-dt*5));camera.lookAt(0,3.0,24);}else{if((multiplayerWalking||localWalking)&&world.visible)sceneryFocus.copy(player.position).add(cameraOffset.set(0,1,0));const look=sceneryFocus;let desired=cameraDestination.copy(look).add(cameraOffset.set(Math.sin(yaw)*Math.cos(pitch)*sceneryRadius,Math.sin(pitch)*sceneryRadius,Math.cos(yaw)*Math.cos(pitch)*sceneryRadius));if((localWalking||multiplayerWalking)&&world.visible)desired=villageWalkingCameraTarget(look);camera.position.lerp(desired,1-Math.exp(-dt*5));if((localWalking||multiplayerWalking)&&world.visible)constrainVillageCamera(camera.position,look);camera.lookAt(look);}
climateElapsed+=dt;uiElapsed+=dt;
if(climateElapsed>=1/30){updateClimate(climateElapsed);climateElapsed=0;}
playerHealthView?.update(dt);
if(uiElapsed>=.1){updateEntrances();if($('minimap').offsetParent!==null)minimap();uiElapsed=0;}
regionTravel?.update(portalDt);window.VietVillageNPCs?.update(dt);housePortalSystem?.update(portalDt);villageWeapons?.update(dt);window.VietVillageOnline?.tick(dt);window.VillagePerformance?.beforeRender(ms);renderer.render(scene,camera);window.VillagePerformance?.sample(ms,!overlays());
}
let gameInitialized=false,gameInitializationStarted=false;
function initializeVillageGame(){
if(!window.VietVillageAuth?.isAuthenticated())return false;
if(gameInitializationStarted)return gameInitialized;
gameInitializationStarted=true;
try{
playerJourney=window.createVillageJourney?.({getIdentity:()=>({authenticated:!!window.VietVillageAuth?.isAuthenticated(),uid:window.VietVillageAuth?.getProfile?.()?.uid||null}),storage:localStorage,notify:toast})||null;
window.VietVillageJourney=playerJourney;
if(!THREE.WebGLRenderer)throw new Error('Không tải được Three.js.');renderer=new THREE.WebGLRenderer({antialias:false,powerPreference:'high-performance'});renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;$('view').append(renderer.domElement);if(matchMedia('(pointer:coarse)').matches)document.body.classList.add('touch');window.VillagePerformance=window.createVillagePerformance({renderer,getSun:()=>sun,getSize:()=>({width:innerWidth,height:innerHeight,dpr:devicePixelRatio,mobile:innerWidth<800||matchMedia('(pointer:coarse)').matches}),readout:$('performanceReadout'),storage:localStorage});$('quality').value=window.VillagePerformance.mode;quality();createWorld();bind();bindScenery();bindInterior();initClimate();initializeHouseTravel();initializeRegionTravel();$('loading').classList.add('hidden');requestAnimationFrame(tick);renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();toast('Đồ họa bị gián đoạn. Hãy tải lại trang để tiếp tục.');});gameInitialized=true;
villageWeapons=window.createVillageWeapons({THREE,scene,body,rightArm,clearMotion,startRoaming,stopRoaming,
 onSkillUsed:()=>{playerJourney?.recordSkillUse();window.VietVillageNPCs?.onSkillUsed();},
 getGroundY:point=>bridgeHeight(point.x,point.z),
 getState:()=>({authenticated:!!window.VietVillageAuth?.isAuthenticated(),
 canCast:gameInitialized&&!!window.VietVillageAuth?.isAuthenticated()&&(localWalking||multiplayerWalking)&&world.visible&&!insideHouse&&!overlays()&&gateView<0&&houseView<0})});
window.VietVillageWeapons=villageWeapons;
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
$('home').classList.remove('hidden');return true;
}catch(e){$('loading').classList.add('hidden');$('fatal').style.display='block';$('fatal').textContent='Chưa khởi động được đồ họa 3D. Hãy mở bằng Chrome/Edge/Safari mới và bật tăng tốc phần cứng. Chi tiết: '+e.message;$('play').disabled=true;$('homeLevels').disabled=true;console.error(e);}

return false;
}
function stopRoomWalk(){multiplayerWalking=false;if(gameInitialized){clearMotion();if(!localWalking)player.visible=false;}}
function stopVillageWalk(){resetHouseTravel();regionTravel?.reset();document.body.classList.remove('walking');localWalking=false;stopRoomWalk();villageWeapons?.suspend();document.body.classList.remove('weapons-roaming');}
function stopRoaming(){resetHouseTravel();regionTravel?.reset();document.body.classList.remove('walking');localWalking=false;clearMotion();if(!multiplayerWalking)player.visible=false;}
function startRoaming(){
 if(!gameInitialized||!window.VietVillageAuth?.isAuthenticated())return false;
 if(insideHouse)leaveHouse();world.visible=true;housePreview.visible=false;gateView=-1;houseView=-1;
 if(!canWalk(player.position.x,player.position.z)){
  const point=regionTravel?.current.spawn;const spawn=[...(point?[[point.x,point.z]]:[]),[0,21],[0,18],[-3,18]].find(([x,z])=>canWalk(x,z));
  if(!spawn)return false;player.position.set(spawn[0],bridgeHeight(...spawn),spawn[1]);
 }
 localWalking=true;clearMotion();$('home').classList.add('hidden');$('hud').style.display='block';player.visible=true;sceneryFocus.copy(player.position);sceneryRadius=8.5;pitch=.57;yaw=0;document.body.classList.add('walking');resetHouseTravel();regionTravel?.reset();
 $('helpText').textContent='WASD / mũi tên / cần điều khiển: đi bộ · Chạm đường để đi tới · Đứng trong vòng xanh 0,8 giây để vào nhà';
 regionTravel?.refreshUI();return true;
}
function startRoomWalk(){
 if(!gameInitialized||!window.VietVillageAuth?.isAuthenticated()||!window.VietVillageOnline?.hasRoom())return;
 if(insideHouse)leaveHouse();world.visible=true;housePreview.visible=false;gateView=-1;houseView=-1;multiplayerWalking=true;document.body.classList.add('walking');resetHouseTravel();regionTravel?.reset();
 clearMotion();$('home').classList.add('hidden');$('hud').style.display='block';player.visible=true;sceneryRadius=11;pitch=.6;regionTravel?.refreshUI();
}
function lockVillageGame(){
 window.VietVillageRegions?.closeMenu({restoreFocus:false});
 playerJourney?.lock();playerHealthView?.clear();
 window.VietVillageNPCs?.lock();
 window.VietVillageAtlas?.close({restoreFocus:false});
 if(gameInitialized){villageWeapons?.lock();clearMotion();if(insideHouse)leaveHouse();stopVillageWalk();active=false;
  for(const id of ['quiz','levels','complete','referenceGallery','climatePanel','roomControls','roomPanel'])$(id).classList.add('hidden');}
 $('hud').style.display='none';$('home').classList.remove('hidden');
}
window.VietVillageGame=Object.freeze({initialize:initializeVillageGame,lock:lockVillageGame,
 isReady:()=>gameInitialized,scene:()=>scene,avatarTemplate:()=>player,clearMotion,startRoomWalk,stopRoomWalk,startRoaming,stopRoaming,
 canRenderPeers:()=>gameInitialized&&!overlays()&&(insideHouse||world.visible),
 getPose:()=>!gameInitialized?null:insideHouse?{x:insidePosition.x,y:.3,z:insidePosition.z,yaw:insideYaw,mapId:'house-'+(selectedHouse+1),moving:!!(keys.KeyW||keys.KeyS||keys.KeyA||keys.KeyD)}:
 {x:player.position.x,y:player.position.y,z:player.position.z,yaw:body.rotation.y,mapId:regionTravel?.current.networkMapId||'village',moving:(multiplayerWalking||localWalking)&&!!(keys.KeyW||keys.KeyS||keys.KeyA||keys.KeyD||keys.ArrowUp||keys.ArrowDown||keys.ArrowLeft||keys.ArrowRight||Math.abs(joystick.x)+Math.abs(joystick.y)>.08||target)}});
