/* Mưa Tên — host-clock rain, authored overhead draw, and contact-only gameplay.
 * The host selects eligible targets and applies consequences. Twelve projectiles
 * are identical at every quality level; the circle is a warning, not a damage tick. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory(require('./weapon-vfx-core.js'),require('./bow-skill-config.js'),require('./bow-piercing.js'));
  else root.BowRain=factory(root.WeaponVFXCore,root.BowSkillConfig,root.BowPiercing);
})(typeof globalThis!=='undefined'?globalThis:this,function(Core,Config,Piercing){
  'use strict';
  const id='bow.mua-ten',skill=Config.skills.find(s=>s.id===id),TAU=Math.PI*2,poseDuration=1.8,seedArrival=1.45,rainStart=1.6,flightSeconds=.86,projectileRadius=.12;
  const clamp=x=>Math.max(0,Math.min(1,x)),smooth=(a,b,t)=>{const k=clamp((t-a)/(b-a));return k*k*(3-2*k);};
  const shots=Object.freeze(Array.from({length:12},(_,i)=>Object.freeze({index:i,release:rainStart+i*.14,impact:rainStart+i*.14+flightSeconds,angle:i*2.3999632297,radius:i===0?0:skill.radius*.88*Math.sqrt(i/11)})));
  function sample(time){
    const t=Math.max(0,time),lift=smooth(0,.48,t)*(1-smooth(1.12,poseDuration,t));
    return {weight:smooth(0,.12,t)*(1-smooth(1.12,poseDuration,t)),draw:.42*smooth(.25,skill.activeAt,t)*(1-smooth(skill.activeAt,skill.activeAt+.09,t)),
      handX:-.12,handY:1.74+.44*lift,handZ:.48-.13*lift,pitch:-55*Math.PI/180*lift,yaw:0,arrowVisible:t<skill.activeAt||t>=poseDuration,
      phase:t<skill.activeAt?'Giương cung · Tụ lực':t<rainStart?'Gọi mưa tên':t<4.05?'Tên giáng · Phủ trận địa':t<skill.duration?'Tan trận · Dư quang':'Sẵn sàng'};
  }
  function authoredAnchor(T,origin,forward,handX=-.12){
    const pose=sample(skill.activeAt),right=new T.Vector3(forward.z,0,-forward.x),offset=new T.Vector3(0,.0245,.637).applyAxisAngle(new T.Vector3(1,0,0),pose.pitch);
    const palm=origin.clone().addScaledVector(right,handX).addScaledVector(forward,pose.handZ);palm.y+=pose.handY;
    const tip=palm.clone().addScaledVector(forward,offset.z);tip.y+=offset.y;
    const direction=forward.clone().multiplyScalar(Math.cos(pose.pitch));direction.y=-Math.sin(pose.pitch);
    return {palm,tip,direction};
  }
  // Exact AABB contact, then terrain bracket/refinement. The logical arrow tip
  // stops on the surface; target capsules have a separate 0.12 m sweep radius.
  function traceWorld(T,a,b,bounds=[],ground=null){
    const block=Piercing.traceWorld(T,a,b,0,bounds,null),delta=b.clone().sub(a),length=delta.length();
    if(length<1e-9)return block;let stop=block?.fraction??Infinity,kind=block?'wall':null;
    if(ground){
      const p=new T.Vector3(),gap=t=>{if(t===1)p.copy(b);else p.copy(a).addScaledVector(delta,t);const y=ground(p);if(!Number.isFinite(y))throw new TypeError('Mưa Tên needs finite terrain heights');return p.y-y;};
      let previous=0;const initialGap=gap(0);if(initialGap<=0&&stop>0){stop=0;kind='ground';}
      else {const steps=Math.max(1,Math.ceil(length/.1));for(let i=1;i<=steps;i++){const t=i/steps;if(previous>=stop)break;const current=gap(t);if(current<=0){let lo=previous,hi=t;for(let j=0;j<36;j++){const middle=(lo+hi)/2;if(gap(middle)>0)lo=middle;else hi=middle;}if(hi<stop){stop=hi;kind='ground';}break;}previous=t;}}
    }
    return Number.isFinite(stop)?{point:a.clone().addScaledVector(delta,stop),fraction:stop,kind}:null;
  }
  const vertex=`varying vec2 vUv;varying float vFade;
#ifdef USE_INSTANCING
attribute float instanceFade;
#endif
void main(){vUv=uv;vec4 p=vec4(position,1.);vFade=1.;
#ifdef USE_INSTANCING
p=instanceMatrix*p;vFade=instanceFade;
#endif
gl_Position=projectionMatrix*modelViewMatrix*p;}`;
  const beam=`varying vec2 vUv;varying float vFade;uniform float uOpacity;uniform vec3 uColor;
void main(){float e=max(0.,1.-abs(vUv.x-.5)*2.);float a=e*e*(1.-smoothstep(.08,1.,vUv.y))*uOpacity*vFade;gl_FragColor=vec4(uColor+vec3(pow(e,8.)*.28),a);
#include <colorspace_fragment>
}`;
  const star=`varying vec2 vUv;varying float vFade;uniform float uOpacity;uniform vec3 uColor;
void main(){vec2 p=vUv-.5;float r=length(p)*2.;float rays=pow(abs(cos(atan(p.y,p.x)*4.)),22.);float a=clamp(pow(max(0.,1.-r),3.)+.65*rays*(1.-r),0.,1.)*(1.-smoothstep(.8,1.,r))*uOpacity*vFade;gl_FragColor=vec4(uColor,a);
#include <colorspace_fragment>
}`;
  const sigil=`varying vec2 vUv;varying float vFade;uniform float uOpacity,uTime;uniform vec3 uColor;
float band(float r,float v,float w){return 1.-smoothstep(w,w*2.,abs(r-v));}
void main(){vec2 p=vUv*2.-1.;float r=length(p),a=atan(p.y,p.x);if(r>1.)discard;
float ring=band(r,.96,.006)+.5*band(r,.91,.004)+.65*band(r,.72,.005)+.45*band(r,.42,.005);
float marks=pow(max(0.,cos(a*24.+uTime*.18)),26.)*band(r,.835,.025);
float rays=pow(abs(cos(a*6.)),90.)*smoothstep(.43,.46,r)*(1.-smoothstep(.69,.72,r));
float haze=.045*pow(max(0.,1.-r),1.2);gl_FragColor=vec4(uColor,clamp(ring+marks+rays*.6+haze,0.,1.)*uOpacity*vFade);
#include <colorspace_fragment>
}`;
  const dust=`varying vec2 vUv;varying float vFade;uniform float uOpacity;uniform vec3 uColor;
void main(){vec2 p=(vUv-.5)*2.;float edge=max(0.,1.-dot(p,p));float w=.65+.35*sin(p.x*13.+sin(p.y*9.));float a=edge*edge*w*uOpacity*vFade;gl_FragColor=vec4(uColor,a);
#include <colorspace_fragment>
}`;
  function basic(core,fx,color){const m=new core.THREE.MeshBasicMaterial({color,transparent:true,opacity:1,blending:core.THREE.AdditiveBlending,depthWrite:false,toneMapped:false,side:core.THREE.DoubleSide});fx.materials.add(m);return m;}
  function shader(core,fx,color,fragment,additive=true){const T=core.THREE,m=new T.ShaderMaterial({uniforms:{uOpacity:{value:0},uTime:{value:0},uColor:{value:new T.Color(color)}},vertexShader:vertex,fragmentShader:fragment,transparent:true,blending:additive?T.AdditiveBlending:T.NormalBlending,depthWrite:false,toneMapped:false,side:T.DoubleSide});fx.materials.add(m);return m;}
  function mesh(core,fx,g,m,parent=fx.group){fx.geometries.add(g);fx.materials.add(m);const n=new core.THREE.Mesh(g,m);n.renderOrder=10;n.frustumCulled=false;parent.add(n);return n;}
  function instances(core,fx,g,m,count=12){const T=core.THREE;g.setAttribute('instanceFade',new T.InstancedBufferAttribute(new Float32Array(count),1));fx.geometries.add(g);fx.materials.add(m);const n=new T.InstancedMesh(g,m,count);n.instanceMatrix.setUsage(T.DynamicDrawUsage);n.frustumCulled=false;n.renderOrder=10;n.visible=false;fx.group.add(n);return n;}
  function cross(T,width,length=1,vertical=true){const positions=[],uv=[],indices=[];for(let k=0;k<3;k++){const a=k*Math.PI/3,x=Math.cos(a)*width,z=Math.sin(a)*width,j=k*4;positions.push(-x,0,-z,x,0,z,-x,length,-z,x,length,z);uv.push(0,0,1,0,0,1,1,1);indices.push(j,j+1,j+2,j+2,j+1,j+3);}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);if(!vertical)g.translate(0,-length/2,0);return g;}
  // width: half the band width; depth: how far the flat swirl's centre sinks (a shallow funnel reads from low cameras).
  function spiral(T,radius,turns,count,vertical=false,width=.018,depth=0){const p=[],uv=[],ix=[];for(let i=0;i<=count;i++){const u=i/count,a=u*TAU*turns;for(let edge=0;edge<2;edge++){const r=(vertical?radius:radius*(.12+.88*u))+(edge?1:-1)*width;p.push(Math.cos(a)*r,vertical?u:Math.sin(u*Math.PI)*.05-(1-u)*depth,Math.sin(a)*r);uv.push(edge,u);}if(i<count){const k=i*2;ix.push(k,k+1,k+2,k+2,k+1,k+3);}}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(ix);return g;}
  function contact(core,fx,f,point,at,kind,targetId=null){
    if(f.done||!fx.alive)return;f.done=true;f.contactTime=at;f.contactKind=kind;f.position.copy(point);
    core._emit('impact',fx,{kind:'rain-arrow',hitIndex:f.index,position:point.clone(),contactTime:at,contactKind:kind,targetId,shake:.012},'rain-contact:'+f.index);
    if(!fx.alive||fx.age-at>.5)return;
    for(let i=0;i<(core.quality==='low'?7:14);i++)core.pool.spawn(point,new core.THREE.Vector3((core.random()-.5)*4.2,.6+core.random()*3.5,(core.random()-.5)*4.2),i%4?'#ffc25b':'#78bdff',.45,.03,0,.9);
  }
  function targets(core,fx,f,a,z,atTime){
    let open=true,nearest=null;
    const query={type:'target-query',kind:'rain-arrow',skillId:id,weaponId:'bow',handle:fx.handle,caster:fx.caster,hitIndex:f.index,from:a.clone(),to:z.clone(),position:z.clone(),radius:projectileRadius,
      testTarget:(targetId,p,r=.25,height=2.2)=>{if(!open||!fx.alive||f.done||targetId==null)return false;const t=Piercing.targetFraction(a,z,p,projectileRadius+r,height);if(t===null)return false;const point=a.clone().lerp(z,t),along=point.clone().sub(f.from).dot(f.direction);
        if(along>=f.stopDistance-1e-7)return false;if(!nearest||t<nearest.t-1e-9||(Math.abs(t-nearest.t)<1e-9&&String(targetId)<String(nearest.id)))nearest={id:targetId,t,point};return false;}};
    try{core.onEvent?.(query);}finally{open=false;}if(!nearest||!fx.alive)return;
    let confirm=true,accepted=false;const event={...query,type:'hit-window',targetId:nearest.id,position:nearest.point.clone(),testTarget:(targetId,p,r=.25,height=2.2)=>{
      if(!confirm||accepted||!fx.alive||f.done||targetId!==nearest.id||Piercing.targetFraction(a,z,p,projectileRadius+r,height)===null)return false;accepted=true;return true;}};
    try{core.onEvent?.(event);}finally{confirm=false;}
    if(accepted&&fx.alive){const fraction=clamp(nearest.point.clone().sub(f.from).dot(f.direction)/f.length),at=f.release+Math.sqrt(fraction)*flightSeconds;contact(core,fx,f,nearest.point,Math.min(atTime,at),'target',nearest.id);}
  }
  function matrix(T,mesh,index,position,rotation,scale,fade=1){const m=mesh.userData.rainMatrix||(mesh.userData.rainMatrix=new T.Matrix4());m.compose(position,rotation,scale);mesh.setMatrixAt(index,m);mesh.geometry.attributes.instanceFade.setX(index,fade);}
  function flush(mesh,any=true){mesh.instanceMatrix.needsUpdate=true;mesh.geometry.attributes.instanceFade.needsUpdate=true;mesh.visible=any;if(mesh.material.uniforms)mesh.material.uniforms.uOpacity.value=1;}
  const effect={
    place(core,fx){fx.group.position.set(0,0,0);fx.group.quaternion.identity();},
    build(core,fx){
      const T=core.THREE,low=core.quality==='low',segments=low?32:64,origin=core._pose(fx.caster).p.clone(),center=fx.target.clone(),gold=basic(core,fx,'#ffd166'),white=basic(core,fx,'#fff2c4');
      const floorGeo=new T.PlaneGeometry(skill.radius*2,skill.radius*2,low?12:24,low?12:24);floorGeo.rotateX(-Math.PI/2);const p=floorGeo.attributes.position;for(let i=0;i<p.count;i++){const v=new T.Vector3(center.x+p.getX(i),0,center.z+p.getZ(i));p.setY(i,core._ground(v)-center.y+.035);}p.needsUpdate=true;
      const floorMaterial=shader(core,fx,'#ffc34d',sigil),floor=mesh(core,fx,floorGeo,floorMaterial);floor.position.copy(center);floor.visible=false;
      const sky=new T.Group(),halo=new T.Group(),charge=new T.Group();sky.name='mua-ten-sky-vortex';halo.name='mua-ten-calling-halo';fx.group.add(sky,halo,charge);sky.position.copy(center);sky.position.y+=8.2;sky.visible=halo.visible=charge.visible=false;
      const skyMaterial=shader(core,fx,'#71b8ff',beam),haloMaterial=shader(core,fx,'#ffd071',beam),skyBands=[];
      // GPU review: 3.6 cm bands at 8.2 m were sub-pixel; keep band/segment counts, widen the swirl.
      for(let i=0;i<(low?1:2);i++){const n=mesh(core,fx,spiral(T,skill.radius*.85,1.8,segments,false,.16,.6),skyMaterial,sky);n.rotation.y=i*Math.PI;skyBands.push(n);}
      for(const radius of [.45,.8]){const ring=mesh(core,fx,new T.TorusGeometry(radius,.026,6,48),haloMaterial,halo);ring.rotation.x=Math.PI/2;}
      const seed=new T.Group();seed.name='mua-ten-summoning-arrow';seed.visible=false;fx.group.add(seed);
      const shaftGeo=new T.CylinderGeometry(.018,.025,1.4,6);shaftGeo.translate(0,.8,0);const headGeo=new T.ConeGeometry(.085,.26,4);headGeo.rotateZ(Math.PI);headGeo.translate(0,.13,0);
      mesh(core,fx,shaftGeo,white,seed);mesh(core,fx,headGeo,gold,seed);const seedTrailMaterial=shader(core,fx,'#ffc558',beam),seedTrail=mesh(core,fx,cross(T,.12),seedTrailMaterial,seed);seedTrail.scale.y=2.6;
      const chargeMaterial=shader(core,fx,'#ffe09a',star),orb=mesh(core,fx,cross(T,.3,.6,false),chargeMaterial,charge);
      const shafts=instances(core,fx,shaftGeo.clone(),white),heads=instances(core,fx,headGeo.clone(),gold),tails=instances(core,fx,cross(T,.105),shader(core,fx,'#ffc553',beam)),qi=instances(core,fx,spiral(T,.10,2.3,low?16:32,true,.04),shader(core,fx,'#5daeff',beam));
      const flashes=instances(core,fx,cross(T,.6,1.2,false),shader(core,fx,'#ffe8ac',star)),dustClouds=instances(core,fx,cross(T,.55,.85,false),shader(core,fx,'#7e613b',dust,false));dustClouds.renderOrder=9;
      const rippleGeo=new T.RingGeometry(.86,1,32);rippleGeo.rotateX(-Math.PI/2);const ripples=instances(core,fx,rippleGeo,shader(core,fx,'#ffbd4d',beam));
      const b=fx.bow={actorOrigin:origin,handX:-.12,previous:0,center,floor,floorMaterial,sky,skyMaterial,halo,haloMaterial,charge,chargeMaterial,orb,seed,seedTrailMaterial,shafts,heads,tails,qi,flashes,dustClouds,ripples,seedReleased:false,seedBlocked:false,seedObstructed:false,seedStop:1,seedFrom:new T.Vector3(),seedTo:new T.Vector3(),seedDirection:new T.Vector3(),blockedAt:Infinity};
      b.arrows=shots.map(s=>{const offset=new T.Vector3(Math.sin(s.angle)*s.radius,0,Math.cos(s.angle)*s.radius).applyAxisAngle(new T.Vector3(0,1,0),Math.atan2(fx.direction.x,fx.direction.z));const end=center.clone().add(offset);end.y=core._ground(end);const from=end.clone().add(new T.Vector3(0,8.2,0)).addScaledVector(fx.direction,-.9);const direction=end.clone().sub(from).normalize();return {...s,from,end,direction,length:from.distanceTo(end),position:from.clone(),released:false,done:false,contactTime:-99,contactKind:null,stopDistance:Infinity,block:null};});
      fx.rain=b.arrows; // Inspection surface for the existing test/demo tooling.
    },
    tick(core,fx){
      const T=core.THREE,b=fx.bow,t=fx.age,previous=b.previous;b.previous=t;const pose=sample(t),unitY=new T.Vector3(0,1,0),down=new T.Vector3(0,-1,0),identity=new T.Quaternion();
      const trace=(a,z)=>b.trace?.(a,z,0)||traceWorld(T,a,z,[],p=>core._ground(p));
      if(t>=skill.activeAt&&!b.seedReleased){
        b.seedReleased=true;const anchor=authoredAnchor(T,b.actorOrigin,fx.direction,b.handX);b.seedFrom.copy(anchor.tip);b.seedDirection.copy(anchor.direction);b.seedTo.copy(anchor.tip).addScaledVector(anchor.direction,4);
        const block=trace(anchor.palm,b.seedTo);if(block){b.seedBlocked=true;b.seedStop=clamp(block.point.clone().sub(b.seedFrom).dot(b.seedDirection)/4);b.blockedAt=skill.activeAt+b.seedStop*(seedArrival-skill.activeAt);b.seedTo.copy(block.point);}
        core._emit('release',fx,{kind:'rain-seed',hitIndex:-1,position:b.seedFrom.clone(),direction:b.seedDirection.clone(),releaseTime:skill.activeAt},'rain-seed');
      }
      if(!fx.alive)return;
      if(b.seedBlocked&&t>=b.blockedAt&&!b.seedObstructed){b.seedObstructed=true;core._emit('cast-obstructed',fx,{kind:'rain-seed',position:b.seedTo.clone(),contactTime:b.blockedAt},'seed-obstructed');}
      if(!fx.alive)return;
      if(b.seedReleased&&!b.seedBlocked&&t>=seedArrival)core._emit('channel-open',fx,{kind:'rain-field',position:b.center.clone()},'rain-open');
      if(!fx.alive)return;
      const gate=b.seedBlocked?1-smooth(b.blockedAt,b.blockedAt+.3,t):1,fieldFade=(1-smooth(4.05,skill.duration,t))*gate;
      b.floor.visible=fieldFade>0&&t>.08;b.floorMaterial.uniforms.uOpacity.value=(.22+.5*smooth(1.35,2.4,t))*smooth(.08,.5,t)*fieldFade;b.floorMaterial.uniforms.uTime.value=t;
      b.sky.visible=!b.seedBlocked&&t>1.05&&fieldFade>0;b.skyMaterial.uniforms.uOpacity.value=.6*smooth(1.05,1.6,t)*fieldFade;b.sky.rotation.y=-t*.7;
      const haloAnchor=authoredAnchor(T,b.actorOrigin,fx.direction,b.handX);b.halo.position.copy(haloAnchor.tip).addScaledVector(haloAnchor.direction,4);b.halo.visible=t>.55&&t<2.15&&gate>0;b.halo.rotation.y=t*1.2;b.haloMaterial.uniforms.uOpacity.value=smooth(.55,1.3,t)*(1-smooth(1.65,2.15,t))*gate;
      b.charge.visible=t<skill.activeAt&&pose.weight>0;if(fx.weaponTip?.getWorldPosition)fx.weaponTip.getWorldPosition(b.charge.position);else b.charge.position.copy(haloAnchor.tip);b.charge.scale.setScalar(.3+pose.draw*1.8);b.chargeMaterial.uniforms.uOpacity.value=pose.draw/.42;
      const seedEnd=b.seedBlocked?b.blockedAt:seedArrival,seedProgress=clamp((t-skill.activeAt)/Math.max(1e-6,seedEnd-skill.activeAt));b.seed.visible=b.seedReleased&&t<seedEnd;b.seed.position.copy(b.seedFrom).lerp(b.seedTo,seedProgress);b.seed.quaternion.setFromUnitVectors(down,b.seedDirection.lengthSq()?b.seedDirection:unitY);b.seedTrailMaterial.uniforms.uOpacity.value=.9;
      let anyFlight=false,anyFlash=false,anyDust=false,anyRipple=false;
      for(const f of b.arrows){
        if(!fx.alive)return;
        if(!b.seedBlocked&&t>=f.release&&!f.released){f.released=true;f.block=trace(f.from,f.end);f.stopDistance=f.block?f.from.distanceTo(f.block.point):f.length;
          core._emit('release',fx,{kind:'rain-arrow',hitIndex:f.index,position:f.from.clone(),direction:f.direction.clone(),releaseTime:f.release},'rain-release:'+f.index);}
        if(!fx.alive)return;
        const p=clamp((t-f.release)/flightSeconds),old=clamp((previous-f.release)/flightSeconds),distance=p*p*f.length;
        if(f.released&&!f.done&&previous<f.impact){const lo=Math.min(f.stopDistance,old*old*f.length),hi=Math.min(f.stopDistance,distance),a=f.from.clone().addScaledVector(f.direction,lo),z=f.from.clone().addScaledVector(f.direction,hi);if(hi>=lo)targets(core,fx,f,a,z,t);
          if(!fx.alive)return;if(!f.done&&f.block&&distance>=f.stopDistance-1e-8){const at=f.release+Math.sqrt(clamp(f.stopDistance/f.length))*flightSeconds;contact(core,fx,f,f.block.point,at,f.block.kind||'wall');}}
        if(!fx.alive)return;
        const active=f.released&&!f.done&&t<f.impact;anyFlight||=active;if(!f.done)f.position.copy(f.from).addScaledVector(f.direction,Math.min(distance,f.stopDistance));
        const q=new T.Quaternion().setFromUnitVectors(down,f.direction),size=active?1:0,scale=new T.Vector3(size,size,size),tailScale=new T.Vector3(size,size*Math.min(3.5,.4+distance*.5),size);
        matrix(T,b.shafts,f.index,f.position,q,scale);matrix(T,b.heads,f.index,f.position,q,scale);matrix(T,b.tails,f.index,f.position,q,tailScale,active?1:0);matrix(T,b.qi,f.index,f.position,q,tailScale,active?.7:0);
        const age=t-f.contactTime,fade=f.done?1-smooth(0,.55,age):0,flash=fade>0&&age>=0,expand=.4+Math.max(0,age)*2.3;anyFlash||=flash;
        matrix(T,b.flashes,f.index,f.position,identity,new T.Vector3(expand,expand,expand),flash?fade:0);
        const terrain=f.done&&f.contactKind!=='target',dustFade=terrain?(1-smooth(.1,.65,age))*smooth(0,.06,age):0,rippleFade=terrain?1-smooth(0,.5,age):0;
        anyDust||=dustFade>0;anyRipple||=rippleFade>0;const smoke=f.position.clone();smoke.y+=.2+Math.max(0,age)*.6;
        matrix(T,b.dustClouds,f.index,smoke,identity,new T.Vector3(expand,expand,expand),dustFade*.25);
        const rp=f.position.clone();rp.y+=.025;matrix(T,b.ripples,f.index,rp,identity,new T.Vector3(expand,1,expand),Math.max(0,rippleFade)*.7);
      }
      for(const m of [b.shafts,b.heads,b.tails,b.qi])flush(m,anyFlight);flush(b.flashes,anyFlash);flush(b.dustClouds,anyDust);flush(b.ripples,anyRipple);
    }
  };
  Core.registerEffect(id,effect);
  return Object.freeze({skillId:id,poseDuration,releaseAt:skill.activeAt,seedArrival,rainStart,flightSeconds,projectileRadius,shots,sample,authoredAnchor,traceWorld,effect});
});
