(function(global){
 'use strict';
 global.createVillageNPCController=function({THREE,region,getState,getIdentity,getJourney,healPlayer,onHealed,storage,pause,goTo,notify,loadData,onActivityCompleted=()=>{},onLearningOpen=null,getLearningEntries=null,getLevel=null,getCamera=null,onQuestBoardChange=null,getLesson=definition=>global.resolveVillageLesson(definition)}){
  const el=id=>document.getElementById(id),panel=el('npcDialog'),menu=el('npcDirectory'),prompt=el('npcInteractBtn');
  let data=null,actors=null,journal=null,loading=null,opened=null,menuOpen=false,nearest=null,error='',pulse=0,elapsed=0,disposed=false;
  const listeners=[],ambientRemaining=new Map();let animationButtons=[],pendingGreeting=null,lessonSession=null,lessonView=null,lessonIdentity=null,lessonError='',lessonReactions=[];
  let dialogueVersion=0,healing=false,questReaction=null;
  // Shared quest evaluation for markers, dialogue, journal, tracker and minimap.
  // Re-evaluated after events (accept, objective, turn-in, LV, learning state,
  // account, map, storage) plus a slow safety refresh; never every frame.
  const QS=global.VietVillageQuestStatus,TRACK_PREFIX='viet-village:quest-tracking:v1:';
  let board={status:'signed-out',entries:[],markers:new Map(),tracked:null,uid:null,errors:[],revision:0},boardSignature='',boardDirty=true,boardWait=0,boardSafety=0,boardUid,boardInVillage,validation=null;
  function invalidateQuests(){boardDirty=true;}
  function currentUid(){try{const i=getIdentity();return i?.authenticated&&typeof i.uid==='string'&&i.uid.length&&i.uid.length<=128?i.uid:null;}catch(_){return null;}}
  function readTracked(uid){try{const r=JSON.parse(storage?.getItem(TRACK_PREFIX+encodeURIComponent(uid))||'null');return r?.schemaVersion===1&&r.uid===uid&&typeof r.questId==='string'?r.questId:null;}catch(_){return null;}}
  function levelNow(){try{const v=getLevel?.();return Number.isInteger(v)&&v>=1?v:null;}catch(_){return null;}}
  function npcName(id){return actors?.npcs.get(id)?.definition.name||actors?.props.get(id)?.definition.name||null;}
  function canStart(id,phases){
   const q=data?.quests.quests.find(q=>q.id===id);if(!q||!QS||validation?.invalid.has(id))return false;
   return QS.evaluateCondition(QS.requirementsOf(q),{level:levelNow(),phaseOf:x=>phases[x],nameOf:()=>null}).met===true;
  }
  function computeBoard(){
   const uid=currentUid(),s=getState();
   if(!uid||!s.authenticated||!QS)return {status:'signed-out',entries:[],markers:new Map(),tracked:null,uid:null,errors:[]};
   if(!data||!journal)return {status:error?'error':'loading',entries:[],markers:new Map(),tracked:null,uid,errors:[]};
   const readable=journal.readable,phases=readable?journal.snapshot():{};
   const village=QS.evaluateVillage({quests:data.quests.quests,readable,phaseOf:id=>readable?phases[id]:null,level:levelNow(),nameOf:npcName,
    rewardOf:id=>global.VillageExperienceConfig?.rewards.quests[id]??null,validation});
   let learning=[];try{learning=getLearningEntries?.({level:levelNow()})||[];}catch(_){learning=[];}
   const entries=[...village,...learning],tracked=QS.pickTracked(entries,readTracked(uid));
   return {status:readable?'ready':'error',entries,markers:QS.markers(entries,{tracked}),tracked,uid,errors:validation?.errors||[]};
  }
  function refreshBoard(){
   const next=computeBoard();boardDirty=false;boardSafety=0;
   const signature=JSON.stringify([next.status,next.uid,next.tracked,next.entries.map(e=>[e.id,e.state,e.objective?.done,e.objective?.text,e.requirements?.met]),[...next.markers]]);
   if(signature===boardSignature)return board;
   boardSignature=signature;board=Object.freeze({...next,revision:board.revision+1});
   if(actors)for(const id of actors.npcs.keys()){const m=board.markers.get(id);actors.setMarker(id,m?.kind||null,m?.category,m?.questId);}
   if(opened&&actors?.npcs.has(opened))questLines(actors.npcs.get(opened).definition);
   if(menuOpen)renderJournal();
   try{onQuestBoardChange?.(board);}catch(_){}
   return board;
  }
  function track(questId){
   const uid=currentUid(),entry=board.entries.find(e=>e.id===questId);
   if(!uid||!entry||!['available','active','ready'].includes(entry.state))return false;
   if(readTracked(uid)===questId){invalidateQuests();refreshBoard();return true;}
   try{storage.setItem(TRACK_PREFIX+encodeURIComponent(uid),JSON.stringify({schemaVersion:1,uid,questId}));}catch(_){notify('Chưa lưu được nhiệm vụ theo dõi trên trình duyệt này.');return false;}
   invalidateQuests();refreshBoard();return true;
  }
  function resetAmbient(id){const a=actors?.npcs.get(id)?.definition.model?.ambient;if(a)ambientRemaining.set(id,a.minDelay+Math.random()*(a.maxDelay-a.minDelay));}
  function listen(node,event,fn){node?.addEventListener(event,fn);listeners.push(()=>node?.removeEventListener?.(event,fn));}
  function hide(node,value){node.classList[value?'add':'remove']('hidden');}
  function button(text,action,id){const b=document.createElement('button');b.type='button';b.textContent=text;if(id)b.id=id;b.onclick=action;return b;}
  // Player reactions are visual only; a failed/absent avatar must not interrupt
  // the already validated lesson, journal, healing or NPC animation workflow.
  function playerReaction(type,detail={}){try{return global.VietVillagePlayerAvatar?.onInteraction?.({type,npcId:opened,...detail});}catch(e){console.warn('Chưa phát được động tác người chơi khi trò chuyện.',e);return false;}}
  function lessonReaction(events){
   lessonReactions.push(...events);
   if(events.includes('agree'))playerReaction('npc-agree',{activityId:lessonSession.lesson.id});
   if(events.includes('clap'))playerReaction('activity-complete',{clip:'clap',activityId:lessonSession.lesson.id});
   if(events.includes('clap')&&lessonSession.state.completed)onActivityCompleted('lessons',lessonSession.lesson.id);
  }
  function close({focus=true}={}){if(opened)playerReaction('npc-close');dialogueVersion++;healing=false;questReaction=null;actors?.npcs.get(opened)?.visual?.returnToIdle();resetAmbient(opened);opened=null;pendingGreeting=null;animationButtons=[];lessonSession=null;lessonView=null;lessonIdentity=null;lessonError='';lessonReactions=[];menuOpen=false;panel.classList.remove('npc-demo-mode');hide(panel,true);hide(menu,true);pause();if(focus)document.activeElement?.blur?.();}
  function travelToPoint(point){close();const state=getState();if(!state.inVillage||!state.authenticated)return false;return goTo(point);}
  function route(id){const item=actors?.npcs.get(id)||actors?.props.get(id);return item?travelToPoint(item.definition.approach):false;}
  function usable(state=getState()){return !!actors&&!opened&&!menuOpen&&state.authenticated&&state.inVillage&&!state.transitioning&&state.canInteract&&getJourney()?.alive===true;}
  function inRange(n,state=getState()){
   return Math.hypot(state.position.x-n.position.x,state.position.z-n.position.z)<=n.interactionRadius&&Math.abs(state.position.y-n.position.y)<.85;
  }
  function closest(state=getState()){
   let id=null,best=Infinity;
   if(usable(state))for(const {definition:n} of actors.npcs.values())if(inRange(n,state)){
    const distance=Math.hypot(state.position.x-n.position.x,state.position.z-n.position.z);
    if(distance<best){best=distance;id=n.id;}
   }
   return id;
  }
  function canStudy(version){return !!lessonSession&&conversationValid(version);}
  function heal(version){
   if(version!==dialogueVersion||!opened)return;
   const actor=actors?.npcs.get(opened),s=getState(),box=el('npcServiceStatus');
   if(!data.dialogues.dialogues[actor?.definition.dialogueId]?.healing)return;
   if(!s.authenticated||getIdentity()?.uid!==lessonIdentity){box.textContent='Phiên đăng nhập đã thay đổi. Hãy mở lại hội thoại.';return;}
   if(getJourney()?.alive!==true){box.textContent='Nhân vật không còn sống; chưa hỗ trợ hồi sinh.';return;}
   if(!s.inVillage||s.transitioning||!inRange(actor.definition,s)){box.textContent='Hãy đứng gần Thầy thuốc tại Làng Việt để hồi phục.';return;}
   if(healing||pendingGreeting||actor.visual?.animationState.busy){box.textContent='Thầy thuốc đang thực hiện động tác. Hãy chờ một chút.';return;}
   healing=true;
   try{
    const result=healPlayer?.();box.textContent=result?.message||'Chưa kết nối được chỉ số HP. Hãy thử lại sau.';
    if(result?.ok){actor.visual?.playOnce('agree');playerReaction('npc-agree',{activityId:'healing'});onHealed?.(result);notify(result.message);}
   }finally{healing=false;updateAnimationUI();}
  }
  function renderLesson(){
   const box=el('npcLesson');box.replaceChildren();if(lessonError){box.textContent=lessonError;return;}
   box.textContent='';if(!lessonSession||!lessonView)return;
   const version=dialogueVersion,{lesson,state}=lessonSession,title=document.createElement('h3');title.textContent=lesson.title;box.append(title);
   const text=document.createElement('p');text.textContent=lessonView==='study'?lesson.knowledge:lesson.question;box.append(text);
   const lessonExp=global.VillageExperienceConfig?.rewards.lessons[lesson.id];
   if(lessonExp){const reward=document.createElement('small');reward.textContent='Hoàn thành học và trả lời đúng: '+lessonExp+' EXP Alpha · Nhận một lần cho nhân vật.';box.append(reward);}
   if(lessonView==='question'){
    const choices=document.createElement('div');choices.className='npc-actions';box.append(choices);
    lesson.answers.forEach((answer,index)=>{const b=button(answer,()=>{
     if(!canStudy(version))return;lessonReaction(lessonSession.answer(index));renderLesson();updateAnimationUI();
     if(lessonSession.state.correct)el('closeNpcDialog').focus?.();else el('npcLesson').querySelector?.('button')?.focus();
    },'npc-answer-'+index);b.disabled=state.correct;choices.append(b);});
   }
   const feedback=document.createElement('p');feedback.id='npcLessonFeedback';feedback.setAttribute?.('role','status');feedback.setAttribute?.('aria-live','polite');
   feedback.textContent=state.feedback+(state.completed?' Đã hoàn thành bài học.':state.correct?' Chọn Học bài để ôn kiến thức và hoàn thành.':'');box.append(feedback);
  }
  function showLesson(view,version){if(!canStudy(version))return;lessonView=view;if(view==='study')lessonReaction(lessonSession.study());renderLesson();updateAnimationUI();if(view==='question')el('npcLesson').querySelector?.('button')?.focus();}
  function conversationValid(version,npcId=opened){
   const actor=actors?.npcs.get(opened),s=getState();
   return version===dialogueVersion&&opened===npcId&&!!actor&&s.authenticated&&getIdentity()?.uid===lessonIdentity&&s.inVillage&&!s.transitioning&&getJourney()?.alive===true&&inRange(actor.definition,s);
  }
  function questInformation(d){
   const q=data.quests.quests.find(q=>q.id===d.questHelp.questId);
   if(!q)return 'Chưa có cấu hình nhiệm vụ làm vườn. Hiện chỉ có thể trò chuyện.';
   if(!q.enabled)return q.name+' · Chưa mở: '+q.reason;
   const state={available:'Chưa nhận',active:'Đang thực hiện',ready:'Đủ điều kiện trả nhiệm vụ',completed:'Đã hoàn thành'}[journal.status(q.id)];
   return q.name+' · '+state+'. '+q.goal;
  }
  function stateText(entry,npcId){
   if(entry.source==='learning')return {available:'Có thể nhận',accepted:'Đang làm · Tìm thẻ học',collected:'Đang làm · Làm bài',practice_pending:'Chờ thầy cô xác nhận',ready_to_turn_in:'Có thể trả nhiệm vụ',completed:'Đã hoàn thành'}[entry.learning?.status]||QS.stateLabel(entry.state);
   if(entry.state==='ready')return entry.turnInNpc===npcId?'Đã đạt mục tiêu · Trả nhiệm vụ tại đây':'Đã đạt mục tiêu · Trả cho '+(npcName(entry.turnInNpc)||'người nhận');
   if(entry.state==='active'&&entry.turnInNpc===npcId&&entry.objective?.targetNpc!==npcId)return 'Đang thực hiện · Chưa đủ điều kiện trả';
   return QS.stateLabel(entry.state);
  }
  function requirementList(items,parent){
   const list=document.createElement('ul');list.className='npc-quest-requirements';parent.append(list);
   for(const item of items){const li=document.createElement('li');li.textContent=(item.met===true?'✓ ':item.met===null?'… ':'✗ ')+item.label;li.className=item.met===true?'met':'unmet';list.append(li);
    if(item.type==='any')requirementList(item.options,li);}
  }
  function showPrerequisite(entry,version,npcId){
   if(!conversationValid(version,npcId))return;
   const box=el('npcServiceStatus'),missing=entry.requirements.items.flatMap(i=>i.type==='any'?i.options:[i]).filter(i=>i.met!==true);
   const questItem=missing.find(i=>i.type==='quest'),prior=questItem&&board.entries.find(e=>e.id===questItem.quest);
   box.replaceChildren();
   if(!missing.length){box.textContent='Đã đủ điều kiện. Hãy mở lại hội thoại để nhận nhiệm vụ.';return;}
   if(!prior||!prior.revealed&&prior.state!=='completed'){box.textContent=missing.map(i=>i.label).join(' · ')+'. Hãy tiếp tục hành trình chính để mở nhiệm vụ này.';return;}
   const where=prior.state==='available'?prior.giverNpc:prior.state==='ready'?prior.turnInNpc:prior.state==='active'?prior.objective?.targetNpc||prior.turnInNpc:null;
   box.textContent='Nhiệm vụ trước: “'+prior.name+'” ('+prior.categoryLabel+') · '+QS.stateLabel(prior.state)+'. Nhận tại '+(npcName(prior.giverNpc)||'—')+', trả cho '+(npcName(prior.turnInNpc)||'—')+'.';
   if(where&&actors?.npcs.has(where))box.append(button('Đi tới '+npcName(where),()=>{if(conversationValid(version,npcId))route(where);},'npc-route-prereq'));
  }
  function questRow(entry,npc,d,version,tracked){
   const row=document.createElement('div');row.className='npc-quest npc-quest-'+entry.category+' npc-quest-state-'+entry.state;
   const title=document.createElement('strong');title.textContent=entry.name;row.append(title);
   const tag=document.createElement('span');tag.className='npc-quest-tag';tag.textContent=entry.categoryLabel+(entry.id===tracked?' · Đang theo dõi':'');row.append(tag);
   const label=document.createElement('p');label.className='npc-quest-status';label.textContent=stateText(entry,npc.id);row.append(label);
   if(entry.state==='locked'){const p=document.createElement('p');p.textContent='Điều kiện mở:';row.append(p);requirementList(entry.requirements.items,row);}
   else{
    if(entry.source==='village'&&entry.goal&&entry.state!=='completed'){const p=document.createElement('p');p.textContent=entry.goal;row.append(p);}
    if(entry.objective&&entry.state!=='completed'){const p=document.createElement('p');p.className='npc-quest-objective';p.textContent='Mục tiêu: '+entry.objective.text+' · '+entry.objective.done+'/'+entry.objective.total;row.append(p);}
   }
   const exp=entry.reward?.exp,reward=document.createElement('small');
   reward.textContent=exp?'Phần thưởng: '+exp+' EXP'+(entry.source==='village'?' Alpha · nhận một lần cho nhân vật':' lần đầu · ôn lại 0 EXP'):'Phần thưởng: chưa cấu hình';row.append(reward);
   if(entry.source==='learning'){
    const text={available:'Xem & nhận nhiệm vụ',active:'Tiếp tục nhiệm vụ',ready:'Trả nhiệm vụ',locked:'Xem điều kiện',completed:'Xem lại'}[entry.state]||'Xem nhiệm vụ';
    if(typeof onLearningOpen==='function')row.append(button(text,()=>{if(!conversationValid(version,npc.id))return;close({focus:false});onLearningOpen(npc.id,entry.id);},'learning-'+entry.id));
    return row;
   }
   if(journal.canAccept(entry.id,npc.id))row.append(button('Nhận nhiệm vụ',()=>{
    if(!conversationValid(version,npc.id)||!journal.accept(entry.id,npc.id))return;
    questReaction=d.questReactionClip||null;playerReaction('npc-agree',{activityId:entry.id});
    // A newly accepted quest becomes the tracked one unless another one is in progress.
    invalidateQuests();refreshBoard();
    // Only an explicit, different stored choice needs a write; the default already picks it.
    if(board.tracked!==entry.id&&!board.entries.some(e=>e.id===board.tracked&&['active','ready'].includes(e.state)))track(entry.id);
    renderDialogue();
   },'accept-'+entry.id));
   else if(entry.state==='ready'&&entry.turnInNpc===npc.id)row.append(button(d.turnInLabel||'Trả nhiệm vụ',()=>{
    // turnIn re-checks phase, NPC and saved state; the EXP receipt keeps the reward one-time.
    if(conversationValid(version,npc.id)&&journal.turnIn(entry.id,npc.id)){questReaction=d.questReactionClip||null;playerReaction('activity-complete',{clip:'cheer',activityId:entry.id});notify('Hoàn thành: '+entry.name);invalidateQuests();renderDialogue();}
   },'finish-'+entry.id));
   if(entry.state==='locked')row.append(button('Xem nhiệm vụ trước',()=>showPrerequisite(entry,version,npc.id),'prereq-'+entry.id));
   const goal=entry.state==='ready'?entry.turnInNpc:entry.state==='active'?(entry.objective?.targetNpc||entry.objective?.targetProp):null;
   if(goal&&goal!==npc.id&&(actors?.npcs.has(goal)||actors?.props.has(goal)))row.append(button('Tiếp tục · Đi tới '+npcName(goal),()=>{if(conversationValid(version,npc.id)){track(entry.id);route(goal);}},'continue-'+entry.id));
   if(['available','active','ready'].includes(entry.state)){const b=button(entry.id===tracked?'Đang theo dõi':'Theo dõi',()=>{if(conversationValid(version,npc.id)&&track(entry.id))renderDialogue();},'track-'+entry.id);b.disabled=entry.id===tracked;row.append(b);}
   return row;
  }
  function questLines(npc){
   const version=dialogueVersion,d=data.dialogues.dialogues[npc.dialogueId],box=el('npcQuests');box.replaceChildren();
   if(board.status==='loading'||board.status==='error'){const p=document.createElement('p');p.textContent=board.status==='error'?'Chưa đọc được tiến độ nhiệm vụ. Dữ liệu cũ được giữ nguyên; hãy tải lại trang.':'Đang tải tiến độ nhiệm vụ…';box.append(p);return;}
   for(const entry of QS.relatedTo(board.entries,npc.id,{tracked:board.tracked})){
    // Reconcile completed old journals and retry an interrupted EXP save, once per receipt.
    if(entry.source==='village'&&entry.state==='completed')onActivityCompleted('quests',entry.id);
    box.append(questRow(entry,npc,d,version,board.tracked));
   }
  }
  function renderDialogue(){
   const npc=actors?.npcs.get(opened)?.definition;if(!npc)return;
   const d=data.dialogues.dialogues[npc.dialogueId];el('npcDialogTitle').textContent=d.title;
   const version=dialogueVersion;
   el('npcDialogueLines').replaceChildren();for(const line of d.lines){const p=document.createElement('p');p.textContent=line;el('npcDialogueLines').append(p);}
   const demos=el('npcAnimations');demos.replaceChildren();animationButtons=[];
   panel.classList[d.animationActions?.length||d.lesson||d.healing||d.questHelp||d.unavailableServices?.length?'add':'remove']('npc-demo-mode');
   el('npcServiceStatus').textContent='';
   // No purchase/sale/repair API exists yet. These entries only explain availability;
   // never treat the visual weapon selector or learning score as a shop/wallet.
   for(const service of d.unavailableServices||[]){
    demos.append(button(service.label,()=>{
     const actor=actors?.npcs.get(opened),s=getState();
     if(version!==dialogueVersion||!actor||!s.authenticated||getIdentity()?.uid!==lessonIdentity||!s.inVillage||s.transitioning||getJourney()?.alive!==true||!inRange(actor.definition,s))return;
     el('npcServiceStatus').textContent=service.message;
    },'npc-service-'+service.id));
   }
   if(d.unavailableServices?.length)el('npcServiceStatus').textContent=d.serviceNotice||'Dịch vụ chưa sẵn sàng trong bản thử nghiệm.';
   if(d.questHelp){
    demos.append(button('Có việc gì cần giúp?',()=>{if(conversationValid(version,npc.id))el('npcServiceStatus').textContent=questInformation(d);},'npc-quest-help'));
    demos.append(button('Hỏi cách thu thập',()=>{if(conversationValid(version,npc.id))el('npcServiceStatus').textContent=d.questHelp.collectionGuidance;},'npc-gathering-help'));
    el('npcServiceStatus').textContent=questInformation(d);
   }
   for(const item of d.animationActions||[]){
    const b=button(item.label,()=>{
     const actor=actors?.npcs.get(opened),s=getState();
     if(version!==dialogueVersion||!actor||!s.authenticated||getIdentity()?.uid!==lessonIdentity||!s.inVillage||s.transitioning||pendingGreeting||getJourney()?.alive!==true||!inRange(actor.definition,s))return;
     if(actor.visual?.playOnce(item.clip)){
      if(item.clip==='agree')playerReaction('npc-agree');
      el('npcDemoGuidance').textContent=item.clip==='fold_arms'?(d.guidance||[]).join(' '):'';
      updateAnimationUI();
     }
    },'npc-animation-'+item.clip);animationButtons.push(b);demos.append(b);
   }
   if(d.lesson){demos.append(button('Học bài',()=>showLesson('study',version),'npc-study'));demos.append(button('Trả lời câu hỏi',()=>showLesson('question',version),'npc-question'));}
   if(d.healing){
    const version=dialogueVersion,b=button('Hồi phục',()=>heal(version),'npc-heal');animationButtons.push(b);demos.append(b);
    demos.append(button('Hỏi về thảo dược',()=>{if(conversationValid(version,npc.id))el('npcServiceStatus').textContent=d.herbalIntroduction;},'npc-herbs'));
    el('npcServiceStatus').textContent='Hồi đầy HP miễn phí trong bản thử nghiệm · Chỉ khi còn sống và đứng gần Thầy thuốc.';
   }
   if(d.animationActions?.length||d.lesson||d.healing||d.questHelp||d.unavailableServices?.length)demos.append(button('Kết thúc',()=>{if(version===dialogueVersion)close();},'npc-end-conversation'));
   renderLesson();
   el('npcDemoGuidance').textContent='';updateAnimationUI();
   refreshBoard();questLines(npc);const actions=el('npcActions');actions.replaceChildren();el('npcRouteStatus').textContent='';
   const actionMap={
    'elder-location':['Gặp Lý trưởng ở đâu?',()=>{
     const elder=actors.npcs.get('NPC_LANG_VIET_LY_TRUONG'),box=el('npcRouteStatus');
     box.textContent=elder?'Đi theo lối chính vào làng, vòng qua cây đa đến sân đình. Lý trưởng đứng ở sân phía trước, bên phải lối lên đình. Chọn bên dưới để đi tới chỗ ông.':'Chưa xác định được vị trí Lý trưởng. Hãy thử lại sau.';
     if(elder)box.append(button('Đi tới Lý trưởng',()=>{if(conversationValid(version,npc.id))route(elder.definition.id);},'npc-route-elder'));
    }],
    'guide-elder':['Đi tới Lý trưởng',()=>route('NPC_LANG_VIET_LY_TRUONG')],
    'guide-trainer':['Đi tới Võ sư',()=>route('NPC_LANG_VIET_VO_SU')],
    'guide-dummy':['Đi tới bia tập',()=>route('BIA_TAP_LANG_VIET_01')],
    weapons:['Chọn vũ khí',()=>{close();global.VietVillageWeapons?.openPanel();}],
    atlas:['Mở bản đồ tổng',()=>{close();global.VietVillageAtlas?.open();}],
    'route-status':['Kiểm tra đường Đồng Tre',()=>{
     const r=data.gameplay.existingRoute;
     const access=global.VietVillageRegions?.checkTravelAccess(r.mapId,r.spawnId,{loadDestination:true});
     el('npcRouteStatus').textContent=access?.ok&&access.ready?'Đồng Tre sẵn sàng · Cấp tối thiểu 1 · Phí 0. Bước vào vòng DỊCH CHUYỂN rồi chọn Đồng Tre.':access?.message||'Chưa đọc được trạng thái tuyến.';
    }]
   };
   for(const id of d.actions)if(actionMap[id]){
    const [label,action]=actionMap[id];
    actions.append(button(label,()=>{if(conversationValid(version,npc.id))action();},'npc-action-'+id));
   }
   if(typeof onLearningOpen==='function')actions.append(button('Nhiệm vụ học tập',()=>{
    if(!conversationValid(version,npc.id))return;
    close({focus:false});onLearningOpen(npc.id);
   },'npc-action-learning'));
   // Rebuilding action buttons must not leave keyboard focus behind the dialog.
   el('closeNpcDialog').focus?.();
  }
  function updateAnimationUI(){
   const actor=actors?.npcs.get(opened),d=actor&&data.dialogues.dialogues[actor.definition.dialogueId];
   const status=el('npcAnimationStatus');if(!d?.animationActions?.length&&!d?.greetingClip){status.textContent='';return;}
   // Opening again during the previous fade (or while GLB is still loading)
   // schedules just this conversation's greeting, never a stack of actions.
   if(pendingGreeting&&actor.visual&&!actor.visual.animationState.busy&&actor.visual.playOnce(pendingGreeting))pendingGreeting=null;
   // At most one agree and one clap per lesson; close discards pending reactions.
   if(!pendingGreeting&&lessonReactions.length&&actor.visual&&!actor.visual.animationState.busy&&actor.visual.playOnce(lessonReactions[0]))lessonReactions.shift();
   // Only successful journal transitions enqueue a reaction. Duplicate clicks
   // cannot repeat accept/turn-in, and closing discards this conversation's queue.
   if(!pendingGreeting&&questReaction&&actor.visual&&!actor.visual.animationState.busy&&actor.visual.playOnce(questReaction))questReaction=null;
   const state=actor.visual?.animationState;
   for(const b of animationButtons){
    const disabled=!state||state.busy;
    // Disabling the focused action otherwise sends keyboard focus to the page,
    // so Esc/Tab no longer reach the still-open conversation.
    if(disabled&&document.activeElement===b)el('closeNpcDialog').focus?.();
    b.disabled=disabled;
   }
   if(!state){status.textContent=actor.modelState==='error'?'Chưa tải được mô hình '+actor.definition.name+'. Đóng bảng, mở Dân làng → Thử lại.':'Đang tải mô hình '+actor.definition.name+'…';return;}
   const label=state.clip===d.greetingClip?(d.greetingLabel||'Cúi chào'):d.animationActions?.find(a=>a.clip===state.clip)?.label||(d.lesson||d.healing||d.questReactionClip?{agree:'Đồng ý',clap:'Chúc mừng hoàn thành'}[state.clip]:null)||'Đứng chờ';
   const message=state.phase==='returning'?'Đang trở về tư thế đứng…':state.busy?'Đang diễn: '+label+(d.lesson||d.healing||d.questHelp||d.unavailableServices?.length?' · Có thể đóng bất kỳ lúc nào.':' · Hãy chờ động tác kết thúc.'):d.unavailableServices?.length||d.questHelp?(d.readyMessage||'Sẵn sàng · Chọn dịch vụ để xem thông tin.'):d.healing?'Sẵn sàng · Hồi phục hoặc hỏi về thảo dược.':d.lesson?'Sẵn sàng · Học bài hoặc trả lời câu hỏi.':'Sẵn sàng · Chọn động tác để quan sát.';
   if(status.textContent!==message)status.textContent=message;
  }
  function interact(id=closest()){
   const npc=actors?.npcs.get(id);if(!npc||!usable()||!inRange(npc.definition))return false;
   pause();dialogueVersion++;opened=id;menuOpen=false;hide(menu,true);hide(panel,false);prompt.style.display='none';
   const p=getState().position;npc.root.rotation.y=Math.atan2(p.x-npc.root.position.x,p.z-npc.root.position.z);
   // A conversation takes priority over ambient motion, with the same fade
   // used by the trainer. The greeting starts only after this fade completes.
   if(npc.visual&&npc.visual.animationState.clip===npc.definition.model?.ambient?.clip)npc.visual.returnToIdle();
   resetAmbient(id);
   pendingGreeting=data.dialogues.dialogues[npc.definition.dialogueId].greetingClip||null;
   const definition=data.dialogues.dialogues[npc.definition.dialogueId].lesson;
   lessonSession=null;lessonReactions=[];questReaction=null;lessonView=null;lessonError='';lessonIdentity=getIdentity()?.uid;
   if(definition)try{lessonSession=global.createVillageLessonSession(getLesson(definition));}catch(e){lessonError='Chưa mở được bài học: '+e.message;}
   if(journal.record('talk',id))invalidateQuests();renderDialogue();
   playerReaction('npc-greeting',{clip:['elder','trainer','teacher','healer'].includes(npc.definition.role)?'bow':'greet_01'});
   el('closeNpcDialog').focus?.();return true;
  }
  function renderDirectory(){
   const models=actors?.modelStatuses||[],failed=models.find(m=>m.state==='error');
   el('npcLoadStatus').textContent=error?error:failed?'Chưa tải được mô hình '+failed.name+': '+failed.error+' Đang giữ nhân vật dự phòng; có thể thử lại.':models.some(m=>m.state==='loading')?'Đang tải mô hình dân làng…':actors?actors.npcs.size+' người dân đang ở Làng Việt. Chọn người để đi tới, rồi nhấn F hoặc chạm Nói chuyện.':'Đang đọc hồ sơ dân làng…';
   el('npcRetryBtn').hidden=!error&&!failed;el('npcList').replaceChildren();el('npcJournal').replaceChildren();
   if(!actors)return;
   for(const {definition:n} of actors.npcs.values())el('npcList').append(button('Đi tới '+n.name,()=>route(n.id),'go-'+n.id));
   renderJournal();
  }
  // Journal from the shared board: undiscovered quests stay hidden.
  function renderJournal(){
   const box=el('npcJournal');box.replaceChildren();if(!actors)return;
   if(board.status!=='ready'){box.textContent=board.status==='error'?'Chưa đọc được tiến độ nhiệm vụ; dữ liệu cũ được giữ nguyên.':'Đang tải tiến độ nhiệm vụ…';return;}
   const rank={ready:0,active:1,available:2,locked:3,completed:4},list=board.entries.filter(e=>e.revealed||e.state==='completed').sort((a,b)=>rank[a.state]-rank[b.state]||QS.CATEGORY_RANK[a.category]-QS.CATEGORY_RANK[b.category]||a.order-b.order);
   if(!list.length){box.textContent='Chưa có nhiệm vụ nào được mở.';return;}
   for(const e of list){const row=document.createElement('div');row.className='npc-journal-row npc-quest-'+e.category;
    const p=document.createElement('p');p.textContent=e.name+' · '+e.categoryLabel+' · '+(e.source==='learning'?stateText(e,null):QS.stateLabel(e.state))+(e.objective&&['active','ready'].includes(e.state)?' · '+e.objective.text+' '+e.objective.done+'/'+e.objective.total:'')+(e.id===board.tracked?' · Đang theo dõi':'');row.append(p);
    if(['available','active','ready'].includes(e.state)&&e.id!==board.tracked)row.append(button('Theo dõi',()=>{track(e.id);},'journal-track-'+e.id));
    box.append(row);}
  }
  function openDirectory(){const s=getState();if(!s.authenticated||s.transitioning||getJourney()?.alive!==true)return;if(!s.inVillage){notify('Dân làng ở Làng Việt. Hãy quay về để trò chuyện.');return;}close({focus:false});menuOpen=true;hide(menu,false);prompt.style.display='none';renderDirectory();el('closeNpcDirectory').focus?.();}
  async function load(){
   if(loading)return loading;
   loading=(async()=>{try{
    error='';if(actors){await actors.loadModels();if(disposed)return false;renderDirectory();return true;}const value=await loadData();
    if(disposed)return false;
    for(const part of ['gameplay','dialogues','quests'])if(value[part]?.mapId!=='lang-viet'||value[part].schemaVersion!==1)throw new Error('Sai phiên bản hoặc mã MAP.');
    const npcIds=new Set(value.gameplay.npcs.map(n=>n.id));
    for(const npc of value.gameplay.npcs)if(!value.dialogues.dialogues[npc.dialogueId]?.lines?.length)throw new Error('Thiếu hội thoại '+npc.name);
    for(const q of value.quests.quests.filter(q=>q.enabled))if(!npcIds.has(q.giverNpc)||!npcIds.has(q.turnInNpc)||!Array.isArray(q.dependsOn)||!q.objective)throw new Error('Nhiệm vụ thiếu NPC hoặc mục tiêu.');
    validation=QS?.validate(value.quests.quests)||{errors:[],invalid:new Set()};
    for(const problem of validation.errors)console.warn('Nhiệm vụ làng:',problem.message);
    actors=global.mountVillageNPCs({THREE,region,gameplay:value.gameplay});data=value;
    journal=global.createVillageQuestJournal({quests:data.quests.quests,getIdentity,storage,canStart,onSaveError:()=>notify('Chưa lưu được tiến độ nhiệm vụ trên trình duyệt này.')});invalidateQuests();
    const modelLoading=actors.loadModels();renderDirectory();await modelLoading;
    if(disposed)return false;
    const failed=actors.modelStatuses.filter(m=>m.state==='error');
    if(failed.length)notify('Chưa tải được mô hình '+failed.map(m=>m.name).join(', ')+'. Mở Dân làng → Thử lại; các chức năng khác vẫn hoạt động.');
    renderDirectory();return true;
   }catch(e){error='Chưa tải được dân làng: '+e.message+' Game vẫn hoạt động; nhấn Thử lại.';renderDirectory();return false;}finally{loading=null;}})();
   return loading;
  }
  function onSkillUsed(hitWindow=null){
   const state=getState();if(!usable(state))return false;
   for(const {definition:p,root} of actors.props.values()){
    const dx=p.position.x-state.position.x,dz=p.position.z-state.position.z,distance=Math.hypot(dx,dz);
    if(hitWindow){if(!hitWindow.testTarget(p.id,p.position,.25))continue;}
    else {
     if(distance>p.practiceRadius||distance<.01||Math.abs(p.position.y-state.position.y)>.6)continue;
     if((dx*Math.sin(state.yaw)+dz*Math.cos(state.yaw))/distance<p.facingDot)continue;
    }
    pulse=.35;root.rotation.z=.05;
    if(journal.record('practice-skill',p.id)){invalidateQuests();notify('Đã luyện chiêu hướng vào bia · Quay lại báo Võ sư.');}
    return true;
   }return false;
  }
  // Minimap shares the board: the same marker per NPC as above its head.
  function drawMinimapMarkers(ctx,point){
   if(!actors||!ctx||!point||board.status!=='ready')return;
   for(const [id,m] of board.markers){const n=actors.npcs.get(id);if(!n)continue;const [x,y]=point(n.definition.position.x,n.definition.position.z);
    ctx.save();ctx.translate(x,y);ctx.globalAlpha=m.kind==='locked'?.65:1;ctx.fillStyle=m.category==='main'?'#3d2a0f':m.category==='learning'?'#163c2e':'#173a42';ctx.strokeStyle=m.kind==='locked'?'#9aa196':m.category==='main'?'#f0c24a':m.category==='learning'?'#8fd6a6':'#a9cfd6';ctx.lineWidth=1.5;ctx.beginPath();
    if(m.category==='main'){ctx.moveTo(0,-7);ctx.lineTo(7,0);ctx.lineTo(0,7);ctx.lineTo(-7,0);ctx.closePath();}else if(m.category==='learning')ctx.rect(-6,-6,12,12);else ctx.arc(0,0,6.5,0,Math.PI*2);
    ctx.fill();ctx.stroke();ctx.fillStyle=m.kind==='progress'?'#dfe3dc':m.kind==='locked'?'#c9cdc2':'#ffd23f';ctx.font='900 10px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(m.kind==='available'?'!':m.kind==='locked'?'·':'?',0,.5);ctx.restore();}
  }
  function update(dt){
   if(disposed)return;const s=getState();
   if((opened||menuOpen)&&(!s.authenticated||!s.inVillage||s.transitioning||getJourney()?.alive!==true||(opened&&!conversationValid(dialogueVersion))))close({focus:false});
   if(actors){actors.root.visible=s.authenticated&&s.inVillage;
    actors.update(dt,getCamera?.()||null);
    if(!opened&&!menuOpen&&usable(s))for(const [id,npc] of actors.npcs){
     const ambient=npc.definition.model?.ambient;
     if(!ambient||!npc.visual||npc.visual.animationState.busy)continue;
     if(!ambientRemaining.has(id))resetAmbient(id);
     const left=ambientRemaining.get(id)-Math.min(Math.max(dt,0),.1);ambientRemaining.set(id,left);
     // No timeout callbacks or queued actions: timers pause outside gameplay.
     if(left<=0&&npc.visual.playOnce(ambient.clip))resetAmbient(id);
    }
    pulse=Math.max(0,pulse-dt);for(const {root} of actors.props.values())root.rotation.z=pulse?Math.sin(pulse*40)*.045:0;
   }
   const uidNow=currentUid();if(uidNow!==boardUid||s.inVillage!==boardInVillage){boardUid=uidNow;boardInVillage=s.inVillage;boardDirty=true;}
   boardWait+=dt;boardSafety+=dt;
   if((boardDirty&&boardWait>=.2)||boardSafety>=5){boardWait=0;refreshBoard();}
   elapsed+=dt;if(elapsed<.1)return;elapsed=0;
   if(opened)updateAnimationUI();
   nearest=closest(s);prompt.style.display=nearest?'block':'none';
   if(nearest)prompt.textContent='Nói chuyện · '+actors.npcs.get(nearest).definition.name+' (F)';
  }
  listen(el('npcDirectoryBtn'),'click',openDirectory);listen(el('closeNpcDirectory'),'click',()=>close());listen(el('closeNpcDialog'),'click',()=>close());
  listen(el('npcRetryBtn'),'click',()=>{load();});
  listen(global,'storage',e=>{const key=e?.key;if(key===null||key===undefined||String(key).startsWith('viet-village:quests:')||String(key).startsWith(TRACK_PREFIX))invalidateQuests();});listen(prompt,'click',()=>interact());
  for(const node of [panel,menu,prompt])for(const name of ['pointerdown','pointerup','pointermove','touchstart','touchend','wheel','click'])listen(node,name,e=>e.stopPropagation());
  for(const node of [panel,menu])listen(node,'keydown',e=>{
   e.stopPropagation();if(e.key==='Escape'){e.preventDefault();close();}
   if(e.key==='Tab'){
    const buttons=[...(node.querySelectorAll?.('button:not([disabled])')||[])].filter(b=>!b.hidden);
    if(e.shiftKey&&document.activeElement===buttons[0]){e.preventDefault();buttons.at(-1)?.focus();}
    else if(!e.shiftKey&&document.activeElement===buttons.at(-1)){e.preventDefault();buttons[0]?.focus();}
   }
  });
  listen(global,'keydown',e=>{if(e.code==='KeyF'&&!e.repeat&&!e.ctrlKey&&!e.altKey&&!e.metaKey&&!['BUTTON','INPUT','SELECT','TEXTAREA'].includes(e.target?.tagName)&&!e.target?.isContentEditable){if(interact())e.preventDefault();}});
  close({focus:false});
  return Object.freeze({load,update,interact,route,onSkillUsed,openDirectory,isOpen:()=>!!opened||menuOpen,
   isNear(id){const actor=actors?.npcs.get(id),s=getState();return !!actor&&s.authenticated&&s.inVillage&&!s.transitioning&&getJourney()?.alive===true&&inRange(actor.definition,s);},
   lock(){close({focus:false});journal?.lock();if(actors)actors.root.visible=false;prompt.style.display='none';invalidateQuests();refreshBoard();},
   invalidateQuests,refreshQuests:()=>refreshBoard(),track,drawMinimapMarkers,nameOf:npcName,get questBoard(){return board;},
   get status(){return {loaded:!!actors,error,count:actors?.npcs.size||0,propCount:actors?.props.size||0,nearest,opened,models:actors?.modelStatuses||[],quests:journal?.snapshot()||{},lesson:lessonSession?{id:lessonSession.lesson.id,...lessonSession.state}:null,markers:actors?.markers||{},markerDetails:actors?.markerDetails||{},questBoard:{status:board.status,tracked:board.tracked,states:Object.fromEntries(board.entries.map(e=>[e.id,e.state])),errors:board.errors.map(e=>e.message)}};},
   dispose(){disposed=true;close({focus:false});listeners.forEach(remove=>remove());actors?.dispose();actors=null;}
  });
 };
})(window);
