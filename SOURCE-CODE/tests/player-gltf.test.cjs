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
function runtime(){const context={THREE:T,console,document:{}};context.window=context;vm.createContext(context);
 for(const name of ['npc-gltf.js','player-gltf.js'])vm.runInContext(fs.readFileSync(path.join(root,'CHARACTERS',name),'utf8'),context);
 return context;
}
async function visual(kind='female'){const gltf=await asset(kind),context=runtime(),v=context.createVillagePlayerGLTFVisual({THREE:T,gltf,height:2.35,modelId:kind+'-base',forwardYaw:0}),actor=new T.Group();
 actor.position.set(4,.3,-5);actor.rotation.y=.6;actor.add(v.root);v.update(0);return {v,gltf,actor};
}
function advance(v,seconds,callback){let elapsed=0;while(elapsed<seconds){const dt=Math.min(.05,seconds-elapsed);v.update(dt);elapsed+=dt;callback?.();}}
function close(actual,expected,tolerance=1e-5){assert(Math.abs(actual-expected)<=tolerance,`${actual} differs from ${expected} by ${Math.abs(actual-expected)}`);}

test('male GLB has its own 33 named clips, matching 65-joint hierarchy, one textured mesh and no morph targets',async()=>{
 assert.equal(maleBuffer.toString('ascii',0,4),'glTF');assert.equal(maleBuffer.readUInt32LE(4),2);assert.equal(maleBuffer.readUInt32LE(8),maleBuffer.length);
 const maleNames=maleJSON.animations.map(clip=>clip.name),femaleNames=json.animations.map(clip=>clip.name);
 assert.equal(maleNames.length,33);assert.deepEqual([...maleNames].sort(),[...femaleNames].sort());assert.notDeepEqual(maleNames,femaleNames);
 assert.equal(maleNames.indexOf('idle'),14);assert.equal(femaleNames.indexOf('idle'),26);assert(!maleNames.includes('defeat'));
 const hierarchy=source=>source.skins[0].joints.map(index=>({name:source.nodes[index].name,children:(source.nodes[index].children||[]).map(child=>source.nodes[child].name)}));
 assert.equal(maleJSON.skins.length,1);assert.equal(maleJSON.skins[0].joints.length,65);assert.deepEqual(hierarchy(maleJSON),hierarchy(json));
 assert.equal(maleJSON.meshes.length,1);assert.equal(maleJSON.materials.length,1);assert(maleJSON.meshes.every(mesh=>mesh.primitives.every(primitive=>!primitive.targets?.length)));
 assert.equal(maleJSON.images.length,3);assert(maleJSON.images.every(image=>image.bufferView!==undefined&&!image.uri));assert(maleJSON.buffers.every(item=>!item.uri));
 const {v,gltf}=await visual('male');assert.equal(v.stats.modelId,'male-base');assert.equal(v.root.name,'player-male-glb-visual');assert.equal(v.state.clip,'idle');
 assert.equal(v.stats.vertices,20874);assert.equal(v.stats.triangles,18845);assert.equal(v.stats.bones,65);assert.equal(v.stats.forwardYaw,0);
 let mesh;gltf.scene.traverse(object=>{if(object.isSkinnedMesh)mesh=object;});assert(mesh);assert.equal(mesh.skeleton.bones.length,65);
 for(const key of ['map','normalMap','metalnessMap','roughnessMap'])assert(mesh.material[key]?.image,key);
 assert.equal(mesh.material.map.colorSpace,T.SRGBColorSpace);assert.deepEqual(Array.from(v.clips,clip=>clip.name),maleNames);v.dispose();
});

