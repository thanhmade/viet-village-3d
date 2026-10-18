'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'../..'),T=require(path.join(root,'ASSETS/vendor/three.min.js'));
const filename=path.join(root,'CHARACTERS/PLAYER/FEMALE/PLAYER_BASE_FEMALE_GLB.glb'),buffer=fs.readFileSync(filename);
const maleFilename=path.join(root,'CHARACTERS/PLAYER/MALE/PLAYER_BASE_MALE_GLB.glb'),maleBuffer=fs.readFileSync(maleFilename),maleJSON=JSON.parse(maleBuffer.subarray(20,20+maleBuffer.readUInt32LE(12)));
const json=JSON.parse(buffer.subarray(20,20+buffer.readUInt32LE(12))),exactClips=['run','climb','look_around','angry_01','front_kick_01','dig','defeat_03','run_upstairs','greet_01','slash','shovel','jump_rope_01','cry','box_01','defeat_02','agree','laugh_01','sit','jump','swim','afraid','cheer','jump_down','cast_a_spell','bow','hit_to_body_01','idle','clap','walk','fall','chop','lift_heavy','jump_rope_02'];
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
function runtime(){const context={THREE:T,SwordStrike:require('../js/vfx/sword-strike.js'),BowRain:require('../js/vfx/bow-rain.js'),BowVolley:require('../js/vfx/bow-volley.js'),BowPiercing:require('../js/vfx/bow-piercing.js'),StaffSweep:require('../js/vfx/staff-sweep.js'),StaffSlam:require('../js/vfx/staff-slam.js'),console,document:{}};context.window=context;vm.createContext(context);
 for(const name of ['npc-gltf.js','player-gltf.js'])vm.runInContext(fs.readFileSync(path.join(root,'CHARACTERS',name),'utf8'),context);
 return context;
}
async function visual(kind='female'){const gltf=await asset(kind),context=runtime(),v=context.createVillagePlayerGLTFVisual({THREE:T,gltf,height:2.35,modelId:kind+'-base',forwardYaw:0}),actor=new T.Group();
 actor.position.set(4,.3,-5);actor.rotation.y=.6;actor.add(v.root);v.update(0);return {v,gltf,actor};
}
function advance(v,seconds,callback){let elapsed=0;while(elapsed<seconds){const dt=Math.min(.05,seconds-elapsed);v.update(dt);elapsed+=dt;callback?.();}}
function close(actual,expected,tolerance=1e-5){assert(Math.abs(actual-expected)<=tolerance,`${actual} differs from ${expected} by ${Math.abs(actual-expected)}`);}



const Sword=require('../js/vfx/sword-strike.js');
for(const gender of ['male','female'])test('Nhất Kiếm '+gender+' real GLB: blade/palm anchors, three cuts and recovery at 30/60/120 Hz',async()=>{
 for(const fps of [30,60,120]){
  const {v,gltf,actor}=await visual(gender),ctx={window:{}};vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(root,'SOURCE-CODE/js/weapons-village-models.js'),'utf8'),ctx);
  const models=ctx.window.createVillageWeaponModels(T),sword=models.models.get('sword'),mount=models.root;for(const m of models.models.values())if(m!==sword)m.group.removeFromParent();
  v.sockets.right.add(mount);mount.scale.setScalar(.7);mount.rotation.y=Math.PI;mount.position.copy(sword.gripPoint).multiplyScalar(-.7).applyQuaternion(mount.quaternion);
  const lengths=new Map();gltf.scene.traverse(o=>{if(o.isBone&&o.parent?.isBone)lengths.set(o,o.position.length());});const origin=actor.position.clone(),orientation=actor.quaternion.clone();
  assert(v.startSwordStrike());assert(!v.startBowDraw());assert(!v.startStaffSlam());assert(!v.startJump(.7));let maxGap=0;
  for(let frame=1;frame<=Math.ceil(Sword.poseDuration*fps)+1;frame++){
   const t=frame/fps;v.update(1/fps);actor.updateMatrixWorld(true);assert(actor.position.equals(origin));assert(actor.quaternion.equals(orientation));for(const [bone,length] of lengths)close(bone.position.length(),length,1e-6);
   if(t>=.25&&t<=1.12){const forward=new T.Vector3(0,0,1).applyQuaternion(actor.quaternion),expected=Sword.authoredBlade(T,origin,forward,t),tip=sword.tip.getWorldPosition(new T.Vector3()),base=sword.group.localToWorld(new T.Vector3(0,.16,0));
    maxGap=Math.max(maxGap,tip.distanceTo(expected.tip),base.distanceTo(expected.base));const held=sword.group.localToWorld(sword.gripPoint.clone());assert(held.distanceTo(v.sockets.right.getWorldPosition(new T.Vector3()))<1e-6);}
  }
  assert(maxGap<.005,gender+' blade gap '+maxGap);assert.equal(v.state.busy,false);
  assert(v.startSwordStrike());advance(v,Sword.releaseAt);actor.updateMatrixWorld(true);const forward=new T.Vector3(0,0,1).applyQuaternion(actor.quaternion),expected=Sword.authoredBlade(T,origin,forward,Sword.releaseAt);assert(sword.tip.getWorldPosition(new T.Vector3()).distanceTo(expected.tip)<.005);
  v.cancelSwordStrike();assert.equal(v.sockets.right.userData.swordStrikeTime,undefined);assert.equal(v.state.busy,false);
  for(const id of ['bow.xuyen-tien','bow.lien-tien','bow.mua-ten']){assert(v.startBowDraw(id));v.cancelBowDraw();}mount.removeFromParent();models.dispose();v.dispose();
 }
});

for(const gender of ['male','female'])test('Nhất Kiếm '+gender+': planted support and no sole penetration through blended entry/recovery',async()=>{
 const {v,gltf,actor}=await visual(gender),probes=[],feet=[];
 gltf.scene.traverse(mesh=>{
  if(mesh.isBone&&/(LeftFoot|RightFoot)$/.test(mesh.name))feet.push(mesh);
  if(!mesh.isSkinnedMesh)return;
  const indices=mesh.geometry.attributes.skinIndex,weights=mesh.geometry.attributes.skinWeight;
  for(let index=0;index<indices.count;index++){
   let w=0;for(const c of ['X','Y','Z','W'])if(/(Foot|Toe)/.test(mesh.skeleton.bones[indices['get'+c](index)].name))w+=weights['get'+c](index);
   if(w>.5)probes.push({mesh,index});
  }
 });
 assert.equal(feet.length,2);assert(probes.length>20);assert(v.startSwordStrike());let planted;
 for(let frame=1;frame<=90;frame++){
  v.update(1/60);actor.updateMatrixWorld(true);const t=frame/60;
  const floor=Math.min(...probes.map(({mesh,index})=>mesh.getVertexPosition(index,new T.Vector3()).applyMatrix4(mesh.matrixWorld).y))-actor.position.y;
  assert(floor>-.003,gender+' sole below ground at '+t+': '+floor);
  if(t>=.25&&t<=1.12){const positions=feet.map(f=>actor.worldToLocal(f.getWorldPosition(new T.Vector3())));
   planted??=positions.map(p=>p.clone());for(let i=0;i<2;i++)assert(positions[i].distanceTo(planted[i])<.008,'support foot slides');
   assert(Math.abs(positions[0].x-positions[1].x)>.43,'stance too narrow');assert(Math.abs(positions[0].z-positions[1].z)>.49,'stance lacks depth');
  }
 }v.dispose();
});
