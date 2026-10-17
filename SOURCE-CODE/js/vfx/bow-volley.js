/* Liên Tiễn: three authored releases, swept fan projectiles and contact-only VFX.
 * The host owns time, movement, target eligibility and gameplay consequences.
 * target-query collects candidates without applying a hit; hit-window confirms
 * only the nearest candidate. A projectile stops at its first target or wall. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory(require('./weapon-vfx-core.js'),require('./bow-skill-config.js'),require('./bow-piercing.js'));
  else root.BowVolley=factory(root.WeaponVFXCore,root.BowSkillConfig,root.BowPiercing);
})(typeof globalThis!=='undefined'?globalThis:this,function(Core,Config,Piercing){
  'use strict';
  const id='bow.lien-tien',skill=Config.skills.find(s=>s.id===id),poseDuration=.9,TAU=Math.PI*2;
  const clamp=x=>Math.max(0,Math.min(1,x)),smooth=(a,b,t)=>{const k=clamp((t-a)/(b-a));return k*k*(3-2*k);};
  // Keep the existing three launch/arrival times and the existing fan width.
  const angle=Math.atan2(Math.min(1.1,skill.range*.09),skill.range);
  const shots=Object.freeze([0,1,2].map(i=>Object.freeze({index:i,release:skill.activeAt+i*.12,end:skill.activeEnd-(2-i)*.12,yaw:(1-i)*angle})));
  function sample(time){
    const t=Math.max(0,time),next=shots.find(s=>t<=s.release),last=shots.filter(s=>s.release<t).at(-1);
    let draw=0,arrowVisible=false,yaw=shots[0].yaw;
    if(next){
      const reload=last?last.release+.035:0;
      draw=last&&t<reload?.42*(1-smooth(last.release,reload,t)):.42*smooth(reload,next.release,t);
      arrowVisible=t>=reload&&t<next.release;
      yaw=last?last.yaw+(next.yaw-last.yaw)*smooth(last.release+.025,next.release,t):next.yaw;
    }else{draw=.42*(1-smooth(shots[2].release,shots[2].release+.035,t));yaw=shots[2].yaw*(1-smooth(.62,poseDuration,t));}
    return {weight:smooth(0,.08,t)*(1-smooth(.62,poseDuration,t)),draw,arrowVisible:arrowVisible||t>=poseDuration,
      handX:-.12,handY:1.74,handZ:.48,yaw,
      phase:t<shots[0].release?'Tụ lực':t<=shots[2].release?'Liên tiễn':t<skill.activeEnd?'Tỏa tiễn':t<skill.duration?'Tan khí':'Sẵn sàng'};
  }
  function shotDirection(T,forward,index){return forward.clone().applyAxisAngle(new T.Vector3(0,1,0),shots[index].yaw).normalize();}
  function releaseAnchor(T,origin,forward,index,handX=-.12){
    const direction=shotDirection(T,forward,index),right=new T.Vector3(direction.z,0,-direction.x);
    return origin.clone().addScaledVector(direction,1.117).addScaledVector(right,handX).add(new T.Vector3(0,1.7645,0));
  }
  const vertex='varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}';
  const beam='varying vec2 vUv;uniform float uOpacity;void main(){float e=clamp(1.-abs(vUv.x-.5)*2.,0.,1.);float a=e*e*(1.-smoothstep(.12,1.,vUv.y))*uOpacity;gl_FragColor=vec4(mix(vec3(1.,.42,.035),vec3(1.,.98,.81),pow(e,5.)),a);\n#include <colorspace_fragment>\n}';
  const star='varying vec2 vUv;uniform float uOpacity;void main(){vec2 p=vUv-.5;float r=length(p)*2.;float ray=pow(abs(cos(atan(p.y,p.x)*4.)),24.);float a=clamp(pow(max(0.,1.-r),3.)+.75*ray*(1.-r),0.,1.)*(1.-smoothstep(.84,1.,r))*uOpacity;gl_FragColor=vec4(1.,.79,.29,a);\n#include <colorspace_fragment>\n}';
  function basic(core,fx,color,opacity=1){const m=new core.THREE.MeshBasicMaterial({color,transparent:true,opacity,side:core.THREE.DoubleSide,depthWrite:false,toneMapped:false,blending:core.THREE.AdditiveBlending});fx.materials.add(m);return m;}
  function shader(core,fx,fragment){const m=new core.THREE.ShaderMaterial({uniforms:{uOpacity:{value:0}},vertexShader:vertex,fragmentShader:fragment,transparent:true,depthWrite:false,toneMapped:false,side:core.THREE.DoubleSide,blending:core.THREE.AdditiveBlending});fx.materials.add(m);return m;}
  function mesh(core,fx,geometry,material,parent){fx.geometries.add(geometry);fx.materials.add(material);const m=new core.THREE.Mesh(geometry,material);m.renderOrder=10;m.frustumCulled=false;parent.add(m);return m;}
  function strip(T,width){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute([-width,0,0,width,0,0,-width,0,1,width,0,1],3));g.setAttribute('uv',new T.Float32BufferAttribute([0,0,1,0,0,1,1,1],2));g.setIndex([0,1,2,2,1,3]);return g;}
  function ribbon(T,count){const g=new T.BufferGeometry(),uv=[],ix=[];g.setAttribute('position',new T.Float32BufferAttribute(new Float32Array((count+1)*6),3));for(let i=0;i<=count;i++){uv.push(0,i/count,1,i/count);if(i<count){const k=i*2;ix.push(k,k+1,k+2,k+2,k+1,k+3);}}g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(ix);return g;}
  function flash(core,fx,size){const T=core.THREE,group=new T.Group(),material=shader(core,fx,star);fx.group.add(group);group.visible=false;for(let i=0;i<3;i++){const m=mesh(core,fx,new T.PlaneGeometry(size,size),material,group);m.rotation.set(i===1?Math.PI/2:0,i===2?Math.PI/2:0,0);}return {group,material};}
  function impact(core,fx,f,point,at,kind,targetId=null){
    if(f.done)return;f.done=true;f.contactTime=at;f.hitPoint=point.clone();f.flight.visible=false;
    core._emit('impact',fx,{kind:'volley-arrow',hitIndex:f.index,position:point.clone(),contactTime:at,contactKind:kind,targetId,shake:.018},'volley-impact:'+f.index);
    if(!fx.alive||fx.age-at>.30)return;
    f.impact.group.position.copy(point);
    for(let i=0;i<(core.quality==='low'?6:10);i++)core.pool.spawn(point,new core.THREE.Vector3((core.random()-.5)*4.5,(core.random()-.2)*3.5,(core.random()-.5)*4.5),i%3?'#ffd071':'#73bdff',.26,.025,0,.85);
  }
  function resolveTargets(core,fx,f,a,z,atTime){
    let accepting=true,nearest=null;
    const query={type:'target-query',kind:'volley-arrow',skillId:id,weaponId:'bow',handle:fx.handle,caster:fx.caster,hitIndex:f.index,from:a.clone(),to:z.clone(),position:z.clone(),radius:fx.skill.radius,
      testTarget:(targetId,p,r=.25,height=2.2)=>{
        if(!accepting||!fx.alive||f.done||targetId==null)return false;
        const fraction=Piercing.targetFraction(a,z,p,fx.skill.radius+r,height);if(fraction===null)return false;
        const point=a.clone().lerp(z,fraction),distance=point.clone().sub(f.eye).dot(f.direction);
        if(f.wall&&distance>=f.wallDistance-1e-6)return false;
        if(!nearest||fraction<nearest.fraction-1e-9||(Math.abs(fraction-nearest.fraction)<1e-9&&String(targetId)<String(nearest.id)))nearest={id:targetId,fraction,point};
        return false; // A query must never grant progress or damage.
      }};
    try{core.onEvent?.(query);}finally{accepting=false;}
    if(!nearest||!fx.alive)return;
    let confirming=true,confirmed=false;
    const event={...query,type:'hit-window',targetId:nearest.id,position:nearest.point.clone(),
      testTarget:(targetId,p,r=.25,height=2.2)=>{
        if(!confirming||confirmed||!fx.alive||f.done||targetId!==nearest.id||Piercing.targetFraction(a,z,p,fx.skill.radius+r,height)===null)return false;
        confirmed=true;return true;
      }};
    try{core.onEvent?.(event);}finally{confirming=false;}
    if(confirmed&&fx.alive){const distance=nearest.point.clone().sub(f.start).dot(f.direction),at=f.release+Math.max(0,distance)/f.length*(f.end-f.release);impact(core,fx,f,nearest.point,Math.min(atTime,at),'target',nearest.id);}
  }
  const effect={
    place(core,fx){fx.group.position.set(0,0,0);fx.group.quaternion.identity();},
    build(core,fx){
      const T=core.THREE,low=core.quality==='low',count=low?24:48,charge=new T.Group(),aura=new T.Group();fx.group.add(charge,aura);
      charge.name='lien-tien-charge';aura.name='lien-tien-gathering-qi';charge.visible=false;aura.visible=false;
      const gold=basic(core,fx,'#ffc85a'),bright=basic(core,fx,'#fff6d7'),orb=mesh(core,fx,new T.SphereGeometry(.075,12,8),bright,charge),ring=mesh(core,fx,new T.TorusGeometry(.28,.009,6,36),gold,charge),bands=[];
      for(let j=0;j<(low?1:2);j++){const g=ribbon(T,count),p=g.attributes.position,m=basic(core,fx,j?'#559dff':'#ffc45d',.28);for(let i=0;i<=count;i++){const u=i/count,angle=u*TAU*1.7+j*Math.PI;for(let e=0;e<2;e++){const radius=.58+Math.sin(u*Math.PI)*.15+(e?1:-1)*.012;p.setXYZ(i*2+e,Math.cos(angle)*radius,.6+u*1.5,Math.sin(angle)*radius);}}bands.push(mesh(core,fx,g,m,aura));}
      const arrows=shots.map(shot=>{
        const flight=new T.Group();flight.name='lien-tien-arrow-'+shot.index;fx.group.add(flight);flight.visible=false;
        const shaft=mesh(core,fx,new T.CylinderGeometry(.014,.022,1.5,6),bright,flight);shaft.rotation.x=Math.PI/2;shaft.position.z=.75;
        const head=mesh(core,fx,new T.ConeGeometry(.085,.26,4),gold,flight);head.rotation.x=-Math.PI/2;head.position.z=.13;
        const material=shader(core,fx,beam),trails=[];for(let i=0;i<2;i++){const m=mesh(core,fx,strip(T,.13),material,flight);m.rotation.z=i*Math.PI/2;trails.push(m);}
        const helices=[];for(let j=0;j<(low?1:2);j++)helices.push(mesh(core,fx,ribbon(T,count),basic(core,fx,j?'#9ed8ff':'#438fff',.72),flight));
        return {...shot,flight,material,trails,helices,count,launch:flash(core,fx,.7),impact:flash(core,fx,1.35),released:false,done:false,initialQuery:true,contactTime:-99,start:new T.Vector3(),endPoint:new T.Vector3(),eye:new T.Vector3(),direction:new T.Vector3(),wall:null,wallDistance:skill.range,length:0};
      });
      fx.bow={actorOrigin:core._pose(fx.caster).p.clone(),handX:-.12,arrows,previous:0,charge,aura,orb,ring,bands};
    },
    tick(core,fx){
      const T=core.THREE,b=fx.bow,s=fx.skill,t=fx.age,previous=b.previous;b.previous=t;
      const pose=sample(t),forward=fx.direction,d=forward.clone().applyAxisAngle(new T.Vector3(0,1,0),pose.yaw),right=new T.Vector3(d.z,0,-d.x);
      b.charge.position.copy(b.actorOrigin).addScaledVector(d,.48+.931-pose.draw*.7).addScaledVector(right,b.handX);b.charge.position.y+=1.7645;
      // Gathering light follows the live bow; flight release anchors remain frame-rate independent.
      if(fx.weaponTip?.getWorldPosition)fx.weaponTip.getWorldPosition(b.charge.position);
      b.charge.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),d);b.charge.visible=t<=shots[2].release&&pose.arrowVisible;
      b.orb.scale.setScalar(.35+pose.draw*1.7);b.ring.scale.setScalar(1-pose.draw);b.ring.rotation.z=t*9;
      b.aura.position.copy(b.actorOrigin);b.aura.rotation.y=t*2.4;b.aura.visible=t<.75;
      for(const band of b.bands)band.material.opacity=.32*smooth(0,.09,t)*(1-smooth(.49,.75,t));
      for(const f of b.arrows){
        if(!fx.alive)return;
        if(t>=f.release&&!f.released){
          f.released=true;f.direction.copy(shotDirection(T,forward,f.index));const side=new T.Vector3(f.direction.z,0,-f.direction.x);
          f.start.copy(releaseAnchor(T,b.actorOrigin,forward,f.index,b.handX));f.eye.copy(b.actorOrigin).addScaledVector(side,b.handX);f.eye.y=f.start.y;
          f.endPoint.copy(f.eye).addScaledVector(f.direction,s.range);f.length=f.start.distanceTo(f.endPoint);
          f.wall=b.trace?.(f.eye.clone(),f.endPoint.clone(),s.radius)||null;
          if(f.wall?.point&&[f.wall.point.x,f.wall.point.y,f.wall.point.z].every(Number.isFinite))f.wallDistance=Math.max(0,Math.min(s.range,f.wall.point.clone().sub(f.eye).dot(f.direction)));else f.wall=null;
          f.launch.group.position.copy(f.start);core._emit('release',fx,{kind:'volley-arrow',hitIndex:f.index,position:f.start.clone(),direction:f.direction.clone(),releaseTime:f.release},'volley-release:'+f.index);
        }
        if(!fx.alive)return;
        const progress=clamp((t-f.release)/(f.end-f.release)),oldProgress=clamp((previous-f.release)/(f.end-f.release)),front=1.117+progress*f.length;
        if(f.released&&!f.done&&previous<f.end){
          const lo=f.initialQuery?0:Math.min(f.wallDistance,1.117+oldProgress*f.length),hi=Math.min(f.wallDistance,front);f.initialQuery=false;
          const a=f.eye.clone().addScaledVector(f.direction,lo),z=f.eye.clone().addScaledVector(f.direction,hi);
          if(hi>=lo)resolveTargets(core,fx,f,a,z,t);
          if(!fx.alive)return;
          if(!f.done&&f.wall&&front>=f.wallDistance){const at=f.release+Math.max(0,f.wallDistance-1.117)/f.length*(f.end-f.release);impact(core,fx,f,f.wall.point,at,'wall');}
        }
        f.flight.visible=f.released&&!f.done&&t<f.end;f.flight.position.copy(f.start).lerp(f.endPoint,progress);f.flight.quaternion.setFromUnitVectors(new T.Vector3(0,0,-1),f.direction.lengthSq()?f.direction:forward);
        const length=Math.max(.12,Math.min(3.6,progress*f.length+.2));f.material.uniforms.uOpacity.value=.96;for(const trail of f.trails)trail.scale.z=length;
        for(let j=0;j<f.helices.length;j++){const p=f.helices[j].geometry.attributes.position;for(let i=0;i<=f.count;i++){const u=i/f.count,angle=u*11-t*15+j*Math.PI,r=.035+Math.sin(u*Math.PI)*.16;for(let edge=0;edge<2;edge++){const w=(edge?1:-1)*.014;p.setXYZ(i*2+edge,Math.cos(angle)*(r+w),Math.sin(angle)*(r+w),u*length);}}p.needsUpdate=true;}
        const releaseFade=f.released?1-smooth(0,.085,t-f.release):0;f.launch.group.visible=releaseFade>0;f.launch.material.uniforms.uOpacity.value=releaseFade;
        const age=t-f.contactTime,fade=1-smooth(0,.3,age);f.impact.group.visible=f.done&&age>=0&&fade>0;f.impact.material.uniforms.uOpacity.value=fade;f.impact.group.scale.setScalar(.25+Math.max(0,age)*4.6);
      }
    }
  };
  Core.registerEffect(id,effect);
  return Object.freeze({skillId:id,poseDuration,sample,shots,shotDirection,releaseAnchor,effect});
});