test('male locomotion uses its own clips by name, fits the floor and never changes controller position or restarts per frame',async()=>{
 const {v,gltf,actor}=await visual('male'),bounds=new T.Box3().setFromObject(gltf.scene,true),position=actor.position.clone();
 close(bounds.getSize(new T.Vector3()).y,2.35);close(bounds.min.y,actor.position.y,.002);close(v.stats.sourceHeight,.9785457049470309);
 const hips=gltf.scene.getObjectByName('mixamorigHips'),anchor=hips.position.clone(),run=gltf.animations.find(clip=>clip.name==='run');
 const runTrack=run.tracks.find(track=>track.name==='mixamorigHips.position');assert(runTrack.values[2]>.49&&runTrack.values[2]<.50,'Use Male-authored root motion, not Female tracks');
 for(const [speed,name] of [[4.5,'walk'],[6.5,'run'],[0,'idle']]){
  v.setLocomotion(speed);advance(v,.3);assert.equal(v.state.clip,name);const action=v.mixer.clipAction(gltf.animations.find(clip=>clip.name===name)),time=action.time;
  for(let frame=0;frame<10;frame++){v.setLocomotion(speed);v.update(.02);close(hips.position.x,anchor.x);close(hips.position.z,anchor.z);assert(actor.position.equals(position));}
  close(action.time,time+.2);assert.equal(v.state.activeActions,1);assert.equal(action.loop,T.LoopRepeat);
 }
 advance(v,31);bounds.setFromObject(gltf.scene,true);assert(bounds.min.y>=actor.position.y-.005);assert(bounds.min.y<actor.position.y+.02);v.dispose();
});

test('male jump, combat and NPC one-shots return to movement without drift, stacked actions or automatic slash',async()=>{
 const {v,gltf,actor}=await visual('male'),position=actor.position.clone(),hips=gltf.scene.getObjectByName('mixamorigHips'),anchor=hips.position.clone(),bounds=new T.Box3();
 advance(v,2);assert.equal(v.state.clip,'idle');assert.equal(v.state.activeActions,1);
 let maxAir=0;assert(v.playOnce('jump'));advance(v,2.6,()=>{bounds.setFromObject(gltf.scene,true);maxAir=Math.max(maxAir,bounds.min.y-actor.position.y);assert(actor.position.equals(position));});
 assert(maxAir>.2,'Male authored jump Y must be retained: '+maxAir);assert.equal(v.state.clip,'idle');
 for(const name of ['slash','hit_to_body_01','greet_01','agree','bow','cheer','clap']){
  assert(v.playOnce(name),name);assert.equal(v.playOnce(name),false);v.setLocomotion(4.5);
  advance(v,gltf.animations.find(clip=>clip.name===name).duration+.4,()=>{
   close(hips.position.x,anchor.x);close(hips.position.z,anchor.z);assert(actor.position.equals(position));assert(v.state.activeActions<=2);
  });
  assert.equal(v.state.clip,'walk');assert.equal(v.state.busy,false);
 }
 assert.equal(v.playOnce('defeat'),false);v.dispose();
});

test('male defeat selection requires both actual previews; all 33 clips remain available by name',async()=>{
 const {v,actor}=await visual('male'),position=actor.position.clone();assert.equal(v.playDefeat(),false);assert.equal(v.setDefeatClip('defeat_02'),false);
 for(const clip of v.clips){assert(v.preview(clip.name));advance(v,.3);assert.equal(v.state.clip,clip.name);assert(actor.position.equals(position));assert(v.state.activeActions<=2);}
 for(const name of ['defeat_02','defeat_03']){assert(v.preview(name));advance(v,v.clips.find(clip=>clip.name===name).duration+.1);}
 assert.equal(v.state.reviewedDefeats.length,2);assert(v.setDefeatClip('defeat_02'));assert(v.returnToIdle());assert(v.playDefeat());advance(v,9);
 assert.equal(v.state.clip,'defeat_02');assert.equal(v.state.paused,true);assert(actor.position.equals(position));v.dispose();
});

