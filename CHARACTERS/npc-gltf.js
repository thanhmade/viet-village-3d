(function(global){
 'use strict';
 let loaderModule;
 const scriptURL=document.currentScript?.src;
 global.loadVillageNPCGLTF=async function(url){
  const loaderURL=new URL('../ASSETS/vendor/gltf-r160/GLTFLoader.js',scriptURL||document.baseURI);
  loaderModule=loaderModule||import(loaderURL.href).catch(error=>{loaderModule=null;throw error;});
  const {GLTFLoader}=await loaderModule,manager=new global.THREE.LoadingManager(),failed=[];
  manager.onError=resource=>failed.push(resource);
  const gltf=await new GLTFLoader(manager).loadAsync(url);
  if(failed.length){disposeScene(gltf.scene);throw new Error('Không tải được chất liệu của mô hình.');}
  return gltf;
 };
 function disposeScene(scene){
  if(!scene)return;
  const geometries=new Set(),materials=new Set(),textures=new Set(),skeletons=new Set();
  scene.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.skeleton)skeletons.add(o.skeleton);
   for(const m of o.material?(Array.isArray(o.material)?o.material:[o.material]):[]){materials.add(m);for(const value of Object.values(m))if(value?.isTexture)textures.add(value);}
  });
  geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());
  textures.forEach(t=>{t.source?.data?.close?.();t.dispose();});skeletons.forEach(s=>s.dispose());scene.removeFromParent();
 }
 global.disposeVillageNPCGLTF=gltf=>disposeScene(gltf?.scene);
 global.createVillageNPCGLTFVisual=function({THREE:T,gltf,height,clipName,yaw=0,oneShots=[],lockRootMotion=false,footProbeRatio=.015}){
  const model=gltf?.scene,clip=gltf?.animations?.find(item=>item.name===clipName);
  if(!model?.isObject3D||!clip||!Number.isFinite(clip.duration)||clip.duration<=0){disposeScene(model);throw new Error('Mô hình thiếu clip chính xác: '+clipName);}
  const interactionClips=new Map();
  for(const name of oneShots){const found=gltf.animations.find(c=>c.name===name);
   if(!found||!Number.isFinite(found.duration)||found.duration<=0){disposeScene(model);throw new Error('Mô hình thiếu clip chính xác: '+name);}
   interactionClips.set(name,found);
  }
  if(!Number.isFinite(footProbeRatio)||footProbeRatio<.005||footProbeRatio>.03){disposeScene(model);throw new Error('Mật độ dò bàn chân NPC không hợp lệ.');}
  if(!Number.isFinite(height)||height<=0){disposeScene(model);throw new Error('Chiều cao NPC không hợp lệ.');}
  const root=new T.Group(),facing=new T.Group();root.name='npc-glb-visual';root.add(facing);facing.rotation.y=yaw;facing.add(model);
  const mixer=new T.AnimationMixer(model),action=mixer.clipAction(clip);action.setLoop(T.LoopRepeat,Infinity);action.play();mixer.update(0);
  const meshes=[],skeletons=new Set();let triangles=0,vertices=0,textured=0,disposed=false,hips=null;
  if(lockRootMotion){model.traverse(o=>{if(o.isBone&&/Hips$/i.test(o.name))hips=o;});
   if(!hips){disposeScene(model);throw new Error('Mô hình thiếu xương gốc để giữ vị trí sân tập.');}
  }
  model.traverse(o=>{if(!o.isMesh)return;meshes.push(o);vertices+=o.geometry.attributes.position.count;triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;
   o.castShadow=false;o.receiveShadow=true;
   // Animated bounds must not use stale bind-pose bounding spheres. One modest
   // NPC is cheaper to draw than to skin every vertex to rebuild bounds per frame.
   if(o.isSkinnedMesh){o.frustumCulled=false;skeletons.add(o.skeleton);}
   for(const m of Array.isArray(o.material)?o.material:[o.material])if(m.map){if(!m.map.image){disposeScene(model);throw new Error('Texture NPC chưa đọc được.');}textured++;}
  });
  if(!meshes.length){disposeScene(model);throw new Error('Mô hình không có bề mặt 3D.');}
  // SkinnedMesh overrides updateMatrixWorld (not updateWorldMatrix) to update
  // bindMatrixInverse after a parent is scaled or moved.
  const sync=()=>{root.updateWorldMatrix(true,false);root.updateMatrixWorld(true);skeletons.forEach(s=>s.update());};
  sync();const bounds=new T.Box3().setFromObject(model,true),size=bounds.getSize(new T.Vector3());
  if(!Number.isFinite(size.y)||size.y<=.001){disposeScene(model);throw new Error('Kích thước mô hình không hợp lệ.');}
  facing.scale.setScalar(height/size.y);sync();bounds.setFromObject(model,true);
  const center=bounds.getCenter(new T.Vector3());facing.position.set(-center.x,-bounds.min.y,-center.z);sync();
  // Keep a small set of actual sole vertices, instead of skinning all 10k vertices
  // every frame. The idle clip keeps its complete authored bone animation.
  const candidates=[],point=new T.Vector3();
  for(const mesh of meshes)for(let index=0;index<mesh.geometry.attributes.position.count;index++){
   mesh.getVertexPosition(index,point).applyMatrix4(mesh.matrixWorld);candidates.push({mesh,index,x:point.x,y:point.y,z:point.z});
  }
  candidates.sort((a,b)=>a.y-b.y);
  // Interaction clips can lift either foot. Keep vertices from BOTH feet so a
  // kick does not pull the supporting leg below ground. Elder keeps its old path.
  const footCandidates=oneShots.length?candidates.filter(p=>{
   const indices=p.mesh.geometry.attributes.skinIndex,weights=p.mesh.geometry.attributes.skinWeight;
   if(!indices||!weights||p.y>height*.18)return false;
   const components=['X','Y','Z','W'];let weight=0;
   for(const component of components){const bone=p.mesh.skeleton.bones[indices['get'+component](p.index)];
    if(bone&&/(Foot|Toe)/i.test(bone.name))weight+=weights['get'+component](p.index);
   }return weight>.25;
  }):[];
  // One lowest point per small X/Z cell covers both heel and toe without
  // evaluating ~2,000 shoe vertices every frame.
  // Finer per-model cells handle animated toe edges; existing NPCs retain their default sampling.
  const footCells=new Map(),cellSize=height*footProbeRatio;
  for(const p of footCandidates){const key=Math.floor(p.x/cellSize)+':'+Math.floor(p.z/cellSize);if(!footCells.has(key))footCells.set(key,p);}
  const soles=footCells.size?[...footCells.values()]:candidates.slice(0,64),ground=new T.Vector3(),hipPoint=new T.Vector3();
  const hipAnchor=hips?root.worldToLocal(hips.getWorldPosition(new T.Vector3())):null;
  function groundFeet(){
   sync();
   if(hips){root.worldToLocal(hips.getWorldPosition(hipPoint));facing.position.x+=hipAnchor.x-hipPoint.x;facing.position.z+=hipAnchor.z-hipPoint.z;sync();}
   root.getWorldPosition(ground);let bottom=Infinity;
   for(const probe of soles){probe.mesh.getVertexPosition(probe.index,point).applyMatrix4(probe.mesh.matrixWorld);bottom=Math.min(bottom,point.y);}
   // NPC placement parents have unit scale and Y-only heading. Keep feet on the
   // registered ground without changing the actor/collision anchor or its heading.
   facing.position.y+=ground.y-bottom;sync();
  }
  groundFeet();
  const fadeDuration=.25,interactionActions=new Map();let current=null,returning=null,returnAt=0;
  function returnToIdle(){
   if(disposed||!current)return;
   returning=current;current=null;
   action.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).play();
   returning.crossFadeTo(action,fadeDuration,false);returnAt=mixer.time+fadeDuration;
  }
  function finished(event){if(event.action===current)returnToIdle();}
  mixer.addEventListener('finished',finished);
  function playOnce(name){
   if(disposed||current||returning||!interactionClips.has(name))return false;
   let next=interactionActions.get(name);
   if(!next){next=mixer.clipAction(interactionClips.get(name));interactionActions.set(name,next);}
   next.reset().setLoop(T.LoopOnce,1).setEffectiveTimeScale(1).setEffectiveWeight(1);next.clampWhenFinished=true;next.play();
   action.stopFading().setEffectiveWeight(1).play();action.crossFadeTo(next,fadeDuration,false);current=next;return true;
  }
  return {root,mixer,action,playOnce,returnToIdle,
   get animationState(){return {clip:(current||returning||action).getClip().name,busy:!!(current||returning),phase:returning?'returning':current?'playing':'idle'};},
   stats:Object.freeze({clip:clip.name,duration:clip.duration,height,vertices,triangles,texturedMeshes:textured,footProbes:soles.length,oneShots:[...interactionClips.keys()],lockRootMotion}),
   update(dt){if(!disposed&&Number.isFinite(dt)&&dt>=0){mixer.update(Math.min(dt,.1));
    if(returning&&mixer.time>=returnAt){returning.stop();returning=null;action.stopFading().setEffectiveWeight(1);}
    groundFeet();}},
   dispose(){if(disposed)return;disposed=true;mixer.removeEventListener('finished',finished);mixer.stopAllAction();mixer.uncacheRoot(model);disposeScene(model);root.removeFromParent();}
  };
 };
})(window);
