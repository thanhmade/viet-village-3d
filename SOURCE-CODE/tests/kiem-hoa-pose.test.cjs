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
function runtime(){const context={THREE:T,SwordFlower:require('../js/vfx/sword-flower.js'),SwordQi:require('../js/vfx/sword-qi.js'),SwordStrike:require('../js/vfx/sword-strike.js'),BowRain:require('../js/vfx/bow-rain.js'),BowVolley:require('../js/vfx/bow-volley.js'),BowPiercing:require('../js/vfx/bow-piercing.js'),StaffSweep:require('../js/vfx/staff-sweep.js'),StaffSlam:require('../js/vfx/staff-slam.js'),console,document:{}};context.window=context;vm.createContext(context);
 for(const name of ['npc-gltf.js','player-gltf.js'])vm.runInContext(fs.readFileSync(path.join(root,'CHARACTERS',name),'utf8'),context);
 return context;
}
async function visual(kind='female'){const gltf=await asset(kind),context=runtime(),v=context.createVillagePlayerGLTFVisual({THREE:T,gltf,height:2.35,modelId:kind+'-base',forwardYaw:0}),actor=new T.Group();
 actor.position.set(4,.3,-5);actor.rotation.y=.6;actor.add(v.root);v.update(0);return {v,gltf,actor};
}
function advance(v,seconds,callback){let elapsed=0;while(elapsed<seconds){const dt=Math.min(.05,seconds-elapsed);v.update(dt);elapsed+=dt;callback?.();}}
function close(actual,expected,tolerance=1e-5){assert(Math.abs(actual-expected)<=tolerance,`${actual} differs from ${expected} by ${Math.abs(actual-expected)}`);}



