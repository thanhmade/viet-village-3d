(function(global){
 'use strict';
 global.createVillageNPCController=function({THREE,region,getState,getIdentity,getJourney,healPlayer,onHealed,storage,pause,goTo,notify,loadData,onActivityCompleted=()=>{},onLearningOpen=null,getLesson=definition=>global.resolveVillageLesson(definition)}){
  const el=id=>document.getElementById(id),panel=el('npcDialog'),menu=el('npcDirectory'),prompt=el('npcInteractBtn');
  let data=null,actors=null,journal=null,loading=null,opened=null,menuOpen=false,nearest=null,error='',pulse=0,elapsed=0,disposed=false;
  const listeners=[],ambientRemaining=new Map();let animationButtons=[],pendingGreeting=null,lessonSession=null,lessonView=null,lessonIdentity=null,lessonError='',lessonReactions=[];
  let dialogueVersion=0,healing=false,questReaction=null;
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
  function questLines(npc){
   const version=dialogueVersion,d=data.dialogues.dialogues[npc.dialogueId];
   const box=el('npcQuests');box.replaceChildren();
   for(const q of data.quests.quests.filter(q=>q.enabled&&(q.giverNpc===npc.id||q.turnInNpc===npc.id))){
    const state=journal.status(q.id),row=document.createElement('div');row.className='npc-quest';
    // Reconcile completed old journals and retry an interrupted EXP save, once per receipt.
    if(state==='completed')onActivityCompleted('quests',q.id);
    const title=document.createElement('strong');title.textContent=q.name;row.append(title);
    const text=document.createElement('p');text.textContent=q.goal;
    const questExp=global.VillageExperienceConfig?.rewards.quests[q.id];if(questExp)text.textContent+=' Thưởng lần đầu: '+questExp+' EXP Alpha.';row.append(text);
    const label=document.createElement('p');label.className='npc-quest-status';label.textContent={available:'Chưa nhận',active:'Đang thực hiện',ready:'Đã đạt mục tiêu · Hãy báo hoàn thành',completed:'Đã hoàn thành'}[state];row.append(label);
    if(journal.canAccept(q.id,npc.id))row.append(button('Nhận nhiệm vụ',()=>{
     if(!conversationValid(version,npc.id)||!journal.accept(q.id,npc.id))return;
     questReaction=d.questReactionClip||null;playerReaction('npc-agree',{activityId:q.id});renderDialogue();
    },'accept-'+q.id));
    else if(state==='ready'&&q.turnInNpc===npc.id)row.append(button(d.turnInLabel||'Báo hoàn thành',()=>{
     if(conversationValid(version,npc.id)&&journal.turnIn(q.id,npc.id)){questReaction=d.questReactionClip||null;playerReaction('activity-complete',{clip:'cheer',activityId:q.id});notify('Hoàn thành: '+q.name);renderDialogue();}
    },'finish-'+q.id));
    else if(state==='available'&&q.dependsOn.length){const reason=document.createElement('small');reason.textContent='Hoàn thành “Chào làng” trước khi nhận.';row.append(reason);}
    box.append(row);
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
   questLines(npc);const actions=el('npcActions');actions.replaceChildren();el('npcRouteStatus').textContent='';
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
   if(typeof onLearningOpen==='function')actions.append(button('Nhiệm vụ Tiếng Việt 1',()=>{
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
   journal.record('talk',id);renderDialogue();
   playerReaction('npc-greeting',{clip:['elder','trainer','teacher','healer'].includes(npc.definition.role)?'bow':'greet_01'});
   el('closeNpcDialog').focus?.();return true;
  }
  function renderDirectory(){
   const models=actors?.modelStatuses||[],failed=models.find(m=>m.state==='error');
   el('npcLoadStatus').textContent=error?error:failed?'Chưa tải được mô hình '+failed.name+': '+failed.error+' Đang giữ nhân vật dự phòng; có thể thử lại.':models.some(m=>m.state==='loading')?'Đang tải mô hình dân làng…':actors?actors.npcs.size+' người dân đang ở Làng Việt. Chọn người để đi tới, rồi nhấn F hoặc chạm Nói chuyện.':'Đang đọc hồ sơ dân làng…';
   el('npcRetryBtn').hidden=!error&&!failed;el('npcList').replaceChildren();el('npcJournal').replaceChildren();
   if(!actors)return;
   for(const {definition:n} of actors.npcs.values())el('npcList').append(button('Đi tới '+n.name,()=>route(n.id),'go-'+n.id));
   for(const q of data.quests.quests){const row=document.createElement('p');row.textContent=q.name+' · '+(q.enabled?({available:'Chưa nhận',active:'Đang thực hiện',ready:'Chờ báo hoàn thành',completed:'Đã hoàn thành'}[journal.status(q.id)]):'Chưa mở: '+q.reason);el('npcJournal').append(row);}
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
    actors=global.mountVillageNPCs({THREE,region,gameplay:value.gameplay});data=value;
    journal=global.createVillageQuestJournal({quests:data.quests.quests,getIdentity,storage,onSaveError:()=>notify('Chưa lưu được tiến độ nhiệm vụ trên trình duyệt này.')});
    const modelLoading=actors.loadModels();renderDirectory();await modelLoading;
    if(disposed)return false;
    const failed=actors.modelStatuses.filter(m=>m.state==='error');
    if(failed.length)notify('Chưa tải được mô hình '+failed.map(m=>m.name).join(', ')+'. Mở Dân làng → Thử lại; các chức năng khác vẫn hoạt động.');
    renderDirectory();return true;
   }catch(e){error='Chưa tải được dân làng: '+e.message+' Game vẫn hoạt động; nhấn Thử lại.';renderDirectory();return false;}finally{loading=null;}})();
   return loading;
  }
  function onSkillUsed(){
   const state=getState();if(!usable(state))return false;
   for(const {definition:p,root} of actors.props.values()){
    const dx=p.position.x-state.position.x,dz=p.position.z-state.position.z,distance=Math.hypot(dx,dz);
    if(distance>p.practiceRadius||distance<.01||Math.abs(p.position.y-state.position.y)>.6)continue;
    if((dx*Math.sin(state.yaw)+dz*Math.cos(state.yaw))/distance<p.facingDot)continue;
    pulse=.35;root.rotation.z=.05;
    if(journal.record('practice-skill',p.id))notify('Đã luyện chiêu hướng vào bia · Quay lại báo Võ sư.');
    return true;
   }return false;
  }
  function update(dt){
   if(disposed)return;const s=getState();
   if((opened||menuOpen)&&(!s.authenticated||!s.inVillage||s.transitioning||getJourney()?.alive!==true||(opened&&!conversationValid(dialogueVersion))))close({focus:false});
   if(actors){actors.root.visible=s.authenticated&&s.inVillage;
    actors.update(dt);
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
   elapsed+=dt;if(elapsed<.1)return;elapsed=0;
   if(opened)updateAnimationUI();
   nearest=closest(s);prompt.style.display=nearest?'block':'none';
   if(nearest)prompt.textContent='Nói chuyện · '+actors.npcs.get(nearest).definition.name+' (F)';
  }
  listen(el('npcDirectoryBtn'),'click',openDirectory);listen(el('closeNpcDirectory'),'click',()=>close());listen(el('closeNpcDialog'),'click',()=>close());
  listen(el('npcRetryBtn'),'click',()=>{load();});listen(prompt,'click',()=>interact());
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
   lock(){close({focus:false});journal?.lock();if(actors)actors.root.visible=false;prompt.style.display='none';},
   get status(){return {loaded:!!actors,error,count:actors?.npcs.size||0,propCount:actors?.props.size||0,nearest,opened,models:actors?.modelStatuses||[],quests:journal?.snapshot()||{},lesson:lessonSession?{id:lessonSession.lesson.id,...lessonSession.state}:null};},
   dispose(){disposed=true;close({focus:false});listeners.forEach(remove=>remove());actors?.dispose();actors=null;}
  });
 };
})(window);
