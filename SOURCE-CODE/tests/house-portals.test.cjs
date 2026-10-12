'use strict';
// Uses the shipped Three.js geometry engine, without a GPU or a Firebase account.
const assert=require('node:assert/strict');
const {test}=require('node:test');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const THREE=require('../../ASSETS/vendor/three.min.js');
const document={createElement:()=>({getContext:()=>({fillRect(){},strokeRect(){},fillText(){}})})};
const context={THREE,document,AbortController};context.window=context;
vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(__dirname,'../js/house-portals.js'),'utf8'),context);
const makeEntry=(id,x)=>({id,index:x,interiorId:'inside-'+id,entry:{x,y:.365,z:0,radius:.62},interiorExit:{x:0,y:.065,z:2,radius:.62},interiorSpawn:{x:0,y:.03,z:.55},exteriorSpawn:{x:x-1.65,y:.33,z:0}});
function harness(overrides={}){
  const state={authenticated:true,enabled:true,mapId:'village',houseId:null,position:new THREE.Vector3(-5,.33,0)};
  const entries=[makeEntry('nha-01',0),makeEntry('nha-02',4)],world=new THREE.Group(),interiorRoot=new THREE.Group(),calls=[],messages=[];
  let system;
  const options={THREE,document,world,interiorRoot,entries,getState:()=>state,toast:message=>messages.push(message),
    onEnter:entry=>{calls.push(['enter',entry.id]);state.mapId=entry.interiorId;state.houseId=entry.id;state.position.copy(entry.interiorSpawn);return true;},
    onExit:entry=>{calls.push(['exit',entry.id]);state.mapId='village';state.houseId=null;state.position.copy(entry.exteriorSpawn);return true;}};
  const api={state,entries,world,interiorRoot,calls,messages,options,
    dwell(seconds=.8){for(let remaining=seconds;remaining>1e-9;){const dt=Math.min(.1,remaining);system.update(dt);remaining-=dt;}},
    inside(index=0){state.position.copy(state.mapId==='village'?entries[index].entry:entries[index].interiorExit);system.update(0);},
    outside(){state.position.set(-5,.33,0);system.update(0);}
  };
  system=context.createHousePortals({...options,...(typeof overrides==='function'?overrides(api):overrides)});api.system=system;system.update(0);return api;
}

test('a continuous 0.8 second hold enters the matching house; exact boundary is inclusive',()=>{
  const h=harness();assert.equal(h.system.status.armed,true);h.inside(1);h.dwell(.79);
  assert.equal(h.calls.length,0);assert.ok(Math.abs(h.system.status.progress-.9875)<1e-8);
  h.system.update(.01);assert.deepEqual(h.calls,[['enter','nha-02']]);assert.equal(h.state.mapId,'inside-nha-02');
  assert.equal(h.system.status.blocked,true);assert.equal(h.system.status.progress,0);
  h.system.update(0);assert.equal(h.system.status.armed,true,'Safe destination outside the ring releases the latch');
  h.inside(1);h.dwell();assert.deepEqual(h.calls,[['enter','nha-02'],['exit','nha-02']]);
  assert.equal(h.state.position.x,2.35);assert.equal(h.state.mapId,'village');h.system.dispose();
});

test('crossing the ring and leaving early reset the progress; a new visit needs the complete dwell',()=>{
  const h=harness();h.inside();h.dwell(.2);h.outside();assert.equal(h.system.status.elapsed,0);
  h.inside();h.dwell(.7);assert.equal(h.calls.length,0);h.outside();h.inside();h.dwell(.7);assert.equal(h.calls.length,0);
  h.dwell(.1);assert.equal(h.calls.length,1);h.system.dispose();
});

test('spawning in a ring cannot trigger until the actor leaves; destination overlap cannot loop',()=>{
  const h=harness(api=>({onEnter:entry=>{api.calls.push(['enter',entry.id]);api.state.mapId=entry.interiorId;api.state.houseId=entry.id;api.state.position.copy(entry.interiorExit);return true;}}));
  h.system.reset();h.inside();h.dwell(2);assert.equal(h.calls.length,0);
  h.outside();h.inside();h.dwell();assert.equal(h.calls.length,1);h.system.update(0);h.dwell(2);
  assert.equal(h.calls.length,1);assert.equal(h.system.status.blocked,true);
  h.outside();h.inside();h.dwell();assert.equal(h.calls.length,2);h.system.dispose();
});

