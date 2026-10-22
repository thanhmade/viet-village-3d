/* Rìu — Khai Sơn / Phá Giáp / Cuồng Phong. Y-up, actor +Z, seconds/metres.
 * Host owns combat; every accepted target is reported once per cast.
 * The blade's actual offset and roll are part of the choreography. */
(function(root,factory){
 if(typeof module==='object'&&module.exports)module.exports=factory(require('./weapon-vfx-core.js'),require('./axe-skill-config.js'),()=>require('./bow-piercing.js'));
 else root.AxeTechniques=factory(root.WeaponVFXCore,root.AxeSkillConfig,()=>root.BowPiercing);
})(typeof globalThis!=='undefined'?globalThis:this,function(Core,Config,Collision){
 'use strict';
 const TAU=Math.PI*2,FRONT_GRIP=.42,TIP=[.455,1.33,0],ids=['axe.khai-son','axe.pha-giap','axe.cuong-phong'];
 const clamp=x=>Math.max(0,Math.min(1,x)),ease=x=>{x=clamp(x);return x*x*(3-2*x);},smooth=(a,b,t)=>ease((t-a)/(b-a));
 const specs=new Map(Config.skills.map((s,i)=>[s.id,Object.freeze({skillId:s.id,duration:s.duration,poseDuration:s.duration,releaseAt:s.activeAt,activeEnd:s.activeEnd,impactAt:[1.35,1.08,3.95][i],spinTurns:i===2?4:0})]));
 function spec(id){return specs.get(id)||null;}
 function sample(id,time){
  const s=spec(id);if(!s)throw new RangeError('Chiêu Rìu không hợp lệ: '+id);
  const t=Math.max(0,time),weight=smooth(0,.38,t)*(1-smooth(s.duration-.6,s.duration,t));
  let handX=-.12,handY=1.40,handZ=.04,angle=0,pitch=.25,bodyYaw=0,torsoYaw=0,lean=.08,crouch=.18*weight,drive=0,stanceWidth=.17,frontStep=.30,backStep=-.22,spinProgress=0,phase;
  // Side entry, pelvic drive and recovery are deliberately separate: the rear
  // 34 cm of the real shaft must clear the torso while both hands stay reachable.
  if(id===ids[0]){
   const lift=smooth(0,.82,t),cut=smooth(.95,1.35,t),recover=smooth(2.08,3.40,t),side=smooth(.80,1.18,t)*(1-smooth(2.80,3.40,t));
   const elbowRoom=smooth(1.10,1.16,t)*(1-smooth(1.20,1.35,t));
   handX=-.12+.47*side-.06*Math.sin(Math.PI*recover)-.04*elbowRoom;handY=(1.40+.24*lift-.56*cut)*(1-recover)+1.40*recover;handZ=(.28-.03*lift+.15*cut)*(1-recover)+.28*recover+.07*smooth(2.82,2.97,t)*(1-smooth(3.23,3.40,t))+.01*elbowRoom;
   pitch=(.25-.70*lift+2.50*cut)*(1-recover)+.25*recover;angle=-.06*(1-cut)*(1-recover);bodyYaw=-.15*lift*(1-cut)*(1-recover);torsoYaw=-.04;
   lean=(-.04*lift+.64*cut)*(1-recover);crouch=(.14+.51*cut)*(1-.7*recover)*weight;drive=.30*smooth(1.02,1.19,t)*(1-smooth(2.80,3.40,t))*weight;frontStep=.40;backStep=-.27;
   phase=t<.45?'Trụ tấn · Nâng rìu':t<.95?'Tụ lực · Khai sơn':t<1.35?'Giáng rìu · Bổ dọc':t<2.08?'Địa chấn · Đá vỡ':t<3.40?'Khí tản · Hồi thế':'Sẵn sàng';
  }else if(id===ids[1]){
   const coil=smooth(0,.65,t),cut=smooth(.78,1.08,t),recover=smooth(1.62,2.80,t),side=smooth(.65,.95,t)*(1-smooth(2.50,2.80,t));
   bodyYaw=(-.55*coil+.90*cut)*(1-recover);angle=bodyYaw;
   pitch=(.25-.40*coil+2.15*cut)*(1-recover)+.25*recover;
   handY=(1.42+.10*coil-.44*cut)*(1-recover)+1.42*recover;handZ=(.28-.03*coil+.246*cut)*(1-recover)+.28*recover-.025*Math.sin(Math.PI*recover);
   handX=-.08+.272*side+.13*smooth(.65,.84,t)*(1-smooth(.95,1.08,t))-.04*Math.sin(Math.PI*recover);const x=handX,z=handZ;handX=x*Math.cos(bodyYaw)+z*Math.sin(bodyYaw);handZ=z*Math.cos(bodyYaw)-x*Math.sin(bodyYaw);
   lean=.80*cut*(1-recover);crouch=(.20+.40*cut)*weight;drive=.35*smooth(.828,.973,t)*(1-smooth(2.25,2.80,t))*weight;torsoYaw=-.06;frontStep=.35;backStep=-.23;
   phase=t<.40?'Hạ tấn · Kéo rìu':t<.78?'Vặn hông · Nén lực':t<1.08?'Phá Giáp · Chém chéo':t<1.62?'Xung lực · Mảnh vỡ':t<2.80?'Thu rìu · Hồi thế':'Sẵn sàng';
  }else{
   // Linear central turns with smooth acceleration/deceleration, total exactly four.
   const u=clamp((t-.65)/3.30),r=.12;
   spinProgress=u<r?u*u/(2*r*(1-r)):u>1-r?1-(1-u)*(1-u)/(2*r*(1-r)):(u-r/2)/(1-r);
   // Carry the shaft across the front of the torso, never through its centre.
   bodyYaw=TAU*4*spinProgress;angle=bodyYaw+.85;
   const prepare=smooth(0,.65,t),recover=smooth(3.95,4.80,t);
   pitch=.25+1.20*prepare*(1-recover);handX=-.40;handY=1.40-.06*prepare*(1-recover);handZ=.15;
   const x=handX,z=handZ;handX=x*Math.cos(bodyYaw)+z*Math.sin(bodyYaw);handZ=z*Math.cos(bodyYaw)-x*Math.sin(bodyYaw);
   lean=.10;crouch=(.23-.06*prepare)*weight;stanceWidth=.12;frontStep=.22;backStep=-.19;
   phase=t<.65?'Trụ bộ · Dẫn phong':t<3.95?'Cuồng Phong · Tứ hoàn':t<4.80?'Hãm đà · Khí tản':'Sẵn sàng';
  }
  return {weight,angle,pitch,roll:id===ids[2]?0:-Math.PI/2,elevation:Math.PI/2-pitch,handX,handY,handZ,bodyYaw,torsoYaw,lean,crouch,drive,stanceWidth,frontStep,backStep,spinProgress,spinAngle:TAU*4*spinProgress,frontGripDistance:FRONT_GRIP,phase};
 }
 function rotation(T,id,time){const s=typeof id==='object'?id:sample(id,time);return new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),s.angle).multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),s.pitch)).multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),s.roll??-Math.PI/2));}
 function authoredTip(T,{skillId,time,position,forward,handedness=1}){
  const s=sample(skillId,time),q=rotation(T,s);if(handedness<0){q.set(q.x,-q.y,-q.z,q.w);q.multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),Math.PI));}
  const heading=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),Math.atan2(forward.x,forward.z));q.premultiply(heading);
  const palm=new T.Vector3(s.handX*handedness,s.handY,s.handZ).applyQuaternion(heading).add(position);
  return {palm,front:new T.Vector3(0,FRONT_GRIP,0).applyQuaternion(q).add(palm),tip:new T.Vector3(...TIP).applyQuaternion(q).add(palm),rotation:q};
 }
 const vertex=`varying vec2 vUv;void main(){vUv=uv;vec4 p=vec4(position,1.);
 #ifdef USE_INSTANCING
 p=instanceMatrix*p;
 #endif
 gl_Position=projectionMatrix*modelViewMatrix*p;}`;
 const noise=`float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1.,0.)),f.x),mix(h(i+vec2(0.,1.)),h(i+vec2(1.,1.)),f.x),f.y);}`;
 const flame=`uniform float uTime,uOpacity;uniform vec3 uColor;varying vec2 vUv;${noise}
 void main(){float u=vUv.x,v=vUv.y;float ends=smoothstep(0.,.12,u)*(1.-smoothstep(.85,1.,u))*pow(max(0.,sin(u*3.14159265)),.45),edge=pow(max(0.,1.-abs(v-.5)*2.),.7);float grain=n(vec2(u*13.-uTime*3.,v*8.));float hot=exp(-pow((v-.72)*18.,2.));float streak=pow(.5+.5*sin(v*60.+sin(u*12.-uTime*9.)*2.),11.);vec3 color=mix(uColor,vec3(1.,.95,.72),hot*.8+streak*.2);gl_FragColor=vec4(color,ends*edge*(.26+.40*grain+.28*hot+.16*streak)*uOpacity);
 #include <colorspace_fragment>
 }`;
 const line=`uniform float uTime,uOpacity;uniform vec3 uColor;varying vec2 vUv;void main(){float e=pow(max(0.,sin(vUv.x*3.14159265)),.3)*pow(max(0.,sin(vUv.y*3.14159265)),.65);gl_FragColor=vec4(uColor,e*uOpacity);
 #include <colorspace_fragment>
 }`;
 const dustVertex=`varying vec2 vUv;void main(){vUv=uv;vec4 p=modelViewMatrix*instanceMatrix*vec4(0.,0.,0.,1.);p.xy+=position.xy*vec2(length(instanceMatrix[0].xyz),length(instanceMatrix[1].xyz));gl_Position=projectionMatrix*p;}`;
 const dust=`uniform float uTime,uOpacity;uniform vec3 uColor;varying vec2 vUv;${noise}void main(){vec2 p=(vUv-.5)*2.;float fall=exp(-dot(p,p)*3.)*(1.-smoothstep(.65,1.,length(p)));gl_FragColor=vec4(uColor,fall*(.3+.7*n(vUv*6.+uTime*.12))*uOpacity);
 #include <colorspace_fragment>
 }`;
 const flash=`uniform float uTime,uOpacity;uniform vec3 uColor;varying vec2 vUv;void main(){vec2 p=(vUv-.5)*2.;float r=length(p),a=atan(p.y,p.x),v=pow(max(0.,1.-r),3.)+.5*pow(abs(cos(a*4.)),26.)*max(0.,1.-r);gl_FragColor=vec4(uColor,v*uOpacity);
 #include <colorspace_fragment>
 }`;
 function mat(core,fx,color,fragment=line){const T=core.THREE,m=new T.ShaderMaterial({uniforms:{uTime:{value:0},uOpacity:{value:0},uColor:{value:new T.Color(color)}},vertexShader:vertex,fragmentShader:fragment,transparent:true,depthWrite:false,toneMapped:false,side:T.DoubleSide,blending:T.AdditiveBlending});fx.materials.add(m);return m;}
 function geo(T,n,rows,point){const p=[],uv=[],ix=[];for(let i=0;i<=n;i++)for(let j=0;j<=rows;j++){const v=point(i/n,j/rows);p.push(v.x,v.y,v.z);uv.push(i/n,j/rows);if(i<n&&j<rows){const a=i*(rows+1)+j,b=a+rows+1;ix.push(a,b,a+1,a+1,b,b+1);}}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(ix);return g;}
 function mesh(core,fx,g,m,parent=fx.group){fx.geometries.add(g);fx.materials.add(m);const o=new core.THREE.Mesh(g,m);o.frustumCulled=false;o.renderOrder=10;parent.add(o);return o;}
 function alpha(o,a,t){o.visible=a>.001;if(o.material.uniforms){o.material.uniforms.uOpacity.value=Math.max(0,a);o.material.uniforms.uTime.value=t;}else o.material.opacity=Math.max(0,a);}
 function trace(core,fx,a,z,r=.05){return fx.axe.trace?fx.axe.trace(a,z,r):Collision().traceWorld(core.THREE,a,z,r,[],p=>core._ground(p));}
 function anchor(core,fx,t){return authoredTip(core.THREE,{skillId:fx.skill.id,time:t,position:fx.axe.origin,forward:fx.direction,handedness:fx.axe.handedness});}
 function emitContact(core,fx,point,at,targetId,kind){
  const b=fx.axe,key=kind+':'+targetId;if(!fx.alive||b.contacts.has(key))return;b.contacts.add(key);
  core._emit('impact',fx,{kind:fx.skill.localId,hitIndex:0,targetId,position:point.clone(),contactTime:at,contactKind:kind,shake:kind==='target'?.025:.018},key);if(!fx.alive)return;
  const c=b.contactsVisual[b.contactCursor++%b.contactsVisual.length];c.at=at;c.group.position.copy(point);c.group.quaternion.copy(b.body.quaternion);c.armor=kind==='target'&&fx.skill.id===ids[1];
 }
 function query(core,fx,at,from,to,radial=false){
  const T=core.THREE,b=fx.axe,candidates=[],wall=radial?trace(core,fx,from,to,.12):null;let open=true;
  const event={type:'target-query',kind:fx.skill.localId,phase:radial?'sweep':'chop',skillId:fx.skill.id,weaponId:'axe',handle:fx.handle,caster:fx.caster,hitIndex:0,position:to.clone(),from:from.clone(),to:to.clone(),radius:radial?.12:fx.skill.radius,
   testTarget:(id,p,r=.25,height=2.2)=>{
    if(!open||!fx.alive||id==null||id===fx.caster.uuid||b.hitTargets.has(id)||!p||![p.x,p.y,p.z,r,height].every(Number.isFinite)||r<0||height<=0)return false;
    let contact;
    if(radial){const fraction=Collision().targetFraction(from,to,p,r+.12,height);if(fraction===null||fraction>=(wall?.fraction??Infinity)-1e-8)return false;contact=from.clone().lerp(to,fraction);}
    else{
     const offset=new T.Vector3(p.x-b.origin.x,0,p.z-b.origin.z),distance=offset.length(),forward=offset.dot(fx.direction);
     if(distance>fx.skill.range+r||forward<-.01||Math.hypot(p.x-to.x,p.z-to.z)>fx.skill.radius+r||p.y>from.y+.3||p.y+height<from.y-.3)return false;
     contact=new T.Vector3(p.x,Math.max(p.y,Math.min(from.y,p.y+height)),p.z);
    }
    const eye=b.origin.clone();eye.y=contact.y;const obstruction=trace(core,fx,eye,contact,.06);if(obstruction&&obstruction.fraction<1-1e-8)return false;
    if(!candidates.some(c=>c.id===id))candidates.push({id,point:contact,distance:contact.distanceToSquared(from)});return false;
   }};
  try{core.onEvent?.(event);}finally{open=false;}if(!fx.alive)return;
  candidates.sort((a,z)=>a.distance-z.distance||String(a.id).localeCompare(String(z.id)));
  for(const c of candidates){let accepting=true,accepted=false;const hit={...event,type:'hit-window',targetId:c.id,position:c.point.clone(),testTarget:id=>{if(!accepting||accepted||!fx.alive||id!==c.id||b.hitTargets.has(id))return false;accepted=true;b.hitTargets.add(id);return true;}};
   try{core.onEvent?.(hit);}finally{accepting=false;}if(!fx.alive)return;if(accepted)emitContact(core,fx,c.point,at,c.id,'target');if(!fx.alive)return;
  }
 }
 function makeContact(core,fx){const T=core.THREE,group=new T.Group();group.visible=false;fx.group.add(group);const planes=[];
  for(let i=0;i<2;i++){const p=mesh(core,fx,new T.PlaneGeometry(1.7,1.7),mat(core,fx,i?'#ffb84a':'#fff5c6',flash),group);p.rotation.y=i*Math.PI/2;planes.push(p);}
  const armorMat=new T.MeshStandardMaterial({color:0x44494c,metalness:.8,roughness:.35,transparent:true,depthWrite:false}),armorGeo=new T.OctahedronGeometry(.23,0);fx.materials.add(armorMat);fx.geometries.add(armorGeo);
  const armorMesh=new T.InstancedMesh(armorGeo,armorMat,core.quality==='low'?7:12);armorMesh.frustumCulled=false;group.add(armorMesh);
  return {group,planes,armorMesh,at:-99,armor:false};
 }
 function makeDust(core,fx,parent,count){const T=core.THREE,g=new T.PlaneGeometry(1,1),m=mat(core,fx,'#8c7b67',dust);m.vertexShader=dustVertex;m.blending=T.NormalBlending;fx.geometries.add(g);const o=new T.InstancedMesh(g,m,count);o.frustumCulled=false;parent.add(o);return o;}
 const effect={
  place(core,fx){fx.group.position.set(0,0,0);fx.group.quaternion.identity();},
  build(core,fx){
   const T=core.THREE,p=core._pose(fx.caster).p,b=fx.axe={origin:p.clone(),previous:0,handedness:1,released:false,hitTargets:new Set(),contacts:new Set(),contactCursor:0,sweepIndex:0,groundAt:-99,groundKind:null,dummy:new T.Object3D()};
   b.body=new T.Group();b.body.position.copy(p);b.body.quaternion.setFromAxisAngle(new T.Vector3(0,1,0),Math.atan2(fx.direction.x,fx.direction.z));fx.group.add(b.body);
   b.contactsVisual=Array.from({length:core.quality==='low'?3:6},()=>makeContact(core,fx));
   b.charge=new T.Group();fx.group.add(b.charge);b.chargeMeshes=[];
   const n=core.quality==='low'?48:90;
   // The energy follows the held blade, leaving both palms visible.
   for(let k=0;k<3;k++)b.chargeMeshes.push(mesh(core,fx,geo(T,n,2,(u,v)=>{const a=(u-.5)*Math.PI*1.6,r=.45+k*.09+(v-.5)*.07;return new T.Vector3(Math.cos(a)*r,Math.sin(a)*r,k*.02);}),mat(core,fx,k===0?'#ffe7a6':'#e87925',flame),b.charge));
   b.trail=new T.Group();b.body.add(b.trail);b.trailMeshes=[];b.trailSegments=n;
   const timeline=spec(fx.skill.id);
   if(fx.skill.id!==ids[2]){
    for(let k=0;k<3;k++){
     const g=geo(T,n,3,(u,v)=>{const time=timeline.releaseAt+(timeline.impactAt-timeline.releaseAt)*u,a=authoredTip(T,{skillId:fx.skill.id,time,position:new T.Vector3(),forward:new T.Vector3(0,0,1)}),out=a.tip.clone().sub(a.palm).normalize();const width=k===0?.68:k===1?.08:.045;return a.tip.addScaledVector(out,(v-.5)*width-.19*k).add(new T.Vector3(0,0,k*.004));});
     b.trailMeshes.push(mesh(core,fx,g,mat(core,fx,['#ff8f28','#fff2b7','#ffc35c'][k],k===0?flame:line),b.trail));
    }
   }else{
    b.vortex=new T.Group();b.body.add(b.vortex);b.helices=[];
    for(let k=0;k<(core.quality==='low'?4:7);k++){
     const g=geo(T,n*2,3,(u,v)=>{const a=(u*(.85+(k%3)*.10)+k*.31)*TAU,r=1.35+.95*u+.18*Math.sin(u*TAU*2+k),w=(k%2?.12:.46)*Math.pow(Math.sin(Math.PI*u),1.6);return new T.Vector3(Math.sin(a)*r,.15+u*(2.30+(k%3)*.24)+.10*Math.sin(u*TAU*1.5+k)+(v-.5)*w,Math.cos(a)*r);});
     b.helices.push(mesh(core,fx,g,mat(core,fx,k%2?'#ffce78':'#ed8d27',k%2?line:flame),b.vortex));
    }
    // Torn low whorls and fine filaments define volume without hiding the body.
    for(let k=0;k<(core.quality==='low'?3:6);k++){
     const g=geo(T,n,2,(u,v)=>{const a=k*1.87+u*TAU*.73,r=2.12+.17*Math.sin(u*TAU*2+k)+(v-.5)*(k%2?.045:.24)*Math.pow(Math.sin(Math.PI*u),1.4);return new T.Vector3(Math.sin(a)*r,.24+(k%3)*.34+u*.36+.06*Math.sin(u*TAU),Math.cos(a)*r);});
     b.helices.push(mesh(core,fx,g,mat(core,fx,k%2?'#ffe3a1':'#db852a',k%2?line:flame),b.vortex));
    }
    // A short blade-history crescent revolves with the actual axe.
    for(let k=0;k<2;k++)b.helices.push(mesh(core,fx,geo(T,n,3,(u,v)=>{const a=-1.8+u*1.65,r=1.68+(v-.5)*(k?.05:.33)*Math.sin(Math.PI*u);return new T.Vector3(Math.sin(a)*r,1.30+.1*Math.sin(u*Math.PI),Math.cos(a)*r);}),mat(core,fx,k?'#fff0b2':'#ff9f34',k?line:flame),b.vortex));
   }
   b.ground=new T.Group();fx.group.add(b.ground);b.ground.visible=false;b.eruption=[];b.cracks=[];
   const vertical=fx.skill.id===ids[0];
   for(let k=0;k<(core.quality==='low'?3:5);k++){
    const g=geo(T,n,3,(u,v)=>{const centre=k-(core.quality==='low'?1:2),height=(vertical?4.35:1.95)*(1-.055*Math.abs(centre)),bend=Math.sin(u*Math.PI*.85),spread=centre*(vertical?.34:.48)*bend,w=(vertical?.76:.82)*Math.pow(Math.sin(Math.PI*u),.55);return new T.Vector3(spread+(v-.5)*w,u*height,(vertical?.45:1.8)*u+(vertical?.40:.25)*Math.sin(u*Math.PI)+.09*Math.sin(u*TAU+k));});
    b.eruption.push(mesh(core,fx,g,mat(core,fx,k===1?'#fff0a4':k%2?'#ffc66b':'#ff8b27',flame),b.ground));
   }
   for(let k=0;k<(core.quality==='low'?7:12);k++){
    const angle=k*2.399963,length=1.2+(k%4)*.48;
    const g=geo(T,12,1,(u,v)=>{const r=u*length,a=angle+.12*Math.sin(u*30+k),width=.075*(1-u)*(v-.5);return new T.Vector3(Math.sin(a)*(r+width),.02,Math.cos(a)*(r+width));});
    b.cracks.push(mesh(core,fx,g,mat(core,fx,k%3?'#ffab42':'#ffdda0'),b.ground));
   }
   b.groundFlash=mesh(core,fx,new T.PlaneGeometry(3.5,3.5),mat(core,fx,'#fff4bc',flash),b.ground);b.groundFlash.rotation.x=-Math.PI/2;b.groundFlash.position.y=.045;
   const rockGeo=new T.IcosahedronGeometry(1,0),rockMat=new T.MeshStandardMaterial({color:0x353333,roughness:.92,metalness:.04,transparent:true,depthWrite:true});fx.geometries.add(rockGeo);fx.materials.add(rockMat);
   b.rocks=new T.InstancedMesh(rockGeo,rockMat,core.quality==='low'?18:36);b.rocks.frustumCulled=false;b.ground.add(b.rocks);
   const emberGeo=geo(T,3,1,(u,v)=>new T.Vector3((v-.5)*.023,(u-.5)*.32,0)),emberMat=mat(core,fx,'#ffd68b');fx.geometries.add(emberGeo);
   b.embers=new T.InstancedMesh(emberGeo,emberMat,core.quality==='low'?24:52);b.embers.frustumCulled=false;b.ground.add(b.embers);
   b.dust=makeDust(core,fx,b.ground,core.quality==='low'?14:30);
   b.cycloneDust=fx.skill.id===ids[2]?makeDust(core,fx,b.body,core.quality==='low'?16:32):null;
   if(fx.skill.id===ids[2]){const m=rockMat.clone();fx.materials.add(m);b.orbitRocks=new T.InstancedMesh(rockGeo,m,core.quality==='low'?14:28);b.orbitRocks.frustumCulled=false;b.body.add(b.orbitRocks);const sparkMat=mat(core,fx,'#ffcf75');b.orbitEmbers=new T.InstancedMesh(emberGeo,sparkMat,core.quality==='low'?18:36);b.orbitEmbers.frustumCulled=false;b.body.add(b.orbitEmbers);}
  },
  tick(core,fx){
   const T=core.THREE,b=fx.axe,s=spec(fx.skill.id),t=fx.age,prev=b.previous;b.previous=t;const a=anchor(core,fx,Math.min(t,s.impactAt));
   b.charge.position.copy(a.tip);if(t<s.releaseAt&&fx.weaponTip)fx.weaponTip.getWorldPosition(b.charge.position);b.charge.quaternion.copy(a.rotation);
   const charge=smooth(.10,.55,t)*(1-smooth(s.releaseAt,s.releaseAt+.12,t));b.charge.scale.setScalar(.8+.12*Math.sin(t*10));b.chargeMeshes.forEach((m,i)=>alpha(m,charge*(i?.4:.6),t));b.charge.visible=charge>.001;
   if(t>=s.releaseAt&&!b.released){b.released=true;core._emit('release',fx,{kind:fx.skill.localId,position:a.tip.clone(),releaseTime:s.releaseAt},'axe-release');if(!fx.alive)return;}
   if(fx.skill.id===ids[2]){
    const step=1/120;while(b.sweepIndex<=Math.ceil((s.activeEnd-s.releaseAt)/step)){
     const at=Math.min(s.activeEnd,s.releaseAt+b.sweepIndex*step);if(at>Math.min(t,s.activeEnd)+1e-9||t<s.releaseAt)break;b.sweepIndex++;
     const pose=anchor(core,fx,at),from=b.origin.clone();from.y=pose.palm.y;const direction=pose.tip.clone().sub(from);direction.y=0;direction.normalize();query(core,fx,at,from,from.clone().addScaledVector(direction,fx.skill.range),true);if(!fx.alive)return;
    }
    const power=smooth(.32,.95,t)*(1-smooth(3.90,4.50,t));b.vortex.rotation.y=sample(fx.skill.id,t).bodyYaw*b.handedness;b.vortex.scale.set(b.handedness,1,1);b.helices.forEach((m,i)=>alpha(m,power*(i%2?.58:.78),t));
    alpha(b.cycloneDust,power*.52,t);b.orbitRocks.visible=power>.001;b.orbitRocks.material.opacity=power;
    for(let i=0;i<b.cycloneDust.count;i++){const u=(i*.618+t*.17)%1,angle=i*2.399963+t*2.4,r=1.55+u*1.10;b.dummy.position.set(Math.sin(angle)*r,.10+u*1.8,Math.cos(angle)*r);b.dummy.rotation.set(0,0,0);b.dummy.scale.setScalar(.65+u*.7);b.dummy.updateMatrix();b.cycloneDust.setMatrixAt(i,b.dummy.matrix);}b.cycloneDust.instanceMatrix.needsUpdate=true;
    for(let i=0;i<b.orbitRocks.count;i++){const u=(i*.618+t*.12)%1,angle=i*2.399963+t*2.3,r=1.6+u*.85;b.dummy.position.set(Math.sin(angle)*r,.15+u*2.3,Math.cos(angle)*r);b.dummy.rotation.set(t*2+i,t+i*.3,t*3);b.dummy.scale.set(.06+(i%3)*.025,.09+(i%4)*.03,.05+(i%3)*.025).multiplyScalar(power);b.dummy.updateMatrix();b.orbitRocks.setMatrixAt(i,b.dummy.matrix);}b.orbitRocks.instanceMatrix.needsUpdate=true;
    alpha(b.orbitEmbers,power*.85,t);for(let i=0;i<b.orbitEmbers.count;i++){const u=(i*.618+t*.24)%1,angle=i*2.399963+t*3.8,r=1.6+u*.85;b.dummy.position.set(Math.sin(angle)*r,.2+u*2.7,Math.cos(angle)*r);b.dummy.rotation.set(0,angle,-1.2);b.dummy.scale.setScalar(.35+(i%4)*.18);b.dummy.updateMatrix();b.orbitEmbers.setMatrixAt(i,b.dummy.matrix);}b.orbitEmbers.instanceMatrix.needsUpdate=true;
   }else{
    const drawn=Math.floor(clamp((t-s.releaseAt)/(s.impactAt-s.releaseAt))*b.trailSegments),power=smooth(s.releaseAt,s.releaseAt+.09,t)*(1-smooth(s.impactAt,s.impactAt+.45,t));
    b.trail.scale.x=b.handedness;b.trailMeshes.forEach((m,i)=>{m.geometry.setDrawRange(0,drawn*3*6);alpha(m,power*(i===0?.95:1.0),t);});
    if(t>=s.impactAt&&!b.struck){
     b.struck=true;const from=b.origin.clone();from.y+=1.12;const centre=b.origin.clone().addScaledVector(fx.direction,fx.skill.forwardOffset);centre.y=from.y;query(core,fx,s.impactAt,from,centre);if(!fx.alive)return;
     const strike=anchor(core,fx,s.impactAt),ground=core._ground(strike.tip),end=strike.tip.clone();end.y=ground;const wall=trace(core,fx,strike.palm,end,.045);
     if(wall&&wall.kind!=='ground'&&wall.point.y>ground+.10){emitContact(core,fx,wall.point,s.impactAt,'world','wall');if(!fx.alive)return;b.groundKind='wall';}
     else{b.groundAt=s.impactAt;b.groundKind='ground';b.ground.position.copy(end);b.ground.position.y=ground+.02;b.ground.quaternion.copy(b.body.quaternion);core._emit('ground-pulse',fx,{kind:fx.skill.localId,position:end.clone(),visualOnly:true,shake:fx.skill.id===ids[0]?.032:.022},'axe-ground');if(!fx.alive)return;}
    }
   }
   const age=t-b.groundAt,life=fx.skill.id===ids[0]?1.65:1.25,groundVisible=b.groundKind==='ground'&&age>=0&&age<life;b.ground.visible=groundVisible;
   if(groundVisible){
    const burst=(1-smooth(.16,fx.skill.id===ids[0]?.75:.52,age))*smooth(0,.045,age),fade=1-smooth(life*.5,life,age);b.eruption.forEach((m,i)=>{m.scale.set(1+age*.40,.25+.75*smooth(0,.15,age),1);alpha(m,burst*(i===1?1.65:i%2?1.0:1.25),t);});b.cracks.forEach(m=>alpha(m,fade*.8,t));alpha(b.groundFlash,1-smooth(.015,.20,age),t);
    b.rocks.material.opacity=fade;for(let i=0;i<b.rocks.count;i++){const angle=i*2.399963,speed=1.8+(i%7)*.42,travel=Math.max(0,age-(i%4)*.018),r=.11+travel*speed,up=fx.skill.id===ids[0]?5.3+(i%6)*.75:3.2+(i%5)*.43;b.dummy.position.set(Math.sin(angle)*r,Math.max(.01,up*travel-5.5*travel*travel),Math.abs(Math.cos(angle))*r*.80);b.dummy.rotation.set(i+age*2,i*.7+age*1.4,age*2);b.dummy.scale.set(.085+(i%4)*.037,(fx.skill.id===ids[0]?.25:.14)+(i%6)*.07,.075+(i%3)*.035).multiplyScalar(fade);b.dummy.updateMatrix();b.rocks.setMatrixAt(i,b.dummy.matrix);}b.rocks.instanceMatrix.needsUpdate=true;
    alpha(b.embers,(1-smooth(.45,1.15,age))*.9,t);for(let i=0;i<b.embers.count;i++){const angle=i*2.399963,speed=2.2+(i%7)*.37,r=age*speed,up=4.1+(i%6)*.61;b.dummy.position.set(Math.sin(angle)*r,Math.max(.01,up*age-3.8*age*age),Math.cos(angle)*r*.70);b.dummy.rotation.set(.3,angle,-Math.sin(angle)*.6);b.dummy.scale.setScalar(.4+(i%4)*.22);b.dummy.updateMatrix();b.embers.setMatrixAt(i,b.dummy.matrix);}b.embers.instanceMatrix.needsUpdate=true;
    alpha(b.dust,fade*smooth(0,.1,age)*.72,t);for(let i=0;i<b.dust.count;i++){const angle=i*2.399963,r=.3+age*(1+(i%4)*.36);b.dummy.position.set(Math.sin(angle)*r,.14+age*.32+(i%3)*.1,Math.cos(angle)*r);b.dummy.rotation.set(0,0,0);b.dummy.scale.setScalar(.5+age*.8+(i%3)*.2);b.dummy.updateMatrix();b.dust.setMatrixAt(i,b.dummy.matrix);}b.dust.instanceMatrix.needsUpdate=true;
   }
   for(const c of b.contactsVisual){const age=t-c.at,fade=age>=0?1-smooth(.16,.70,age):0;c.group.visible=age>=0&&fade>.001;c.planes.forEach((m,i)=>{m.scale.setScalar(.3+Math.max(0,age)*3);alpha(m,(1-smooth(.03,.24,age))*(i?.6:1),t);});c.armorMesh.visible=c.armor&&fade>.001;c.armorMesh.material.opacity=fade;if(c.armorMesh.visible){for(let i=0;i<c.armorMesh.count;i++){const angle=i*2.399963,r=.12+age*(1.6+(i%3)*.45);b.dummy.position.set(Math.sin(angle)*r,Math.cos(angle)*r*.7-age*age*2.5,-age*.6);b.dummy.rotation.set(i+age*7,i*.7+age*4,age*5);b.dummy.scale.set(.45+(i%3)*.2,1,.12);b.dummy.updateMatrix();c.armorMesh.setMatrixAt(i,b.dummy.matrix);}c.armorMesh.instanceMatrix.needsUpdate=true;}}
  }
 };
 for(const id of ids)Core.registerEffect(id,effect);
 return Object.freeze({skillIds:Object.freeze(ids),spec,sample,rotation,authoredTip,frontGripDistance:FRONT_GRIP,tipOffset:Object.freeze(TIP),effect});
});