test('male palms are calibrated from its own hand geometry, independently of female coordinates and live resource ownership',async()=>{
 const male=await visual('male'),female=await visual('female');assert.equal(male.v.stats.socketCalibration,'source-skeleton-idle');
 const handPoint=new T.Vector3(),palmPoint=new T.Vector3(),scale=new T.Vector3();
 for(const side of ['right','left']){
  assert.equal(male.v.hands[side].name,'mixamorig'+(side==='right'?'Right':'Left')+'Hand');
  assert(male.v.sockets[side].position.distanceTo(female.v.sockets[side].position)>.04,'Must not reuse female palm coordinates');
  const distance=male.v.sockets[side].getWorldPosition(palmPoint).distanceTo(male.v.hands[side].getWorldPosition(handPoint));assert(distance>.005&&distance<.18);
  male.v.sockets[side].getWorldScale(scale);for(const value of scale.toArray())close(value,1);
 }
 const preview=await visual('male');let liveMesh,previewMesh,disposed=0;
 male.gltf.scene.traverse(object=>{if(object.isSkinnedMesh)liveMesh=object;});preview.gltf.scene.traverse(object=>{if(object.isSkinnedMesh)previewMesh=object;});
 for(const key of ['geometry','material','skeleton'])assert.notEqual(liveMesh[key],previewMesh[key]);
 for(const key of ['map','normalMap','roughnessMap','metalnessMap']){assert.notEqual(liveMesh.material[key],previewMesh.material[key]);liveMesh.material[key].addEventListener('dispose',()=>disposed++);}
 preview.v.dispose();assert.equal(disposed,0);male.v.setLocomotion(6.5);advance(male.v,.6);assert.equal(male.v.state.clip,'run');assert(male.v.state.time>0);
 male.v.dispose();assert(disposed>0);female.v.dispose();
});

test('female GLB contains exactly 33 named clips, original 65-joint rig and three embedded material textures',async()=>{
 assert.equal(buffer.toString('ascii',0,4),'glTF');assert.equal(buffer.readUInt32LE(4),2);assert.equal(buffer.readUInt32LE(8),buffer.length);
 assert.deepEqual(json.animations.map(clip=>clip.name),exactClips);assert.equal(json.skins.length,1);assert.equal(json.skins[0].joints.length,65);
 assert(json.skins[0].joints.every(index=>json.nodes[index].name.startsWith('mixamorig:')));assert.equal(json.images.length,3);
 assert(json.images.every(image=>image.bufferView!==undefined&&!image.uri));assert(json.buffers.every(item=>!item.uri));assert(!json.animations.some(clip=>clip.name==='defeat'));
 const {v,gltf}=await visual();assert.equal(v.clips.length,33);assert.deepEqual(Array.from(v.clips,clip=>clip.name),exactClips);assert.equal(v.stats.bones,65);
 assert.equal(v.stats.triangles,17748);assert.equal(v.stats.vertices,20195);assert.equal(v.root.userData.localOnly,true);
 let mesh;gltf.scene.traverse(object=>{if(object.isSkinnedMesh)mesh=object;});assert(mesh);assert.equal(mesh.skeleton.bones.length,65);
 assert(mesh.material.map.image&&mesh.material.normalMap.image&&mesh.material.roughnessMap.image&&mesh.material.metalnessMap.image);
 assert.equal(mesh.material.map.colorSpace,T.SRGBColorSpace);assert.equal(mesh.frustumCulled,false);
 assert.equal(v.hands.right.name,'mixamorigRightHand');assert.equal(v.hands.left.name,'mixamorigLeftHand');v.dispose();
});

test('initial idle fits game height, touches the floor and preserves controller position through two idle loops',async()=>{
 const {v,gltf,actor}=await visual(),bounds=new T.Box3().setFromObject(gltf.scene,true),position=actor.position.clone();
 close(bounds.getSize(new T.Vector3()).y,2.35);close(bounds.min.y,actor.position.y,.002);
 const idle=v.mixer.clipAction(gltf.animations.find(clip=>clip.name==='idle'));assert.equal(idle.loop,T.LoopRepeat);assert.equal(idle.repetitions,Infinity);
 assert(v.stats.footProbes>0&&v.stats.footProbes<128);let loops=0;v.mixer.addEventListener('loop',()=>loops++);
 advance(v,31,()=>{assert(actor.position.equals(position));assert.equal(v.state.clip,'idle');assert(v.state.activeActions<=2);});assert.equal(loops,2);
 bounds.setFromObject(gltf.scene,true);assert(bounds.min.y>actor.position.y-.005);assert(bounds.min.y<actor.position.y+.02);v.dispose();
});

