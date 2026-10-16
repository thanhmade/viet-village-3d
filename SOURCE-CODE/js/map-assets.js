(function(global){
 'use strict';
 const legacy=new Map(),templates=new Map(),loadedGroups=new Map(),errors=[],colliders=[],assetMaterials=new Set(),waterMaterials=new Set(),glowMaterials=new Set();
 let pending=null,ready=false,interiorIndex=4,windStrength=null,lastTime=null,pondModel=null;
 const animatedAssets=new Map(),assetRecords=new Map();
 const motionRoots=new WeakMap();
 function movingNodes(root){
  if(!motionRoots.has(root)){const nodes=[];root.traverse(node=>{if(['wind','hinge'].includes(node.userData?.motion)){
   // A node can be controlled through its own model root and the map group.
   // Do not treat an already-open hinge as the closed rest pose on the second lookup.
   if(!node.userData.assetBaseRotation?.isEuler)node.userData.assetBaseRotation=node.rotation.clone();nodes.push(node);
  }});motionRoots.set(root,nodes);}
  return motionRoots.get(root);
 }
 const motion={
  update(root,time,strength=.32){for(const node of movingNodes(root))if(node.userData.motion==='wind'){
   const base=node.userData.assetBaseRotation,phase=node.id*.37;
   const amplitude=Number(node.userData.amplitude)||.018;
   node.rotation.z=base.z+Math.sin(time*.8+phase)*amplitude*strength;
   node.rotation.x=base.x+Math.sin(time*.63+phase)*amplitude*.45*strength;
  }},
  setHinges(root,value){for(const node of movingNodes(root))if(node.userData.motion==='hinge'){
   const axis=node.userData.axis||(/lid|nap/i.test(node.name)?'x':'y');
   const direction=Number(node.userData.direction)||( /right|phai/i.test(node.name)?-1:1);
   const angle=Number.isFinite(node.userData.openAngle)?node.userData.openAngle:direction*Math.PI*.52;
   node.rotation[axis]=node.userData.assetBaseRotation[axis]+Math.max(0,Math.min(1,value))*angle;
  }}
 };
 global.VietVillageAssetMotion=motion;
 global.captureVillageLegacy=function(id,build){
  const parent=world,root=new THREE.Group();root.name='legacy-asset-'+id;root.userData.assetLegacy=id;parent.add(root);legacy.set(id,root);
  world=root;try{return build(root);}finally{world=parent;}
 };
 global.captureVillageInterior=function(id,parent){const root=new THREE.Group();root.name='legacy-asset-'+id;root.userData.assetLegacy=id;parent.add(root);legacy.set(id,root);return root;};
 global.isVillageLegacyDescendant=function(object,root){for(let p=object;p&&p!==root;p=p.parent)if(p.userData.assetLegacy)return true;return false;};
 global.isVillageDynamicAsset=function(object){for(let p=object;p;p=p.parent)if(p.userData.assetAnimated||p.userData.assetTerrain)return true;return false;};
 global.bakeVillageLegacy=function(){for(const root of legacy.values())if(!root.userData.assetBaked){bakeStatic(root);root.userData.assetBaked=true;}};
 function buildPaths(){
  const items=[];
  // Same stone grid and occupied house cut-outs as MAP/world.js::stones.
  for(let x=-24;x<=24;x+=1.15)for(let z=-25;z<=25;z+=1.12){
   const plaza=x*x+z*z<8.3*8.3,axis=Math.abs(x)<3&&z>-16&&z<24,side=Math.abs(z+10)<1.55||Math.abs(z)<1.3||Math.abs(z-10)<1.4;
   // Keep the top at y=.31 but reduce tiny paver relief in the overview/mobile LOD.
   // Compressing a four-metre reference path into the old one-metre grid otherwise
   // produces deep sub-pixel dark seams. Geometry and materials are still from GLB.
   if((plaza||axis||side&&Math.abs(x)<15)&&!village.houses.some(h=>Math.abs(x-h.x)<3.1&&Math.abs(z-h.z)<2.6))items.push({id:'LV_DUONG_DA_01',position:[x,.29,z],size:[1.02,.02,1]});
  }
  return {id:'paths',placements:items,location:'Sân và lối lát đá đúng lưới hiện có'};
 }
 function fit(template,placement){
  const root=new THREE.Group(),model=template.scene.clone(true);root.name=placement.id;root.userData.assetId=placement.id;root.userData.placement=placement;
  root.add(model);const bounds=new THREE.Box3().setFromObject(model),size=bounds.getSize(new THREE.Vector3());
  if(placement.size){root.scale.set(...placement.size.map((target,i)=>target/size.getComponent(i)));}
  else if(placement.scale)root.scale.setScalar(placement.scale);
  // Named transform tracks and morph targets also animate; no skeleton is required.
  // Preserve the whole imported animation hierarchy in every static batching pass.
  if(template.animations?.length)root.userData.assetAnimated=true;
  // Exported assets use ground-level origins. Correct only a tiny exporter epsilon.
  if(Math.abs(bounds.min.y)<.001)model.position.y-=bounds.min.y;
  root.position.set(...placement.position);root.rotation.y=placement.yaw||0;
  model.traverse(node=>{if(node.isMesh){node.castShadow=!/DUONG_|THAM_CO|SAN_GACH|AO_SEN/.test(placement.id);node.receiveShadow=true;
   for(const material of Array.isArray(node.material)?node.material:[node.material]){
    if(!assetMaterials.has(material)){material.userData.assetDryRoughness=material.roughness;assetMaterials.add(material);}
    // The game compresses this path into a small repeated tile. Lighter grout
    // reduces high-contrast sub-pixel dots in the distant village overview.
    if(placement.id==='LV_DUONG_DA_01'&&(node.userData.sourceParts||[]).includes('path-base'))material.color.setHex(0xb4ad96);
    if((node.userData.sourceParts||[]).some(name=>/water/.test(name))||(placement.id==='LV_AO_SEN_01'&&node.name==='WATER_SURFACE'))waterMaterials.add(material);
    if(material.emissive?.getHex())glowMaterials.add(material);
   }
  }});
  if(placement.hingeOpen!==undefined)motion.setHinges(root,placement.hingeOpen);
  return root;
 }
 function optimizeStatic(root,onlyAssets=false){
  // Instancing repeated exported meshes retains their exact materials, UVs and normals.
  // Moving subtrees and house-specific interior variants must remain independent.
  root.updateMatrixWorld(true);const inverse=root.matrixWorld.clone().invert(),batches=new Map();
  root.traverse(node=>{
   if(!node.isMesh||node.isInstancedMesh||node.isSkinnedMesh||Array.isArray(node.material))return;
   let assetOwned=!onlyAssets;
   for(let p=node;p&&p!==root;p=p.parent){
    if(!p.visible||p.userData.assetLegacy||p.userData.motion||p.userData.assetAnimated||p.userData.placement?.houses)return;
    if(p.userData.assetGroup)assetOwned=true;
   }
   if(!assetOwned)return;
   const key=node.geometry.uuid+':'+node.material.uuid+':'+node.castShadow;
   if(!batches.has(key))batches.set(key,[]);batches.get(key).push(node);
  });
  for(const nodes of batches.values()){
   if(nodes.length<2)continue;
   const first=nodes[0],mesh=new THREE.InstancedMesh(first.geometry,first.material,nodes.length);mesh.name='asset-instances';mesh.castShadow=first.castShadow;mesh.receiveShadow=true;
   nodes.forEach((node,i)=>{mesh.setMatrixAt(i,inverse.clone().multiply(node.matrixWorld));node.removeFromParent();});mesh.computeBoundingSphere();root.add(mesh);
  }
 }
 function preparePondTerrain(parent,placement){
  const terrain=[];parent.traverse(node=>{if(node.userData.assetTerrain)terrain.push(node);});
  if(terrain.length!==2)throw new Error('Không xác định được hai lớp nền để đặt đáy ao sen nhập');
  // A local cut-out under the water exposes the supplied basin, instead of grass
  // showing through its transparent water. All terrain outside this footprint stays.
  return terrain.map(mesh=>{
   const {width,height,depth}=mesh.userData.assetTerrain,shape=new THREE.Shape(),hole=new THREE.Path();
   shape.moveTo(-width/2,-depth/2);shape.lineTo(width/2,-depth/2);shape.lineTo(width/2,depth/2);shape.lineTo(-width/2,depth/2);shape.closePath();
   const config=placement.pond,scale=placement.scale||1,c=Math.cos(placement.yaw||0),s=Math.sin(placement.yaw||0);
   for(let i=0;i<=128;i++){
    const a=i*Math.PI*2/128,cos=Math.cos(a),sin=Math.sin(a),w=1+(config.irregular||0)*(.55*Math.sin(5*a+.3)+.3*Math.cos(9*a)+.15*Math.sin(17*a));
    const x=(config.rx+.025)*Math.sign(cos)*Math.pow(Math.abs(cos),2/config.power)*scale*w,z=(config.rz+.025)*Math.sign(sin)*Math.pow(Math.abs(sin),2/config.power)*scale*w;
    const px=placement.position[0]+c*x+s*z-mesh.position.x,pz=placement.position[2]-s*x+c*z-mesh.position.z;
    if(i===0)hole.moveTo(px,pz);else hole.lineTo(px,pz);
   }
   hole.closePath();shape.holes.push(hole);
   const geometry=new THREE.ExtrudeGeometry(shape,{depth:height,bevelEnabled:false,curveSegments:1,steps:1});
   geometry.rotateX(Math.PI/2);geometry.translate(0,height/2,0);geometry.computeBoundingSphere();
   return {mesh,geometry};
  });
 }
 function pondContainsWater(x,z){
  if(!pondModel)return null;
  const p=pondModel.placement,config=p.pond,dx=x-p.position[0],dz=z-p.position[2],c=Math.cos(p.yaw||0),s=Math.sin(p.yaw||0),scale=p.scale||1;
  const localX=(c*dx-s*dz)/scale,localZ=(s*dx+c*dz)/scale;
  // Keep a player-radius allowance outside the measured water perimeter.
  return Math.pow(Math.abs(localX)/(config.rx+.18/scale),config.power)+Math.pow(Math.abs(localZ)/(config.rz+.18/scale),config.power)<1;
 }
 function blockedByPondBank(x,z){
  if(!pondModel)return false;
  // The retained bridge carries the player above the bank at both ends.
  if(Math.abs(z-18)<.8&&x>=8.3&&x<=21.7)return false;
  const p=pondModel.placement,dx=x-p.position[0],dz=z-p.position[2],c=Math.cos(p.yaw||0),s=Math.sin(p.yaw||0),scale=p.scale||1;
  const px=(c*dx-s*dz)/scale,pz=(s*dx+c*dz)/scale,padding=.18/scale,bounds=pondModel.bankBounds;
  if(px<bounds.minX-padding||px>bounds.maxX+padding||pz<bounds.minZ-padding||pz>bounds.maxZ+padding)return false;
  return pondModel.bankColliders.some(rock=>{
   const {min,max}=rock.aabb;if(px<min[0]-padding||px>max[0]+padding||pz<min[2]-padding||pz>max[2]+padding)return false;
   let positive=false,negative=false;
   for(let i=0;i<rock.hull.length;i++){
    const a=rock.hull[i],b=rock.hull[(i+1)%rock.hull.length],ex=b[0]-a[0],ez=b[1]-a[1],cross=ex*(pz-a[1])-ez*(px-a[0]);
    if(cross>1e-8)positive=true;else if(cross< -1e-8)negative=true;
    const length=ex*ex+ez*ez,t=length?Math.max(0,Math.min(1,((px-a[0])*ex+(pz-a[1])*ez)/length)):0;
    if((px-a[0]-t*ex)**2+(pz-a[1]-t*ez)**2<=padding*padding)return true;
   }
   return !(positive&&negative);
  });
 }
 function addGroup(definition,parent){
  if(loadedGroups.has(definition.id))return;
  const root=new THREE.Group();root.name='assets-3d-'+definition.id;root.userData.assetGroup=definition.id;
  for(const placement of definition.placements){const gltf=templates.get(placement.id);if(!gltf)throw new Error('Chưa tải được '+placement.id);root.add(fit(gltf,placement));}
  const groupColliders=definition.placements.filter(p=>p.collider).map(p=>({...p.collider,top:p.collider.jumpable&&p.size?p.position[1]+p.size[1]+.03:null,x:p.position[0],z:p.position[2],interior:!!definition.interior,houses:p.houses}));
  let pondSetup=null;
  if(definition.id==='pond'){
   const placement=definition.placements.find(p=>p.id==='LV_AO_SEN_01'),record=assetRecords.get(placement.id),gltf=templates.get(placement.id);
   if(record?.sourceType!=='imported-glb')throw new Error('Ao sen cần đúng GLB nhập, chưa dùng mô hình thay thế');
   const instance=root.children.find(node=>node.userData.assetId===placement.id);
   if(typeof global.createPondAnimator!=='function')throw new Error('Không tải được bộ hoạt ảnh ao sen');
   const bankColliders=record.bankColliders?.[record.loadedUrl===record.lod1Url?'lod1':'main'];
   if(!Array.isArray(bankColliders)||!bankColliders.length)throw new Error('Thiếu dữ liệu va chạm đá bờ ao nhập');
   const bankBounds={minX:Infinity,maxX:-Infinity,minZ:Infinity,maxZ:-Infinity};
   for(const rock of bankColliders){
    if(!Array.isArray(rock.hull)||rock.hull.length<3||!rock.aabb?.min||!rock.aabb?.max)throw new Error('Dữ liệu va chạm đá bờ ao không hợp lệ');
    bankBounds.minX=Math.min(bankBounds.minX,rock.aabb.min[0]);bankBounds.maxX=Math.max(bankBounds.maxX,rock.aabb.max[0]);bankBounds.minZ=Math.min(bankBounds.minZ,rock.aabb.min[2]);bankBounds.maxZ=Math.max(bankBounds.maxZ,rock.aabb.max[2]);
   }
   const terrain=preparePondTerrain(parent,placement),animator=global.createPondAnimator(THREE,instance.children[0],gltf.animations);
   animator.setWater(true);animator.setWind('light');pondSetup={placement,instance,terrain,animator,url:record.loadedUrl,bankColliders,bankBounds};
  }
  optimizeStatic(root);parent.add(root);loadedGroups.set(definition.id,root);colliders.push(...groupColliders);
  if(pondSetup){
   for(const {mesh,geometry} of pondSetup.terrain){mesh.userData.pondOriginalGeometry=mesh.geometry;mesh.geometry=geometry;mesh.userData.pondCut=true;}
   pondModel=pondSetup;animatedAssets.set('LV_AO_SEN_01',pondSetup.animator);
  }
  const original=legacy.get(definition.id);
  if(original){
   // The rock reference archive is damaged: retain the existing genuine geometry.
   // It was batched separately from flowers, so it can survive the foliage replacement.
   if(definition.id==='flowers')for(const child of [...original.children])if(child.isInstancedMesh&&child.geometry===batchGeo.rock){original.parent.attach(child);child.name='preserved-boundary-rocks';}
   original.visible=false;
  }
  setInterior(interiorIndex);
 }
 function setInterior(index){interiorIndex=index;for(const root of loadedGroups.values())root.traverse(node=>{if(node.userData.placement?.houses)node.visible=node.userData.placement.houses.includes(index);});}
 function canWalk(x,z,interior=false,feetY=-Infinity){return (interior||!blockedByPondBank(x,z))&&!colliders.some(c=>c.interior===interior&&!(Number.isFinite(c.top)&&feetY>=c.top)&&(!c.houses||c.houses.includes(interiorIndex))&&Math.abs(x-c.x)<c.w+.16&&Math.abs(z-c.z)<c.d+.16);}
 function jumpSurface(x,z){let top=null;for(const c of colliders)if(!c.interior&&Number.isFinite(c.top)&&Math.abs(x-c.x)<c.w+.16&&Math.abs(z-c.z)<c.d+.16)top=Math.max(top??0,c.top);return top;}
 async function initialize({region,interior,preview,notify=()=>{},load=global.loadVillageNPCGLTF,catalogURL='../MAP/regions/lang-viet/assets-3d.json'}={}){
  if(pending)return pending;
  if(!region?.root||!interior||typeof load!=='function'||typeof global.fetch!=='function')return false;
  pending=(async()=>{
   const response=await global.fetch(catalogURL,{cache:'no-store'});if(!response.ok)throw new Error('Không tải được danh mục mô hình Làng Việt.');
   const catalog=await response.json();if(!Array.isArray(catalog.assets))throw new Error('Danh mục mô hình Làng Việt không hợp lệ.');
   const definitions=[...global.VietVillageAssetPlacements.groups,buildPaths()];
   const required=new Set(definitions.flatMap(g=>g.placements.map(p=>p.id))),byId=new Map(catalog.assets.map(a=>[a.id,a]));
   const tasks=[...required];let next=0;
   // Four simultaneous loads avoid flooding mobile browsers with fifty requests at once.
   await Promise.all(Array.from({length:4},async()=>{while(next<tasks.length){const id=tasks[next++];try{
    const data=byId.get(id);if(!data?.url)throw new Error('Thiếu mã tài nguyên '+id);
    const mobile=(global.innerWidth||1200)<800||global.matchMedia?.('(pointer:coarse)').matches||global.VillagePerformance?.mode==='low';
    const loadedUrl=data.lod1Url&&mobile?data.lod1Url:data.url;assetRecords.set(id,{...data,loadedUrl});
    const gltf=await load(loadedUrl);if(!gltf?.scene?.isObject3D)throw new Error('GLB không có cảnh 3D');
    let meshes=0;gltf.scene.traverse(o=>{if(o.isMesh)meshes++;});if(!meshes)throw new Error('GLB không có mesh');
    if(data.strictModel)for(const name of data.animationClips||[])if(!gltf.animations?.some(clip=>clip.name===name))throw new Error('GLB thiếu hoạt ảnh '+name);
    templates.set(id,gltf);
   }catch(error){errors.push({id,url:assetRecords.get(id)?.loadedUrl||byId.get(id)?.url,message:error.message});}}}));
   for(const definition of definitions){try{addGroup(definition,definition.interior?interior:region.root);}catch(error){errors.push({group:definition.id,message:error.message});}}
   if(preview&&loadedGroups.has('house-5')){
    const replacement=loadedGroups.get('house-5').clone(true);replacement.position.copy(preview.position).multiplyScalar(-1);
    preview.clear();preview.add(replacement);
   }
   // Clone the separate house viewer before batching static shared meshes across
   // exterior families. Existing instances, fallback geometry and moving pivots
   // are deliberately excluded; an unavailable family keeps its original scene.
   optimizeStatic(region.root,true);
   ready=true;
   if(!pondModel){const error=errors.find(e=>e.id==='LV_AO_SEN_01')||errors.find(e=>e.group==='pond');notify('Chưa tích hợp được ao sen nhập: '+(assetRecords.get('LV_AO_SEN_01')?.loadedUrl||byId.get('LV_AO_SEN_01')?.url||'LV_AO_SEN_01')+'. '+(error?.message||'Lỗi mô hình')+'. Đang giữ cảnh ao trước đó; hãy tải lại trang để thử lại.');}
   if(errors.some(e=>e.id!=='LV_AO_SEN_01'&&e.group!=='pond'))notify('Một số mô hình Làng Việt chưa tải được; cảnh cũ vẫn được giữ. Xem trang kiểm tra tài nguyên.');
   return {loaded:templates.size,groups:loadedGroups.size,errors:errors.slice()};
  })().catch(error=>{errors.push({message:error.message});notify(error.message+' Đã giữ nguyên cảnh đang có.');pending=null;return false;});
  return pending;
 }
 function update(time,climateState,visible=true){
  if(!ready)return;
  const wind=global.VietVillageAssetPlacements.wind,strength=wind.enabled?(windStrength??(wind.strength+(climateState?.rain||0)*wind.rainBoost)):0;
  const delta=lastTime===null?0:Math.max(0,Math.min(.1,time-lastTime));lastTime=time;
  for(const animator of animatedAssets.values()){animator.setWind(strength<.005?'none':strength>=.5?'strong':'light');if(visible)animator.update(delta);}
  for(const root of loadedGroups.values())if(root.userData.assetGroup&&!root.userData.assetGroup.startsWith('interior')&&visible)motion.update(root,time,strength);
  for(const material of assetMaterials)material.roughness=material.userData.assetDryRoughness*(1-(climateState?.wet||0)*.42);
  for(const material of waterMaterials)material.roughness=.23+(climateState?.rain||0)*.28;
  const hour=climateState?.displayHour??12,night=hour<6||hour>18?1:0;
  for(const material of glowMaterials)material.emissiveIntensity=night?.85:.08;
 }
 global.VietVillageMapAssets=Object.freeze({initialize,update,canWalk,jumpSurface,pondContainsWater,setInterior,setWind:value=>{windStrength=Math.max(0,Math.min(1,Number(value)||0));},
  get status(){return {ready,loading:!!pending&&!ready,loaded:templates.size,groups:[...loadedGroups.keys()],errors:errors.slice(),pond:pondModel?{ready:true,url:pondModel.url,terrainCut:true,bankColliders:pondModel.bankColliders.length,...pondModel.animator.state}:{ready:false,url:assetRecords.get('LV_AO_SEN_01')?.loadedUrl}};}});
})(typeof window==='undefined'?globalThis:window);
