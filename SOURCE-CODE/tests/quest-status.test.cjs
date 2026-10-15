'use strict';
// Pure rules shared by NPC markers, dialogue, journal, tracker and minimap.
const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
require(path.join(__dirname,'../js/quest-status.js'));
const QS=globalThis.VietVillageQuestStatus;
const quest=(id,extra={})=>({id,name:id,category:'main',giverNpc:'GIVER',turnInNpc:'RETURN',goal:'',dependsOn:[],objective:{type:'talk',npcId:'RETURN'},enabled:true,...extra});
const evaluate=(quests,phases={},level=1,readable=true)=>Object.fromEntries(QS.evaluateVillage({quests,readable,level,phaseOf:id=>phases[id],nameOf:id=>id}).map(e=>[e.id,e]));

test('LV and prerequisite are separate conditions and both must hold',()=>{
 const quests=[quest('A',{lockedVisibility:'listed'}),quest('B',{requirements:{all:[{level:5},{quest:'A',state:'completed'}]},lockedVisibility:'listed'})];
 let e=evaluate(quests,{A:'completed'},4).B;
 assert.equal(e.state,'locked','missing LV while the prerequisite is done');
 assert.deepEqual(e.requirements.items.map(i=>[i.type,i.met]),[['level',false],['quest',true]]);
 assert.equal(e.requirements.items[0].label,'Yêu cầu LV 5 — hiện tại LV 4');
 e=evaluate(quests,{},5).B;assert.equal(e.state,'locked','enough LV but prerequisite missing');
 assert.deepEqual(e.requirements.items.map(i=>i.met),[true,false]);
 assert.equal(evaluate(quests,{A:'completed'},5).B.state,'available','all conditions met');
});

test('reaching the objective is not turning in: a quest requiring completion stays locked',()=>{
 const quests=[quest('A'),quest('B',{dependsOn:['A'],lockedVisibility:'listed'})];
 for(const phase of [undefined,'active','ready'])assert.equal(evaluate(quests,{A:phase}).B.state,'locked',String(phase));
 assert.match(evaluate(quests,{A:'ready'}).B.requirements.items[0].label,/đã đạt mục tiêu, chưa trả nhiệm vụ/);
 assert.equal(evaluate(quests,{A:'completed'}).B.state,'available');
 const step=[quest('A'),quest('C',{requirements:{all:[{quest:'A',state:'ready'}]}})];
 assert.equal(evaluate(step,{A:'ready'}).C.state,'available','a design may ask only for a reached step');
});

test('any-of alternatives, hidden future quests and unknown data never open a quest',()=>{
 const quests=[quest('A'),quest('B'),quest('C',{requirements:{any:[{quest:'A',state:'completed'},{quest:'B',state:'completed'}]}}),quest('D',{dependsOn:['C']})];
 assert.equal(evaluate(quests,{B:'completed'}).C.state,'available');
 const none=evaluate(quests,{});assert.equal(none.C.state,'hidden','undiscovered future quests are not revealed');assert.equal(none.C.revealed,false);
 assert.equal(evaluate([quest('L',{minLevel:3})],{},null).L.state,'unknown','LV still loading is not a pass or a fail');
 assert.equal(evaluate(quests,{},1,false).A.state,'unknown','an unreadable journal is not "not started"');
 assert.equal(evaluate([quest('X',{enabled:false,reason:'chưa dựng'})]).X.state,'unavailable');
});

test('validation reports duplicate IDs, missing references, unsupported shapes and cycles; broken quests stay closed',()=>{
 const quests=[quest('A',{dependsOn:['C']}),quest('B',{dependsOn:['A']}),quest('C',{dependsOn:['B']}),quest('D',{dependsOn:['GHOST']}),quest('E',{requirements:{all:[{item:'X'}]}}),quest('F'),quest('F')];
 const v=QS.validate(quests);
 for(const id of ['A','B','C','D','E','F'])assert(v.invalid.has(id),id);
 assert(v.errors.some(e=>/Vòng lặp/.test(e.message)));assert(v.errors.some(e=>/GHOST/.test(e.message)));assert(v.errors.some(e=>/trùng/.test(e.message)));
 const states=QS.evaluateVillage({quests,readable:true,level:99,phaseOf:()=>undefined,validation:v});
 assert(states.filter(e=>e.id!=='F'||e.state==='invalid').every(e=>e.state==='invalid'));
 assert.equal(QS.validate([quest('A'),quest('B',{dependsOn:['A']})]).errors.length,0);
});

