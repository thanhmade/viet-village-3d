'use strict';
let regionTravel=null;

// All exteriors share the same scene, actor, controls, climate and renderer.
// A destination is built and validated before any visible/current state changes.
function initializeRegionTravel(){
 const villageRoot=new THREE.Group();villageRoot.name='region-lang-viet';
 for(const child of [...world.children])villageRoot.add(child);
 world.add(villageRoot);
 const first=window.createLangVietRegion({THREE,root:villageRoot,canWalk:langVietCanWalk,
  groundHeight:langVietGroundHeight,roofHeight:langVietRoofHeight,cameraBounds:travelCameraBounds,water});
 const regions=new Map([[first.id,first]]);
 const defaultSpawnId='village-entry';
 const destinations=Object.freeze([
  Object.freeze({id:'lang-viet',name:'Làng Việt',defaultSpawnId,spawnIds:Object.freeze([defaultSpawnId,'from-dong-tre'])}),
  Object.freeze({id:'lang-tan-thu',name:'Làng Tân Thủ',defaultSpawnId,spawnIds:Object.freeze([defaultSpawnId])}),
  Object.freeze({id:'ngoai-lang-dong-tre',name:'Ngoại ô Làng Việt – Đồng Tre',defaultSpawnId,spawnIds:Object.freeze([defaultSpawnId,'from-lang-viet'])})
 ]);
 const registrations=new Map(destinations.map(destination=>[destination.id,destination]));
 const factoryNames=new Map([['lang-tan-thu','createLangTanThuRegion'],['ngoai-lang-dong-tre','createDongTreRegion']]);
 let current=first,elapsed=0,armed=false,visiting=false,focused=true,lastMessage='',visitError='',manualArmed=false,manualError='',transitioning=false,preparing=false;
 const dwell=.8,visuals=new Map();
 const destinationId=()=>current.id==='lang-viet'?'lang-tan-thu':'lang-viet';
 const labelFor=id=>registrations.get(id)?.name||id;
 const interactionPortalsFor=region=>[...(region.manualPortals||[]),...(region.portal.activation==='interact'?[region.portal]:[])];
 const reach=portal=>portal.interactionRadius||portal.radius;
 // This visit latch is deliberately independent of reset(): overlays, focus changes
 // and closing the picker must never count as physically leaving the ring.
 let selectionArmed=false,menuRegion=null;
 const menu=$('regionDestinationMenu'),menuItems=new Map();
 menu.classList.add('hidden');
 const inSelectionRing=()=>current.portal.activation==='select'&&
  Math.hypot(player.position.x-current.portal.x,player.position.z-current.portal.z)<=current.portal.radius&&
  Math.abs(player.position.y-current.groundHeight(player.position.x,player.position.z))<.4;
 const isMenuOpen=()=>menuRegion!==null;
 function closeMenu({restoreFocus=true}={}){
  if(!isMenuOpen())return false;
  menuRegion=null;menu.close?.();menu.classList.add('hidden');clearMotion();
  if(restoreFocus){document.activeElement?.blur?.();$('view').focus?.({preventScroll:true});}
  return true;
 }
 function updateChoice(choice,access){
  const item=menuItems.get(choice.id);if(!item)return;
  if(['region/load-failed','region/transition-failed'].includes(access.code))item.loadError=access;
  if(access.ok&&item.loadError)access=item.loadError;
  const message=access.ok?'Sẵn sàng · Chọn để dịch chuyển':access.message;
  if(item.button.disabled===!access.ok&&item.reason.textContent===message)return;
  item.button.disabled=!access.ok;
  item.reason.textContent=message;
 }
 function chooseDestination(id){
  const choice=menuRegion===current&&current.portal.choices?.find(item=>item.id===id);
  if(!choice||!isMenuOpen()||!inSelectionRing())return {ok:false,code:'region/no-selection',message:'Hãy bước vào vòng DỊCH CHUYỂN để chọn nơi đến.'};
  // travelTo rechecks the same admission policy as the atlas and E gates, then
  // loads/validates the scene before committing. A failure leaves this menu open.
  const result=travelTo(choice.targetMapId,choice.targetSpawnId);
  if(result.ok)closeMenu();
  else{updateChoice(choice,result);$('regionDestinationMessage').textContent=result.message;toast(result.message);}
  return result;
 }
 function openMenu(){
  selectionArmed=false;menuRegion=current;clearMotion();resetHouseTravel();villageWeapons?.suspend();
  elapsed=0;drawProgress();showInteraction(null);statusText('');
  $('regionDestinationChoices').replaceChildren();menuItems.clear();$('regionDestinationMessage').textContent='';
  for(const choice of current.portal.choices){
   const row=document.createElement('div'),button=document.createElement('button'),reason=document.createElement('p');
   row.className='region-destination';button.type='button';button.id='regionDestination-'+choice.id;
   button.textContent='Đến '+choice.label;reason.id=button.id+'-reason';
   button.setAttribute?.('aria-describedby',reason.id);button.onclick=()=>chooseDestination(choice.id);
   row.append(button);row.append(reason);$('regionDestinationChoices').append(row);
   menuItems.set(choice.id,{button,reason});
   updateChoice(choice,checkTravelAccess(choice.targetMapId,choice.targetSpawnId,{loadDestination:true}));
  }
  menu.classList.remove('hidden');menu.showModal?.();$('closeRegionDestinationMenu').focus?.({preventScroll:true});
 }
 function canUsePortals(){return focused&&!document.hidden&&!!window.VietVillageAuth?.isAuthenticated()&&!insideHouse&&!overlays()&&world.visible&&!housePreview.visible&&gateView<0&&houseView<0&&(localWalking||multiplayerWalking||active);}
 function nearbyInteraction(){return interactionPortalsFor(current).find(p=>Math.hypot(player.position.x-p.x,player.position.z-p.z)<=reach(p)&&Math.abs(player.position.y-current.groundHeight(p.x,p.z))<.4)||null;}
 function showInteraction(portal){
  const button=$('regionInteractBtn');button.style.display=portal?'block':'none';button.disabled=!manualArmed;
  if(portal)button.textContent='E · Đến '+(portal.label||labelFor(portal.targetMapId));
 }
 function statusText(message){if(message!==lastMessage){$('regionTravelStatus').textContent=message;lastMessage=message;}}
 function makePortal(region,p=region.portal,extra=false){
  const manual=p.activation==='interact',selection=p.activation==='select',g=new THREE.Group();g.name='cong-vung-'+region.id+(extra?'-'+p.id:'');g.position.set(p.x,p.y,p.z);
  g.userData.activation=p.activation||'dwell';g.userData.portalId=p.id||'region-gate';
  const base=new THREE.Mesh(new THREE.RingGeometry(p.radius*.80,p.radius,64),new THREE.MeshBasicMaterial({color:0x32e4bf,side:THREE.DoubleSide,transparent:true,opacity:.72,depthWrite:false}));
  base.rotation.x=-Math.PI/2;g.add(base);
  const halo=new THREE.Mesh(new THREE.RingGeometry(p.radius,p.radius*1.15,64),new THREE.MeshBasicMaterial({color:0x59ffcf,side:THREE.DoubleSide,transparent:true,opacity:.18,depthWrite:false}));
  halo.rotation.x=-Math.PI/2;g.add(halo);
  const progressGeometry=new THREE.RingGeometry(p.radius*.82,p.radius*.98,64);
  const fullCount=progressGeometry.index.count;progressGeometry.setDrawRange(0,0);
  const progress=new THREE.Mesh(progressGeometry,new THREE.MeshBasicMaterial({color:0xffe9a6,side:THREE.DoubleSide,depthWrite:false}));
  progress.rotation.x=-Math.PI/2;progress.position.y=.012;g.add(progress);
  const arrowGeometry=new THREE.BufferGeometry().setFromPoints([
   new THREE.Vector3(-.32,.015,0),new THREE.Vector3(.32,.015,0),
   new THREE.Vector3(.32,.015,0),new THREE.Vector3(.08,.015,-.23),
   new THREE.Vector3(.32,.015,0),new THREE.Vector3(.08,.015,.23)]);
  g.add(new THREE.LineSegments(arrowGeometry,new THREE.LineBasicMaterial({color:0xe3fff5})));
  const canvas=document.createElement('canvas');canvas.width=640;canvas.height=112;
  const ctx=canvas.getContext('2d');ctx.fillStyle='rgba(12,47,40,.9)';ctx.fillRect(0,0,640,112);
  ctx.fillStyle='#b9ffe3';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold 30px sans-serif';
  ctx.fillText(selection?'DỊCH CHUYỂN':manual?'ĐẾN '+(p.label||labelFor(p.targetMapId)).toLocaleUpperCase('vi'):'VỀ LÀNG VIỆT',320,36);
  ctx.font='22px sans-serif';ctx.fillText(selection?'Bước vào vòng · Chọn nơi đến':manual?'Đến gần · Nhấn E để chuyển':'Đứng trong vòng 0,8 giây',320,82);
  const label=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(canvas),transparent:true,depthWrite:false}));
  label.scale.set(3.6,.63,1);label.position.set(0,1.75,0);g.add(label);
  region.root.add(g);visuals.set(extra?region.id+':'+p.id:region.id,{root:g,label,progressGeometry,fullCount,portal:p});
 }
 function drawProgress(){const visual=visuals.get(current.id);if(visual)visual.progressGeometry.setDrawRange(0,Math.floor(Math.min(1,elapsed/dwell)*64)*6);}
 function reset(){elapsed=0;armed=false;visiting=false;visitError='';manualArmed=false;manualError='';drawProgress();showInteraction(null);statusText('');}
 function validateSpawn(region,spawn){
  if(!spawn||![spawn.x,spawn.y,spawn.z].every(Number.isFinite))throw new Error('Tọa độ điểm xuất hiện không hợp lệ.');
  const floor=region.groundHeight(spawn.x,spawn.z);
  const portals=[region.portal,...(region.manualPortals||[])];
  if(!Number.isFinite(floor)||!region.canWalk(spawn.x,spawn.z)||portals.some(p=>Math.hypot(spawn.x-p.x,spawn.z-p.z)<=reach(p)+.4)||Math.abs(floor-spawn.y)>.12)throw new Error('Điểm xuất hiện không an toàn hoặc đang nằm trong vòng dịch chuyển.');
 }
 function validate(region){
  if(!region?.root?.isObject3D||!region.portal||!region.spawn||typeof region.canWalk!=='function'||typeof region.groundHeight!=='function'||typeof region.roofHeight!=='function')throw new Error('Cấu hình cảnh 3D chưa đầy đủ.');
  const p=region.portal;
  if(![p.x,p.y,p.z,p.radius].every(Number.isFinite)||p.radius<=0||!region.canWalk(p.x,p.z))throw new Error('Cổng MAP không an toàn.');
  validateSpawn(region,region.spawn);
  for(const spawnId of registrations.get(region.id)?.spawnIds||[]){
   if(!Object.hasOwn(region.spawns||{},spawnId))throw new Error('MAP thiếu điểm xuất hiện đã đăng ký: '+spawnId);
   validateSpawn(region,region.spawns[spawnId]);
  }
  for(let i=0;i<24;i++){const a=i*Math.PI/12;if(!region.canWalk(p.x+Math.cos(a)*p.radius,p.z+Math.sin(a)*p.radius))throw new Error('Vòng dịch chuyển đang đè lên vật cản.');}
  if(p.activation==='select'){
   const ids=new Set();
   if(!p.choices?.length)throw new Error('Vòng dịch chuyển chưa có nơi đến.');
   for(const choice of p.choices){
    if(!choice.id||ids.has(choice.id)||!registrations.get(choice.targetMapId)?.spawnIds.includes(choice.targetSpawnId))throw new Error('Vòng dịch chuyển có đích hoặc điểm xuất hiện chưa đăng ký.');
    ids.add(choice.id);
   }
  }
  for(const gate of interactionPortalsFor(region)){
   if(!registrations.get(gate.targetMapId)?.spawnIds.includes(gate.targetSpawnId)||![gate.x,gate.y,gate.z,gate.radius,reach(gate)].every(Number.isFinite)||gate.radius<=0||reach(gate)<gate.radius||!region.canWalk(gate.x,gate.z))throw new Error('Cổng nhấn E thiếu cấu hình đích hợp lệ.');
   for(let i=0;i<32;i++){const a=i*Math.PI/16;if(!region.canWalk(gate.x+Math.cos(a)*gate.radius,gate.z+Math.sin(a)*gate.radius))throw new Error('Cổng nhấn E đang đè lên vật cản.');}
  }
 }
 function prepare(id){
  if(!registrations.has(id))throw new Error('MAP không được đăng ký: '+id);
  if(regions.has(id))return regions.get(id);
  const factory=window[factoryNames.get(id)];
  if(typeof factory!=='function')throw new Error('Chưa tải được mã dựng MAP: '+id);
  let region;preparing=true;
  try{
   region=factory({THREE});
   if(region?.id!==id)throw new Error('Cảnh trả về không đúng MAP đã đăng ký.');
   validate(region);
   region.networkMapId=id;region.root.visible=false;
   for(const material of region.wetMaterials||[])material.userData.regionDryRoughness=material.roughness;
   makePortal(region);for(const p of region.manualPortals||[])makePortal(region,p,true);
   world.add(region.root);regions.set(id,region);return region;
  }catch(error){if(region){region.root?.removeFromParent();region.dispose?.();}throw error;}
  finally{preparing=false;}
 }
 function refreshUI(){
  $('regionName').textContent=current.name;
  const canTravel=!insideHouse;
  $('regionTravelBtn').disabled=!canTravel;
  $('regionTravelBtn').textContent=current.portal.activation==='select'?'⇄ Đi tới vòng dịch chuyển':'⇄ Đi tới cổng '+labelFor(destinationId());
  if(current.portal.activation==='interact')$('regionTravelBtn').textContent+=' · Nhấn E';
  $('dongTreTravelBtn').hidden=true;$('dongTreTravelBtn').disabled=!canTravel;
  $('houseBtn').disabled=insideHouse||current.id!=='lang-viet';
  $('enterHouseBtn').disabled=insideHouse||current.id!=='lang-viet';
  if(!insideHouse&&(localWalking||multiplayerWalking))$('helpText').textContent='WASD / mũi tên / cần điều khiển: đi bộ · Chạm đường để đi tới · '+(current.id==='ngoai-lang-dong-tre'?'Nhấn E gần cổng để về Làng Việt':current.id==='lang-tan-thu'?'Đứng trong vòng 0,8 giây để về Làng Việt · Nhà Tân Thủ: cảnh ngoại thất':'Bước vào vòng DỊCH CHUYỂN để chọn nơi đến · Vòng nhà: đứng 0,8 giây');
 }
 function updateEnvironment(dt,h){
  const night=houseNightLevel(h);
  for(const region of regions.values()){
   if(region.id==='lang-viet')continue;
   const visible=region===current&&world.visible&&!insideHouse;
   for(const material of region.lampGlowMaterials||[])material.emissiveIntensity=night*1.7;
   let lightsLeft=window.VillagePerformance?.policy?.houseLights??2;
   for(const light of region.lights||[]){light.visible=visible&&night>.002&&lightsLeft-->0;light.intensity=night*(light.userData.baseIntensity||12);light.castShadow=false;}
   for(const material of region.wetMaterials||[])material.roughness=material.userData.regionDryRoughness*(1-climate.wet*.42);
   for(const mesh of region.waterMeshes||[]){mesh.material.roughness=.23+climate.rain*.28;}
  }
 }
 function commit(destination,spawn=destination.spawn,beginWalking=false){
  if(transitioning||preparing)throw new Error('Đang chuyển MAP. Hãy chờ chuyển xong rồi thử lại.');
  const spawnId=Object.keys(destination.spawns||{}).find(id=>destination.spawns[id]===spawn)||defaultSpawnId;
  const access=checkTravelAccess(destination.id,spawnId);if(!access.ok)throw new Error(access.message);
  transitioning=true;
  try{
  validate(destination);validateSpawn(destination,spawn);
  const previous=current,position=player.position.clone(),oldCamera=camera.position.clone(),orientation=camera.quaternion.clone(),focus=sceneryFocus.clone(),bounds=travelCameraBounds;
  const view={world:world.visible,preview:housePreview.visible,player:player.visible,localWalking,multiplayerWalking,gateView,houseView,sceneryRadius,pitch,walkingClass:document.body.classList.contains('walking')};
  try{
   clearMotion();villageWeapons?.suspend();resetHouseTravel();
   previous.root.visible=false;destination.root.visible=true;current=destination;travelCameraBounds=destination.cameraBounds||[];
   if(beginWalking){
    if(!localWalking&&!multiplayerWalking){localWalking=true;sceneryRadius=8.5;pitch=.57;}
    world.visible=true;housePreview.visible=false;player.visible=true;gateView=-1;houseView=-1;document.body.classList.add('walking');
   }
   player.position.set(spawn.x,spawn.y,spawn.z);
   sceneryFocus.copy(player.position).add(new THREE.Vector3(0,1,0));
   camera.position.copy(villageWalkingCameraTarget(sceneryFocus));camera.lookAt(sceneryFocus);
   rebuildRainRoofCache();updateClimate(0,true);refreshUI();reset();
   selectionArmed=false;closeMenu();
   toast('Đã đến '+current.name+' · Nhân vật và trang bị được giữ nguyên.');
  }catch(error){
   destination.root.visible=false;previous.root.visible=true;current=previous;travelCameraBounds=bounds;
   world.visible=view.world;housePreview.visible=view.preview;player.visible=view.player;
   localWalking=view.localWalking;multiplayerWalking=view.multiplayerWalking;gateView=view.gateView;houseView=view.houseView;sceneryRadius=view.sceneryRadius;pitch=view.pitch;
   document.body.classList[view.walkingClass?'add':'remove']('walking');
   player.position.copy(position);camera.position.copy(oldCamera);camera.quaternion.copy(orientation);sceneryFocus.copy(focus);
   rebuildRainRoofCache();updateClimate(0,true);refreshUI();throw error;
  }
  }finally{transitioning=false;}
 }
 function travelError(mapId,spawnId){
  const registration=registrations.get(mapId);
  if(!registration)return {ok:false,code:'region/unknown-map',message:'MAP này chưa được đăng ký để dịch chuyển.'};
  if(!registration.spawnIds.includes(spawnId))return {ok:false,code:'region/unknown-spawn',message:'Điểm xuất hiện này chưa được đăng ký trong MAP.'};
  if(!window.VietVillageAuth?.isAuthenticated())return {ok:false,code:'region/auth-required',message:'Hãy đăng nhập để dịch chuyển.'};
  if(!gameInitialized||!$('home').classList.contains('hidden'))return {ok:false,code:'region/not-in-game',message:'Hãy vào game trước khi chọn MAP.'};
  if(insideHouse)return {ok:false,code:'region/inside-house',message:'Hãy ra sân trước khi chuyển sang MAP khác.'};
  if(!regions.has(mapId)&&typeof window[factoryNames.get(mapId)]!=='function')return {ok:false,code:'region/unavailable',message:'Chưa tải được mã dựng MAP đích.'};
  const loaded=regions.get(mapId);
  if(loaded){
   if(!Object.hasOwn(loaded.spawns||{},spawnId))return {ok:false,code:'region/unknown-spawn',message:'MAP không có điểm xuất hiện đã chọn.'};
   try{validateSpawn(loaded,loaded.spawns[spawnId]);}catch(error){return {ok:false,code:'region/unsafe-spawn',message:error.message};}
  }
  return null;
 }
 // Shared by atlas previews/activation, E/touch portals and direct travel calls.
 // Preview calls stay cheap; loadDestination validates the actual scene before entry.
 function checkTravelAccess(mapId,spawnId=defaultSpawnId,{loadDestination=false}={}){
  const error=travelError(mapId,spawnId);if(error)return error;
  const config=window.VietVillageRegionAccess;
  if(!config?.evaluate)return {ok:false,code:'region/access-unavailable',message:'Chưa tải được cấu hình điều kiện vào MAP.'};
  const eligibility=()=>config.evaluate({mapId,character:window.VietVillageJourney?.getState(),
   transitioning:transitioning||preparing||!!housePortalSystem?.status?.pending,mode:config.mode,policy:config.policies[mapId]});
  let result=eligibility();if(!result.ok)return result;
  if(loadDestination){
   try{const destination=prepare(mapId);validate(destination);validateSpawn(destination,destination.spawns[spawnId]);}
   catch(error){return {ok:false,code:'region/load-failed',message:'Chưa dựng được MAP đích. Bạn vẫn ở '+current.name+'. '+error.message};}
   // A loader may update character state. Do not commit based on an earlier snapshot.
   result=eligibility();if(!result.ok)return result;
  }
  return {...result,ready:regions.has(mapId),mapId,spawnId};
 }
 function canTravelTo(mapId,spawnId=defaultSpawnId){return checkTravelAccess(mapId,spawnId).ok;}
 function travelTo(mapId,spawnId=defaultSpawnId){
  const access=checkTravelAccess(mapId,spawnId,{loadDestination:true});if(!access.ok)return access;
  const destination=regions.get(mapId);
  try{
   commit(destination,destination.spawns[spawnId],true);
   return {ok:true,mapId:current.id,spawnId};
  }catch(error){return {ok:false,code:'region/transition-failed',message:'Không thể chuyển MAP. Bạn vẫn ở '+current.name+'. '+error.message};}
 }
 function interact({repeat=false}={}){
  if(repeat||!canUsePortals()||!manualArmed)return false;
  const portal=nearbyInteraction();if(!portal)return false;
  // A fresh explicit action consumes this visit. Repeated keys or touches never queue travel.
  manualArmed=false;clearMotion();showInteraction(portal);
  const result=travelTo(portal.targetMapId,portal.targetSpawnId);
  if(result.ok)return true;
  manualError=result.message;statusText(manualError);toast(manualError);return false;
 }
 function update(dt){
  const visual=visuals.get(current.id),distance=Math.hypot(player.position.x-current.portal.x,player.position.z-current.portal.z);
  // The HUD supplies the nearby label; a close billboard must not cover the actor.
  if(visual)visual.label.visible=current.portal.activation==='select'||!(localWalking||multiplayerWalking)||distance>5;
  for(const p of current.manualPortals||[]){const item=visuals.get(current.id+':'+p.id);if(item)item.label.visible=Math.hypot(player.position.x-p.x,player.position.z-p.z)>4;}
  if(isMenuOpen()){
   if(menuRegion!==current||!inSelectionRing()||!window.VietVillageAuth?.isAuthenticated()||insideHouse||!world.visible)closeMenu({restoreFocus:false});
   else{
    // Cheap checks keep buttons accurate if session/character state changes.
    // Do not retry failed loaders every animation frame.
    for(const choice of current.portal.choices)updateChoice(choice,checkTravelAccess(choice.targetMapId,choice.targetSpawnId));
    return;
   }
  }
  const enabled=canUsePortals();
  if(!enabled||!Number.isFinite(dt)||dt<0||dt>.25){reset();return;}
  if(current.portal.activation==='select'){
   elapsed=0;drawProgress();showInteraction(null);
   if(distance>current.portal.radius+.15){selectionArmed=true;statusText('');}
   else if(inSelectionRing()){
    if(selectionArmed)openMenu();
    else statusText('Rời vòng rồi bước vào lại để chọn nơi đến.');
   }
   return;
  }
  const interaction=nearbyInteraction();
  if(interaction){
   elapsed=0;visiting=false;drawProgress();showInteraction(interaction);
   const access=checkTravelAccess(interaction.targetMapId,interaction.targetSpawnId);
   statusText(manualError||(!access.ok?access.message:manualArmed?'Nhấn E hoặc chạm nút để đến '+(interaction.label||labelFor(interaction.targetMapId))+'.':'Rời cổng rồi tiến lại để chuyển MAP.'));return;
  }
  manualArmed=true;manualError='';showInteraction(null);
  // Manual gates never participate in the legacy dwell timer.
  if(current.portal.activation==='interact'){elapsed=0;visiting=false;drawProgress();statusText('');return;}
  const p=current.portal,inside=Math.hypot(player.position.x-p.x,player.position.z-p.z)<=p.radius&&Math.abs(player.position.y-current.groundHeight(p.x,p.z))<.4;
  if(!inside){elapsed=0;armed=true;visiting=false;visitError='';drawProgress();statusText('');return;}
  if(!armed){statusText(visitError||'Rời vòng rồi bước vào lại để dịch chuyển.');return;}
  try{
   const access=checkTravelAccess(destinationId());
   if(!access.ok){elapsed=0;visiting=false;drawProgress();statusText(access.message);return;}
   const destination=prepare(destinationId());
   // First observed frame establishes entry; it cannot count time spent outside.
   if(!visiting){visiting=true;elapsed=0;}else elapsed+=dt;
   drawProgress();statusText('Đến '+destination.name+' · '+Math.min(100,Math.floor(elapsed/dwell*100))+'%');
   if(elapsed+1e-8>=dwell)commit(destination);
  }catch(error){reset();visitError='Không thể chuyển MAP: '+error.message;statusText(visitError);toast('Không thể chuyển MAP. Bạn vẫn ở '+current.name+'. '+error.message);console.error('Region travel:',error);}
 }
 function approachPortal(){
  if(isMenuOpen())return false;
  if(current.portal.activation==='interact')return approachConnection(current.portal.id);
  if(insideHouse||!window.VietVillageAuth?.isAuthenticated())return false;
  if(current.portal.activation!=='select')try{prepare(destinationId());}catch(error){toast('Chưa dựng được MAP đích: '+error.message);return false;}
  if(!startRoaming())return false;
  const p=current.portal,s=current.spawn,inRing=Math.hypot(player.position.x-p.x,player.position.z-p.z)<=p.radius;
  waypoints=inRing?findPath(player.position,s).concat(findPath(s,p)):findPath(player.position,p);
  target=waypoints.shift()||null;
  toast(target?(p.activation==='select'?'Đi tới vòng DỊCH CHUYỂN · Chọn nơi đến khi bảng mở.':'Đi tới vòng '+labelFor(destinationId())+' · Đứng yên 0,8 giây.'):'Hãy đi bộ tới vòng xanh ở cổng làng.');return !!target;
 }
 function approachConnection(id){
  if(current.portal.activation==='select'&&current.portal.choices.some(choice=>choice.id===id))return approachPortal();
  if(insideHouse||!window.VietVillageAuth?.isAuthenticated())return false;
  const p=interactionPortalsFor(current).find(portal=>portal.id===id);if(!p)return false;
  try{prepare(p.targetMapId);}catch(error){toast('Chưa tải được MAP đích: '+error.message);return false;}
  if(!startRoaming())return false;
  const inRange=Math.hypot(player.position.x-p.x,player.position.z-p.z)<=reach(p),s=current.spawn;
  waypoints=inRange?findPath(player.position,s).concat(findPath(s,p)):findPath(player.position,p);
  target=waypoints.shift()||null;
  toast(target?'Đi tới cổng '+(p.label||labelFor(p.targetMapId))+' · Nhấn E khi đến gần.':'Hãy đi bộ tới cổng rồi nhấn E.');
  return !!target;
 }
 function showReferences(){
  const container=$('regionReferences');container.replaceChildren();
  $('regionReferenceTitle').textContent=current.name+' · Ảnh MAP đang mở';
  for(const ref of current.references||[]){const figure=document.createElement('figure'),img=document.createElement('img'),caption=document.createElement('figcaption');img.src=ref.path;img.alt=ref.label;img.loading='lazy';caption.textContent=ref.label;figure.append(img);figure.append(caption);container.append(figure);}
 }
 validate(first);makePortal(first);for(const p of first.manualPortals||[])makePortal(first,p,true);
 selectionArmed=!inSelectionRing();
 regionTravel=Object.freeze({get current(){return current;},get currentId(){return current.id;},get destinations(){return destinations;},get interactionPortals(){return interactionPortalsFor(current);},get status(){return {id:current.id,elapsed,armed,visiting,manualArmed,selectionArmed,menuOpen:isMenuOpen(),transitioning:transitioning||preparing,nearInteractionId:nearbyInteraction()?.id||null,loadedIds:[...regions.keys()]};},checkTravelAccess,canTravelTo,travelTo,prepare,update,reset,refreshUI,updateEnvironment,approachPortal,approachConnection,interact,showReferences,isMenuOpen,closeMenu,chooseDestination});
 window.VietVillageRegions=regionTravel;$('regionTravelBtn').onclick=()=>{const result=approachPortal();document.activeElement?.blur?.();return result;};
 $('dongTreTravelBtn').onclick=()=>{const result=approachConnection('dong-tre');document.activeElement?.blur?.();return result;};
 $('regionInteractBtn').onclick=()=>interact();
 for(const type of ['pointerdown','pointerup','click','touchstart'])$('regionInteractBtn').addEventListener(type,event=>event.stopPropagation(),{passive:true});
 $('closeRegionDestinationMenu').onclick=()=>closeMenu();
 menu.addEventListener('cancel',event=>{event.preventDefault();closeMenu();});
 menu.addEventListener('close',()=>closeMenu());
 menu.addEventListener('keydown',event=>{event.stopPropagation();if(event.key==='Escape'){event.preventDefault();closeMenu();}});
 for(const type of ['pointerdown','pointermove','pointerup','pointercancel','click','wheel','touchstart','touchmove','touchend'])menu.addEventListener(type,event=>event.stopPropagation(),{passive:true});
 refreshUI();
 addEventListener('blur',()=>{focused=false;reset();});addEventListener('focus',()=>{focused=true;});
 document.addEventListener('visibilitychange',reset);
}
