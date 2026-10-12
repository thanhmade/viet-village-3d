'use strict';
// Nội thất là một không gian 3D độc lập, quy ước cửa chính ở +Z.
let interiorRoot,insideHouse=false,selectedHouse=4,outsideState=null,insideYaw=Math.PI,insidePitch=0,insidePosition=new THREE.Vector3(0,1.55,2.55),roomLight;
const roomBounds={width:8,depth:6,height:3.65};
const roomObstacles=[{x:-3.05,z:-.35,w:.62,d:1.08},{x:-3.08,z:1.82,w:.62,d:.55},{x:2.88,z:1.08,w:.80,d:1.40},{x:3.05,z:-1.92,w:.68,d:.65},{x:0,z:-1.98,w:.87,d:.50},{x:-1.4,z:-1.98,w:.34,d:.65},{x:1.4,z:-1.98,w:.34,d:.65}];
function woodGrain(w,h,x,y,z,parent){for(let i=0;i<7;i++)box(w*.95,.006,.008,i%2?0x745035:0xab7950,x,y-h*.42+i*h*.14,z,parent);}
function roomWindow(parent,x,z,rot){const g=new THREE.Group();g.position.set(x,2.0,z);g.rotation.y=rot;parent.add(g);for(let xx of [-.57,.57])box(.10,1.64,.18,0x735034,xx,0,0,g);for(let yy of [-.77,.77])box(1.24,.12,.21,0x8b623d,0,yy,0,g);for(let i=0;i<7;i++)box(.037,1.42,.07,0x89673f,-.48+i*.16,0,0,g);for(let j=0;j<9;j++)box(1.04,.035,.07,0x89673f,0,-.65+j*.1625,0,g);}
function wallWithOpenings(parent,length,openings,x,z,rot){const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=rot;parent.add(g);let start=-length/2;for(const o of openings.sort((a,b)=>a.x-b.x)){const left=o.x-o.w/2,right=o.x+o.w/2;if(left>start)box(left-start,3.65,.16,0xdcc6a4,(left+start)/2,1.825,0,g);if(o.bottom>0)box(o.w,o.bottom,.16,0xdcc6a4,o.x,o.bottom/2,0,g);const upper=3.65-o.top;if(upper>0)box(o.w,upper,.16,0xdcc6a4,o.x,o.top+upper/2,0,g);start=right;}if(start<length/2)box(length/2-start,3.65,.16,0xdcc6a4,(length/2+start)/2,1.825,0,g);box(length,.14,.20,0x6d4b30,0,.07,0,g);box(length,.24,.23,0x755032,0,3.53,0,g);}
function furnitureTable(x,z,w,d,h,parent){const g=new THREE.Group();g.position.set(x,0,z);parent.add(g);box(w,.12,d,0x90603b,0,h,0,g);for(let xx of [-w/2+.10,w/2-.10])for(let zz of [-d/2+.09,d/2-.09])box(.12,h,.12,0x704b2e,xx,h/2,zz,g);box(w-.16,.18,.10,0x7b5334,0,h-.18,d/2-.09,g);woodGrain(w,.085,0,h+.02,d/2+.005,g);return g;}
function buildInterior(){interiorRoot=new THREE.Group();interiorRoot.name='noi-that-nha-dan';scene.add(interiorRoot);const g=interiorRoot;
box(8.2,.16,6.2,0x9f9078,0,-.08,0,g);for(let i=0;i<16;i++)for(let j=0;j<12;j++)box(.485,.035,.485,[0xb3724a,0xa66340,0xbe7e56,0xab6946][(i*3+j)%4],-3.75+i*.5,.012,-2.75+j*.5,g);
const win=(x)=>({x,w:1.06,bottom:1.28,top:2.72});wallWithOpenings(g,8,[win(-1.75),win(1.75)],0,-3,0);wallWithOpenings(g,8,[win(-2.48),{x:0,w:1.65,bottom:0,top:2.8},win(2.48)],0,3,0);wallWithOpenings(g,6,[win(0)],-4,0,Math.PI/2);wallWithOpenings(g,6,[],4,0,Math.PI/2);
roomWindow(g,-1.75,-2.94,0);roomWindow(g,1.75,-2.94,0);roomWindow(g,-2.48,2.94,0);roomWindow(g,2.48,2.94,0);roomWindow(g,-3.94,0,Math.PI/2);
for(let xx of [-3.88,3.88])for(let zz of [-2.87,.1,2.87]){box(.20,3.67,.20,0x795331,xx,1.82,zz,g);woodGrain(.16,3.1,xx,1.8,zz+.11,g);}for(let zz of [-2.82,.05,2.82])box(7.85,.25,.24,0x725030,0,3.50,zz,g);
// Tường hồi và underside mái ngói, có xà và rui thật để nhìn lên.
for(let zz of [-3,3]){const geom=new THREE.BufferGeometry();geom.setAttribute('position',new THREE.Float32BufferAttribute([-4,3.65,zz,0,5.42,zz,4,3.65,zz],3));geom.computeVertexNormals();mesh(geom,0xd4bb95,0,0,0,g,{side:THREE.DoubleSide});}
for(let side of [-1,1]){let roof=box(4.42,.13,6.15,0x9e5d36,side*2,4.55,0,g);roof.rotation.z=-side*.418;for(let i=0;i<10;i++){let zz=-2.85+i*.63;between([0,5.37,zz],[side*4,3.59,zz],.062,0x6a472a,g);}for(let k=0;k<8;k++){let xx=side*(.22+k*.48),yy=5.4-Math.abs(xx)*.445;box(.055,.07,6.0,0x76502e,xx,yy-.04,0,g);}for(let k=0;k<8;k++)for(let j=0;j<13;j++){let xx=side*(.26+k*.48),yy=5.4-Math.abs(xx)*.445;let tile=box(.46,.045,.44,[0xb46e42,0xa85e33,0xbd7b48][(k+j)%3],xx,yy+.05,-2.82+j*.46,g);tile.rotation.z=-side*.418;}}
box(.14,.18,6.1,0x5d3e25,0,5.39,0,g);for(let zz of [-2.8,.0,2.8]){between([-3.85,3.59,zz],[0,5.35,zz],.11,0x76502e,g);between([0,5.35,zz],[3.85,3.59,zz],.11,0x76502e,g);box(.13,1.65,.16,0x6e492c,0,4.45,zz,g);}
// Cửa chính mở ra hiên, cửa phụ ở vách bên phải.
for(let xx of [-.92,.92])box(.14,2.95,.20,0x77502f,xx,1.47,3.0,g);box(2.0,.17,.25,0x8c6038,0,2.9,3,g);for(let side of [-1,1]){let leaf=new THREE.Group();leaf.position.set(side*.82,0,2.93);leaf.rotation.y=side*1.15;g.add(leaf);box(.79,2.68,.09,0x8e5c33,side*.40,1.34,0,leaf);for(let y of [.25,1.15,2.49])box(.73,.10,.035,0x614124,side*.4,y,-.06,leaf);woodGrain(.72,2.2,side*.4,1.34,-.055,leaf);}
const sideDoor=new THREE.Group();sideDoor.position.set(3.90,0,-.65);sideDoor.rotation.y=-Math.PI/2;g.add(sideDoor);box(.88,2.65,.08,0x875932,0,1.33,0,sideDoor);for(let xx of [-.5,.5])box(.10,2.85,.14,0x684729,xx,1.40,0,sideDoor);box(1.12,.12,.16,0x785030,0,2.80,0,sideDoor);for(let y of [.28,1.21,2.45])box(.80,.075,.10,0x614229,0,y,-.06,sideDoor);
// Bàn học + sách + bút + đèn, bên trái khi bước vào.
const desk=furnitureTable(-3.08,-.38,1.08,1.75,.93,g);box(.83,.18,.08,0x7a502e,0,.77,.86,desk);for(let zz of [-.37,0,.34])box(.19,.025,.24,0x3d3023,-.20,.99,zz,desk);for(let i=0;i<5;i++)box(.12,.32+i*.022,.25,[0x526045,0x716644,0x87744b][i%3],-.21+i*.13,1.18,-.53,desk);for(let j=0;j<3;j++)box(.38,.055,.30,j%2?0x6f6744:0xb7a17b,.20,1+j*.06,-.35,desk);cyl(.08,.10,.19,12,0x735031,.24,1.08,.28,desk);for(let i=0;i<4;i++)between([.24,1.15,.28],[.20+i*.025,1.43,.28],.008,0x4d3d24,desk);cyl(.025,.025,.46,8,0x3e3425,.05,1.22,.66,desk);cyl(.18,.18,.035,12,0x453528,.05,.99,.66,desk);mesh(new THREE.ConeGeometry(.21,.16,12,1,true),0x735130,.05,1.49,.66,desk,{side:THREE.DoubleSide});furnitureTable(-2.3,-.25,.46,.46,.47,g);
// Rương gỗ trước bàn học.
const chest=new THREE.Group();chest.position.set(-3.10,0,1.82);g.add(chest);box(1.05,.67,.86,0x8b5e38,0,.38,0,chest);box(1.12,.10,.92,0x704b2c,0,.77,0,chest);for(let xx of [-.45,.45])box(.075,.68,.92,0x644327,xx,.39,0,chest);woodGrain(1.0,.60,0,.38,.437,chest);let latch=mesh(new THREE.TorusGeometry(.052,.013,5,12),0x382f24,.0,.53,.46,chest);
// Giường gỗ ở bên phải, chăn sáng và gối xanh.
const bed=new THREE.Group();bed.position.set(2.84,0,1.02);g.add(bed);box(1.26,.23,2.25,0x754c2d,0,.43,0,bed);box(1.24,.18,2.16,0xdac9a7,0,.65,0,bed);for(let xx of [-.68,.68])for(let zz of [-1.18,1.18])box(.13,.90,.13,0x70492d,xx,.45,zz,bed);for(let zz of [-1.17,1.17])box(1.40,.20,.10,0x865630,0,.78,zz,bed);box(1.10,.04,1.20,0xe7d7b8,0,.755,.36,bed);box(.93,.13,.39,0x46675e,0,.83,-.76,bed);box(.44,.31,.035,0xe2cfaa,.32,.59,1.16,bed);for(let xx of [.15,.22])box(.016,.04,1.15,0xa49780,xx,.781,.35,bed);for(let i=0;i<14;i++)box(.013,.14,.013,0xdac8a6,.11+i*.031,.39,1.17,bed);
// Tủ áo, giỏ tre, tay nắm vòng.
const cabinet=new THREE.Group();cabinet.position.set(3.08,0,-1.94);g.add(cabinet);box(1.12,2.44,.95,0x704b2c,0,1.26,0,cabinet);box(1.24,.14,1.03,0x95663d,0,2.55,0,cabinet);for(let side of [-1,1]){box(.48,2.17,.07,0x865b34,side*.27,1.27,.50,cabinet);woodGrain(.44,1.92,side*.27,1.27,.542,cabinet);for(let yy of [.26,2.27])box(.45,.07,.04,0x5e4026,side*.27,yy,.55,cabinet);mesh(new THREE.TorusGeometry(.04,.01,4,10),0x342d20,side*.07,1.12,.57,cabinet);}cyl(.27,.23,.19,16,0x957541,0,2.73,0,cabinet);for(let j=0;j<4;j++){let r=mesh(new THREE.TorusGeometry(.26,.008,3,20),0x69522e,0,2.65+j*.045,0,cabinet);r.rotation.x=Math.PI/2;}
// Bàn trà, hai ghế dài, ấm chén và bình hoa.
const tea=furnitureTable(0,-1.99,1.62,.89,.68,g);furnitureTable(-1.4,-1.99,.45,1.1,.43,g);furnitureTable(1.4,-1.99,.45,1.1,.43,g);
let teapot=mesh(new THREE.SphereGeometry(.12,12,8),0x82552c,.13,.84,0,tea);teapot.scale.y=.78;cyl(.064,.084,.045,10,0x704522,.13,.965,0,tea);ball(.018,0x664222,.13,1.00,0,tea);between([.23,.85,0],[.35,.92,0],.027,0x956034,tea);mesh(new THREE.TorusGeometry(.073,.015,5,16),0x6e4626,.0,.87,0,tea);for(let xx of [-.32,.40]){cyl(.055,.035,.051,10,0x987042,xx,.78,.16,tea);let r=mesh(new THREE.TorusGeometry(.052,.009,4,12),0x614127,xx,.808,.16,tea);r.rotation.x=Math.PI/2;}
let vase=mesh(new THREE.SphereGeometry(.11,10,8),0x97744c,-.48,.85,-.15,tea);vase.scale.y=1.3;cyl(.046,.065,.09,9,0x9d7850,-.48,1.01,-.15,tea);for(let i=0;i<7;i++){let xx=-.48+Math.sin(i*2.4)*.16,zz=-.15+Math.cos(i*2.4)*.10;between([-.48,1.03,-.15],[xx,1.27+(i%3)*.07,zz],.004,0x6f7d3f,tea);ball(.022,0xe8d5a5,xx,1.27+(i%3)*.07,zz,tea);}
// Sân nhỏ phía ngoài cửa và cây xanh ngoài các ô cửa thật.
box(5,.11,2,0xb5ab91,0,-.02,4,g);for(let i=0;i<10;i++)for(let j=0;j<4;j++)box(.47,.015,.47,0xcac1a8,-2.25+i*.5,.045,3.15+j*.5,g);for(let side of [-1,1]){box(.20,3.4,.20,0x8e6236,side*1.3,1.7,4.1,g);for(let i=0;i<7;i++){let foliage=ball(.60,[0x6f924d,0x8ba45c,0x50753a][i%3],side*(4.6+Math.sin(i)*.6),1.6+(i%3)*.6,-2.5+i*.7,g);foliage.scale.y=.7;}}for(let xx of [-2.2,2.2])for(let i=0;i<5;i++)ball(.5,0x88a35b,xx+Math.sin(i)*.5,1.7+i*.28,-4.5,g);
// Bóng cửa sổ lấy từ đèn định hướng và hình học thực.
bakeStatic(g);roomLight=new THREE.PointLight(0xffd8a0,18,10,2);roomLight.position.set(0,3.1,.3);g.add(roomLight);g.visible=false;}
function enterHouse(index=4){
 if(insideHouse||window.VietVillageRegions&&window.VietVillageRegions.currentId!=='lang-viet')return;
 const house=housePortalConfigs[index],destination=house&&interiorPortalConfigs.get(house.interiorId);
 if(!destination||!interiorRoot)throw new Error('Nội thất chưa sẵn sàng');
 const spawn=destination.spawn;
 if(!roomCanWalk(spawn.x,spawn.z)||Math.hypot(spawn.x-destination.exit.x,spawn.z-destination.exit.z)<=destination.exit.radius+.25)throw new Error('Điểm xuất hiện trong nhà không an toàn');
 selectedHouse=index;
 outsideState={focus:sceneryFocus.clone(),radius:sceneryRadius,yaw,pitch,gateView,houseView,localWalking,multiplayerWalking,bodyYaw:body.rotation.y,
  worldVisible:world.visible,previewVisible:housePreview.visible,camera:camera.position.clone()};
 clearMotion();villageWeapons?.suspend();insideHouse=true;localWalking=false;multiplayerWalking=false;gateView=-1;
 world.visible=false;housePreview.visible=false;interiorRoot.visible=true;player.visible=false;
 player.position.set(spawn.x,spawn.y,spawn.z);insidePosition.copy(player.position).add(new THREE.Vector3(0,1.52,0));
 insideYaw=spawn.yaw;insidePitch=0;camera.position.copy(insidePosition);camera.fov=68;camera.updateProjectionMatrix();
 $('roomControls').classList.remove('hidden');$('roomTitle').textContent=house.id+' · Nội thất';
 $('entryLayer').style.display='none';$('houseBtn').disabled=true;$('gateBtn').disabled=true;
 $('walkBtn').disabled=true;$('enterHouseBtn').style.display='none';
 document.body.classList.add('inside');document.body.classList.remove('walking');
 $('helpText').textContent='Kéo để nhìn quanh · WASD / mũi tên / cần điều khiển để đi · Đứng trong vòng RA SÂN 0,8 giây';
 resetHouseTravel();window.VietVillageRegions?.reset();window.VietVillageRegions?.refreshUI();if(climateReady)updateClimate(0,true);
 updateInterior(0);toast('Đã vào '+house.id);
}
function leaveHouse(){
 if(!insideHouse)return;
 const house=validateYardDestination(housePortalConfigs[selectedHouse]);
 const spawn=house.yardSpawn;
 if(Math.hypot(spawn.x-house.entry.x,spawn.z-house.entry.z)<=house.entry.radius+.25)throw new Error('Điểm quay ra sân quá gần vòng');
 clearMotion();insideHouse=false;interiorRoot.visible=false;
 player.position.set(spawn.x,spawn.y,spawn.z);
 world.visible=outsideState.worldVisible;housePreview.visible=outsideState.previewVisible;
 sceneryFocus.copy(outsideState.focus);sceneryRadius=outsideState.radius;
 yaw=outsideState.yaw;pitch=outsideState.pitch;gateView=outsideState.gateView;houseView=outsideState.houseView;
 localWalking=outsideState.localWalking;multiplayerWalking=outsideState.multiplayerWalking;player.visible=localWalking||multiplayerWalking;body.rotation.y=outsideState.bodyYaw;
 camera.position.copy(outsideState.camera);camera.fov=48;camera.updateProjectionMatrix();
 if(localWalking||multiplayerWalking){
  sceneryFocus.copy(player.position).add(new THREE.Vector3(0,1,0));
  camera.position.copy(villageWalkingCameraTarget(sceneryFocus));
  camera.lookAt(sceneryFocus);document.body.classList.add('walking');
 }
 document.body.classList.remove('inside');
 $('roomControls').classList.add('hidden');$('entryLayer').style.display='block';
 $('houseBtn').disabled=false;$('gateBtn').disabled=false;$('walkBtn').disabled=false;$('enterHouseBtn').style.display='';
 $('helpText').textContent='WASD / mũi tên / cần điều khiển: đi bộ · Đứng trong vòng xanh 0,8 giây để vào nhà';
 resetHouseTravel();window.VietVillageRegions?.reset();window.VietVillageRegions?.refreshUI();if(climateReady)updateClimate(0,true);toast('Đã ra sân '+house.id);
}
function roomView(index){
 clearMotion();const positions=[[0,1.55,.55],[0,1.55,-.80],[-2,1.55,.70],[1.65,1.55,-.15]];
 insidePosition.set(...positions[index]);player.position.copy(insidePosition).y-=1.52;
 insideYaw=[Math.PI,0,-Math.PI/2,Math.PI/2][index];insidePitch=0;
 resetHouseTravel();
}
function roomCanWalk(x,z){return Number.isFinite(x)&&Number.isFinite(z)&&Math.abs(x)<3.70&&Math.abs(z)<2.72&&!roomObstacles.some(o=>Math.abs(x-o.x)<o.w+.13&&Math.abs(z-o.z)<o.d+.13);}
function updateInterior(dt){
 let ix=(keys.KeyD||keys.ArrowRight?1:0)-(keys.KeyA||keys.ArrowLeft?1:0)+joystick.x;
 let iz=(keys.KeyW||keys.ArrowUp?1:0)-(keys.KeyS||keys.ArrowDown?1:0)-joystick.y;
 let dx=0,dz=0,len=Math.hypot(ix,iz);
 if(len>.08){
  target=null;waypoints=[];
  dx=(-ix*Math.cos(insideYaw)+iz*Math.sin(insideYaw))/Math.max(1,len);
  dz=(ix*Math.sin(insideYaw)+iz*Math.cos(insideYaw))/Math.max(1,len);
 }else if(target){
  dx=target.x-insidePosition.x;dz=target.z-insidePosition.z;len=Math.hypot(dx,dz);
  if(len<.08){target=waypoints.shift()||null;dx=dz=0;}else{dx/=len;dz/=len;}
 }
 if(!overlays()){
  const step=Math.min(dt*1.7,len);
  if(roomCanWalk(insidePosition.x+dx*step,insidePosition.z))insidePosition.x+=dx*step;
  if(roomCanWalk(insidePosition.x,insidePosition.z+dz*step))insidePosition.z+=dz*step;
 }
 player.position.copy(insidePosition).y-=1.52;
 camera.position.copy(insidePosition);
 camera.lookAt(insidePosition.clone().add(new THREE.Vector3(Math.sin(insideYaw)*Math.cos(insidePitch),Math.sin(insidePitch),Math.cos(insideYaw)*Math.cos(insidePitch))));
}
function updateEntrances(){for(let i=0;i<village.houses.length;i++){const button=$('door-'+i);if(!button)continue;const h=village.houses[i],pos=new THREE.Vector3(h.x,1.5,h.z+4.4);let show=(!window.VietVillageRegions||window.VietVillageRegions.currentId==='lang-viet')&&!insideHouse&&!localWalking&&!multiplayerWalking&&!overlays()&&(world.visible||housePreview.visible&&i===4)&&gateView<0&&camera.position.z>h.z+1.8;pos.project(camera);show=show&&pos.z>=-1&&pos.z<=1&&Math.abs(pos.x)<.95&&Math.abs(pos.y)<.88;button.style.display=show?'block':'none';if(show){button.style.left=(pos.x*.5+.5)*innerWidth+'px';button.style.top=(-pos.y*.5+.5)*innerHeight+'px';}}}
function bindInterior(){buildInterior();const layer=$('entryLayer');for(let i=0;i<6;i++){let b=document.createElement('button');b.id='door-'+i;b.className='entryMarker';b.textContent='↳ Đi tới nhà '+(i+1);b.onclick=()=>approachHouse(i);layer.append(b);} $('enterHouseBtn').onclick=()=>housePreview.visible?enterHouse(4):approachHouse(4);$('leaveHouseBtn').onclick=()=>outsideState?.previewVisible?leaveHouse():approachRoomExit();for(let i=0;i<4;i++)$('roomView'+i).onclick=()=>roomView(i);for(const [id,key] of [['roomForward','KeyW'],['roomBack','KeyS'],['roomLeft','KeyA'],['roomRight','KeyD']]){let b=$(id);b.onpointerdown=e=>{if(!insideHouse)return;e.preventDefault();b.setPointerCapture?.(e.pointerId);keys[key]=true;};b.onpointerup=b.onpointercancel=()=>keys[key]=false;}for(let id of ['overviewBtn','cameraBtn']){const old=$(id).onclick;$(id).onclick=()=>{leaveHouse();old();};}addEventListener('keydown',e=>{if(insideHouse&&e.code==='Escape')leaveHouse();});}

