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
function runtime(){const context={THREE:T,StaffSweep:require('../js/vfx/staff-sweep.js'),StaffSlam:require('../js/vfx/staff-slam.js'),console,document:{}};context.window=context;vm.createContext(context);
 for(const name of ['npc-gltf.js','player-gltf.js'])vm.runInContext(fs.readFileSync(path.join(root,'CHARACTERS',name),'utf8'),context);
 return context;
}
async function visual(kind='female'){const gltf=await asset(kind),context=runtime(),v=context.createVillagePlayerGLTFVisual({THREE:T,gltf,height:2.35,modelId:kind+'-base',forwardYaw:0}),actor=new T.Group();
 actor.position.set(4,.3,-5);actor.rotation.y=.6;actor.add(v.root);v.update(0);return {v,gltf,actor};
}
function advance(v,seconds,callback){let elapsed=0;while(elapsed<seconds){const dt=Math.min(.05,seconds-elapsed);v.update(dt);elapsed+=dt;callback?.();}}
function close(actual,expected,tolerance=1e-5){assert(Math.abs(actual-expected)<=tolerance,`${actual} differs from ${expected} by ${Math.abs(actual-expected)}`);}



const Slam=require('../js/vfx/staff-slam.js'),Config=require('../js/vfx/staff-skill-config.js'),skill=Config.skills[2];
test('Chấn Địa lasts exactly three Côn Quét casts; charging does not create a hit',()=>{
 close(skill.duration,Config.skills[0].duration*3,1e-9);
 assert.equal(Slam.sample(.5).lift,0);assert(Slam.sample(1.1).lift>0);
 assert(Slam.sample(2.2).lift>1.3);assert(Slam.sample(3.7).lift>0);assert.equal(Slam.sample(3.9).lift,0);
 assert.equal(Slam.sample(5.4).weight,0);
});
for(const gender of ['male','female'])test('Chấn Địa real '+gender+' GLB: leap, both palms, impact, recovery and cancellation at 30/60/120 Hz',async()=>{
 for(const fps of [30,60,120]){
  const {v,gltf,actor}=await visual(gender),ctx={window:{}};vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(root,'SOURCE-CODE/js/weapons-village-models.js'),'utf8'),ctx);
  const models=ctx.window.createVillageWeaponModels(T),staff=models.models.get('staff'),mount=models.root;
  for(const model of models.models.values())if(model!==staff)model.group.removeFromParent();
  v.sockets.right.add(mount);mount.scale.setScalar(.7);mount.rotation.y=Math.PI;
  const origin=actor.position.clone(),orientation=actor.quaternion.clone(),lengths=new Map();
  gltf.scene.traverse(o=>{if(o.isBone&&o.parent?.isBone)lengths.set(o,o.position.length());});
  assert(v.startStaffSlam());assert(!v.startStaffSweep());assert(!v.startJump(.7));
  let maxGap=0,maxAt=0,contact=null;
  for(let frame=1;frame<=Math.ceil(skill.duration*fps);frame++){
   v.update(1/fps);actor.updateMatrixWorld(true);const age=frame/fps;
   assert(actor.position.equals(origin));assert(actor.quaternion.equals(orientation));
   for(const [bone,length] of lengths)close(bone.position.length(),length,1e-6);
   if(age>=.23&&age<4.65){
    const left=v.sockets.left.getWorldPosition(new T.Vector3()),target=staff.group.localToWorld(new T.Vector3(-.42,0,0)),gap=left.distanceTo(target);
    if(gap>maxGap){maxGap=gap;maxAt=age;}
   }
   if(Math.abs(age-2.2)<.5/fps){const box=new T.Box3().setFromObject(gltf.scene,true);assert(box.min.y>origin.y+1.3,'character is visibly airborne');}
   if(Math.abs(age-3.9)<.5/fps)contact=staff.tip.getWorldPosition(new T.Vector3());
  }
  assert(maxGap<.005,gender+' palm gap '+maxGap+' at '+maxAt);
  assert(contact);close(contact.y,origin.y,.05);
  const local=actor.worldToLocal(contact.clone());close(local.x,-.12,.02);close(local.z,Slam.contact.z,.02);
  assert.equal(v.state.busy,false);close(v.sockets.right.userData.staffSlamTime,skill.duration);v.update(0);assert.equal(v.sockets.right.userData.staffSlamTime,undefined);
  for(const time of [.3,1.1,2.4,3.6,4.2,5.1]){assert(v.startStaffSlam());advance(v,time);v.cancelStaffSlam();assert.equal(v.state.busy,false);assert.equal(v.sockets.right.userData.staffSlamTime,undefined);const box=new T.Box3().setFromObject(gltf.scene,true);assert(box.min.y<origin.y+.08,'cancel returns to ground');}
  assert(v.startStaffSlam());advance(v,2.2);v.returnToIdle();assert(new T.Box3().setFromObject(gltf.scene,true).min.y<origin.y+.08,'paused preview reset returns to ground immediately');
  assert(v.startStaffSweep());v.cancelStaffSweep();mount.removeFromParent();models.dispose();v.dispose();
 }
});
