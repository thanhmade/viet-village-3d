'use strict';
const climateScratch={direction:new THREE.Vector3(),sunTarget:new THREE.Vector3(),moonDirection:new THREE.Vector3(),focus:new THREE.Vector3(),discDirection:new THREE.Vector3(),grey:new THREE.Color(),sample:{top:new THREE.Color(),horizon:new THREE.Color(),sun:new THREE.Color()}};
const climateNodes=new Map();
let climateDateSecond=-1,climateDate=null,climateLastWet=NaN,cloudMaterial,rainRoofHeights;
function climateNode(id){if(!climateNodes.has(id))climateNodes.set(id,$(id));return climateNodes.get(id);}
function climateText(id,text){const node=climateNode(id);if(node.textContent!==text)node.textContent=text;}
function climatePolicy(){return typeof window!=='undefined'?window.VillagePerformance?.policy:null;}
function initClimate(){hemi=scene.children.find(o=>o.isHemisphereLight);moonLight=new THREE.DirectionalLight(0x9ebbea,.1);moonLight.position.set(18,30,-16);moonLight.shadow.mapSize.set(1024,1024);Object.assign(moonLight.shadow.camera,{left:-36,right:36,top:36,bottom:-36,near:.5,far:125});moonLight.shadow.bias=-.00018;moonLight.shadow.normalBias=.045;moonLight.shadow.radius=2;scene.add(moonLight,moonLight.target);starAmbient=new THREE.HemisphereLight(0xa6c9ef,0x41506b,0);scene.add(starAmbient);
const uniforms={top:{value:new THREE.Color()},bottom:{value:new THREE.Color()}};skyDome=new THREE.Mesh(new THREE.SphereGeometry(140,24,12),new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,uniforms,vertexShader:'varying vec3 v;void main(){v=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:'uniform vec3 top;uniform vec3 bottom;varying vec3 v;void main(){float h=clamp(normalize(v).y*.85+.15,0.0,1.0);gl_FragColor=vec4(mix(bottom,top,pow(h,.65)),1.0);}',toneMapped:false}));skyDome.renderOrder=-10;scene.add(skyDome);
sunDisc=new THREE.Mesh(new THREE.SphereGeometry(1.15,16,12),new THREE.MeshBasicMaterial({color:0xffe2af,fog:false}));moonDisc=new THREE.Mesh(new THREE.SphereGeometry(.70,16,12),new THREE.MeshBasicMaterial({color:0xc5d3e0,fog:false}));scene.add(sunDisc,moonDisc);
const stars=[];for(let i=0;i<300;i++){let a=i*2.399,y=.12+(i%73)/83,r=Math.sqrt(1-y*y);stars.push(Math.cos(a)*r*105,y*105,Math.sin(a)*r*105);}let sg=new THREE.BufferGeometry();sg.setAttribute('position',new THREE.Float32BufferAttribute(stars,3));starField=new THREE.Points(sg,new THREE.PointsMaterial({color:0xcbd8ee,size:.18,transparent:true,opacity:0,depthWrite:false,fog:false}));scene.add(starField);
cloudGroup=new THREE.Group();scene.add(cloudGroup);
cloudMaterial=new THREE.MeshStandardMaterial({color:0xdce0df,transparent:true,opacity:.65,roughness:1,depthWrite:false});
const cloudMesh=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,2),cloudMaterial,64),cloudTransform=new THREE.Object3D();
for(let i=0;i<16;i++)for(let j=0;j<4;j++){
 cloudTransform.position.set(Math.sin(i*2.4)*48+(j-1.5)*3,25+(i%4)*3+Math.sin(j)*.8,Math.cos(i*2.4)*48+Math.cos(j)*1.5);
 cloudTransform.scale.set(4,1.3,3);cloudTransform.updateMatrix();cloudMesh.setMatrixAt(i*4+j,cloudTransform.matrix);
}
cloudMesh.computeBoundingSphere();cloudGroup.add(cloudMesh);
const positions=new Float32Array(1400*6);for(let i=0;i<1400;i++){let x=(i*17.713%1)*50-25,z=(i*23.177%1)*54-27,y=(i*3.713%1)*23;positions.set([x,y,z,x-.09,y+.55,z+.03],i*6);}let rg=new THREE.BufferGeometry();rg.setAttribute('position',new THREE.BufferAttribute(positions,3));rainLines=new THREE.LineSegments(rg,new THREE.LineBasicMaterial({color:0xb0cddd,transparent:true,opacity:0,depthWrite:false}));rainLines.frustumCulled=false;scene.add(rainLines);
rebuildRainRoofCache();
roomLight.position.set(-3.03,1.52,.28);roomLight.castShadow=true;roomLight.shadow.mapSize.set(512,512);roomLight.shadow.bias=-.002;
for(const m of materials.values())m.userData.dryRoughness=m.roughness;
$('climateBtn').onclick=()=>{$('climatePanel').classList.contains('hidden')?$('climatePanel').classList.remove('hidden'):$('climatePanel').classList.add('hidden');};$('closeClimate').onclick=()=>$('climatePanel').classList.add('hidden');$('timeMode').onchange=()=>{climate.clock=$('timeMode').value;if(climate.clock==='manual')climate.hour=climate.displayHour;};$('timeSlider').oninput=()=>{climate.clock='manual';$('timeMode').value='manual';climate.hour=Number($('timeSlider').value);};for(const [id,h] of [['day',8],['noon',12],['afternoon',15.5],['sunset',17.6],['evening',20],['midnight',0]])$('time-'+id).onclick=()=>{climate.clock='manual';climate.hour=h;$('timeMode').value='manual';$('timeSlider').value=h;};$('seasonMode').onchange=()=>climate.season=$('seasonMode').value;$('weatherMode').onchange=()=>climate.weather=$('weatherMode').value;$('climateQuality').value=$('quality').value;$('climateQuality').onchange=()=>{$('quality').value=$('climateQuality').value;quality();};$('nightVisibility').oninput=()=>nightVisibility=Number($('nightVisibility').value);quality();initHouseLights();climateReady=true;updateClimate(1,true);scheduleClimateShaderWarmup();}
function exteriorRoofAt(x,z){return window.VietVillageRegions?.current?.roofHeight(x,z)??langVietRoofHeight(x,z);}
function langVietRoofHeight(x,z){for(let h of village.houses)if(Math.abs(x-h.x)<3.7&&Math.abs(z-h.z)<2.9)return 5.1;if(Math.abs(x)<7&&Math.abs(z+19)<4.3)return 7.5;if(Math.abs(x)<4.8&&Math.abs(z-24)<2)return 6.3;return .3;}
function roofAt(x,z){return insideHouse?0:exteriorRoofAt(x,z);}
// X/Z of each drop is fixed. Rebuild only if the village or rain layout changes.
function rebuildRainRoofCache(){const positions=rainLines.geometry.attributes.position.array;rainRoofHeights=new Float32Array(positions.length/6);for(let i=0;i<rainRoofHeights.length;i++)rainRoofHeights[i]=exteriorRoofAt(positions[i*6],positions[i*6+2]);}
// Éclairage de nuit volontairement renforcé pour lire les chemins dans le jeu.
function updateMoonLighting(sunDirection,daylight,blend){const night=1-daylight,cloud=climate.cloud;
const moonDirection=climateScratch.moonDirection.set(-sunDirection.x,Math.max(.38,-sunDirection.y),.35).normalize(),focus=climateScratch.focus;
const followPlayer=player.visible&&world.visible;
if(insideHouse)focus.set(0,1,0);else if(followPlayer)focus.copy(player.position);else focus.set(housePreview.visible?11:0,0,0);
moonLight.target.position.copy(focus);moonLight.position.copy(focus).addScaledVector(moonDirection,60);
const power=night*.78*(1-cloud*.74)*nightVisibility;moonLight.intensity+=(power-moonLight.intensity)*blend;
moonLight.visible=power>.0001;moonLight.castShadow=renderer.shadowMap.enabled&&climatePolicy()?.shadows!==false&&night>.02;
const span=insideHouse?7:followPlayer?18:housePreview.visible?9:36;if(moonLight.shadow.camera.right!==span){Object.assign(moonLight.shadow.camera,{left:-span,right:span,top:span,bottom:-span});moonLight.shadow.camera.updateProjectionMatrix();}
const fill=night*(.30-cloud*.06)*nightVisibility*(insideHouse?.12:1);starAmbient.intensity+=(fill-starAmbient.intensity)*blend;starAmbient.visible=fill>.0001;}

