(function(global){
 'use strict';
 // The actor owns physics; a GLB supplies only the pose. All dimensions are metres.
 global.createVillagePlayerMotion=function({position,body,surfaceAt,contextKey=()=>'',gravity=18,jumpSpeed=6.4}){
  // Highest walkable rise in the maps is the west house access floor (0.30 → 0.56 m);
  // the lowest jump-only support (bamboo basket) is 0.53 m above its ground.
  const STEP=.3,EPS=.002;
  let vx=0,vz=0,vy=0,airborne=false,disposed=false,key=contextKey();
  const previous={x:position.x,y:position.y,z:position.z};
  function remember(){Object.assign(previous,{x:position.x,y:position.y,z:position.z});}
  function stop(){vx=vz=0;}
  function reset(){stop();vy=0;airborne=false;key=contextKey();const floor=surfaceAt(position.x,position.z);if(Number.isFinite(floor))position.y=floor;remember();}
  function sync(){if(key!==contextKey()||Math.hypot(position.x-previous.x,position.y-previous.y,position.z-previous.z)>.001)reset();}
  function jump(){
   if(disposed)return false;sync();const floor=surfaceAt(position.x,position.z);
   if(airborne||!Number.isFinite(floor)||Math.abs(position.y-floor)>.03)return false;
   vy=jumpSpeed;airborne=true;return true;
  }
  function step(dt,{x=0,z=0,speed=0,enabled=true}={}){
   if(disposed||!Number.isFinite(dt)||dt<=0)return {speed:0,distance:0};sync();
   dt=Math.min(dt,.1);const startX=position.x,startZ=position.z;
   const len=Math.hypot(x,z),strength=Math.min(1,len);
   const tx=enabled&&len>.08?x/len*speed*strength:0,tz=enabled&&len>.08?z/len*speed*strength:0;
   if(!enabled)stop();
   // Small swept steps cannot tunnel through a thin fence on a slow frame.
   const count=Math.ceil(dt/(1/120)),h=dt/count;
   for(let i=0;i<count;i++){
    const rate=tx||tz?14:22,decay=Math.exp(-rate*h),gain=(1-decay)/rate;
    const dx=tx*h+(vx-tx)*gain,dz=tz*h+(vz-tz)*gain;
    vx=tx+(vx-tx)*decay;vz=tz+(vz-tz)*decay;
    const floor=surfaceAt(position.x,position.z);
    if(!airborne&&Number.isFinite(floor)&&position.y-floor>STEP)airborne=true;
    if(airborne){position.y+=vy*h-gravity*h*h/2;vy-=gravity*h;}
    const oldX=position.x,oldZ=position.z;
    const reachable=(nx,nz)=>{const top=surfaceAt(nx,nz);return Number.isFinite(top)&&top<=position.y+(airborne?EPS:STEP);};
    if(reachable(oldX+dx,oldZ+dz)){position.x+=dx;position.z+=dz;}
    else if(reachable(oldX+dx,oldZ)){position.x+=dx;vz=0;}
    else if(reachable(oldX,oldZ+dz)){position.z+=dz;vx=0;}
    else stop();
    const support=surfaceAt(position.x,position.z);
    if(Number.isFinite(support)){
     if(airborne&&vy<=0&&position.y<=support+EPS){position.y=support;vy=0;airborne=false;}
     else if(!airborne){if(position.y-support<=STEP)position.y=support;else airborne=true;}
    }
    const movedX=position.x-oldX,movedZ=position.z-oldZ;
    if(Math.hypot(movedX,movedZ)>.00001){const desired=Math.atan2(movedX,movedZ),angle=Math.atan2(Math.sin(desired-body.rotation.y),Math.cos(desired-body.rotation.y));body.rotation.y+=angle*(1-Math.exp(-12*h));}
   }
   remember();const distance=Math.hypot(position.x-startX,position.z-startZ);
   return {speed:distance/dt,distance};
  }
  return Object.freeze({step,jump,stop,reset,get airborne(){return airborne;},get jumpDuration(){return 2*jumpSpeed/gravity;},
   get state(){return {vx,vz,vy,airborne};},dispose(){reset();disposed=true;}});
 };
})(window);
