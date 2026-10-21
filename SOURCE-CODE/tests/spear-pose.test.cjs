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
function runtime(){const context={THREE:T,SpearTechniques:require('../js/vfx/spear-techniques.js'),SwordQi:require('../js/vfx/sword-qi.js'),SwordStrike:require('../js/vfx/sword-strike.js'),BowRain:require('../js/vfx/bow-rain.js'),BowVolley:require('../js/vfx/bow-volley.js'),BowPiercing:require('../js/vfx/bow-piercing.js'),StaffSweep:require('../js/vfx/staff-sweep.js'),StaffSlam:require('../js/vfx/staff-slam.js'),console,document:{}};context.window=context;vm.createContext(context);
 for(const name of ['npc-gltf.js','player-gltf.js'])vm.runInContext(fs.readFileSync(path.join(root,'CHARACTERS',name),'utf8'),context);
 return context;
}
async function visual(kind='female'){const gltf=await asset(kind),context=runtime(),v=context.createVillagePlayerGLTFVisual({THREE:T,gltf,height:2.35,modelId:kind+'-base',forwardYaw:0}),actor=new T.Group();
 actor.position.set(4,.3,-5);actor.rotation.y=.6;actor.add(v.root);v.update(0);return {v,gltf,actor};
}
function advance(v,seconds,callback){let elapsed=0;while(elapsed<seconds){const dt=Math.min(.05,seconds-elapsed);v.update(dt);elapsed+=dt;callback?.();}}
function close(actual,expected,tolerance=1e-5){assert(Math.abs(actual-expected)<=tolerance,`${actual} differs from ${expected} by ${Math.abs(actual-expected)}`);}



const Spear=require('../js/vfx/spear-techniques.js');
const ids=['spear.xuyen-kich','spear.thuong-phong','spear.pha-tran'];
function equipment(v){const ctx={window:{}};vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(root,'SOURCE-CODE/js/weapons-village-models.js'),'utf8'),ctx);
 const models=ctx.window.createVillageWeaponModels(T),spear=models.models.get('spear'),mount=models.root;
 for(const m of models.models.values())if(m!==spear)m.group.removeFromParent();v.sockets.right.add(mount);mount.scale.setScalar(.7);mount.rotation.y=Math.PI;mount.position.copy(spear.gripPoint).multiplyScalar(-.7).applyQuaternion(mount.quaternion);return {models,spear,mount};}
for(const gender of ['male','female'])test('Thương '+gender+': real two-palm grip, fixed bone lengths and root at 30/60/120 Hz',async()=>{
 for(const fps of [30,60,120]){
  const {v,gltf,actor}=await visual(gender),{models,spear,mount}=equipment(v),lengths=new Map();
  gltf.scene.traverse(o=>{if(o.isBone&&o.parent?.isBone)lengths.set(o,o.position.length());});const origin=actor.position.clone(),orientation=actor.quaternion.clone();
  for(const id of ids){
   v.returnToIdle();v.update(0);assert(v.startSpearTechnique(id));assert(!v.startSwordStrike());assert(!v.startBowDraw());assert(!v.startStaffSlam());assert(!v.startStaffSweep());assert(!v.startJump(.7));assert(!v.playOnce('slash'));
   const spec=Spear.spec(id);let maxFront=0,maxTip=0,samples=0;
   for(let frame=1;frame<=Math.ceil(spec.poseDuration*fps)+1;frame++){
    const t=frame/fps;v.update(1/fps);actor.updateMatrixWorld(true);assert(actor.position.equals(origin));assert(actor.quaternion.equals(orientation));
    for(const [bone,length] of lengths)close(bone.position.length(),length,1e-6);
    if(Spear.sample(id,t).weight>.999){
     const state=Spear.sample(id,t),held=spear.group.localToWorld(spear.gripPoint.clone()),actualFront=spear.group.localToWorld(spear.gripPoint.clone().add(new T.Vector3(0,state.frontGripDistance/.7,0))),front=v.sockets.left.getWorldPosition(new T.Vector3());
     assert(held.distanceTo(v.sockets.right.getWorldPosition(new T.Vector3()))<1e-6);maxFront=Math.max(maxFront,actualFront.distanceTo(front));
     const expected=Spear.authoredTip(T,{skillId:id,time:t,position:origin,forward:new T.Vector3(0,0,1).applyQuaternion(actor.quaternion)});maxTip=Math.max(maxTip,spear.tip.getWorldPosition(new T.Vector3()).distanceTo(expected.tip));
     assert(held.distanceTo(actualFront)>.50,'hands overlap');samples++;
    }
   }
   assert(samples>15);assert(maxFront<.005,gender+' '+id+' front hand gap '+maxFront);assert(maxTip<.005,gender+' '+id+' tip anchor gap '+maxTip);assert.equal(v.state.busy,false);
  }mount.removeFromParent();models.dispose();v.dispose();
 }
});
for(const gender of ['male','female'])test('Thương '+gender+': grounded feet, continuous two-turn visual facing, cancellation and final-time metadata',async()=>{
 const {v,gltf,actor}=await visual(gender),probes=[],feet=[];gltf.scene.traverse(mesh=>{
  if(mesh.isBone&&/(LeftFoot|RightFoot)$/.test(mesh.name))feet.push(mesh);
  if(!mesh.isSkinnedMesh)return;const indices=mesh.geometry.attributes.skinIndex,weights=mesh.geometry.attributes.skinWeight;
  for(let index=0;index<indices.count;index++){let w=0;for(const c of ['X','Y','Z','W'])if(/(Foot|Toe)/.test(mesh.skeleton.bones[indices['get'+c](index)].name))w+=weights['get'+c](index);if(w>.5)probes.push({mesh,index});}
 });assert.equal(feet.length,2);assert(probes.length>20);
 for(const id of ids){v.returnToIdle();assert(v.startSpearTechnique(id));const facing=v.root.getObjectByName('player-facing-pose');let previous=0,maxYaw=0;
  for(let frame=1;frame<=Math.ceil(Spear.spec(id).poseDuration*60);frame++){
   v.update(1/60);actor.updateMatrixWorld(true);const t=frame/60;
   const floor=Math.min(...probes.map(({mesh,index})=>mesh.getVertexPosition(index,new T.Vector3()).applyMatrix4(mesh.matrixWorld).y))-actor.position.y;
   assert(floor>-.003,gender+' '+id+' foot penetration at '+t+': '+floor);
   if(id==='spear.pha-tran'&&t>=1.15&&t<=2.75){assert(facing.rotation.y>=previous-1e-5,'spin reversed');assert(facing.rotation.y-previous<.8,'spin discontinuity');previous=facing.rotation.y;maxYaw=Math.max(maxYaw,facing.rotation.y);}
  }
  if(id==='spear.pha-tran')assert(maxYaw>Math.PI*3.99,'not two full turns');
  assert.equal(v.state.busy,false);assert(v.startSpearTechnique(id));v.update(.9);v.cancelSpearTechnique();assert.equal(v.state.busy,false);assert.equal(v.sockets.right.userData.spearTechniqueTime,undefined);assert.equal(facing.rotation.y,0);
  assert(v.startSpearTechnique(id));v.update(8);assert.equal(v.sockets.right.userData.spearTechniqueTime,Spear.spec(id).poseDuration);assert.equal(v.sockets.right.userData.spearTechniqueSkillId,id);v.update(0);assert.equal(v.sockets.right.userData.spearTechniqueTime,undefined);
 }v.dispose();
});
