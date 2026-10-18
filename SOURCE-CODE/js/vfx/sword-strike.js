/* Nhất Kiếm: three authored sword cuts, layered blade ribbons and one flying qi crescent.
 * Host owns target eligibility and consequences. One hit per target per cast;
 * decorative echoes do not multiply gameplay. Metres, seconds, Y-up, actor +Z. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory(require('./weapon-vfx-core.js'),require('./sword-skill-config.js'),()=>require('./bow-piercing.js'));
  else root.SwordStrike=factory(root.WeaponVFXCore,root.SwordSkillConfig,()=>root.BowPiercing);
})(typeof globalThis!=='undefined'?globalThis:this,function(Core,Config,Collision){
 'use strict';
 const id='sword.nhat-kiem',skill=Config.skills.find(s=>s.id===id),poseDuration=1.5,releaseAt=1.01,flightSeconds=.28,bladeRadius=.055,waveRadius=.12;
 const clamp=x=>Math.max(0,Math.min(1,x)),smooth=(a,b,t)=>{const u=clamp((t-a)/(b-a));return u*u*(3-2*u);};
 const swings=Object.freeze([{start:.25,end:.47},{start:.56,end:.78},{start:.88,end:1.12}].map(Object.freeze));
 // Time, blade azimuth/elevation, palm XYZ, pelvis yaw, spine yaw, crouch.
 // Held chambers and fast cuts give each plane a distinct silhouette. The third
 // cut crosses actor +Z at releaseAt; no camera-dependent or frame-count timing.
 const keys=[
  [0,-1.05,1.05,-.40,1.76,.16,-.28,-.10,.10],
  [.25,-1.28,.92,-.40,1.76,.17,-.42,-.13,.12],
  [.29,-1.30,.88,-.40,1.75,.18,-.43,-.13,.12],
  [.42,1.15,-.55,.02,1.38,.39,.38,.12,.15],
  [.47,1.20,-.60,.02,1.36,.36,.40,.12,.15],
  [.56,1.12,-.38,.00,1.38,.30,.30,.10,.14],
  [.59,1.14,-.40,.00,1.38,.30,.30,.10,.14],
  [.73,-1.18,.65,-.44,1.72,.22,-.35,-.12,.10],
  [.78,-1.24,.70,-.44,1.73,.20,-.38,-.12,.10],
  [.88,-1.28,.18,-.42,1.53,.21,-.42,-.14,.15],
  [.94,-1.30,.18,-.42,1.53,.21,-.43,-.14,.15],
  [1.01,0,.02,-.20,1.55,.45,0,.04,.14],
  [1.08,1.23,-.14,.02,1.46,.35,.43,.14,.12],
  [1.12,1.28,-.16,.02,1.45,.32,.45,.14,.12],
  [1.30,1.22,-.12,.00,1.46,.30,.34,.10,.10],
  [1.5,1.0,.2,-.20,1.52,.30,0,0,.06]
 ];
 function sample(time){
  const t=Math.max(0,time),weight=smooth(0,.20,t)*(1-smooth(1.23,poseDuration,t));let a=keys[0],z=keys[keys.length-1];
  for(let i=1;i<keys.length;i++)if(t<=keys[i][0]){a=keys[i-1];z=keys[i];break;}
  const p=smooth(a[0],z[0],t),value=i=>a[i]+(z[i]-a[i])*p;
  return {weight,angle:value(1),elevation:value(2),handX:value(3),handY:value(4),handZ:value(5),
   bodyYaw:value(6)*weight,torsoYaw:value(7),lean:.14,crouch:value(8)*weight,
   stanceWidth:.16,frontStep:.32,backStep:-.18,
   guardX:.34,guardY:1.52+Math.sin(value(1))*.10,guardZ:.08,
   phase:t<.25?'Lấy thế':t<.56?'Trảm xuống':t<.88?'Hất kiếm':t<1.12?'Nhất Kiếm · Phóng kiếm khí':t<poseDuration?'Hồi thế':t<skill.duration?'Dư quang':'Sẵn sàng'};
 }
 function rotation(T,s){return new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),new T.Vector3(Math.sin(s.angle)*Math.cos(s.elevation),Math.sin(s.elevation),Math.cos(s.angle)*Math.cos(s.elevation)));}
 function authoredBlade(T,origin,forward,time,handedness=1){
  const s=sample(time);s.handX*=handedness;s.angle*=handedness;const heading=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),Math.atan2(forward.x,forward.z)),q=heading.clone().multiply(rotation(T,s));
  const palm=new T.Vector3(s.handX,s.handY,s.handZ).applyQuaternion(heading).add(origin),base=new T.Vector3(0,.196,0).applyQuaternion(q).add(palm),tip=new T.Vector3(0,1.218,0).applyQuaternion(q).add(palm);
  return {palm,base,tip,rotation:q};
 }
 const vertex=`attribute float stamp;varying vec2 vUv;varying float vAge;uniform float uTime;
 void main(){vUv=uv;vAge=uTime-stamp;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
 const ribbon=`uniform vec3 uColor;uniform float uOpacity;varying vec2 vUv;varying float vAge;
 void main(){float edge=pow(max(0.,sin(vUv.y*3.14159265)),.6);float life=1.-smoothstep(.018,.16,vAge);float lines=.9+.1*cos(vUv.y*24.);gl_FragColor=vec4(uColor,edge*life*lines*uOpacity);
 #include <colorspace_fragment>
 }`;
 const beam=`uniform vec3 uColor;uniform float uOpacity;varying vec2 vUv;
 void main(){float across=pow(max(0.,sin(vUv.y*3.14159265)),.7);float ends=pow(max(0.,sin(vUv.x*3.14159265)),.35);gl_FragColor=vec4(uColor,across*ends*uOpacity);
 #include <colorspace_fragment>
 }`;
 const flash=`uniform vec3 uColor;uniform float uOpacity;varying vec2 vUv;
 void main(){vec2 p=(vUv-.5)*2.;float r=length(p),a=atan(p.y,p.x);float v=pow(max(0.,1.-r),3.)+.5*pow(abs(cos(a*4.)),24.)*max(0.,1.-r);gl_FragColor=vec4(uColor,clamp(v,0.,1.)*uOpacity);
 #include <colorspace_fragment>
 }`;
 const dust=`uniform vec3 uColor;uniform float uOpacity;varying vec2 vUv;
 void main(){vec2 p=(vUv-.5)*2.;float v=pow(max(0.,1.-dot(p,p)),2.);gl_FragColor=vec4(uColor,v*uOpacity); 
 #include <colorspace_fragment>
 }`;
 // Core's shader builder injects the colour-space chunk; provide our own materials here.
 const simpleVertex='varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}';
 function material(core,fx,color,fragment,vert=simpleVertex,additive=true){const T=core.THREE,m=new T.ShaderMaterial({uniforms:{uColor:{value:new T.Color(color)},uTime:{value:0},uOpacity:{value:0}},vertexShader:vert,fragmentShader:fragment,transparent:true,depthWrite:false,toneMapped:false,side:T.DoubleSide,blending:additive?T.AdditiveBlending:T.NormalBlending});fx.materials.add(m);return m;}
 function mesh(core,fx,g,m,parent=fx.group){fx.geometries.add(g);fx.materials.add(m);const n=new core.THREE.Mesh(g,m);n.frustumCulled=false;n.renderOrder=10;parent.add(n);return n;}
 function planes(T){const p=[],uv=[],ix=[];for(let k=0;k<3;k++){const a=k*Math.PI/3,x=Math.cos(a)*.5,z=Math.sin(a)*.5,j=k*4;p.push(-x,-.5,-z,x,-.5,z,-x,.5,-z,x,.5,z);uv.push(0,0,1,0,0,1,1,1);ix.push(j,j+1,j+2,j+2,j+1,j+3);}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(ix);return g;}
 function arc(T,segments,width,back=0){const p=[],uv=[],ix=[];for(let i=0;i<=segments;i++){const u=i/segments,a=(u-.5)*2.3;for(let j=0;j<2;j++){const r=1.3+(j-.5)*width;p.push(Math.sin(a)*r,Math.sin(a)*.50,Math.cos(a)*r-1.3-back);uv.push(u,j);}if(i<segments){const k=i*2;ix.push(k,k+1,k+2,k+2,k+1,k+3);}}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(ix);return g;}
 function trail(core,fx,from,to,color,alpha){
  const T=core.THREE,count=72,g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(new Float32Array(count*6),3).setUsage(T.DynamicDrawUsage));g.setAttribute('uv',new T.BufferAttribute(new Float32Array(count*4),2));g.setAttribute('stamp',new T.BufferAttribute(new Float32Array(count*2),1).setUsage(T.DynamicDrawUsage));const ix=[];
  for(let i=0;i<count;i++){g.attributes.uv.setXY(i*2,i/(count-1),0);g.attributes.uv.setXY(i*2+1,i/(count-1),1);if(i<count-1){const j=i*2;ix.push(j,j+1,j+2,j+2,j+1,j+3);}}g.setIndex(ix);g.setDrawRange(0,0);
  const m=mesh(core,fx,g,material(core,fx,color,ribbon,vertex));m.visible=false;return {mesh:m,from,to,alpha};
 }
 function contact(core,fx,point,at,kind,targetId=null){
  const b=fx.strike,key='contact:'+(targetId===null?'world':String(targetId));if(b.contacts.has(key)||!fx.alive)return;b.contacts.add(key);
  core._emit('impact',fx,{kind:'sword-strike',hitIndex:0,position:point.clone(),contactTime:at,contactKind:kind,targetId,shake:.018},key);if(!fx.alive||fx.age-at>.5)return;
  b.contactPoint.copy(point);b.contactAt=at;b.contactKind=kind;
  for(let i=0;i<(core.quality==='low'?8:16);i++)core.pool.spawn(point,new core.THREE.Vector3((core.random()-.5)*4.5,.5+core.random()*3,(core.random()-.5)*4.5),i%4?'#d6efff':'#f3d6a0',.38,.035,0,.9);
 }
 // Candidate enumeration cannot apply gameplay. Confirm only the nearest candidate.
 function sweep(core,fx,segments,at,kind){
  const b=fx.strike,T=core.THREE,radius=kind==='blade'?bladeRadius:waveRadius;let barrier=null;
  const clipped=segments.map(([a,z])=>{const hit=b.trace?.(a,z,radius)||Collision().traceWorld(T,a,z,radius,[],p=>core._ground(p));if(hit&&(!barrier||hit.fraction<barrier.fraction))barrier=hit;return [a,z];});
  const fraction=barrier?.fraction??1;let nearest=null,open=true;
  const query={type:'target-query',kind:'sword-strike',phase:kind,skillId:id,weaponId:'sword',handle:fx.handle,caster:fx.caster,hitIndex:0,radius,position:segments[0][1].clone(),
   testTarget:(targetId,p,r=.25,height=2.2)=>{if(!open||!fx.alive||targetId==null||targetId===fx.caster.uuid||!Number.isFinite(r)||r<0)return false;for(const [a,z] of clipped){const t=Collision().targetFraction(a,z,p,radius+r,height);if(t===null||t>=fraction-1e-8)continue;if(!nearest||t<nearest.t-1e-9||(Math.abs(t-nearest.t)<1e-9&&String(targetId)<String(nearest.id)))nearest={id:targetId,t,point:a.clone().lerp(z,t),a,z};}return false;}};
  try{core.onEvent?.(query);}finally{open=false;}if(!fx.alive)return null;
  if(nearest){
   let accept=b.hitTargets.has(nearest.id),confirm=true;
   if(!accept){const event={...query,type:'hit-window',targetId:nearest.id,position:nearest.point.clone(),testTarget:(targetId,p,r=.25,height=2.2)=>{
    if(!confirm||accept||!fx.alive||targetId!==nearest.id||b.hitTargets.has(targetId)||Collision().targetFraction(nearest.a,nearest.z,p,radius+r,height)===null)return false;accept=true;b.hitTargets.add(targetId);return true;}};
    try{core.onEvent?.(event);}finally{confirm=false;}}
   if(accept&&fx.alive){contact(core,fx,nearest.point,at,'target',nearest.id);return {point:nearest.point,fraction:nearest.t,kind:'target'};}
  }
  if(barrier&&fx.alive){contact(core,fx,barrier.point,at,barrier.kind||'wall');return barrier;}return null;
 }
 function waveSegments(T,b,from,to){const out=[];for(let i=0;i<15;i++){const a=(i/14-.5)*2.3,offset=new T.Vector3(Math.sin(a)*1.3,Math.sin(a)*.50,(Math.cos(a)-1)*1.3).applyQuaternion(b.heading);out.push([from.clone().add(offset),to.clone().add(offset)]);}return out;}
 const effect={
  place(core,fx){fx.group.position.set(0,0,0);fx.group.quaternion.identity();},
  build(core,fx){
   const T=core.THREE,origin=core._pose(fx.caster).p.clone(),heading=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),Math.atan2(fx.direction.x,fx.direction.z));
   const b=fx.strike={origin,heading,handedness:1,previous:0,hitTargets:new Set(),contacts:new Set(),blocked:false,released:false,waveDone:false,waveContact:false,waveFrom:new T.Vector3(),wavePosition:new T.Vector3(),waveLength:0,contactPoint:new T.Vector3(),contactAt:-99,contactKind:null,lanes:[]};
   for(let i=0;i<3;i++){const layers=[trail(core,fx,.36,1,'#59a9ed',.30),trail(core,fx,.965,1,'#f1fbff',.95)];if(core.quality!=='low')layers.push(trail(core,fx,.78,.795,'#a2dcff',.28));b.lanes.push({samples:[],layers,emitted:0});}
   b.wave=new T.Group();b.wave.name='nhat-kiem-flying-crescent';b.wave.quaternion.copy(heading);fx.group.add(b.wave);b.wave.visible=false;b.waveMeshes=[];
   for(const [width,back,color,alpha] of [[.16,0,'#65b5ff',.48],[.025,0,'#f3fcff',1],[.045,.16,'#b3ddff',.24]]){const m=mesh(core,fx,arc(T,core.quality==='low'?32:64,width,back),material(core,fx,color,beam),b.wave);m.userData.alpha=alpha;b.waveMeshes.push(m);}
   b.charge=mesh(core,fx,planes(T),material(core,fx,'#b6e1ff',flash));b.impact=mesh(core,fx,planes(T),material(core,fx,'#e9f7ff',flash));b.dust=mesh(core,fx,planes(T),material(core,fx,'#8f8574',dust,simpleVertex,false));b.dust.renderOrder=9;
   const rocksGeometry=new T.IcosahedronGeometry(1,0),rocksMaterial=new T.MeshStandardMaterial({color:0x746d63,roughness:1,transparent:true});fx.geometries.add(rocksGeometry);fx.materials.add(rocksMaterial);b.rocks=new T.InstancedMesh(rocksGeometry,rocksMaterial,core.quality==='low'?8:14);b.rocks.frustumCulled=false;b.rocks.visible=false;fx.group.add(b.rocks);b.dummy=new T.Object3D();
   b.rockStates=Array.from({length:b.rocks.count},(_,i)=>({angle:i*2.3999632297,speed:.5+core.random()*1.6,up:1+core.random()*2,size:.025+core.random()*.045}));
  },
  tick(core,fx){
   const T=core.THREE,b=fx.strike,t=fx.age,previous=b.previous; b.previous=t;
   // Fixed substeps resolve the authored swept blade and fast wave even across a long host frame.
   let cursor=previous,end=Math.min(t,releaseAt+flightSeconds);
   while(cursor<end-1e-9&&fx.alive){
    let next=Math.min(end,(Math.floor(cursor*180+1e-7)+1)/180);if(cursor<releaseAt&&next>releaseAt)next=releaseAt;
    if(!b.blocked&&swings.some(s=>next>=s.start&&cursor<s.end)){
     const pose=authoredBlade(T,b.origin,fx.direction,next,b.handedness),hit=sweep(core,fx,[[pose.palm,pose.tip]],next,'blade');if(!fx.alive)return;if(hit&&hit.kind!=='target')b.blocked=true;
    }
    if(!b.released&&!b.blocked&&next>=releaseAt){
     b.released=true;const anchor=authoredBlade(T,b.origin,fx.direction,releaseAt,b.handedness);b.waveFrom.copy(anchor.tip);b.wavePosition.copy(anchor.tip);b.waveLength=Math.max(0,skill.range-anchor.tip.clone().sub(b.origin).dot(fx.direction));
     // Check the entire crescent's initial footprint, not only its later movement.
     const initial=waveSegments(T,b,anchor.tip,anchor.tip),hit=sweep(core,fx,initial,releaseAt,'wave');if(hit){b.waveDone=true;b.waveContact=true;b.wavePosition.copy(hit.point);}if(!fx.alive)return;
     core._emit('release',fx,{kind:'sword-qi',hitIndex:0,position:anchor.tip.clone(),direction:fx.direction.clone(),releaseTime:releaseAt},'qi-release');if(!fx.alive)return;
    }
    if(b.released&&!b.waveDone&&next>releaseAt){
     const p=clamp((next-releaseAt)/flightSeconds),z=b.waveFrom.clone().addScaledVector(fx.direction,b.waveLength*p),from=b.wavePosition.clone(),hit=sweep(core,fx,waveSegments(T,b,from,z),next,'wave');if(!fx.alive)return;
     b.wavePosition.copy(hit?from.lerp(z,hit.fraction):z);if(hit)b.waveContact=true;if(hit||p>=1)b.waveDone=true;
    }
    cursor=next;
   }
   if(!fx.alive)return;
   for(let k=0;k<swings.length;k++){
    const swing=swings[k],lane=b.lanes[k],visualStep=core.quality==='low'?1/90:1/180,last=Math.min(t,swing.end);
    if(!b.blocked&&t<swing.end+.16)while(swing.start+lane.emitted*visualStep<=last+1e-8){const at=swing.start+lane.emitted++*visualStep,pose=authoredBlade(T,b.origin,fx.direction,at,b.handedness);lane.samples.push({time:at,base:pose.base,tip:pose.tip});}
    while(lane.samples.length&&lane.samples[0].time<t-.17)lane.samples.shift();if(lane.samples.length>72)lane.samples.splice(0,lane.samples.length-72);
    // The newest point follows the held weapon; intermediate points follow the same authored pose.
    if(!b.blocked&&t>=swing.start&&t<=swing.end&&lane.samples.length&&fx.weapon){const last=lane.samples[lane.samples.length-1];fx.weapon.updateWorldMatrix(true,false);last.base.copy(fx.weapon.localToWorld(new T.Vector3(0,.16,0)));last.tip.copy(fx.weaponTip?fx.weaponTip.getWorldPosition(new T.Vector3()):fx.weapon.localToWorld(new T.Vector3(0,1.62,0)));}
    for(const layer of lane.layers){const g=layer.mesh.geometry,p=g.attributes.position,stamp=g.attributes.stamp;for(let i=0;i<lane.samples.length;i++){const v=lane.samples[i];for(const [j,f] of [layer.from,layer.to].entries()){const point=v.base.clone().lerp(v.tip,f);p.setXYZ(i*2+j,point.x,point.y,point.z);stamp.setX(i*2+j,v.time);}}p.needsUpdate=stamp.needsUpdate=true;g.setDrawRange(0,Math.max(0,lane.samples.length-1)*6);layer.mesh.visible=lane.samples.length>1;layer.mesh.material.uniforms.uTime.value=t;layer.mesh.material.uniforms.uOpacity.value=layer.alpha;}
   }
   b.wave.position.copy(b.wavePosition);b.wave.visible=b.released&&!b.waveContact&&t<releaseAt+flightSeconds+.25;for(const m of b.waveMeshes)m.material.uniforms.uOpacity.value=m.userData.alpha*(1-smooth(releaseAt+flightSeconds,releaseAt+flightSeconds+.25,t));
   const anchor=authoredBlade(T,b.origin,fx.direction,Math.min(t,poseDuration),b.handedness);if(fx.weaponTip)fx.weaponTip.getWorldPosition(b.charge.position);else b.charge.position.copy(anchor.tip);
   b.charge.visible=t<.25&&!b.blocked;b.charge.scale.setScalar(.13+.20*smooth(0,.25,t));b.charge.material.uniforms.uOpacity.value=smooth(.03,.2,t)*(1-smooth(.22,.25,t));
   const age=t-b.contactAt,fade=1-smooth(0,.20,age),terrain=b.contactKind==='wall'||b.contactKind==='ground';b.impact.visible=age>=0&&fade>0;b.impact.position.copy(b.contactPoint);b.impact.scale.setScalar(.38+Math.max(0,age)*2);b.impact.material.uniforms.uOpacity.value=fade;
   b.dust.visible=terrain&&age>=0&&age<.5;b.dust.position.copy(b.contactPoint);b.dust.position.y+=Math.max(0,age)*.3;b.dust.scale.setScalar(.5+Math.max(0,age)*2);b.dust.material.uniforms.uOpacity.value=.22*(1-smooth(.08,.5,age));
   b.rocks.visible=terrain&&age>=0&&age<.5;b.rocks.material.opacity=1-smooth(.25,.5,age);
   if(b.rocks.visible)for(let i=0;i<b.rockStates.length;i++){const r=b.rockStates[i],d=b.dummy;d.position.copy(b.contactPoint).add(new T.Vector3(Math.sin(r.angle)*r.speed*age,r.up*age-4.9*age*age,Math.cos(r.angle)*r.speed*age));d.position.y=Math.max(core._ground(d.position)+r.size,d.position.y);d.rotation.set(age*3,r.angle,age*2);d.scale.setScalar(r.size);d.updateMatrix();b.rocks.setMatrixAt(i,d.matrix);}b.rocks.instanceMatrix.needsUpdate=b.rocks.visible;
  }
 };
 Core.registerEffect(id,effect);
 return Object.freeze({skillId:id,poseDuration,releaseAt,flightSeconds,bladeRadius,waveRadius,swings,sample,rotation,authoredBlade,effect});
});
