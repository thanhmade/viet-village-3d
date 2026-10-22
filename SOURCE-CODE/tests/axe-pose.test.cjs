'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'../..'),T=require(path.join(root,'ASSETS/vendor/three.min.js'));
const filename=path.join(root,'CHARACTERS/PLAYER/FEMALE/PLAYER_BASE_FEMALE_GLB.glb'),buffer=fs.readFileSync(filename);
const maleFilename=path.join(root,'CHARACTERS/PLAYER/MALE/PLAYER_BASE_MALE_GLB.glb'),maleBuffer=fs.readFileSync(maleFilename);
// Parse the real file, real skeleton and real animation channels. Node only
// substitutes bitmap decoding; browser checks must still verify the actual pixels.
global.THREE=T;global.self=global;
global.createImageBitmap=async blob=>{
 const bytes=new Uint8Array(await blob.arrayBuffer());
 if(blob.type==='image/jpeg')assert.deepEqual([...bytes.slice(0,2)],[255,216]);
 else {assert.equal(blob.type,'image/png');assert.deepEqual([...bytes.slice(0,8)],[137,80,78,71,13,10,26,10]);}
 return {width:2048,height:2048,close(){}};
};
global.ProgressEvent=class{constructor(type,detail){this.type=type;Object.assign(this,detail);}};
const loader=import(pathToFileURL(path.join(root,'ASSETS/vendor/gltf-r160/GLTFLoader.js')).href);
async function asset(kind='female'){const {GLTFLoader}=await loader,bytes=kind==='male'?maleBuffer:buffer;return new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');}
function runtime(){const context={THREE:T,SpearTechniques:require('../js/vfx/spear-techniques.js'),AxeTechniques:require('../js/vfx/axe-techniques.js'),SwordQi:require('../js/vfx/sword-qi.js'),SwordStrike:require('../js/vfx/sword-strike.js'),BowRain:require('../js/vfx/bow-rain.js'),BowVolley:require('../js/vfx/bow-volley.js'),BowPiercing:require('../js/vfx/bow-piercing.js'),StaffSweep:require('../js/vfx/staff-sweep.js'),StaffSlam:require('../js/vfx/staff-slam.js'),console,document:{}};context.window=context;vm.createContext(context);
 for(const name of ['npc-gltf.js','player-gltf.js'])vm.runInContext(fs.readFileSync(path.join(root,'CHARACTERS',name),'utf8'),context);
 return context;
}
async function visual(kind='female'){const gltf=await asset(kind),context=runtime(),v=context.createVillagePlayerGLTFVisual({THREE:T,gltf,height:2.35,modelId:kind+'-base',forwardYaw:0}),actor=new T.Group();
 actor.position.set(4,.3,-5);actor.rotation.y=.6;actor.add(v.root);v.update(0);return {v,gltf,actor};
}
function advance(v,seconds,callback){let elapsed=0;while(elapsed<seconds){const dt=Math.min(.05,seconds-elapsed);v.update(dt);elapsed+=dt;callback?.();}}
function close(actual,expected,tolerance=1e-5){assert(Math.abs(actual-expected)<=tolerance,`${actual} differs from ${expected} by ${Math.abs(actual-expected)}`);}



const Axe=require('../js/vfx/axe-techniques.js');
const ids=['axe.khai-son','axe.pha-giap','axe.cuong-phong'];
function equipment(v){const ctx={window:{}};vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(root,'SOURCE-CODE/js/weapons-village-models.js'),'utf8'),ctx);
 const models=ctx.window.createVillageWeaponModels(T),axe=models.models.get('axe'),mount=models.root;
 for(const m of models.models.values())if(m!==axe)m.group.removeFromParent();v.sockets.right.add(mount);mount.scale.setScalar(.7);mount.rotation.y=Math.PI;mount.position.copy(axe.gripPoint).multiplyScalar(-.7).applyQuaternion(mount.quaternion);return {models,axe,mount};}
