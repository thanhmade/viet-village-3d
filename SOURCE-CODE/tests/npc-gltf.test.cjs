'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'../..'),T=require(path.join(root,'ASSETS/vendor/three.min.js'));
const filename=path.join(root,'CHARACTERS/NPC/LANG_VIET/LY_TRUONG/NPC_LANG_VIET_LY_TRUONG_Idle.glb');
const buffer=fs.readFileSync(filename),json=JSON.parse(buffer.subarray(20,20+buffer.readUInt32LE(12)).toString());
// Only pixel decoding is mocked in Node. Real browser checks verify the JPEG
// texture on WebGL; these tests parse the real GLB, skin and animation tracks.
global.THREE=T;global.self=global;global.createImageBitmap=async blob=>{assert.equal(blob.type,'image/jpeg');const bytes=new Uint8Array(await blob.arrayBuffer());assert.deepEqual([...bytes.slice(0,2)],[255,216]);return {width:2048,height:2048,close(){}};};
global.ProgressEvent=class{constructor(type,detail){this.type=type;Object.assign(this,detail);}};
const loader=import(pathToFileURL(path.join(root,'ASSETS/vendor/gltf-r160/GLTFLoader.js')).href);
async function asset(){const {GLTFLoader}=await loader;return new GLTFLoader().parseAsync(buffer.buffer.slice(buffer.byteOffset,buffer.byteOffset+buffer.byteLength),'');}
function runtime(){
 const context={THREE:T,console,document:{createElement:()=>({getContext:()=>({fillRect(){},fillText(){}})})}};context.window=context;vm.createContext(context);
 for(const name of ['npc-gltf.js','village-npcs.js'])vm.runInContext(fs.readFileSync(path.join(root,'CHARACTERS',name),'utf8'),context);
 return context;
}
const gameplay=()=>JSON.parse(fs.readFileSync(path.join(root,'MAP/regions/lang-viet/gameplay.json'),'utf8'));
// Loader-only fixture includes the raised approach to the front left house.
// Real mesh/ground and collision checks live in the individual NPC suites.
function mounted(){const context=runtime(),region={id:'lang-viet',root:new T.Group(),canWalk:()=>true,groundHeight:(x,z)=>z>=13.6&&z<=15.2?(x<0?.56:.36):.3};return {context,region,actors:context.mountVillageNPCs({THREE:T,region,gameplay:{...gameplay(),npcs:gameplay().npcs.map(n=>n.role!=='elder'?{...n,model:undefined}:n)}})};}
test('actual elder GLB embeds its texture and exact idle.001 clip; runtime links resolve without external assets',()=>{
 assert.equal(buffer.toString('ascii',0,4),'glTF');assert.equal(buffer.readUInt32LE(4),2);assert.equal(buffer.readUInt32LE(8),buffer.length);
 assert.deepEqual(json.animations.map(a=>a.name),['idle.001']);assert.equal(json.images.length,1);assert.equal(json.images[0].mimeType,'image/jpeg');assert.equal(json.images[0].uri,undefined);
 assert(json.buffers.every(b=>!b.uri));assert.equal(json.accessors[json.meshes[0].primitives[0].indices].count/3,10032);
 const model=gameplay().npcs.find(n=>n.role==='elder').model;assert.equal(path.resolve(root,'SOURCE-CODE',model.url),filename);assert.equal(model.clip,'idle.001');
});
test('real GLB skin, material and idle clip fit the player scale and keep sole contact across two animation loops',async()=>{
 const c=runtime(),gltf=await asset(),v=c.createVillageNPCGLTFVisual({THREE:T,gltf,height:2.35,clipName:'idle.001'}),actor=new T.Group();actor.position.set(2,.31,-12.8);actor.add(v.root);
 v.update(0);const box=new T.Box3().setFromObject(gltf.scene,true);assert(Math.abs(box.getSize(new T.Vector3()).y-2.35)<.001);
 assert.equal(v.stats.texturedMeshes,1);let mesh;gltf.scene.traverse(o=>{if(o.isSkinnedMesh)mesh=o;});assert(mesh);assert.equal(mesh.material.map.colorSpace,T.SRGBColorSpace);assert.equal(mesh.material.roughness,json.materials[0].pbrMetallicRoughness.roughnessFactor);assert.equal(mesh.skeleton.bones.length,65);
 assert.equal(v.action.loop,T.LoopRepeat);assert.equal(v.action.repetitions,Infinity);assert.equal(v.action.getClip().name,'idle.001');
 const initial=Array.from(mesh.skeleton.boneMatrices);let maxFloorError=0,loops=0;v.mixer.addEventListener('loop',()=>loops++);
 for(let i=0;i<320;i++){v.update(.1);if(i%5===0){box.setFromObject(gltf.scene,true);maxFloorError=Math.max(maxFloorError,Math.abs(box.min.y-.31));}}
 assert.equal(loops,2);assert(maxFloorError<.015,'Feet leave ground by '+maxFloorError);assert.notDeepEqual(Array.from(mesh.skeleton.boneMatrices),initial);
 assert.deepEqual(actor.position.toArray(),[2,.31,-12.8]);assert.equal(actor.children.length,1);v.dispose();assert.equal(actor.children.length,0);
});
test('missing requested animation fails explicitly and never silently plays a different clip',()=>{
 const c=runtime(),scene=new T.Group();scene.add(new T.Mesh(new T.BoxGeometry(),new T.MeshStandardMaterial()));
 assert.throws(()=>c.createVillageNPCGLTFVisual({THREE:T,gltf:{scene,animations:[new T.AnimationClip('idle',1,[])]},height:2.35,clipName:'idle.001'}),/idle\.001/);
});
test('concurrent load calls attach exactly one GLB, retain the old NPC ID and pause animation outside its map',async()=>{
 const {actors,region}=mounted();let calls=0,resolve;const delayed=new Promise(r=>resolve=r),load=()=>{calls++;return delayed;};
 const first=actors.loadModels(load),second=actors.loadModels(load);assert.equal(calls,1);resolve(await asset());assert(await first);assert(await second);
 const elder=actors.npcs.get('NPC_LANG_VIET_LY_TRUONG');assert.equal(elder.modelState,'ready');assert.equal(elder.placeholder.visible,false);assert.equal(actors.npcs.size,8);assert.equal(actors.root.children.length,9);assert.equal(elder.root.children.filter(c=>c.name==='npc-glb-visual').length,1);
 const time=elder.visual.mixer.time;actors.root.visible=false;actors.update(.1);assert.equal(elder.visual.mixer.time,time);actors.root.visible=true;actors.update(.1);assert(elder.visual.mixer.time>time);
 await actors.loadModels(load);assert.equal(calls,1);assert.equal(region.canWalk(2,-12.8),false);actors.dispose();assert.equal(region.canWalk(2,-12.8),true);
});
test('load failure retains a visible fallback and explicit retry succeeds without duplicate actors',async()=>{
 const {actors}=mounted(),elder=actors.npcs.get('NPC_LANG_VIET_LY_TRUONG');assert.equal(await actors.loadModels(async()=>{throw Error('HTTP 404');}),false);
 assert.equal(elder.placeholder.visible,true);assert.match(actors.modelStatuses[0].error,/404/);assert.equal(actors.modelStatuses[0].state,'error');
 assert(await actors.loadModels(asset));assert.equal(actors.modelStatuses[0].clip,'idle.001');assert.equal(elder.root.children.filter(c=>c.name==='npc-glb-visual').length,1);actors.dispose();
});
test('disposing during an in-flight load cannot resurrect an NPC or retain its GLB resources',async()=>{
 const {actors,region}=mounted();let resolve;const pending=actors.loadModels(()=>new Promise(r=>resolve=r));actors.dispose();const gltf=await asset();let freed=0;gltf.scene.traverse(o=>o.geometry?.addEventListener('dispose',()=>freed++));resolve(gltf);assert.equal(await pending,false);assert(freed>0);assert.equal(region.root.children.length,0);
});
