'use strict';
// Đèn nhà độc lập với hình học đã gộp: ô cửa phát sáng, đèn hắt hiên có suy giảm khoảng cách.
const villageLights=[];
function houseNightLevel(hour){const evening=THREE.MathUtils.smoothstep(hour,17.6,19),morning=1-THREE.MathUtils.smoothstep(hour,5,6.5);return hour<12?morning:evening;}
function createHouseLighting(parent,x,z,index){const root=new THREE.Group();root.name='anh-den-nha-'+index;root.position.set(x,parent===housePreview?0:.24,z);parent.add(root);const glowMat=new THREE.MeshStandardMaterial({color:0x4b3018,emissive:0xffb457,emissiveIntensity:0,roughness:.65});const panes=[];
function pane(w,h,x,y,z,rotation=0){const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),glowMat);m.position.set(x,y,z);m.rotation.y=rotation;m.castShadow=false;root.add(m);panes.push(m);}
for(let xx of [-2.04,2.04])pane(.91,1.10,xx,1.97,1.858);
for(let xx of [-1.80,1.80])pane(.91,1.10,xx,1.93,-2.138,Math.PI);
pane(.91,1.10,-3.238,1.93,-.12,-Math.PI/2);
for(let xx of [-.295,.295])pane(.43,.70,xx,2.16,1.932);
pane(.018,1.78,0,1.55,1.98);
const lamp=new THREE.SpotLight(0xffb866,0,8.3,Math.PI*.40,.72,2);lamp.position.set(0,2.55,2.08);lamp.target.position.set(0,.05,4.2);root.add(lamp,lamp.target);lamp.castShadow=false;lamp.shadow.mapSize.set(512,512);lamp.shadow.camera.near=.1;lamp.shadow.camera.far=9;lamp.shadow.bias=-.0004;lamp.shadow.normalBias=.025;
// Hai đèn dưới ô cửa tạo vệt sáng riêng, không rọi xuyên tường từ tâm nhà.
const windowLamps=[];for(let xx of [-2.04,2.04]){const light=new THREE.SpotLight(0xffc17a,0,4.8,Math.PI*.28,.85,2);light.position.set(xx,1.86,1.99);light.target.position.set(xx,.10,3.45);root.add(light,light.target);windowLamps.push(light);}
villageLights.push({root,glowMat,lamp,windowLamps,index,level:0,panes});}
function initHouseLights(){village.houses.forEach((h,i)=>createHouseLighting(world,h.x,h.z,i));createHouseLighting(housePreview,0,0,4);}
function updateHouseLights(dt,h,instant=false){const target=houseNightLevel(h),blend=instant?1:1-Math.exp(-dt*2.0);for(const item of villageLights){item.level+=(target-item.level)*blend;item.root.visible=item.level>.002;item.glowMat.emissiveIntensity=item.level*2.2;item.glowMat.color.setHex(item.level>.05?0xbf8645:0x4b3018);const visible=!insideHouse&&(item.root.parent===world?world.visible:housePreview.visible);item.lamp.intensity=visible?item.level*16:0;for(const light of item.windowLamps)light.intensity=visible?item.level*5:0;}
// Bóng đèn cục bộ ưu tiên nhà gần camera để giữ tốc độ trên điện thoại.
const candidates=villageLights.filter(item=>item.level>.01&&!insideHouse&&(item.root.parent===world?world.visible:housePreview.visible)).sort((a,b)=>a.root.getWorldPosition(new THREE.Vector3()).distanceToSquared(camera.position)-b.root.getWorldPosition(new THREE.Vector3()).distanceToSquared(camera.position));const count=innerWidth<800?1:2;for(const item of villageLights)item.lamp.castShadow=renderer.shadowMap.enabled&&candidates.indexOf(item)>=0&&candidates.indexOf(item)<count;
}