const Flower=require('../js/vfx/sword-flower.js');
for(const gender of ['male','female'])test('Kiếm Hoa '+gender+': real GLB anchors, root lock, alternating feet and restoration',async()=>{
 for(const fps of [30,60,120]){const {v,gltf,actor}=await visual(gender),ctx={window:{}};vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(root,'SOURCE-CODE/js/weapons-village-models.js'),'utf8'),ctx);
 const models=ctx.window.createVillageWeaponModels(T),sword=models.models.get('sword'),mount=models.root;for(const m of models.models.values())if(m!==sword)m.group.removeFromParent();v.sockets.right.add(mount);mount.scale.setScalar(.7);mount.rotation.y=Math.PI;mount.position.copy(sword.gripPoint).multiplyScalar(-.7).applyQuaternion(mount.quaternion);
 const origin=actor.position.clone(),orientation=actor.quaternion.clone(),feet=[],lengths=new Map();gltf.scene.traverse(o=>{if(o.isBone&&/(LeftFoot|RightFoot)$/.test(o.name))feet.push(o);if(o.isBone&&o.parent?.isBone)lengths.set(o,o.position.length());});
 assert(v.startSwordStrike(Flower.skillId));assert(!v.startSwordStrike());assert(!v.startJump(.7));let maxGap=0,footMotion=0,previous=feet.map(f=>f.getWorldPosition(new T.Vector3()));
 for(let frame=1;frame<=Math.ceil(3.4*fps);frame++){const t=frame/fps;v.update(1/fps);actor.updateMatrixWorld(true);assert(actor.position.equals(origin));assert(actor.quaternion.equals(orientation));for(const [bone,length] of lengths)close(bone.position.length(),length,1e-6);
 if(t>=.55&&t<=2.25){const forward=new T.Vector3(0,0,1).applyQuaternion(actor.quaternion),expected=Flower.authoredBlade(T,origin,forward,t);maxGap=Math.max(maxGap,sword.tip.getWorldPosition(new T.Vector3()).distanceTo(expected.tip));const held=sword.group.localToWorld(sword.gripPoint.clone());assert(held.distanceTo(v.sockets.right.getWorldPosition(new T.Vector3()))<1e-6);}
 const now=feet.map(f=>f.getWorldPosition(new T.Vector3()));footMotion+=now.reduce((n,p,i)=>n+p.distanceTo(previous[i]),0);previous=now;}
 assert(maxGap<.008,gender+' blade gap '+maxGap);assert(footMotion>1,'feet never change support');assert.equal(v.state.busy,false);assert(v.startSwordStrike(Flower.skillId));advance(v,1.2);v.cancelSwordStrike();assert.equal(v.sockets.right.userData.swordStrikeTime,undefined);assert.equal(v.state.busy,false);assert(v.startSwordStrike());v.cancelSwordStrike();mount.removeFromParent();models.dispose();v.dispose();
 }
});
for(const gender of ['male','female'])test('Kiếm Hoa '+gender+': soles stay above ground and support feet do not skate',async()=>{
 const {v,gltf,actor}=await visual(gender),probes=[],feet=[];gltf.scene.traverse(mesh=>{if(mesh.isBone&&/(LeftFoot|RightFoot)$/.test(mesh.name))feet.push(mesh);if(!mesh.isSkinnedMesh)return;const indices=mesh.geometry.attributes.skinIndex,weights=mesh.geometry.attributes.skinWeight;for(let index=0;index<indices.count;index++){let w=0;for(const c of ['X','Y','Z','W'])if(/(Foot|Toe)/.test(mesh.skeleton.bones[indices['get'+c](index)].name))w+=weights['get'+c](index);if(w>.5)probes.push({mesh,index});}});
 // Sample at 240 Hz and require both ends on the floor: an airborne touchdown
 // between two 60 Hz frames is a step, not ground sliding.
 const local=()=>feet.map(f=>actor.worldToLocal(f.getWorldPosition(new T.Vector3())));actor.updateMatrixWorld(true);const base=local();let previous=base,sliding=[0,0],lift=[0,0];assert(v.startSwordStrike(Flower.skillId));
 for(let frame=1;frame<=800;frame++){v.update(1/240);actor.updateMatrixWorld(true);const t=frame/240,floor=Math.min(...probes.map(({mesh,index})=>mesh.getVertexPosition(index,new T.Vector3()).applyMatrix4(mesh.matrixWorld).y))-actor.position.y;assert(floor>-.003,gender+' sole penetration at '+t+': '+floor);const now=local();for(let i=0;i<2;i++){const dy=now[i].y-base[i].y,travel=Math.hypot(now[i].x-previous[i].x,now[i].z-previous[i].z);lift[i]=Math.max(lift[i],dy);if(t>.55&&t<2.25&&dy<.01&&previous[i].y-base[i].y<.01&&travel*240>.15)sliding[i]+=travel;}previous=now;}
 for(let i=0;i<2;i++){assert(lift[i]>.05,'foot never lifts');assert(sliding[i]<.06,gender+' support foot slides '+sliding[i]);}v.dispose();
});
// The 15 s idle clip shuffles both feet (up to ~30 cm). A strike cast mid-shuffle must
// hold that clip, not drag the planted IK feet along with it or slide them at hand-off.
for(const gender of ['male','female'])test('Kiếm Hoa / Nhất Kiếm / Kiếm Khí '+gender+': casting at any idle phase keeps support feet planted',async()=>{
 const Strike=require('../js/vfx/sword-strike.js'),Qi=require('../js/vfx/sword-qi.js');
 // Nhất Kiếm keeps its own 3 cm bound: its stance entry slides ~1 cm even from idle 0.
 for(const [skillId,duration,limit] of [[Flower.skillId,Flower.poseDuration,.012],['sword.nhat-kiem',Strike.poseDuration,.03],['sword.kiem-khi',Qi.poseDuration,.015]])for(const idleAt of [0,4.9,6.2,12.3]){
  const {v,gltf,actor}=await visual(gender),feet=[];gltf.scene.traverse(o=>{if(o.isBone&&/(LeftFoot|RightFoot)$/.test(o.name))feet.push(o);});
  advance(v,idleAt);actor.updateMatrixWorld(true);const local=()=>feet.map(f=>actor.worldToLocal(f.getWorldPosition(new T.Vector3())));
  const base=local(),start=v.state.time;let previous=base,sliding=[0,0];assert(v.startSwordStrike(skillId));
  for(let frame=1;frame<=Math.floor(duration*240);frame++){v.update(1/240);actor.updateMatrixWorld(true);const now=local();
   for(let i=0;i<2;i++){const travel=Math.hypot(now[i].x-previous[i].x,now[i].z-previous[i].z);if(now[i].y-base[i].y<.01&&previous[i].y-base[i].y<.01&&travel*240>.15)sliding[i]+=travel;}previous=now;}
  for(let i=0;i<2;i++)assert(sliding[i]<limit,`${gender} ${skillId} cast at idle ${idleAt} s: support foot slides ${(sliding[i]*100).toFixed(2)} cm`);
  advance(v,.2);assert.equal(v.state.busy,false);assert(v.state.time>start,'idle clip resumes after the strike');v.dispose();
 }
});
