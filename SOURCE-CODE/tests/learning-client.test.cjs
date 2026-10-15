'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),root=path.resolve(__dirname,'../..');
const read=file=>JSON.parse(fs.readFileSync(path.join(root,file),'utf8')),plain=value=>JSON.parse(JSON.stringify(value));
const catalog=read('LEARNING/TV1-HK1/catalog.json'),questions=read('LEARNING/TV1-HK1/questions.public.json'),registry=read('LEARNING/packs.json'),defaults=read('LEARNING/default-assignments.json');
function files(extra={}){return {'packs.json':registry,'default-assignments.json':defaults,'TV1-HK1/catalog.json':catalog,'TV1-HK1/questions.public.json':questions,...extra};}
function setup(extra={},served=files()){const box={};box.globalThis=box;vm.createContext(box);vm.runInContext(fs.readFileSync(path.join(root,'SOURCE-CODE/js/learning-quests.js'),'utf8'),box);
 const store=new Map(),runtime={uid:'isolated-a',position:{x:15,y:.3,z:23},alive:true,transitioning:false,mapId:'lang-viet',npc:true},calls=[],fetched=[];
 let reply={runs:[],assignments:[],role:'student',scope:'localhost-preview',rewardsEnabled:false};
 const options={getIdentity:()=>({authenticated:!!runtime.uid,uid:runtime.uid}),storage:{getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v)},
  fetch:async url=>{fetched.push(url);const name=url.replace('../LEARNING/','');return Object.hasOwn(served,name)?{ok:true,status:200,json:async()=>JSON.parse(JSON.stringify(served[name]))}:{ok:false,status:404,json:async()=>null};},
  getContext:()=>runtime,nearNpc:()=>runtime.npc,invoke:async(method,payload)=>{calls.push({method,payload});return typeof reply==='function'?reply(method,payload):reply;},...extra};
 return {client:box.createLearningQuestClient(options),runtime,store,calls,fetched,set reply(value){reply=value;},create:()=>box.createLearningQuestClient(options)};
}
const run=(questId,status,extra={})=>({questId,questionId:questId.replace('QUEST_','Q_')+'_M1',status,mode:'preview',...extra});

test('packs load from the registry; every level label stays data, independent of player LV',async()=>{const {client,fetched}=setup();await client.load();
 assert.equal(client.packs.length,1);assert.equal(client.packs[0].packId,'tv1-hk1-v1');assert.equal(client.catalog.quests.length,87);
 assert.equal(client.getQuestion('Q_TV1_B033_M1').student_label,'Khởi đầu');assert.equal(client.getQuest('QUEST_TV1_B033').variants.length,5);
 assert.equal(client.getLesson('TV1_B033').week,8);assert.equal(client.getItem('ITEM_TV1_B033').id,'ITEM_TV1_B033');
 assert(fetched.includes('../LEARNING/packs.json')&&fetched.includes('../LEARNING/TV1-HK1/catalog.json'));});
test('configured assignment drives the quest list and level after the selectors were removed',async()=>{const s=setup();await s.client.refresh();
 const offered=s.client.offered();assert.deepEqual(plain(offered.map(o=>o.questId)),defaults.assignments[0].questIds);
 assert(offered.every(o=>o.difficulty===1&&o.levelLabel==='Khởi đầu'&&o.status==='available'&&o.eligible));
 await s.client.begin('QUEST_TV1_B033','NPC_LANG_VIET_TUAN_DINH');assert.deepEqual(plain(s.calls.at(-1)),{method:'begin',payload:{characterId:'primary',questId:'QUEST_TV1_B033',questionId:'Q_TV1_B033_M1',mode:'preview',npcId:'NPC_LANG_VIET_TUAN_DINH'}});
 await assert.rejects(s.client.begin('QUEST_TV1_B040',s.client.getQuest('QUEST_TV1_B040').giver_npc_ref),/chưa được giao/);});
test('a lesson and level chosen with the old selectors stays assigned and keeps its level',async()=>{const s=setup();
 s.store.set('viet-village:learning-selection:v1:isolated-a:primary',JSON.stringify({schemaVersion:1,uid:'isolated-a',characterId:'primary',packId:'tv1-hk1-v1',selection:{questId:'QUEST_TV1_B040',difficulty:3,mode:'preview'}}));
 await s.client.refresh();const kept=s.client.offered().find(o=>o.questId==='QUEST_TV1_B040');assert.equal(kept.source,'selection');assert.equal(kept.difficulty,3);
 const giver=s.client.getQuest('QUEST_TV1_B040').giver_npc_ref;await s.client.begin('QUEST_TV1_B040',giver);assert.equal(s.calls.at(-1).payload.questionId,'Q_TV1_B040_M3');
 assert.equal(JSON.parse(s.store.get('viet-village:learning-selection:v1:isolated-a:primary')).selection.difficulty,3);});
