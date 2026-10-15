(function(global){
 'use strict';
 const PREFIX='viet-village:learning-selection:v1:';
 const fault=(code,message)=>Object.assign(new Error(message),{code:'learning/'+code});
 const copy=value=>JSON.parse(JSON.stringify(value));
 const finitePoint=p=>p&&['x','y','z'].every(k=>Number.isFinite(p[k]));
 const MARKER_RANK={progress:1,available:2,ready:3};
 const PACK_PATH=/^[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_.-]+)*\.json$/;
 // Content packs are data registered in LEARNING/packs.json. This adapter never
 // grades answers or writes EXP: only the configured service (server, local
 // preview or labelled browser practice) advances a run. Local storage keeps the
 // last chosen lesson/level, never authority.
 global.createLearningQuestClient=function({getIdentity,storage,withLock,invoke,getContext=()=>({}),nearNpc=()=>false,fetch:fetcher=global.fetch?.bind(global),onChange=()=>{},registryUrl='../LEARNING/packs.json',assignmentsUrl='../LEARNING/default-assignments.json'}={}){
  const folder=registryUrl.replace(/[^/]*$/,'');
  let packs=[],questions=new Map(),quests=new Map(),lessons=new Map(),items=new Map(),packOf=new Map(),defaults=[],owner=null,selection=null,selectionError=null;
  let runs=new Map(),assignments=[],progression=null,role='student',scope='unavailable',rewardsEnabled=false,connected=false,loading=false,error=null,revision=0,loadPromise=null,stateRequested=-1;
  const pending=new Map();
  const uid=()=>{let i;try{i=getIdentity?.();}catch(_){return null;}return i?.authenticated===true&&typeof i.uid==='string'&&i.uid.length>0&&i.uid.length<=128?i.uid:null;};
  const key=id=>PREFIX+encodeURIComponent(id)+':primary';
  function emit(){try{onChange(getState());}catch(_){}}
  function sync(){const id=uid();if(owner===id)return;owner=id;revision++;runs=new Map();assignments=[];progression=null;role='student';scope='unavailable';rewardsEnabled=false;connected=false;error=null;selection=null;selectionError=null;
   if(id)try{const raw=storage?.getItem(key(id));if(raw!=null){const record=JSON.parse(raw);if(record?.schemaVersion!==1||record.uid!==id||record.characterId!=='primary'||typeof record.packId!=='string'||!record.selection)throw new Error('invalid');selection=record.selection;}}
   catch(_){selectionError='Chưa đọc được lựa chọn bài đã lưu. Giữ nguyên dữ liệu cũ; không ghi đè.';}
  }
  function getState(){sync();return {status:!owner?'signed-out':loading?'loading':packs.length?'ready':'unloaded',catalogReady:packs.length>0,connected,loading,busy:pending.size>0,error:error?.message||selectionError||null,selection:selection&&copy(selection),runs:[...runs.values()].map(copy),assignments:copy(assignments),progression:progression&&copy(progression),role,scope,rewardsEnabled,characterId:'primary'};}
  function requireOwner(id){if(!id||uid()!==id)throw fault('account-changed','Phiên tài khoản đã thay đổi. Hãy mở lại nhiệm vụ.');}
  function applyResult(value,id,requestRevision){requireOwner(id);if(revision!==requestRevision)throw fault('stale','Kết quả thuộc phiên nhiệm vụ cũ; hãy tải lại.');
   if(!value||typeof value!=='object')throw fault('response','Máy chủ trả dữ liệu nhiệm vụ không hợp lệ.');
   if(Array.isArray(value.runs))runs=new Map(value.runs.map(run=>[run.questId,copy(run)]));
   if(value.run){if(!quests.has(value.run.questId))throw fault('unknown-quest','Máy chủ trả nhiệm vụ ngoài bộ bài đã tải.');runs.set(value.run.questId,copy(value.run));}
   if(value.cleared){runs.delete(value.cleared);}
   if(Array.isArray(value.assignments))assignments=copy(value.assignments);
   if(value.progression)progression=copy(value.progression);
   if(['teacher','admin','student'].includes(value.role))role=value.role;
   if(typeof value.scope==='string')scope=value.scope;
   if(typeof value.rewardsEnabled==='boolean')rewardsEnabled=value.rewardsEnabled;
   connected=true;error=null;return value;
  }
  function request(method,payload={}){sync();const id=owner,version=revision,requestKey=String(id)+':'+method+':'+JSON.stringify(payload);
   if(pending.has(requestKey))return pending.get(requestKey);
   const task=Promise.resolve().then(async()=>{requireOwner(id);if(typeof invoke!=='function')throw fault('backend-unavailable','Dịch vụ nhiệm vụ chưa sẵn sàng. Có thể xem bài; chưa nhận nhiệm vụ, chấm bài hoặc nhận EXP.');
    const result=await invoke(method,{characterId:'primary',...payload});
    // A teacher operates on another student's record. Keep that result in the
    // teacher view, never replace the signed-in teacher's own runs/progression.
    if(['review','approve','assign'].includes(method)){requireOwner(id);if(revision!==version)throw fault('stale','Phiên nhiệm vụ đã thay đổi.');error=null;return result;}
    return applyResult(result,id,version);
   }).catch(cause=>{if(uid()===id&&version===revision){error=cause;
    // A denied classroom gate is a valid server response, not a lost connection.
    // Keep retry available while network/auth failures lock calls.
    if(!/(?:^|\/)(?:permission-denied|failed-precondition|invalid-argument|already-exists|not-found|out-of-range|resource-exhausted|aborted|not-assigned|practice-only)$/.test(cause?.code||''))connected=false;
   }throw cause;}).finally(()=>{if(pending.get(requestKey)===task)pending.delete(requestKey);emit();});
   pending.set(requestKey,task);emit();return task;
  }
  async function json(url,optional=false){const response=await fetcher(url,{cache:'no-cache'});if(optional&&response.status===404)return null;if(!response.ok)throw fault('catalog','Chưa tải được bộ bài (HTTP '+response.status+').');return response.json();}
  function register(entry,c,q){
   if(c?.schemaVersion!==1||c.packId!==entry.packId||!Array.isArray(c.quests)||!Array.isArray(q))throw fault('schema','Gói '+entry.packId+' không đúng định dạng hiện tại.');
   const unique=(id,map,kind)=>{if(typeof id!=='string'||map.has(id))throw fault('duplicate',kind+' trùng hoặc thiếu mã: '+id+'. Chưa nhập để tránh nhân đôi nhiệm vụ.');if(entry.idPrefix&&!id.includes('_'+entry.idPrefix+'_'))throw fault('prefix','Mã '+id+' không thuộc tiền tố gói '+entry.idPrefix+'.');};
   for(const item of q){unique(item.id,questions,'Câu hỏi');questions.set(item.id,item);}
   for(const quest of c.quests){unique(quest.id,quests,'Nhiệm vụ');if(!quest.variants?.length||!quest.variants.every(v=>questions.has(v.question_id)))throw fault('question','Nhiệm vụ thiếu phiên bản câu hỏi: '+quest.id);quests.set(quest.id,quest);packOf.set(quest.id,entry.packId);}
   for(const lesson of c.lessons||[])lessons.set(lesson.id,lesson);
   for(const item of c.items||[])items.set(item.id,item);
   packs.push({entry:copy(entry),catalog:c});
  }
  async function load(){sync();if(packs.length)return packs[0].catalog;if(loadPromise)return loadPromise;loading=true;emit();
   loadPromise=(async()=>{if(!fetcher)throw fault('fetch','Chưa có HTTP loader để đọc bộ bài.');
    const registry=await json(registryUrl);
    if(registry?.schemaVersion!==1||!Array.isArray(registry.packs)||!registry.packs.length)throw fault('registry','Danh mục gói nhiệm vụ không hợp lệ.');
    const ids=new Set();for(const entry of registry.packs){if(typeof entry?.packId!=='string'||ids.has(entry.packId)||![entry.catalog,entry.questions].every(p=>typeof p==='string'&&PACK_PATH.test(p)))throw fault('registry','Gói trùng mã hoặc đường dẫn không hợp lệ.');ids.add(entry.packId);}
    const loaded=await Promise.all(registry.packs.map(async entry=>[entry,...await Promise.all([json(folder+entry.catalog),json(folder+entry.questions)])]));
    const config=await json(assignmentsUrl,true);
    packs=[];questions=new Map();quests=new Map();lessons=new Map();items=new Map();packOf=new Map();
    try{for(const [entry,c,q] of loaded)register(entry,c,q);}catch(e){packs=[];quests=new Map();questions=new Map();throw e;}
    defaults=(config?.schemaVersion===1&&Array.isArray(config.assignments)?config.assignments:[]).filter(a=>ids.has(a.packId)&&Array.isArray(a.questIds)).map(a=>({packId:a.packId,difficulty:Number(a.difficulty)||1,questIds:a.questIds.filter(id=>packOf.get(id)===a.packId)}));
    error=null;return packs[0].catalog;
   })().catch(cause=>{error=cause;throw cause;}).finally(()=>{loading=false;loadPromise=null;emit();});return loadPromise;
  }
  async function refresh(){await load();stateRequested=revision;return request('state');}
  // Markers need the player's real state; request it once per signed-in account.
  function ensureState(){if(owner&&packs.length&&!connected&&!loading&&!pending.size&&stateRequested!==revision){stateRequested=revision;refresh().catch(()=>{});}}
  function getQuest(id){return quests.get(id)||null;}
  function getQuestion(id){return questions.get(id)||null;}
  function getLesson(id){return lessons.get(id)||null;}
  function getItem(id){return items.get(id)||null;}
  function getPack(questId){const id=packOf.get(questId);const pack=packs.find(p=>p.entry.packId===id);return pack?{entry:copy(pack.entry),catalog:pack.catalog,folder}:null;}
  function getRun(id){sync();return runs.has(id)?copy(runs.get(id)):null;}
  function difficultyOf(questionId){for(const q of quests.values()){const v=q.variants.find(v=>v.question_id===questionId);if(v)return v.difficulty;}return null;}
  function levelLabel(questId,difficulty){const pack=getPack(questId);return pack?.catalog.levels?.find(l=>l.difficulty===difficulty)?.student_label||'';}
  // Lessons offered to this player: their own runs, then teacher assignments
  // (server) or the configured default assignment (local preview / web practice).
  function offered(){sync();if(!packs.length)return [];const list=new Map();
   const add=(questId,source,difficulty,mode)=>{if(!quests.has(questId)||list.has(questId))return;list.set(questId,{questId,source,difficulty,mode});};
   for(const run of runs.values())add(run.questId,'run',difficultyOf(run.questionId),run.mode);
   if(scope==='server'){for(const a of assignments)if(a?.active!==false)add(a.questId,'assignment',difficultyOf(a.questionId),a.mode);}
   else if(connected){if(selection)add(selection.questId,'selection',Number(selection.difficulty)||null,null);for(const a of defaults)for(const id of a.questIds)add(id,'default',a.difficulty,null);}
   return [...list.values()].map(entry=>{const run=runs.get(entry.questId),q=quests.get(entry.questId);
    const difficulty=(run&&difficultyOf(run.questionId))||entry.difficulty||(selection?.questId===entry.questId?Number(selection.difficulty):null)||1;
    return {...entry,difficulty,levelLabel:levelLabel(entry.questId,difficulty),status:run?.status||'available',giverNpc:q.giver_npc_ref,returnNpc:q.return_npc_ref,eligible:eligible(entry,q)};});
  }
  // Classroom work ignores LV and earlier quests; adventure keeps both gates.
  function eligible(entry,q){if(scope!=='server')return true;if(entry.mode!=='adventure')return true;const gate=q.gates?.adventure_mode||{};
   if(!Number.isFinite(progression?.level)||progression.level<(gate.min_level||1))return false;return !gate.previous_quest||runs.get(gate.previous_quest)?.status==='completed';}
  function modeFor(entry){return scope==='localhost-preview'?'preview':scope==='practice'?'practice':entry.mode==='adventure'?'adventure':'classroom';}
  function markers(){sync();ensureState();const out=new Map(),put=(npc,kind)=>{if(npc&&(!out.has(npc)||MARKER_RANK[kind]>MARKER_RANK[out.get(npc)]))out.set(npc,kind);};
   for(const o of offered()){const run=runs.get(o.questId);
    if(run?.status==='ready_to_turn_in')put(o.returnNpc,'ready');
    else if(run&&run.status!=='completed')put(o.returnNpc,'progress');
    else if(!run&&o.eligible)put(o.giverNpc,'available');}
   return out;}
  // Shared quest-board entries (NPC markers, dialogue, journal, tracker). Same
  // offered list and runs as markers(); LV is only used for adventure gates.
  function questEntries({level=null}={}){sync();ensureState();const QS=global.VietVillageQuestStatus;if(!QS)return [];
   return QS.evaluateLearning({offered:offered(),getQuest,getRun,getLesson,level,state:getState(),nameOf:id=>({NPC_LANG_VIET_THAY_DO:'Thầy đồ',NPC_LANG_VIET_TUAN_DINH:'Tuần đinh',NPC_LANG_VIET_LY_TRUONG:'Lý trưởng'})[id]||null});}
  async function select(value){sync();const id=owner;requireOwner(id);if(selectionError)throw fault('stored-selection',selectionError);
   const q=getQuest(value.questId),difficulty=Number(value.difficulty);if(!q||!q.variants.some(v=>v.difficulty===difficulty)||!['classroom','adventure','preview','practice'].includes(value.mode))throw fault('selection','Bài hoặc mức học tập chưa hợp lệ.');
   const next={questId:q.id,difficulty,mode:value.mode};
   const save=()=>{requireOwner(id);const record={schemaVersion:1,uid:id,characterId:'primary',packId:packOf.get(q.id),selection:next};try{if(!storage?.setItem)throw new Error('storage');storage.setItem(key(id),JSON.stringify(record));}catch(_){throw fault('storage','Chưa lưu được lựa chọn bài. Hãy thử lại.');}selection=next;emit();return copy(next);};
   return withLock?withLock(key(id),save):save();
  }
  function validateContext(){const c=getContext();if(!c||c.alive!==true)throw fault('not-alive','Nhân vật cần còn sống để thực hiện nhiệm vụ.');if(c.transitioning)throw fault('transition','Hãy chờ chuyển MAP hoàn tất.');if(c.mapId!=='lang-viet'||c.inVillage===false)throw fault('map','Nhiệm vụ này thực hiện ngoài trời trong Làng Việt.');return c;}
  function requireNpc(id){validateContext();if(!nearNpc(id))throw fault('npc-range','Hãy đến gần đúng dân làng để nhận hoặc trả nhiệm vụ.');}
  async function begin(questId,npcId,{repeat=false}={}){await load();const q=getQuest(questId);if(!q)throw fault('quest','Chưa có nhiệm vụ này.');
   if(npcId!==q.giver_npc_ref)throw fault('npc','Hãy nhận nhiệm vụ từ đúng người giao.');requireNpc(npcId);
   if(!connected)await refresh();
   const entry=offered().find(o=>o.questId===questId);if(!entry)throw fault('not-assigned','Bài này chưa được giao cho em.');
   const variant=q.variants.find(v=>v.difficulty===entry.difficulty)||q.variants[0],mode=modeFor(entry);
   await select({questId,difficulty:variant.difficulty,mode});
   return request('begin',{questId,questionId:variant.question_id,mode,npcId,...(repeat===true?{repeat:true}:{})});
  }
  async function collect(questId,pointId){const c=validateContext(),run=getRun(questId);if(!run||run.status!=='accepted')throw fault('inactive','Thẻ chỉ hiện cho nhiệm vụ đang thực hiện.');
   const point=run.position||run.spawn?.position;if(!finitePoint(point)||!finitePoint(c.position))throw fault('unplaced','Điểm đặt thẻ chưa được kiểm tra.');
   if(pointId!==(run.pointId||run.spawn?.pointId)||Math.hypot(c.position.x-point.x,c.position.z-point.z)>1.6||Math.abs(c.position.y-point.y)>.85)throw fault('collect-range','Hãy đi lại gần thẻ học để nhặt.');return request('collect',{questId,pointId});
  }
  function answer(questId,answer){validateContext();return request('answer',{questId,answer});}
  function turnIn(questId,npcId){const q=getQuest(questId);if(!q||npcId!==q.return_npc_ref)return Promise.reject(fault('npc','Hãy trả nhiệm vụ cho đúng người nhận.'));try{requireNpc(npcId);}catch(e){return Promise.reject(e);}return request('turnIn',{questId,npcId});}
  // Browser practice only: start the same lesson again. Server runs are never reset here.
  function restart(questId){if(scope!=='practice')return Promise.reject(fault('practice-only','Chỉ luyện tập trên web mới làm lại từ đầu.'));return request('restart',{questId});}
  function approve(value){return request('approve',value);}
  function assign(value){return request('assign',value);}
  function review(value){return request('review',value);}
  function lock(){owner=null;revision++;runs=new Map();assignments=[];progression=null;selection=null;connected=false;error=null;emit();}
  return Object.freeze({load,refresh,getState,getQuest,getQuestion,getLesson,getItem,getPack,getRun,offered,markers,questEntries,select,begin,collect,answer,turnIn,restart,approve,assign,review,lock,
   get catalog(){return packs[0]?.catalog||null;},get packs(){return packs.map(p=>copy(p.entry));},storagePrefix:PREFIX});
 };
})(typeof window==='undefined'?globalThis:window);