function updateClimate(dt,instant=false){if(!climateReady)return;
const second=Math.floor(Date.now()/1000);if(instant||second!==climateDateSecond){climateDateSecond=second;climateDate=vnTime(new Date(second*1000));}
const date=climateDate,policy=climatePolicy();if(climate.clock==='demo')climate.hour=(climate.hour+dt*.10)%24;const h=climate.clock==='live'?date.hour:climate.hour;climate.displayHour=h;const season=climate.season==='auto'?seasonAt(date.month):climate.season,weather=climate.weather==='auto'?autoWeather(season,h,date.day):climate.weather,w=weatherKinds[weather],a=instant?1:1-Math.exp(-dt*2.2);climate.rain+=(w.rain-climate.rain)*a;climate.cloud+=(w.cloud-climate.cloud)*a;climate.wet+=(climate.rain-climate.wet)*(1-Math.exp(-dt*(climate.rain>climate.wet?.25:.025)));
const state=lightState(h,climateScratch.sample),angle=(h-6)/12*Math.PI,altitude=Math.sin(angle),daylight=THREE.MathUtils.smoothstep(altitude,-.05,.25);const dir=climateScratch.direction.set(Math.cos(angle),Math.max(-.4,altitude),-.20).normalize();const targetIntensity=Math.max(0,altitude)*3.3*(1-climate.cloud*.85);sun.intensity+=(targetIntensity-sun.intensity)*a;sun.color.lerp(state.sun,a);const sunTarget=climateScratch.sunTarget.copy(dir).multiplyScalar(48);sun.position.lerp(sunTarget,a);sun.visible=altitude>-.05;sun.castShadow=renderer.shadowMap.enabled&&policy?.shadows!==false;
hemi.intensity+=((state.ambient*(1-climate.cloud*.32)*(insideHouse?.30:1))-hemi.intensity)*a;hemi.color.lerp(state.horizon,a);hemi.groundColor.setHex(insideHouse?0x473a2b:0x536441);updateMoonLighting(dir,daylight,a);
const grey=climateScratch.grey.setHex(daylight>.5?0x829298:0x131c2a);state.top.lerp(grey,climate.cloud*.62);state.horizon.lerp(grey,climate.cloud*.65);skyDome.material.uniforms.top.value.lerp(state.top,a);skyDome.material.uniforms.bottom.value.lerp(state.horizon,a);skyDome.position.copy(camera.position);scene.background.copy(state.horizon);scene.fog.color.lerp(state.horizon,a);const far=weather==='mist'?78:145-climate.rain*42;scene.fog.far+=(far-scene.fog.far)*a;scene.fog.near+=( (weather==='mist'?22:55)-scene.fog.near)*a;
sunDisc.position.copy(camera.position).addScaledVector(dir,110);sunDisc.visible=altitude>0&&climate.cloud<.8;sunDisc.material.color.copy(state.sun);moonDisc.position.copy(camera.position).add(climateScratch.discDirection.copy(moonLight.position).sub(moonLight.target.position).normalize().multiplyScalar(110));moonDisc.visible=daylight<.1&&climate.cloud<.8;starField.position.copy(camera.position);starField.material.opacity=(1-daylight)*(1-climate.cloud)*.8;starField.visible=starField.material.opacity>.001;
cloudGroup.visible=!insideHouse;cloudGroup.rotation.y=clockT*.002;cloudMaterial.opacity=.15+climate.cloud*.67;cloudMaterial.color.setHex(daylight>.1?0xd2d7d4:0x324255);
rainLines.visible=!insideHouse&&climate.rain>.02;rainLines.material.opacity=climate.rain*.50;const arr=rainLines.geometry.attributes.position.array;
const count=Number.isFinite(policy?.rainCount)?Math.max(0,Math.min(1400,Math.floor(policy.rainCount))):(climateNode('quality').value==='low'||innerWidth<800?500:1400);
if(rainLines.geometry.drawRange.count!==count*2)rainLines.geometry.setDrawRange(0,count*2);
if(rainLines.visible){const speed=dt*(14+climate.rain*5);for(let i=0;i<count;i++){const k=i*6;arr[k+1]-=speed;if(arr[k+1]<rainRoofHeights[i])arr[k+1]=23;arr[k+4]=arr[k+1]+.55;}rainLines.geometry.attributes.position.needsUpdate=true;}
const wet=insideHouse?0:climate.wet;if(instant||!Number.isFinite(climateLastWet)||Math.abs(wet-climateLastWet)>.0001){climateLastWet=wet;for(const m of materials.values()){const base=m.userData.dryRoughness;if(base!==undefined)m.roughness=base*(1-wet*.42);}}water.material.roughness=.23+climate.rain*.28;
roomLight.intensity=insideHouse?(1-daylight)*15+climate.cloud*2:0;roomLight.visible=insideHouse&&roomLight.intensity>.0001;roomLight.castShadow=insideHouse&&renderer.shadowMap.enabled&&policy?.shadows!==false;const span=insideHouse?7:35;if(sun.shadow.camera.right!==span){Object.assign(sun.shadow.camera,{left:-span,right:span,top:span,bottom:-span});sun.shadow.camera.updateProjectionMatrix();}renderer.toneMappingExposure+=( (insideHouse?1.03:1.08)-renderer.toneMappingExposure)*a;
updateHouseLights(dt,h,instant);window.VietVillageRegions?.updateEnvironment(dt,h);
const hh=String(Math.floor(h)).padStart(2,'0'),mm=String(Math.floor(h*60)%60).padStart(2,'0');climateText('climateStatus',hh+':'+mm+' · '+phaseLabel(h)+' · '+w.label);climateText('clockReadout',hh+':'+mm+' · '+(climate.clock==='live'?'Giờ Việt Nam':climate.clock==='demo'?'Tua 24 giờ / 4 phút':'Xem thử'));climateText('seasonReadout',(season==='rainy'?'Mùa mưa':'Mùa khô')+' · '+w.label);if(climate.clock!=='manual'&&Number(climateNode('timeSlider').value)!==h)climateNode('timeSlider').value=h;
}