for(const gender of ['male','female'])test('Rìu '+gender+': real two-palm grip, fixed bone lengths and root at 30/60/120 Hz',async()=>{
 for(const fps of [30,60,120]){
  const {v,gltf,actor}=await visual(gender),{models,axe,mount}=equipment(v),lengths=new Map();
  gltf.scene.traverse(o=>{if(o.isBone&&o.parent?.isBone)lengths.set(o,o.position.length());});const origin=actor.position.clone(),orientation=actor.quaternion.clone();
  for(const id of ids){
   v.returnToIdle();v.update(0);assert(v.startAxeTechnique(id));assert(!v.startSpearTechnique());assert(!v.startSwordStrike());assert(!v.startBowDraw());assert(!v.startStaffSlam());assert(!v.startStaffSweep());assert(!v.startJump(.7));assert(!v.playOnce('slash'));
   const spec=Axe.spec(id);let maxFront=0,maxTip=0,samples=0;
   for(let frame=1;frame<=Math.ceil(spec.poseDuration*fps)+1;frame++){
    const t=frame/fps;v.update(1/fps);actor.updateMatrixWorld(true);assert(actor.position.equals(origin));assert(actor.quaternion.equals(orientation));
    for(const [bone,length] of lengths)close(bone.position.length(),length,1e-6);
    if(Axe.sample(id,t).weight>.999){
     const state=Axe.sample(id,t),held=axe.group.localToWorld(axe.gripPoint.clone()),actualFront=axe.group.localToWorld(axe.gripPoint.clone().add(new T.Vector3(0,state.frontGripDistance/.7,0))),front=v.sockets.left.getWorldPosition(new T.Vector3());
     assert(held.distanceTo(v.sockets.right.getWorldPosition(new T.Vector3()))<1e-6);maxFront=Math.max(maxFront,actualFront.distanceTo(front));
     const expected=Axe.authoredTip(T,{skillId:id,time:t,position:origin,forward:new T.Vector3(0,0,1).applyQuaternion(actor.quaternion)});maxTip=Math.max(maxTip,axe.tip.getWorldPosition(new T.Vector3()).distanceTo(expected.tip));
     assert(held.distanceTo(actualFront)>.40,'hands overlap');samples++;
    }
   }
   assert(samples>15);assert(maxFront<.005,gender+' '+id+' front hand gap '+maxFront);assert(maxTip<.005,gender+' '+id+' tip anchor gap '+maxTip);assert.equal(v.state.busy,false);
  }mount.removeFromParent();models.dispose();v.dispose();
 }
});
for(const gender of ['male','female'])test('Rìu '+gender+': grounded feet, continuous four-turn visual facing, cancellation and final-time metadata',async()=>{
 const {v,gltf,actor}=await visual(gender),probes=[],feet=[];gltf.scene.traverse(mesh=>{
  if(mesh.isBone&&/(LeftFoot|RightFoot)$/.test(mesh.name))feet.push(mesh);
  if(!mesh.isSkinnedMesh)return;const indices=mesh.geometry.attributes.skinIndex,weights=mesh.geometry.attributes.skinWeight;
  for(let index=0;index<indices.count;index++){let w=0;for(const c of ['X','Y','Z','W'])if(/(Foot|Toe)/.test(mesh.skeleton.bones[indices['get'+c](index)].name))w+=weights['get'+c](index);if(w>.5)probes.push({mesh,index});}
 });assert.equal(feet.length,2);assert(probes.length>20);
 for(const id of ids){v.returnToIdle();assert(v.startAxeTechnique(id));const facing=v.root.getObjectByName('player-facing-pose');let previous=0,maxYaw=0;
  for(let frame=1;frame<=Math.ceil(Axe.spec(id).poseDuration*60);frame++){
   v.update(1/60);actor.updateMatrixWorld(true);const t=frame/60;
   const floor=Math.min(...probes.map(({mesh,index})=>mesh.getVertexPosition(index,new T.Vector3()).applyMatrix4(mesh.matrixWorld).y))-actor.position.y;
   assert(floor>-.003,gender+' '+id+' foot penetration at '+t+': '+floor);
   if(id==='axe.cuong-phong'&&t>=.65&&t<=3.95){assert(facing.rotation.y>=previous-1e-5,'spin reversed');assert(facing.rotation.y-previous<.8,'spin discontinuity');previous=facing.rotation.y;maxYaw=Math.max(maxYaw,facing.rotation.y);}
  }
  if(id==='axe.cuong-phong')assert(maxYaw>Math.PI*7.99,'not four full turns');
  assert.equal(v.state.busy,false);assert(v.startAxeTechnique(id));v.update(.9);v.cancelAxeTechnique();assert.equal(v.state.busy,false);assert.equal(v.sockets.right.userData.axeTechniqueTime,undefined);assert.equal(facing.rotation.y,0);
  assert(v.startAxeTechnique(id));v.update(8);assert.equal(v.sockets.right.userData.axeTechniqueTime,Axe.spec(id).poseDuration);assert.equal(v.sockets.right.userData.axeTechniqueSkillId,id);v.update(0);assert.equal(v.sockets.right.userData.axeTechniqueTime,undefined);
 }v.dispose();
});

