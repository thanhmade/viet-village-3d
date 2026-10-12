'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const createHarness=require('./harness.cjs'),root=path.resolve(__dirname,'../..');
const load=name=>JSON.parse(fs.readFileSync(path.join(root,'MAP/regions/lang-viet',name+'.json'),'utf8'));
async function game(){
 const h=createHarness();h.context.VietVillageAuth.getProfile=()=>({uid:'npc-test-one'});
 h.context.fetch=async url=>({ok:true,json:async()=>load(/([^/]+)\.json/.exec(url)[1])});
 h.run("$('play').onclick()");assert(await h.context.VietVillageNPCs.load());return h;
}
function stand(h,x,z,yaw=0){h.run(`player.position.set(${x},bridgeHeight(${x},${z}),${z});body.rotation.y=${yaw};VietVillageNPCs.update(.11);`);}

test('runtime data reuses design IDs but measured world coordinates, with only peaceful NPCs and one dummy',()=>{
 const g=load('gameplay'),d=load('dialogues'),q=load('quests');
 const design=JSON.parse(fs.readFileSync(path.join(root,'MAP/regions/lang-viet/LANG_VIET_NPC_PORTAL_DE_XUAT/DESIGN/LANG_VIET_NPC_PORTAL_DESIGN.json'),'utf8'));
 assert.equal(g.mapId,'lang-viet');assert.equal(g.npcs.length,8);assert.equal(g.props.length,1);assert.deepEqual(g.hostileSpawns,[]);assert.equal(g.npcCombatEnabled,false);
 for(const npc of g.npcs){assert(design.npcs.some(n=>n.id===npc.id));assert(d.dialogues[npc.dialogueId]);assert.notDeepEqual([npc.position.x,npc.position.z],design.npcs.find(n=>n.id===npc.id).schematic);}
 assert(q.quests.filter(q=>q.enabled).every(q=>design.quests.some(old=>q.id===old.id)));
 assert.equal(q.rewardsEnabled,false);assert(g.npcs.find(n=>n.role==='trainer').position.x>6.45);
});

test('porch height matches rendered temple meshes and only its front steps are opened',()=>{
 const h=createHarness();
 h.run(`world.updateMatrixWorld(true);var npcFloorRay=new THREE.Raycaster();var npcFloorMeshes=[];world.traverse(o=>{if(o.isMesh)npcFloorMeshes.push(o);});`);
 for(const [x,z] of [[1.25,-16.55],[1.25,-15.7],[1.25,-15.3],[1.25,-14.5]]){
  const delta=h.run(`npcFloorRay.set(new THREE.Vector3(${x},langVietGroundHeight(${x},${z})+.04,${z}),new THREE.Vector3(0,-1,0));var hit=npcFloorRay.intersectObjects(npcFloorMeshes,false)[0];Math.abs(hit.point.y-langVietGroundHeight(${x},${z}))`);
  assert(delta<.002,'Ground must match actual box top at '+z);assert(h.run(`langVietCanWalk(${x},${z})`));
 }
 for(const [x,z] of [[0,-19],[4,-18],[0,-16.3],[2.5,-16.3],[4.9,-16.3]])assert(!h.run(`langVietCanWalk(${x},${z})`));
});

test('elder courtyard anchor matches the actual paving, clears temple steps and has a walkable approach',()=>{
 const h=createHarness(),elder=load('gameplay').npcs.find(n=>n.role==='elder');
 assert.equal(elder.position.x,2);assert(elder.position.z>-14.2,'Outside the last temple step');
 const floor=h.run(`(()=>{world.updateMatrixWorld(true);const meshes=[];world.traverse(o=>{if(o.isMesh)meshes.push(o);});const ray=new THREE.Raycaster(new THREE.Vector3(2,.35,-12.8),new THREE.Vector3(0,-1,0));return ray.intersectObjects(meshes,false)[0].point.y;})()`);
 assert(Math.abs(floor-elder.position.y)<.001);assert(h.run('findPath({x:0,z:16.5},{x:2,z:-10.9}).length>0'));
});