// Sun, moon, star fill and house lamps switch with the hour, which changes the light counts
// compiled into every lit shader: the first dawn, dusk or time preset froze the game for
// 1-2 s. Their visibility now follows each hour's target values, so one hour maps to one
// light set. Compile the other sets once in the background (KHR_parallel_shader_compile)
// after loading settles; without that extension nothing changes.
const climateWarmup={done:new Set(),candidate:'',busy:false,timer:0};
function climateLightSignature(){const counts=[0,0,0,0,0,0,0,0];scene.traverseVisible(o=>{if(!o.isLight)return;const i=o.isDirectionalLight?0:o.isSpotLight?2:o.isPointLight?4:o.isHemisphereLight?6:7;counts[i]++;if(o.castShadow&&i<6)counts[i+1]++;});return counts.join('')+(renderer.shadowMap.enabled?'+':'-');}
function climateWarmupContext(){
 if(window.isVillageContentLoading?.())return null;
 return [window.VietVillageRegions?.currentId||'',insideHouse?1:0,renderer.shadowMap.enabled?1:0,window.VietVillagePlayerAvatar?.state?.modelId||''].join(':');
}
function atClimateHours(hours,visit){
 // Synchronous and restored before returning, so no frame is rendered at a sampled hour.
 const clock=climate.clock,hour=climate.hour;
 try{climate.clock='manual';for(const h of hours){climate.hour=h;updateClimate(0,true);visit(h);}}
 finally{climate.clock=clock;climate.hour=hour;updateClimate(0,true);}
}
// three r160's compileAsync throws inside its own timer, and never settles, when a material is
// disposed while it polls (a skill effect ending mid warm-up). Poll here and drop materials whose program is gone.
function compileClimateLightSet(){
 const materials=renderer.compile(scene,camera);
 return new Promise(resolve=>{(function poll(){for(const material of materials){const program=renderer.properties.get(material).currentProgram;if(!program||program.isReady())materials.delete(material);}if(materials.size)setTimeout(poll,10);else resolve();})();});
}
async function warmClimateShaders(){
 if(climateWarmup.busy||!climateReady||document.hidden||typeof renderer==='undefined'||typeof renderer?.compile!=='function'||!renderer.extensions.has('KHR_parallel_shader_compile'))return false;
 if(window.VietVillageRegions?.status.transitioning||housePortalSystem?.status?.pending)return false;
 // Same context on two checks: loading finished and lighting fades have converged.
 const context=climateWarmupContext();
 if(!context||climateWarmup.done.has(context)||climateWarmup.candidate!==context){climateWarmup.candidate=context||'';return false;}
 climateWarmup.busy=true;
 try{
  const seen=new Set([climateLightSignature()]),hours=[];
  atClimateHours(Array.from({length:240},(_,i)=>i/10),h=>{const signature=climateLightSignature();if(!seen.has(signature)){seen.add(signature);hours.push(h);}});
  for(const h of hours){
   // One light set per task keeps each main-thread slice short; the GPU driver compiles in parallel.
   if(document.hidden||climateWarmupContext()!==context)return false;
   let pending;atClimateHours([h],()=>{pending=compileClimateLightSet();});
   await pending;await new Promise(resolve=>setTimeout(resolve,300));
  }
  climateWarmup.done.add(context);return hours.length;
 }finally{climateWarmup.busy=false;}
}
function scheduleClimateShaderWarmup(){clearTimeout(climateWarmup.timer);climateWarmup.timer=setTimeout(()=>{Promise.resolve().then(warmClimateShaders).catch(error=>console.warn('Bỏ qua biên dịch trước ánh sáng:',error)).finally(scheduleClimateShaderWarmup);},2500);}
