/* Côn quét: one continuous sweep, one ground release. Units: metres/seconds.
 * Reference: supplied Vk-Côn.jpg (top row) + four 10-second analysis prompts.
 * No renderer, RAF, camera, damage authority or network state is owned here.
 */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory(require('./weapon-vfx-core.js'),require('./staff-skill-config.js'));
  else root.StaffSweep=factory(root.WeaponVFXCore,root.StaffSkillConfig);
})(typeof globalThis!=='undefined'?globalThis:this,function(Core,Config){
  'use strict';
  const TAU=Math.PI*2,clamp=x=>Math.max(0,Math.min(1,x));
  const ease=(a,b,x)=>{const p=clamp((x-a)/(b-a));return p*p*(3-2*p);};
  const skill=()=>Config.skills[0];
  function sample(time,s=skill()){
    const t=Math.max(0,time),p=s.phases;
    const turn=t<p.openEnd?.18*ease(p.windup,p.openEnd,t):t<p.accelerateEnd?.18+.64*ease(p.openEnd,p.accelerateEnd,t):.82+.18*ease(p.accelerateEnd,p.closeEnd,t);
    const recovery=ease(p.releaseEnd,s.duration,t),weight=ease(0,p.windup,t)*(1-recovery);
    return {phase:t<p.openEnd?'Mở cung':t<p.accelerateEnd?'Tăng lực':t<p.releaseAt?'Khép vòng':t<p.releaseEnd?'Bộc phát':'Thu chiêu',
      turn,weight,staffYaw:(-1.05+turn*2.8)*weight,torsoYaw:(-.3+turn*.65)*weight,
      handY:1.50-.12*ease(p.accelerateEnd,p.releaseAt,t),handZ:.34,
      ringRadius:s.containRadius+(s.radius-s.containRadius)*clamp((t-p.releaseAt)/(p.releaseEnd-p.releaseAt)),
      released:t>=p.releaseAt};
  }
  // Closed interval overlap: a slow frame must not skip an entire hit window.
  function windows(previous,current,s=skill()){
    const out=[],p=s.phases;
    if(current>=s.activeAt&&previous<p.closeEnd)out.push({kind:'sweep',from:Math.max(previous,s.activeAt),to:Math.min(current,p.closeEnd)});
    if(current>=p.releaseAt&&previous<p.releaseEnd)out.push({kind:'wave',from:Math.max(previous,p.releaseAt),to:Math.min(current,p.releaseEnd)});
    return out;
  }
  function intersects(window,target,radius=0){
    if(!target||![target.x,target.y,target.z,radius].every(Number.isFinite))return false;
    const dx=target.x-window.position.x,dz=target.z-window.position.z,d=Math.hypot(dx,dz);
    if(Math.abs(target.y-window.position.y)>window.height+radius)return false;
    if(window.kind==='wave')return d+radius>=window.innerRadius&&d-radius<=window.outerRadius;
    if(d-radius>window.outerRadius)return false;
    const angle=Math.atan2(dx,dz),offset=((angle-window.startAngle)%TAU+TAU)%TAU;
    const padding=Math.asin(Math.min(1,Math.max(0,radius)/Math.max(.001,d)));
    return d<radius||offset<=window.angle+padding||offset>=TAU-padding;
  }
  const Y_AXIS={x:0,y:1,z:0};
  const FRAGMENT=`
    uniform vec3 uColor; uniform float uTime,uOpacity; varying vec2 vUv;
    void main(){
      float crossFade=pow(max(0.0,sin(vUv.y*3.14159265)),1.2);
      float ageFade=pow(vUv.x,1.5);
      float filament=.64+.22*sin(vUv.x*49.0-uTime*13.0+vUv.y*21.0)+.14*sin(vUv.x*103.0+vUv.y*33.0);
      gl_FragColor=vec4(uColor,crossFade*ageFade*filament*uOpacity);
    }`;
  const RING=`uniform vec3 uColor;uniform float uOpacity,uTime;varying vec2 vUv;
    void main(){float edge=pow(max(0.0,sin(vUv.y*3.14159265)),1.1);
      float filaments=.78+.22*sin(vUv.x*125.6637-uTime*10.0);
      gl_FragColor=vec4(uColor,edge*filaments*uOpacity);}`;
  const DUST=`uniform vec3 uColor;uniform float uOpacity,uTime;varying vec2 vUv;
    void main(){vec2 p=vUv-.5;float d=length(p)*2.0;
      float wisps=.7+.15*sin(vUv.x*25.0+uTime*3.0)+.15*sin(vUv.y*31.0-uTime*2.0);
      gl_FragColor=vec4(uColor,pow(max(0.0,1.0-d),2.0)*wisps*uOpacity);}`;
  function build(core,fx){
    const T=core.THREE,n=fx.quality.segments;
    fx.sweep={previous:0,tip:new T.Vector3(),lastTip:new T.Vector3(),samples:[],ribbons:[],hitTargets:new Set(),lastAngle:null};
    const state=fx.sweep;
    for(let layer=0;layer<3;layer++){
      const geometry=new T.BufferGeometry(),position=new T.BufferAttribute(new Float32Array((n+1)*6),3).setUsage(T.DynamicDrawUsage);
      const uv=[],indices=[];
      for(let i=0;i<=n;i++){uv.push(i/n,0,i/n,1);if(i<n){const j=i*2;indices.push(j,j+1,j+2,j+1,j+3,j+2);}}
      geometry.setAttribute('position',position);geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geometry.setIndex(indices);
      const mesh=core._mesh(fx,geometry,core._shader(fx,layer===1?fx.palette.secondary:fx.palette.primary,FRAGMENT));
      mesh.frustumCulled=false;mesh.visible=false;mesh.name='staff-sweep-tip-ribbon-'+layer;state.ribbons.push(mesh);
    }
    state.band=core._arc(fx,1,.10,TAU,.08,0,fx.palette.primary);state.band.name='staff-sweep-contained-band';
    state.wave=core._arc(fx,1,.085,TAU,.06,0,fx.palette.primary);state.wave.name='staff-sweep-single-wave';
    state.edge=core._arc(fx,1,.018,TAU,.065,0,fx.palette.secondary);
    for(const mesh of [state.band,state.wave,state.edge]){mesh.material.fragmentShader=RING.replace(/\}\s*$/, '\n#include <colorspace_fragment>\n}');mesh.material.needsUpdate=true;}
    state.band.visible=state.wave.visible=state.edge.visible=false;
    core._debris(fx);fx.rocks.name='staff-sweep-ground-grit';
    // Short ballistic arcs, scattered at the moving wave front (not the centre).
    for(const rock of fx.rockState){rock.r=fx.skill.containRadius+core.random()*(fx.skill.radius-fx.skill.containRadius);rock.speed=.25+core.random()*.6;rock.vy=.55+core.random()*.9;rock.size=.025+core.random()*.055;}
    const dustMaterial=core._shader(fx,fx.palette.earth,DUST);dustMaterial.blending=T.NormalBlending;
    const dustGeometry=new T.PlaneGeometry(1,1);state.dust=core._mesh(fx,dustGeometry,dustMaterial);
    // One instanced draw for all dust puffs. Slight tilt keeps the ground readable.
    state.dust.removeFromParent();state.dust=new T.InstancedMesh(dustGeometry,dustMaterial,fx.quality.debris);
    state.dust.frustumCulled=false;state.dust.visible=false;state.dust.name='staff-sweep-low-dust';fx.group.add(state.dust);
    state.light=new T.PointLight(fx.palette.primary,0,5,2);state.light.castShadow=false;fx.group.add(state.light);
    if(fx.weaponTip)fx.weaponTip.getWorldPosition(state.lastTip);else state.lastTip.copy(fx.start);
    
  }
  function tick(core,fx,dt){
    const T=core.THREE,s=fx.skill,p=s.phases,state=fx.sweep,t=fx.age,previous=state.previous,pose=sample(t,s);
    const {tip,lastTip,samples}=state;
    if(fx.weaponTip)fx.weaponTip.getWorldPosition(tip);
    else {const a=-1.05+pose.turn*2.8;tip.set(Math.cos(a)*1.65,pose.handY,-Math.sin(a)*1.65).applyAxisAngle(new T.Vector3(0,1,0),fx.group.rotation.y).add(fx.group.position);}
    const moving=t>=p.windup&&previous<p.closeEnd;
    if(moving&&t<s.duration){
      // Interpolate actual tip samples at 120 Hz. No orbiting substitute trail.
      const from=Math.max(previous,p.windup),to=Math.min(t,p.closeEnd),steps=Math.max(1,Math.ceil((to-from)*120));
      for(let i=1;i<=steps;i++){
        const age=from+(to-from)*i/steps,point=lastTip.clone().lerp(tip,clamp((age-previous)/Math.max(dt,.0001)));
        samples.push({time:age,point});
      }
    }
    while(samples.length&&samples[0].time<t-.55)samples.shift();
    if(samples.length>80)samples.splice(0,samples.length-80);
    fx.group.updateWorldMatrix(true,false);
    const inverse=new T.Matrix4().copy(fx.group.matrixWorld).invert(),local=new T.Vector3(),radial=new T.Vector3();
    state.ribbons.forEach((mesh,layer)=>{
      const a=mesh.geometry.attributes.position,n=a.count/2-1;
      for(let i=0;i<=n;i++){
        const entry=samples[Math.min(samples.length-1,Math.floor(i/n*Math.max(0,samples.length-1)))];
        local.copy(entry?.point||tip).applyMatrix4(inverse);radial.set(local.x,0,local.z).normalize();
        const power=ease(p.windup,p.accelerateEnd,t),age=entry?Math.max(0,t-entry.time):0;
        const width=layer===1?.035:(.14+power*.65)*(layer===2?.45:1)*(1-i/n*.65);
        local.addScaledVector(radial,Math.min(.75,age*1.5));
        local.applyAxisAngle(Y_AXIS,-Math.min(1.05,age*2.0));
        local.y-=Math.min(.35,age*.65);radial.set(local.x,0,local.z).normalize();
        for(let side=0;side<2;side++){
          const distance=(side-.5)*width+(layer===1?.18:layer===2?-.20:0);
          a.setXYZ(i*2+side,local.x+radial.x*distance,local.y+(layer===2?.12:0)+.035*Math.sin(i*.3+layer),local.z+radial.z*distance);
        }
      }
      a.needsUpdate=true;mesh.visible=samples.length>2;
      core._opacity(mesh,samples.length>2?(layer===1?.95:.72)*(1-ease(p.closeEnd,p.releaseAt+.14,t)):0);
    });
    const contain=ease(p.accelerateEnd,p.closeEnd,t)*(1-ease(p.releaseAt,p.releaseAt+.10,t));
    state.band.geometry.setDrawRange(0,Math.floor(ease(p.accelerateEnd,p.closeEnd,t)*fx.quality.segments)*6);
    state.band.scale.set(s.containRadius,1,s.containRadius);core._opacity(state.band,contain*.62);
    const waveProgress=clamp((t-p.releaseAt)/(p.releaseEnd-p.releaseAt));
    for(const [mesh,alpha] of [[state.wave,.58],[state.edge,.85]]){
      mesh.scale.set(pose.ringRadius,1,pose.ringRadius);core._opacity(mesh,t>=p.releaseAt&&t<p.releaseEnd?alpha*(1-waveProgress):0);
    }
    if(t>=p.releaseAt&&!fx.emitted.has('release')){
      fx.impactLocked=true;core._emit('impact',fx,{phase:'release',radius:s.radius,hitIndex:0},'release');
      if(!fx.alive)return;
    }
    // Send swept windows rather than a full-radius hit at cast time. Callers
    // choose targets, wall occlusion and server-authoritative HP themselves.
    for(const span of windows(previous,t,s)){
      const targetPosition=fx.group.position.clone(),start=sample(span.from,s),end=sample(span.to,s);
      const baseAngle=state.lastAngle??Math.atan2(lastTip.x-targetPosition.x,lastTip.z-targetPosition.z);
      let endAngle=Math.atan2(tip.x-targetPosition.x,tip.z-targetPosition.z),angle=((endAngle-baseAngle)%TAU+TAU)%TAU;
      // Discontinuous animation/teleport must not become a whole-circle hit.
      if(angle>Math.PI)angle=0;
      const event={type:'hit-window',handle:fx.handle,skillId:s.id,weaponId:s.weaponId,caster:fx.caster,time:core.time,
        kind:span.kind,position:targetPosition,height:span.kind==='wave'?.45:1.45,
        innerRadius:span.kind==='wave'?start.ringRadius:0,outerRadius:span.kind==='wave'?end.ringRadius:s.sweepRadius,
        startAngle:baseAngle,angle,hitTargets:state.hitTargets};
      event.testTarget=(id,point,radius=0)=>{if(state.hitTargets.has(id)||!intersects(event,point,radius))return false;state.hitTargets.add(id);return true;};
      core.onEvent?.(event);if(!fx.alive)return;
    }
    state.lastAngle=Math.atan2(tip.x-fx.group.position.x,tip.z-fx.group.position.z);
    const d=fx.dummy;
    state.dust.visible=fx.rocks.visible=t>=p.releaseAt&&t<s.duration;
    for(let i=0;i<fx.rockState.length;i++){
      const rock=fx.rockState[i],arrival=p.releaseAt+(rock.r-s.containRadius)/(s.radius-s.containRadius)*(p.releaseEnd-p.releaseAt),age=Math.max(0,t-arrival),land=2*rock.vy/9.8;
      const alive=t>=arrival,travel=rock.speed*Math.min(age,land),r=rock.r+travel;
      d.position.set(Math.sin(rock.angle)*r,Math.max(.025,rock.vy*age-4.9*age*age),Math.cos(rock.angle)*r);
      d.rotation.set(rock.phase+Math.min(age,land)*2,rock.angle,rock.phase);d.scale.setScalar(alive?rock.size*(1-ease(s.duration-.18,s.duration,t)):0);d.updateMatrix();fx.rocks.setMatrixAt(i,d.matrix);
      d.position.y=.08+Math.min(age,.2)*.3;d.rotation.set(-Math.PI/2+.25,0,rock.angle);d.scale.setScalar(alive?(.35+age*.55)*(1-ease(.15,.55,age)):0);d.updateMatrix();state.dust.setMatrixAt(i,d.matrix);
    }
    fx.rocks.instanceMatrix.needsUpdate=true;state.dust.instanceMatrix.needsUpdate=true;core._opacity(state.dust,t>=p.releaseAt&&t<s.duration?.28*(1-ease(p.releaseEnd,s.duration,t)):0);
    state.light.position.copy(tip).applyMatrix4(inverse);state.light.intensity=1.7*pose.weight;
    if(moving&&t<s.duration){
      state.sparkCarry=(state.sparkCarry||0)+dt*(core.quality==='low'?24:48);
      const amount=Math.min(8,Math.floor(state.sparkCarry));state.sparkCarry-=amount;
      for(let i=0;i<amount;i++)core.pool.spawn(tip,new T.Vector3((core.random()-.5)*.3,.15,(core.random()-.5)*.3),i%3?fx.palette.primary:fx.palette.secondary,.22,.035,.4,.65);
    }
    state.previous=t;lastTip.copy(tip);
  }
  Core.registerSkillRenderer('staff.con-quet',{build,tick});
  return {sample,windows,intersects,duration:skill().duration};
});
