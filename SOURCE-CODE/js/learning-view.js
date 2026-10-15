(function(global){
 'use strict';
 const names={NPC_LANG_VIET_TUAN_DINH:'Tuần đinh',NPC_LANG_VIET_LY_TRUONG:'Lý trưởng',NPC_LANG_VIET_THAY_DO:'Thầy đồ',NPC_LANG_VIET_NONG_DAN:'Nông dân',NPC_LANG_VIET_TAP_HOA:'Người bán hàng',NPC_LANG_VIET_VO_SU:'Võ sư',NPC_LANG_VIET_THO_REN:'Thợ rèn',NPC_LANG_VIET_THAY_THUOC:'Thầy thuốc'};
 const states={available:'Có thể nhận',accepted:'Đang làm · Tìm thẻ học',collected:'Đang làm · Làm bài',practice_pending:'Chờ thầy cô xác nhận',ready_to_turn_in:'Có thể trả nhiệm vụ',completed:'Đã hoàn thành'};
 const priority={ready_to_turn_in:5,practice_pending:4,collected:4,accepted:4,available:3,completed:1};
 const scopes={practice:'Luyện tập trên web · tự kiểm tra câu chọn đáp án · không cộng EXP','localhost-preview':'Thử trên máy tính · máy chủ cục bộ chấm bài · chưa cộng EXP'};
 const hash=value=>{let h=2166136261;for(const c of String(value))h=Math.imul(h^c.codePointAt(0),16777619);return h>>>0;};
 const shuffled=(items,seed)=>[...(items||[])].sort((a,b)=>hash(seed+':'+a.id)-hash(seed+':'+b.id));
 const npcName=id=>names[id]||'dân làng';
 // The play screen shows the quest itself; subject, grade, week and level stay in
 // data and assignments. Teacher-only controls appear for teacher/admin roles.
 global.createLearningQuestView=function({document,client,pause,guideNpc,guidePoint,canOpen=()=>true,notify=()=>{}}){
  const panel=document.getElementById('learningPanel'),content=document.getElementById('learningContent'),notice=document.getElementById('learningNotice');
  let opened=false,returnFocus=null,selected=null,focusNpc=null,message='',running=false,teacherReview=null;
  const el=(tag,text,parent=content)=>{const node=document.createElement(tag);if(text!=null)node.textContent=text;parent.append(node);return node;};
  const button=(text,action,parent=content,disabled=false)=>{const b=el('button',text,parent);b.type='button';b.disabled=disabled;b.onclick=()=>act(action);return b;};
  function close({focus=true}={}){opened=false;panel.hidden=true;teacherReview=null;pause();document.getElementById('learningBtn').setAttribute('aria-expanded','false');if(focus)returnFocus?.focus?.();}
  async function act(action){if(running)return;running=true;message='Đang xử lý…';render();try{const value=await action();message=value?.message||(value?.correct===false?'Chưa đúng. Em thử lại nhé.':'');}catch(e){message=e.message;notify(message);}finally{running=false;render();}}
  function relevant(){const list=client.offered().filter(o=>!focusNpc||o.giverNpc===focusNpc||o.returnNpc===focusNpc);
   return list.map((o,i)=>({o,i})).sort((a,b)=>(priority[b.o.status]||0)-(priority[a.o.status]||0)||a.i-b.i).map(x=>x.o);}
  async function open(npcId,questId=null){
   if(!canOpen())return;returnFocus=document.activeElement;opened=true;panel.hidden=false;pause();document.getElementById('learningBtn').setAttribute('aria-expanded','true');
   document.getElementById('learningClose').focus();focusNpc=npcId||null;selected=typeof questId==='string'?questId:null;message='Đang tải nhiệm vụ…';render();
   try{await client.load();message='';try{await client.refresh();}catch(e){message=e.message;}}catch(e){message=e.message;}render();
  }
  function steps(q,run,entry,question,parent){
   const manual=!['single_choice','multi_select','order_tokens','match_pairs'].includes(question?.type),status=run?.status;
   const done={accept:!!run,collect:!!run&&status!=='accepted',answer:!!run&&(run.questionPassed||run.practiceRequested||['ready_to_turn_in','completed'].includes(status)),practice:!!run&&(run.practiceApproved||['ready_to_turn_in','completed'].includes(status)),turnIn:status==='completed'};
   const list=el('ol',null,parent);list.className='learning-steps';
   for(const [id,text] of [['accept','Nhận nhiệm vụ từ '+npcName(q.giver_npc_ref)],['collect','Tìm và nhặt thẻ học trong làng'],['answer',(manual?'Chuẩn bị bài đọc/viết/nói':'Làm bài')+' · mức '+entry.levelLabel],['practice','Thực hành với thầy cô và được xác nhận'],['turnIn','Trả nhiệm vụ cho '+npcName(q.return_npc_ref)]]){
    const item=el('li',(done[id]?'✓ ':'○ ')+text,list);if(done[id])item.className='done';}
  }
  function renderQuestion(q,run,container){
   const question=client.getQuestion(run.questionId);if(!question)return;
   el('h3','Bài tập · '+question.student_label,container);el('p',question.prompt,container);
   if(run.status==='accepted'){el('p','Tìm thẻ học trong làng để mở bài tập.',container);return;}
   const form=el('form',null,container),selectedOptions=new Set();let read=()=>null;
   if(['single_choice','multi_select'].includes(question.type)){
    for(const option of shuffled(question.options,run.seed)){const label=el('label',null,form),input=el('input',null,label);input.type=question.type==='single_choice'?'radio':'checkbox';input.name='learningAnswer';input.value=option.id;input.onchange=()=>{if(question.type==='single_choice')selectedOptions.clear();if(input.checked)selectedOptions.add(option.id);else selectedOptions.delete(option.id);};el('span',option.text,label);}
    read=()=>question.type==='single_choice'?[...selectedOptions][0]:[...selectedOptions];
   }else if(question.type==='match_pairs'){
    const fields=[];for(const left of shuffled(question.payload.left,run.seed)){const label=el('label',left.text+' → ',form),select=el('select',null,label);el('option','Chọn',select).value='';for(const right of shuffled(question.payload.right,run.seed)){const o=el('option',right.text,select);o.value=right.id;}fields.push([left.id,select]);}read=()=>Object.fromEntries(fields.map(([id,s])=>[id,s.value]));
   }else if(question.type==='order_tokens'){
    el('p','Chọn lần lượt các mảnh để ghép; giữ nguyên chữ và dấu.',form);const order=[],display=el('output','',form),tokens=el('div',null,form);
    for(const token of shuffled(question.payload.tokens,run.seed)){const b=el('button',token.text,tokens);b.type='button';b.onclick=()=>{order.push(token);b.disabled=true;display.textContent=order.map(t=>t.text).join(question.payload.joiner??' ');};}
    const reset=el('button','Xếp lại',form);reset.type='button';reset.onclick=()=>{order.length=0;display.textContent='';tokens.querySelectorAll('button').forEach(b=>b.disabled=false);};read=()=>order.map(t=>t.id);
   }else{el('p','Đọc / viết / nói trực tiếp với thầy cô. Game không tự chấm phần này.',form);}
   const manual=['oral_response','performance'].includes(question.type);
   const submit=el('button',manual?'Báo đã sẵn sàng thực hành':'Gửi câu trả lời',form);submit.type='submit';
   submit.disabled=running||!run.collectedItemId||run.questionPassed===true||run.practiceRequested===true||run.status==='completed';
   form.onsubmit=e=>{e.preventDefault();const answer=read();void act(()=>client.answer(q.id,answer));};
   el('small',question.provenance||'Bài tập game tự soạn; không thay bài gốc.',container);
  }
  function teacherControls(state,q,entry){
   if(state.scope!=='server'||!['teacher','admin'].includes(state.role))return;
   const section=el('section');section.className='learning-teacher';el('h3','Giáo viên · Giao và xác nhận bài',section);
   const label=el('label','UID học sinh ',section),input=el('input',null,label);input.maxLength=128;input.autocomplete='off';
   const level=el('select',null,el('label','Mức học tập ',section));for(const v of q.variants){const o=el('option',client.getQuestion(v.question_id)?.student_label||String(v.difficulty),level);o.value=String(v.difficulty);}level.value=String(entry.difficulty);
   const mode=el('select',null,el('label','Chế độ ',section));for(const [value,text] of [['classroom','Lớp học · bài được giao'],['adventure','Phiêu lưu · LV và bài trước']]){const o=el('option',text,mode);o.value=value;}
   button('Giao bài này',()=>client.assign({studentUid:input.value.trim(),questId:q.id,questionId:q.variants.find(v=>v.difficulty===Number(level.value)).question_id,mode:mode.value}),section,running);
   button('Xem bài cần xác nhận',async()=>{teacherReview={studentUid:input.value.trim(),...(await client.review({studentUid:input.value.trim(),questId:q.id}))};},section,running);
   if(!teacherReview)return;
   const checks=[];el('p','Chỉ đánh dấu sau khi quan sát học sinh thực hiện.',section);
   for(const criterion of teacherReview.practice.criteria){const label=el('label',typeof criterion==='string'?criterion:criterion.text||criterion.description||criterion.id,section),box=el('input',null,label);box.type='checkbox';checks.push(box);}
   const rubric=[];for(const criterion of teacherReview.question.assessment.rubric||[]){const label=el('label',criterion.text||criterion.description||criterion.id,section),score=el('select',null,label);for(const value of criterion.score_values)el('option',String(value),score).value=String(value);rubric.push([criterion.id,score]);}
   button('Xác nhận tiêu chí đã quan sát',()=>client.approve({studentUid:teacherReview.studentUid,questId:q.id,practiceScores:checks.map(b=>b.checked?1:0),questionScores:Object.fromEntries(rubric.map(([id,s])=>[id,Number(s.value)]))}),section,running);
  }
  function nextStep(q,run,entry){
   // One learning card is shown at a time: the quest the player chooses to pursue.
   if(run.status==='accepted'&&run.spawn?.position)return ['Tiếp tục · Đi tìm thẻ học',async()=>{await client.select({questId:q.id,difficulty:entry.difficulty,mode:run.mode});close();guidePoint(run.spawn.position);}];
   if(run.status==='collected')return ['Tiếp tục · Làm bài',()=>{content.querySelector('form input,form select,form button')?.focus();}];
   if(run.status==='ready_to_turn_in')return ['Tiếp tục · Đi tới '+npcName(q.return_npc_ref),()=>{close();guideNpc(q.return_npc_ref);}];
   return null;
  }
  function render(){
   if(!opened)return;const state=client.getState();content.replaceChildren();notice.textContent=message||state.error||'';
   if(!client.catalog){el('p','Đang tải nhiệm vụ.');button('Thử lại',()=>open(focusNpc));return;}
   if(scopes[state.scope])el('p',scopes[state.scope]).className='learning-scope';
   const list=relevant();
   if(!list.length){el('p',focusNpc?'Hiện chưa có nhiệm vụ học tập với '+npcName(focusNpc)+'.':state.connected?'Hiện chưa có bài được giao.':'Chưa tải được tiến trình nhiệm vụ.');if(focusNpc)button('Xem tất cả nhiệm vụ',()=>{focusNpc=null;selected=null;});return;}
   if(!list.some(o=>o.questId===selected))selected=list[0].questId;
   if(list.length>1){const picker=el('div');picker.className='learning-list';picker.setAttribute('role','list');
    for(const o of list){const quest=client.getQuest(o.questId),label=client.getLesson(quest.lesson_id)?.title||quest.title,b=el('button',label+' · '+(states[o.status]||o.status),picker);b.type='button';b.setAttribute('role','listitem');b.setAttribute('aria-pressed',String(o.questId===selected));b.onclick=()=>{selected=o.questId;teacherReview=null;message='';render();};}}
   const entry=list.find(o=>o.questId===selected),q=client.getQuest(selected),run=client.getRun(q.id),lesson=client.getLesson(q.lesson_id);
   const question=client.getQuestion(run?.questionId||q.variants.find(v=>v.difficulty===entry.difficulty)?.question_id);
   const detail=el('article');detail.className='learning-quest';
   el('h3',q.title,detail);if(lesson?.title)el('p','Bài học: '+lesson.title,detail);
   el('p','Trạng thái: '+(states[run?.status||entry.status]||'Có thể nhận'),detail).className='learning-status';
   el('p','Giao: '+npcName(q.giver_npc_ref)+' · Trả: '+npcName(q.return_npc_ref),detail);
   el('h4','Mục tiêu',detail);steps(q,run,entry,question,detail);
   el('h4','Yêu cầu hoàn thành',detail);el('p',q.practice.instructions,detail);
   el('h4','Phần thưởng',detail);el('p',q.reward_policy.first_clear_exp+' EXP lần đầu · ôn lại 0 EXP'+(state.rewardsEnabled?'':' · Bản này chưa cộng EXP'),detail);
   const actions=el('div',null,detail);actions.className='learning-actions';
   if(!run){button('Đi tới '+npcName(q.giver_npc_ref),()=>{close();guideNpc(q.giver_npc_ref);},actions,running);
    button('Nhận nhiệm vụ',()=>client.begin(q.id,q.giver_npc_ref),actions,running||!state.connected||!entry.eligible);}
   else{const next=nextStep(q,run,entry);if(next)button(next[0],next[1],actions,running);
    if(run.status!=='completed'&&run.status!=='ready_to_turn_in')button('Đi tới '+npcName(q.return_npc_ref),()=>{close();guideNpc(q.return_npc_ref);},actions,running);
    if(run.status!=='completed')button('Trả nhiệm vụ',()=>client.turnIn(q.id,q.return_npc_ref),actions,running||run.status!=='ready_to_turn_in'||state.scope!=='server');
    else button('Ôn lại · không thêm EXP',()=>client.begin(q.id,q.giver_npc_ref,{repeat:true}),actions,running||!state.connected);
    if(state.scope==='practice')button('Luyện lại từ đầu',()=>client.restart(q.id),actions,running);
    if(run.status==='practice_pending')el('p','Nhờ thầy cô nghe em đọc/viết và xác nhận. Em không tự xác nhận được.',detail);}
   if(run)renderQuestion(q,run,detail);
   if(lesson?.game_passage){el('h4',lesson.game_passage_title,detail);el('p',lesson.game_passage,detail);el('small','Truyện game tự soạn. Bài gốc tham khảo: '+(lesson.original_story_title||lesson.title),detail);}
   el('small','Nguồn: '+(lesson?.source_file||'tài liệu bài học')+' · Nội dung còn chờ giáo viên duyệt trước khi dùng chính thức.',detail);
   teacherControls(state,q,entry);
  }
  for(const event of ['pointerdown','pointerup','pointermove','click','wheel','touchstart','touchend'])panel.addEventListener(event,e=>e.stopPropagation());
  panel.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Escape'){e.preventDefault();close();}if(e.key==='Tab'){const list=[...panel.querySelectorAll('button:not([disabled]),select,input')].filter(n=>!n.hidden&&n.offsetParent!==null);if(e.shiftKey&&document.activeElement===list[0]){e.preventDefault();list.at(-1)?.focus();}else if(!e.shiftKey&&document.activeElement===list.at(-1)){e.preventDefault();list[0]?.focus();}}});
  document.getElementById('learningClose').onclick=()=>close();document.getElementById('learningRetry').onclick=()=>act(()=>client.refresh());document.getElementById('learningBtn').onclick=()=>open();
  return {open,close,render,isOpen:()=>opened,lock:()=>close({focus:false})};
 };
})(window);
