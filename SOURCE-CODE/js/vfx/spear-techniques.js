/* Thương / Giáo — Xuyên Kích, Thương Phong, Phá Trận.
 * Y-up, actor +Z, seconds/metres. Host owns eligibility and gameplay damage.
 * One confirmed contact per target/cast; visual ribbons never add hits.
 * Two distinct shaft grips: rear at model Y=-.65, front +.55 world metres.
 * Shaft model is scaled .7: the actual tip is 1.883m from the rear palm. */
(function(root,factory){
 if(typeof module==='object'&&module.exports)module.exports=factory(require('./weapon-vfx-core.js'),require('./spear-skill-config.js'),()=>require('./bow-piercing.js'));
 else root.SpearTechniques=factory(root.WeaponVFXCore,root.SpearSkillConfig,()=>root.BowPiercing);
})(typeof globalThis!=='undefined'?globalThis:this,function(Core,Config,Collision){
 'use strict';
 const TAU=Math.PI*2,FRONT_GRIP=.55,TIP_LENGTH=1.883;
 const clamp=x=>Math.max(0,Math.min(1,x)),ease=x=>{x=clamp(x);return x*x*(3-2*x);},smooth=(a,b,t)=>ease((t-a)/(b-a));
 const ids=['spear.xuyen-kich','spear.thuong-phong','spear.pha-tran'];
 const specs=new Map(Config.skills.map(s=>[s.id,Object.freeze({skillId:s.id,duration:s.duration,poseDuration:s.duration,releaseAt:s.activeAt,activeEnd:s.activeEnd,flightSeconds:s.id===ids[0]?.54:0,finishAt:s.id===ids[2]?2.88:s.activeEnd})]));
 function spec(id){return specs.get(id)||null;}
 function sample(id,time){
  const s=spec(id);if(!s)throw new RangeError('Chiêu Thương/Giáo không hợp lệ: '+id);
  const t=Math.max(0,time),weight=smooth(0,.38,t)*(1-smooth(s.poseDuration-.65,s.poseDuration,t));
  let angle=0,elevation=0,handX=-.35,handY=1.38,handZ=-.15,bodyYaw=0,torsoYaw=0,lean=.12,crouch=.20*weight,drive=0,stanceWidth=.16,frontStep=.30,backStep=-.22,spinProgress=0,phase;
  if(id===ids[0]){
   const draw=smooth(0,.42,t),thrust=smooth(.88,1.04,t)*(1-smooth(1.58,2.10,t)),recover=smooth(1.85,2.60,t);
   angle=-.65*(1-draw)-.12*draw*(1-thrust)-.45*recover;elevation=.55*(1-draw)+.32*recover;
   handX=-.12+.04*thrust;handY=1.43-.09*draw+.04*thrust+.06*recover;handZ=.02-.27*draw+.25*thrust+.15*recover;
   bodyYaw=(-.44*draw+.49*thrust)*(1-recover);torsoYaw=-.08+.10*thrust;lean=.10+.13*thrust;crouch=(.22+.05*thrust)*weight;drive=.15*thrust*weight;frontStep=.43;backStep=-.30;
   phase=t<.42?'Hạ tấn · Dẫn thương':t<.88?'Tụ khí · Nén lực':t<1.04?'Đạp chân · Xuyên Kích':t<1.58?'Phóng khí · Đâm thẳng':t<1.85?'Giữ đà':t<2.60?'Thu thương · Hồi thế':'Sẵn sàng';
  }else if(id===ids[1]){
   const coil=smooth(.10,1.05,t),sweep=smooth(1.05,1.78,t),recover=smooth(2.10,3.20,t);
   bodyYaw=(-1.35*coil+2.70*sweep)*(1-recover);angle=bodyYaw+.45;elevation=.08-.10*sweep+.18*recover;
   handY=1.42-.10*coil+.08*recover;lean=.12;crouch=(.25-.07*sweep)*weight;torsoYaw=-.10+.15*sweep;frontStep=.34;backStep=-.25;
   const x=handX,z=handZ;handX=x*Math.cos(bodyYaw)+z*Math.sin(bodyYaw);handZ=z*Math.cos(bodyYaw)-x*Math.sin(bodyYaw);
   phase=t<.55?'Hạ tấn · Dẫn phong':t<1.05?'Vặn hông · Tích lực':t<1.78?'Thương Phong · Quét ngang':t<2.45?'Theo đà · Gió mở':t<3.20?'Thu thương · Hồi thế':'Sẵn sàng';
  }else{
   spinProgress=smooth(1.15,2.75,t);const prepare=smooth(0,.60,t),recover=smooth(3.10,4.20,t);
   bodyYaw=TAU*2*spinProgress-.18*prepare*(1-smooth(.60,1.15,t));angle=bodyYaw+.45;elevation=.04+.22*recover;
   handY=1.43-.09*prepare+.09*smooth(.60,1.15,t);lean=.08;crouch=(.25-.11*smooth(.60,1.15,t)+.12*smooth(2.75,2.88,t))*weight;torsoYaw=-.06;stanceWidth=.13;frontStep=.25;backStep=-.20;
   const x=handX,z=handZ;handX=x*Math.cos(bodyYaw)+z*Math.sin(bodyYaw);handZ=z*Math.cos(bodyYaw)-x*Math.sin(bodyYaw);
   phase=t<.60?'Trụ bộ · Tụ khí':t<1.15?'Mở thương · Tích lực':t<2.75?'Phá Trận · Song hoàn':t<3.10?'Hạ thế · Dư chấn':t<4.20?'Khí tản · Hồi thế':'Sẵn sàng';
  }
  return {weight,angle,elevation,handX,handY,handZ,bodyYaw,torsoYaw,lean,crouch,drive,stanceWidth,frontStep,backStep,spinProgress,spinAngle:spinProgress*TAU*2,frontGripDistance:FRONT_GRIP,phase};
 }
 function rotation(T,id,time){const s=typeof id==='object'?id:sample(id,time);return new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),new T.Vector3(Math.sin(s.angle)*Math.cos(s.elevation),Math.sin(s.elevation),Math.cos(s.angle)*Math.cos(s.elevation)));}
 function authoredTip(T,{skillId,time,position,forward,handedness=1}){
  const s=sample(skillId,time);s.handX*=handedness;s.angle*=handedness;
  const heading=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),Math.atan2(forward.x,forward.z)),q=heading.clone().multiply(rotation(T,s));
  const palm=new T.Vector3(s.handX,s.handY,s.handZ).applyQuaternion(heading).add(position);
  return {palm,front:new T.Vector3(0,FRONT_GRIP,0).applyQuaternion(q).add(palm),tip:new T.Vector3(0,TIP_LENGTH,0).applyQuaternion(q).add(palm),rotation:q};
 }
 const vertex=`varying vec2 vUv;void main(){vUv=uv;vec4 p=vec4(position,1.);
 #ifdef USE_INSTANCING
 p=instanceMatrix*p;
 #endif
 gl_Position=projectionMatrix*modelViewMatrix*p;}`;
 const noise=`float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);}`;
 const qiShader=`uniform float uTime,uOpacity;uniform vec3 uColor;varying vec2 vUv;${noise}
 void main(){float u=vUv.x,v=vUv.y;float end=pow(max(0.,sin(u*3.14159265)),.38);float edge=exp(-pow((abs(v-.5)-.46)*32.,2.));
 float core=exp(-pow((v-.5)*20.,2.));float n=noise(vec2(u*14.-uTime*4.,v*12.));float flow=pow(.5+.5*sin(v*67.+sin(u*15.-uTime*9.)*2.),9.);
 vec3 color=mix(uColor,vec3(1.,.985,.88),clamp(edge*.8+core*.45,0.,1.));gl_FragColor=vec4(color,end*(.13+.23*n+.64*edge+.18*core+.12*flow)*uOpacity);
 #include <colorspace_fragment>
 }`;
 const lineShader=`uniform float uTime,uOpacity;uniform vec3 uColor;varying vec2 vUv;
 void main(){float end=pow(max(0.,sin(vUv.x*3.14159265)),.32),edge=pow(max(0.,sin(vUv.y*3.14159265)),.7);gl_FragColor=vec4(uColor,end*edge*(.72+.28*sin(vUv.x*24.-uTime*10.))*uOpacity);
 #include <colorspace_fragment>
 }`;
 const lanceShader=`uniform float uTime,uOpacity;uniform vec3 uColor;varying vec2 vUv;${noise}
 void main(){float u=vUv.x,v=vUv.y;float core=pow(max(0.,1.-abs(v-.5)*2.),3.);float ends=smoothstep(0.,.17,u);float flow=noise(vec2(u*23.-uTime*14.,v*5.));
 vec3 color=mix(uColor,vec3(1.,.98,.82),core*.48);gl_FragColor=vec4(color,ends*core*(.32+.36*flow)*uOpacity);
 #include <colorspace_fragment>
 }`;
 const vortexShader=`uniform float uTime,uOpacity;uniform vec3 uColor;varying vec2 vUv;${noise}
 void main(){float u=vUv.x,v=vUv.y;float ends=smoothstep(0.,.18,u)*(1.-smoothstep(.78,1.,u));float mid=pow(max(0.,sin(v*3.14159265)),.7);float n=noise(vec2(u*15.-uTime*3.,v*7.));
 float edge=exp(-pow((v-.67)*13.,2.));vec3 color=mix(uColor,vec3(1.,.84,.43),edge*.28);gl_FragColor=vec4(color,ends*mid*(.20+.35*n+.16*edge)*uOpacity);
 #include <colorspace_fragment>
 }`;
 const dustVertex=`varying vec2 vUv;void main(){vUv=uv;mat4 m=instanceMatrix;vec4 p=modelViewMatrix*m*vec4(0.,0.,0.,1.);p.xy+=position.xy*vec2(length(m[0].xyz),length(m[1].xyz));gl_Position=projectionMatrix*p;}`;
 const dustShader=`uniform float uTime,uOpacity;uniform vec3 uColor;varying vec2 vUv;${noise}
 void main(){vec2 p=(vUv-.5)*2.;float fall=exp(-dot(p,p)*3.8)*(1.-smoothstep(.65,1.05,length(p)));float n=noise(vUv*5.+vec2(uTime*.18,0.));gl_FragColor=vec4(uColor,fall*(.25+.75*n)*uOpacity);
 #include <colorspace_fragment>
 }`;
 const flashShader=`uniform float uOpacity;uniform vec3 uColor;varying vec2 vUv;
 void main(){vec2 p=(vUv-.5)*2.;float r=length(p),a=atan(p.y,p.x);float glow=pow(max(0.,1.-r),3.)+.45*pow(abs(cos(a*5.)),24.)*max(0.,1.-r);gl_FragColor=vec4(uColor,glow*uOpacity);
 #include <colorspace_fragment>
 }`;
 function material(core,fx,color,fragment=lineShader){const T=core.THREE,m=new T.ShaderMaterial({uniforms:{uTime:{value:0},uOpacity:{value:0},uColor:{value:new T.Color(color)}},vertexShader:vertex,fragmentShader:fragment,transparent:true,depthWrite:false,toneMapped:false,side:T.DoubleSide,blending:T.AdditiveBlending});fx.materials.add(m);return m;}
 function geometry(T,n,rows,point){const p=[],uv=[],ix=[];for(let i=0;i<=n;i++)for(let j=0;j<=rows;j++){const v=point(i/n,j/rows);p.push(v.x,v.y,v.z);uv.push(i/n,j/rows);if(i<n&&j<rows){const a=i*(rows+1)+j,b=a+rows+1;ix.push(a,b,a+1,a+1,b,b+1);}}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(ix);return g;}
 function mesh(core,fx,g,m,parent=fx.group){fx.geometries.add(g);fx.materials.add(m);const o=new core.THREE.Mesh(g,m);o.frustumCulled=false;o.renderOrder=10;parent.add(o);return o;}
 function opacity(node,value,time){node.visible=value>.001;node.material.uniforms.uOpacity.value=Math.max(0,value);node.material.uniforms.uTime.value=time;}
 function band(core,fx,parent,point,color,width=.045,n=48){const T=core.THREE;return mesh(core,fx,geometry(T,n,1,(u,v)=>{const p=point(u);p.y+=(v-.5)*width;return p;}),material(core,fx,color),parent);}
 function arc(core,fx,parent,r,y,start,angle,width,color){const T=core.THREE,n=core.quality==='low'?44:88;return mesh(core,fx,geometry(T,n,3,(u,v)=>{const a=start+u*angle,rr=r+(v-.5)*width*Math.pow(Math.sin(Math.PI*u),.55);return new T.Vector3(Math.sin(a)*rr,y+.07*Math.sin(u*Math.PI),Math.cos(a)*rr);}),material(core,fx,color,qiShader),parent);}
 function trace(core,fx,a,z,r){return fx.spear.trace?.(a,z,r)||Collision().traceWorld(core.THREE,a,z,r,[],p=>core._ground(p));}
 function impact(core,fx,point,at,targetId,kind){
  const b=fx.spear,key=kind+':'+String(targetId);if(!fx.alive||b.contacts.has(key))return;b.contacts.add(key);
  core._emit('impact',fx,{kind:fx.skill.localId,hitIndex:0,targetId,position:point.clone(),contactTime:at,contactKind:kind,shake:.018},key);if(!fx.alive)return;
  const flash=b.contactsVisual[b.contactCursor++%b.contactsVisual.length];flash.at=at;flash.group.position.copy(point);flash.group.quaternion.setFromUnitVectors(new core.THREE.Vector3(0,0,1),fx.direction);
  if(fx.age-at>.38)return;for(let i=0;i<(core.quality==='low'?7:15);i++)core.pool.spawn(point,new core.THREE.Vector3((core.random()-.5)*4,.3+core.random()*2.8,(core.random()-.5)*4),i%3?'#ffe0a1':'#edfff7',.34,.035,0,.9);
 }
 // Scoped two-phase queries: callbacks cannot be retained to award delayed hits.
 // The host can reject an otherwise intersecting target without blocking another.
 function resolve(core,fx,{a,z,at,endAt=at,radius=.10,stop=false,phase='shaft'}){
  const T=core.THREE,b=fx.spear,candidates=[],wall=trace(core,fx,a,z,radius);let open=true;
  const query={type:'target-query',kind:fx.skill.localId,phase,skillId:fx.skill.id,weaponId:'spear',handle:fx.handle,caster:fx.caster,hitIndex:0,position:z.clone(),from:a.clone(),to:z.clone(),radius,
   testTarget:(targetId,p,r=.25,height=2.2)=>{
    if(!open||!fx.alive||targetId==null||targetId===fx.caster.uuid||b.hitTargets.has(targetId)||!p||![p.x,p.y,p.z,r,height].every(Number.isFinite)||r<0||height<=0)return false;
    const fraction=Collision().targetFraction(a,z,p,r+radius,height);if(fraction===null||fraction>=(wall?.fraction??Infinity)-1e-8)return false;
    const point=a.clone().lerp(z,fraction);
    // The outside end of a rotating trail must not bypass a solid obstacle.
    if(!stop){const eye=b.origin.clone();eye.y=point.y;const occlusion=trace(core,fx,eye,point,.06);if(occlusion&&occlusion.fraction<1-1e-8)return false;}
    if(!candidates.some(c=>c.id===targetId))candidates.push({id:targetId,fraction,point});return false;
   }};
  try{core.onEvent?.(query);}finally{open=false;}if(!fx.alive)return;
  candidates.sort((a,z)=>a.fraction-z.fraction||String(a.id).localeCompare(String(z.id)));
  for(const c of candidates){let accepting=true,accepted=false;
   const event={...query,type:'hit-window',targetId:c.id,position:c.point.clone(),testTarget:(id)=>{if(!accepting||accepted||!fx.alive||id!==c.id||b.hitTargets.has(id))return false;accepted=true;b.hitTargets.add(id);return true;}};
   try{core.onEvent?.(event);}finally{accepting=false;}if(!fx.alive)return;
   if(accepted){const time=at+(endAt-at)*c.fraction;impact(core,fx,c.point,time,c.id,'target');if(stop){b.stopped=true;b.stopPoint.copy(c.point);b.stopAt=time;return;}}
  }
  if(wall&&fx.alive&&stop){b.stopped=true;b.stopPoint.copy(wall.point);b.stopAt=at+(endAt-at)*wall.fraction;impact(core,fx,wall.point,b.stopAt,'world','wall');}
 }
 function shaftFrame(core,fx,time){const b=fx.spear;return authoredTip(core.THREE,{skillId:fx.skill.id,time,position:b.origin,forward:fx.direction,handedness:b.handedness});}
 function radialSweep(core,fx,previous,t){
  const b=fx.spear,s=spec(fx.skill.id),T=core.THREE;const end=Math.min(t,s.activeEnd),step=1/120;
  // A fixed authored sampling lattice is independent of the render delta.
  // No additional damage ticks: hitTargets is shared by the whole cast.
  while(b.sweepIndex<=Math.ceil((s.activeEnd-s.releaseAt)/step)){
   const at=Math.min(s.activeEnd,s.releaseAt+b.sweepIndex*step);if(at>end+1e-9||t<s.releaseAt)break;b.sweepIndex++;
   const pose=shaftFrame(core,fx,at),direction=new T.Vector3(0,1,0).applyQuaternion(pose.rotation),a=b.origin.clone();a.y=pose.palm.y;
   const z=a.clone().addScaledVector(direction,fx.skill.range);resolve(core,fx,{a,z,at,radius:.10,phase:'sweep'});if(!fx.alive)return;
  }
 }
 function makeContact(core,fx){const T=core.THREE,group=new T.Group();fx.group.add(group);group.visible=false;const flashes=[];
  for(let k=0;k<2;k++){const m=mesh(core,fx,new T.PlaneGeometry(1.8,1.8),material(core,fx,k?'#ffe3a2':'#f1fff6',flashShader),group);m.rotation.y=k*Math.PI/2;flashes.push(m);}
  const ring=mesh(core,fx,geometry(T,48,1,(u,v)=>{const a=u*TAU,r=1+(v-.5)*.05;return new T.Vector3(Math.cos(a)*r,Math.sin(a)*r,0);}),material(core,fx,'#f5cd73'),group);
  return {group,flashes,ring,at:-99};
 }
 const effect={
  place(core,fx){fx.group.position.set(0,0,0);fx.group.quaternion.identity();},
  build(core,fx){
   const T=core.THREE,{p}=core._pose(fx.caster),b=fx.spear={origin:p.clone(),previous:0,handedness:1,released:false,stopped:false,stopAt:spec(fx.skill.id).activeEnd,stopPoint:new T.Vector3(),start:new T.Vector3(),end:new T.Vector3(),hitTargets:new Set(),contacts:new Set(),contactCursor:0,sweepIndex:0};
   b.body=new T.Group();b.body.position.copy(p);b.body.quaternion.setFromAxisAngle(new T.Vector3(0,1,0),Math.atan2(fx.direction.x,fx.direction.z));fx.group.add(b.body);
   b.charge=new T.Group();b.charge.name='spear-tip-compression';fx.group.add(b.charge);b.chargeMeshes=[];
   const n=core.quality==='low'?36:72,color=fx.skill.id===ids[1]?'#77d5c1':'#edba56';
   for(let k=0;k<3;k++){const radius=.27+k*.14,ring=mesh(core,fx,geometry(T,n,1,(u,v)=>{const a=u*TAU,r=radius+(v-.5)*.05;return new T.Vector3(Math.cos(a)*r,Math.sin(a)*r,-k*.13);}),material(core,fx,k===0?'#fff6d3':color),b.charge);b.chargeMeshes.push(ring);}
   for(let k=0;k<(core.quality==='low'?3:5);k++){const stream=mesh(core,fx,geometry(T,n,1,(u,v)=>{const a=k*TAU/5+u*3.4,r=(1-u)*.72+.04,w=(v-.5)*.025;return new T.Vector3(Math.cos(a)*(r+w),Math.sin(a)*(r+w),-1.1*(1-u));}),material(core,fx,color),b.charge);b.chargeMeshes.push(stream);}
   b.chargeStar=mesh(core,fx,new T.PlaneGeometry(.7,.7),material(core,fx,'#fff2c4',flashShader),b.charge);
   b.contactsVisual=Array.from({length:core.quality==='low'?3:6},()=>makeContact(core,fx));
   b.floor=new T.Group();b.floor.position.copy(p);b.floor.position.y=core._ground(p)+.035;b.floor.quaternion.copy(b.body.quaternion);fx.group.add(b.floor);b.floorRings=[];
   for(let k=0;k<2;k++)b.floorRings.push(arc(core,fx,b.floor,1,0,k,TAU,.06,k?'#b49e69':color));
   if(fx.skill.id===ids[0]){
    b.flight=new T.Group();b.flight.name='xuyen-kich-white-gold-lance';b.flight.visible=false;fx.group.add(b.flight);b.flightMeshes=[];
    for(let k=0;k<2;k++){const blade=mesh(core,fx,geometry(T,n,4,(u,v)=>{const r=.13*Math.pow(Math.sin(Math.PI*u),.6)*(.65+.35*u);return new T.Vector3((v-.5)*2*r,0,-3.8*(1-u));}),material(core,fx,k?'#e2a734':'#ffe8a8',lanceShader),b.flight);blade.rotation.z=k*Math.PI/2;b.flightMeshes.push({node:blade,alpha:k?.8:1.05});}
    for(let k=0;k<2;k++){const needle=mesh(core,fx,geometry(T,n,1,(u,v)=>new T.Vector3((v-.5)*.028*Math.sin(Math.PI*u),0,-3.8*(1-u))),material(core,fx,'#ffffff'),b.flight);needle.rotation.z=k*Math.PI/2;b.flightMeshes.push({node:needle,alpha:1.3});}
    for(let k=0;k<2;k++){const helix=mesh(core,fx,geometry(T,n,1,(u,v)=>{const a=u*TAU*1.3+k*Math.PI,r=.09*Math.sin(Math.PI*u)+(v-.5)*.014;return new T.Vector3(Math.cos(a)*r,Math.sin(a)*r,-3.8*(1-u));}),material(core,fx,k?'#d89b30':'#f7ce74'),b.flight);b.flightMeshes.push({node:helix,alpha:.23});}
    const sparkGeo=geometry(T,2,1,(u,v)=>new T.Vector3((v-.5)*.018,0,(u-.5)*.6)),sparkMat=material(core,fx,'#ffda83');fx.geometries.add(sparkGeo);b.speedSparks=new T.InstancedMesh(sparkGeo,sparkMat,core.quality==='low'?9:18);b.speedSparks.frustumCulled=false;b.flight.add(b.speedSparks);b.sparkDummy=new T.Object3D();
    b.launch=new T.Group();fx.group.add(b.launch);b.launchFlash=mesh(core,fx,new T.PlaneGeometry(1.4,1.4),material(core,fx,'#fff0be',flashShader),b.launch);
   }else if(fx.skill.id===ids[1]){
    b.wind=new T.Group();b.wind.name='thuong-phong-jade-crescent';b.body.add(b.wind);b.crescents=[];
    // Author the crescent along the real tip's history, in chronological order.
    // Draw only history already traversed; the leading edge stays at the spear.
    b.windSegments=n;b.windRows=3;
    const windGeometry=(width,offset,yOffset)=>geometry(T,n,3,(u,v)=>{
     const at=1.05+u*.73,p=authoredTip(T,{skillId:ids[1],time:at,position:new T.Vector3(),forward:new T.Vector3(0,0,1)}).tip;
     const direction=new T.Vector3(p.x,0,p.z).normalize(),taper=Math.pow(Math.sin(Math.PI*u),.55);
     p.addScaledVector(direction,((v-.5)*width+offset)*taper);p.y+=yOffset+.06*Math.sin(Math.PI*u)*(1-Math.pow((v-.5)*2,2));return p;
    });
    b.crescents.push({node:mesh(core,fx,windGeometry(.92,0,0),material(core,fx,'#54c8b2',qiShader),b.wind),alpha:1.05});
    b.crescents.push({node:mesh(core,fx,windGeometry(.065,.46,.005),material(core,fx,'#ffe0a0'),b.wind),alpha:1.0});
    b.crescents.push({node:mesh(core,fx,windGeometry(.09,.35,.012),material(core,fx,'#edfff7'),b.wind),alpha:.9});
    for(let k=0;k<(core.quality==='low'?2:4);k++)b.crescents.push({node:mesh(core,fx,windGeometry(.035,-.45+k*.27,-.16+k*.10),material(core,fx,k%2?'#e8c177':'#82e6cc'),b.wind),alpha:.65});
   }else{
    b.vortex=new T.Group();b.vortex.name='pha-tran-golden-helical-ribbons';b.body.add(b.vortex);b.helices=[];
    for(let k=0;k<(core.quality==='low'?2:3);k++){
     const ribbon=mesh(core,fx,geometry(T,n*2,3,(u,v)=>{const a=u*TAU*.90+k*1.90,r=1.20+.38*u+.15*Math.sin(u*TAU+k),width=.34*Math.sin(Math.PI*u);return new T.Vector3(Math.sin(a)*r,.26+u*1.85+k*.10+(v-.5)*width,Math.cos(a)*r);}),material(core,fx,['#efb242','#ffd487','#c58f35'][k],vortexShader),b.vortex);b.helices.push({node:ribbon,alpha:.9});
    }
    b.helices.push({node:arc(core,fx,b.vortex,1.88,1.35,-1.3,4.2,.10,'#e2b657'),alpha:.28});
    const orbitGeo=geometry(T,2,1,(u,v)=>new T.Vector3((v-.5)*.02,(u-.5)*.22,0)),orbitMat=material(core,fx,'#eecb6c');fx.geometries.add(orbitGeo);b.orbitSparks=new T.InstancedMesh(orbitGeo,orbitMat,core.quality==='low'?12:24);b.orbitSparks.frustumCulled=false;b.vortex.add(b.orbitSparks);b.sparkDummy=new T.Object3D();
    b.finish=new T.Group();b.finish.position.copy(b.floor.position);fx.group.add(b.finish);b.finishRings=[];
    for(let k=0;k<3;k++)b.finishRings.push(arc(core,fx,b.finish,1,k*.018,k*1.2,TAU,.09+k*.03,k===1?'#fff1bf':'#bc8b42'));
    const rockGeo=new T.IcosahedronGeometry(.10,0),rockMaterial=new T.MeshStandardMaterial({color:'#665e4b',roughness:.95});fx.geometries.add(rockGeo);fx.materials.add(rockMaterial);
    b.rocks=new T.InstancedMesh(rockGeo,rockMaterial,core.quality==='low'?12:26);b.rocks.frustumCulled=false;b.rocks.visible=false;b.finish.add(b.rocks);b.rockDummy=new T.Object3D();
   }
   if(fx.skill.id!==ids[0]){
    const dustGeo=new T.PlaneGeometry(1,1),dustMat=material(core,fx,'#9c8b6a',dustShader);dustMat.vertexShader=dustVertex;dustMat.blending=T.NormalBlending;fx.geometries.add(dustGeo);
    b.dust=new T.InstancedMesh(dustGeo,dustMat,core.quality==='low'?10:22);b.dust.frustumCulled=false;b.dust.visible=false;b.floor.add(b.dust);b.dustDummy=new T.Object3D();
   }
  },
  tick(core,fx){
   const T=core.THREE,b=fx.spear,s=spec(fx.skill.id),t=fx.age,previous=b.previous;b.previous=t;
   const anchor=shaftFrame(core,fx,Math.min(t,s.releaseAt)),charge=smooth(.12,.70,t)*(1-smooth(s.releaseAt,s.releaseAt+.18,t));
   b.charge.position.copy(anchor.tip);if(t<s.releaseAt&&fx.weaponTip)fx.weaponTip.getWorldPosition(b.charge.position);
   const shaftDirection=new T.Vector3(0,1,0).applyQuaternion(anchor.rotation);b.charge.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),shaftDirection);
   b.charge.visible=charge>.001&&!b.blockedBeforeMuzzle;b.charge.scale.setScalar(1.3-.6*smooth(.42,s.releaseAt,t));
   b.chargeMeshes.forEach((node,k)=>{node.rotation.z=t*(k%2?-2:2);opacity(node,charge*(k<3?.85:.55),t);});opacity(b.chargeStar,charge*.8,t);
   const preparation=smooth(.08,.55,t)*(1-smooth(s.releaseAt,s.activeEnd+.3,t));b.floorRings.forEach((ring,k)=>{ring.rotation.y=t*(k?-.55:.4);ring.scale.setScalar(.75+k*.3);opacity(ring,preparation*.20,t);});
   if(t>=s.releaseAt&&!b.released){b.released=true;core._emit('release',fx,{kind:fx.skill.localId,position:anchor.tip.clone(),direction:shaftDirection.clone(),releaseTime:s.releaseAt},'spear-release');if(!fx.alive)return;}
   if(fx.skill.id===ids[0]){
    if(b.released&&!b.launched){
     b.launched=true;b.start.copy(shaftFrame(core,fx,s.releaseAt).tip);const eye=b.origin.clone();eye.y=b.start.y;eye.x=b.start.x-fx.direction.x*b.start.clone().sub(b.origin).dot(fx.direction);eye.z=b.start.z-fx.direction.z*b.start.clone().sub(b.origin).dot(fx.direction);
     b.end.copy(eye).addScaledVector(fx.direction,fx.skill.range);b.length=b.start.distanceTo(b.end);b.launch.position.copy(b.start);b.launch.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),fx.direction);
     // Resolve the physical shaft before the travelling qi. Near enemies must
     // not be skipped just because the spear tip starts beyond their body.
     resolve(core,fx,{a:eye,z:b.start.clone(),at:s.releaseAt,endAt:s.releaseAt,radius:fx.skill.radius,stop:true,phase:'thrust'});if(!fx.alive)return;
     if(b.stopped){b.blockedBeforeMuzzle=true;b.charge.visible=false;b.launch.position.copy(b.stopPoint);}
    }
    if(!fx.alive)return;
    if(b.released&&!b.stopped&&previous<s.activeEnd){const from=clamp((previous-s.releaseAt)/s.flightSeconds),to=clamp((t-s.releaseAt)/s.flightSeconds);if(to>=from)resolve(core,fx,{a:b.start.clone().lerp(b.end,from),z:b.start.clone().lerp(b.end,to),at:s.releaseAt+from*s.flightSeconds,endAt:s.releaseAt+to*s.flightSeconds,radius:fx.skill.radius,stop:true,phase:'flight'});}
    if(!fx.alive)return;
    const progress=clamp((t-s.releaseAt)/s.flightSeconds),fade=b.released?1-smooth(b.stopAt,b.stopAt+.40,t):0;b.flight.position.copy(b.stopped?b.stopPoint:b.start.clone().lerp(b.end,progress));b.flight.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),fx.direction);
    const travelled=b.released?Math.max(0,b.flight.position.clone().sub(b.start).dot(fx.direction)):0;b.flight.scale.set(1+(1-fade)*.35,1+(1-fade)*.35,Math.max(.002,Math.min(1,travelled/3.8)));b.flight.visible=b.released&&travelled>.001&&fade>.001;b.flightMeshes.forEach(x=>opacity(x.node,fade*x.alpha,t));
    b.speedSparks.material.uniforms.uTime.value=t;b.speedSparks.material.uniforms.uOpacity.value=fade*.55;for(let i=0;i<b.speedSparks.count;i++){const u=(i*.6180339+t*.90)%1,a=i*2.399963,r=.05+(i%4)*.025;b.sparkDummy.position.set(Math.cos(a)*r,Math.sin(a)*r,-u*3.65);b.sparkDummy.rotation.set(0,0,a);b.sparkDummy.scale.setScalar(.5+(i%3)*.25);b.sparkDummy.updateMatrix();b.speedSparks.setMatrixAt(i,b.sparkDummy.matrix);}b.speedSparks.instanceMatrix.needsUpdate=true;
    const launch=b.released?1-smooth(s.releaseAt,s.releaseAt+.15,t):0;b.launch.visible=launch>.001;opacity(b.launchFlash,launch,t);
   }else{
    radialSweep(core,fx,previous,t);if(!fx.alive)return;
    if(fx.skill.id===ids[1]){
     const bloom=smooth(1.05,1.28,t)*(1-smooth(1.85,2.72,t)),expand=smooth(1.78,2.45,t);b.wind.visible=bloom>.001;b.wind.scale.set((1+.62*expand)*b.handedness,1,1+.62*expand);const drawn=Math.floor(clamp((t-1.05)/.73)*b.windSegments);b.crescents.forEach(x=>{x.node.geometry.setDrawRange(0,drawn*b.windRows*6);opacity(x.node,bloom*x.alpha,t);});
    }else{
     const power=smooth(.60,1.45,t)*(1-smooth(2.75,3.12,t));b.vortex.visible=power>.001;b.vortex.rotation.y=sample(fx.skill.id,t).bodyYaw*b.handedness;const vortexScale=.65+.35*smooth(.60,1.35,t);b.vortex.scale.set(vortexScale*b.handedness,vortexScale,vortexScale);b.helices.forEach(x=>opacity(x.node,power*x.alpha,t));b.orbitSparks.material.uniforms.uOpacity.value=power*.75;b.orbitSparks.material.uniforms.uTime.value=t;for(let i=0;i<b.orbitSparks.count;i++){const u=(t*.7+i*.6180339)%1,a=i*2.399963+t*.8,r=1.1+.65*u;b.sparkDummy.position.set(Math.sin(a)*r,.25+u*1.8,Math.cos(a)*r);b.sparkDummy.rotation.set(.4,a,-.6);b.sparkDummy.scale.setScalar(.5+(i%3)*.22);b.sparkDummy.updateMatrix();b.orbitSparks.setMatrixAt(i,b.sparkDummy.matrix);}b.orbitSparks.instanceMatrix.needsUpdate=true;
     if(t>=s.finishAt&&!b.finished){b.finished=true;core._emit('ground-pulse',fx,{kind:'pha-tran-finish',position:b.floor.position.clone(),shake:.025,visualOnly:true},'spear-ground-pulse');if(!fx.alive)return;}
     const age=t-s.finishAt;b.finish.visible=age>=0&&age<1.25;b.finishRings.forEach((ring,k)=>{const u=Math.max(0,age-k*.055);ring.scale.setScalar(.40+u*(3.3-k*.25));opacity(ring,age>=k*.055?(1-smooth(.06,.82,u))*(k===1?.7:.45):0,t);});
     b.rocks.visible=age>=0&&age<1.05;if(b.rocks.visible){for(let i=0;i<b.rocks.count;i++){const a=i*2.399963,r=.7+(i%7)*.16+age*(.9+(i%3)*.3),h=Math.max(.02,(1.6+(i%5)*.22)*age-3.8*age*age);b.rockDummy.position.set(Math.sin(a)*r,h,Math.cos(a)*r);b.rockDummy.rotation.set(a+age*4,a*.7,age*2);b.rockDummy.scale.setScalar((.5+(i%4)*.3)*(1-smooth(.65,1.05,age)));b.rockDummy.updateMatrix();b.rocks.setMatrixAt(i,b.rockDummy.matrix);}b.rocks.instanceMatrix.needsUpdate=true;}
    }
   }
   if(b.dust){
    const isVortex=fx.skill.id===ids[2],age=t-(isVortex?s.finishAt:1.12),alpha=isVortex?(age>=0?(1-smooth(.15,1.05,age))*.48:smooth(.60,1.25,t)*(1-smooth(2.5,2.88,t))*.15):smooth(1.05,1.40,t)*(1-smooth(1.85,2.70,t))*.30;
    b.dust.visible=alpha>.001;b.dust.material.uniforms.uOpacity.value=alpha;b.dust.material.uniforms.uTime.value=t;
    for(let i=0;i<b.dust.count;i++){const a=isVortex?i*2.399963:-1.05+(i/b.dust.count)*2.7,drift=(t*.25+i*.6180339)%1,r=isVortex?(age>=0?.55+Math.max(0,age)*(2.2+(i%3)*.3):1.1+(i%4)*.2):1.2+(i%4)*.25+.35*smooth(1.78,2.6,t);b.dustDummy.position.set(Math.sin(a)*r*b.handedness,.08+.12*drift,Math.cos(a)*r);b.dustDummy.rotation.set(0,0,0);b.dustDummy.scale.set(.65+drift*.45,.25+drift*.25,1);b.dustDummy.updateMatrix();b.dust.setMatrixAt(i,b.dustDummy.matrix);}b.dust.instanceMatrix.needsUpdate=true;
   }
   for(const f of b.contactsVisual){const age=t-f.at,fade=1-smooth(.03,.48,age);f.group.visible=age>=0&&fade>.001;f.flashes.forEach((node,k)=>{node.scale.setScalar(.2+Math.max(0,age)*3.7);opacity(node,(1-smooth(.02,.22,age))*(k?.6:1),t);});f.ring.scale.setScalar(.25+Math.max(0,age)*2.4);opacity(f.ring,fade*.6,t);}
  }
 };
 for(const id of ids)Core.registerEffect(id,effect);
 return Object.freeze({skillIds:Object.freeze(ids),spec,sample,rotation,authoredTip,frontGripDistance:FRONT_GRIP,tipLength:TIP_LENGTH,effect});
});