test('destination readiness delays commit while holding and leaving cancels the ready wait',()=>{
  let ready=false;const h=harness({isReady:()=>ready});h.inside();h.dwell(1.5);
  assert.equal(h.system.status.progress,1);assert.equal(h.calls.length,0);
  h.outside();ready=true;h.system.update(.1);assert.equal(h.calls.length,0);
  h.inside();h.dwell();assert.equal(h.calls.length,1);h.system.dispose();
  ready=false;const second=harness({isReady:()=>ready});second.inside();second.dwell();ready=true;second.system.update(0);
  assert.equal(second.calls.length,1);second.system.dispose();
});

test('overlapping circles keep the current portal stable and never carry progress to another house',()=>{
  const entries=[makeEntry('nha-01',0),makeEntry('nha-02',.7)];const h=harness({entries});
  h.state.position.set(.15,.33,0);h.system.update(0);h.dwell(.5);assert.equal(h.system.status.activeId,'nha-01');
  h.state.position.x=.5;h.system.update(.1);assert.equal(h.system.status.activeId,'nha-01','Closer neighbor must not steal a current hold');
  h.state.position.x=.9;h.system.update(.1);assert.equal(h.system.status.activeId,'nha-02');assert.equal(h.system.status.elapsed,0);
  h.dwell(.7);assert.equal(h.calls.length,0);h.dwell(.1);assert.deepEqual(h.calls,[['enter','nha-02']]);h.system.dispose();
});

test('exit activation requires both the map ID and the original house ID',()=>{
  const h=harness();h.state.mapId='inside-nha-01';h.state.houseId='nha-02';h.state.position.set(0,.03,2);
  h.system.update(0);h.dwell(2);assert.equal(h.calls.length,0);assert.equal(h.interiorRoot.children[0].visible,false);
  h.state.houseId='nha-01';h.system.update(0);h.dwell(1);assert.equal(h.calls.length,0,'A map identity change disarms a currently occupied ring');
  h.outside();h.inside();h.dwell();assert.deepEqual(h.calls,[['exit','nha-01']]);h.system.dispose();
});

test('failed preparation and failed transitions preserve source state, report once and require leaving',()=>{
  for(const overrides of [{isReady:()=>{throw new Error('Không có sàn hợp lệ');}},{onEnter:()=>false},{onEnter:()=>{throw new Error('Không thể tải nội thất');}}]){
    const h=harness(overrides);h.inside();h.dwell();assert.equal(h.messages.length,1);assert.match(h.messages[0],/Không thể vào nhà/);
    assert.equal(h.state.mapId,'village');assert.equal(h.state.position.x,0);assert.equal(h.system.status.blocked,true);
    h.dwell(2);assert.equal(h.messages.length,1);h.outside();h.inside();h.dwell();assert.equal(h.messages.length,2);h.system.dispose();
  }
});

test('pending async transitions cancel on leave, logout, disabled controls, reset or disposal',async()=>{
  for(const cancel of ['leave','logout','disabled','reset','dispose','map']){
    let resolve,transitionContext,commits=0;
    const h=harness(api=>({onEnter:(entry,guard)=>{transitionContext=guard;return new Promise(done=>{resolve=()=>{if(guard.isCurrent()){commits++;api.state.mapId=entry.interiorId;done(true);}else done(false);};});}}));
    h.inside();h.dwell();assert.equal(h.system.status.pending,true);assert.equal(transitionContext.isCurrent(),true);
    if(cancel==='leave')h.outside();
    if(cancel==='logout')h.state.authenticated=false;
    if(cancel==='disabled')h.state.enabled=false;
    if(cancel==='reset')h.system.reset();
    if(cancel==='dispose')h.system.dispose();
    if(cancel==='map')h.state.mapId='other-map';
    h.system.update(0);assert.equal(transitionContext.isCurrent(),false);assert.equal(transitionContext.signal.aborted,true);
    resolve();await Promise.resolve();await Promise.resolve();assert.equal(commits,0);assert.equal(h.messages.length,0);assert.equal(h.system.status.pending,false);h.system.dispose();
  }
});

test('async success changes maps once; async failure reports only for the current attempt',async()=>{
  let resolve,reject;const h=harness(api=>({onEnter:(entry,guard)=>new Promise((yes,no)=>{reject=no;resolve=()=>{if(guard.isCurrent()){api.state.mapId=entry.interiorId;api.state.houseId=entry.id;api.state.position.copy(entry.interiorSpawn);api.calls.push(entry.id);yes(true);}else yes(false);};})}));
  h.inside();h.dwell();h.dwell(2);assert.equal(h.calls.length,0);resolve();await new Promise(setImmediate);assert.deepEqual(h.calls,['nha-01']);assert.equal(h.system.status.pending,false);
  h.state.mapId='village';h.state.houseId=null;h.outside();h.inside();h.dwell();reject(new Error('Lỗi mạng'));await new Promise(setImmediate);
  assert.match(h.messages[0],/Lỗi mạng/);assert.equal(h.state.mapId,'village');h.system.dispose();
});