test('a running quest keeps its server question level even if configuration changes',async()=>{const s=setup();s.reply={runs:[{...run('QUEST_TV1_B034','collected'),questionId:'Q_TV1_B034_M4'}],scope:'localhost-preview'};await s.client.refresh();
 const entry=s.client.offered().find(o=>o.questId==='QUEST_TV1_B034');assert.equal(entry.difficulty,4);assert.equal(entry.status,'collected');assert.equal(entry.source,'run');});
test('selection persists per UID and never touches character, experience or journal data',async()=>{const s=setup();s.store.set('viet-village:character:v1:isolated-a','preserve');s.store.set('viet-village:experience:v1:isolated-a:primary','unchanged');
 await s.client.refresh();await s.client.begin('QUEST_TV1_B033','NPC_LANG_VIET_TUAN_DINH');let reloaded=s.create();await reloaded.load();assert.equal(reloaded.getState().selection.questId,'QUEST_TV1_B033');
 s.runtime.uid='isolated-b';assert.equal(reloaded.getState().selection,null);assert.equal(s.store.get('viet-village:character:v1:isolated-a'),'preserve');assert.equal(s.store.get('viet-village:experience:v1:isolated-a:primary'),'unchanged');});
test('malformed saved selections are preserved and block overwrite',async()=>{const s=setup();s.store.set('viet-village:learning-selection:v1:isolated-a:primary','{bad');await s.client.refresh();
 await assert.rejects(s.client.begin('QUEST_TV1_B033','NPC_LANG_VIET_TUAN_DINH'),/dữ liệu cũ/);assert.equal(s.store.get('viet-village:learning-selection:v1:isolated-a:primary'),'{bad');});
test('NPC markers: ! to accept, grey ? while working or waiting for a teacher, bright ? to turn in, none when done',async()=>{const s=setup();await s.client.refresh();
 assert.deepEqual(plain([...s.client.markers()]),[['NPC_LANG_VIET_TUAN_DINH','available']]);
 s.reply={runs:[run('QUEST_TV1_B033','practice_pending')],scope:'localhost-preview'};await s.client.refresh();
 assert.equal(s.client.markers().get('NPC_LANG_VIET_THAY_DO'),'progress','teacher confirmation pending is not ready to turn in');
 s.reply={runs:[run('QUEST_TV1_B033','ready_to_turn_in'),run('QUEST_TV1_B031','accepted')],scope:'localhost-preview'};await s.client.refresh();
 assert.equal(s.client.markers().get('NPC_LANG_VIET_THAY_DO'),'ready','turn-in outranks in-progress at the same NPC');assert.equal(s.client.markers().get('NPC_LANG_VIET_TUAN_DINH'),'available');
 s.reply={runs:['B031','B032','B033','B034','B035'].map(id=>run('QUEST_TV1_'+id,'completed'))};await s.client.refresh();assert.equal(s.client.markers().size,0,'completed, non-repeating quests stop announcing');});
test('server classroom assignments ignore LV; adventure needs LV and the previous quest',async()=>{const s=setup();
 const assignment=(id,mode)=>({questId:id,questionId:id.replace('QUEST_','Q_')+'_M2',mode,active:true});
 s.reply={runs:[],assignments:[assignment('QUEST_TV1_B033','classroom'),assignment('QUEST_TV1_B034','adventure')],progression:{level:1,exp:0},role:'student',scope:'server',rewardsEnabled:true};await s.client.refresh();
 const list=s.client.offered();assert.deepEqual(plain(list.map(o=>[o.questId,o.eligible,o.difficulty])),[['QUEST_TV1_B033',true,2],['QUEST_TV1_B034',false,2]]);
 assert.equal(s.client.offered().length,2,'server mode ignores the local default assignment');
 s.reply={runs:[run('QUEST_TV1_B033','completed',{mode:'classroom'})],assignments:[assignment('QUEST_TV1_B034','adventure')],progression:{level:7,exp:0},scope:'server'};await s.client.refresh();
 assert.equal(s.client.offered().find(o=>o.questId==='QUEST_TV1_B034').eligible,true);await s.client.begin('QUEST_TV1_B034','NPC_LANG_VIET_TUAN_DINH');assert.equal(s.calls.at(-1).payload.mode,'adventure');});
