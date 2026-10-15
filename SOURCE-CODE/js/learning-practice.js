(function(global){
 'use strict';
 const PREFIX='viet-village:learning-practice:v1:';
 const AUTO=['single_choice','multi_select','order_tokens','match_pairs'];
 const fault=(code,message)=>Object.assign(new Error(message),{code:'learning/'+code});
 const copy=value=>JSON.parse(JSON.stringify(value));
 const finitePoint=p=>p&&['x','y','z'].every(k=>Number.isFinite(p[k]));
 // Same canonical form as canonical_answer() in scripts/import-tv1-quests.py.
 function canonicalAnswer(type,answer){
  if(type==='single_choice'&&typeof answer==='string'&&answer)return type+':'+answer;
  if(type==='multi_select'&&Array.isArray(answer)&&answer.every(v=>typeof v==='string'))return type+':'+[...new Set(answer)].sort().join(',');
  if(type==='order_tokens'&&Array.isArray(answer)&&answer.every(v=>typeof v==='string'))return type+':'+answer.join(',');
  if(type==='match_pairs'&&answer&&typeof answer==='object'&&!Array.isArray(answer)&&Object.values(answer).every(v=>typeof v==='string'&&v))
   return type+':'+Object.entries(answer).map(([left,right])=>left+'='+right).sort().join(',');
  return null;
 }
 // Static web hosting has no server to hide answers or verify play. This practice
 // service gives feedback from salted hashes that a player could still test by
 // guessing, keeps its own storage, grants no EXP and never confirms reading,
 // writing or speaking: those stay waiting for a teacher.
 global.createLearningPracticeService=function({getIdentity,storage,withLock,getClient,fetch:fetcher=global.fetch?.bind(global),subtle=global.crypto?.subtle,now=()=>Date.now(),random=()=>Math.random()}={}){
  const keys=new Map();
  const uid=()=>{let i;try{i=getIdentity?.();}catch(_){return null;}return i?.authenticated===true&&typeof i.uid==='string'&&i.uid.length>0&&i.uid.length<=128?i.uid:null;};
  const key=id=>PREFIX+encodeURIComponent(id)+':primary';
  async function sha256(text){if(!subtle)throw fault('crypto','Trình duyệt này chưa chấm luyện tập được (cần HTTPS hoặc localhost).');const bytes=new Uint8Array(await subtle.digest('SHA-256',new TextEncoder().encode(text)));return [...bytes].map(b=>b.toString(16).padStart(2,'0')).join('');}
  function read(id){const raw=storage?.getItem(key(id));if(raw==null)return {schemaVersion:1,uid:id,characterId:'primary',scope:'practice',runs:{}};
   let record;try{record=JSON.parse(raw);}catch(_){record=null;}
   if(record?.schemaVersion!==1||record.uid!==id||record.characterId!=='primary'||!record.runs||typeof record.runs!=='object')throw fault('practice-storage','Chưa đọc được tiến trình luyện tập đã lưu; dữ liệu cũ được giữ nguyên.');
   return record;}
  function write(id,record){const text=JSON.stringify(record);try{storage.setItem(key(id),text);}catch(_){throw fault('practice-storage','Chưa lưu được tiến trình luyện tập.');}if(storage.getItem(key(id))!==text)throw fault('practice-storage','Chưa xác minh được tiến trình luyện tập.');}
  async function keysFor(questId){const client=getClient(),pack=client.getPack(questId);if(!pack?.entry.practiceKeys)throw fault('practice-keys','Gói này chưa có dữ liệu luyện tập.');
   if(!keys.has(pack.entry.packId))keys.set(pack.entry.packId,(async()=>{const response=await fetcher(pack.folder+pack.entry.practiceKeys,{cache:'no-cache'});if(!response.ok)throw fault('practice-keys','Chưa tải được dữ liệu luyện tập (HTTP '+response.status+').');const value=await response.json();if(value?.schemaVersion!==1||value.packId!==pack.entry.packId||!value.keys)throw fault('practice-keys','Dữ liệu luyện tập không đúng gói.');return value;})().catch(e=>{keys.delete(pack.entry.packId);throw e;}));
   return {pack,data:await keys.get(pack.entry.packId)};}
  function chooseSpawn(pack,quest,seed){const step=quest.steps.find(s=>s.action==='collect_unique'),point=pack.catalog.spawnPoints?.find(p=>p.id===step?.spawn_slot);
   if(!point||point.validated!==true||point.questId!==quest.id||point.itemId!==step.item_ref||point.mapId!==quest.map_id)return null;
   const valid=(point.candidates||[]).filter(c=>c.validated===true&&finitePoint(c.position));if(!valid.length)return null;
   const chosen=valid[parseInt(seed.slice(0,8),16)%valid.length];return {pointId:point.id,candidateId:chosen.id,position:copy(chosen.position),mapId:point.mapId,itemId:point.itemId};}
  const response=(record,run,extra={})=>({runs:Object.values(record.runs).map(copy),...(run?{run:copy(run)}:{}),scope:'practice',role:'student',rewardsEnabled:false,...extra});
  async function change(id,operation){const run=async()=>{const record=read(id),result=await operation(record);if(result.write!==false)write(id,record);return result.value;};return withLock?withLock(key(id),run):run();}
  const methods={
   async state(id){return response(read(id));},
   async begin(id,data){const client=getClient(),quest=client.getQuest(data.questId),pack=client.getPack(data.questId);
    if(!quest||!pack||!quest.variants.some(v=>v.question_id===data.questionId))throw fault('invalid-argument','Phiên bản bài không thuộc nhiệm vụ này.');
    if(data.mode!=='practice'||data.npcId!==quest.giver_npc_ref)throw fault('invalid-argument','Hãy nhận bài từ đúng người giao.');
    return change(id,record=>{const current=record.runs[quest.id];
     if(current&&(current.status!=='completed'||data.repeat!==true))return {write:false,value:response(record,current,{resumed:true})};
     const seed=[0,1,2,3].map(()=>Math.floor(random()*0x100000000).toString(16).padStart(8,'0')).join('');
     const run={questId:quest.id,questionId:data.questionId,packId:pack.entry.packId,mode:'practice',scope:'practice',seed,spawn:chooseSpawn(pack,quest,seed),status:'accepted',questionPassed:false,practiceApproved:false,collectedItemId:null,rewardEligible:false,cycle:(current?.cycle||0)+1,startedAt:now()};
     record.runs[quest.id]=run;return {value:response(record,run,{resumed:false})};});},
   async collect(id,data){return change(id,record=>{const run=record.runs[data.questId],quest=getClient().getQuest(data.questId),step=quest?.steps.find(s=>s.action==='collect_unique');
    if(!run)throw fault('failed-precondition','Hãy nhận nhiệm vụ trước.');
    if(run.collectedItemId===step?.item_ref)return {write:false,value:response(record,run,{duplicate:true})};
    if(run.status!=='accepted'||run.spawn?.pointId!==data.pointId)throw fault('failed-precondition','Nhiệm vụ chưa ở bước tìm thẻ học.');
    Object.assign(run,{collectedItemId:step.item_ref,collectedPointId:data.pointId,status:'collected',collectedAt:now()});return {value:response(record,run,{duplicate:false})};});},
   async answer(id,data){const client=getClient(),quest=client.getQuest(data.questId);if(!quest)throw fault('not-found','Không có nhiệm vụ này.');
    const before=read(id).runs[quest.id];if(!before)throw fault('failed-precondition','Hãy nhận nhiệm vụ trước.');
    const question=client.getQuestion(before.questionId);let correct=null;
    if(AUTO.includes(question?.type)){const {pack,data:packKeys}=await keysFor(quest.id),entry=packKeys.keys[question.id],canonical=canonicalAnswer(question.type,data.answer);
     if(!entry||entry.type!==question.type)throw fault('practice-keys','Câu này chưa có dữ liệu luyện tập.');
     correct=!!canonical&&await sha256(pack.entry.packId+'|'+question.id+'|'+entry.salt+'|'+canonical)===entry.sha256;}
    return change(id,record=>{const run=record.runs[quest.id];if(!run||run.questionId!==before.questionId||run.cycle!==before.cycle)throw fault('aborted','Bài vừa được làm lại ở thẻ khác; hãy mở lại nhiệm vụ.');
     if(!run.collectedItemId)throw fault('failed-precondition','Hãy tìm thẻ học trước khi làm bài.');
     if(run.questionPassed||run.status==='practice_pending'&&run.practiceRequested)return {write:false,value:response(record,run,{correct:true,duplicate:true})};
     if(correct===null){Object.assign(run,{status:'practice_pending',practiceRequested:true});return {value:response(record,run,{correct:null,teacherRequired:true,message:'Phần đọc, viết hoặc nói cần thầy cô nghe và xác nhận.'})};}
     run.attempts=(run.attempts||0)+1;
     if(correct)Object.assign(run,{questionPassed:true,status:'practice_pending'});
     return {value:response(record,run,{correct,message:correct?'Đúng rồi! Phần thực hành cần thầy cô xác nhận.':'Chưa đúng. Em thử lại nhé.'})};});},
   async restart(id,data){return change(id,record=>{if(!record.runs[data.questId])throw fault('failed-precondition','Chưa có bài luyện tập này.');delete record.runs[data.questId];return {value:response(record,null,{cleared:data.questId})};});},
   async turnIn(){throw fault('practice-only','Luyện tập trên web chưa trả nhiệm vụ hoặc nhận EXP: cần thầy cô xác nhận phần thực hành.');}
  };
  return Object.freeze({async invoke(method,data){const id=uid();if(!id)throw fault('unauthenticated','Hãy đăng nhập Google để luyện tập.');
   if(!Object.hasOwn(methods,method))throw fault('practice-only','Chức năng này cần giáo viên và máy chủ; bản luyện tập trên web chưa hỗ trợ.');
   if(data?.characterId!=='primary')throw fault('invalid-argument','Yêu cầu nhiệm vụ không hợp lệ.');
   const result=await methods[method](id,data||{});if(uid()!==id)throw fault('account-changed','Tài khoản đã thay đổi; kết quả cũ chưa áp dụng.');return result;},
   canonicalAnswer,storagePrefix:PREFIX});
 };
})(typeof window==='undefined'?globalThis:window);