test('one marker per NPC: turn-in > accept > in progress > locked, then tracked, main before side, stable order',()=>{
 const e=(id,state,category,order,extra={})=>({id,state,category,order,revealed:state!=='hidden',giverNpc:'N',turnInNpc:'N',objective:null,...extra});
 let m=QS.markers([e('L','locked','main',0),e('P','active','main',1),e('A','available','side',2),e('R','ready','side',3)]);
 assert.deepEqual(m.get('N'),{kind:'ready',category:'side',questId:'R',count:4});
 m=QS.markers([e('L','locked','main',0),e('P','active','main',1),e('A','available','side',2)]);assert.equal(m.get('N').kind,'available');
 m=QS.markers([e('L','locked','main',0),e('P','active','main',1)]);assert.equal(m.get('N').kind,'progress','a locked quest never hides one in progress');
 m=QS.markers([e('S','available','side',0),e('M','available','main',1)]);assert.equal(m.get('N').questId,'M','main before side');
 m=QS.markers([e('S','available','side',0),e('M','available','main',1)],{tracked:'S'});assert.equal(m.get('N').questId,'S','tracked first');
 m=QS.markers([e('H','hidden','main',0),e('C','completed','main',1)]);assert.equal(m.has('N'),false,'hidden/completed quests show nothing');
 // Giver, step NPC and turn-in NPC differ.
 m=QS.markers([e('Q','active','main',0,{giverNpc:'G',turnInNpc:'T',objective:{targetNpc:'S'}})]);
 assert.equal(m.has('G'),false);assert.equal(m.get('T').kind,'progress');assert.equal(m.get('S').kind,'progress');
 m=QS.markers([e('Q','ready','main',0,{giverNpc:'G',turnInNpc:'T'})]);assert.equal(m.get('T').kind,'ready');assert.equal(m.has('G'),false);
});

test('different characters with different phases get different results from the same data',()=>{
 const quests=[quest('A',{giverNpc:'G',turnInNpc:'T'}),quest('B',{giverNpc:'T',turnInNpc:'T',dependsOn:['A'],lockedVisibility:'listed'})];
 const one=QS.markers(QS.evaluateVillage({quests,readable:true,level:1,phaseOf:id=>({A:'completed'})[id]}));
 const two=QS.markers(QS.evaluateVillage({quests,readable:true,level:1,phaseOf:()=>undefined}));
 assert.equal(one.get('T').kind,'available');assert.equal(one.has('G'),false);
 assert.equal(two.get('G').kind,'available');assert.equal(two.get('T').kind,'locked');
});

test('dialogue lists revealed related quests; tracked default prefers open main quests',()=>{
 const entries=QS.evaluateVillage({quests:[quest('A',{giverNpc:'G'}),quest('B',{giverNpc:'G',dependsOn:['A']}),quest('S',{giverNpc:'G',category:'side'})],readable:true,level:1,phaseOf:id=>({A:'active'})[id]});
 assert.deepEqual(QS.relatedTo(entries,'G').map(e=>e.id),['S','A'],'available before active; hidden B is not listed');
 assert.equal(QS.pickTracked(entries,null),'A');assert.equal(QS.pickTracked(entries,'S'),'S');assert.equal(QS.pickTracked(entries,'B'),'A','a hidden stored choice falls back');
});

test('learning entries follow the learning service state and do not conclude while it is offline',()=>{
 const q={id:'QUEST_TV1_X',lesson_id:'L',title:'X',giver_npc_ref:'G',return_npc_ref:'T',reward_policy:{first_clear_exp:25},practice:{instructions:''},gates:{adventure_mode:{min_level:3,previous_quest:'QUEST_TV1_W'}}};
 const base={getQuest:id=>id===q.id?q:null,getLesson:()=>({title:'Bài X'}),level:2};
 assert.deepEqual(QS.evaluateLearning({...base,offered:[{questId:q.id,eligible:true}],getRun:()=>null,state:{status:'ready',connected:false}}),[]);
 const ready={status:'ready',connected:true};
 let [e]=QS.evaluateLearning({...base,offered:[{questId:q.id,eligible:true}],getRun:()=>null,state:ready});assert.equal(e.state,'available');assert.equal(e.name,'Bài X');
 [e]=QS.evaluateLearning({...base,offered:[{questId:q.id,eligible:false}],getRun:()=>null,state:ready});assert.equal(e.state,'locked');
 assert.deepEqual(e.requirements.items.map(i=>i.label),['Yêu cầu LV 3 — hiện tại LV 2','Hoàn thành và trả “QUEST_TV1_W” — chưa đạt']);
 for(const [status,state] of [['accepted','active'],['practice_pending','active'],['ready_to_turn_in','ready'],['completed','completed']]){
  [e]=QS.evaluateLearning({...base,offered:[{questId:q.id,eligible:true}],getRun:()=>({status}),state:ready});assert.equal(e.state,state,status);}
 assert.equal(QS.signalsOf({...e,state:'active'})[0].npc,'T','in-progress learning quests point at the return NPC');
});
