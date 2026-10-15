'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto'),root=path.resolve(__dirname,'../..');
const read=file=>JSON.parse(fs.readFileSync(path.join(root,file),'utf8')),plain=value=>JSON.parse(JSON.stringify(value));
const keys=read('LEARNING/TV1-HK1/practice-keys.json'),teacher=read('firebase/functions/private/tv1-hk1-v1.questions.teacher.json');
const served={'packs.json':read('LEARNING/packs.json'),'default-assignments.json':read('LEARNING/default-assignments.json'),'TV1-HK1/catalog.json':read('LEARNING/TV1-HK1/catalog.json'),'TV1-HK1/questions.public.json':read('LEARNING/TV1-HK1/questions.public.json'),'TV1-HK1/practice-keys.json':keys};
const correct=id=>teacher.questions.find(q=>q.id===id).assessment.correct;
function setup({store=new Map(),subtle=crypto.webcrypto.subtle,uid='practice-a'}={}){
 const box={TextEncoder,crypto:{subtle}};box.globalThis=box;vm.createContext(box);
 for(const file of ['learning-quests.js','learning-practice.js'])vm.runInContext(fs.readFileSync(path.join(root,'SOURCE-CODE/js',file),'utf8'),box);
 const runtime={uid,position:{x:15,y:.3,z:23},alive:true,transitioning:false,mapId:'lang-viet',npc:true},fetched=[];
 const fetch=async url=>{fetched.push(url);const name=url.replace('../LEARNING/','');return Object.hasOwn(served,name)?{ok:true,status:200,json:async()=>plain(served[name])}:{ok:false,status:404};};
 const identity=()=>({authenticated:!!runtime.uid,uid:runtime.uid}),storage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v)};
 let client;const practice=box.createLearningPracticeService({getIdentity:identity,storage,getClient:()=>client,fetch,subtle});
 client=box.createLearningQuestClient({getIdentity:identity,storage,fetch,getContext:()=>runtime,nearNpc:()=>runtime.npc,invoke:(method,data)=>practice.invoke(method,data)});
 return {client,practice,store,runtime,fetched};
}
async function toCard(s,questId='QUEST_TV1_B033'){await s.client.refresh();await s.client.begin(questId,s.client.getQuest(questId).giver_npc_ref);const run=s.client.getRun(questId);
 s.runtime.position={...run.spawn.position};await s.client.collect(questId,run.spawn.pointId);return s.client.getRun(questId);}

test('browser practice hashes match the importer for all 259 auto-graded questions; rubric work has no key',()=>{
 const {practice}=setup(),auto=teacher.questions.filter(q=>q.assessment.mode==='deterministic');
 assert.equal(Object.keys(keys.keys).length,auto.length);assert.equal(auto.length,259);
 for(const q of auto){const key=keys.keys[q.id],digest=text=>crypto.createHash('sha256').update(keys.packId+'|'+q.id+'|'+key.salt+'|'+text).digest('hex');
  assert.equal(digest(practice.canonicalAnswer(q.type,q.assessment.correct)),key.sha256,q.id);}
 for(const q of teacher.questions.filter(q=>q.assessment.mode!=='deterministic'))assert(!keys.keys[q.id],q.id);
 const text=JSON.stringify(keys);for(const word of ['assessment','rubric','hint','explanation','"correct"'])assert(!text.includes(word),word);});
test('canonical answers keep IDs: option order is irrelevant for sets, significant for token order',()=>{const {practice}=setup();
 assert.equal(practice.canonicalAnswer('multi_select',['b','a','a']),'multi_select:a,b');assert.equal(practice.canonicalAnswer('order_tokens',['t2','t1']),'order_tokens:t2,t1');
 assert.equal(practice.canonicalAnswer('match_pairs',{L2:'R1',L1:'R2'}),'match_pairs:L1=R2,L2=R1');assert.equal(practice.canonicalAnswer('match_pairs',{L1:''}),null);assert.equal(practice.canonicalAnswer('single_choice',''),null);});
