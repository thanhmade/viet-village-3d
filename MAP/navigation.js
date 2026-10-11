'use strict';
function bridgeHeight(x,z){const access=houseAccessFloor(x,z);if(access)return access.y;return Math.abs(z-18)<.95&&x>=9.2&&x<=20.8?.45+1.25*Math.sin(Math.PI*(x-9.2)/11.6):.3;}
function canWalk(x,z){
 if(!Number.isFinite(x)||!Number.isFinite(z)||Math.abs(x)>24.1||Math.abs(z)>26.1)return false;
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
 if(((x-p.x)/p.rx)**2+((z-p.z)/p.rz)**2<1.12&&!(Math.abs(z-18)<.8&&x>=8.3&&x<=21.7))return false;
 return true;
}
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
function minimap(){let ctx=$('minimap').getContext('2d');ctx.clearRect(0,0,200,200);ctx.fillStyle='#b4dbea';ctx.fillRect(0,0,200,200);ctx.fillStyle='#b4c487';ctx.fillRect(15,9,170,182);const point=(x,z)=>[100+x*3.15,100+z*3.15];ctx.fillStyle='#d2c6a6';ctx.fillRect(90,40,20,135);ctx.beginPath();ctx.arc(100,100,24,0,Math.PI*2);ctx.fill();for(let h of village.houses){let [x,y]=point(h.x,h.z);ctx.fillStyle='#b8673e';ctx.fillRect(x-10,y-7,20,14);}ctx.fillStyle='#ae603c';ctx.fillRect(80,28,40,19);ctx.fillRect(89,170,22,8);ctx.fillStyle='#668c45';ctx.fillRect(35,144,31,25);ctx.fillStyle='#55a6ac';ctx.beginPath();ctx.ellipse(147,157,20,14,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#b48e59';ctx.fillRect(129,153,37,5);ctx.fillStyle='#4e7734';ctx.beginPath();ctx.arc(100,100,11,0,Math.PI*2);ctx.fill();ctx.font='bold 11px system-ui';ctx.fillStyle='#365c50';ctx.fillText('N',96,10);
for(let g of gems){if(g.userData.taken)continue;let [x,y]=point(g.position.x,g.position.z);ctx.fillStyle='#007e70';ctx.fillRect(x-3,y-3,6,6);}let [px,py]=point(portal.position.x,portal.position.z);ctx.strokeStyle='#b47d20';ctx.lineWidth=2;ctx.strokeRect(px-5,py-5,10,10);let [x,y]=point(player.position.x,player.position.z);ctx.save();ctx.translate(x,y);ctx.rotate(-body.rotation.y+Math.PI);ctx.fillStyle='#183649';ctx.beginPath();ctx.moveTo(0,-6);ctx.lineTo(-4,5);ctx.lineTo(4,5);ctx.closePath();ctx.fill();ctx.restore();}
