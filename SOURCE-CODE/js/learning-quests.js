(function(global){
 'use strict';
 const PACK='tv1-hk1-v1', PREFIX='viet-village:learning-selection:v1:';
 const fault=(code,message)=>Object.assign(new Error(message),{code:'learning/'+code});
 const copy=value=>JSON.parse(JSON.stringify(value));
 const finitePoint=p=>p&&['x','y','z'].every(k=>Number.isFinite(p[k]));
 // This adapter never grades answers or writes EXP. Only authenticated server
 // responses can advance a run. Local storage holds browsing choices, not authority.
 global.createLearningQuestClient=function({getIdentity,storage,withLock,invoke,getContext=()=>({}),nearNpc=()=>false,fetch:fetcher=global.fetch?.bind(global),onChange=()=>{},catalogUrl='../LEARNING/TV1-HK1/catalog.json',questionsUrl='../LEARNING/TV1-HK1/questions.public.json'}={}){
  let catalog=null,questions=new Map(),quests=new Map(),owner=null,selection=null,selectionError=null;
  let runs=new Map(),assignments=[],progression=null,role='student',scope='unavailable',rewardsEnabled=false,connected=false,loading=false,error=null,revision=0,loadPromise=null;
  const pending=new Map();
  const uid=()=>{let i;try{i=getIdentity?.();}catch(_){return null;}return i?.authenticated===true&&typeof i.uid==='string'&&i.uid.length>0&&i.uid.length<=128?i.uid:null;};
  const key=id=>PREFIX+encodeURIComponent(id)+':primary';
  function emit(){try{onChange(getState());}catch(_){}}
  function sync(){const id=uid();if(owner===id)return;owner=id;revision++;runs=new Map();assignments=[];progression=null;role='student';scope='unavailable';rewardsEnabled=false;connected=false;error=null;selection=null;selectionError=null;
   if(id)try{const raw=storage?.getItem(key(id));if(raw!=null){const record=JSON.parse(raw);if(record?.schemaVersion!==1||record.uid!==id||record.characterId!=='primary'||record.packId!==PACK||!record.selection)throw new Error('invalid');selection=record.selection;}}
   catch(_){selectionError='Chưa đọc được lựa chọn bài đã lưu. Giữ nguyên dữ liệu cũ; không ghi đè.';}
  }
  function getState(){sync();return {status:!owner?'signed-out':loading?'loading':catalog?'ready':'unloaded',catalogReady:!!catalog,connected,loading,busy:pending.size>0,error:error?.message||selectionError||null,selection:selection&&copy(selection),runs:[...runs.values()].map(copy),assignments:copy(assignments),progression:progression&&copy(progression),role,scope,rewardsEnabled,characterId:'primary'};}
  function requireOwner(id){if(!id||uid()!==id)throw fault('account-changed','Phiên tài khoản đã thay đổi. Hãy mở lại nhiệm vụ.');}
  function applyResult(value,id,requestRevision){requireOwner(id);if(revision!==requestRevision)throw fault('stale','Kết quả thuộc phiên nhiệm vụ cũ; hãy tải lại.');
   if(!value||typeof value!=='object')throw fault('response','Máy chủ trả dữ liệu nhiệm vụ không hợp lệ.');
   if(Array.isArray(value.runs))runs=new Map(value.runs.map(run=>[run.questId,copy(run)]));
   if(value.run){if(!quests.has(value.run.questId))throw fault('unknown-quest','Máy chủ trả nhiệm vụ ngoài bộ bài đã tải.');runs.set(value.run.questId,copy(value.run));}
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
    // Keep retry/mode switching available while network/auth failures lock calls.
    if(!/(?:^|\/)(?:permission-denied|failed-precondition|invalid-argument|already-exists|not-found|out-of-range|resource-exhausted|aborted)$/.test(cause?.code||''))connected=false;
   }throw cause;}).finally(()=>{if(pending.get(requestKey)===task)pending.delete(requestKey);emit();});
   pending.set(requestKey,task);emit();return task;
  }
  async function load(){sync();if(catalog)return catalog;if(loadPromise)return loadPromise;loading=true;emit();
   loadPromise=(async()=>{if(!fetcher)throw fault('fetch','Chưa có HTTP loader để đọc bộ bài.');const [a,b]=await Promise.all([fetcher(catalogUrl,{cache:'no-cache'}),fetcher(questionsUrl,{cache:'no-cache'})]);
    if(!a.ok||!b.ok)throw fault('catalog','Chưa tải được bộ bài (HTTP '+(!a.ok?a.status:b.status)+').');const [c,q]=await Promise.all([a.json(),b.json()]);
    if(c?.schemaVersion!==1||c.packId!==PACK||!Array.isArray(c.quests)||!Array.isArray(q))throw fault('schema','Bộ bài không đúng định dạng hiện tại.');
    const byQuest=new Map(c.quests.map(item=>[item.id,item])),byQuestion=new Map(q.map(item=>[item.id,item]));
    if(byQuest.size!==c.quests.length||byQuestion.size!==q.length)throw fault('duplicate','Bộ bài có ID trùng; chưa nhập để tránh nhân đôi nhiệm vụ.');
    for(const quest of c.quests)if(!quest.variants?.every(v=>byQuestion.has(v.question_id)))throw fault('question','Nhiệm vụ thiếu phiên bản câu hỏi: '+quest.id);
    catalog=c;quests=byQuest;questions=byQuestion;error=null;return catalog;
   })().catch(cause=>{error=cause;throw cause;}).finally(()=>{loading=false;loadPromise=null;emit();});return loadPromise;
  }
  async function refresh(){await load();return request('state');}
  function getQuest(id){return quests.get(id)||null;}
  function getQuestion(id){return questions.get(id)||null;}
  function getRun(id){sync();return runs.has(id)?copy(runs.get(id)):null;}
  function filter({subject,grade,week,difficulty}={}){if(!catalog||subject&&subject!==catalog.subject||grade&&Number(grade)!==Number(catalog.grade))return [];
   return catalog.quests.filter(q=>(!week||q.week===Number(week))&&(!difficulty||q.variants.some(v=>v.difficulty===Number(difficulty))));}
  async function select(value){sync();const id=owner;requireOwner(id);if(selectionError)throw fault('stored-selection',selectionError);
   const q=getQuest(value.questId),difficulty=Number(value.difficulty);if(!q||!q.variants.some(v=>v.difficulty===difficulty)||!['classroom','adventure','preview'].includes(value.mode))throw fault('selection','Hãy chọn bài, tuần và mức học tập hợp lệ.');
   const next={questId:q.id,difficulty,mode:value.mode};
   const save=()=>{requireOwner(id);const record={schemaVersion:1,uid:id,characterId:'primary',packId:PACK,selection:next};try{if(!storage?.setItem)throw new Error('storage');storage.setItem(key(id),JSON.stringify(record));}catch(_){throw fault('storage','Chưa lưu được lựa chọn bài. Hãy thử lại.');}selection=next;emit();return copy(next);};
   return withLock?withLock(key(id),save):save();
  }
  function validateContext(){const c=getContext();if(!c||c.alive!==true)throw fault('not-alive','Nhân vật cần còn sống để thực hiện nhiệm vụ.');if(c.transitioning)throw fault('transition','Hãy chờ chuyển MAP hoàn tất.');if(c.mapId!=='lang-viet'||c.inVillage===false)throw fault('map','Nhiệm vụ này thực hiện ngoài trời trong Làng Việt.');return c;}
  function requireNpc(id){validateContext();if(!nearNpc(id))throw fault('npc-range','Hãy đến gần đúng dân làng để nhận hoặc trả nhiệm vụ.');}
  async function begin(questId,difficulty,mode='classroom',npcId,repeat=false){await load();const q=getQuest(questId);if(!q)throw fault('quest','Chưa có nhiệm vụ này.');const v=q.variants.find(v=>v.difficulty===Number(difficulty));if(!v)throw fault('variant','Mức học tập chưa hợp lệ.');
   if(npcId!==q.giver_npc_ref)throw fault('npc','Hãy nhận nhiệm vụ từ đúng người giao.');requireNpc(npcId);await select({questId,difficulty,mode});
   return request('begin',{questId,questionId:v.question_id,mode,npcId,...(repeat===true?{repeat:true}:{})});
  }
  async function collect(questId,pointId){const c=validateContext(),run=getRun(questId);if(!run||run.status!=='accepted')throw fault('inactive','Thẻ chỉ hiện cho nhiệm vụ đang thực hiện.');
   const point=run.position||run.spawn?.position;if(!finitePoint(point)||!finitePoint(c.position))throw fault('unplaced','Điểm đặt thẻ chưa được kiểm tra.');
   if(pointId!==(run.pointId||run.spawn?.pointId)||Math.hypot(c.position.x-point.x,c.position.z-point.z)>1.6||Math.abs(c.position.y-point.y)>.85)throw fault('collect-range','Hãy đi lại gần thẻ học để nhặt.');return request('collect',{questId,pointId});
  }
  function answer(questId,answer){validateContext();return request('answer',{questId,answer});}
  function turnIn(questId,npcId){const q=getQuest(questId);if(!q||npcId!==q.return_npc_ref)return Promise.reject(fault('npc','Hãy trả nhiệm vụ cho đúng người nhận.'));try{requireNpc(npcId);}catch(e){return Promise.reject(e);}return request('turnIn',{questId,npcId});}
  function approve(value){return request('approve',value);}
  function assign(value){return request('assign',value);}
  function review(value){return request('review',value);}
  function lock(){owner=null;revision++;runs=new Map();assignments=[];progression=null;selection=null;connected=false;error=null;emit();}
  return Object.freeze({load,refresh,getState,getQuest,getQuestion,getRun,filter,select,begin,collect,answer,turnIn,approve,assign,review,lock,get catalog(){return catalog;},storagePrefix:PREFIX});
 };
})(typeof window==='undefined'?globalThis:window);