test('Bài 33 practice: accept, collect, wrong then right, then waits for a teacher; no turn-in and no EXP',async()=>{const s=setup();
 const card=await toCard(s);assert.equal(card.status,'collected');assert.equal(card.mode,'practice');assert.equal(card.rewardEligible,false);assert.equal(s.client.getState().scope,'practice');
 const wrong=await s.client.answer('QUEST_TV1_B033',['O_WRONG']);assert.equal(wrong.correct,false);assert.equal(s.client.getRun('QUEST_TV1_B033').status,'collected');assert.equal(s.client.getRun('QUEST_TV1_B033').attempts,1);
 const right=await s.client.answer('QUEST_TV1_B033',[...correct('Q_TV1_B033_M1')].reverse());assert.equal(right.correct,true);
 assert.equal(s.client.getRun('QUEST_TV1_B033').status,'practice_pending');assert.equal(s.client.markers().get('NPC_LANG_VIET_THAY_DO'),'progress');
 await assert.rejects(s.client.turnIn('QUEST_TV1_B033','NPC_LANG_VIET_THAY_DO'),/thầy cô/);
 assert.equal([...s.store.keys()].filter(k=>/experience|quests:lang-viet/.test(k)).length,0,'practice never writes EXP or the village journal');
 assert.equal(s.fetched.filter(u=>u.includes('practice-keys')).length,1,'keys load once per pack');});
test('reading/writing/speaking levels are never self-graded in practice',async()=>{const s=setup();s.store.set('viet-village:learning-selection:v1:practice-a:primary',JSON.stringify({schemaVersion:1,uid:'practice-a',characterId:'primary',packId:'tv1-hk1-v1',selection:{questId:'QUEST_TV1_B031',difficulty:5,mode:'practice'}}));
 const card=await toCard(s,'QUEST_TV1_B031');assert.equal(card.questionId,'Q_TV1_B031_M5');
 const result=await s.client.answer('QUEST_TV1_B031',null);assert.equal(result.correct,null);assert.equal(result.teacherRequired,true);
 const run=s.client.getRun('QUEST_TV1_B031');assert.equal(run.status,'practice_pending');assert.equal(run.questionPassed,false);});
test('reload keeps the same run, seed, card point and level; it never creates a new run or reward',async()=>{const store=new Map(),first=setup({store});const card=await toCard(first);
 const again=setup({store});await again.client.refresh();const run=again.client.getRun('QUEST_TV1_B033');assert.equal(run.seed,card.seed);assert.deepEqual(plain(run.spawn),plain(card.spawn));assert.equal(run.status,'collected');
 await again.client.begin('QUEST_TV1_B033','NPC_LANG_VIET_TUAN_DINH');assert.equal(again.client.getRun('QUEST_TV1_B033').cycle,1);});
test('practice restart clears only that practice run; other accounts and corrupt records are kept',async()=>{const store=new Map(),s=setup({store});await toCard(s);
 await s.client.restart('QUEST_TV1_B033');assert.equal(s.client.getRun('QUEST_TV1_B033'),null);assert.equal(s.client.markers().get('NPC_LANG_VIET_TUAN_DINH'),'available');
 const other=setup({store,uid:'practice-b'});await other.client.refresh();assert.equal(other.client.getState().runs.length,0);
 store.set('viet-village:learning-practice:v1:practice-c:primary','{broken');const broken=setup({store,uid:'practice-c'});await assert.rejects(broken.client.refresh(),/giữ nguyên/);assert.equal(store.get('viet-village:learning-practice:v1:practice-c:primary'),'{broken');});
test('without Web Crypto (plain HTTP on another device) practice explains the limit instead of guessing',async()=>{const s=setup({subtle:null});await toCard(s);
 await assert.rejects(s.client.answer('QUEST_TV1_B033',correct('Q_TV1_B033_M1')),/HTTPS hoặc localhost/);assert.equal(s.client.getRun('QUEST_TV1_B033').status,'collected');});
