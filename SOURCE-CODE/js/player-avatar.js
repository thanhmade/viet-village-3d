(function(global){
 'use strict';
 // Visual choice is session-local. Firebase avatar IDs, HP and saved progress are unchanged.
 global.createVillagePlayerAvatar=function({THREE:T,body,proceduralParts,getState,pause,notify,load=global.loadVillageNPCGLTF,onAttachment,motion=null,models=global.VietVillageCharacterModels||[]}){
  const el=id=>document.getElementById(id),panel=el('playerAvatarPanel');
  const testing=!!global.location&&['localhost','127.0.0.1','[::1]'].includes(global.location.hostname)&&
   new URLSearchParams(global.location.search).get('characterTest')==='1';
  const clips=el('playerClipSelect'),status=el('playerAvatarStatus'),readout=el('playerAnimationReadout');
  const visuals=new Map(),loads=new Map();
  const definition=id=>models.find(model=>model.avatarId===id&&model.available);
  const hasGLTF=()=>selected!=='original'&&!!visual;
  let visual=null,selected='original',requested='original',open=false,epoch=0,lastHp=null,disposed=false,uiTime=0;
  let physicalJump=false,lastJumpPointerAt=-Infinity,skillPose=null;
  let social=null,pendingReaction=null,conversation=null;const socialQueue=[];
  const bindings=[];
  function listen(target,type,handler){target?.addEventListener(type,handler);bindings.push(()=>target?.removeEventListener?.(type,handler));}
  function message(text){status.textContent=text;}
  function displaySelection(){
   for(const part of proceduralParts)part.visible=selected==='original';
   for(const item of visuals.values())item.root.visible=hasGLTF()&&item===visual;
   body.position.y=0;
   onAttachment?.(hasGLTF()?visual.sockets.right:null);
   el('useOriginalPlayer').setAttribute?.('aria-pressed',String(selected==='original'));
   for(const id of ['female','male']){const button=el(id==='female'?'useFemalePlayer':'useMalePlayer');if(button){button.disabled=!definition(id);button.setAttribute?.('aria-pressed',String(selected===id));}}
   el('playerAnimationTests').hidden=!testing||!hasGLTF();
  }
  async function select(id){
   const model=definition(id);
   if(disposed||!getState().authenticated||(id!=='original'&&!model))return false;
   const attempt=++epoch;requested=id;clearInteraction();pendingReaction=null;pause();
   if(id==='original'){
    selected=id;visual?.returnToIdle();displaySelection();message('Đang dùng nhân vật ban đầu.');return true;
   }
   message('Đang tải mẫu '+model.label+' và các hoạt ảnh…');
   try{
    if(!visuals.has(id)){
     if(!loads.has(id))loads.set(id,Promise.resolve().then(()=>load(model.url)).then(gltf=>{
      if(disposed){global.disposeVillageNPCGLTF(gltf);throw new Error('Đã đóng bộ nhân vật.');}
      const loaded=global.createVillagePlayerGLTFVisual({THREE:T,gltf,...model.visual});
      loaded.root.visible=false;body.add(loaded.root);visuals.set(id,loaded);return loaded;
     }).finally(()=>loads.delete(id)));
     await loads.get(id);
    }
    if(attempt!==epoch||requested!==id||!getState().authenticated)return false;
    const loaded=visuals.get(id);if(visual&&visual!==loaded)visual.returnToIdle();
    visual=loaded;selected=id;visual.returnToIdle();lastHp=getState().hp;displaySelection();
    clips.replaceChildren();for(const clip of visual.clips){const option=document.createElement('option');option.value=clip.name;option.textContent=clip.name+' · '+clip.duration.toFixed(2)+' s';clips.append(option);}clips.value='idle';
    message('Mẫu '+model.label+' đã sẵn sàng · '+visual.clips.length+' clip · cao '+String(model.visual.height).replace('.',',')+' m. Đi/chạy dùng điều khiển hiện có.');return true;
   }catch(error){if(attempt===epoch){requested=selected;message('Chưa tải được mẫu '+model.label+': '+error.message+' Nhân vật hiện tại được giữ nguyên.');}return false;}
  }
  function close({restoreFocus=true}={}){
   if(!open)return;open=false;panel.classList.add('hidden');visual?.returnToIdle();pause();
   el('playerAvatarBtn').setAttribute?.('aria-expanded','false');
   if(restoreFocus){document.activeElement?.blur?.();el('view')?.focus?.({preventScroll:true});}
  }
  function show(){
   const s=getState();if(disposed||!s.authenticated)return;
   if(!s.canOpen){notify?.('Hãy đóng bảng đang mở và trở lại chế độ đi bộ ngoài làng để chọn nhân vật.');return;}
   pause();open=true;panel.classList.remove('hidden');el('playerAvatarBtn').setAttribute?.('aria-expanded','true');
   el('useFemalePlayer').focus?.();render();
  }
  function preview(name){
   if(!testing||!open||!hasGLTF()||!getState().authenticated)return false;
   const ok=visual.preview(name);if(ok){clips.value=name;message('Xem thử '+name+' — không thay đổi HP, nhiệm vụ hoặc vị trí điều khiển.');}render();return ok;
  }
  function render(){
   if(!open||!visual||!hasGLTF())return;
   const state=visual.state;
   readout.textContent='Clip: '+state.clip+' · '+Number(state.time||0).toFixed(1)+' s'+(state.paused?' · Đã dừng':'')+
    ' · Hết HP: '+(state.defeatClip||'chưa chọn');
   const reviewed=state.reviewedDefeats||[];
   for(const name of ['defeat_02','defeat_03'])el('choose-'+name).disabled=!reviewed.includes('defeat_02')||!reviewed.includes('defeat_03');
   el('playerDefeatHelp').textContent=reviewed.includes('defeat_02')&&reviewed.includes('defeat_03')?
    'Đã xem hết hai clip. Chọn một động tác hết HP cho phiên này.':
    'Xem hết defeat_02 ('+visual.clips.find(c=>c.name==='defeat_02').duration.toFixed(2)+' s) và defeat_03 ('+visual.clips.find(c=>c.name==='defeat_03').duration.toFixed(2)+' s) của mẫu đang chọn trước khi quyết định.';
  }
  function update(dt,speed=0){
   const s=getState();if(!s.authenticated)return;
   if(physicalJump&&!motion?.airborne){physicalJump=false;visual?.endJump?.();}
   if(hasGLTF()){
    if(!open){
     if(Number.isFinite(lastHp)&&s.hp<lastHp&&s.hp>0){clearInteraction();visual.returnToIdle();pendingReaction={clip:'hit_to_body_01',kind:'hit'};}
     if(s.hp===0){clearInteraction();pendingReaction=null;visual.playDefeat?.();}else visual.setLocomotion(s.visible?speed:0);
    }
    if(s.visible||open)visual.update(dt);
    if(!visual.state.busy)social=null;
    if(skillPose&&(visual.state.mode!=='once'||visual.state.clip!==skillPose.clip))skillPose=null;
    if(pendingReaction&&!open&&s.hp>0&&s.visible&&!visual.state.busy){
     const next=pendingReaction;if(visual.playOnce(next.clip)){social=null;pendingReaction=null;}
    }else if(socialQueue.length&&!open&&s.hp>0&&s.visible&&!visual.state.busy){
     const next=socialQueue[0];if(visual.playOnce(next)){social=next;socialQueue.shift();}
    }
   }
   const jumpButton=el('playerJumpBtn');if(jumpButton){jumpButton.hidden=!(motion&&s.authenticated&&s.visible&&!open&&s.canOpen);jumpButton.disabled=s.hp<=0||motion.airborne||!!visual?.state.busy;}
   lastHp=s.hp;uiTime+=dt;if(uiTime>=.1){render();uiTime=0;}
  }
  function onSkillUsed({weaponId,skillId}={}){
   if(!hasGLTF()||!getState().authenticated||!(getState().hp>0)||open)return false;
   // Côn Quét: two-hand sweep pose driven by staff-sweep's timeline.
   if(['spear.xuyen-kich','spear.thuong-phong','spear.pha-tran'].includes(skillId))return visual.startSpearTechnique?.(skillId)||false;
   if(['sword.nhat-kiem','sword.kiem-hoa','sword.kiem-khi'].includes(skillId))return visual.startSwordStrike?.(skillId)||false;
   if(skillId==='staff.con-quet')return visual.startStaffSweep?.()||false;
   if(['bow.xuyen-tien','bow.lien-tien','bow.mua-ten'].includes(skillId))return visual.startBowDraw?.(skillId)||false;
   if(skillId==='staff.chan-dia')return visual.startStaffSlam?.()||false;
   // Hộ Thân keeps its measured clip segment; the shield outlives its gesture.
   const segment=global.StaffVFXConfig?.animation?.[skillId];
   if(segment&&visual.playSegment?.(segment.clip,{from:segment.from,to:segment.to,force:true})){skillPose={visual,clip:segment.clip};social=null;pendingReaction=null;return true;}
   if(['staff','sword','spear','axe'].includes(weaponId))return visual.playOnce('slash');
   return false;
  }
  function cancelSkillPose(){
   visual?.cancelStaffSweep?.();visual?.cancelStaffSlam?.();visual?.cancelBowDraw?.();visual?.cancelSwordStrike?.();visual?.cancelSpearTechnique?.();
   if(skillPose?.visual===visual&&visual?.state.mode==='once'&&visual.state.clip===skillPose.clip)visual.returnToIdle();
   skillPose=null;
  }
  function clearInteraction(){socialQueue.length=0;conversation=null;if(social)visual?.returnToIdle();social=null;}
  function onInteraction({type,clip,npcId}={}){
   if(type==='npc-close'){clearInteraction();return true;}
   const s=getState();if(!hasGLTF()||!s.authenticated||s.hp<=0||!s.visible||open)return false;
   let next;
   if(type==='npc-greeting'&&['greet_01','bow'].includes(clip)){clearInteraction();conversation=npcId;next=clip;}
   else if(type==='npc-agree'&&conversation===npcId)next='agree';
   else if(type==='activity-complete'&&conversation===npcId&&['cheer','clap'].includes(clip))next=clip;
   else return false;
   if(!visual.clips.some(item=>item.name===next))return false;
   // Keep at most acknowledgement + celebration; repeated clicks cannot stack.
   // Damage is separate and takes priority, even if the conversation closes.
   if(social===next||socialQueue.includes(next))return true;
   if(!pendingReaction&&!socialQueue.length&&visual.playOnce(next))social=next;
   else if(next==='agree'){if(!socialQueue.includes(next))socialQueue.unshift(next);}
   else{const index=socialQueue.findIndex(name=>name!=='agree');if(index>=0)socialQueue[index]=next;else socialQueue.push(next);}
   if(socialQueue.length>2)socialQueue.length=2;
   return true;
  }
  function jump(){
   const s=getState();if(!motion||!s.authenticated||s.hp<=0||!s.visible||!s.canOpen||open||visual?.state.busy||motion.airborne)return false;
   if(!motion.jump())return false;
   clearInteraction();physicalJump=true;
   if(hasGLTF()){
    if(visual.startJump)visual.startJump(motion.jumpDuration);
    else visual.playOnce('jump');
   }
   // Keep WASD, joystick and horizontal velocity. A jump never calls pause().
   return true;
  }
  function lock(){physicalJump=false;motion?.reset();epoch++;requested=selected;clearInteraction();pendingReaction=null;close({restoreFocus:false});visual?.returnToIdle();lastHp=null;const button=el('playerJumpBtn');if(button)button.hidden=true;}
  // Main menu opens the saved profile; this panel is reached only from test mode.
  listen(el('closePlayerAvatar'),'click',()=>close());
  listen(el('useOriginalPlayer'),'click',()=>select('original'));
  listen(el('useFemalePlayer'),'click',()=>select('female'));
  listen(el('useMalePlayer'),'click',()=>select('male'));
  listen(el('playerJumpBtn'),'pointerdown',e=>{e.stopPropagation();if(e.pointerType==='mouse'&&e.button!==0)return;e.preventDefault?.();lastJumpPointerAt=Date.now();jump();});
  listen(el('playerJumpBtn'),'click',e=>{e.stopPropagation();if(e.detail===0||Date.now()-lastJumpPointerAt>500)jump();});
  for(const type of ['pointerup','pointercancel'])listen(el('playerJumpBtn'),type,e=>e.stopPropagation());
  listen(global,'keydown',e=>{if(e.code!=='Space'||e.repeat||['INPUT','TEXTAREA','SELECT','BUTTON'].includes(e.target?.tagName)||e.target?.isContentEditable)return;if(jump())e.preventDefault();});
  listen(el('playPlayerClip'),'click',()=>preview(clips.value));
  listen(el('pausePlayerClip'),'click',()=>{if(testing)visual?.pausePreview();render();});
  listen(el('resumePlayerClip'),'click',()=>{if(testing)visual?.resumePreview();render();});
  listen(el('idlePlayerClip'),'click',()=>{visual?.returnToIdle();render();});
  for(const name of ['jump','slash','hit_to_body_01','defeat_02','defeat_03'])listen(el('preview-'+name),'click',()=>preview(name));
  for(const name of ['defeat_02','defeat_03'])listen(el('choose-'+name),'click',()=>{
   if(testing&&visual?.setDefeatClip(name)){message('Đã chọn '+name+' cho lúc hết HP trong phiên này.');render();}
  });
  for(const type of ['pointerdown','pointerup','pointermove','wheel','click'])listen(panel,type,e=>e.stopPropagation());
  listen(panel,'keydown',e=>{
   e.stopPropagation();if(e.key==='Escape'){e.preventDefault();close();}
   if(e.key==='Tab'&&panel.querySelectorAll){const buttons=[...panel.querySelectorAll('button:not(:disabled),select')].filter(n=>n.offsetParent!==null);
    const first=buttons[0],last=buttons.at(-1);
    if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}
    else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}
   }
  });
  listen(global,'keydown',e=>{if(open&&e.key==='Escape'){e.preventDefault();close();}});
  panel.classList.add('hidden');el('playerAnimationTests').hidden=true;message('Chọn nhân vật cho phiên chơi local. Nhân vật ban đầu luôn được giữ lại.');
  return Object.freeze({select,open:show,close,isOpen:()=>open,update,onSkillUsed,cancelSkillPose,cancelStaffSweep:()=>visual?.cancelStaffSweep?.(),onInteraction,jump,lock,
   get isJumping(){return !!motion?.airborne;},
   get isFemale(){return selected==='female';},get height(){const value=hasGLTF()?visual.stats?.height:null;return Number.isFinite(value)&&value>0?value:null;},get isGLTF(){return hasGLTF();},get state(){return {selected,modelId:definition(selected)?.id||null,loading:loads.size>0,testing,animation:hasGLTF()?visual.state:null};},
   dispose(){if(disposed)return;lock();selected='original';displaySelection();disposed=true;bindings.forEach(remove=>remove());for(const item of visuals.values())item.dispose();visuals.clear();visual=null;}
  });
 };
})(window);
