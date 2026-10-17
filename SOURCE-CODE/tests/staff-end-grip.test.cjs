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
function runtime(){const context={THREE:T,StaffSweep:require('../js/vfx/staff-sweep.js'),console,document:{}};context.window=context;vm.createContext(context);
 for(const name of ['npc-gltf.js','player-gltf.js'])vm.runInContext(fs.readFileSync(path.join(root,'CHARACTERS',name),'utf8'),context);
 return context;
}
async function visual(kind='female'){const gltf=await asset(kind),context=runtime(),v=context.createVillagePlayerGLTFVisual({THREE:T,gltf,height:2.35,modelId:kind+'-base',forwardYaw:0}),actor=new T.Group();
 actor.position.set(4,.3,-5);actor.rotation.y=.6;actor.add(v.root);v.update(0);return {v,gltf,actor};
}
function advance(v,seconds,callback){let elapsed=0;while(elapsed<seconds){const dt=Math.min(.05,seconds-elapsed);v.update(dt);elapsed+=dt;callback?.();}}
function close(actual,expected,tolerance=1e-5){assert(Math.abs(actual-expected)<=tolerance,`${actual} differs from ${expected} by ${Math.abs(actual-expected)}`);}


const Motion=require('../js/vfx/staff-sweep.js');
for(const gender of ['male','female'])test('end grip, whole-body turn, foot contact and cancellation on '+gender+' GLB at 30/60/120 Hz',async()=>{
 for(const fps of [30,60,120]){
  const {v,gltf,actor}=await visual(gender),ctx={window:{}};vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(root,'SOURCE-CODE/js/weapons-village-models.js'),'utf8'),ctx);
  const models=ctx.window.createVillageWeaponModels(T),staff=models.models.get('staff'),mount=models.root;
  for(const model of models.models.values())if(model!==staff)model.group.removeFromParent();
  v.sockets.right.add(mount);mount.scale.setScalar(.7);mount.rotation.y=Math.PI;
  const origin=actor.position.clone(),orientation=actor.quaternion.clone(),facing=v.root.getObjectByName('player-facing-pose');
  const lengths=new Map();gltf.scene.traverse(o=>{if(o.isBone&&o.parent?.isBone)lengths.set(o,o.position.length());});
  assert(v.startStaffSweep());let maxGap=0,firstYaw=0,lastYaw=0;
  close(v.sockets.right.userData.staffSweepGripX,1.08);
  for(let frame=1;frame<=Math.ceil(1.8*fps);frame++){
   v.update(1/fps);const age=frame/fps;
   const x=v.sockets.right.userData.staffSweepGripX||0;
   mount.position.set(x*-.7,0,0).applyQuaternion(mount.quaternion);actor.updateMatrixWorld(true);
   assert(actor.position.equals(origin));assert(actor.quaternion.equals(orientation));
   close(facing.rotation.y,age<1.8-1e-7?age*1200*Math.PI/180:0,1e-5);
   for(const [bone,length] of lengths)close(bone.position.length(),length,1e-6);
   if(age<1.8-1e-7){
    close(x,1.08);const right=v.sockets.right.getWorldPosition(new T.Vector3()),left=v.sockets.left.getWorldPosition(new T.Vector3());
    const rightGrip=staff.group.localToWorld(new T.Vector3(1.08,0,0)),leftGrip=staff.group.localToWorld(new T.Vector3(.62,0,0));
    maxGap=Math.max(maxGap,right.distanceTo(rightGrip),left.distanceTo(leftGrip));
    assert(staff.sweepTip.getWorldPosition(new T.Vector3()).distanceTo(right)>1.7,'long striking end extends from the palms');
    const shortEnd=staff.group.localToWorld(new T.Vector3(1.4,0,0));close(shortEnd.distanceTo(right),.224,1e-5);
    const bounds=new T.Box3().setFromObject(gltf.scene,true);assert(bounds.min.y>=actor.position.y-.003,'feet do not sink');
    firstYaw??=facing.rotation.y;lastYaw=facing.rotation.y;
   }
  }
  assert(maxGap<.001,gender+' at '+fps+' Hz palm gap '+maxGap);assert(lastYaw-firstYaw>Math.PI*11.7,'body completes six continuous turns through the last frame');
  assert.equal(v.sockets.right.userData.staffSweepGripX,undefined);assert.equal(v.state.busy,false);
  close(facing.rotation.y,0);assert(v.startStaffSweep());advance(v,.45);v.cancelStaffSweep();
  assert.equal(v.sockets.right.userData.staffSweepGripX,undefined);close(facing.rotation.y,0);
  const segments=require('../js/vfx/staff-vfx-config.js').animation,shield=segments['staff.ho-than'],slam=segments['staff.chan-dia'];
  assert(v.playSegment(shield.clip,{from:shield.from,to:shield.to,force:true}),'Hộ Thân remains available');
  v.returnToIdle();assert(v.playSegment(slam.clip,{from:slam.from,to:slam.to,force:true}),'Chấn Địa remains available');
  mount.removeFromParent();models.dispose();v.dispose();
 }
});

test('actual weapon adapter slides only the sweep grip and resets on cancel, Hộ Thân and Chấn Địa',async()=>{
 const {v,actor}=await visual('male'),ctx=runtime(),Core=require('../js/vfx/weapon-vfx-core.js');require('../js/vfx/staff-skill-vfx.js');
 ctx.WeaponVFXCore=Core;ctx.setTimeout=()=>0;ctx.clearTimeout=()=>{};ctx.addEventListener=()=>{};
 const node=()=>({textContent:'',classList:{contains:()=>false,add(){},remove(){}},addEventListener(){},removeEventListener(){},setAttribute(){},replaceChildren(){},append(){}}),els=new Map();
 ctx.document={getElementById:id=>{if(!els.has(id))els.set(id,node());return els.get(id);},createElement:node,addEventListener(){},body:node()};
 for(const name of ['staff-guard.js','weapons-village-models.js','weapons-village.js'])vm.runInContext(fs.readFileSync(path.join(root,'SOURCE-CODE/js',name),'utf8'),ctx);
 const scene=new T.Scene();scene.add(actor);const rightArm=new T.Group();actor.add(rightArm);
 const w=ctx.createVillageWeapons({THREE:T,scene,body:actor,rightArm,getState:()=>({canCast:true,authenticated:true,poseBusy:v.state.busy}),getGroundY:()=>.3,
  startRoaming:()=>true,clearMotion(){},onSkillUsed:e=>{if(e.slot===1)v.startStaffSweep();},onSkillCancel:()=>v.cancelStaffSweep()});
 w.setAvatarSocket(v.sockets.right);assert(w.equip('staff'));assert(w.cast(1).ok);
 for(let i=0;i<25;i++){v.update(.02);w.update(.02);}
 const mount=actor.getObjectByName('village-local-weapon'),model=mount.getObjectByName('weapon-staff'),palm=v.sockets.right.getWorldPosition(new T.Vector3());
 assert(model);close(model.userData.staffSweepGripX,1.08);close(model.localToWorld(new T.Vector3(1.08,0,0)).distanceTo(palm),0,1e-5);
 assert.equal(w.cast(2).reason,'busy');w.suspend();close(model.userData.staffSweepGripX,0);close(mount.position.length(),0);
 assert(w.cast(2).ok);w.update(.2);close(mount.position.length(),0);w.suspend();assert(w.cast(3).ok);w.update(.2);close(mount.position.length(),0);
 w.dispose();v.dispose();
});