test('invalid time steps, auth loss and hidden controls do not count as continuous presence',()=>{
  for(const gap of [NaN,Infinity,-1,3]){
    const h=harness();h.inside();h.dwell(.7);h.system.update(gap);h.dwell();assert.equal(h.calls.length,0);assert.equal(h.system.status.progress,0);h.system.dispose();
  }
  const h=harness();h.inside();h.dwell(.7);h.state.enabled=false;h.system.update(.1);h.state.enabled=true;h.dwell();assert.equal(h.calls.length,0);
  h.outside();h.inside();h.dwell(.7);h.state.authenticated=false;h.system.update(.1);h.state.authenticated=true;h.dwell();assert.equal(h.calls.length,0);h.system.dispose();
});

test('root reset during an atomic map callback is supported without stale pending state',()=>{
  let system;const h=harness(api=>({onEnter:entry=>{system.reset();api.state.mapId=entry.interiorId;api.state.houseId=entry.id;api.state.position.copy(entry.interiorSpawn);return true;}}));
  system=h.system;h.inside();h.dwell();assert.equal(h.messages.length,0);assert.equal(system.status.pending,false);assert.equal(system.status.blocked,true);assert.equal(h.state.mapId,'inside-nha-01');h.system.dispose();
});

test('geometry provides a flat real 3D ring, shared resources and an existing progress arc',()=>{
  const h=harness(),first=h.world.children[0],second=h.world.children[1];
  assert.equal(first.children[0].children.length,6,'Decorative segments are one batched mesh');
  assert.equal(first.children[0].children[0].geometry,second.children[0].children[0].geometry);
  assert.equal(first.children[0].children[0].material,second.children[0].children[0].material);
  const icon=first.getObjectByName('portal-icon').children[0];icon.geometry.computeBoundingBox();assert.ok(icon.geometry.boundingBox.max.z-icon.geometry.boundingBox.min.z>.05,'Icon is extruded, not a photograph');
  first.updateMatrixWorld(true);const normal=new THREE.Vector3(0,0,1).transformDirection(first.children[0].children[3].matrixWorld);assert.ok(normal.y>.999);
  const arc=first.getObjectByName('portal-progress').geometry,geometries=new Set(),materials=new Set(),textures=new Set();
  for(const parent of [h.world,h.interiorRoot])parent.traverse(object=>{assert.notEqual(object.type,'PointLight');if(object.geometry&&!object.isSprite)geometries.add(object.geometry);if(object.material)materials.add(object.material);if(object.material?.map)textures.add(object.material.map);});
  assert.equal(textures.size,2,'Only the two small text labels use textures');
  h.inside();h.dwell(.4);assert.equal(arc.drawRange.count,288);assert.equal(first.getObjectByName('portal-progress').geometry,arc);
  h.outside();assert.equal(arc.drawRange.count,0);const count=h.world.children.length;
  for(let i=0;i<600;i++)h.system.update(1/60);assert.equal(h.world.children.length,count);
  const disposed=new Map();for(const value of [...geometries,...materials,...textures])value.addEventListener('dispose',()=>disposed.set(value,(disposed.get(value)||0)+1));
  const sentinel=new THREE.Group();h.world.add(sentinel);h.system.dispose();h.system.dispose();assert.deepEqual(h.world.children,[sentinel]);assert.equal(h.interiorRoot.children.length,0);
  for(const value of [...geometries,...materials,...textures])assert.equal(disposed.get(value),1,'Shared resource disposed once');
});

test('invalid entries fail before allocating any scene objects',()=>{
  const world=new THREE.Group(),interiorRoot=new THREE.Group();
  for(const entries of [[makeEntry('same',0),makeEntry('same',2)],[{...makeEntry('bad',0),entry:{x:0,y:0,z:0,radius:0}}]]){
    assert.throws(()=>context.createHousePortals({THREE,document,world,interiorRoot,entries,getState:()=>({}),onEnter(){},onExit(){}}));
    assert.equal(world.children.length,0);assert.equal(interiorRoot.children.length,0);
  }
});