test('walk/run use actual speed, cache actions, do not restart each frame and remove the run hips X/Z offset',async()=>{
 const {v,gltf,actor}=await visual(),hips=gltf.scene.getObjectByName('mixamorigHips'),anchor=hips.position.clone(),actorPosition=actor.position.clone();
 const runClip=gltf.animations.find(clip=>clip.name==='run'),runTrack=runClip.tracks.find(track=>track.name==='mixamorigHips.position');
 assert(runTrack.values[2]>.5,'Fixture must include the authored half-unit run offset.');
 v.setLocomotion(4.5);assert.equal(v.state.clip,'walk');advance(v,.4);const before=v.state.time;
 for(let i=0;i<10;i++){v.setLocomotion(4.5);v.update(.05);}close(v.state.time,before+.5);assert.equal(v.state.activeActions,1);
 v.setLocomotion(6.5);const runAction=v.mixer.clipAction(runClip);advance(v,2,()=>{close(hips.position.x,anchor.x);close(hips.position.z,anchor.z);assert(actor.position.equals(actorPosition));assert(v.state.activeActions<=2);});
 assert.equal(v.state.clip,'run');v.setLocomotion(0);advance(v,.3);assert.equal(v.state.clip,'idle');
 v.setLocomotion(6.5);assert.equal(v.mixer.clipAction(runClip),runAction);advance(v,.3);assert.equal(v.state.activeActions,1);
 for(let i=0;i<30;i++){v.setLocomotion(i%3===0?0:i%3===1?4.5:6.5);v.update(.01);assert(v.state.activeActions<=2);}v.dispose();
});

test('jump preserves authored airborne height while once actions reject repeated input and return smoothly',async()=>{
 const {v,gltf,actor}=await visual(),position=actor.position.clone(),bounds=new T.Box3();let maxAir=0;
 assert(v.playOnce('jump'));for(let i=0;i<10;i++)assert.equal(v.playOnce('slash'),false);
 advance(v,2.6,()=>{bounds.setFromObject(gltf.scene,true);maxAir=Math.max(maxAir,bounds.min.y-actor.position.y);assert(v.state.activeActions<=2);assert(actor.position.equals(position));});
 assert(maxAir>.2,'Jump height was flattened: '+maxAir);assert.equal(v.state.clip,'idle');assert.equal(v.state.busy,false);
 for(const clip of ['slash','hit_to_body_01']){
  assert(v.playOnce(clip));assert.equal(v.playOnce(clip),false);v.setLocomotion(4.5);assert.equal(v.state.clip,clip);
  advance(v,gltf.animations.find(item=>item.name===clip).duration+.4,()=>assert(v.state.activeActions<=2));assert.equal(v.state.clip,'walk');assert.equal(v.state.busy,false);
 }
 assert.equal(v.playOnce('defeat'),false);v.returnToIdle();advance(v,.3);assert.equal(v.state.clip,'idle');v.dispose();
});

test('preview can pause and close immediately; every actual clip previews without losing the controller anchor',async()=>{
 const {v,actor}=await visual(),position=actor.position.clone();assert(v.preview('bow'));advance(v,.8);assert(v.pausePreview());const time=v.state.time;
 advance(v,1);close(v.state.time,time);assert.equal(v.state.paused,true);assert(v.resumePreview());advance(v,.2);assert(v.state.time>time);
 assert(v.returnToIdle());advance(v,.3);assert.equal(v.state.preview,false);assert.equal(v.state.clip,'idle');
 for(const clip of v.clips){assert(v.preview(clip.name));advance(v,.25);assert.equal(v.state.clip,clip.name);assert(actor.position.equals(position));assert(v.state.activeActions<=2);}
 assert.equal(v.preview('missing'),false);assert(v.returnToIdle());advance(v,.3);assert.equal(v.state.activeActions,1);v.dispose();
});

