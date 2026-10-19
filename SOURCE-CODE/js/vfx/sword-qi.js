/* Kiếm Khí — planted sword thrust, compressed qi rings and one travelling lance.
 * Seconds / metres, Y-up, actor +Z. Host owns eligibility and consequences.
 * One nearest accepted target per cast; registered solid walls stop the lance.
 * The authored release pose is deterministic even when a frame crosses release. */
(function(root,factory){
 if(typeof module==='object'&&module.exports)module.exports=factory(require('./weapon-vfx-core.js'),require('./sword-skill-config.js'),()=>require('./bow-piercing.js'));
 else root.SwordQi=factory(root.WeaponVFXCore,root.SwordSkillConfig,()=>root.BowPiercing);
})(typeof globalThis!=='undefined'?globalThis:this,function(Core,Config,Collision){
 'use strict';
 const id='sword.kiem-khi',skill=Config.skills.find(s=>s.id===id),poseDuration=2.55,releaseAt=1.04,flightSeconds=.52,TAU=Math.PI*2;
 const clamp=x=>Math.max(0,Math.min(1,x)),smooth=(a,b,t)=>{const u=clamp((t-a)/(b-a));return u*u*(3-2*u);};
 // t, blade azimuth/elevation, palm XYZ, pelvis yaw, spine yaw, crouch, drive.
 const keys=[
  [0,-.75,.65,-.47,1.54,.13,-.15,-.08,.08,0],
  [.42,-.20,.08,-.49,1.48,-.03,-.48,-.12,.27,.04],
  [.89,-.10,.02,-.44,1.47,-.08,-.52,-.14,.30,.04],
  [1.04,0,0,-.17,1.43,.58,.04,.08,.32,.18],
  [1.16,0,0,-.17,1.43,.58,.05,.08,.32,.18],
  [1.38,0,.025,-.19,1.45,.52,0,.04,.30,.14],
  [1.70,-.28,.12,-.35,1.49,.28,-.16,-.05,.25,.08],
  [2.10,-.70,.45,-.43,1.56,.18,-.12,-.05,.16,.03],
  [2.55,-.70,.55,-.43,1.56,.16,0,0,0,0]
 ];
 function sample(time){
  const t=Math.max(0,time),weight=smooth(0,.42,t)*(1-smooth(1.80,poseDuration,t));let a=keys[0],z=keys.at(-1);
  for(let i=1;i<keys.length;i++)if(t<=keys[i][0]){a=keys[i-1];z=keys[i];break;}
  const u=smooth(a[0],z[0],t),value=i=>a[i]+(z[i]-a[i])*u,thrust=smooth(.89,releaseAt,t)*(1-smooth(1.38,1.80,t));
  return {weight,angle:value(1),elevation:value(2),handX:value(3),handY:value(4),handZ:value(5),
   bodyYaw:value(6)*weight,torsoYaw:value(7),lean:.14+.14*thrust,crouch:value(8)*weight,drive:value(9)*weight,
   stanceWidth:.18,frontStep:.47,backStep:-.31,guardX:.38+.12*thrust,guardY:1.35+.12*thrust,guardZ:.08-.32*thrust,
   phase:t<.42?'Hạ tấn · Dẫn kiếm':t<.89?'Tụ khí · Nén vòng':t<releaseAt?'Dồn lực · Đâm kiếm':t<releaseAt+flightSeconds?'Kiếm Khí · Phóng thẳng':t<1.80?'Dư lực · Giữ thế':t<poseDuration?'Thu kiếm · Hồi thế':t<skill.duration?'Khí tản':'Sẵn sàng'};
 }
 function rotation(T,s){return new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),new T.Vector3(Math.sin(s.angle)*Math.cos(s.elevation),Math.sin(s.elevation),Math.cos(s.angle)*Math.cos(s.elevation)));}
 function authoredBlade(T,origin,forward,time,handedness=1){
  const s=sample(time);s.handX*=handedness;s.angle*=handedness;
  const heading=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),Math.atan2(forward.x,forward.z)),q=heading.clone().multiply(rotation(T,s));
  const palm=new T.Vector3(s.handX,s.handY,s.handZ).applyQuaternion(heading).add(origin);
  return {palm,base:new T.Vector3(0,.196,0).applyQuaternion(q).add(palm),tip:new T.Vector3(0,1.218,0).applyQuaternion(q).add(palm),rotation:q};
 }
 const vertex=`varying vec2 vUv;void main(){vUv=uv;vec4 p=vec4(position,1.);
 #ifdef USE_INSTANCING
 p=instanceMatrix*p;
 #endif
 gl_Position=projectionMatrix*modelViewMatrix*p;}`;
 const noise=`float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);}`;
 const bladeShader=`uniform float uTime,uOpacity;uniform vec3 uColor;varying vec2 vUv;${noise}
 void main(){float u=vUv.x,v=vUv.y,edge=exp(-pow((abs(v-.5)-.47)*30.,2.)),core=exp(-pow((v-.5)*13.,2.));
 float n=noise(vec2(u*17.-uTime*7.,v*11.)),flow=pow(.5+.5*sin(v*71.+sin(u*16.-uTime*9.)*2.),10.);
 float alpha=(.15+.28*n+.50*edge+.30*core+.14*flow)*smoothstep(0.,.13,u)*uOpacity;
 vec3 color=mix(uColor,vec3(.89,.98,1.),clamp(edge*.65+core*.6,0.,1.));gl_FragColor=vec4(color,alpha);
 #include <colorspace_fragment>
 }`;
 const lineShader=`uniform float uTime,uOpacity;uniform vec3 uColor;varying vec2 vUv;
 void main(){float edge=pow(max(0.,sin(vUv.y*3.14159265)),.65),ends=pow(max(0.,sin(vUv.x*3.14159265)),.35);gl_FragColor=vec4(uColor,edge*ends*(.72+.28*sin(vUv.x*21.-uTime*9.))*uOpacity);
 #include <colorspace_fragment>
 }`;
 const ringShader=`uniform float uTime,uOpacity;uniform vec3 uColor;varying vec2 vUv;${noise}
 void main(){float edge=pow(max(0.,sin(vUv.y*3.14159265)),1.6),flow=.38+.62*noise(vec2(vUv.x*21.-uTime*3.,vUv.y*3.));gl_FragColor=vec4(uColor,edge*flow*uOpacity);
 #include <colorspace_fragment>
 }`;
 const flashShader=`uniform float uOpacity;uniform vec3 uColor;varying vec2 vUv;
 void main(){vec2 p=(vUv-.5)*2.;float r=length(p),a=atan(p.y,p.x),fall=pow(max(0.,1.-r),2.5);float rays=pow(abs(cos(a*5.)),32.)*max(0.,1.-r)*.65;gl_FragColor=vec4(uColor,(fall+rays)*uOpacity);
 #include <colorspace_fragment>
 }`;
 function mat(core,fx,color,fragment){const T=core.THREE,m=new T.ShaderMaterial({uniforms:{uTime:{value:0},uOpacity:{value:0},uColor:{value:new T.Color(color)}},vertexShader:vertex,fragmentShader:fragment,transparent:true,depthWrite:false,toneMapped:false,side:T.DoubleSide,blending:T.AdditiveBlending});fx.materials.add(m);return m;}
 function mesh(core,fx,g,m,parent=fx.group){fx.geometries.add(g);fx.materials.add(m);const node=new core.THREE.Mesh(g,m);node.frustumCulled=false;node.renderOrder=10;parent.add(node);return node;}
 function surface(T,n,rows,point){const p=[],uv=[],ix=[];for(let i=0;i<=n;i++)for(let j=0;j<=rows;j++){const a=point(i/n,j/rows);p.push(a.x,a.y,a.z);uv.push(i/n,j/rows);if(i<n&&j<rows){const a=i*(rows+1)+j,b=a+rows+1;ix.push(a,b,a+1,a+1,b,b+1);}}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(ix);return g;}
 function ribbon(core,fx,parent,point,color,width=.02,n=40){const T=core.THREE;return mesh(core,fx,surface(T,n,1,(u,v)=>{const p=point(u);p.x+=(v-.5)*width;return p;}),mat(core,fx,color,lineShader),parent);}
 function opacity(node,value,time){node.visible=value>.001;node.material.uniforms.uOpacity.value=value;node.material.uniforms.uTime.value=time;}
 function trace(core,fx,a,z,r){return fx.strike.trace?.(a,z,r)||Collision().traceWorld(core.THREE,a,z,r,[],p=>core._ground(p));}
 function contact(core,fx,point,at,targetId,kind){
  const b=fx.strike;if(b.stopped||!fx.alive)return;b.stopped=true;b.stopPoint.copy(point);b.contactAt=at;b.stopAt=at;b.contactKind=kind;
  core._emit('impact',fx,{kind:'sword-qi',hitIndex:0,targetId,position:point.clone(),contactTime:at,contactKind:kind,shake:.022},'qi-contact');
  if(!fx.alive)return;b.contact.position.copy(point);b.contact.quaternion.setFromUnitVectors(new core.THREE.Vector3(0,0,1),fx.direction);
  if(fx.age-at>.5)return;
  for(let i=0;i<(core.quality==='low'?8:18);i++)core.pool.spawn(point,new core.THREE.Vector3((core.random()-.5)*4,(core.random()-.2)*4,(core.random()-.5)*4),i%4?'#b9e6ff':'#ffe1aa',.4,.035,0,.8);
 }
 function sweep(core,fx,a,z,fromTime,toTime){
  const b=fx.strike,T=core.THREE,wall=trace(core,fx,a,z,skill.radius),candidates=[];let open=true;
  const query={type:'target-query',kind:'sword-qi',phase:'flight',skillId:id,weaponId:'sword',handle:fx.handle,caster:fx.caster,hitIndex:0,position:z.clone(),from:a.clone(),to:z.clone(),radius:skill.radius,
   testTarget:(targetId,p,r=.25,height=2.2)=>{
    if(!open||!fx.alive||b.stopped||targetId==null||targetId===fx.caster.uuid||b.hitTargets.has(targetId)||!p||![p.x,p.y,p.z,r,height].every(Number.isFinite)||r<0||height<=0)return false;
    const fraction=Collision().targetFraction(a,z,p,r+skill.radius,height);
    if(fraction===null||fraction>=(wall?.fraction??Infinity)-1e-8)return false;
    if(!candidates.some(c=>c.id===targetId))candidates.push({id:targetId,fraction,point:a.clone().lerp(z,fraction)});return false;
   }};
  try{core.onEvent?.(query);}finally{open=false;}
  if(!fx.alive)return;candidates.sort((a,z)=>a.fraction-z.fraction||String(a.id).localeCompare(String(z.id)));
  for(const c of candidates){let accepting=true,accepted=false;
   const event={...query,type:'hit-window',targetId:c.id,position:c.point.clone(),testTarget:(targetId)=>{if(!accepting||accepted||!fx.alive||b.stopped||targetId!==c.id)return false;accepted=true;b.hitTargets.add(targetId);return true;}};
   try{core.onEvent?.(event);}finally{accepting=false;}
   if(!fx.alive)return;if(accepted){contact(core,fx,c.point,fromTime+(toTime-fromTime)*c.fraction,c.id,'target');return;}
  }
  if(wall&&fx.alive)contact(core,fx,wall.point,fromTime+(toTime-fromTime)*wall.fraction,'world','wall');
 }
 const effect={
  place(core,fx){fx.group.position.set(0,0,0);fx.group.quaternion.identity();},
  build(core,fx){
   const T=core.THREE,b=fx.strike={origin:core._pose(fx.caster).p.clone(),handedness:1,previous:0,released:false,stopped:false,hitTargets:new Set(),start:new T.Vector3(),end:new T.Vector3(),stopPoint:new T.Vector3(),contactAt:-99,stopAt:releaseAt+flightSeconds,contactKind:null,chargeRings:[],streams:[],flightMeshes:[],flashMeshes:[]};
   const n=core.quality==='low'?28:56;
   b.charge=new T.Group();b.charge.name='kiem-khi-compression-rings';fx.group.add(b.charge);
   for(let k=0;k<3;k++){
    const radius=.62+k*.17,width=k===0?.13:.055;
    const ring=mesh(core,fx,surface(T,n*2,1,(u,v)=>{const a=u*TAU,r=radius+(v-.5)*width;return new T.Vector3(Math.cos(a)*r,Math.sin(a)*r,-k*.19);}),mat(core,fx,k===2?'#e5d2a5':'#9cdbff',ringShader),b.charge);b.chargeRings.push(ring);
   }
   for(let k=0;k<(core.quality==='low'?3:6);k++){
    const a=k*TAU/6;
    const stream=ribbon(core,fx,b.charge,u=>{const radius=(1-u)*1.35+.03,angle=a+u*3.1;return new T.Vector3(Math.cos(angle)*radius,Math.sin(angle)*radius,-1.7*(1-u));},k%3?'#78c9ff':'#f4d59a',.045,n);b.streams.push(stream);
   }
   b.chargeStar=mesh(core,fx,new T.PlaneGeometry(.65,.65),mat(core,fx,'#d6f2ff',flashShader),b.charge);
   b.flight=new T.Group();b.flight.name='kiem-khi-sword-shaped-lance';b.flight.visible=false;fx.group.add(b.flight);
   const bladePoint=(u,v)=>{const w=.90*Math.pow(Math.sin(Math.PI*u),.8)*(.3+.7*u);return new T.Vector3((v-.5)*2*w,.12*Math.sin(Math.PI*u)*(1-Math.pow((v-.5)*2,2)),-4.6*(1-u));};
   for(let k=0;k<2;k++){const blade=mesh(core,fx,surface(T,n,6,bladePoint),mat(core,fx,k?'#378be5':'#78cfff',bladeShader),b.flight);blade.rotation.z=k*Math.PI/2;b.flightMeshes.push({mesh:blade,alpha:k?.75:1});}
   for(let k=0;k<3;k++){
    const coreBlade=mesh(core,fx,surface(T,n,1,(u,v)=>new T.Vector3((v-.5)*.09*Math.sin(Math.PI*u),0,-4.6*(1-u))),mat(core,fx,'#ecfcff',lineShader),b.flight);coreBlade.rotation.z=k*Math.PI/3;b.flightMeshes.push({mesh:coreBlade,alpha:1.2});
   }
   for(const side of [-1,1])for(let k=0;k<(core.quality==='low'?1:2);k++){
    const thread=ribbon(core,fx,b.flight,u=>{const bend=Math.sin(Math.PI*u),wave=Math.sin(u*Math.PI*3)*.055;return new T.Vector3(side*(.40*bend+wave+k*.075),.11+(.13-k*.26)*bend,-4.5*(1-u));},'#eab644',.05,n);thread.material.blending=T.NormalBlending;thread.renderOrder=12;b.flightMeshes.push({mesh:thread,alpha:1.15});
   }
   for(let k=0;k<(core.quality==='low'?2:4);k++){
    const strand=ribbon(core,fx,b.flight,u=>{const a=k*TAU/4+u*1.5,r=Math.sin(u*Math.PI)*.72;return new T.Vector3(Math.cos(a)*r,Math.sin(a)*r,-5.2*(1-u));},k%2?'#91dfff':'#388bd9',.035,n);b.flightMeshes.push({mesh:strand,alpha:.7});
   }
   b.launch=new T.Group();fx.group.add(b.launch);const launch=mesh(core,fx,new T.PlaneGeometry(1.3,1.3),mat(core,fx,'#e9faff',flashShader),b.launch);b.launchMesh=launch;
   b.contact=new T.Group();b.contact.name='kiem-khi-confirmed-contact';fx.group.add(b.contact);b.contact.visible=false;
   for(let k=0;k<3;k++){const f=mesh(core,fx,new T.PlaneGeometry(2.5,2.5),mat(core,fx,k===1?'#ffe1ae':'#c6edff',flashShader),b.contact);f.rotation.y=k*Math.PI/3;b.flashMeshes.push(f);}
   b.shardMaterial=mat(core,fx,'#aee5ff',lineShader);const shardGeo=surface(T,3,1,(u,v)=>new T.Vector3((v-.5)*.10*Math.sin(Math.PI*u),0,u*.48));
   b.shards=new T.InstancedMesh(shardGeo,b.shardMaterial,core.quality==='low'?22:54);fx.geometries.add(shardGeo);fx.materials.add(b.shardMaterial);b.shards.frustumCulled=false;b.contact.add(b.shards);b.dummy=new T.Object3D();
   b.sparkMaterial=mat(core,fx,'#bcEaff',lineShader);b.chargeSparks=new T.InstancedMesh(shardGeo,b.sparkMaterial,core.quality==='low'?12:28);b.chargeSparks.frustumCulled=false;b.charge.add(b.chargeSparks);
   b.shardStates=Array.from({length:b.shards.count},(_,i)=>({angle:i*2.399963,r:1+(i%9)*.29,s:.45+(i%5)*.15,z:(i%7-3)*.27}));
   b.echo=new T.Group();fx.group.add(b.echo);b.echoRings=[];
   for(let k=0;k<2;k++){const ring=mesh(core,fx,surface(T,n*2,1,(u,v)=>{const a=u*TAU,r=1+(v-.5)*.035;return new T.Vector3(Math.cos(a)*r,Math.sin(a)*r,0);}),mat(core,fx,k?'#efd5ab':'#9fdbff',ringShader),b.echo);b.echoRings.push(ring);}
  },
  tick(core,fx){
   const T=core.THREE,b=fx.strike,t=fx.age,previous=b.previous;b.previous=t;
   const p=authoredBlade(T,b.origin,fx.direction,Math.min(t,releaseAt),b.handedness),charge=smooth(.08,.60,t)*(1-smooth(releaseAt,releaseAt+.20,t));
   // The rendered preparation follows the real held tip; swept collision uses
   // the deterministic release pose, whose rig anchor is checked in pose tests.
   b.charge.position.copy(p.tip);if(t<releaseAt&&fx.weaponTip)fx.weaponTip.getWorldPosition(b.charge.position);
   b.charge.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),fx.direction);b.charge.visible=charge>.001&&!b.blockedBeforeMuzzle;
   const compress=1.25-.50*smooth(.42,.96,t)+.6*smooth(releaseAt,releaseAt+.20,t);b.charge.scale.setScalar(compress);
   b.sparkMaterial.uniforms.uTime.value=t;b.sparkMaterial.uniforms.uOpacity.value=charge*.7;
   if(charge>.001)for(let i=0;i<b.chargeSparks.count;i++){const u=(t*1.2+i*.6180339)%1,a=i*2.399963+t*.6,r=(1-u)*1.45+.1;b.dummy.position.set(Math.cos(a)*r,Math.sin(a)*r,-(1-u)*1.6);b.dummy.rotation.set(0,a,a);b.dummy.scale.setScalar(.26+.30*u);b.dummy.updateMatrix();b.chargeSparks.setMatrixAt(i,b.dummy.matrix);}b.chargeSparks.instanceMatrix.needsUpdate=true;
   b.chargeRings.forEach((ring,k)=>{ring.rotation.z=t*(k%2?-2.2:1.6);opacity(ring,charge*(k===0?1.1:.75),t);});
   b.streams.forEach((stream,k)=>{stream.rotation.z=t*(k%2?1:-1)*1.5;opacity(stream,charge*.6,t);});opacity(b.chargeStar,charge*(.35+.65*smooth(.72,1.04,t)),t);
   if(t>=releaseAt&&!b.released){
    b.released=true;b.start.copy(authoredBlade(T,b.origin,fx.direction,releaseAt,b.handedness).tip);
    const lateral=b.start.clone().sub(b.origin).addScaledVector(fx.direction,-b.start.clone().sub(b.origin).dot(fx.direction));
    b.eye=b.origin.clone().add(lateral);b.end.copy(b.eye).addScaledVector(fx.direction,skill.range);b.length=b.start.distanceTo(b.end);
    b.launch.position.copy(b.start);b.launch.quaternion.copy(b.charge.quaternion);b.echo.position.copy(b.start);b.echo.quaternion.copy(b.charge.quaternion);
    core._emit('release',fx,{kind:'sword-qi',position:b.start.clone(),direction:fx.direction.clone(),releaseTime:releaseAt},'qi-release');
    if(!fx.alive)return;
    const closeWall=trace(core,fx,b.eye,b.start,skill.radius);if(closeWall){b.blockedBeforeMuzzle=true;b.charge.visible=false;b.launch.position.copy(closeWall.point);b.echo.position.copy(closeWall.point);contact(core,fx,closeWall.point,releaseAt,'world','wall');}
   }
   if(!fx.alive)return;
   if(b.released&&!b.stopped&&previous<releaseAt+flightSeconds){
    const from=clamp((previous-releaseAt)/flightSeconds),to=clamp((t-releaseAt)/flightSeconds);
    if(to>=from)sweep(core,fx,b.start.clone().lerp(b.end,from),b.start.clone().lerp(b.end,to),releaseAt+from*flightSeconds,releaseAt+to*flightSeconds);
   }
   if(!fx.alive)return;
   const progress=clamp((t-releaseAt)/flightSeconds),fade=b.released?1-smooth(b.stopAt,b.stopAt+.42,t):0;
   b.flight.visible=b.released&&fade>.001;b.flight.position.copy(b.stopped?b.stopPoint:b.start.clone().lerp(b.end,progress));b.flight.quaternion.copy(b.charge.quaternion);
   const travelled=b.released?Math.max(0,b.flight.position.clone().sub(b.start).dot(fx.direction)):0;
   b.flight.scale.set(1+.35*(1-fade),1+.35*(1-fade),Math.max(.03,Math.min(1,(travelled+.12)/5.2)));
   if(b.stopped&&travelled<.001)b.flight.visible=false;
   b.flightMeshes.forEach(({mesh,alpha})=>opacity(mesh,fade*alpha,t));
   const launchAlpha=b.released?1-smooth(releaseAt,releaseAt+.16,t):0;b.launch.visible=launchAlpha>.001;opacity(b.launchMesh,launchAlpha,t);
   const tail=b.released?smooth(releaseAt,releaseAt+.05,t)*(1-smooth(1.25,3.10,t)):0;b.echo.visible=tail>.001;
   b.echoRings.forEach((ring,k)=>{ring.scale.setScalar(.65+Math.max(0,t-releaseAt)*(.7+k*.25));ring.position.z=-k*.18;ring.rotation.z=t*(k?2:-2);opacity(ring,tail*(k?.32:.5),t);});
   const age=t-b.contactAt,impactAlpha=b.stopped?1-smooth(.03,.68,age):0;b.contact.visible=b.stopped&&age>=0&&impactAlpha>.001;
   b.flashMeshes.forEach((m,k)=>{m.scale.setScalar(.24+Math.max(0,age)*(2.8+k*.3));opacity(m,(1-smooth(.02,.27,age))*(k===1?.65:1),t);});
   b.shardMaterial.uniforms.uTime.value=t;b.shardMaterial.uniforms.uOpacity.value=impactAlpha*.9;
   if(b.contact.visible){const u=Math.max(0,age);for(let i=0;i<b.shardStates.length;i++){const s=b.shardStates[i],r=(1-Math.exp(-u*5))*s.r;b.dummy.position.set(Math.cos(s.angle)*r,Math.sin(s.angle)*r-.32*u*u,s.z*r);b.dummy.rotation.set(s.angle*.31,s.angle*.7,-s.angle);b.dummy.scale.setScalar(s.s*(1-.7*clamp(u/.68)));b.dummy.updateMatrix();b.shards.setMatrixAt(i,b.dummy.matrix);}b.shards.instanceMatrix.needsUpdate=true;}
  }
 };
 Core.registerEffect(id,effect);
 return Object.freeze({skillId:id,sample,rotation,authoredBlade,poseDuration,releaseAt,flightSeconds,effect});
});
