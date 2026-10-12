const {test}=require('node:test');
const assert=require('node:assert/strict');
const createHarness=require('./harness.cjs');

test('all six house rings and return spawns have flat ground clear of steps and obstacles',()=>{
 const {run}=createHarness();
 run('configureHousePortals();');
 assert.equal(run('housePortalConfigs.length'),6);
 assert.equal(run('new Set(housePortalConfigs.map(h=>h.id)).size'),6);
 assert.equal(run('new Set(housePortalConfigs.map(h=>h.interiorId)).size'),6);
 for(let index=0;index<6;index++){
  assert(run(`(()=>{const h=housePortalConfigs[${index}],r=h.entry.radius+.13;
   if(h.exteriorSpawn!==h.yardSpawn||h.interiorSpawn!==h.roomSpawn)return false;
   if(!canWalk(h.entry.x,h.entry.z)||!canWalk(h.yardSpawn.x,h.yardSpawn.z))return false;
   if(Math.hypot(h.entry.x-h.yardSpawn.x,h.entry.z-h.yardSpawn.z)<=r)return false;
   if(h.entry.z-r<=village.houses[${index}].z+3.53)return false;
   for(let sample=0;sample<64;sample++){
    const angle=sample*Math.PI/32,x=h.entry.x+Math.cos(angle)*r,z=h.entry.z+Math.sin(angle)*r;
    if(!canWalk(x,z)||Math.abs(bridgeHeight(x,z)-(h.entry.y-.035))>.04)return false;
   }
   return true;})()`),`house ${index+1}: safe portal disk including actor clearance`);
 }
});

test('every entrance is reachable through gates and return spawn can reach its entrance again',()=>{
 const {run}=createHarness();run('configureHousePortals();');
 for(let index=0;index<6;index++){
  assert(run(`(()=>{const h=housePortalConfigs[${index}],starts=[new THREE.Vector3(0,.3,21),new THREE.Vector3(h.yardSpawn.x,h.yardSpawn.y,h.yardSpawn.z)];
   for(const start of starts){const path=findPath(start,h.entry);if(!path.length)return false;
    let previous=start;for(const point of path){const n=Math.max(1,Math.ceil(previous.distanceTo(point)/.08));
     for(let i=1;i<=n;i++)if(!canWalk(previous.x+(point.x-previous.x)*i/n,previous.z+(point.z-previous.z)*i/n))return false;
     previous=point;
    }
    if(Math.hypot(previous.x-h.entry.x,previous.z-h.entry.z)>.001)return false;
   }
   return true;})()`),`house ${index+1}: both complete routes avoid every collider`);
 }
});

test('access paving does not bypass buildings, fences or unpaved pond areas',()=>{
 const {run}=createHarness();run('configureHousePortals();');
 assert(run('village.houses.every(h=>!canWalk(h.x,h.z)&&!canWalk(h.x,h.z+3.2)&&!canWalk(h.x+2,h.z+5.05)&&canWalk(h.x,h.z+5.05))'));
 assert(run('!canWalk(15,16)&&!canWalk(-17,19)&&!canWalk(NaN,0)&&!canWalk(0,Infinity)'));
 assert(run('houseAccessFloor(-11,14.4).y===.56&&houseAccessFloor(11,14.4).y===.36'));
 assert(run('reservedHouseAccess(-11,14.4,.3)&&reservedHouseAccess(11,14.4,.3)&&!reservedHouseAccess(0,0)'));
 assert.equal(run("regionTravel.current.root.children.filter(o=>o.name==='loi-di-truoc-nha').length"),6);
 run('configureHousePortals();');
 assert.equal(run("regionTravel.current.root.children.filter(o=>o.name==='loi-di-truoc-nha').length"),6,'reconfiguration must not duplicate paving');
});
