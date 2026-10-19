/* Kiếm Hoa — three full-body cuts unfold six curved sword-qi petals.
 * Seconds, metres, Y up, actor +Z. The host alone grants gameplay consequences.
 * One confirmed contact per target/cast, including the final radial bloom. */
(function(root,factory){
 if(typeof module==='object'&&module.exports)module.exports=factory(require('./weapon-vfx-core.js'),require('./sword-skill-config.js'),()=>require('./bow-piercing.js'));
 else root.SwordFlower=factory(root.WeaponVFXCore,root.SwordSkillConfig,()=>root.BowPiercing);
})(typeof globalThis!=='undefined'?globalThis:this,function(Core,Config,Collision){
 'use strict';
 const id='sword.kiem-hoa',skill=Config.skills.find(s=>s.id===id),TAU=Math.PI*2,poseDuration=3.3,bloomAt=2.25,bloomEnd=2.65;
 const clamp=x=>Math.max(0,Math.min(1,x)),ease=x=>{x=clamp(x);return x*x*(3-2*x);},smooth=(a,b,t)=>ease((t-a)/(b-a));
 const swings=Object.freeze([{start:.55,end:1.12},{start:1.12,end:1.69},{start:1.69,end:2.25}].map(Object.freeze));
 function sample(time){
  const t=Math.max(0,time),weight=smooth(0,.36,t)*(1-smooth(2.85,poseDuration,t));
  let spin=0;for(const s of swings)spin+=TAU*smooth(s.start,s.end,t);
  const yaw=spin-.38*smooth(.04,.3,t)*(1-smooth(.32,.55,t));
  const middle=smooth(.99,1.22,t),low=smooth(1.57,1.8,t),recover=smooth(2.35,3,t);
  const handY=1.72-.18*middle-.18*low+.28*recover,el=.30-.22*middle-.20*low+.32*recover;
  const palm={x:-.48,z:.22},guard={x:.50,z:-.12},c=Math.cos(yaw),s=Math.sin(yaw);
  return {weight,spinAngle:spin,bodyYaw:yaw,torsoYaw:-.12,lean:.12,crouch:(.28+.05*low)*weight,drive:0,
   angle:yaw-1.1,elevation:el,handX:palm.x*c+palm.z*s,handY,handZ:palm.z*c-palm.x*s,
   guardX:guard.x*c+guard.z*s,guardY:1.46-.12*low,guardZ:guard.z*c-guard.x*s,armYaw:yaw,
   stanceWidth:.14,frontStep:.26,backStep:-.20,
   phase:t<.55?'Dẫn kiếm · Tụ khí':t<1.12?'Vòng 1 · Thượng hoa':t<1.69?'Vòng 2 · Hoành hoa':t<2.25?'Vòng 3 · Hạ hoa':t<2.85?'Kiếm Hoa · Nở rộ':t<poseDuration?'Thu kiếm · Hồi thế':t<skill.duration?'Cánh kiếm tan':'Sẵn sàng'};
 }
 // A quarter-turn step alternates feet: lateral travel only while the foot lifts.
 function footstep(state,side){
  const q=state.spinAngle/(Math.PI/2),i=Math.floor(q+1e-9),f=Math.max(0,q-i),left=side==='left';
  const a=left?.04:.54,z=left?.46:.96,u=clamp((f-a)/(z-a));
  return {yaw:(i+smooth(.12,.88,u))*Math.PI/2,lift:.10*Math.sin(Math.PI*u)*state.weight};
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
 const petalShader=`uniform float uTime,uOpacity;uniform vec3 uColor;varying vec2 vUv;${noise}
 void main(){float u=vUv.x,v=vUv.y;float ends=pow(max(0.,sin(u*3.14159265)),.35);float edge=exp(-pow((abs(v-.5)-.465)*34.,2.));
 float mid=exp(-pow((v-.5-.075*sin(u*8.))*40.,2.));float n=noise(vec2(u*9.-uTime*1.8,v*13.+sin(u*14.)*.8));
 float threads=pow(.5+.5*sin(v*69.+sin(u*13.-uTime*4.)*2.),10.);float a=(.20+.28*n+.72*edge+.18*mid+.10*threads)*ends*uOpacity;
 vec3 color=mix(uColor,vec3(.90,.98,1.),clamp(edge*.8+mid*.35+n*.12,0.,1.));gl_FragColor=vec4(color,a);
 #include <colorspace_fragment>
 }`;
 const ribbonShader=`uniform float uTime,uOpacity,uLife;uniform vec3 uColor;varying vec2 vUv;varying float vAge;${noise}
 void main(){float fade=1.-smoothstep(.03,uLife,vAge),edge=pow(max(0.,sin(vUv.y*3.14159265)),.65);float n=noise(vec2(vUv.x*14.-uTime*6.,vUv.y*5.));
 gl_FragColor=vec4(uColor,edge*fade*(.35+.65*n)*uOpacity);
 #include <colorspace_fragment>
 }`;
 const ribbonVertex='attribute float stamp;uniform float uTime;varying vec2 vUv;varying float vAge;void main(){vUv=uv;vAge=uTime-stamp;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}';
 const filamentShader=`uniform float uTime,uOpacity;uniform vec3 uColor;varying vec2 vUv;
 void main(){float edge=pow(max(0.,sin(vUv.y*3.14159265)),.7),end=pow(max(0.,sin(vUv.x*3.14159265)),.5);float flow=.65+.35*sin(vUv.x*23.-uTime*12.);gl_FragColor=vec4(uColor,edge*end*flow*uOpacity);
 #include <colorspace_fragment>
 }`;
 const flashShader=`uniform float uOpacity;uniform vec3 uColor;varying vec2 vUv;
 void main(){vec2 p=(vUv-.5)*2.;float r=length(p),a=atan(p.y,p.x);float glow=pow(max(0.,1.-r),3.)+.55*pow(abs(cos(a*4.)),24.)*max(0.,1.-r);gl_FragColor=vec4(uColor,glow*uOpacity);
 #include <colorspace_fragment>
 }`;
 function material(core,fx,color,fragment,vert=vertex){const T=core.THREE,m=new T.ShaderMaterial({uniforms:{uTime:{value:0},uOpacity:{value:0},uColor:{value:new T.Color(color)},uLife:{value:.24}},vertexShader:vert,fragmentShader:fragment,transparent:true,depthWrite:false,toneMapped:false,side:T.DoubleSide,blending:T.AdditiveBlending});fx.materials.add(m);return m;}
 function mesh(core,fx,g,m,parent=fx.group){const node=new core.THREE.Mesh(g,m);fx.geometries.add(g);fx.materials.add(m);node.frustumCulled=false;node.renderOrder=10;parent.add(node);return node;}
 function geometry(T,segments,rows,point){const p=[],uv=[],ix=[];for(let i=0;i<=segments;i++)for(let j=0;j<=rows;j++){const v=point(i/segments,j/rows);p.push(v.x,v.y,v.z);uv.push(i/segments,j/rows);if(i<segments&&j<rows){const a=i*(rows+1)+j,b=a+rows+1;ix.push(a,b,a+1,a+1,b,b+1);}}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(ix);return g;}
 function petalPoint(T,u,v,k){const width=.70*Math.pow(Math.sin(Math.PI*u),.8),bend=.23*Math.sin(Math.PI*u),r=.65+u*2.95;
  return new T.Vector3((v-.5)*2*width+bend,.28+u*(k%2?1.45:.45)+.55*Math.sin(Math.PI*u)+.16*Math.pow((v-.5)*2,2),r);}
 function trail(core,fx,from,to,color,alpha){const T=core.THREE,n=90,g=new T.BufferGeometry(),p=new T.BufferAttribute(new Float32Array(n*6),3).setUsage(T.DynamicDrawUsage),stamp=new T.BufferAttribute(new Float32Array(n*2),1).setUsage(T.DynamicDrawUsage),uv=[],ix=[];
  for(let i=0;i<n;i++){uv.push(i/(n-1),0,i/(n-1),1);if(i<n-1){const j=i*2;ix.push(j,j+1,j+2,j+2,j+1,j+3);}}
  g.setAttribute('position',p);g.setAttribute('stamp',stamp);g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(ix);g.setDrawRange(0,0);
  const node=mesh(core,fx,g,material(core,fx,color,ribbonShader,ribbonVertex));node.visible=false;return {mesh:node,from,to,alpha};}
 function impact(core,fx,point,time,targetId,kind){const b=fx.strike,key=kind+':'+String(targetId);if(b.contacts.has(key)||!fx.alive)return;b.contacts.add(key);
  core._emit('impact',fx,{kind:'sword-flower',hitIndex:0,targetId,position:point.clone(),contactTime:time,contactKind:kind,shake:.012},key);
  if(!fx.alive||fx.age-time>.36)return;b.contactPoint.copy(point);b.contactAt=time;
  for(let i=0;i<(core.quality==='low'?7:14);i++)core.pool.spawn(point,new core.THREE.Vector3((core.random()-.5)*4,.4+core.random()*2,(core.random()-.5)*4),i%3?'#bfeaff':'#ffd69a',.30,.04,0,.9);
 }
 function trace(core,fx,a,z,r){return fx.strike.trace?.(a,z,r)||Collision().traceWorld(core.THREE,a,z,r,[],p=>core._ground(p));}
 function resolve(core,fx,at,phase,from,to,previousRadius=0,radius=0){
  const T=core.THREE,b=fx.strike,candidates=[],queryOpen={value:true},barrier=phase==='blade'?trace(core,fx,from,to,.06):null;
  const query={type:'target-query',kind:'sword-flower',phase,skillId:id,weaponId:'sword',handle:fx.handle,caster:fx.caster,hitIndex:0,position:to.clone(),radius:phase==='blade'?.06:radius,
   testTarget:(targetId,p,r=.25,height=2.2)=>{
    if(!queryOpen.value||!fx.alive||targetId==null||targetId===fx.caster.uuid||b.hitTargets.has(targetId)||!p||![p.x,p.y,p.z,r,height].every(Number.isFinite)||r<0||height<=0)return false;
    let hit,point;
    if(phase==='blade'){hit=Collision().targetFraction(from,to,p,r+.06,height);if(hit===null||hit>=(barrier?.fraction??Infinity)-1e-8)return false;point=from.clone().lerp(to,hit);}
    else {const d=Math.hypot(p.x-b.origin.x,p.z-b.origin.z);if(d-r>radius||d+r<previousRadius||p.y>from.y+.35||p.y+height<from.y-.35)return false;
     const end=new T.Vector3(p.x,from.y,p.z),wall=trace(core,fx,from,end,.06);hit=Math.max(0,1-r/Math.max(d,.001));if(wall&&wall.fraction<=hit+1e-8)return false;point=from.clone().lerp(end,hit);}
    if(!candidates.some(c=>c.id===targetId))candidates.push({id:targetId,point,hit});return false;
   }};
  try{core.onEvent?.(query);}finally{queryOpen.value=false;}if(!fx.alive)return;
  candidates.sort((a,z)=>a.hit-z.hit||String(a.id).localeCompare(String(z.id)));
  for(const c of candidates){if(!fx.alive)break;let open=true,accepted=false;
   const event={...query,type:'hit-window',targetId:c.id,position:c.point.clone(),testTarget:(targetId)=>{if(!open||accepted||!fx.alive||targetId!==c.id||b.hitTargets.has(targetId))return false;accepted=true;b.hitTargets.add(targetId);return true;}};
   try{core.onEvent?.(event);}finally{open=false;}if(accepted)impact(core,fx,c.point,at,c.id,'target');
  }
  if(barrier&&fx.alive)impact(core,fx,barrier.point,at,'world',barrier.kind||'wall');
 }
 const effect={
  place(core,fx){fx.group.position.set(0,0,0);fx.group.quaternion.identity();},
  build(core,fx){
   const T=core.THREE,origin=core._pose(fx.caster).p.clone(),heading=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),Math.atan2(fx.direction.x,fx.direction.z));
   const b=fx.strike={origin,heading,handedness:1,previous:0,hitTargets:new Set(),contacts:new Set(),lanes:[],petals:[],currents:[],released:false,contactAt:-99,contactPoint:new T.Vector3()};
   b.flower=new T.Group();b.flower.position.copy(origin);b.flower.quaternion.copy(heading);fx.group.add(b.flower);
   const n=core.quality==='low'?24:40;
   for(let k=0;k<6;k++){const group=new T.Group();group.rotation.y=k*TAU/6+.25;b.flower.add(group);
    const petal=mesh(core,fx,geometry(T,n,6,(u,v)=>petalPoint(T,u,v,k)),material(core,fx,k%2?'#459eff':'#65c0ff',petalShader),group);
    const filaments=[];for(const side of [0,1]){const g=geometry(T,n,1,(u,v)=>{const p=petalPoint(T,u,side?.93:.07,k);p.x+=(v-.5)*.027;p.y+=.025;return p;});filaments.push(mesh(core,fx,g,material(core,fx,'#f9d89a',filamentShader),group));}
    b.petals.push({group,petal,filaments,at:.67+k*.245,index:k});
   }
   for(let k=0;k<(core.quality==='low'?2:4);k++){
    const g=geometry(T,n*2,1,(u,v)=>{const a=u*TAU*.83,r=1.35+u*.80+(v-.5)*(.06+.16*Math.sin(Math.PI*u));return new T.Vector3(Math.sin(a)*r,.35+k*.38+.15*Math.sin(a*1.8)+(v-.5)*.12,Math.cos(a)*r);});
    const node=mesh(core,fx,g,material(core,fx,k%2?'#f4d6a0':'#8fd7ff',filamentShader),b.flower);b.currents.push(node);
   }
   b.bloom=mesh(core,fx,geometry(T,n*2,1,(u,v)=>{const a=u*TAU,r=1+(v-.5)*.065;return new T.Vector3(Math.sin(a)*r,.80+.10*Math.sin(a*3),Math.cos(a)*r);}),material(core,fx,'#b8e9ff',filamentShader),b.flower);b.bloom.visible=false;
   for(let k=0;k<3;k++){const layers=[trail(core,fx,.08,1,'#5db8ff',.78),trail(core,fx,.955,1,'#e5faff',1.1)];if(core.quality!=='low')layers.push(trail(core,fx,.70,.73,'#fff0c2',.8));b.lanes.push({samples:[],emitted:0,layers});}
   const fragmentGeo=geometry(T,8,2,(u,v)=>new T.Vector3((v-.5)*Math.sin(u*Math.PI)*.16,0,u*.36)),fragmentMat=material(core,fx,'#bceaff',petalShader);
   b.fragments=new T.InstancedMesh(fragmentGeo,fragmentMat,core.quality==='low'?20:48);fx.geometries.add(fragmentGeo);fx.materials.add(fragmentMat);b.fragments.frustumCulled=false;b.flower.add(b.fragments);b.dummy=new T.Object3D();
   b.fragmentStates=Array.from({length:b.fragments.count},(_,i)=>({a:i*2.399963,r:1+(i%7)*.38,y:.25+(i%5)*.33,s:.35+(i%4)*.18}));
   const flashGroup=new T.Group();fx.group.add(flashGroup);b.flashGroup=flashGroup;b.flashes=[];
   for(let k=0;k<3;k++){const m=mesh(core,fx,new T.PlaneGeometry(1,1),material(core,fx,k===1?'#ffd390':'#e6faff',flashShader),flashGroup);m.rotation.y=k*Math.PI/3;b.flashes.push(m);}
  },
  tick(core,fx){
   const T=core.THREE,b=fx.strike,t=fx.age,previous=b.previous;b.previous=t;
   let cursor=previous,end=Math.min(t,bloomEnd);
   while(cursor<end-1e-9&&fx.alive){const next=Math.min(end,(Math.floor(cursor*180+1e-7)+1)/180);
    if(next>=skill.activeAt&&cursor<2.25){const p=authoredBlade(T,b.origin,fx.direction,next,b.handedness);resolve(core,fx,next,'blade',p.palm,p.tip);}
    if(!fx.alive)return;
    if(next>=bloomAt){if(!b.released){b.released=true;core._emit('release',fx,{kind:'sword-flower',position:b.origin.clone(),releaseTime:bloomAt},'flower-bloom');if(!fx.alive)return;}
     const radius=.8+(skill.radius-.8)*clamp((next-bloomAt)/(bloomEnd-bloomAt)),before=cursor<bloomAt?0:.8+(skill.radius-.8)*clamp((cursor-bloomAt)/(bloomEnd-bloomAt)),center=b.origin.clone().add(new T.Vector3(0,1.1,0));resolve(core,fx,next,'bloom',center,center,before,radius);}
    cursor=next;
   }
   if(!fx.alive)return;
   for(let k=0;k<3;k++){const lane=b.lanes[k],swing=swings[k],step=core.quality==='low'?1/90:1/180,last=Math.min(t,swing.end);
    if(t<swing.end+.24)while(swing.start+lane.emitted*step<=last+1e-8){const at=swing.start+lane.emitted++*step,pose=authoredBlade(T,b.origin,fx.direction,at,b.handedness);lane.samples.push({time:at,base:pose.base,tip:pose.tip});}
    while(lane.samples.length&&lane.samples[0].time<t-.25)lane.samples.shift();if(lane.samples.length>90)lane.samples.splice(0,lane.samples.length-90);
    if(t>=swing.start&&t<=swing.end&&lane.samples.length&&fx.weapon){const p=lane.samples[lane.samples.length-1];fx.weapon.updateWorldMatrix(true,false);p.base.copy(fx.weapon.localToWorld(new T.Vector3(0,.16,0)));p.tip.copy(fx.weaponTip?fx.weaponTip.getWorldPosition(new T.Vector3()):fx.weapon.localToWorld(new T.Vector3(0,1.62,0)));}
    for(const l of lane.layers){const g=l.mesh.geometry,p=g.attributes.position,stamp=g.attributes.stamp;for(let i=0;i<lane.samples.length;i++){const s=lane.samples[i];for(const [j,f] of [l.from,l.to].entries()){const v=s.base.clone().lerp(s.tip,f);p.setXYZ(i*2+j,v.x,v.y,v.z);stamp.setX(i*2+j,s.time);}}p.needsUpdate=stamp.needsUpdate=true;g.setDrawRange(0,Math.max(0,lane.samples.length-1)*6);l.mesh.visible=lane.samples.length>1;l.mesh.material.uniforms.uTime.value=t;l.mesh.material.uniforms.uOpacity.value=l.alpha;}
   }
   const bloom=smooth(2.12,2.38,t),fade=1-smooth(2.85,skill.duration,t);
   b.bloom.visible=t>=bloomAt&&t<bloomEnd+.25;const bloomRadius=.8+(skill.radius-.8)*clamp((t-bloomAt)/(bloomEnd-bloomAt));b.bloom.scale.set(bloomRadius,1,bloomRadius);b.bloom.material.uniforms.uTime.value=t;b.bloom.material.uniforms.uOpacity.value=smooth(bloomAt,bloomAt+.06,t)*(1-smooth(bloomEnd-.05,bloomEnd+.25,t))*.9;
   for(const p of b.petals){const grow=smooth(p.at,p.at+.48,t),energy=grow*fade*(.70+.42*bloom);p.group.visible=energy>.001;
    // Clip each decorative petal against the same world bounds as contact queries.
    let reach=1;if(b.trace){const a=b.origin.clone().add(new T.Vector3(0,.9,0)),z=new T.Vector3(Math.sin(p.group.rotation.y)*3.7,.9,Math.cos(p.group.rotation.y)*3.7).applyQuaternion(b.heading).add(b.origin),wall=b.trace(a,z,.06);if(wall)reach=Math.max(0,wall.fraction);}
    p.group.scale.set(grow*reach,grow,grow*reach);p.group.rotation.z=Math.sin(t*2+p.index)*.018*fade;
    p.petal.material.uniforms.uTime.value=t;p.petal.material.uniforms.uOpacity.value=energy*(reach<.25?.15:1);
    for(const m of p.filaments){m.material.uniforms.uTime.value=t;m.material.uniforms.uOpacity.value=energy*.65;}
   }
   const currentEnergy=smooth(.12,.55,t)*(1-smooth(2.6,3.25,t));
   for(const [k,m] of b.currents.entries()){m.rotation.y=t*(k%2?-3.5:4.5)+k*1.6;m.material.uniforms.uTime.value=t;m.material.uniforms.uOpacity.value=currentEnergy*(k%2?.45:.75);}
   b.fragments.visible=t>.55&&fade>0;b.fragments.material.uniforms.uTime.value=t;b.fragments.material.uniforms.uOpacity.value=smooth(.55,.95,t)*fade*.8;
   if(b.fragments.visible){for(let i=0;i<b.fragmentStates.length;i++){const f=b.fragmentStates[i],a=f.a+t*.8,r=f.r+Math.max(0,t-2.5)*.7,d=b.dummy;d.position.set(Math.sin(a)*r,f.y+.18*Math.sin(t*3+i)+Math.max(0,t-2)*.35,Math.cos(a)*r);d.rotation.set(.4+Math.sin(i),a+t*.5,i+t*.8);d.scale.setScalar(f.s);d.updateMatrix();b.fragments.setMatrixAt(i,d.matrix);}b.fragments.instanceMatrix.needsUpdate=true;}
   const age=t-b.contactAt;b.flashGroup.visible=age>=0&&age<.3;b.flashGroup.position.copy(b.contactPoint);b.flashGroup.scale.setScalar(.5+Math.max(0,age)*2);for(const m of b.flashes)m.material.uniforms.uOpacity.value=1-smooth(0,.3,age);
  }
 };
 Core.registerEffect(id,effect);
 return Object.freeze({skillId:id,poseDuration,bloomAt,bloomEnd,swings,sample,footstep,rotation,authoredBlade,effect});
});