test('placement has reachable approaches, solid NPC/dummy collision and does not obstruct portals or house entries',async()=>{
 const h=await game(),g=load('gameplay');
 for(const n of [...g.npcs,...g.props]){
  assert(!h.run(`canWalk(${n.position.x},${n.position.z})`));
  assert(h.run(`findPath({x:0,z:16.5},${JSON.stringify(n.approach)}).length>0`));
  assert(h.run(`canWalk(${n.approach.x},${n.approach.z})`));
 }
 assert(h.run(`regionTravel.current.root.getObjectByName('lang-viet-npcs').children.length===9`));
 assert(h.run(`regionTravel.current.root.getObjectByName('NPC_LANG_VIET_LY_TRUONG').position.y===.31`));
 assert(h.run(`regionTravel.current.manualPortals.every(p=>canWalk(p.x,p.z))&&canWalk(0,20)`));
 assert(h.run(`village.houses.every(h=>canWalk(h.x,h.z+4.4))`));
});

test('F/touch dialogue is proximity gated, pauses movement/skills, and quest hand-in is explicit and one-time',async()=>{
 const h=await game(),n=h.context.VietVillageNPCs;
 assert.equal(n.interact('NPC_LANG_VIET_LY_TRUONG'),false);
 stand(h,7.6,21.6);assert(n.interact('NPC_LANG_VIET_TUAN_DINH'));assert(h.run('overlays()&&!target'));
 h.run(`$('npcQuests').children[0].children.find(b=>b.id==='accept-QUEST_LV_01').onclick()`);
 assert.equal(n.status.quests.QUEST_LV_01,'active');h.run("$('closeNpcDialog').onclick?.()");
 // Static elements use addEventListener; open/close via lock releases the real controller state in this DOM double.
 n.lock();stand(h,2,-10.9);assert(n.interact('NPC_LANG_VIET_LY_TRUONG'));
 assert.equal(n.status.quests.QUEST_LV_01,'ready');
 h.run(`$('npcQuests').children[0].children.find(b=>b.id==='finish-QUEST_LV_01').onclick()`);
 assert.equal(n.status.quests.QUEST_LV_01,'completed');
 assert(h.run(`!$('npcQuests').children[0].children.some(b=>b.id==='finish-QUEST_LV_01')`));
 assert.equal(h.run('progress.score'),0);
});

test('practice requires accepted quest, correct map, range, facing and a successful real weapon cast',async()=>{
 const h=await game(),n=h.context.VietVillageNPCs;
 // Seed only the prerequisite through the real journal workflow in this isolated fixture.
 stand(h,7.6,21.6);n.interact('NPC_LANG_VIET_TUAN_DINH');h.run(`$('npcQuests').children[0].children.find(b=>b.id==='accept-QUEST_LV_01').onclick()`);n.lock();
 stand(h,2,-10.9);n.interact('NPC_LANG_VIET_LY_TRUONG');h.run(`$('npcQuests').children[0].children.find(b=>b.id==='finish-QUEST_LV_01').onclick()`);n.lock();
 stand(h,8.1,-14.6);n.interact('NPC_LANG_VIET_VO_SU');h.run(`$('npcQuests').children[0].children.find(b=>b.id==='accept-QUEST_LV_02').onclick()`);n.lock();
 h.context.VietVillageWeapons.equip('sword');stand(h,10.7,-14.3,0);
 assert.equal(n.onSkillUsed(),false,'Facing away cannot train');assert.equal(n.status.quests.QUEST_LV_02,'active');
 stand(h,0,16.5,Math.PI);assert.equal(n.onSkillUsed(),false,'Remote casting cannot train');
 stand(h,10.7,-14.3,Math.PI);assert(h.context.VietVillageWeapons.cast(1).ok);
 assert.equal(n.status.quests.QUEST_LV_02,'ready');assert(!h.context.VietVillageWeapons.cast(1).ok,'Cooldown cast fails');
 assert(h.context.VietVillageJourney.getState().tutorials.skills);assert.equal(h.run('progress.score'),0);
});

