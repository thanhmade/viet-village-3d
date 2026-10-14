(function(global){
 'use strict';
 const names={NPC_LANG_VIET_TUAN_DINH:'Tuần đinh',NPC_LANG_VIET_LY_TRUONG:'Lý trưởng',NPC_LANG_VIET_THAY_DO:'Thầy đồ',NPC_LANG_VIET_NONG_DAN:'Nông dân',NPC_LANG_VIET_TAP_HOA:'Người bán hàng'};
 const states={accepted:'Đã nhận · Tìm thẻ học',collected:'Đã tìm thẻ · Làm bài',practice_pending:'Chờ giáo viên xác nhận thực hành',ready_to_turn_in:'Đủ điều kiện · Trả nhiệm vụ',completed:'Đã hoàn thành'};
 const hash=value=>{let h=2166136261;for(const c of String(value))h=Math.imul(h^c.codePointAt(0),16777619);return h>>>0;};
 const shuffled=(items,seed)=>[...(items||[])].sort((a,b)=>hash(seed+':'+a.id)-hash(seed+':'+b.id));
 global.createLearningQuestView=function({document,client,pause,guideNpc,guidePoint,getExperience,canOpen=()=>true,notify=()=>{}}){
  const panel=document.getElementById('learningPanel'),content=document.getElementById('learningContent'),notice=document.getElementById('learningNotice');
  const week=document.getElementById('learningWeek'),level=document.getElementById('learningLevel'),mode=document.getElementById('learningMode'),pick=document.getElementById('learningQuest');
  let opened=false,returnFocus=null,selected='QUEST_TV1_B033',message='',running=false,teacherReview=null;
  const el=(tag,text,parent=content)=>{const node=document.createElement(tag);if(text!=null)node.textContent=text;parent.append(node);return node;};
  const button=(text,action,parent=content,disabled=false)=>{const b=el('button',text,parent);b.type='button';b.disabled=disabled;b.onclick=()=>act(action);return b;};
  function close({focus=true}={}){opened=false;panel.hidden=true;teacherReview=null;pause();document.getElementById('learningBtn').setAttribute('aria-expanded','false');if(focus)returnFocus?.focus?.();}
  async function act(action){if(running)return;running=true;message='Đang xử lý…';render();try{const value=await action();message=(value?.correct===false?'Chưa đúng. ':'')+(value?.message||'');}catch(e){message=e.message;notify(message);}finally{running=false;render();}}
  function fill(){
   const catalog=client.catalog;if(!catalog)return;
   if(!week.options.length){for(let n=1;n<=18;n++){const o=el('option','Tuần '+n,week);o.value=String(n);}week.value='8';
    for(const l of catalog.levels){const o=el('option',l.student_label,level);o.value=String(l.difficulty);}level.value='1';}
   const options=client.filter({subject:'tieng-viet',grade:1,week:week.value,difficulty:level.value});
   pick.replaceChildren();for(const q of options){const o=el('option',q.title,pick);o.value=q.id;}
   if(!options.some(q=>q.id===selected))selected=options[0]?.id;pick.value=selected||'';
  }
  function remember(){return client.select({questId:selected,difficulty:Number(level.value),mode:mode.value});}
  async function open(npcId){
   if(!canOpen())return;returnFocus=document.activeElement;opened=true;panel.hidden=false;pause();document.getElementById('learningBtn').setAttribute('aria-expanded','true');
   document.getElementById('learningClose').focus();message='Đang tải bộ bài…';render();
   try{await client.load();fill();const saved=client.getState().selection;if(saved){selected=saved.questId;week.value=String(client.getQuest(selected)?.week||8);level.value=String(saved.difficulty);mode.value=saved.mode;}
    if(npcId){const current=client.getQuest(selected);if(current?.giver_npc_ref!==npcId&&current?.return_npc_ref!==npcId){const relevant=client.catalog.quests.find(q=>q.giver_npc_ref===npcId);if(relevant){selected=relevant.id;week.value=String(relevant.week);}}}
    fill();message='';try{await client.refresh();}catch(e){message=e.message;}
   }catch(e){message=e.message;}render();
  }
  function renderQuestion(q,run,container){
   el('h3','Bài tập · '+q.student_label,container);el('p',q.prompt,container);
   const seed=run?.seed||q.id,form=el('form',null,container),selectedOptions=new Set();let read=()=>null;
   if(['single_choice','multi_select'].includes(q.type)){
    for(const option of shuffled(q.options,seed)){const label=el('label',null,form),input=el('input',null,label);input.type=q.type==='single_choice'?'radio':'checkbox';input.name='learningAnswer';input.value=option.id;input.onchange=()=>{if(q.type==='single_choice')selectedOptions.clear();if(input.checked)selectedOptions.add(option.id);else selectedOptions.delete(option.id);};el('span',option.text,label);}
    read=()=>q.type==='single_choice'?[...selectedOptions][0]:[...selectedOptions];
   }else if(q.type==='match_pairs'){
    const fields=[];for(const left of shuffled(q.payload.left,seed)){const label=el('label',left.text+' → ',form),select=el('select',null,label);el('option','Chọn',select).value='';for(const right of shuffled(q.payload.right,seed)){const o=el('option',right.text,select);o.value=right.id;}fields.push([left.id,select]);}read=()=>Object.fromEntries(fields.map(([id,s])=>[id,s.value]));
   }else if(q.type==='order_tokens'){
    el('p','Chọn lần lượt các mảnh để ghép; giữ nguyên chữ và dấu.',form);const order=[],display=el('output','',form),tokens=el('div',null,form);
    for(const token of shuffled(q.payload.tokens,seed)){const b=el('button',token.text,tokens);b.type='button';b.onclick=()=>{order.push(token);b.disabled=true;display.textContent=order.map(t=>t.text).join(q.payload.joiner??' ');};}
    const reset=el('button','Xếp lại',form);reset.type='button';reset.onclick=()=>{order.length=0;display.textContent='';tokens.querySelectorAll('button').forEach(b=>b.disabled=false);};read=()=>order.map(t=>t.id);
   }else{el('p','Đọc / viết / nói trực tiếp với giáo viên. Game không tự chấm phần thực hành.',form);}
   const submit=el('button',['oral_response','performance'].includes(q.type)?'Gửi yêu cầu thực hành':'Gửi câu trả lời',form);submit.type='submit';submit.disabled=running||!run?.collectedItemId||run?.questionPassed===true||run?.status==='completed';
   form.onsubmit=e=>{e.preventDefault();const answer=read();void act(()=>client.answer(selected,answer));};
   el('small',q.provenance||'Bài tập game tự soạn; không thay bài gốc.',container);
  }
  function teacherControls(state,q){
   if(!['teacher','admin'].includes(state.role))return;
   const section=el('section'),title=el('h3','Giáo viên · Giao và xác nhận bài',section),label=el('label','UID học sinh ',section),input=el('input',null,label);input.maxLength=128;input.autocomplete='off';
   button('Giao bài đang chọn',()=>client.assign({studentUid:input.value.trim(),questId:q.id,questionId:q.variants.find(v=>v.difficulty===Number(level.value)).question_id,mode:mode.value}),section,running||mode.value==='preview');
   button('Xem bài cần xác nhận',async()=>{teacherReview={studentUid:input.value.trim(),...(await client.review({studentUid:input.value.trim(),questId:q.id}))};},section,running);
   if(!teacherReview)return;
   const checks=[];el('p','Chỉ đánh dấu sau khi quan sát học sinh thực hiện.',section);
   for(const criterion of teacherReview.practice.criteria){const label=el('label',typeof criterion==='string'?criterion:criterion.text||criterion.description||criterion.id,section),box=el('input',null,label);box.type='checkbox';checks.push(box);}
   const rubric=[];for(const criterion of teacherReview.question.assessment.rubric||[]){const label=el('label',criterion.text||criterion.description||criterion.id,section),score=el('select',null,label);for(const value of criterion.score_values)el('option',String(value),score).value=String(value);rubric.push([criterion.id,score]);}
   button('Xác nhận tiêu chí đã quan sát',()=>client.approve({studentUid:teacherReview.studentUid,questId:q.id,practiceScores:checks.map(b=>b.checked?1:0),questionScores:Object.fromEntries(rubric.map(([id,s])=>[id,Number(s.value)]))}),section,running);
  }
  function render(){
   if(!opened)return;const state=client.getState();content.replaceChildren();notice.textContent=message||state.error||'';
   if(!client.catalog){el('p','Đang tải bộ nhiệm vụ.');button('Thử lại',()=>open());return;}
   fill();const q=client.getQuest(selected);if(!q)return;
   const run=client.getRun(q.id),question=client.getQuestion(run?.questionId||q.variants.find(v=>v.difficulty===Number(level.value))?.question_id);
   const exp=getExperience?.();if(exp?.level)el('p','Nhân vật LV '+exp.level+' · Mức học tập được chọn riêng, không suy ra từ LV.');
   el('h3',q.title);el('p','Người giao: '+names[q.giver_npc_ref]+' · Trả bài: '+names[q.return_npc_ref]);
   el('p','Lần đầu: '+q.reward_policy.first_clear_exp+' EXP · Ôn lại: 0 EXP · Mọi mức học tập dùng chung một lần thưởng.');
   el('p',state.scope==='localhost-preview'?'Xem thử trên máy này: lưu nhiệm vụ theo tài khoản Google; chưa xác nhận giáo viên và chưa phát EXP.':'Lớp học cần bài được giáo viên giao. Phiêu lưu còn yêu cầu LV '+q.gates.adventure_mode.min_level+' và bài trước.');
   el('p','Trạng thái: '+(states[run?.status]||'Chưa nhận nhiệm vụ'));
   const actions=el('div');actions.className='learning-actions';
   button('Đi tới '+names[q.giver_npc_ref],()=>{close();guideNpc(q.giver_npc_ref);},actions,running);
   button(run?'Tiếp tục bài đã nhận':'Nhận nhiệm vụ',()=>client.begin(q.id,Number(level.value),mode.value,q.giver_npc_ref),actions,running||!state.connected);
   if(run?.status==='completed')button('Ôn lại nhiệm vụ · không thêm EXP',()=>client.begin(q.id,Number(level.value),mode.value,q.giver_npc_ref,true),actions,running||!state.connected);
   if(run?.spawn?.position&&run.status==='accepted')button('Đi tìm thẻ học',()=>{close();guidePoint(run.spawn.position);},actions,running);
   if(run)button('Đi tới '+names[q.return_npc_ref],()=>{close();guideNpc(q.return_npc_ref);},actions,running);
   button('Trả nhiệm vụ',()=>client.turnIn(q.id,q.return_npc_ref),actions,running||run?.status!=='ready_to_turn_in'||state.scope==='localhost-preview');
   if(run){el('p',q.practice.instructions);if(run.status==='practice_pending')el('p','Chờ giáo viên thực hành trực tiếp và xác nhận. Học sinh không thể tự xác nhận.');}
   if(question)renderQuestion(question,run,content);
   const lesson=client.catalog.lessons?.find(l=>l.id===q.lesson_id);if(lesson?.game_passage){el('h3',lesson.game_passage_title);el('p',lesson.game_passage);el('small','Truyện game tự soạn. Bài gốc tham khảo: '+(lesson.original_story_title||lesson.title));}
   el('small','Nguồn: '+(lesson?.source_file||'KHBD Tiếng Việt 1')+' · Nội dung nhập còn chờ giáo viên duyệt trước khi dùng chính thức.');
   teacherControls(state,q);
  }
  for(const node of [week,level,mode,pick])node.addEventListener('change',()=>{if(node===pick)selected=pick.value;fill();void act(remember);});
  for(const event of ['pointerdown','pointerup','pointermove','click','wheel','touchstart','touchend'])panel.addEventListener(event,e=>e.stopPropagation());
  panel.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Escape'){e.preventDefault();close();}if(e.key==='Tab'){const list=[...panel.querySelectorAll('button:not([disabled]),select,input')].filter(n=>!n.hidden&&n.offsetParent!==null);if(e.shiftKey&&document.activeElement===list[0]){e.preventDefault();list.at(-1)?.focus();}else if(!e.shiftKey&&document.activeElement===list.at(-1)){e.preventDefault();list[0]?.focus();}}});
  document.getElementById('learningClose').onclick=()=>close();document.getElementById('learningRetry').onclick=()=>act(()=>client.refresh());document.getElementById('learningBtn').onclick=()=>open();
  return {open,close,render,isOpen:()=>opened,lock:()=>close({focus:false})};
 };
})(window);