for(const gender of ['male','female'])test('Rìu '+gender+': overhead ground chop, distinct diagonal cut and edge-first cyclone',async()=>{
 const {v,actor}=await visual(gender),{models,axe,mount}=equipment(v);
 const tipAt=(id,time)=>{v.returnToIdle();v.update(0);assert(v.startAxeTechnique(id));advance(v,time);actor.updateMatrixWorld(true);return axe.tip.getWorldPosition(new T.Vector3()).sub(actor.position).applyQuaternion(actor.quaternion.clone().invert());};
 const raised=tipAt('axe.khai-son',.85),groundStrike=tipAt('axe.khai-son',Axe.spec('axe.khai-son').impactAt);
 assert(raised.y>2.35,'overhead preparation must raise the actual axe above the head');
 assert(groundStrike.y>-.08&&groundStrike.y<.20,'actual blade must reach the ground for Khai Sơn: '+groundStrike.y);
 assert(groundStrike.z>.7,'ground strike must be in front of the planted actor');
 const armorStrike=tipAt('axe.pha-giap',Axe.spec('axe.pha-giap').impactAt);
 assert(armorStrike.y>-.08&&armorStrike.y<.25,'the diagonal Phá Giáp finish must meet the ground shown in the reference: '+armorStrike.y);
 assert(Math.abs(armorStrike.x-groundStrike.x)>.15,'diagonal armor cut needs a different path from the centerline ground chop');
 tipAt('axe.cuong-phong',1.8);
 // The blade lies in source XY. Its normal should point close to world up
 // during a horizontal axe sweep, so the edge (not the broad flat face) leads.
 const bladeNormal=new T.Vector3(0,0,1).applyQuaternion(axe.group.getWorldQuaternion(new T.Quaternion()));
 assert(Math.abs(bladeNormal.y)>.9,'cyclone blade plane is not aligned with the horizontal cut');
 mount.removeFromParent();models.dispose();v.dispose();
});

