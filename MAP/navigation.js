'use strict';
// Heights measured from the boxes in BUILDINGS/temple.js, in world coordinates.
function villageTempleFloor(x,z){
 if(Math.abs(x)<=5.55&&z>=-17.15&&z<=-15.6)return .915;
 if(Math.abs(x)<=4.15&&z>=-16.5&&z<=-15.5)return .695;
 if(Math.abs(x)<=4.30&&z>=-15.85&&z<=-14.85)return .545;
 if(Math.abs(x)<=4.45&&z>=-15.2&&z<=-14.2)return .395;
 return null;
}
function langVietGroundHeight(x,z){const templeFloor=villageTempleFloor(x,z);if(templeFloor!==null)return templeFloor;const access=houseAccessFloor(x,z);if(access)return access.y;return Math.abs(z-18)<.95&&x>=9.2&&x<=20.8?.45+1.25*Math.sin(Math.PI*(x-9.2)/11.6):.3;}
function langVietCanWalk(x,z){
 if(!Number.isFinite(x)||!Number.isFinite(z)||Math.abs(x)>24.1||Math.abs(z)>26.1)return false;
 if(window.VietVillageMapAssets?.canWalk(x,z)===false)return false;
 if(villageTempleFloor(x,z)!==null){
  // Open only the front porch/steps, never the hall walls or supporting columns.
  return ![-4.9,-2.5,0,2.5,4.9].some(column=>Math.hypot(x-column,z+16.3)<.43);
 }
 for(const h of village.houses){
  const dx=x-h.x,dz=z-h.z;
  if(Math.abs(dx)<3.47&&dz>-2.65&&dz<2.99)return false;
  if(Math.abs(dx)<1.01&&dz>=2.99&&dz<3.65)return false;
  if(Math.abs(Math.abs(dx)-3.8)<.20&&dz>-3.1&&dz<5.25)return false;
  if(Math.abs(dz+2.9)<.20&&Math.abs(dx)<4)return false;
  if(Math.abs(dz-5.05)<.20&&Math.abs(dx)>.67&&Math.abs(dx)<4)return false;
  if(Math.hypot(dx+3.48,dz-2.95)<.60||Math.hypot(dx-3.48,dz-3.35)<.45)return false;
 }
 if(houseAccessFloor(x,z))return true;
 if(obstacles.slice(6).some(o=>o.w?Math.abs(x-o.x)<o.w&&Math.abs(z-o.z)<o.d:Math.hypot(x-o.x,z-o.z)<o.r))return false;
 const p=village.pond;
 const importedWater=window.VietVillageMapAssets?.pondContainsWater(x,z);
 const inWater=importedWater==null?((x-p.x)/p.rx)**2+((z-p.z)/p.rz)**2<1.12:importedWater;
 if(inWater&&!(Math.abs(z-18)<.8&&x>=8.3&&x<=21.7))return false;
 return true;
}
function bridgeHeight(x,z){return window.VietVillageRegions?.current?.groundHeight(x,z)??langVietGroundHeight(x,z);}
function canWalk(x,z){const region=window.VietVillageRegions?.current;return region?region.canWalk(x,z):langVietCanWalk(x,z);}
// Calcul de chemin sur une grille pour contourner les maisons et le bassin.
function findPath(start,end){return findWalkPath(start,end,.5,canWalk,14000);}
function findRoomPath(start,end){return findWalkPath(start,end,.25,roomCanWalk,3000);}
function findWalkPath(start,end,step,walkable,limit){
 const round=p=>({x:Math.round((p.x-start.x)/step),z:Math.round((p.z-start.z)/step)}),s=round(start),e=round(end),key=p=>p.x+','+p.z;
 const segment=(a,b)=>{let n=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.08);for(let i=1;i<=n;i++)if(!walkable(a.x+(b.x-a.x)*i/n,a.z+(b.z-a.z)*i/n))return false;return true;};
 let queue=[s],seen=new Set([key(s)]),previous=new Map(),found=null;
 for(let n=0;n<queue.length&&n<limit;n++){
  let p=queue[n];if(p.x===e.x&&p.z===e.z){found=p;break;}
  for(let [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
   let q={x:p.x+dx,z:p.z+dz},k=key(q);
   if(!seen.has(k)&&segment({x:start.x+p.x*step,z:start.z+p.z*step},{x:start.x+q.x*step,z:start.z+q.z*step})){
    seen.add(k);previous.set(k,p);queue.push(q);
   }
  }
 }
 if(!found)return [];
 let path=[];while(key(found)!==key(s)){path.push(new THREE.Vector3(start.x+found.x*step,.3,start.z+found.z*step));found=previous.get(key(found));if(!found)return [];}
 path.reverse();
 if(path.length&&!segment(start,path[0]))return [];
 const tail=path.length?path[path.length-1]:start;
 if(!walkable(end.x,end.z)||!segment(tail,end))return [];
 path.push(new THREE.Vector3(end.x,.3,end.z));return path;
}
function minimap(){const regionId=window.VietVillageRegions?.currentId;if(regionId==='ngoai-lang-dong-tre'){dongTreMinimap();return;}if(regionId==='lang-tan-thu'){regionMinimap();return;}let ctx=$('minimap').getContext('2d');ctx.clearRect(0,0,200,200);ctx.fillStyle='#b4dbea';ctx.fillRect(0,0,200,200);ctx.fillStyle='#b4c487';ctx.fillRect(15,9,170,182);const point=(x,z)=>[100+x*3.15,100+z*3.15];ctx.fillStyle='#d2c6a6';ctx.fillRect(90,40,20,135);ctx.beginPath();ctx.arc(100,100,24,0,Math.PI*2);ctx.fill();for(let h of village.houses){let [x,y]=point(h.x,h.z);ctx.fillStyle='#b8673e';ctx.fillRect(x-10,y-7,20,14);}ctx.fillStyle='#ae603c';ctx.fillRect(80,28,40,19);ctx.fillRect(89,170,22,8);ctx.fillStyle='#668c45';ctx.fillRect(35,144,31,25);ctx.fillStyle='#55a6ac';ctx.beginPath();ctx.ellipse(147,157,20,14,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#b48e59';ctx.fillRect(129,153,37,5);ctx.fillStyle='#4e7734';ctx.beginPath();ctx.arc(100,100,11,0,Math.PI*2);ctx.fill();ctx.font='bold 11px system-ui';ctx.fillStyle='#365c50';ctx.fillText('N',96,10);
for(let g of gems){if(g.userData.taken)continue;let [x,y]=point(g.position.x,g.position.z);ctx.fillStyle='#007e70';ctx.fillRect(x-3,y-3,6,6);}let [px,py]=point(portal.position.x,portal.position.z);ctx.strokeStyle='#b47d20';ctx.lineWidth=2;ctx.strokeRect(px-5,py-5,10,10);window.VietVillageNPCs?.drawMinimapMarkers?.(ctx,point);let [x,y]=point(player.position.x,player.position.z);ctx.save();ctx.translate(x,y);ctx.rotate(-body.rotation.y+Math.PI);ctx.fillStyle='#183649';ctx.beginPath();ctx.moveTo(0,-6);ctx.lineTo(-4,5);ctx.lineTo(4,5);ctx.closePath();ctx.fill();ctx.restore();}

function regionMinimap(){
 const ctx=$('minimap').getContext('2d'),region=window.VietVillageRegions.current;
 ctx.clearRect(0,0,200,200);ctx.fillStyle='#91af66';ctx.fillRect(0,0,200,200);
 ctx.fillStyle='#c7ae76';ctx.fillRect(94,12,12,178);ctx.fillStyle='#59a8a5';ctx.fillRect(151,0,16,200);
 ctx.fillStyle='#bd9158';ctx.fillRect(148,120,27,9);
 for(const landmark of region.landmarks||[]){const p=landmark.position;if(!p)continue;ctx.fillStyle=landmark.type==='house'?'#ae7447':'#526f3a';ctx.fillRect(98+p.x*3,98+p.z*3,5,5);}
 ctx.fillStyle='#123e57';ctx.beginPath();ctx.arc(100+player.position.x*3,100+player.position.z*3,4,0,Math.PI*2);ctx.fill();
}

function dongTreMinimap(){
 const ctx=$('minimap').getContext('2d'),region=window.VietVillageRegions.current;
 const bounds=region.bounds||{minX:-25,maxX:25,minZ:-27,maxZ:27};
 const scale=Math.min(180/(bounds.maxX-bounds.minX),180/(bounds.maxZ-bounds.minZ));
 const centerX=(bounds.minX+bounds.maxX)/2,centerZ=(bounds.minZ+bounds.maxZ)/2;
 const point=(x,z)=>[100+(x-centerX)*scale,100+(z-centerZ)*scale];
 function rectangle(x,z,width,depth,color){const [px,py]=point(x-width/2,z-depth/2);ctx.fillStyle=color;ctx.fillRect(px,py,width*scale,depth*scale);}
 ctx.clearRect(0,0,200,200);ctx.fillStyle='#d7e5cf';ctx.fillRect(0,0,200,200);
 rectangle(centerX,centerZ,bounds.maxX-bounds.minX,bounds.maxZ-bounds.minZ,'#91ae69');
 // Đồng Tre has a stream across the map; the bridge connects the safe yard to its north bank.
 const landmarks=region.landmarks||[],stream=landmarks.find(item=>item.type==='stream'),bridge=landmarks.find(item=>item.type==='bridge');
 rectangle(0,0,2.6,48,'#cfb47a');
 rectangle(stream?.position?.x??centerX,stream?.position?.z??4,Math.min(stream?.width??50,bounds.maxX-bounds.minX),stream?.depth??5.4,'#60afb6');
 rectangle(bridge?.position?.x??0,bridge?.position?.z??4,bridge?.width??3.8,(bridge?.toZ??8)-(bridge?.fromZ??0),'#b98d57');
 // Draw the grove before its training marker so the clearing and marker stay visible.
 const mapLandmarks=landmarks.filter(item=>item.type==='bamboo').concat(landmarks.filter(item=>item.type!=='bamboo'));
 for(const landmark of mapLandmarks){
  const p=landmark.position;if(!p||!Number.isFinite(p.x)||!Number.isFinite(p.z))continue;
  const [x,y]=point(p.x,p.z),type=landmark.type||'',id=landmark.id||'';
  if(['bridge','water','stream','portal','fence'].includes(type))continue;
  if(type==='rice'||type==='field'||/rice|ruong/.test(id)){rectangle(p.x,p.z,landmark.width??7.2,landmark.depth??8,'#b6b754');continue;}
  if(type==='bamboo'||id==='bamboo-grove'||id==='luy-tre'){
   rectangle(p.x,p.z,landmark.width??12,landmark.depth??14,'#426f44');
   if(landmark.clearing){const c=landmark.clearing,[cx,cy]=point(c.x,c.z);ctx.fillStyle='#91ae69';ctx.beginPath();ctx.arc(cx,cy,c.radius*scale,0,Math.PI*2);ctx.fill();}
   continue;
  }
  if(['house','quest-station','healer-hut'].includes(type)){rectangle(p.x,p.z,landmark.width??4,landmark.depth??3,'#ae7347');continue;}
  if(type==='safe-zone')continue;
  ctx.fillStyle=type==='cave'?'#3c4140':type==='gate'?'#7d5f3f':type==='npc'||type==='training'?'#f7df88':'#527740';
  if(type==='cave'){ctx.beginPath();ctx.arc(x,y,5,0,Math.PI*2);ctx.fill();}
  else ctx.fillRect(x-3,y-3,6,6);
 }
 const portal=region.portal;
 if(portal&&Number.isFinite(portal.x)&&Number.isFinite(portal.z)){
  const [x,y]=point(portal.x,portal.z);ctx.strokeStyle='#087f88';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,4,0,Math.PI*2);ctx.stroke();
 }
 const [x,y]=point(player.position.x,player.position.z);ctx.save();ctx.translate(x,y);ctx.rotate(-body.rotation.y+Math.PI);
 ctx.fillStyle='#123e57';ctx.beginPath();ctx.moveTo(0,-6);ctx.lineTo(-4,5);ctx.lineTo(4,5);ctx.closePath();ctx.fill();ctx.restore();
 ctx.font='bold 10px system-ui';ctx.fillStyle='#244c39';ctx.fillText('N',7,12);ctx.fillText('Đồng Tre',7,196);
}