test('a second registered pack loads by data; duplicate IDs or foreign prefixes are refused',async()=>{
 const extra={packId:'demo-pack',version:1,idPrefix:'DEMO',catalog:'DEMO/catalog.json',questions:'DEMO/questions.public.json'};
 const q={id:'QUEST_DEMO_001',lesson_id:'L_DEMO_1',giver_npc_ref:'NPC_LANG_VIET_TAP_HOA',return_npc_ref:'NPC_LANG_VIET_THAY_DO',variants:[{difficulty:1,question_id:'Q_DEMO_001_M1'}],gates:{},steps:[]};
 const demo={schemaVersion:1,packId:'demo-pack',levels:[{difficulty:1,student_label:'Khởi đầu'}],quests:[q],lessons:[],items:[]},demoQuestions=[{id:'Q_DEMO_001_M1',difficulty:1,type:'single_choice',options:[]}];
 const two=setup({},files({'packs.json':{...registry,packs:[...registry.packs,extra]},'DEMO/catalog.json':demo,'DEMO/questions.public.json':demoQuestions}));await two.client.load();
 assert.equal(two.client.packs.length,2);assert.equal(two.client.getQuest('QUEST_DEMO_001').giver_npc_ref,'NPC_LANG_VIET_TAP_HOA');assert.equal(two.client.getPack('QUEST_DEMO_001').entry.packId,'demo-pack');
 const clash=setup({},files({'packs.json':{...registry,packs:[...registry.packs,extra]},'DEMO/catalog.json':{...demo,quests:[{...q,id:'QUEST_TV1_B033'}]},'DEMO/questions.public.json':demoQuestions}));
 await assert.rejects(clash.client.load(),/trùng|tiền tố/);assert.equal(clash.client.packs.length,0);
 const unsafe=setup({},files({'packs.json':{...registry,packs:[{...extra,catalog:'../private/x.json'}]}}));await assert.rejects(unsafe.client.load(),/đường dẫn/);});
test('backend unavailability shows a genuine block without creating local runs, grades or EXP',async()=>{const s=setup({invoke:null});await s.client.load();
 await assert.rejects(s.client.begin('QUEST_TV1_B033','NPC_LANG_VIET_TUAN_DINH'),/chưa sẵn sàng/);assert.equal(s.client.getState().runs.length,0);assert.equal(s.client.getState().rewardsEnabled,false);assert.equal(s.client.getState().connected,false);
 assert.equal([...s.store.keys()].filter(k=>k.includes('experience')).length,0);assert.equal(s.client.markers().size,0);});