// Endpoints alone miss a long rear handle passing through the abdomen. Use
// the posed GLB triangles influenced mostly by pelvis/spine, including torso
// boundary triangles, and the entire physical shaft from pommel to top collar.
function torsoTriangles(gltf,coreOnly=false){
 const result=[];gltf.scene.traverse(mesh=>{if(!mesh.isSkinnedMesh)return;
  const ix=mesh.geometry.index,si=mesh.geometry.attributes.skinIndex,sw=mesh.geometry.attributes.skinWeight,weights=[];
  for(let i=0;i<si.count;i++){let w=0;for(const c of ['X','Y','Z','W'])if(/(Hips|Spine|Spine1|Spine2|Neck)$/.test(mesh.skeleton.bones[si['get'+c](i)].name))w+=sw['get'+c](i);weights.push(w);}
  const indices=[];for(let n=0;n<(ix?ix.count:si.count);n+=3){const face=[0,1,2].map(k=>ix?ix.getX(n+k):n+k);if(coreOnly?face.every(i=>weights[i]>.70):face.reduce((sum,i)=>sum+weights[i],0)/3>.55)indices.push(face);}
  if(indices.length)result.push({mesh,indices});
 });return result;
}
function segmentDistanceSq(p1,q1,p2,q2){
 const d1=q1.clone().sub(p1),d2=q2.clone().sub(p2),r=p1.clone().sub(p2),a=d1.lengthSq(),e=d2.lengthSq(),b=d1.dot(d2),c=d1.dot(r),f=d2.dot(r),den=a*e-b*b;
 let s=den?T.MathUtils.clamp((b*f-c*e)/den,0,1):0,t=(b*s+f)/e;
 if(t<0){t=0;s=T.MathUtils.clamp(-c/a,0,1);}else if(t>1){t=1;s=T.MathUtils.clamp((b-c)/a,0,1);}
 return p1.clone().addScaledVector(d1,s).distanceToSquared(p2.clone().addScaledVector(d2,t));
}
function shaftDistanceToTorso(parts,start,end){
 const length=start.distanceTo(end),ray=new T.Ray(start,end.clone().sub(start).normalize()),triangle=new T.Triangle(),tmp=new T.Vector3();let best=Infinity;
 for(const {mesh,indices} of parts){const posed=new Map();const vertex=i=>{if(!posed.has(i))posed.set(i,mesh.getVertexPosition(i,new T.Vector3()).applyMatrix4(mesh.matrixWorld));return posed.get(i);};
  for(const face of indices){const a=vertex(face[0]),b=vertex(face[1]),c=vertex(face[2]);
   const hit=ray.intersectTriangle(a,b,c,false,tmp);if(hit&&hit.distanceTo(start)<=length)return 0;
   triangle.set(a,b,c);best=Math.min(best,triangle.closestPointToPoint(start,tmp).distanceToSquared(start),triangle.closestPointToPoint(end,tmp).distanceToSquared(end),segmentDistanceSq(start,end,a,b),segmentDistanceSq(start,end,b,c),segmentDistanceSq(start,end,c,a));
  }
 }return Math.sqrt(best);
}

for(const gender of ['male','female'])test('Rìu '+gender+': full handle and rear forearm stay outside the skinned torso',async()=>{
 const {v,gltf,actor}=await visual(gender),{models,axe,mount}=equipment(v),parts=torsoTriangles(gltf),coreParts=torsoTriangles(gltf,true);
 assert(parts.reduce((n,p)=>n+p.indices.length,0)>1500,'must check actual torso triangles');
 const forearm=gltf.scene.getObjectByName('mixamorigRightForeArm'),hand=gltf.scene.getObjectByName('mixamorigRightHand');assert(forearm&&hand);
 const cases={
  'axe.khai-son':[.4,.65,.85,.95,1.05,1.10,1.1667,1.20,1.35,2.55,2.7333,2.8333,2.9,3.1,3.2],
  'axe.pha-giap':[.4,.65,.8,.8333,.8667,.9,.9333,.98,1.08,1.7,2.0,2.2,2.2333,2.4,2.6],
  'axe.cuong-phong':[.4,.65,1,1.4,2,2.7,3.5,3.95,4.1,4.4,4.6]
 };
 for(const [id,times] of Object.entries(cases))for(const time of times){
  v.returnToIdle();v.mixer.setTime(0);v.update(0);assert(v.startAxeTechnique(id));advance(v,time);actor.updateMatrixWorld(true);
  const butt=axe.group.localToWorld(new T.Vector3(0,-1.09,0)),top=axe.group.localToWorld(new T.Vector3(0,.98,0));
  const gap=shaftDistanceToTorso(parts,butt,top);
  // The wrapped grip is the widest long section: .058m source radius at .7x.
  assert(gap>.058*.7,gender+' '+id+' handle enters torso at '+time+': '+gap);
  const elbow=forearm.getWorldPosition(new T.Vector3()),wrist=hand.getWorldPosition(new T.Vector3());
  // Sleeve/shoulder blend triangles belong partly to the arm itself. For the
  // forearm envelope require every vertex to be mostly pelvis/spine, then
  // require 4cm radius clearance from that actual torso surface.
  const forearmGap=shaftDistanceToTorso(coreParts,elbow,wrist);
  assert(forearmGap>.04,gender+' '+id+' rear forearm crosses torso at '+time+': '+forearmGap);
 }
 mount.removeFromParent();models.dispose();v.dispose();
});
