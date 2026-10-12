'use strict';
// Distinct house/map identities share the existing fully walkable 3D room template.
const interiorPortalConfigs=new Map();
function configureInteriorPortals(){
  interiorPortalConfigs.clear();
  for(const house of housePortalConfigs)interiorPortalConfigs.set(house.interiorId,{
    id:house.interiorId,houseId:house.id,template:'nha-dan-truyen-thong',
    spawn:house.interiorSpawn,exit:house.interiorExit
  });
}
function prepareHouseDestination(id){
  const destination=interiorPortalConfigs.get(id);
  if(!destination||!interiorRoot||!roomLight)throw new Error('Nội thất chưa sẵn sàng. Nhân vật vẫn ở sân.');
  const {spawn,exit}=destination;
  if(!roomCanWalk(spawn.x,spawn.z)||Math.hypot(spawn.x-exit.x,spawn.z-exit.z)<=exit.radius+.25)
    throw new Error('Điểm xuất hiện trong nhà không an toàn.');
  if(!roomCanWalk(exit.x,exit.z))throw new Error('Lối ra trong nhà bị chắn.');
  return destination;
}
function validateYardDestination(config){
  const spawn=config?.exteriorSpawn;
  if(!spawn||!canWalk(spawn.x,spawn.z)||Math.hypot(spawn.x-config.entry.x,spawn.z-config.entry.z)<=config.entry.radius+.25)
    throw new Error('Điểm quay ra sân không an toàn.');
  return config;
}
