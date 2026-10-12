'use strict';
let housePortalSystem=null,houseTravelFocused=true;
const travelCameraRay=new THREE.Ray(),travelCameraDirection=new THREE.Vector3(),travelCameraHit=new THREE.Vector3(),travelCameraCandidate=new THREE.Vector3();
let travelCameraBounds=[];
function initializeHouseTravel(){
  configureHousePortals();configureInteriorPortals();
  travelCameraBounds=village.houses.map(h=>new THREE.Box3(new THREE.Vector3(h.x-3.75,.2,h.z-2.85),new THREE.Vector3(h.x+3.75,5.3,h.z+2.85)));
  // The gate roof can otherwise hide the player at the initial village spawn.
  travelCameraBounds.push(new THREE.Box3(new THREE.Vector3(-4.8,3.4,22),new THREE.Vector3(4.8,7.2,26)));
  housePortalSystem=window.createHousePortals({THREE,world,interiorRoot,entries:housePortalConfigs,
    getState:()=>({authenticated:!!window.VietVillageAuth?.isAuthenticated(),
      enabled:(insideHouse||!window.VietVillageRegions||window.VietVillageRegions.currentId==='lang-viet')&&houseTravelFocused&&!document.hidden&&!overlays()&&(insideHouse||gateView<0&&houseView<0&&world.visible&&(active||localWalking||multiplayerWalking)),
      mapId:insideHouse?housePortalConfigs[selectedHouse]?.interiorId:'village',
      houseId:insideHouse?housePortalConfigs[selectedHouse]?.id:null,position:insideHouse?insidePosition:player.position,camera}),
    onEnter:entry=>{prepareHouseDestination(entry.interiorId);enterHouse(entry.index);return true;},
    onExit:entry=>{validateYardDestination(entry);leaveHouse();return true;},toast
  });
  window.VietVillageHousePortals=housePortalSystem;
  addEventListener('blur',()=>{houseTravelFocused=false;housePortalSystem.reset();});
  addEventListener('focus',()=>{houseTravelFocused=true;});
  document.addEventListener('visibilitychange',()=>housePortalSystem.reset());
}
function resetHouseTravel(){housePortalSystem?.reset();}
function approachHouse(index){
  if(insideHouse||window.VietVillageRegions&&window.VietVillageRegions.currentId!=='lang-viet'||!window.VietVillageAuth?.isAuthenticated())return;
  const config=housePortalConfigs[index];if(!config)return;
  if(!startRoaming())return;
  const inRing=Math.hypot(player.position.x-config.entry.x,player.position.z-config.entry.z)<=config.entry.radius;
  waypoints=inRing?findPath(player.position,config.yardSpawn).concat(findPath(config.yardSpawn,config.entry)):findPath(player.position,config.entry);
  target=waypoints.shift()||null;
  toast(target?'Đi tới '+config.id+' · Đứng trong vòng 0,8 giây để vào nhà.':'Chưa tìm được đường. Hãy đi bộ tới vòng xanh trước cửa nhà.');
}
function approachRoomExit(){
  if(!insideHouse||overlays())return;
  clearMotion();const config=housePortalConfigs[selectedHouse],exit=config.interiorExit;
  const inRing=Math.hypot(insidePosition.x-exit.x,insidePosition.z-exit.z)<=exit.radius;
  waypoints=inRing?findRoomPath(insidePosition,config.roomSpawn).concat(findRoomPath(config.roomSpawn,exit)):findRoomPath(insidePosition,exit);
  target=waypoints.shift()||null;
  toast(target?'Đi tới vòng RA SÂN · Đứng trong vòng 0,8 giây.':'Hãy dùng WASD hoặc cần điều khiển để đi tới vòng RA SÂN.');
}
function villageWalkingCameraTarget(look){
  let angle=pitch;
  for(let attempt=0;attempt<10;attempt++){
    travelCameraCandidate.set(Math.sin(yaw)*Math.cos(angle)*sceneryRadius,Math.sin(angle)*sceneryRadius,Math.cos(yaw)*Math.cos(angle)*sceneryRadius).add(look);
    travelCameraDirection.copy(travelCameraCandidate).sub(look);
    const distance=travelCameraDirection.length();travelCameraDirection.normalize();travelCameraRay.set(look,travelCameraDirection);
    const blocked=travelCameraBounds.some(bounds=>!bounds.containsPoint(look)&&travelCameraRay.intersectBox(bounds,travelCameraHit)&&travelCameraHit.distanceTo(look)<distance);
    if(!blocked||angle>=1.48)break;angle=Math.min(1.48,angle+.12);
  }
  return constrainVillageCamera(travelCameraCandidate,look);
}
function constrainVillageCamera(position,look){
  travelCameraDirection.copy(position).sub(look);
  const distance=travelCameraDirection.length();if(distance<.001)return position;
  travelCameraDirection.normalize();travelCameraRay.set(look,travelCameraDirection);
  let clearDistance=distance;
  for(const bounds of travelCameraBounds){
    // Conservative roof bounds overlap narrow side paths; their exit face is not an obstacle in front of the actor.
    if(bounds.containsPoint(look))continue;
    if(travelCameraRay.intersectBox(bounds,travelCameraHit)){
      const hitDistance=travelCameraHit.distanceTo(look);
      if(hitDistance<distance)clearDistance=Math.min(clearDistance,Math.max(.1,hitDistance-.3));
    }
  }
  if(clearDistance<distance)position.copy(look).addScaledVector(travelCameraDirection,clearDistance);
  return position;
}
