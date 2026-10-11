'use strict';
// Each destination retains its house identity; currently all use the existing 3D room template.
const interiorPortalConfigs=new Map();
function configureInteriorPortals(){
  housePortalConfigs.forEach(h=>interiorPortalConfigs.set(h.interiorId,{
    id:h.interiorId,houseId:h.id,template:'nha-dan-truyen-thong',
    spawn:{...h.roomSpawn},exit:{x:0,y:.065,z:2.0,radius:.62}
  }));
}
async function prepareHouseDestination(id){
  const destination=interiorPortalConfigs.get(id);
  if(!destination)throw new Error('Không tìm thấy nội thất '+id);
  if(!interiorRoot){
    try{buildInterior();attachInteriorPortal();}
    catch(error){
      if(interiorRoot){
        scene.remove(interiorRoot);
        interiorRoot.traverse(o=>{if(o.isMesh)o.geometry.dispose();});
      }
      interiorRoot=null;
      throw error;
    }
  }
  if(!roomCanWalk(destination.spawn.x,destination.spawn.z))throw new Error('Điểm xuất hiện trong nhà bị chắn');
  return destination;
}
