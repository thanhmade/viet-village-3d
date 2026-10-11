'use strict';
// Six stable house IDs. Main doors face +Z; the last row borders the garden/pond.
const housePortalConfigs=[];
const houseAccessZones=[-11,11].flatMap(x=>[
  {x,z:14.4,w:2.95,d:.8,y:x<0?.56:.36},
  {x,z:15.45,w:.75,d:1.7,y:x<0?.56:.36},
  {x:x<0?-9:9,z:16.4,w:2.75,d:.75,y:x<0?.56:.36}
]);
function reservedHouseAccess(x,z,padding=0){
  return houseAccessZones.some(a=>Math.abs(x-a.x)<a.w+padding&&Math.abs(z-a.z)<a.d+padding);
}
function houseAccessFloor(x,z){
  return houseAccessZones.find(a=>Math.abs(x-a.x)<=a.w&&Math.abs(z-a.z)<=a.d);
}
function configureHousePortals(){
  housePortalConfigs.length=0;
  village.houses.forEach((house,index)=>{
    const id='nha-'+String(index+1).padStart(2,'0');
    const floor=houseAccessFloor(house.x,house.z+4.4)?.y||.33;
    housePortalConfigs.push({id,index,interiorId:'noi-that-'+id,
      entry:{x:house.x,y:floor+.035,z:house.z+4.4,radius:.62},
      yardSpawn:{x:house.x-1.65,y:floor,z:house.z+4.4},
      roomSpawn:{x:0,y:.03,z:.55,yaw:Math.PI}
    });
  });
  // Solid paving gives the two front houses a route around the old garden/pond overlap.
  for(const a of houseAccessZones){
    const paving=box(a.w*2,.06,a.d*2,0xcac3aa,a.x,a.y-.03,a.z,world);
    paving.name='loi-di-truoc-nha';
  }
}