test('both real defeat previews must finish before an explicit HP-zero animation can be selected',async()=>{
 const {v}=await visual();assert.equal(v.state.defeatClip,null);assert.equal(v.playDefeat(),false);assert.equal(v.setDefeatClip('defeat_03'),false);
 assert(v.preview('defeat_02'));advance(v,.5);v.returnToIdle();assert.equal(v.state.reviewedDefeats.length,0);
 assert(v.preview('defeat_02'));advance(v,9);assert.deepEqual(Array.from(v.state.reviewedDefeats),['defeat_02']);assert.equal(v.state.paused,true);
 assert.equal(v.setDefeatClip('defeat_02'),false);assert(v.preview('defeat_03'));advance(v,6);assert.equal(v.state.reviewedDefeats.length,2);
 assert.equal(v.setDefeatClip('defeat'),false);assert(v.setDefeatClip('defeat_03'));assert.equal(v.state.defeatClip,'defeat_03');v.returnToIdle();
 assert(v.playDefeat());advance(v,6);assert.equal(v.state.clip,'defeat_03');assert.equal(v.state.mode,'defeat');assert.equal(v.state.paused,true);
 const time=v.state.time;assert(v.playDefeat());advance(v,1);close(v.state.time,time);v.returnToIdle();advance(v,.3);assert.equal(v.state.clip,'idle');v.dispose();
});

test('hand sockets track original hand bones, preserve game-unit weapon scale and survive controller transforms',async()=>{
 const {v,gltf,actor}=await visual(),position=new T.Vector3(),handPosition=new T.Vector3(),scale=new T.Vector3();
 for(const side of ['right','left']){
  assert.equal(v.sockets[side].parent,v.root);v.sockets[side].getWorldScale(scale);for(const value of scale.toArray())close(value,1);
  const distance=v.sockets[side].getWorldPosition(position).distanceTo(v.hands[side].getWorldPosition(handPosition));assert(distance>.005&&distance<.18,'Palm distance '+distance);
 }
 const rest=v.sockets.right.getWorldPosition(new T.Vector3());assert(v.preview('slash'));advance(v,1);
 assert(rest.distanceTo(v.sockets.right.getWorldPosition(position))>.05,'Weapon socket does not follow animation.');
 actor.scale.setScalar(1.6);actor.position.set(11,4,-9);actor.rotation.y=2.1;v.update(0);
 for(const side of ['right','left']){v.sockets[side].getWorldScale(scale);for(const value of scale.toArray())close(value,1);}
 const equipment=new T.Group();v.sockets.right.add(equipment);let freed=0;gltf.scene.traverse(object=>object.geometry?.addEventListener('dispose',()=>freed++));
 v.dispose();assert(freed>0);assert.equal(v.root.parent,null);assert.equal(equipment.parent,null);assert.equal(v.playOnce('jump'),false);assert.equal(v.preview('idle'),false);v.dispose();
});

test('a missing exact required clip or hand bone fails explicitly instead of silently using a replacement',async()=>{
 const context=runtime(),missingClip=await asset();missingClip.animations=missingClip.animations.filter(clip=>clip.name!=='idle');
 assert.throws(()=>context.createVillagePlayerGLTFVisual({THREE:T,gltf:missingClip}),/idle/);
 const missingHand=await asset(),bone=missingHand.scene.getObjectByName('mixamorigRightHand');bone.name='unknown';missingHand.parser.associations.delete(bone);
 assert.throws(()=>context.createVillagePlayerGLTFVisual({THREE:T,gltf:missingHand}),/RightHand/);
});

