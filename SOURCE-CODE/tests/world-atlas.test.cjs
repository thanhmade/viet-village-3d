'use strict';
// Uses the real atlas controller/data with a local DOM double. Browser layout,
// touch gestures and rendering are verified separately in the actual game.
const assert=require('node:assert/strict');
const {test}=require('node:test');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..');
const packageRoot=path.join(root,'MAP/regions/viet-nam-map-toan-quoc-nguon-2025/source-package');
const mapData=JSON.parse(fs.readFileSync(path.join(packageRoot,'data/map-data.json'),'utf8'));
const indexPath=path.join(root,'SOURCE-CODE/index.html');
function exactFile(file){
  const relative=path.relative(root,file);
  assert.ok(relative&&!path.isAbsolute(relative)&&relative!=='..'&&!relative.startsWith('..'+path.sep),'Resource remains in the project');
  let cursor=root;
  for(const segment of relative.split(path.sep)){assert.ok(fs.readdirSync(cursor).includes(segment),'Missing or incorrectly cased file: '+relative);cursor=path.join(cursor,segment);}
  assert.ok(fs.statSync(file).isFile(),'Expected file: '+relative);return file;
}
function runtimeFile(base,reference){
  assert.ok(!/^(?:[a-z][a-z\d+.-]*:|\/\/|\/|\\)/i.test(reference),'Atlas resources must remain local: '+reference);
  return exactFile(path.resolve(path.dirname(base),decodeURIComponent(reference.split(/[?#]/)[0])));
}
function attribute(source,name){return new RegExp('(?:^|\\s)'+name+'\\s*=\\s*(["\'])(.*?)\\1','i').exec(source)?.[2];}

test('the imported atlas package retains all 25 original manifest files byte for byte',()=>{
  const manifest=JSON.parse(fs.readFileSync(path.join(packageRoot,'MANIFEST.json'),'utf8'));
  assert.equal(Object.keys(manifest).length,25);
  for(const [relative,entry] of Object.entries(manifest)){
    const file=exactFile(path.resolve(packageRoot,relative)),bytes=fs.readFileSync(file);
    assert.equal(bytes.length,entry.bytes,relative+' byte size');
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),entry.sha256,relative+' SHA-256');
  }
  assert.equal(mapData.sites.length,14);assert.equal(mapData.provinces.length,34);
  assert.equal(mapData.local_hubs.length,2);assert.ok(mapData.local_hubs.every(hub=>hub.geographic_anchor===null),'Fictional game hubs receive no invented geographic coordinates');
});

function catalog(){
  const scope={};scope.window=scope;vm.runInNewContext(fs.readFileSync(path.join(root,'MAP/atlas-destinations.js'),'utf8'),scope);return scope.VietVillageAtlasCatalog;
}

function fixture(options={}){
  let document,clock=0,nextTimer=0,bridgeCallbacks=null,disposedBridges=0,pauses=0,srcWrites=0;
  const timers=new Map(),sceneEvents=[],calls=[],accessCalls=[],state={authenticated:options.authenticated!==false,ready:options.ready!==false,travelAllowed:true,currentId:'lang-viet'};
  class Element{
    constructor(id){this.id=id;this.listeners=new Map();this.children=[];this.parent=null;this.attrs=new Map();this.style={};this.hidden=false;this.inert=false;this.disabled=false;this.textContent='';this.open=false;}
    append(child){child.parent=this;this.children.push(child);return child;}
    addEventListener(type,fn){if(!this.listeners.has(type))this.listeners.set(type,[]);this.listeners.get(type).push(fn);}
    setAttribute(key,value){this.attrs.set(key,String(value));}
    getAttribute(key){return this.attrs.get(key);}
    focus(){document.activeElement=this;}
    showModal(){this.open=true;}
    close(){this.open=false;emit(this,'close');}
  }
  const ids=['worldAtlas','worldAtlasBtn','worldAtlasFrame','atlasTravelBtn','atlasSelectionName','atlasSelectionStatus','atlasLoading','atlasLoadStatus','atlasRetryBtn','closeWorldAtlas','toolsPanel','toolsToggle'];
  const nodes=Object.fromEntries(ids.map(id=>[id,new Element(id)])),dialog=nodes.worldAtlas;
  for(const id of ids.filter(id=>!['worldAtlas','worldAtlasBtn','toolsPanel','toolsToggle'].includes(id)))dialog.append(nodes[id]);
  dialog.inert=true;nodes.atlasTravelBtn.disabled=true;
  nodes.worldAtlasFrame.contentWindow={location:{href:'about:blank'}};
  Object.defineProperty(nodes.worldAtlasFrame,'src',{get(){return this.source||'';},set(value){srcWrites++;this.source=value;}});
  document={baseURI:'http://localhost:8001/SOURCE-CODE/index.html',activeElement:null,getElementById:id=>nodes[id]};
  function emit(target,type,details={}){
    const event={target,type,stopped:false,defaultPrevented:false,stopPropagation(){this.stopped=true;},preventDefault(){this.defaultPrevented=true;},...details};
    for(let element=target;element;element=element.parent){for(const listener of element.listeners.get(type)||[])listener(event);if(event.stopped)break;}
    if(!event.stopped)sceneEvents.push(type);return event;
  }
  const regions={destinations:[{id:'lang-viet',spawnIds:['village-entry']},{id:'lang-tan-thu',spawnIds:['village-entry']},{id:'ngoai-lang-dong-tre',spawnIds:['village-entry']}],
    canTravelTo(id,spawnId){return state.travelAllowed&&regions.destinations.some(entry=>entry.id===id&&entry.spawnIds.includes(spawnId));},
    checkTravelAccess(id,spawnId,settings={}){accessCalls.push({id,spawnId,loadDestination:settings.loadDestination});if(options.access)return options.access(id,spawnId,settings);const ok=state.travelAllowed&&regions.destinations.some(entry=>entry.id===id&&entry.spawnIds.includes(spawnId));return {ok,code:ok?'region/ready':'region/denied',message:ok?'Sẵn sàng · Cấp 1 · Miễn phí.':'Điều kiện di chuyển chưa đạt.',ready:ok,requirements:{minimumLevel:1,fee:0,mode:'testing'}};},
    travelTo(id,spawnId){calls.push([id,spawnId]);if(options.travel) return options.travel(id,spawnId);state.currentId=id;return {ok:true};}};
  let activeRegions=regions;
  const scope={document,URL,setTimeout(fn,delay){const id=++nextTimer;timers.set(id,{fn,at:clock+delay});return id;},clearTimeout:id=>timers.delete(id)};scope.window=scope;
  vm.runInNewContext(fs.readFileSync(path.join(root,'SOURCE-CODE/js/world-atlas.js'),'utf8'),scope);
  const data=catalog();const controller=scope.createVillageAtlas({document,catalog:data,isAuthenticated:()=>state.authenticated,isReady:()=>state.ready,getRegions:()=>activeRegions,pause:()=>{pauses++;},
    connectViewer(viewer,callbacks){if(options.connect)options.connect(viewer);bridgeCallbacks=callbacks;return {dispose(){disposedBridges++;}};}});
  return {controller,nodes,state,regions,calls,accessCalls,sceneEvents,emit,catalog:data,
    select(selection){assert.ok(bridgeCallbacks,'Atlas bridge must be loaded before selection');bridgeCallbacks.onSelect(selection);},
    loaded(href=nodes.worldAtlasFrame.src){nodes.worldAtlasFrame.contentWindow={location:{href}};emit(nodes.worldAtlasFrame,'load');},
    loadFailure(){nodes.worldAtlasFrame.contentWindow={get location(){throw new Error('Cross-origin location denied');}};emit(nodes.worldAtlasFrame,'load');},
    clock(ms){clock+=ms;for(const [id,timer] of [...timers])if(timer.at<=clock){timers.delete(id);timer.fn();}},
    setRegions(value){activeRegions=value;},
    viewerClose(){bridgeCallbacks.onClose();},
    get activeElement(){return document.activeElement;},get pauses(){return pauses;},get srcWrites(){return srcWrites;},get disposedBridges(){return disposedBridges;}};
}

test('catalog covers all 14 historical sites and links only the three registered playable local areas',()=>{
  const data=catalog();assert.equal(data.kind,'region-selector');
  const expected=[...mapData.sites.map(site=>site.id),'lang_viet','lang_tan_thu','dong_tre'].sort();
  assert.deepEqual(Object.keys(data.links).sort(),expected);
  assert.deepEqual(Object.entries(data.links).filter(([,value])=>value.mapId).map(([id])=>id).sort(),['dong_tre','lang_tan_thu','lang_viet']);
  assert.equal(data.links.lang_viet.mapId,'lang-viet');assert.equal(data.links.lang_tan_thu.mapId,'lang-tan-thu');assert.equal(data.links.dong_tre.mapId,'ngoai-lang-dong-tre');
  for(const [id,entry] of Object.entries(data.links)){
    assert.ok(Object.isFrozen(entry));
    if(['lang_viet','lang_tan_thu','dong_tre'].includes(id))assert.equal(entry.spawnId,'village-entry');
    else {assert.equal(entry.mapId,null,id+' is not a playable scene');assert.equal(entry.spawnId,null);}
  }
  assert.ok(Object.isFrozen(data)&&Object.isFrozen(data.links));runtimeFile(indexPath,data.viewerPath);
});

test('authentication and initialized-game gates prevent opening or fetching the atlas prematurely',()=>{
  const f=fixture({authenticated:false});assert.equal(f.controller.open(),false);assert.equal(f.srcWrites,0);assert.equal(f.pauses,0);
  f.state.authenticated=true;f.state.ready=false;assert.equal(f.controller.open(),false);assert.equal(f.srcWrites,0);
  f.state.ready=true;assert.equal(f.controller.open(),true);assert.equal(f.controller.open(),false);assert.equal(f.srcWrites,1);assert.equal(f.pauses,1);
  assert.equal(f.nodes.worldAtlas.open,true);assert.equal(f.nodes.worldAtlas.inert,false);assert.equal(f.nodes.worldAtlasBtn.getAttribute('aria-expanded'),'true');
  assert.equal(f.activeElement,f.nodes.closeWorldAtlas);assert.equal(f.nodes.atlasTravelBtn.disabled,true);assert.equal(f.nodes.worldAtlasFrame.style.visibility,'hidden');
});

test('historical sites, provinces and unknown IDs remain closed despite attempted direct activation',()=>{
  const f=fixture();f.controller.open();f.loaded();
  for(const item of [...mapData.sites.map(site=>({kind:'site',id:site.id,name:site.name})),{kind:'province',id:'lang_viet',name:'Province selection'},{kind:'hub',id:'__proto__',name:'Unknown'}]){
    f.select(item);assert.equal(f.nodes.atlasTravelBtn.disabled,true,item.id);assert.match(f.nodes.atlasSelectionStatus.textContent,/Chưa mở/);f.emit(f.nodes.atlasTravelBtn,'click');
  }
  assert.equal(f.calls.length,0);assert.equal(f.state.currentId,'lang-viet');assert.equal(f.controller.isOpen(),true);
});

test('a village selection waits for explicit activation, then forwards only its allowlisted map and spawn',()=>{
  for(const [hub,mapId] of [['lang_tan_thu','lang-tan-thu'],['lang_viet','lang-viet'],['dong_tre','ngoai-lang-dong-tre']]){
    const f=fixture();f.controller.open();f.loaded();f.select({kind:'hub',id:hub,name:'Selected village',mapId:'untrusted-other-map',spawnId:'arbitrary'});
    assert.equal(f.calls.length,0);assert.equal(f.nodes.atlasTravelBtn.disabled,false);assert.equal(f.nodes.atlasSelectionName.textContent,'Selected village');
    f.emit(f.nodes.atlasTravelBtn,'click');assert.deepEqual(f.calls,[[mapId,'village-entry']]);assert.equal(f.state.currentId,mapId);assert.equal(f.controller.isOpen(),false);assert.equal(f.nodes.worldAtlas.open,false);assert.equal(f.nodes.worldAtlas.inert,true);assert.equal(f.pauses,2);
    f.emit(f.nodes.atlasTravelBtn,'click');assert.equal(f.calls.length,1,'Closed dialog cannot perform a second transition');
  }
});

test('runtime registration, spawn existence and travel permission are checked again at activation',()=>{
  for(const disable of ['missing-manager','missing-region','missing-spawn','permission','logout']){
    const f=fixture();f.controller.open();f.loaded();f.select({kind:'hub',id:'lang_tan_thu',name:'Làng Tân Thủ'});assert.equal(f.nodes.atlasTravelBtn.disabled,false);
    if(disable==='missing-manager')f.setRegions(null);
    if(disable==='missing-region')f.regions.destinations=[];
    if(disable==='missing-spawn')f.regions.destinations[1].spawnIds=[];
    if(disable==='permission')f.state.travelAllowed=false;
    if(disable==='logout')f.state.authenticated=false;
    f.emit(f.nodes.atlasTravelBtn,'click');assert.equal(f.calls.length,0,disable);assert.equal(f.state.currentId,'lang-viet');
  }
});

test('the atlas uses the common access check, loads the real destination for readiness and shows its precise denial reason',()=>{
  for(const [code,message] of [
    ['region/character-dead','Nhân vật cần sống để đi tiếp.'],
    ['region/minimum-level','Cần đạt cấp 1.'],
    ['region/tutorial-required','Hãy luyện di chuyển và dùng kỹ năng trước.'],
    ['region/transitioning','Đang chuyển khu vực, hãy chờ.'],
    ['region/load-failed','Không dựng được cảnh đích.']
  ]){
    const f=fixture({access:()=>({ok:false,code,message,ready:false,requirements:{minimumLevel:1,fee:0,mode:'gameplay'}})});
    f.regions.canTravelTo=()=>true;
    f.controller.open();f.loaded();f.select({kind:'hub',id:'dong_tre',name:'Đồng Tre'});
    assert.equal(f.nodes.atlasTravelBtn.disabled,true);assert.ok(f.nodes.atlasSelectionStatus.textContent.includes(message),code);
    f.emit(f.nodes.atlasTravelBtn,'click');assert.equal(f.calls.length,0);assert.equal(f.controller.isOpen(),true);
    assert.ok(f.accessCalls.length>=2);assert.ok(f.accessCalls.every(call=>call.id==='ngoai-lang-dong-tre'&&call.spawnId==='village-entry'&&call.loadDestination===true));
  }
});

test('the atlas rechecks common character eligibility before committing and does not rely on an earlier ready result',()=>{
  let alive=true;
  const f=fixture({access:()=>({ok:alive,code:alive?'region/ready':'region/character-dead',message:alive?'Sẵn sàng · Cấp 1 · Miễn phí.':'Nhân vật đã ngừng hoạt động.',ready:alive,requirements:{minimumLevel:1,fee:0,mode:'testing'}})});
  f.controller.open();f.loaded();f.select({kind:'hub',id:'lang_tan_thu',name:'Làng Tân Thủ'});
  assert.equal(f.nodes.atlasTravelBtn.disabled,false);assert.equal(f.calls.length,0);
  alive=false;f.emit(f.nodes.atlasTravelBtn,'click');
  assert.equal(f.calls.length,0);assert.equal(f.state.currentId,'lang-viet');assert.equal(f.nodes.atlasTravelBtn.disabled,true);
  assert.match(f.nodes.atlasSelectionStatus.textContent,/Nhân vật đã ngừng hoạt động/);
  alive=true;f.select({kind:'hub',id:'lang_tan_thu',name:'Làng Tân Thủ'});f.emit(f.nodes.atlasTravelBtn,'click');
  assert.deepEqual(f.calls,[['lang-tan-thu','village-entry']]);assert.equal(f.controller.isOpen(),false);
});

test('actual atlas and shared picker use the same gameplay requirements and move only after both tutorials',()=>{
  const {run,context}=require('./harness.cjs')();run("$('play').onclick();");
  context.VietVillageRegionAccess={...context.VietVillageRegionAccess,mode:'gameplay'};
  const f=fixture();f.setRegions(context.VietVillageRegions);f.controller.open();f.loaded();
  const selection={kind:'hub',id:'dong_tre',name:'Ngoại ô Làng Việt – Đồng Tre'};
  f.select(selection);assert(f.nodes.atlasTravelBtn.disabled);
  const reason=f.nodes.atlasSelectionStatus.textContent;assert.match(reason,/di chuyển.*kỹ năng/);
  run('player.position.set(0,.3,16.5);regionTravel.update(0);player.position.set(0,.3,20);regionTravel.update(0);');
  assert.equal(run("$('regionDestinationChoices').children[0].children[1].textContent"),reason);
  assert(run("$('regionDestinationChoices').children[0].children[0].disabled"));
  assert.equal(context.VietVillageRegions.interact(),false);
  f.emit(f.nodes.atlasTravelBtn,'click');assert.equal(context.VietVillageRegions.currentId,'lang-viet');
  run('regionTravel.closeMenu();player.position.set(0,.3,16);yaw=0;keys.KeyW=true;for(let i=0;i<30;i++)tick((last||0)+40);keys.KeyW=false;');
  f.select(selection);assert.match(f.nodes.atlasSelectionStatus.textContent,/hướng dẫn sử dụng kỹ năng/);
  assert(context.VietVillageWeapons.equip('sword'));assert(context.VietVillageWeapons.cast(1).ok);
  f.select(selection);assert.equal(f.nodes.atlasTravelBtn.disabled,false);assert.match(f.nodes.atlasSelectionStatus.textContent,/Cấp tối thiểu: 1.*Phí: 0/);
  f.emit(f.nodes.atlasTravelBtn,'click');assert.equal(context.VietVillageRegions.currentId,'ngoai-lang-dong-tre');
  assert.equal(f.controller.isOpen(),false);assert.equal(context.VietVillageWeapons.state.weaponId,'sword');
});

test('failed map preparation keeps the atlas open, reports the error and retains the source map',()=>{
  for(const travel of [()=>({ok:false,message:'Điểm xuất hiện không hợp lệ'}),()=>{throw new Error('Không tải được cảnh');}]){
    const f=fixture({travel});f.controller.open();f.loaded();f.select({kind:'hub',id:'lang_tan_thu',name:'Làng Tân Thủ'});f.emit(f.nodes.atlasTravelBtn,'click');
    assert.equal(f.controller.isOpen(),true);assert.equal(f.state.currentId,'lang-viet');assert.match(f.nodes.atlasSelectionStatus.textContent,/Không thể đến khu vực.*MAP hiện tại/);assert.equal(f.calls.length,1);
  }
});

test('viewer timeout, wrong URL, access denial, network error and bridge failure allow retry without moving the player',()=>{
  for(const mode of ['timeout','wrong-url','access-denied','network','bridge']){
    let broken=mode==='bridge';const f=fixture({connect:()=>{if(broken)throw new Error('Unsupported atlas format');}});f.controller.open();
    if(mode==='timeout')f.clock(20000);
    if(mode==='wrong-url')f.loaded('http://localhost:8001/wrong.html');
    if(mode==='access-denied')f.loadFailure();
    if(mode==='network')f.emit(f.nodes.worldAtlasFrame,'error');
    if(mode==='bridge')f.loaded();
    assert.equal(f.nodes.atlasRetryBtn.hidden,false,mode);assert.equal(f.nodes.atlasTravelBtn.disabled,true);assert.equal(f.nodes.worldAtlasFrame.style.visibility,'hidden');assert.match(f.nodes.atlasLoadStatus.textContent,/Không tải được/);assert.equal(f.state.currentId,'lang-viet');
    broken=false;f.emit(f.nodes.atlasRetryBtn,'click');assert.equal(f.srcWrites,2);f.loaded();assert.equal(f.nodes.atlasLoading.hidden,true);assert.equal(f.nodes.atlasRetryBtn.hidden,true);
    f.select({kind:'hub',id:'lang_tan_thu',name:'Làng Tân Thủ'});assert.equal(f.nodes.atlasTravelBtn.disabled,false);assert.equal(f.calls.length,0);
  }
});

test('closing, Escape and native cancellation restore focus correctly; reopening reuses a loaded viewer',()=>{
  const f=fixture();f.controller.open();f.loaded();const escape=f.emit(f.nodes.worldAtlas,'keydown',{key:'Escape'});
  assert.equal(escape.defaultPrevented,true);assert.equal(escape.stopped,true);assert.equal(f.controller.isOpen(),false);assert.equal(f.activeElement,f.nodes.worldAtlasBtn);
  f.nodes.toolsPanel.hidden=true;f.controller.open();assert.equal(f.srcWrites,1);f.viewerClose();assert.equal(f.activeElement,f.nodes.toolsToggle);
  f.controller.open();const cancel=f.emit(f.nodes.worldAtlas,'cancel');assert.equal(cancel.defaultPrevented,true);assert.equal(f.controller.isOpen(),false);
  f.controller.open();f.state.authenticated=false;const oldFocus=f.activeElement;f.controller.close({restoreFocus:false});assert.equal(f.activeElement,oldFocus);assert.equal(f.nodes.worldAtlasBtn.getAttribute('aria-expanded'),'false');
});

test('dialog keyboard, mouse, wheel and touch events stay out of scene controls',()=>{
  const f=fixture();f.controller.open();f.loaded();f.sceneEvents.length=0;
  for(const type of ['pointerdown','pointermove','pointerup','pointercancel','click','wheel','touchstart','touchmove','touchend','keydown']){
    const event=f.emit(f.nodes.atlasSelectionName,type,{key:'w'});assert.equal(event.stopped,true,type);
  }
  assert.deepEqual(f.sceneEvents,[]);assert.equal(f.controller.isOpen(),true);assert.equal(f.calls.length,0);
});

test('opening the actual game atlas clears input and VFX, freezes the 3D loop and retains scene state and online ticks',()=>{
  const {run,context}=require('./harness.cjs')();context.URL=URL;context.document.baseURI='http://localhost:8001/SOURCE-CODE/index.html';
  for(const id of ['worldAtlas','worldAtlasBtn','closeWorldAtlas','toolsToggle']){
    const element=context.document.getElementById(id);element.setAttribute=()=>{};element.focus=()=>{};
  }
  const dialog=context.document.getElementById('worldAtlas');dialog.showModal=()=>{dialog.open=true;};dialog.close=()=>{dialog.open=false;};
  run("$('play').onclick();VietVillageWeapons.equip('staff');VietVillageWeapons.cast(1);player.userData.inventory=['book'];progress.score=451;climate.clock='manual';climate.hour=21;climate.weather='rain';let atlasPlayer=player,atlasScene=scene,atlasCamera=camera,atlasPosition=player.position.clone(),atlasYaw=yaw,atlasPitch=pitch,atlasRegion=regionTravel.currentId;let atlasRenders=0,atlasOnlineTicks=0;renderer.render=()=>atlasRenders++;window.VietVillageOnline={tick:()=>atlasOnlineTicks++};keys.KeyW=true;joystick.x=1;target=new THREE.Vector3(0,.3,10);");
  assert.equal(context.VietVillageAtlas.open(),true);assert(run('overlays()'));assert(run('!keys.KeyW&&joystick.x===0&&joystick.y===0&&target===null'));assert.equal(context.VietVillageWeapons.state.active,0);
  run("keys.KeyW=true;joystick.x=1;tick(1000);tick(1100);tapMove(400,400);clearMotion();$('stick').onpointerdown({pointerId:3,clientX:90,clientY:45});");
  assert(run('player===atlasPlayer&&scene===atlasScene&&camera===atlasCamera&&player.position.equals(atlasPosition)&&regionTravel.currentId===atlasRegion&&yaw===atlasYaw&&pitch===atlasPitch'));
  assert(run("progress.score===451&&player.userData.inventory.join(',')==='book'&&climate.hour===21&&climate.weather==='rain'"));
  assert.equal(run('atlasRenders'),0);assert.equal(run('atlasOnlineTicks'),2);assert(run('target===null&&joystick.x===0&&joystick.y===0'));assert.equal(context.VietVillageWeapons.state.weaponId,'staff');
  context.VietVillageAtlas.close();assert(!run('overlays()'));run('keys.KeyW=true;tick(1140);keys.KeyW=false;');
  assert(run('player.position.distanceTo(atlasPosition)>0'),'Existing movement resumes after closing');assert.equal(run('atlasRenders'),1);
});

test('canonical game scripts, styles and image references resolve with their exact filename case',()=>{
  const html=fs.readFileSync(indexPath,'utf8'),scripts=[];let cssCount=0;
  for(const match of html.matchAll(/<(script|link|img)\b([^>]*)>/gi)){
    const tag=match[1].toLowerCase(),attrs=match[2];
    if(tag==='link'&&attribute(attrs,'rel')!=='stylesheet')continue;
    const reference=attribute(attrs,tag==='link'?'href':'src');if(!reference)continue;
    const file=runtimeFile(indexPath,reference);
    if(tag==='script')scripts.push(path.relative(root,file).split(path.sep).join('/'));
    if(tag==='link'){
      cssCount++;const css=fs.readFileSync(file,'utf8');
      for(const url of css.matchAll(/url\(\s*["']?([^\s)"']+)["']?\s*\)/gi))if(!url[1].startsWith('data:'))runtimeFile(file,url[1]);
      for(const imported of css.matchAll(/@import\s+["']([^"']+)["']/gi))runtimeFile(file,imported[1]);
    }
  }
  assert.ok(cssCount>=6);assert.equal(new Set(scripts).size,scripts.length,'Each script loads once');
  const loadOrder=JSON.parse(fs.readFileSync(path.join(root,'SOURCE-CODE/load-order.json'),'utf8'));
  assert.deepEqual(scripts.slice(0,loadOrder.length),loadOrder,'Shared harness and browser use the same classic-script ordering');
});
