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
function runtime(){const context={THREE:T,BowVolley:require('../js/vfx/bow-volley.js'),BowPiercing:require('../js/vfx/bow-piercing.js'),StaffSweep:require('../js/vfx/staff-sweep.js'),StaffSlam:require('../js/vfx/staff-slam.js'),console,document:{}};context.window=context;vm.createContext(context);
 for(const name of ['npc-gltf.js','player-gltf.js'])vm.runInContext(fs.readFileSync(path.join(root,'CHARACTERS',name),'utf8'),context);
 return context;
}
async function visual(kind='female'){const gltf=await asset(kind),context=runtime(),v=context.createVillagePlayerGLTFVisual({THREE:T,gltf,height:2.35,modelId:kind+'-base',forwardYaw:0}),actor=new T.Group();
 actor.position.set(4,.3,-5);actor.rotation.y=.6;actor.add(v.root);v.update(0);return {v,gltf,actor};
}
function advance(v,seconds,callback){let elapsed=0;while(elapsed<seconds){const dt=Math.min(.05,seconds-elapsed);v.update(dt);elapsed+=dt;callback?.();}}
function close(actual,expected,tolerance=1e-5){assert(Math.abs(actual-expected)<=tolerance,`${actual} differs from ${expected} by ${Math.abs(actual-expected)}`);}



const Bow=require('../js/vfx/bow-volley.js');
for(const gender of ['male','female'])test('Liên Tiễn '+gender+' real GLB: three aligned releases, nock contact and recovery at 30/60/120 Hz',async()=>{
 for(const fps of [30,60,120]){
  const {v,gltf,actor}=await visual(gender),ctx={window:{}};vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(root,'SOURCE-CODE/js/weapons-village-models.js'),'utf8'),ctx);
  const models=ctx.window.createVillageWeaponModels(T),bow=models.models.get('bow'),mount=models.root;for(const m of models.models.values())if(m!==bow)m.group.removeFromParent();
  v.sockets.right.add(mount);mount.scale.setScalar(.7);mount.rotation.y=Math.PI;mount.position.copy(bow.gripPoint).multiplyScalar(-.7).applyQuaternion(mount.quaternion);
  const lengths=new Map();gltf.scene.traverse(o=>{if(o.isBone&&o.parent?.isBone)lengths.set(o,o.position.length());});const origin=actor.position.clone(),orientation=actor.quaternion.clone();
  assert(v.startBowDraw('bow.lien-tien'));assert(!v.startBowDraw());assert(!v.startStaffSlam());assert(!v.startJump(.7));let maxGap=0;
  for(let frame=1;frame<=Math.ceil(Bow.poseDuration*fps);frame++){
   const t=frame/fps,pose=Bow.sample(t);v.update(1/fps);bow.setDraw(pose.draw,pose.arrowVisible);actor.updateMatrixWorld(true);
   assert(actor.position.equals(origin));assert(actor.quaternion.equals(orientation));for(const [bone,length] of lengths)close(bone.position.length(),length,1e-6);
   if(t>=.08&&t<=.62){const gap=v.sockets.left.getWorldPosition(new T.Vector3()).distanceTo(bow.nock.getWorldPosition(new T.Vector3()));maxGap=Math.max(gap,maxGap);}
  }
  assert(maxGap<.005,gender+' nock gap '+maxGap);assert.equal(v.state.busy,false);
  for(const shot of Bow.shots){assert(v.startBowDraw('bow.lien-tien'));advance(v,shot.release);bow.setDraw(Bow.sample(shot.release).draw,false);actor.updateMatrixWorld(true);
   const actual=bow.tip.getWorldPosition(new T.Vector3()),forward=new T.Vector3(0,0,1).applyQuaternion(actor.quaternion),expected=Bow.releaseAnchor(T,actor.position,forward,shot.index);
   assert(actual.distanceTo(expected)<.005,gender+' release '+shot.index+' mismatch '+actual.distanceTo(expected));v.cancelBowDraw();assert.equal(v.sockets.right.userData.bowDrawTime,undefined);assert.equal(v.sockets.right.userData.bowDrawSkillId,undefined);
  }
  assert(v.startBowDraw());v.cancelBowDraw();mount.removeFromParent();models.dispose();v.dispose();
 }
});