test('stale backend responses never cross accounts and same pending request is deduplicated',async()=>{let resolve;const s=setup({invoke:()=>new Promise(r=>resolve=r)});await s.client.load();const a=s.client.refresh(),b=s.client.refresh();await new Promise(r=>setImmediate(r));s.runtime.uid='isolated-b';s.client.getState();resolve({runs:[{questId:'QUEST_TV1_B033',status:'ready_to_turn_in'}]});await assert.rejects(a,/tài khoản/);await assert.rejects(b,/tài khoản/);assert.equal(s.client.getState().runs.length,0);});
test('collect is limited to active fixed spawn and the current MAP/range; null positions stay blocked',async()=>{let r={questId:'QUEST_TV1_B033',status:'accepted',spawn:{pointId:'SP_TV1_B033',position:{x:15,y:.3,z:23}}};const s=setup({invoke:async(method)=>method==='state'?{runs:[r]}:{run:{...r,status:'collected'}}});await s.client.refresh();s.runtime.position.x=0;await assert.rejects(s.client.collect(r.questId,'SP_TV1_B033'),/gần thẻ/);s.runtime.position.x=15;s.runtime.mapId='lang-tan-thu';await assert.rejects(s.client.collect(r.questId,'SP_TV1_B033'),/Làng Việt/);s.runtime.mapId='lang-viet';await s.client.collect(r.questId,'SP_TV1_B033');assert.equal(s.client.getRun(r.questId).status,'collected');r={...r,spawn:{pointId:'SP_TV1_B033',position:null}};await s.client.refresh();await assert.rejects(s.client.collect(r.questId,'SP_TV1_B033'),/chưa được kiểm tra/);});
test('begin/turn-in require the real mapped NPC and proximity, not merely opening a menu',async()=>{const s=setup();await s.client.load();await assert.rejects(s.client.begin('QUEST_TV1_B033','NPC_LANG_VIET_LY_TRUONG'),/đúng người giao/);s.runtime.npc=false;await assert.rejects(s.client.begin('QUEST_TV1_B033','NPC_LANG_VIET_TUAN_DINH'),/đến gần/);await assert.rejects(s.client.turnIn('QUEST_TV1_B033','NPC_LANG_VIET_THAY_DO'),/đến gần/);assert.equal(s.calls.length,0);});
test('server scope, no-reward preview status and teacher review remain server values',async()=>{const s=setup();await s.client.refresh();assert.equal(s.client.getState().scope,'localhost-preview');assert.equal(s.client.getState().rewardsEnabled,false);await s.client.review({studentUid:'other',questId:'QUEST_TV1_B033'});assert.equal(s.calls.at(-1).method,'review');assert.equal(s.client.getState().role,'student');});
test('reviewing or approving another student never replaces the current account run or EXP view',async()=>{const s=setup({invoke:async method=>method==='state'?{runs:[],role:'teacher',progression:{level:2,exp:5},scope:'server'}:{run:{questId:'QUEST_TV1_B033',uid:'other-student',status:'ready_to_turn_in'},progression:{level:20,exp:0}}});await s.client.refresh();const result=await s.client.review({studentUid:'other-student',questId:'QUEST_TV1_B033'});assert.equal(result.run.uid,'other-student');assert.equal(s.client.getState().runs.length,0);assert.equal(s.client.getState().progression.level,2);await s.client.approve({studentUid:'other-student',questId:'QUEST_TV1_B033'});assert.equal(s.client.getState().runs.length,0);});
test('review repetition is explicitly requested and never attached to ordinary begin',async()=>{const s=setup();await s.client.refresh();await s.client.begin('QUEST_TV1_B033','NPC_LANG_VIET_TUAN_DINH');assert(!Object.hasOwn(s.calls.at(-1).payload,'repeat'));await s.client.begin('QUEST_TV1_B033','NPC_LANG_VIET_TUAN_DINH',{repeat:true});assert.equal(s.calls.at(-1).payload.repeat,true);});
test('legitimate server gate errors retain the connection while transport failures disable it',async()=>{let mode='ready';const s=setup({invoke:async()=>{if(mode==='gate')throw Object.assign(new Error('Chưa có bài giáo viên giao'),{code:'failed-precondition'});if(mode==='network')throw Object.assign(new Error('Mất mạng'),{code:'learning/network'});return {runs:[],scope:'localhost-preview'};}});await s.client.refresh();mode='gate';await assert.rejects(s.client.begin('QUEST_TV1_B033','NPC_LANG_VIET_TUAN_DINH'));assert.equal(s.client.getState().connected,true);mode='network';await assert.rejects(s.client.refresh());assert.equal(s.client.getState().connected,false);});
test('restart is browser-practice only and never resets a server run',async()=>{const s=setup();await s.client.refresh();await assert.rejects(s.client.restart('QUEST_TV1_B033'),/luyện tập/);assert(!s.calls.some(c=>c.method==='restart'));});
test('quest panel markup no longer has subject/grade/week/level/mode selectors; data is unchanged',()=>{
 const html=fs.readFileSync(path.join(root,'SOURCE-CODE/index.html'),'utf8'),panel=html.slice(html.indexOf('<section id="learningPanel"'),html.indexOf('</section>',html.indexOf('<section id="learningPanel"')));
 assert.match(panel,/<h2 id="learningTitle">Nhiệm vụ<\/h2>/);
 for(const gone of ['learning-filters','learningWeek','learningLevel','learningMode','learningQuest','Môn','Lớp','Xem thử localhost','18 tuần · 87 nhiệm vụ','Tiếng Việt 1 · Học kì 1'])assert(!panel.includes(gone),gone);
 for(const kept of ['learningNotice','learningRetry','learningContent','learningClose'])assert(panel.includes(kept),kept);
 assert.equal(catalog.counts.quests,87);assert.equal(catalog.subject,'tieng-viet');assert.equal(catalog.grade,1);assert.equal(registry.packs[0].semester,1);});
