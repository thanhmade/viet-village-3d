'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const createHarness=require('./harness.cjs');
const DONG='ngoai-lang-dong-tre';
function game({mode='testing'}={}){
 const h=createHarness();
 // Testing-mode scenarios explicitly override only this isolated VM fixture.
 if(mode)h.context.VietVillageRegionAccess={...h.context.VietVillageRegionAccess,mode};
 h.run(`$('play').onclick();
  function enterDongGate(){regionTravel.closeMenu();player.position.set(0,.3,16.5);regionTravel.update(0);player.position.set(0,.3,20);regionTravel.update(0);}
  const originalActor=player,originalProgress=JSON.stringify(progress),originalRoot=regionTravel.current.root;
 `);return h;
}
test('the shipped configuration enforces gameplay admission for a new character',()=>{
 const {context}=game({mode:null}),r=context.VietVillageRegions;
 assert.equal(context.VietVillageRegionAccess.mode,'gameplay');
 const denied=r.checkTravelAccess(DONG,'village-entry',{loadDestination:true});
 assert.equal(denied.code,'region/tutorial-required');assert.match(denied.message,/di chuyển.*kỹ năng/);
 assert.equal(r.currentId,'lang-viet');
});
test('testing needs real registered safe resources, living level one actor and no fee, but not tutorials',()=>{
 const {run,context}=game(),regions=context.VietVillageRegions;
 assert.equal(context.VietVillageRegionAccess.mode,'testing');
 assert.equal(regions.checkTravelAccess(DONG).ready,false,'A preview does not pretend the scene is loaded');
 assert.equal(regions.checkTravelAccess('invented-map','village-entry').code,'region/unknown-map');
 assert.equal(regions.checkTravelAccess(DONG,'invented-spawn').code,'region/unknown-spawn');
 const ready=regions.checkTravelAccess(DONG,'village-entry',{loadDestination:true});
 assert(ready.ok&&ready.ready);assert.equal(ready.requirements.minimumLevel,1);assert.equal(ready.requirements.fee,0);
 assert.equal(regions.currentId,'lang-viet','Readiness prepares a hidden scene without moving');
 assert.equal(context.VietVillageJourney.getState().tutorials.movement,false);
 assert.equal(context.VietVillageJourney.getState().tutorials.skills,false);
 assert(regions.travelTo(DONG).ok);
 assert(run('player===originalActor&&JSON.stringify(progress)===originalProgress'));
});
test('death and insufficient level have identical denial codes for both destination spawns and do not move or charge',()=>{
 const {run,context}=game(),regions=context.VietVillageRegions,journey=context.VietVillageJourney;
 for(const [state,code,reason] of [[{alive:false,level:1},'region/character-dead',/gục/],[{alive:true,level:0},'region/level-required',/cấp 1/i]]){
  journey.setCharacterState(state);
  for(const spawn of ['village-entry','from-lang-viet']){
   const check=regions.checkTravelAccess(DONG,spawn,{loadDestination:true});assert.equal(check.code,code);assert.match(check.message,reason);
   assert.equal(regions.travelTo(DONG,spawn).code,code);
  }
  run('enterDongGate();var gatePosition=player.position.clone();');
  assert.match(run("$('regionDestinationChoices').children[0].children[1].textContent"),reason);assert.equal(regions.chooseDestination('dong-tre').ok,false);
  assert.match(run("$('toast').textContent"),reason);
  assert(run('player.position.equals(gatePosition)&&regionTravel.current.root===originalRoot&&player===originalActor&&JSON.stringify(progress)===originalProgress'));
  assert(!regions.status.loadedIds.includes(DONG),'Denied actors do not load Đồng Tre; the independent Tân Thủ choice may still be available');
 }
});
test('gameplay requires both genuine tutorial actions and keeps unrelated math mode and return travel separate',()=>{
 const {run,context}=game(),r=context.VietVillageRegions;
 context.VietVillageRegionAccess={...context.VietVillageRegionAccess,mode:'gameplay'};
 run("mode='advanced';level=11;progress.score=99999;enterDongGate();");
 let access=r.checkTravelAccess(DONG,'village-entry',{loadDestination:true});
 assert.equal(access.code,'region/tutorial-required');assert.match(access.message,/di chuyển/);assert.match(access.message,/kỹ năng/);
 assert.equal(r.chooseDestination('dong-tre').ok,false);assert.match(run("$('toast').textContent"),/di chuyển.*kỹ năng/);
 run('regionTravel.closeMenu();player.position.set(0,.3,16);yaw=0;keys.KeyW=true;for(let i=0;i<30;i++)tick((last||0)+40);keys.KeyW=false;');
 assert.equal(context.VietVillageJourney.getState().tutorials.movement,true);
 access=r.checkTravelAccess(DONG);assert.equal(access.code,'region/tutorial-required');assert.doesNotMatch(access.message,/hướng dẫn di chuyển/);
 assert(context.VietVillageWeapons.equip('sword'));assert(context.VietVillageWeapons.cast(1).ok);
 assert(r.checkTravelAccess(DONG,'village-entry',{loadDestination:true}).ok);
 run('enterDongGate();');assert(r.chooseDestination('dong-tre').ok);assert.equal(r.currentId,DONG);
 assert.equal(context.VietVillageJourney.getState().level,1,'Math level/score is not character level');
 // Returning home is not locked by Đồng Tre's admission tutorials.
 context.VietVillageJourney=context.createVillageJourney({getIdentity:()=>({authenticated:true,uid:'new-test-actor'})});
 assert(r.checkTravelAccess('lang-viet','from-dong-tre').ok);assert(r.travelTo('lang-viet','from-dong-tre').ok);
});
test('loader and commit reentry are blocked; transition locks always release and runtime state is rechecked',()=>{
 const {run,context}=game(),r=context.VietVillageRegions;
 run(`const realFactory=createDongTreRegion;let loaderReentry,loaderBusy;
  window.createDongTreRegion=options=>{loaderBusy=regionTravel.status.transitioning;loaderReentry=regionTravel.travelTo('lang-tan-thu');return realFactory(options);};`);
 assert(r.checkTravelAccess(DONG,'village-entry',{loadDestination:true}).ok);
 assert.equal(run('loaderBusy'),true);assert.equal(run('loaderReentry.code'),'region/transition-busy');assert.equal(r.status.transitioning,false);
 run(`const climateBefore=updateClimate;let commitReentry,commitBusy;
  updateClimate=function(...args){commitBusy=regionTravel.status.transitioning;commitReentry=regionTravel.travelTo('lang-tan-thu');return climateBefore(...args);};`);
 assert(r.travelTo(DONG).ok);assert.equal(run('commitBusy'),true);assert.equal(run('commitReentry.code'),'region/transition-busy');
 run('updateClimate=climateBefore;');assert.equal(r.status.transitioning,false);
 assert(r.travelTo('lang-viet').ok);
 run(`const actualTanFactory=createLangTanThuRegion;window.createLangTanThuRegion=options=>{VietVillageJourney.setCharacterState({alive:false});return actualTanFactory(options);};`);
 assert.equal(r.travelTo('lang-tan-thu').code,'region/character-dead');assert.equal(r.currentId,'lang-viet');assert.equal(r.status.transitioning,false);
});
test('broken loaders and unsafe spawns retain source pose and permit explicit retry without pending loops',()=>{
 const {run,context}=game(),r=context.VietVillageRegions;
 run(`const savedFactory=createDongTreRegion;let attemptsToLoad=0;window.createDongTreRegion=()=>{attemptsToLoad++;throw new Error('controlled load failure');};
  const beforePosition=player.position.clone(),beforeCamera=camera.position.clone();`);
 assert.equal(r.checkTravelAccess(DONG,'village-entry',{loadDestination:true}).code,'region/load-failed');
 assert.equal(run('attemptsToLoad'),1);assert.equal(r.status.transitioning,false);
 assert(run('player.position.equals(beforePosition)&&camera.position.equals(beforeCamera)&&regionTravel.current.root===originalRoot&&originalRoot.visible'));
 run('enterDongGate();');assert.equal(r.interact(),false);const count=run('attemptsToLoad');
 run('for(let i=0;i<120;i++)regionTravel.update(.016);');assert.equal(run('attemptsToLoad'),count,'Nearby messages never retry scene loading each frame');
 run('window.createDongTreRegion=savedFactory;');assert.equal(r.interact(),false,'A failed E visit requires reentry');
 run('enterDongGate();');assert(r.chooseDestination('dong-tre').ok);assert.equal(r.currentId,DONG);
 assert(r.travelTo('lang-viet').ok);
 run(`const loadedDong=regionTravel.prepare('${DONG}'),walkBefore=loadedDong.canWalk;loadedDong.canWalk=()=>false;`);
 assert.equal(r.travelTo(DONG).code,'region/unsafe-spawn');assert.equal(r.currentId,'lang-viet');
 run('loadedDong.canWalk=walkBefore;');assert(r.travelTo(DONG).ok);
});
test('missing access state, invalid mode, expired sessions and house transitions cannot grant entry',()=>{
 const {run,context}=game(),r=context.VietVillageRegions,journey=context.VietVillageJourney;
 context.VietVillageJourney=null;assert.equal(r.checkTravelAccess(DONG).code,'region/character-unavailable');context.VietVillageJourney=journey;
 context.VietVillageRegionAccess={...context.VietVillageRegionAccess,mode:'typo'};assert.equal(r.checkTravelAccess(DONG).code,'region/invalid-mode');
 context.VietVillageRegionAccess={...context.VietVillageRegionAccess,mode:'testing'};
 run('const realHousePortals=housePortalSystem;housePortalSystem={status:{pending:true}};');
 assert.equal(r.checkTravelAccess(DONG).code,'region/transition-busy');run('housePortalSystem=realHousePortals;');
 context.testAuthAllowed=false;assert.equal(r.checkTravelAccess(DONG).code,'region/auth-required');
 context.testAuthAllowed=true;assert(r.travelTo(DONG).ok);
});
