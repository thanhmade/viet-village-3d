/* Xuyên Tiễn: authored draw pose + world-space golden arrow/blue qi.
 * Uses the host clock, hit-window callback, pool and ownership cleanup.
 * No standalone damage, renderer, RAF or timers. Metres / seconds. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory(require('./weapon-vfx-core.js'),require('./bow-skill-config.js'));
  else root.BowPiercing=factory(root.WeaponVFXCore,root.BowSkillConfig);
})(typeof globalThis!=='undefined'?globalThis:this,function(Core,Config){
  'use strict';
  const id='bow.xuyen-tien',skill=Config.skills.find(s=>s.id===id),poseDuration=.68;
  const clamp=x=>Math.max(0,Math.min(1,x)),smooth=(a,b,t)=>{const k=clamp((t-a)/(b-a));return k*k*(3-2*k);};
  function sample(time){
    const t=Math.max(0,time),draw=.42*smooth(0,skill.activeAt,t)*(1-smooth(skill.activeAt,skill.activeAt+.065,t));
    return {weight:smooth(0,.08,t)*(1-smooth(.40,poseDuration,t)),draw,
      handX:-.12,handY:1.74,handZ:.48,released:t>=skill.activeAt,
      phase:t<skill.activeAt?'Giương cung':t<skill.activeEnd?'Phóng tên xuyên thẳng':t<skill.duration?'Tan khí':'Sẵn sàng'};
  }
  // Analytic swept horizontal arrow vs an upright target capsule. Position is feet.
  function targetFraction(a,b,p,radius,height=2.2){
    if(!p||![p.x,p.y,p.z,radius,height].every(Number.isFinite)||radius<0||height<0)return null;
    const dx=b.x-a.x,dz=b.z-a.z,x=a.x-p.x,z=a.z-p.z,A=dx*dx+dz*dz,C=x*x+z*z-radius*radius;
    let enter=0,leave=1;
    if(A<1e-12){if(C>0)return null;}
    else {const B=2*(x*dx+z*dz),disc=B*B-4*A*C;if(disc<0)return null;const d=Math.sqrt(disc);enter=Math.max(0,(-B-d)/(2*A));leave=Math.min(1,(-B+d)/(2*A));if(enter>leave)return null;}
    const dy=b.y-a.y,lo=p.y-radius,hi=p.y+height+radius;
    if(Math.abs(dy)<1e-10){if(a.y<lo||a.y>hi)return null;}
    else {const t0=(lo-a.y)/dy,t1=(hi-a.y)/dy;enter=Math.max(enter,Math.min(t0,t1));leave=Math.min(leave,Math.max(t0,t1));if(enter>leave)return null;}
    return enter;
  }
  // Registered map bounds and sampled terrain; no render meshes are treated as targets.
  function traceWorld(T,a,b,radius,bounds,ground){
    const direction=b.clone().sub(a),length=direction.length();if(length<1e-8)return null;direction.divideScalar(length);
    const ray=new T.Ray(a,direction),hit=new T.Vector3();let distance=Infinity;
    for(const box of bounds||[]){if(!box?.isBox3)continue;const expanded=box.clone().expandByScalar(radius);
      if(expanded.containsPoint(a)){distance=0;break;}
      if(ray.intersectBox(expanded,hit)){const d=hit.distanceTo(a);if(d<=length&&d<distance)distance=d;}}
    if(ground){const steps=Math.max(1,Math.ceil(length/.1));for(let i=0;i<=steps;i++){const d=length*i/steps;if(d>=distance)break;hit.copy(a).addScaledVector(direction,d);if(hit.y-radius<=ground(hit)){distance=d;break;}}}
    return Number.isFinite(distance)?{point:a.clone().addScaledVector(direction,distance),fraction:distance/length}:null;
  }
  const vertex='varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}';
  const beam='varying vec2 vUv;uniform float uOpacity;void main(){float edge=abs(vUv.x-.5)*2.;float a=pow(1.-edge,2.)*(1.-smoothstep(.15,1.,vUv.y))*uOpacity;vec3 c=mix(vec3(1.,.43,.04),vec3(1.,.97,.75),pow(1.-edge,5.));gl_FragColor=vec4(c,a);\n#include <colorspace_fragment>\n}';
  const star='varying vec2 vUv;uniform float uOpacity;void main(){vec2 p=vUv-.5;float r=length(p)*2.;float angle=atan(p.y,p.x);float rays=pow(abs(cos(angle*4.)),22.)*.65;float a=clamp((1.-r)*(1.-r)/(1.+r*7.)+rays*(1.-r),0.,1.)*(1.-smoothstep(.85,1.,r))*uOpacity;gl_FragColor=vec4(1.,.80,.35,a);\n#include <colorspace_fragment>\n}';
  function basic(core,fx,color,opacity=1){const m=new core.THREE.MeshBasicMaterial({color,transparent:true,opacity,blending:core.THREE.AdditiveBlending,depthWrite:false,toneMapped:false,side:core.THREE.DoubleSide});fx.materials.add(m);return m;}
  function shader(core,fx,fragment){const m=new core.THREE.ShaderMaterial({uniforms:{uOpacity:{value:0}},vertexShader:vertex,fragmentShader:fragment,transparent:true,blending:core.THREE.AdditiveBlending,depthWrite:false,toneMapped:false,side:core.THREE.DoubleSide});fx.materials.add(m);return m;}
  function mesh(core,fx,g,m,parent){fx.geometries.add(g);fx.materials.add(m);const o=new core.THREE.Mesh(g,m);o.renderOrder=10;o.frustumCulled=false;parent.add(o);return o;}
  function strip(T,width){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute([-width,0,0,width,0,0,-width,0,1,width,0,1],3));g.setAttribute('uv',new T.Float32BufferAttribute([0,0,1,0,0,1,1,1],2));g.setIndex([0,1,2,2,1,3]);return g;}
  function flash(core,fx,parent,size=1){const g=new core.THREE.Group();parent.add(g);const m=shader(core,fx,star);
    for(let i=0;i<3;i++){const p=mesh(core,fx,new core.THREE.PlaneGeometry(size,size),m,g);p.rotation.set(i===1?Math.PI/2:0,i===2?Math.PI/2:0,0);}
    return {group:g,material:m};}
  function burst(core,fx,point,at,key){
    const b=fx.bow;core._emit('impact',fx,{position:point.clone(),hitIndex:b.hitIndex++,kind:'piercing-arrow',shake:.025,contactTime:at},key);
    if(!fx.alive||fx.age-at>.32)return;
    const f=b.impacts[b.nextImpact++%b.impacts.length];f.at=at;f.group.position.copy(point);f.group.visible=true;
    for(let i=0;i<(core.quality==='low'?7:12);i++){const v=new core.THREE.Vector3((core.random()-.5)*5,(core.random()-.3)*4,(core.random()-.5)*5);core.pool.spawn(point,v,i%3?'#ffbb4d':'#8ac8ff',.28,.025,0,.8);}
  }
  const effect={
    place(core,fx){fx.group.position.set(0,0,0);fx.group.quaternion.identity();},
    build(core,fx){
      const T=core.THREE,flight=new T.Group(),charge=new T.Group();fx.group.add(flight,charge);flight.name='xuyen-tien-golden-arrow';charge.name='xuyen-tien-draw-qi';flight.visible=false;
      const bright=basic(core,fx,'#fff5d8'),gold=basic(core,fx,'#ffbb4d');
      const shaft=mesh(core,fx,new T.CylinderGeometry(.016,.024,1.7,8),bright,flight);shaft.rotation.x=Math.PI/2;shaft.position.z=.85;
      const head=mesh(core,fx,new T.ConeGeometry(.075,.27,4),gold,flight);head.rotation.x=-Math.PI/2;head.position.z=.08;
      const material=shader(core,fx,beam),ribbons=[];
      for(let i=0;i<2;i++){const r=mesh(core,fx,strip(T,.18),material,flight);r.rotation.z=i*Math.PI/2;ribbons.push(r);}
      const count=core.quality==='low'?32:64,helices=[];
      for(let j=0;j<2;j++){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(new Float32Array((count+1)*6),3));const uv=[],ix=[];for(let i=0;i<=count;i++){uv.push(0,i/count,1,i/count);if(i<count){const k=i*2;ix.push(k,k+1,k+2,k+2,k+1,k+3);}}g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(ix);const m=basic(core,fx,j?'#91caff':'#398bff',.65);const n=mesh(core,fx,g,m,flight);helices.push({mesh:n,count});}
      const orb=mesh(core,fx,new T.SphereGeometry(.085,12,8),bright,charge),ring=mesh(core,fx,new T.TorusGeometry(.25,.009,6,40),gold,charge);
      const launch=flash(core,fx,fx.group,.85),impacts=Array.from({length:core.quality==='low'?6:10},()=>({...flash(core,fx,fx.group,1.45),at:-99}));
      launch.group.visible=false;impacts.forEach(f=>{f.group.visible=false;});
      const {p}=core._pose(fx.caster);
      fx.bow={flight,charge,orb,ring,material,ribbons,helices,launch,impacts,nextImpact:0,hitIndex:0,hits:new Set(),previous:0,released:false,handX:-.12,actorOrigin:p.clone(),start:new T.Vector3(),end:new T.Vector3(),eye:new T.Vector3(),length:0,stopFraction:1,stopPoint:null};
    },
    release(core,fx){fx.bow.charge.visible=false;},
    tick(core,fx,dt){
      const T=core.THREE,b=fx.bow,s=fx.skill,t=fx.age,previous=b.previous;b.previous=t;
      const pose=sample(t),draw=clamp(t/s.activeAt);
      const forward=fx.direction,right=new T.Vector3(-forward.z,0,forward.x); // caster uses -Z; actor uses +Z
      // Flip right vector into the avatar's +Z convention for the authored palm offset.
      right.negate();
      const anchor=b.actorOrigin.clone().addScaledVector(forward,.48+.637).addScaledVector(right,b.handX);anchor.y+=1.7645;
      b.charge.position.copy(anchor);b.charge.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),forward);b.charge.visible=t<s.activeAt;
      b.orb.scale.setScalar(.25+draw*.8);b.ring.scale.setScalar(1-.5*draw);b.ring.rotation.z=t*7;
      if(t>=s.activeAt&&!b.released){
        b.released=true;b.start.copy(anchor);b.eye.copy(b.actorOrigin).addScaledVector(right,b.handX);b.eye.y=b.start.y;
        b.end.copy(b.eye).addScaledVector(forward,s.range);b.length=b.start.distanceTo(b.end);
        const block=b.trace?.(b.eye.clone(),b.end.clone(),s.radius);
        if(block?.point&&[block.point.x,block.point.y,block.point.z].every(Number.isFinite)){
          const distance=block.point.clone().sub(b.start).dot(forward);b.blockedBeforeMuzzle=distance<0;b.stopFraction=clamp(distance/b.length);b.stopPoint=distance<0?block.point.clone():b.start.clone().lerp(b.end,b.stopFraction);
        }
        b.launch.group.position.copy(b.start);core._emit('release',fx,{position:b.start.clone(),direction:forward.clone(),kind:'piercing-arrow'});
      }
      if(!fx.alive)return;
      const travel=s.activeEnd-s.activeAt,from=clamp((previous-s.activeAt)/travel),to=Math.min(b.stopFraction,clamp((t-s.activeAt)/travel));
      if(b.released&&!b.blockedBeforeMuzzle&&previous<s.activeEnd&&t>=s.activeAt&&from<=to){
        const a=b.start.clone().lerp(b.end,Math.min(from,b.stopFraction)),z=b.start.clone().lerp(b.end,to);let accepting=true;
        const event={type:'hit-window',kind:'piercing-arrow',skillId:id,weaponId:'bow',handle:fx.handle,caster:fx.caster,position:z.clone(),from:a.clone(),to:z.clone(),radius:s.radius,
          testTarget:(targetId,p,r=.25,height=2.2)=>{
            if(!accepting||!fx.alive||targetId==null||b.hits.has(targetId))return false;
            const fraction=targetFraction(a,z,p,s.radius+r,height);if(fraction===null)return false;
            const contact=a.clone().lerp(z,fraction),along=contact.clone().sub(b.start).dot(forward),at=s.activeAt+Math.max(0,along)/Math.max(.001,b.length)*travel;
            if(b.stopPoint&&contact.distanceTo(b.start)>=b.start.distanceTo(b.stopPoint)-1e-5)return false;
            b.hits.add(targetId);burst(core,fx,contact,at,'target:'+targetId);return true;
          }};
        try{core.onEvent?.(event);}finally{accepting=false;}
      }
      if(!fx.alive)return;
      const progress=clamp((t-s.activeAt)/travel),stopped=b.stopPoint&&progress>=b.stopFraction;
      if(stopped&&!b.wallHit){b.wallHit=true;burst(core,fx,b.stopPoint,s.activeAt+b.stopFraction*travel,'wall');}
      b.flight.visible=b.released&&t<s.activeEnd&&!stopped;b.flight.position.copy(b.start).lerp(b.end,Math.min(progress,b.stopFraction));b.flight.quaternion.setFromUnitVectors(new T.Vector3(0,0,-1),forward);
      const length=Math.max(.1,Math.min(5,progress*b.length+.25));b.ribbons.forEach(r=>r.scale.z=length);b.material.uniforms.uOpacity.value=.9;
      for(let j=0;j<b.helices.length;j++){const h=b.helices[j],attribute=h.mesh.geometry.attributes.position;for(let i=0;i<=h.count;i++){const u=i/h.count,angle=u*15-t*13+j*Math.PI,r=.055+Math.sin(u*Math.PI)*.24;for(let edge=0;edge<2;edge++){const width=(edge?1:-1)*.018;attribute.setXYZ(i*2+edge,Math.cos(angle)*(r+width),Math.sin(angle)*(r+width),u*length);}}attribute.needsUpdate=true;}
      const launchFade=b.released?1-smooth(0,.12,t-s.activeAt):0;b.launch.group.visible=launchFade>0;b.launch.material.uniforms.uOpacity.value=launchFade;
      for(const f of b.impacts){const age=t-f.at,k=1-smooth(0,.32,age);f.group.visible=age>=0&&k>0;f.material.uniforms.uOpacity.value=k;f.group.scale.setScalar(.25+Math.max(0,age)*4.5);}
    }
  };
  Core.registerEffect(id,effect);
  return Object.freeze({sample,poseDuration,targetFraction,traceWorld,effect,skillId:id,releaseAt:skill.activeAt});
});
