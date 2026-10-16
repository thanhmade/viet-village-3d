(function(global){
 'use strict';
 // This visual owns no HP, inventory, controller, collider or profile state.
 // Keep the existing player Group as the authority for position and travel.
 global.createVillagePlayerGLTFVisual=function({THREE:T,gltf,height=2.35,modelId='female-base',forwardYaw=0}){
  const model=gltf?.scene,animations=gltf?.animations||[],clipMap=new Map();
  const fail=message=>{global.disposeVillageNPCGLTF?.(gltf);throw new Error(message);};
  if(!model?.isObject3D||!Number.isFinite(height)||height<=0||!Number.isFinite(forwardYaw))fail('Mô hình hoặc chiều cao người chơi không hợp lệ.');
  for(const clip of animations){
   if(!clip.name||clipMap.has(clip.name)||!Number.isFinite(clip.duration)||clip.duration<=0)fail('Danh sách hoạt ảnh người chơi không hợp lệ.');
   clipMap.set(clip.name,clip);
  }
  for(const name of ['idle','walk','run','jump','slash','hit_to_body_01','defeat_02','defeat_03'])if(!clipMap.has(name))fail('Mô hình thiếu clip chính xác: '+name);
  const findBone=sourceName=>{
   let result=null;
   model.traverse(object=>{
    if(!object.isBone)return;
    const nodeIndex=gltf.parser?.associations?.get(object)?.nodes;
    const original=nodeIndex===undefined?null:gltf.parser?.json?.nodes?.[nodeIndex]?.name;
    if(original===sourceName||object.name===sourceName||object.name===sourceName.replace(':',''))result=object;
   });return result;
  };
  const hips=findBone('mixamorig:Hips'),hands={right:findBone('mixamorig:RightHand'),left:findBone('mixamorig:LeftHand')};
  if(!hips||!hands.right||!hands.left)fail('Mô hình thiếu xương Hips, RightHand hoặc LeftHand đã khai báo.');
  const root=new T.Group(),facing=new T.Group();root.name='player-'+modelId.replace(/-base$/,'')+'-glb-visual';root.userData.localOnly=true;root.userData.modelId=modelId;root.add(facing);facing.rotation.y=forwardYaw;facing.add(model);
  const meshes=[],skeletons=new Set();let vertices=0,triangles=0,texturedMeshes=0;
  model.traverse(object=>{
   if(!object.isMesh)return;meshes.push(object);vertices+=object.geometry.attributes.position.count;triangles+=(object.geometry.index?.count||object.geometry.attributes.position.count)/3;
   object.castShadow=false;object.receiveShadow=true;
   if(object.isSkinnedMesh){object.frustumCulled=false;skeletons.add(object.skeleton);}
   for(const material of Array.isArray(object.material)?object.material:[object.material]){
    for(const key of ['map','normalMap','roughnessMap','metalnessMap'])if(material[key]&&!material[key].image)fail('Texture người chơi chưa đọc được.');
    if(material.map)texturedMeshes++;
   }
  });
  if(!meshes.length)fail('Mô hình người chơi không có bề mặt 3D.');
  const mixer=new T.AnimationMixer(model),actions=new Map(),fadeDuration=.2;
  const actionFor=name=>{let action=actions.get(name);if(!action){action=mixer.clipAction(clipMap.get(name));actions.set(name,action);}return action;};
  let current=actionFor('idle');current.setLoop(T.LoopRepeat,Infinity).play();mixer.update(0);
  const hipAnchor=hips.position.clone(),point=new T.Vector3(),bounds=new T.Box3();
  const sync=()=>{root.updateWorldMatrix(true,false);root.updateMatrixWorld(true);skeletons.forEach(skeleton=>skeleton.update());};
  sync();bounds.setFromObject(model,true);const sourceHeight=bounds.getSize(new T.Vector3()).y;
  if(!Number.isFinite(sourceHeight)||sourceHeight<=.001)fail('Kích thước người chơi không hợp lệ.');
  facing.scale.setScalar(height/sourceHeight);sync();bounds.setFromObject(model,true);
  const center=bounds.getCenter(new T.Vector3());facing.position.set(-center.x,-bounds.min.y,-center.z);sync();
  const baseGroundY=facing.position.y,soleCells=new Map(),components=['X','Y','Z','W'];
  // Sample sole vertices only. Correct penetration, but NEVER pull a positive
  // airborne pose down to the floor (jump/run retain their authored Y motion).
  for(const mesh of meshes){
   const indices=mesh.geometry.attributes.skinIndex,weights=mesh.geometry.attributes.skinWeight;if(!indices||!weights)continue;
   for(let index=0;index<mesh.geometry.attributes.position.count;index++){
    let footWeight=0;for(const component of components){const bone=mesh.skeleton.bones[indices['get'+component](index)];if(bone&&/(Foot|Toe)/.test(bone.name))footWeight+=weights['get'+component](index);}
    if(footWeight<.5)continue;
    mesh.getVertexPosition(index,point).applyMatrix4(mesh.matrixWorld);if(point.y>height*.06)continue;
    const key=Math.floor(point.x/(height*.025))+':'+Math.floor(point.z/(height*.025)),old=soleCells.get(key);
    if(!old||point.y<old.y)soleCells.set(key,{mesh,index,y:point.y});
   }
  }
  const soles=[...soleCells.values()],groundPoint=new T.Vector3();
  const sockets={right:new T.Group(),left:new T.Group()},handCalibration={};
  for(const side of ['right','left']){
   const hand=hands[side],middle=findBone('mixamorig:'+(side==='right'?'Right':'Left')+'HandMiddle1');
   // Calibrate each supplied GLB separately. Male and Female share bone names,
   // but their palm positions and authored rest rotations are different.
   // Middle1 locates the palm in the supplied skeleton; no new bones are made.
   const palm=middle?hand.worldToLocal(middle.getWorldPosition(new T.Vector3())).multiplyScalar(.7):new T.Vector3();
   handCalibration[side]={palm,restInverse:hand.getWorldQuaternion(new T.Quaternion()).invert()};
   sockets[side].name='player-'+side+'-weapon-socket';sockets[side].userData.localOnly=true;root.add(sockets[side]);
  }
  const rootQuaternion=new T.Quaternion(),rootScale=new T.Vector3(),socketQuaternion=new T.Quaternion();
  function updateSockets(){
   root.getWorldQuaternion(rootQuaternion).invert();root.getWorldScale(rootScale);
   for(const side of ['right','left']){
    const hand=hands[side],socket=sockets[side],calibration=handCalibration[side];
    point.copy(calibration.palm);hand.localToWorld(point);root.worldToLocal(point);socket.position.copy(point);
    hand.getWorldQuaternion(socketQuaternion);socketQuaternion.multiply(calibration.restInverse);socket.quaternion.copy(rootQuaternion).multiply(socketQuaternion);
    // Existing procedural weapons use game units, not imported skeleton units.
    socket.scale.set(1/rootScale.x,1/rootScale.y,1/rootScale.z);socket.updateMatrixWorld(true);
   }
  }
  let controllerJump=false;
  function pose(){
   hips.position.x=hipAnchor.x;hips.position.z=hipAnchor.z;facing.position.y=baseGroundY;sync();
   root.getWorldPosition(groundPoint);let lowest=Infinity;
   for(const sole of soles){sole.mesh.getVertexPosition(sole.index,point).applyMatrix4(sole.mesh.matrixWorld);lowest=Math.min(lowest,point.y);}
   // During gameplay the collider supplies jump height, never add the GLB's
   // authored elevation a second time. Preview still retains authored motion.
   if(lowest<groundPoint.y||(controllerJump&&Number.isFinite(lowest))){root.getWorldScale(rootScale);facing.position.y+=(groundPoint.y-lowest)/rootScale.y;sync();}
   updateSockets();
  }
  let mode='locomotion',speed=0,outgoing=null,fadeEnd=0,returningUntil=0,pendingFinished=null,pausedPreview=false,disposed=false,defeatClip=null;
  const reviewedDefeats=new Set();
  let gait='idle';
  function locomotion(){
   if(speed<.08)gait='idle';
   else if(gait==='run'&&speed>5.1)gait='run';
   else if(speed>=5.7)gait='run';
   else if(speed>.16)gait='walk';
   return gait;
  }
  function transition(name,nextMode){
   const next=actionFor(name);if(current===next&&mode===nextMode&&nextMode==='locomotion')return true;
   if(outgoing){outgoing.stop();outgoing=null;}
   const previous=current;previous.stopFading().setEffectiveWeight(1);previous.paused=false;
   const matchStride=mode==='locomotion'&&nextMode==='locomotion'&&['walk','run'].includes(previous.getClip().name)&&['walk','run'].includes(name);
   const phase=previous.time/previous.getClip().duration;
   next.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).setLoop(nextMode==='locomotion'?T.LoopRepeat:T.LoopOnce,nextMode==='locomotion'?Infinity:1);
   if(matchStride)next.time=(phase%1)*next.getClip().duration;
   next.clampWhenFinished=nextMode!=='locomotion';next.play();
   if(previous!==next){previous.crossFadeTo(next,fadeDuration,false);outgoing=previous;fadeEnd=mixer.time+fadeDuration;}
   current=next;mode=nextMode;pausedPreview=false;pendingFinished=null;return true;
  }
  function finished(event){if(event.action===current)pendingFinished=event.action;}
  mixer.addEventListener('finished',finished);
  function returnToIdle(){if(disposed)return false;speed=0;const returning=mode==='once';transition('idle','locomotion');if(returning)returningUntil=mixer.time+fadeDuration;return true;}
  pose();
  return {
   root,mixer,clips:Object.freeze(animations.map(clip=>Object.freeze({name:clip.name,duration:clip.duration}))),hands,sockets,
   stats:Object.freeze({modelId,height,sourceHeight,scale:height/sourceHeight,vertices,triangles,texturedMeshes,bones:new Set([...skeletons].flatMap(s=>s.bones)).size,footProbes:soles.length,forward:'+Z',forwardYaw,rootMotion:'Hips X/Z locked to idle; authored Y retained',handNames:{right:hands.right.name,left:hands.left.name},socketCalibration:'source-skeleton-idle'}),
   setLocomotion(value){if(disposed)return false;speed=Number.isFinite(value)?Math.max(0,value):0;if(mode==='locomotion'){
    transition(locomotion(),'locomotion');const name=current.getClip().name;
    current.setEffectiveTimeScale(name==='idle'?1:Math.max(.45,Math.min(1.35,speed/(name==='run'?6.5:4.5))));
   }return true;},
   startJump(duration){if(disposed||mode!=='locomotion'||mixer.time<returningUntil)return false;
    controllerJump=true;transition('jump','once');current.setEffectiveTimeScale(current.getClip().duration/Math.max(.2,duration));return true;},
   endJump(){if(disposed)return;controllerJump=false;if(mode==='once'&&current.getClip().name==='jump'){transition(locomotion(),'locomotion');returningUntil=mixer.time+fadeDuration;}},
   playOnce(name){if(disposed||mode!=='locomotion'||mixer.time<returningUntil||!clipMap.has(name))return false;return transition(name,'once');},
   preview(name){if(disposed||!clipMap.has(name))return false;return transition(name,'preview');},
   pausePreview(){if(disposed||mode!=='preview')return false;pausedPreview=true;return true;},
   resumePreview(){if(disposed||mode!=='preview'||current.paused)return false;pausedPreview=false;return true;},
   returnToIdle,
   setDefeatClip(name){if(disposed||!['defeat_02','defeat_03'].includes(name)||reviewedDefeats.size!==2)return false;defeatClip=name;return true;},
   playDefeat(){if(disposed||!defeatClip)return false;if(mode==='defeat')return true;return transition(defeatClip,'defeat');},
   get state(){return {clip:current.getClip().name,time:current.time,busy:mode!=='locomotion'||mixer.time<returningUntil,preview:mode==='preview',paused:pausedPreview||current.paused,defeatClip,reviewedDefeats:[...reviewedDefeats],mode,activeActions:[...actions.values()].filter(action=>action.isScheduled()).length};},
   update(dt){
    if(disposed||!Number.isFinite(dt)||dt<0)return;
    if(!pausedPreview)mixer.update(Math.min(dt,.1));
    if(outgoing&&mixer.time>=fadeEnd){outgoing.stop();outgoing=null;current.stopFading().setEffectiveWeight(1);}
    if(pendingFinished){
     const name=current.getClip().name;pendingFinished=null;
     if(mode==='preview'&&['defeat_02','defeat_03'].includes(name))reviewedDefeats.add(name);
     if(mode==='once'){transition(locomotion(),'locomotion');returningUntil=mixer.time+fadeDuration;}
    }
    pose();
   },
   dispose(){if(disposed)return;disposed=true;mixer.removeEventListener('finished',finished);mixer.stopAllAction();mixer.uncacheRoot(model);
    // Equipment belongs to the weapon controller; don't dispose it with this GLB.
    for(const socket of Object.values(sockets))socket.clear();global.disposeVillageNPCGLTF?.(gltf);root.removeFromParent();}
  };
 };
})(window);