test('returning to the village reuses the same NPC roots and collisions; NPC interactions vanish in other maps and interiors',async()=>{
 const h=await game(),n=h.context.VietVillageNPCs;
 h.run(`var npcRoot=regionTravel.current.root.getObjectByName('lang-viet-npcs');var npcWalk=regionTravel.current.canWalk;VietVillageJourney.recordMovement(3);VietVillageJourney.recordSkillUse();`);
 for(let i=0;i<5;i++){
  assert(h.context.VietVillageRegions.travelTo('ngoai-lang-dong-tre').ok);n.update(.11);assert(h.run('!npcRoot.visible'));assert(!n.interact('NPC_LANG_VIET_VO_SU'));
  assert(h.context.VietVillageRegions.travelTo('lang-viet','from-dong-tre').ok);n.update(.11);
  assert(h.run(`npcRoot.visible&&regionTravel.current.root.getObjectByName('lang-viet-npcs')===npcRoot&&regionTravel.current.canWalk===npcWalk`));
  assert(await n.load());assert.equal(n.status.count,8);
 }
 h.run('gateView=0');n.update(.11);assert(h.run('npcRoot.visible'));assert(!n.interact('NPC_LANG_VIET_TUAN_DINH'));h.run('gateView=-1');
 h.run('insideHouse=true');n.update(.11);assert(h.run('!npcRoot.visible'));assert(!n.interact('NPC_LANG_VIET_TUAN_DINH'));
});

test('quest records survive reload, isolate UID, reject corrupt state and do not touch tutorial/math progress',()=>{
 const h=createHarness(),store=new Map([['viet-village:journey:v1:a','{"movement":true}'],['math-island-3d-v1-core','original']]);let uid='a';
 const options={quests:load('quests').quests,getIdentity:()=>({authenticated:!!uid,uid}),storage:{getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v)}};
 let j=h.context.createVillageQuestJournal(options);assert(!j.accept('QUEST_LV_02','NPC_LANG_VIET_VO_SU'));
 assert(j.accept('QUEST_LV_01','NPC_LANG_VIET_TUAN_DINH'));assert(j.record('talk','NPC_LANG_VIET_LY_TRUONG'));assert(j.turnIn('QUEST_LV_01','NPC_LANG_VIET_LY_TRUONG'));assert(!j.turnIn('QUEST_LV_01','NPC_LANG_VIET_LY_TRUONG'));
 j=h.context.createVillageQuestJournal(options);assert.equal(j.status('QUEST_LV_01'),'completed');uid='b';assert.equal(j.status('QUEST_LV_01'),'available');uid=null;assert(!j.accept('QUEST_LV_01','NPC_LANG_VIET_TUAN_DINH'));
 assert.equal(store.get('viet-village:journey:v1:a'),'{"movement":true}');assert.equal(store.get('math-island-3d-v1-core'),'original');
 store.set('viet-village:quests:lang-viet:v1:broken','{"QUEST_LV_01":"forged","unrelated":"completed"}');uid='broken';assert.equal(j.status('QUEST_LV_01'),'available');assert.equal(Object.keys(j.snapshot()).length,0);
 store.set('viet-village:quests:lang-viet:v1:broken','{bad json');j.lock();assert.equal(j.status('QUEST_LV_01'),'available');
});

test('missing data fails without mounting partial actors, and explicit retry mounts exactly once',async()=>{
 const h=createHarness(),n=h.context.VietVillageNPCs;h.context.fetch=async()=>({ok:false,status:404});
 assert.equal(await n.load(),false);assert.equal(n.status.count,0);assert.match(n.status.error,/404/);
 h.context.fetch=async url=>({ok:true,json:async()=>load(/([^/]+)\.json/.exec(url)[1])});
 assert(await n.load());assert(await n.load());assert.equal(n.status.count,8);
});