test('social one-shots use the real clips, never drift the hips and return to current locomotion',async()=>{
 const {v,gltf,actor}=await visual(),position=actor.position.clone(),hips=gltf.scene.getObjectByName('mixamorigHips'),anchor=hips.position.clone();
 for(const name of ['greet_01','agree','bow','cheer','clap']){
  assert(v.playOnce(name),name);assert.equal(v.playOnce(name),false,'Repeated social input must not restart an action.');
  v.setLocomotion(4.5);
  advance(v,gltf.animations.find(clip=>clip.name===name).duration+.4,()=>{
   close(hips.position.x,anchor.x);close(hips.position.z,anchor.z);assert(actor.position.equals(position));assert(v.state.activeActions<=2);
  });
  assert.equal(v.state.clip,'walk');assert.equal(v.state.busy,false);
 }
 v.dispose();
});

test('disposing an independently loaded preview leaves live female skin, texture and animation usable',async()=>{
 const live=await visual(),preview=await visual();let liveMesh,previewMesh,liveDisposed=0;
 live.gltf.scene.traverse(object=>{if(object.isSkinnedMesh)liveMesh=object;});
 preview.gltf.scene.traverse(object=>{if(object.isSkinnedMesh)previewMesh=object;});
 for(const key of ['geometry','material','skeleton'])assert.notEqual(liveMesh[key],previewMesh[key],key+' must not share ownership');
 for(const key of ['map','normalMap','metalnessMap','roughnessMap']){
  assert.notEqual(liveMesh.material[key],previewMesh.material[key]);
  assert.notEqual(liveMesh.material[key].image,previewMesh.material[key].image);
  liveMesh.material[key].addEventListener('dispose',()=>liveDisposed++);
 }
 liveMesh.geometry.addEventListener('dispose',()=>liveDisposed++);liveMesh.material.addEventListener('dispose',()=>liveDisposed++);
 preview.v.dispose();assert.equal(liveDisposed,0);assert.equal(live.v.root.parent,live.actor);
 live.v.setLocomotion(6.5);advance(live.v,.5);assert.equal(live.v.state.clip,'run');assert(live.v.state.time>0);
 assert(Number.isFinite(new T.Box3().setFromObject(live.gltf.scene,true).min.y));live.v.dispose();assert(liveDisposed>0);
});

for(const kind of ['female','male'])test('all real weapon handles stay at the '+kind+' palm in idle, run and slash, with original-avatar placement preserved',async()=>{
 const createHarness=require('./harness.cjs'),h=createHarness(),{v}=await visual(kind),controller=h.context.VietVillageWeapons;
 h.run('body').add(v.root);controller.setAvatarSocket(v.sockets.right);
 const handleWorld=new T.Vector3(),palmWorld=new T.Vector3(),scale=new T.Vector3();
 for(const id of ['staff','sword','spear','bow','axe']){
  assert(controller.equip(id));
  const grip=h.run('player').getObjectByName('village-local-weapon'),handle=grip.getObjectByName('weapon-'+id+'-grip');
  assert(handle,id+' must expose its actual handle mesh');assert.equal(grip.parent,v.sockets.right);
  for(const clip of ['idle','run','slash']){
   v.returnToIdle();advance(v,.3);if(clip==='run')v.setLocomotion(6.5);if(clip==='slash')assert(v.playOnce('slash'));
   advance(v,.8,()=>{
    handle.getWorldPosition(handleWorld);v.sockets.right.getWorldPosition(palmWorld);close(handleWorld.distanceTo(palmWorld),0);
    grip.getWorldScale(scale);for(const value of scale.toArray())close(value,.7);
   });
  }
 }
 controller.setAvatarSocket(null);const grip=h.run('player').getObjectByName('village-local-weapon');
 assert.equal(grip.parent,h.run('rightArm'));assert.deepEqual(Array.from(grip.position.toArray()),[0,-.5,.28]);
 controller.dispose();v.dispose();
});

