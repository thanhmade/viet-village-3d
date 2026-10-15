(function(global){
 'use strict';
 // One evaluation shared by NPC markers, dialogue, journal, tracker and minimap.
 // Pure functions: no storage, DOM or rewards. Callers pass the player's real
 // level and quest phases; unknown data never counts as "requirements met".
 const PHASE_RANK={active:1,ready:2,completed:3};
 const MARKER_RANK={ready:4,available:3,progress:2,locked:1};
 const CATEGORY_RANK={main:0,side:1,learning:2};
 const CATEGORY_LABEL={main:'Chính tuyến',side:'Phụ tuyến',learning:'Học tập'};
 const STATE_LABEL={unknown:'Đang tải tiến độ',invalid:'Dữ liệu nhiệm vụ lỗi',unavailable:'Chưa mở trong bản thử nghiệm',hidden:'Chưa khám phá',
  locked:'Chưa đủ điều kiện',available:'Có thể nhận',active:'Đang thực hiện',ready:'Đủ điều kiện trả',completed:'Đã hoàn thành'};
 const REQUIRED_PHASES=new Set(['active','ready','completed']);
 const categoryOf=value=>Object.hasOwn(CATEGORY_RANK,value)?value:'side';

 // Explicit `requirements` wins. Older data keeps its meaning: every `dependsOn`
 // quest must be turned in (completed), plus an optional `minLevel`.
 function requirementsOf(quest){
  if(quest&&quest.requirements!==undefined)return quest.requirements;
  const all=[];
  if(Number.isInteger(quest?.minLevel)&&quest.minLevel>1)all.push({level:quest.minLevel});
  for(const id of Array.isArray(quest?.dependsOn)?quest.dependsOn:[])all.push({quest:id,state:'completed'});
  return {all};
 }
 function leafType(node){
  if(!node||typeof node!=='object'||Array.isArray(node))return 'bad';
  const keys=Object.keys(node);
  if(keys.length===1&&Array.isArray(node.all))return 'all';
  if(keys.length===1&&Array.isArray(node.any))return node.any.length?'any':'bad';
  if(keys.length===1&&Number.isInteger(node.level)&&node.level>=1)return 'level';
  if(typeof node.quest==='string'&&keys.every(k=>k==='quest'||k==='state')&&(node.state===undefined||REQUIRED_PHASES.has(node.state)))return 'quest';
  return 'bad';
 }
 function questRefs(node,out=[],errors=null,path='requirements'){
  const type=leafType(node);
  if(type==='all'||type==='any')node[type].forEach((child,i)=>questRefs(child,out,errors,path+'.'+type+'['+i+']'));
  else if(type==='quest')out.push(node.quest);
  else if(type==='bad'&&errors)errors.push(path);
  return out;
 }
 // Detect missing references, duplicate IDs, unsupported condition shapes and
 // prerequisite cycles. Broken quests stay closed; nothing is opened to "fix" data.
 function validate(quests,{knownQuestIds=[]}={}){
  const errors=[],invalid=new Set(),byId=new Map(),known=new Set(knownQuestIds);
  for(const q of Array.isArray(quests)?quests:[]){
   if(typeof q?.id!=='string'||!q.id){errors.push({id:null,message:'Nhiệm vụ thiếu ID.'});continue;}
   if(byId.has(q.id)||known.has(q.id)){errors.push({id:q.id,message:'ID nhiệm vụ bị trùng: '+q.id});invalid.add(q.id);continue;}
   byId.set(q.id,q);
  }
  const edges=new Map();
  for(const [id,q] of byId){
   if(q.enabled===false)continue;
   const bad=[],refs=questRefs(requirementsOf(q),[],bad);
   for(const path of bad){errors.push({id,message:'Điều kiện chưa hỗ trợ ở '+id+' ('+path+').'});invalid.add(id);}
   for(const ref of refs)if(!byId.has(ref)&&!known.has(ref)){errors.push({id,message:id+' tham chiếu nhiệm vụ không tồn tại: '+ref});invalid.add(id);}
   edges.set(id,refs.filter(ref=>byId.has(ref)));
  }
  const color=new Map(),stack=[];
  function visit(id){
   color.set(id,1);stack.push(id);
   for(const next of edges.get(id)||[]){
    if(color.get(next)===1){const cycle=stack.slice(stack.indexOf(next));cycle.forEach(x=>invalid.add(x));errors.push({id,message:'Vòng lặp điều kiện: '+cycle.concat(next).join(' → ')});}
    else if(!color.get(next))visit(next);
   }
   stack.pop();color.set(id,2);
  }
  for(const id of edges.keys())if(!color.get(id))visit(id);
  return {errors,invalid};
 }
 // Returns met=true/false, or null when the answer depends on data that is not
 // loaded yet (for example LV while the EXP record is still being read).
 function evaluateCondition(node,ctx){
  const type=leafType(node);
  if(type==='level'){
   const current=ctx.level;
   if(!Number.isFinite(current))return {met:null,items:[{type:'level',met:null,required:node.level,current:null,label:'Yêu cầu LV '+node.level+' — đang đọc LV hiện tại'}]};
   const met=current>=node.level;
   return {met,items:[{type:'level',met,required:node.level,current,label:'Yêu cầu LV '+node.level+' — hiện tại LV '+current}]};
  }
  if(type==='quest'){
   const required=node.state||'completed',phase=ctx.phaseOf(node.quest),name=ctx.nameOf(node.quest)||node.quest;
   if(phase===null)return {met:null,items:[{type:'quest',met:null,quest:node.quest,required,label:'Hoàn thành “'+name+'” — đang đọc tiến độ'}]};
   const met=(PHASE_RANK[phase]||0)>=PHASE_RANK[required];
   const verb=required==='completed'?'Hoàn thành và trả “'+name+'”':required==='ready'?'Đạt mục tiêu “'+name+'”':'Nhận “'+name+'”';
   const now=met?'đã đạt':phase==='ready'&&required==='completed'?'đã đạt mục tiêu, chưa trả nhiệm vụ':phase==='active'?'đang thực hiện':'chưa đạt';
   return {met,items:[{type:'quest',met,quest:node.quest,required,current:phase||'none',label:verb+' — '+now}]};
  }
  if(type==='all'||type==='any'){
   const parts=node[type].map(child=>evaluateCondition(child,ctx));
   let met;
   if(type==='all')met=parts.some(p=>p.met===false)?false:parts.some(p=>p.met===null)?null:true;
   else met=parts.some(p=>p.met===true)?true:parts.some(p=>p.met===null)?null:false;
   if(type==='any')return {met,items:[{type:'any',met,label:'Đạt một trong các điều kiện',options:parts.flatMap(p=>p.items)}]};
   return {met,items:parts.flatMap(p=>p.items)};
  }
  return {met:false,items:[{type:'invalid',met:false,label:'Điều kiện chưa được hỗ trợ'}]};
 }
 function objectiveOf(q,phase,names){
  const o=q.objective||{},target=o.npcId||o.propId||null,name=names?.(target)||'mục tiêu';
  const text=o.type==='talk'?'Trò chuyện với '+name:o.type==='practice-skill'?'Đứng gần, hướng về '+name+' và dùng một chiêu':q.goal||'Hoàn thành mục tiêu';
  const done=phase==='ready'||phase==='completed'?1:0;
  return {text,done,total:1,targetNpc:o.npcId||null,targetProp:o.propId||null};
 }
 // Village quests: data in MAP/regions/<map>/quests.json, phases in the per-UID journal.
 function evaluateVillage({quests,phaseOf,readable=true,level,nameOf=()=>null,rewardOf=()=>null,validation=validate(quests)}){
  const entries=[],questName=id=>quests.find(q=>q.id===id)?.name||nameOf(id);
  (quests||[]).forEach((q,order)=>{
   if(typeof q?.id!=='string')return;
   const category=categoryOf(q.category),base={id:q.id,source:'village',name:q.name||q.id,category,categoryLabel:CATEGORY_LABEL[category],order,
    giverNpc:q.giverNpc||null,turnInNpc:q.turnInNpc||null,goal:q.goal||'',reward:{exp:rewardOf(q.id)},repeatable:q.repeatReward===true};
   if(q.enabled===false){entries.push({...base,state:'unavailable',revealed:false,reason:q.reason||'',requirements:{met:false,items:[]},objective:null});return;}
   if(validation.invalid.has(q.id)){entries.push({...base,state:'invalid',revealed:false,requirements:{met:false,items:[]},objective:null});return;}
   const phase=readable?phaseOf(q.id):null;
   if(!readable||phase===null){entries.push({...base,state:'unknown',revealed:false,requirements:{met:null,items:[]},objective:null});return;}
   const objective=objectiveOf(q,phase,nameOf);
   if(phase){entries.push({...base,state:phase,revealed:true,requirements:{met:true,items:[]},objective});return;}
   const requirements=evaluateCondition(requirementsOf(q),{level,phaseOf:id=>readable?phaseOf(id):null,nameOf:questName});
   const state=requirements.met===true?'available':requirements.met===null?'unknown':q.lockedVisibility==='listed'?'locked':'hidden';
   entries.push({...base,state,revealed:state==='available'||state==='locked',requirements,objective});
  });
  return entries;
 }
 // Learning quests come from the learning client (server, localhost worker or
 // browser practice). Only its own state is used; nothing is graded here.
 function evaluateLearning({offered,getQuest,getRun,getLesson=()=>null,level,state:clientState,nameOf=()=>null}){
  if(!clientState||clientState.status!=='ready'||!clientState.connected)return [];
  const statusMap={accepted:'active',collected:'active',practice_pending:'active',ready_to_turn_in:'ready',completed:'completed'};
  return (offered||[]).map((o,i)=>{
   const q=getQuest(o.questId);if(!q)return null;
   const run=getRun(o.questId),phase=run?statusMap[run.status]||'active':null;
   const lesson=getLesson(q.lesson_id),title=lesson?.title||q.title;
   const base={id:q.id,source:'learning',name:title,questTitle:q.title,category:'learning',categoryLabel:CATEGORY_LABEL.learning,order:1000+i,
    giverNpc:q.giver_npc_ref||null,turnInNpc:q.return_npc_ref||null,goal:q.practice?.instructions||'',reward:{exp:q.reward_policy?.first_clear_exp??null},
    learning:{status:run?.status||'available',levelLabel:o.levelLabel,mode:o.mode,source:o.source}};
   const steps=[!!run,!!run&&run.status!=='accepted',!!run&&(run.questionPassed||run.practiceRequested||['ready_to_turn_in','completed'].includes(run.status)),
    !!run&&(run.practiceApproved||['ready_to_turn_in','completed'].includes(run.status)),run?.status==='completed'];
   const labels=['Nhận nhiệm vụ','Tìm và nhặt thẻ học','Làm bài','Thầy cô xác nhận thực hành','Trả nhiệm vụ cho '+(nameOf(q.return_npc_ref)||'người nhận')];
   const next=steps.findIndex(x=>!x),done=steps.filter(Boolean).length;
   const objective={text:next<0?'Đã hoàn thành':labels[next],done,total:steps.length,targetNpc:run?.status==='ready_to_turn_in'?q.return_npc_ref:null,spawn:run?.status==='accepted'?run.spawn?.position||null:null};
   if(phase)return {...base,state:phase,revealed:true,requirements:{met:true,items:[]},objective};
   if(o.eligible)return {...base,state:'available',revealed:true,requirements:{met:true,items:[]},objective};
   const gate=q.gates?.adventure_mode||{},tree={all:[...(gate.min_level>1?[{level:gate.min_level}]:[]),...(gate.previous_quest?[{quest:gate.previous_quest,state:'completed'}]:[])]};
   const requirements=evaluateCondition(tree,{level,phaseOf:id=>{const r=getRun(id);return r?statusMap[r.status]||'active':undefined;},nameOf:id=>getQuest(id)?.title||id});
   return {...base,state:'locked',revealed:true,requirements,objective};
  }).filter(Boolean);
 }
 // Signals an entry gives each related NPC. Givers, step NPCs and turn-in NPCs differ.
 function signalsOf(entry){
  const out=[],add=(npc,kind)=>{if(npc)out.push({npc,kind,questId:entry.id,category:entry.category,order:entry.order});};
  if(entry.state==='available')add(entry.giverNpc,'available');
  else if(entry.state==='locked'&&entry.revealed)add(entry.giverNpc,'locked');
  else if(entry.state==='ready')add(entry.turnInNpc,'ready');
  else if(entry.state==='active'){add(entry.turnInNpc,'progress');if(entry.objective?.targetNpc&&entry.objective.targetNpc!==entry.turnInNpc)add(entry.objective.targetNpc,'progress');}
  return out;
 }
 function compareSignals(a,b,tracked){
  return MARKER_RANK[b.kind]-MARKER_RANK[a.kind]||(b.questId===tracked)-(a.questId===tracked)||CATEGORY_RANK[a.category]-CATEGORY_RANK[b.category]||a.order-b.order||(a.questId<b.questId?-1:a.questId>b.questId?1:0);
 }
 // One main marker per NPC: can turn in > can accept > in progress > locked;
 // then the tracked quest, then main before side before learning, then data order.
 function markers(entries,{tracked=null}={}){
  const byNpc=new Map();
  for(const entry of entries)for(const signal of signalsOf(entry)){if(!byNpc.has(signal.npc))byNpc.set(signal.npc,[]);byNpc.get(signal.npc).push(signal);}
  const out=new Map();
  for(const [npc,list] of byNpc){list.sort((a,b)=>compareSignals(a,b,tracked));out.set(npc,{kind:list[0].kind,category:list[0].category,questId:list[0].questId,count:list.length});}
  return out;
 }
 // Everything a dialogue with this NPC should list; undiscovered quests stay hidden.
 function relatedTo(entries,npcId,{tracked=null}={}){
  const rank={ready:5,available:4,active:3,locked:2,completed:1};
  return entries.filter(e=>e.revealed&&[e.giverNpc,e.turnInNpc,e.objective?.targetNpc].includes(npcId)&&rank[e.state])
   .sort((a,b)=>(a.source==='village'?0:1)-(b.source==='village'?0:1)||rank[b.state]-rank[a.state]||(b.id===tracked)-(a.id===tracked)||CATEGORY_RANK[a.category]-CATEGORY_RANK[b.category]||a.order-b.order);
 }
 // Default tracked quest: the stored choice when still open, else the first
 // in-progress main quest, then any ready/active quest, then any available one.
 function pickTracked(entries,stored){
  const open=entries.filter(e=>['active','ready','available'].includes(e.state));
  if(stored&&open.some(e=>e.id===stored))return stored;
  const order=(a,b)=>CATEGORY_RANK[a.category]-CATEGORY_RANK[b.category]||a.order-b.order;
  for(const states of [['ready','active'],['available']]){const list=open.filter(e=>states.includes(e.state)).sort(order);if(list.length)return list[0].id;}
  return null;
 }
 global.VietVillageQuestStatus=Object.freeze({requirementsOf,validate,evaluateCondition,evaluateVillage,evaluateLearning,signalsOf,markers,relatedTo,pickTracked,
  stateLabel:state=>STATE_LABEL[state]||state,categoryLabel:category=>CATEGORY_LABEL[categoryOf(category)],MARKER_RANK,CATEGORY_RANK});
})(typeof window==='undefined'?globalThis:window);