test('walking away or starting a transition closes a dialogue and releases gameplay controls',async()=>{
 const h=await game(),n=h.context.VietVillageNPCs;
 stand(h,2,-10.9);assert(n.interact('NPC_LANG_VIET_LY_TRUONG'));
 stand(h,0,16.5);assert(!n.isOpen());assert(!h.run('overlays()'));
 assert(h.run("$('npcDialog').classList.contains('hidden')"));
 stand(h,2,-10.9);assert(n.interact('NPC_LANG_VIET_LY_TRUONG'));
 h.run('VietVillageJourney.recordMovement(3);VietVillageJourney.recordSkillUse()');
 assert(h.context.VietVillageRegions.travelTo('ngoai-lang-dong-tre').ok);n.update(.11);
 assert(!n.isOpen());assert.equal(n.status.opened,null);
});

test('opening the directory replaces the conversation instead of stacking windows',async()=>{
 const h=await game(),n=h.context.VietVillageNPCs;
 stand(h,-9.8,4.25);assert(n.interact('NPC_LANG_VIET_THAY_DO'));
 for(let i=0;i<12;i++)n.openDirectory();
 assert(n.isOpen());assert.equal(n.status.opened,null);assert.equal(n.status.lesson,null);
 assert(h.run("$('npcDialog').classList.contains('hidden')&&!$('npcDirectory').classList.contains('hidden')"));
 assert.equal(h.run("$('npcList').children.length"),8);
 n.lock();assert(!h.run('overlays()'));
});

test('old lesson, end, and route callbacks cannot act on a newly opened conversation',async()=>{
 const h=await game(),n=h.context.VietVillageNPCs;
 stand(h,-9.8,4.25);assert(n.interact('NPC_LANG_VIET_THAY_DO'));
 const control=id=>h.run(`$('npcAnimations').children.find(b=>b.id==='${id}')`);
 const staleStudy=control('npc-study'),staleQuestion=control('npc-question'),staleEnd=control('npc-end-conversation');
 staleQuestion.onclick();const staleAnswer=h.run("$('npcLesson').children.find(e=>e.className==='npc-actions').children[0]");
 n.lock();assert(n.interact('NPC_LANG_VIET_THAY_DO'));
 staleStudy.onclick();staleQuestion.onclick();staleAnswer.onclick();staleEnd.onclick();
 assert(n.isOpen());assert(!n.status.lesson.correct);assert(!n.status.lesson.completed);
 assert.equal(h.run("$('npcLesson').children.length"),0);
 n.lock();stand(h,2,-10.9);assert(n.interact('NPC_LANG_VIET_LY_TRUONG'));
 const staleRoute=h.run("$('npcActions').children.find(b=>b.id==='npc-action-guide-trainer')");
 n.lock();stand(h,7.6,21.6);assert(n.interact('NPC_LANG_VIET_TUAN_DINH'));
 staleRoute.onclick();assert.equal(n.status.opened,'NPC_LANG_VIET_TUAN_DINH');assert(h.run('!target'));
});

test('interact re-evaluates the closest NPC even before the next prompt refresh',async()=>{
 const h=createHarness();h.context.VietVillageAuth.getProfile=()=>({uid:'nearest-isolated-fixture'});
 h.context.fetch=async url=>({ok:true,json:async()=>{
  const name=/([^/]+)\.json/.exec(url)[1],value=load(name);
  // Overlapping ranges in this fixture exercise a crowded encounter without changing the map data.
  if(name==='gameplay')for(const n of value.npcs)n.interactionRadius=30;
  return value;
 }});
 h.run("$('play').onclick()");const n=h.context.VietVillageNPCs;await n.load();
 stand(h,2,-10.9);assert.equal(n.status.nearest,'NPC_LANG_VIET_LY_TRUONG');
 h.run('player.position.set(8.1,.3,-14.6)');assert(n.interact());
 assert.equal(n.status.opened,'NPC_LANG_VIET_VO_SU');
 assert(!n.interact('NPC_LANG_VIET_LY_TRUONG'),'Only one conversation can be active');
});