test('actual preview keeps the last Male/Female selection and disposes older models without touching the winner',async()=>{
 const {createCharacterPreview}=await import(pathToFileURL(path.join(root,'SOURCE-CODE/js/character-preview.js')).href);
 const helper=runtime(),requests=[],renders=[],frames=new Map(),assets=await Promise.all([asset('female'),asset('male'),asset('female')]);
 const freed=[0,0,0];assets.forEach((gltf,i)=>gltf.scene.traverse(object=>object.geometry?.addEventListener('dispose',()=>freed[i]++)));
 const target=()=>({addEventListener(){},removeEventListener(){},setAttribute(){},focus(){},remove(){this.removed=true;}});
 let serial=0,renderDisposed=0,contextLost=0;
 const win={...target(),devicePixelRatio:2,requestAnimationFrame(fn){const id=++serial;frames.set(id,fn);return id;},cancelAnimationFrame(id){frames.delete(id);}};
 const doc={...target(),defaultView:win,hidden:false};
 const container={...target(),ownerDocument:doc,children:[],append(node){this.children.push(node);},getBoundingClientRect:()=>({width:320,height:430})};
 class Renderer{
  constructor(){this.domElement=target();}setPixelRatio(){}setSize(){}
  render(scene,camera){renders.push({scene,camera,visuals:scene.children.filter(node=>node.userData.modelId)});}
  dispose(){renderDisposed++;}forceContextLoss(){contextLost++;}
 }
 const previousDisposer=global.disposeVillageNPCGLTF;global.disposeVillageNPCGLTF=helper.disposeVillageNPCGLTF;
 const preview=createCharacterPreview({container,THREE:{...T,WebGLRenderer:Renderer},createVisual:helper.createVillagePlayerGLTFVisual,
  load:()=>new Promise(resolve=>requests.push(resolve))});
 try{
  preview.start();const first=preview.showModel(filename,{modelId:'female-base'}),firstFailure=assert.rejects(first,error=>error.name==='AbortError');
  const second=preview.showModel(maleFilename,{modelId:'male-base'});requests[1](assets[1]);await second;
  assert.equal(renders.at(-1).visuals.length,1);const displayed=renders.at(-1).visuals[0];
  assert.equal(displayed.userData.modelId,'male-base');
  requests[0](assets[0]);await firstFailure;assert.equal(freed[0],1);assert.equal(freed[1],0);
  assert.equal(renders.at(-1).visuals[0],displayed,'Old completion must not replace current visual');
  const late=preview.showModel(filename),lateFailure=assert.rejects(late,error=>error.name==='AbortError');
  assert.equal(freed[1],1);preview.dispose();requests[2](assets[2]);await lateFailure;
  assert.equal(freed[2],1);assert.equal(frames.size,0);assert.equal(container.children[0].removed,true);
  assert.equal(renderDisposed,1);assert.equal(contextLost,1);preview.dispose();assert.equal(renderDisposed,1);
 }finally{preview.dispose();global.disposeVillageNPCGLTF=previousDisposer;}
});

test('skill segments play only the measured part of a clip, chain with force and never cut defeat or preview',async()=>{
 const {v}=await visual();
 assert.equal(v.playSegment('cast_a_spell',{from:.55,to:1.75,force:true}),true);
 assert.equal(v.state.clip,'cast_a_spell');assert.equal(v.state.mode,'once');close(v.state.time,.55);
 advance(v,1.1);assert.equal(v.state.clip,'cast_a_spell');assert(v.state.time<1.75);
 advance(v,.2);assert.equal(v.state.mode,'locomotion');assert.equal(v.state.clip,'idle','returns to locomotion at the segment end');
 assert.equal(v.playSegment('slash',{from:1.45,to:3.25,force:true}),true);close(v.state.time,1.45);
 assert.equal(v.playSegment('cast_a_spell',{from:1.95,to:4.95}),false,'without force a running one-shot is kept');
 assert.equal(v.playSegment('cast_a_spell',{from:1.95,to:4.95,force:true}),true,'skill after skill');close(v.state.time,1.95);
 for(const bad of [['missing',{}],['slash',{from:3,to:2}],['slash',{from:9,to:12}]])assert.equal(v.playSegment(bad[0],{...bad[1],force:true}),false);
 assert.equal(v.preview('slash'),true);assert.equal(v.playSegment('slash',{from:1,to:2,force:true}),false,'preview untouched');
 v.dispose();assert.equal(v.playSegment('slash',{from:1,to:2,force:true}),false);
});
