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
  // Two-hand staff pose layered over locomotion. Solve the original arm bones;
  // sockets keep unit scale and equipment remains owned by the weapon controller.
  const sweepBones={};
  for(const side of ['right','left']){
   const prefix=side==='right'?'Right':'Left';
   sweepBones[side]={upper:findBone('mixamorig:'+prefix+'Arm'),lower:findBone('mixamorig:'+prefix+'ForeArm'),hand:hands[side]};
  }
  const spine=findBone('mixamorig:Spine1'),sweepRestore=new Map(),sweepPositions=new Map();
  const sweepLegs={};
  for(const side of ['right','left']){
   const prefix=side==='right'?'Right':'Left';
   sweepLegs[side]={upper:findBone('mixamorig:'+prefix+'UpLeg'),lower:findBone('mixamorig:'+prefix+'Leg'),foot:findBone('mixamorig:'+prefix+'Foot')};
  }
  facing.name='player-facing-pose';
  let staffSweep=null,staffSlam=null,bowDraw=null,swordStrike=null,spearTechnique=null,axeTechnique=null;
  function restoreSweep(){
   for(const [bone,q] of sweepRestore)bone.quaternion.copy(q);sweepRestore.clear();
   for(const [bone,p] of sweepPositions)bone.position.copy(p);sweepPositions.clear();
   facing.rotation.y=forwardYaw;delete sockets.right.userData.staffSweepGripX;delete sockets.right.userData.staffSlamTime;delete sockets.right.userData.bowDrawTime;delete sockets.right.userData.bowDrawSkillId;delete sockets.right.userData.swordStrikeTime;delete sockets.right.userData.swordStrikeSkillId;delete sockets.right.userData.spearTechniqueTime;delete sockets.right.userData.spearTechniqueSkillId;delete sockets.right.userData.axeTechniqueTime;delete sockets.right.userData.axeTechniqueSkillId;
  }

  function aimBone(bone,child,target){
   const origin=bone.getWorldPosition(new T.Vector3()),from=child.getWorldPosition(new T.Vector3()).sub(origin).normalize(),to=target.clone().sub(origin).normalize();
   const world=bone.getWorldQuaternion(new T.Quaternion()).premultiply(new T.Quaternion().setFromUnitVectors(from,to));
   bone.quaternion.copy(bone.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(world));root.updateMatrixWorld(true);
  }
  // Analytic two-bone IK, preserving bone lengths; the original mixer remains authoritative.
  function solveSweepLimb(upper,lower,end,target,polePoint,desiredRotation,weight){
   const start=upper.getWorldPosition(new T.Vector3()),elbow=lower.getWorldPosition(new T.Vector3()),wrist=end.getWorldPosition(new T.Vector3());
   const a=start.distanceTo(elbow),b=elbow.distanceTo(wrist),axis=target.clone().sub(start);
   const distance=Math.min(a+b-.00001,Math.max(Math.abs(a-b)+.00001,axis.length()));axis.normalize();
   const pole=polePoint.clone().sub(start);pole.addScaledVector(axis,-pole.dot(axis));
   if(pole.lengthSq()<1e-8)pole.set(1,0,0).addScaledVector(axis,-axis.x);pole.normalize();
   const x=(a*a-b*b+distance*distance)/(2*distance),y=Math.sqrt(Math.max(0,a*a-x*x));
   const targetElbow=start.clone().addScaledVector(axis,x).addScaledVector(pole,y);
   aimBone(upper,lower,targetElbow);aimBone(lower,end,target);
   end.quaternion.copy(end.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(desiredRotation));root.updateMatrixWorld(true);
   for(const bone of [upper,lower,end])bone.quaternion.slerpQuaternions(sweepRestore.get(bone),bone.quaternion.clone(),weight);
   sync();
  }
  function poseStaffSweep(){
   if(!staffSweep||!global.StaffSweep)return;
   const state=global.StaffSweep.sample(staffSweep.time),weight=state.weight;if(weight<=0)return;
   const up=new T.Vector3(0,1,0),baseFeet={};
   for(const [side,leg] of Object.entries(sweepLegs))if(leg.foot){
    baseFeet[side]={position:root.worldToLocal(leg.foot.getWorldPosition(new T.Vector3())),rotation:leg.foot.getWorldQuaternion(new T.Quaternion())};
   }
   for(const bone of [spine,...Object.values(sweepBones).flatMap(a=>[a.upper,a.lower,a.hand]),...Object.values(sweepLegs).flatMap(a=>[a.upper,a.lower,a.foot])])
    if(bone)sweepRestore.set(bone,bone.quaternion.clone());
   sweepPositions.set(hips,hips.position.clone());
   hips.position.y-=state.crouch/hips.parent.getWorldScale(new T.Vector3()).y;
   facing.rotation.y=forwardYaw+state.bodyYaw;
   if(spine)spine.quaternion.multiply(new T.Quaternion().setFromAxisAngle(up,state.torsoYaw));sync();
   // Alternate short steps as the body turns; one foot can support while the other lifts.
   for(const [side,leg] of Object.entries(sweepLegs)){
    if(!leg.upper||!leg.lower||!leg.foot)continue;
    // Repeat the footwork throughout all six revolutions, without winding legs backwards.
    const lift=.035*Math.max(0,Math.sin(state.spinAngle*2+(side==='right'?0:Math.PI)));
    const yaw=state.bodyYaw,base=baseFeet[side];
    const target=base.position.clone().applyAxisAngle(up,yaw);target.y+=lift*weight;
    const pole=new T.Vector3(side==='right'?-.25:.25,.55,1).applyAxisAngle(up,forwardYaw+state.bodyYaw);
    const worldYaw=root.getWorldQuaternion(new T.Quaternion()).multiply(new T.Quaternion().setFromAxisAngle(up,yaw)).multiply(root.getWorldQuaternion(new T.Quaternion()).invert());
    solveSweepLimb(leg.upper,leg.lower,leg.foot,root.localToWorld(target),root.localToWorld(pole),worldYaw.multiply(base.rotation),weight);
   }
   const direction=new T.Vector3(Math.cos(state.staffYaw),0,-Math.sin(state.staffYaw)).applyAxisAngle(up,forwardYaw);
   const center=new T.Vector3(0,state.handY,state.handZ).applyAxisAngle(up,forwardYaw+state.bodyYaw);
   const rotation=root.getWorldQuaternion(new T.Quaternion()).multiply(new T.Quaternion().setFromAxisAngle(up,forwardYaw+state.staffYaw));
   for(const side of ['right','left']){
    const {upper,lower,hand}=sweepBones[side];if(!upper||!lower)continue;
    const desiredPalm=root.localToWorld(center.clone().addScaledVector(direction,(side==='right'?-.5:.5)*state.handSpacing));
    const desiredHand=rotation.clone().multiply(handCalibration[side].restInverse.clone().invert());
    const palmOffset=handCalibration[side].palm.clone().multiply(hand.getWorldScale(new T.Vector3())).applyQuaternion(desiredHand),target=desiredPalm.clone().sub(palmOffset);
    const pole=new T.Vector3(side==='right'?-.9:.9,.85,.10).applyAxisAngle(up,forwardYaw+state.bodyYaw);
    solveSweepLimb(upper,lower,hand,target,root.localToWorld(pole),desiredHand,weight);
   }
   sync();updateSockets();sockets.right.userData.staffSweepGripX=state.gripX;
  }
  function poseStaffSlam(){
   if(!staffSlam||!global.StaffSlam)return;
   sockets.right.userData.staffSlamTime=staffSlam.time;
   const state=global.StaffSlam.sample(staffSlam.time),weight=state.weight;if(weight<=0)return;
   const up=new T.Vector3(0,1,0),baseFeet={};
   for(const [side,leg] of Object.entries(sweepLegs))if(leg.foot)
    baseFeet[side]={position:root.worldToLocal(leg.foot.getWorldPosition(new T.Vector3())),rotation:leg.foot.getWorldQuaternion(new T.Quaternion())};
   for(const bone of [...Object.values(sweepBones).flatMap(a=>[a.upper,a.lower,a.hand]),...Object.values(sweepLegs).flatMap(a=>[a.upper,a.lower,a.foot])])
    if(bone)sweepRestore.set(bone,bone.quaternion.clone());
   sweepPositions.set(hips,hips.position.clone());hips.position.y-=state.crouch/hips.parent.getWorldScale(new T.Vector3()).y;sync();
   for(const [side,leg] of Object.entries(sweepLegs)){
    if(!leg.upper||!leg.lower||!leg.foot)continue;
    const target=baseFeet[side].position.clone();target.y+=state.tuck;
    const pole=new T.Vector3(side==='right'?-.35:.35,.65,.8).applyAxisAngle(up,forwardYaw);
    solveSweepLimb(leg.upper,leg.lower,leg.foot,root.localToWorld(target),root.localToWorld(pole),baseFeet[side].rotation,weight);
   }
   const handRotation=new T.Quaternion().setFromAxisAngle(up,forwardYaw).multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0,0,1),state.staffPitch));
   const staffRotation=handRotation.clone().multiply(new T.Quaternion().setFromAxisAngle(up,Math.PI));
   const rightPalm=new T.Vector3(state.handX,state.handY,state.handZ).applyAxisAngle(up,forwardYaw);
   for(const side of ['right','left']){
    const {upper,lower,hand}=sweepBones[side];if(!upper||!lower)continue;
    const local=rightPalm.clone();if(side==='left')local.add(new T.Vector3(global.StaffSlam.leftGripX*.7,0,0).applyQuaternion(staffRotation));
    const desiredHand=root.getWorldQuaternion(new T.Quaternion()).multiply(handRotation).multiply(handCalibration[side].restInverse.clone().invert());
    const offset=handCalibration[side].palm.clone().multiply(hand.getWorldScale(new T.Vector3())).applyQuaternion(desiredHand);
    const target=root.localToWorld(local).sub(offset),pole=root.localToWorld(new T.Vector3(side==='right'?-.9:.9,1.3,.15).applyAxisAngle(up,forwardYaw));
    solveSweepLimb(upper,lower,hand,target,pole,desiredHand,weight);
   }
   sync();
   // An authored skill leap: visual lift only; never call the normal controller jump twice.
   let minimum=Infinity;for(const sole of soles){sole.mesh.getVertexPosition(sole.index,point).applyMatrix4(sole.mesh.matrixWorld);minimum=Math.min(minimum,point.y);}
   root.getWorldPosition(groundPoint);root.getWorldScale(rootScale);
   if(minimum<groundPoint.y)facing.position.y+=(groundPoint.y-minimum)/rootScale.y;
   facing.position.y+=state.lift/rootScale.y;sync();updateSockets();
  }
  function bowPoseSpec(skillId){return skillId==='bow.mua-ten'?global.BowRain:skillId==='bow.lien-tien'?global.BowVolley:skillId==='bow.xuyen-tien'?global.BowPiercing:null;}
  function poseBowDraw(){
   if(!bowDraw||!bowPoseSpec(bowDraw.skillId))return;
   sockets.right.userData.bowDrawTime=bowDraw.time;sockets.right.userData.bowDrawSkillId=bowDraw.skillId;
   const state=bowPoseSpec(bowDraw.skillId).sample(bowDraw.time),weight=state.weight;if(weight<=0)return;
   const bowYaw=forwardYaw+(state.yaw||0);
   const up=new T.Vector3(0,1,0),pitch=new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),state.pitch||0),rotation=new T.Quaternion().setFromAxisAngle(up,bowYaw).multiply(pitch);
   for(const bone of Object.values(sweepBones).flatMap(a=>[a.upper,a.lower,a.hand]))if(bone)sweepRestore.set(bone,bone.quaternion.clone());
   for(const side of ['right','left']){
    const {upper,lower,hand}=sweepBones[side];if(!upper||!lower)continue;
    const palm=new T.Vector3(state.handX,state.handY,state.handZ);
    if(side==='left')palm.add(new T.Vector3(0,.035*.7,-(.4+state.draw)*.7).applyQuaternion(pitch));
    palm.applyAxisAngle(up,bowYaw);
    const desired=root.getWorldQuaternion(new T.Quaternion()).multiply(rotation).multiply(handCalibration[side].restInverse.clone().invert());
    const offset=handCalibration[side].palm.clone().multiply(hand.getWorldScale(new T.Vector3())).applyQuaternion(desired);
    const target=root.localToWorld(palm).sub(offset),pole=root.localToWorld(new T.Vector3(side==='right'?-.8:.8,1.7,-.35).applyAxisAngle(up,bowYaw));
    solveSweepLimb(upper,lower,hand,target,pole,desired,weight);
   }
   sync();updateSockets();
  }
  function swordPoseSpec(id){return id==='sword.kiem-khi'?global.SwordQi:id==='sword.kiem-hoa'?global.SwordFlower:id==='sword.nhat-kiem'?global.SwordStrike:null;}
  function poseSwordStrike(){
   if(!swordStrike||!swordPoseSpec(swordStrike.skillId))return;
   const spec=swordPoseSpec(swordStrike.skillId);
   sockets.right.userData.swordStrikeTime=swordStrike.time;sockets.right.userData.swordStrikeSkillId=swordStrike.skillId;
   const state=spec.sample(swordStrike.time),weight=state.weight;if(weight<=0)return;
   const up=new T.Vector3(0,1,0),heading=new T.Quaternion().setFromAxisAngle(up,forwardYaw),weaponRotation=heading.clone().multiply(spec.rotation(T,state));
   const feet={};for(const [side,leg] of Object.entries(sweepLegs))if(leg.foot)feet[side]={position:root.worldToLocal(leg.foot.getWorldPosition(new T.Vector3())),rotation:leg.foot.getWorldQuaternion(new T.Quaternion())};
   for(const bone of [spine,...Object.values(sweepBones).flatMap(a=>[a.upper,a.lower,a.hand]),...Object.values(sweepLegs).flatMap(a=>[a.upper,a.lower,a.foot])])if(bone)sweepRestore.set(bone,bone.quaternion.clone());
   sweepPositions.set(hips,hips.position.clone());
   facing.rotation.y=forwardYaw+state.bodyYaw;
   sync();
   // Drive the pelvis over the planted front leg. Convert the visual displacement
   // through the actual rig parent; the gameplay actor/collider never teleports.
   const drive=new T.Vector3(0,-state.crouch,state.drive).applyQuaternion(heading).applyQuaternion(root.getWorldQuaternion(new T.Quaternion())).applyQuaternion(hips.parent.getWorldQuaternion(new T.Quaternion()).invert()).divide(hips.parent.getWorldScale(new T.Vector3()));
   hips.position.add(drive);
   sync();
   if(spine){
    // GLB bone-local X is not actor-right. Apply the lean in the heading frame
    // so both source rigs bend toward the cut instead of arching backward.
    const basis=root.getWorldQuaternion(new T.Quaternion()).multiply(heading).multiply(new T.Quaternion().setFromAxisAngle(up,spec.footstep?state.bodyYaw:0)),world=spine.getWorldQuaternion(new T.Quaternion());
    const yawQ=new T.Quaternion().setFromAxisAngle(up.clone().applyQuaternion(basis),state.torsoYaw*weight),leanQ=new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0).applyQuaternion(basis),state.lean*weight);
    spine.quaternion.copy(spine.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(leanQ.multiply(yawQ).multiply(world)));
   }sync();
   // Step into and out of the stance one foot at a time on a short lifted arc (left
   // leads in, right leads out). Blending the leg rotations alone skated both feet.
   const ease=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
   for(const [side,leg] of Object.entries(sweepLegs))if(leg.upper&&leg.lower&&leg.foot){
    if(spec.footstep){
     const foot=spec.footstep(state,side),base=feet[side],yaw=foot.yaw;
     const entry=side==='left'?ease(weight*2):ease(weight*2-1),travel=ease((entry-.1)/.7);
     const target=base.position.clone().add(new T.Vector3((side==='left'?state.stanceWidth:-state.stanceWidth)*travel,0,(side==='left'?state.frontStep:state.backStep)*travel).applyQuaternion(heading)).applyAxisAngle(up,yaw);target.y+=foot.lift+.075*Math.sin(Math.PI*entry);
     const pole=new T.Vector3(side==='right'?-.35:.35,.65,.8).applyAxisAngle(up,forwardYaw+state.bodyYaw);
     const worldYaw=root.getWorldQuaternion(new T.Quaternion()).multiply(new T.Quaternion().setFromAxisAngle(up,yaw)).multiply(root.getWorldQuaternion(new T.Quaternion()).invert());
     solveSweepLimb(leg.upper,leg.lower,leg.foot,root.localToWorld(target),root.localToWorld(pole),worldYaw.multiply(base.rotation),Math.min(1,weight*6));continue;
    }
    // The foot travels only while it is clear of the ground (middle of the lift).
    const step=side==='left'?ease(weight*2):ease(weight*2-1),travel=ease((step-.1)/.7),base=feet[side];
    const target=base.position.clone().add(new T.Vector3((side==='left'?state.stanceWidth:-state.stanceWidth)*travel,.07*Math.sin(Math.PI*step),(side==='left'?state.frontStep:state.backStep)*travel).applyQuaternion(heading)),pole=new T.Vector3(side==='right'?-.35:.35,.65,.8).applyQuaternion(heading);
    // The wider V3 step needs the solver fully engaged before lateral travel.
    solveSweepLimb(leg.upper,leg.lower,leg.foot,root.localToWorld(target),root.localToWorld(pole),base.rotation,Math.min(1,weight*6));
   }
   // Blended entry/recovery can dip the sole below ground even with foot IK.
   // Correct the visual before arm IK so the held blade keeps its world anchors.
   let soleY=Infinity;for(const sole of soles){sole.mesh.getVertexPosition(sole.index,point).applyMatrix4(sole.mesh.matrixWorld);soleY=Math.min(soleY,point.y);}
   root.getWorldPosition(groundPoint);root.getWorldScale(rootScale);
   if(soleY<groundPoint.y){facing.position.y+=(groundPoint.y-soleY)/rootScale.y;sync();}
   for(const side of ['right','left']){
    const {upper,lower,hand}=sweepBones[side];if(!upper||!lower)continue;
    const palm=(side==='right'?new T.Vector3(state.handX,state.handY,state.handZ):new T.Vector3(state.guardX,state.guardY,state.guardZ)).applyQuaternion(heading);
    const rotation=side==='right'?weaponRotation:heading.clone().multiply(new T.Quaternion().setFromAxisAngle(up,state.armYaw||0));
    const desired=root.getWorldQuaternion(new T.Quaternion()).multiply(rotation).multiply(handCalibration[side].restInverse.clone().invert());
    const offset=handCalibration[side].palm.clone().multiply(hand.getWorldScale(new T.Vector3())).applyQuaternion(desired),target=root.localToWorld(palm).sub(offset);
    const pole=root.localToWorld(new T.Vector3(side==='right'?-.85:.75,side==='right'?1.23:1.1,-.30).applyAxisAngle(up,state.armYaw||0).applyQuaternion(heading));
    solveSweepLimb(upper,lower,hand,target,pole,desired,weight);
   }
   sync();updateSockets();
  }
  function poseSpearTechnique(){
   if(!spearTechnique||!global.SpearTechniques?.spec(spearTechnique.skillId))return;
   sockets.right.userData.spearTechniqueTime=spearTechnique.time;sockets.right.userData.spearTechniqueSkillId=spearTechnique.skillId;
   const state=global.SpearTechniques.sample(spearTechnique.skillId,spearTechnique.time),weight=state.weight;if(weight<=0)return;
   const up=new T.Vector3(0,1,0),heading=new T.Quaternion().setFromAxisAngle(up,forwardYaw),weaponRotation=heading.clone().multiply(global.SpearTechniques.rotation(T,spearTechnique.skillId,spearTechnique.time));
   const feet={};for(const [side,leg] of Object.entries(sweepLegs))if(leg.foot)feet[side]={position:root.worldToLocal(leg.foot.getWorldPosition(new T.Vector3())),rotation:leg.foot.getWorldQuaternion(new T.Quaternion())};
   for(const bone of [spine,...Object.values(sweepBones).flatMap(a=>[a.upper,a.lower,a.hand]),...Object.values(sweepLegs).flatMap(a=>[a.upper,a.lower,a.foot])])if(bone)sweepRestore.set(bone,bone.quaternion.clone());
   sweepPositions.set(hips,hips.position.clone());
   facing.rotation.y=forwardYaw+state.bodyYaw;
   sync();
   // Drive the pelvis over the planted front leg. Convert the visual displacement
   // through the actual rig parent; the gameplay actor/collider never teleports.
   const drive=new T.Vector3(0,-state.crouch,state.drive).applyQuaternion(heading).applyQuaternion(root.getWorldQuaternion(new T.Quaternion())).applyQuaternion(hips.parent.getWorldQuaternion(new T.Quaternion()).invert()).divide(hips.parent.getWorldScale(new T.Vector3()));
   hips.position.add(drive);
   sync();
   if(spine){
    // GLB bone-local X is not actor-right. Apply the lean in the heading frame
    // so both source rigs bend toward the cut instead of arching backward.
    const basis=root.getWorldQuaternion(new T.Quaternion()).multiply(heading).multiply(new T.Quaternion().setFromAxisAngle(up,state.bodyYaw)),world=spine.getWorldQuaternion(new T.Quaternion());
    const yawQ=new T.Quaternion().setFromAxisAngle(up.clone().applyQuaternion(basis),state.torsoYaw*weight),leanQ=new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0).applyQuaternion(basis),state.lean*weight);
    spine.quaternion.copy(spine.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(leanQ.multiply(yawQ).multiply(world)));
   }sync();
   // Enter the stance on lifted arcs. During Phá Trận each support foot stays
   // planted until its alternating quarter-turn step; the gameplay root stays still.
   const ease=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
   for(const [side,leg] of Object.entries(sweepLegs))if(leg.upper&&leg.lower&&leg.foot){
    const entry=side==='left'?ease(weight*2):ease(weight*2-1),travel=ease((entry-.1)/.7),base=feet[side];
    const spin=(state.spinProgress||0)*Math.PI*4;
    let yaw=0,lift=.075*Math.sin(Math.PI*entry);
    if(spin>0){
     // Alternate quarter turns, holding on the ground outside the short lift.
     const q=spin/(Math.PI/2),offset=side==='left'?0:.5,cycle=side==='right'&&q>7.5?7+(q-7.5)*2:Math.max(0,q-offset),i=Math.floor(cycle),u=cycle-i;
     const motion=ease((u-.12)/.76);yaw=(i+motion)*Math.PI/2;
     if(q>=8-1e-8)yaw=Math.PI*4;
     lift+=.105*Math.sin(Math.PI*Math.max(0,Math.min(1,(u-.12)/.76)))*weight;
    }
    const target=base.position.clone().add(new T.Vector3((side==='left'?state.stanceWidth:-state.stanceWidth)*travel,0,(side==='left'?state.frontStep:state.backStep)*travel).applyQuaternion(heading)).applyAxisAngle(up,yaw);target.y+=lift;
    const pole=new T.Vector3(side==='right'?-.35:.35,.65,.8).applyAxisAngle(up,forwardYaw+state.bodyYaw);
    // A broad single sweep pivots the soles in place; it does not inherit the
    // continuous orbiting footwork of the two-turn vortex.
    const footYaw=spearTechnique.skillId==='spear.thuong-phong'?state.bodyYaw*(side==='left'?.55:.40):yaw;
    const worldYaw=root.getWorldQuaternion(new T.Quaternion()).multiply(new T.Quaternion().setFromAxisAngle(up,footYaw)).multiply(root.getWorldQuaternion(new T.Quaternion()).invert());
    solveSweepLimb(leg.upper,leg.lower,leg.foot,root.localToWorld(target),root.localToWorld(pole),worldYaw.multiply(base.rotation),Math.min(1,weight*6));
   }
   // Blended entry/recovery can dip the sole below ground even with foot IK.
   // Correct the visual before arm IK so the held blade keeps its world anchors.
   let soleY=Infinity;for(const sole of soles){sole.mesh.getVertexPosition(sole.index,point).applyMatrix4(sole.mesh.matrixWorld);soleY=Math.min(soleY,point.y);}
   root.getWorldPosition(groundPoint);root.getWorldScale(rootScale);
   if(soleY<groundPoint.y){facing.position.y+=(groundPoint.y-soleY)/rootScale.y;sync();}
   for(const side of ['right','left']){
    const {upper,lower,hand}=sweepBones[side];if(!upper||!lower)continue;
    // Both real palms grip the same shaft. The front hand follows the shaft
    // direction, never an independent guard pose or the decorative VFX ribbon.
    const palm=new T.Vector3(state.handX,state.handY,state.handZ).applyQuaternion(heading);
    if(side==='left')palm.add(new T.Vector3(0,state.frontGripDistance,0).applyQuaternion(weaponRotation));
    const rotation=weaponRotation;
    const desired=root.getWorldQuaternion(new T.Quaternion()).multiply(rotation).multiply(handCalibration[side].restInverse.clone().invert());
    const offset=handCalibration[side].palm.clone().multiply(hand.getWorldScale(new T.Vector3())).applyQuaternion(desired),target=root.localToWorld(palm).sub(offset);
    const pole=root.localToWorld(new T.Vector3(side==='right'?-.85:.75,side==='right'?1.15:1.18,-.10).applyAxisAngle(up,state.bodyYaw).applyQuaternion(heading));
    solveSweepLimb(upper,lower,hand,target,pole,desired,weight);
   }
   sync();updateSockets();
  }
  function poseAxeTechnique(){
   if(!axeTechnique||!global.AxeTechniques?.spec(axeTechnique.skillId))return;
   sockets.right.userData.axeTechniqueTime=axeTechnique.time;sockets.right.userData.axeTechniqueSkillId=axeTechnique.skillId;
   const state=global.AxeTechniques.sample(axeTechnique.skillId,axeTechnique.time),weight=state.weight;if(weight<=0)return;
   const up=new T.Vector3(0,1,0),heading=new T.Quaternion().setFromAxisAngle(up,forwardYaw),weaponRotation=heading.clone().multiply(global.AxeTechniques.rotation(T,axeTechnique.skillId,axeTechnique.time));
   const feet={};for(const [side,leg] of Object.entries(sweepLegs))if(leg.foot)feet[side]={position:root.worldToLocal(leg.foot.getWorldPosition(new T.Vector3())),rotation:leg.foot.getWorldQuaternion(new T.Quaternion())};
   for(const bone of [spine,...Object.values(sweepBones).flatMap(a=>[a.upper,a.lower,a.hand]),...Object.values(sweepLegs).flatMap(a=>[a.upper,a.lower,a.foot])])if(bone)sweepRestore.set(bone,bone.quaternion.clone());
   sweepPositions.set(hips,hips.position.clone());
   facing.rotation.y=forwardYaw+state.bodyYaw;
   sync();
   // Drive the pelvis over the planted front leg. Convert the visual displacement
   // through the actual rig parent; the gameplay actor/collider never teleports.
   const drive=new T.Vector3(0,-state.crouch,state.drive).applyQuaternion(heading).applyQuaternion(root.getWorldQuaternion(new T.Quaternion())).applyQuaternion(hips.parent.getWorldQuaternion(new T.Quaternion()).invert()).divide(hips.parent.getWorldScale(new T.Vector3()));
   hips.position.add(drive);
   sync();
   if(spine){
    // GLB bone-local X is not actor-right. Apply the lean in the heading frame
    // so both source rigs bend toward the cut instead of arching backward.
    const basis=root.getWorldQuaternion(new T.Quaternion()).multiply(heading).multiply(new T.Quaternion().setFromAxisAngle(up,state.bodyYaw)),world=spine.getWorldQuaternion(new T.Quaternion());
    const yawQ=new T.Quaternion().setFromAxisAngle(up.clone().applyQuaternion(basis),state.torsoYaw*weight),leanQ=new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0).applyQuaternion(basis),state.lean*weight);
    spine.quaternion.copy(spine.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(leanQ.multiply(yawQ).multiply(world)));
   }sync();
   // Enter the stance on lifted arcs. During Cuồng Phong each support foot stays
   // planted until its alternating quarter-turn step; the gameplay root stays still.
   const ease=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
   for(const [side,leg] of Object.entries(sweepLegs))if(leg.upper&&leg.lower&&leg.foot){
    const entry=side==='left'?ease(weight*2):ease(weight*2-1),travel=ease((entry-.1)/.7),base=feet[side];
    const spin=state.spinAngle||0,totalSpin=Math.PI*8,totalQuarters=16;
    let yaw=0,lift=.075*Math.sin(Math.PI*entry);
    if(spin>0){
     // Alternate quarter turns, holding on the ground outside the short lift.
     const q=spin/(Math.PI/2),offset=side==='left'?0:.5,cycle=side==='right'&&q>totalQuarters-.5?totalQuarters-1+(q-totalQuarters+.5)*2:Math.max(0,q-offset),i=Math.floor(cycle),u=cycle-i;
     const motion=ease((u-.12)/.76);yaw=(i+motion)*Math.PI/2;
     if(q>=totalQuarters-1e-8)yaw=totalSpin;
     lift+=.105*Math.sin(Math.PI*Math.max(0,Math.min(1,(u-.12)/.76)))*weight;
    }
    const target=base.position.clone().add(new T.Vector3((side==='left'?state.stanceWidth:-state.stanceWidth)*travel,0,(side==='left'?state.frontStep:state.backStep)*travel).applyQuaternion(heading)).applyAxisAngle(up,yaw);target.y+=lift;
    const pole=new T.Vector3(side==='right'?-.35:.35,.65,.8).applyAxisAngle(up,forwardYaw+state.bodyYaw);
    // Planted chops pivot the soles to follow the hips; the cyclone uses
    // alternating quarter-turn steps throughout all four revolutions.
    const footYaw=axeTechnique.skillId!=='axe.cuong-phong'?state.bodyYaw*(side==='left'?.55:.40):yaw;
    const worldYaw=root.getWorldQuaternion(new T.Quaternion()).multiply(new T.Quaternion().setFromAxisAngle(up,footYaw)).multiply(root.getWorldQuaternion(new T.Quaternion()).invert());
    solveSweepLimb(leg.upper,leg.lower,leg.foot,root.localToWorld(target),root.localToWorld(pole),worldYaw.multiply(base.rotation),Math.min(1,weight*6));
   }
   // Blended entry/recovery can dip the sole below ground even with foot IK.
   // Correct the visual before arm IK so the held blade keeps its world anchors.
   let soleY=Infinity;for(const sole of soles){sole.mesh.getVertexPosition(sole.index,point).applyMatrix4(sole.mesh.matrixWorld);soleY=Math.min(soleY,point.y);}
   root.getWorldPosition(groundPoint);root.getWorldScale(rootScale);
   if(soleY<groundPoint.y){facing.position.y+=(groundPoint.y-soleY)/rootScale.y;sync();}
   for(const side of ['right','left']){
    const {upper,lower,hand}=sweepBones[side];if(!upper||!lower)continue;
    // Both real palms grip the same shaft. The front hand follows the shaft
    // direction, never an independent guard pose or the decorative VFX ribbon.
    const palm=new T.Vector3(state.handX,state.handY,state.handZ).applyQuaternion(heading);
    if(side==='left')palm.add(new T.Vector3(0,state.frontGripDistance,0).applyQuaternion(weaponRotation));
    const rotation=weaponRotation;
    const desired=root.getWorldQuaternion(new T.Quaternion()).multiply(rotation).multiply(handCalibration[side].restInverse.clone().invert());
    const offset=handCalibration[side].palm.clone().multiply(hand.getWorldScale(new T.Vector3())).applyQuaternion(desired),target=root.localToWorld(palm).sub(offset);
    // A cross-body axe chop needs the rear elbow in front of the ribs.
    // A pole behind the spine sends the forearm through the torso even when
    // both mathematically correct palm anchors touch the shaft.
    const isCyclone=axeTechnique.skillId==='axe.cuong-phong',rear=side==='right';
    const elbowForward=isCyclone?-.10:(rear?1.20:.25);
    const pole=root.localToWorld(new T.Vector3(rear?(isCyclone?-.85:-.20):.75,rear?(isCyclone?1.15:state.handY+.05):1.18,elbowForward).applyAxisAngle(up,state.bodyYaw).applyQuaternion(heading));
    solveSweepLimb(upper,lower,hand,target,pole,desired,axeTechnique.skillId==='axe.khai-son'?Math.min(1,weight*1.8):weight);
   }
   sync();updateSockets();
  }
  let controllerJump=false;
  function pose(){
   hips.position.x=hipAnchor.x;hips.position.z=hipAnchor.z;facing.position.y=baseGroundY;sync();
   root.getWorldPosition(groundPoint);let lowest=Infinity;
   for(const sole of soles){sole.mesh.getVertexPosition(sole.index,point).applyMatrix4(sole.mesh.matrixWorld);lowest=Math.min(lowest,point.y);}
   // During gameplay the collider supplies jump height, never add the GLB's
   // authored elevation a second time. Preview still retains authored motion.
   if(lowest<groundPoint.y||(controllerJump&&Number.isFinite(lowest))){root.getWorldScale(rootScale);facing.position.y+=(groundPoint.y-lowest)/rootScale.y;sync();}
   updateSockets();poseStaffSweep();poseStaffSlam();poseBowDraw();poseSwordStrike();poseSpearTechnique();poseAxeTechnique();
   if(staffSweep){
    let minimum=Infinity;for(const sole of soles){sole.mesh.getVertexPosition(sole.index,point).applyMatrix4(sole.mesh.matrixWorld);minimum=Math.min(minimum,point.y);}
    if(minimum<groundPoint.y){root.getWorldScale(rootScale);facing.position.y+=(groundPoint.y-minimum)/rootScale.y;sync();updateSockets();}
   }
  }
  let mode='locomotion',speed=0,outgoing=null,fadeEnd=0,returningUntil=0,pendingFinished=null,pausedPreview=false,disposed=false,defeatClip=null,segmentEnd=Infinity;
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
   segmentEnd=Infinity;
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
  function returnToIdle(){if(disposed)return false;staffSweep=null;staffSlam=null;bowDraw=null;swordStrike=null;spearTechnique=null;axeTechnique=null;restoreSweep();speed=0;const returning=mode==='once';transition('idle','locomotion');if(returning)returningUntil=mixer.time+fadeDuration;pose();return true;}
  pose();
  return {
   root,mixer,clips:Object.freeze(animations.map(clip=>Object.freeze({name:clip.name,duration:clip.duration}))),hands,sockets,
   stats:Object.freeze({modelId,height,sourceHeight,scale:height/sourceHeight,vertices,triangles,texturedMeshes,bones:new Set([...skeletons].flatMap(s=>s.bones)).size,footProbes:soles.length,forward:'+Z',forwardYaw,rootMotion:'Hips X/Z locked to idle; authored Y retained',handNames:{right:hands.right.name,left:hands.left.name},socketCalibration:'source-skeleton-idle'}),
   setLocomotion(value){if(disposed)return false;speed=staffSlam||bowDraw||swordStrike||spearTechnique||axeTechnique?0:Number.isFinite(value)?Math.max(0,value):0;if(mode==='locomotion'){
    transition(locomotion(),'locomotion');const name=current.getClip().name;
    current.setEffectiveTimeScale(name==='idle'?1:Math.max(.45,Math.min(1.35,speed/(name==='run'?6.5:4.5))));
   }return true;},
   startAxeTechnique(skillId='axe.khai-son'){if(disposed||mode==='defeat'||mode==='preview'||staffSweep||staffSlam||bowDraw||swordStrike||spearTechnique||axeTechnique||!global.AxeTechniques?.spec(skillId)||controllerJump)return false;restoreSweep();transition('idle','locomotion');speed=0;axeTechnique={time:0,skillId};pose();return true;},
   cancelAxeTechnique(){if(disposed||!axeTechnique)return;axeTechnique=null;restoreSweep();pose();},
   startSpearTechnique(skillId='spear.xuyen-kich'){if(disposed||mode==='defeat'||mode==='preview'||staffSweep||staffSlam||bowDraw||swordStrike||spearTechnique||axeTechnique||!global.SpearTechniques?.spec(skillId)||controllerJump)return false;restoreSweep();transition('idle','locomotion');speed=0;spearTechnique={time:0,skillId};pose();return true;},
   cancelSpearTechnique(){if(disposed||!spearTechnique)return;spearTechnique=null;restoreSweep();pose();},
   startSwordStrike(skillId='sword.nhat-kiem'){if(disposed||mode==='defeat'||mode==='preview'||staffSweep||staffSlam||bowDraw||swordStrike||spearTechnique||axeTechnique||!swordPoseSpec(skillId)||controllerJump)return false;restoreSweep();transition('idle','locomotion');speed=0;swordStrike={time:0,skillId};pose();return true;},
   cancelSwordStrike(){if(disposed||!swordStrike)return;swordStrike=null;restoreSweep();pose();},
   startBowDraw(skillId='bow.xuyen-tien'){if(disposed||mode==='defeat'||mode==='preview'||staffSweep||staffSlam||bowDraw||swordStrike||spearTechnique||axeTechnique||!bowPoseSpec(skillId)||controllerJump)return false;restoreSweep();transition('idle','locomotion');speed=0;bowDraw={time:0,skillId};pose();return true;},
   cancelBowDraw(){if(disposed||!bowDraw)return;bowDraw=null;restoreSweep();pose();},
   startStaffSlam(){if(disposed||mode==='defeat'||mode==='preview'||staffSweep||staffSlam||bowDraw||swordStrike||spearTechnique||axeTechnique||!global.StaffSlam||controllerJump)return false;restoreSweep();transition('idle','locomotion');speed=0;staffSlam={time:0};pose();return true;},
   cancelStaffSlam(){if(disposed||!staffSlam)return;staffSlam=null;restoreSweep();pose();},
   startStaffSweep(){if(disposed||mode!=='locomotion'||staffSweep||staffSlam||bowDraw||swordStrike||spearTechnique||axeTechnique||!global.StaffSweep||controllerJump)return false;staffSweep={time:0};pose();return true;},
   cancelStaffSweep(){if(disposed||!staffSweep)return;staffSweep=null;staffSlam=null;bowDraw=null;swordStrike=null;spearTechnique=null;axeTechnique=null;restoreSweep();pose();},
   startJump(duration){if(disposed||mode!=='locomotion'||staffSweep||staffSlam||bowDraw||swordStrike||spearTechnique||axeTechnique||mixer.time<returningUntil)return false;
    controllerJump=true;transition('jump','once');current.setEffectiveTimeScale(current.getClip().duration/Math.max(.2,duration));return true;},
   endJump(){if(disposed)return;controllerJump=false;if(mode==='once'&&current.getClip().name==='jump'){transition(locomotion(),'locomotion');returningUntil=mixer.time+fadeDuration;}},
   playOnce(name){if(disposed||staffSweep||staffSlam||bowDraw||swordStrike||spearTechnique||axeTechnique||mode!=='locomotion'||mixer.time<returningUntil||!clipMap.has(name))return false;return transition(name,'once');},
   // One part of a clip (Hộ Thân / legacy preview): starts at `from`, returns to locomotion at `to`.
   // `force` may cut another one-shot (skill after skill), never defeat, a preview,
   // the two-hand Côn Quét pose or a controller jump.
   playSegment(name,{from=0,to=Infinity,force=false}={}){
    if(disposed||!clipMap.has(name)||mode==='defeat'||mode==='preview'||staffSweep||staffSlam||bowDraw||swordStrike||spearTechnique||axeTechnique||controllerJump)return false;
    if(!force&&(mode!=='locomotion'||mixer.time<returningUntil))return false;
    const duration=clipMap.get(name).duration,start=Math.max(0,Math.min(Number.isFinite(from)?from:0,duration)),end=Math.min(duration,Number.isFinite(to)?to:duration);
    if(!(end>start))return false;
    transition(name,'once');current.time=start;segmentEnd=end<duration?end:Infinity;return true;
   },
   preview(name){if(disposed||!clipMap.has(name))return false;staffSweep=null;staffSlam=null;bowDraw=null;swordStrike=null;spearTechnique=null;axeTechnique=null;restoreSweep();return transition(name,'preview');},
   pausePreview(){if(disposed||mode!=='preview')return false;pausedPreview=true;return true;},
   resumePreview(){if(disposed||mode!=='preview'||current.paused)return false;pausedPreview=false;return true;},
   returnToIdle,
   setDefeatClip(name){if(disposed||!['defeat_02','defeat_03'].includes(name)||reviewedDefeats.size!==2)return false;defeatClip=name;return true;},
   playDefeat(){if(disposed||!defeatClip)return false;staffSweep=null;staffSlam=null;bowDraw=null;swordStrike=null;spearTechnique=null;axeTechnique=null;restoreSweep();if(mode==='defeat')return true;return transition(defeatClip,'defeat');},
   get state(){return {clip:current.getClip().name,time:current.time,busy:!!staffSweep||!!staffSlam||!!bowDraw||!!swordStrike||!!spearTechnique||!!axeTechnique||mode!=='locomotion'||mixer.time<returningUntil,preview:mode==='preview',paused:pausedPreview||current.paused,defeatClip,reviewedDefeats:[...reviewedDefeats],mode,activeActions:[...actions.values()].filter(action=>action.isScheduled()).length};},
   update(dt){
    if(disposed||!Number.isFinite(dt)||dt<0)return;
    restoreSweep();if(staffSweep){staffSweep.time+=dt;if(staffSweep.time+1e-7>=global.StaffSweep.duration)staffSweep=null;}
    let axeFinished=null;
    if(axeTechnique){axeTechnique.time+=dt;const duration=global.AxeTechniques.spec(axeTechnique.skillId).poseDuration;if(axeTechnique.time+1e-7>=duration){axeFinished={skillId:axeTechnique.skillId,duration};axeTechnique=null;}}
    let spearFinished=null;
    if(spearTechnique){spearTechnique.time+=dt;const duration=global.SpearTechniques.spec(spearTechnique.skillId).poseDuration;if(spearTechnique.time+1e-7>=duration){spearFinished={skillId:spearTechnique.skillId,duration};spearTechnique=null;}}
    let swordFinished=null;
    if(swordStrike){swordStrike.time+=dt;if(swordStrike.time+1e-7>=swordPoseSpec(swordStrike.skillId).poseDuration){swordFinished={skillId:swordStrike.skillId,duration:swordPoseSpec(swordStrike.skillId).poseDuration};swordStrike=null;}}
    let bowFinished=null;
    if(bowDraw){bowDraw.time+=dt;if(bowDraw.time+1e-7>=bowPoseSpec(bowDraw.skillId).poseDuration){bowFinished={skillId:bowDraw.skillId,duration:bowPoseSpec(bowDraw.skillId).poseDuration};bowDraw=null;}}
    let slamFinished=false;
    if(staffSlam){staffSlam.time+=dt;if(staffSlam.time+1e-7>=global.StaffSlam.duration){staffSlam=null;slamFinished=true;}}
    // Hold idle under a planted sword, spear or axe pose after the walk→idle blend. Its
    // 15 s loop shuffles both feet (up to ~30 cm); the foot IK base followed it and skated
    // the planted feet, then slid them again when the pose handed back to the clip.
    const plantedPose=swordStrike||spearTechnique||axeTechnique;
    if(plantedPose&&!outgoing&&current===actions.get('idle')){plantedPose.idleTime??=current.time;current.time=plantedPose.idleTime;}
    if(!pausedPreview)mixer.update(Math.min(dt,.1));
    if(mode==='once'&&current.time>=segmentEnd)pendingFinished=current;
    if(outgoing&&mixer.time>=fadeEnd){outgoing.stop();outgoing=null;current.stopFading().setEffectiveWeight(1);}
    if(pendingFinished){
     const name=current.getClip().name;pendingFinished=null;
     if(mode==='preview'&&['defeat_02','defeat_03'].includes(name))reviewedDefeats.add(name);
     if(mode==='once'){transition(locomotion(),'locomotion');returningUntil=mixer.time+fadeDuration;}
    }
    pose();
    // Publish the final sample for this frame; cancellation leaves the marker absent.
    if(axeFinished){sockets.right.userData.axeTechniqueTime=axeFinished.duration;sockets.right.userData.axeTechniqueSkillId=axeFinished.skillId;}
    if(spearFinished){sockets.right.userData.spearTechniqueTime=spearFinished.duration;sockets.right.userData.spearTechniqueSkillId=spearFinished.skillId;}
    if(swordFinished){sockets.right.userData.swordStrikeTime=swordFinished.duration;sockets.right.userData.swordStrikeSkillId=swordFinished.skillId;}
    if(slamFinished)sockets.right.userData.staffSlamTime=global.StaffSlam.duration;
    if(bowFinished){sockets.right.userData.bowDrawTime=bowFinished.duration;sockets.right.userData.bowDrawSkillId=bowFinished.skillId;}
   },
   dispose(){if(disposed)return;disposed=true;mixer.removeEventListener('finished',finished);mixer.stopAllAction();mixer.uncacheRoot(model);
    // Equipment belongs to the weapon controller; don't dispose it with this GLB.
    for(const socket of Object.values(sockets))socket.clear();global.disposeVillageNPCGLTF?.(gltf);root.removeFromParent();}
  };
 };
})(window);
