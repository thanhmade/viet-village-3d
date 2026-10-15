(function(global){
 'use strict';
 // HUD presenter only: shows the saved character, LV/EXP, HP and the shared
 // quest board. It never writes progress, rewards or quest phases; tracking a
 // quest is delegated to the NPC controller, which owns that small preference.
 const PREF_KEY='viet-village:quest-tracker:v1';
 global.createVillageGameHud=function({document,getCharacter=()=>null,getExperience=()=>null,getRegionName=()=>'',getBoard=()=>null,
  track=()=>false,goTo=()=>false,openDetail=()=>{},nameOf=()=>null,storage=null}){
  const el=id=>document.getElementById(id);
  let board=null,cardSignature='',trackerSignature='',portrait=null,collapsed=false;
  try{collapsed=JSON.parse(storage?.getItem(PREF_KEY)||'null')?.collapsed===true;}catch(_){collapsed=false;}
  const text=(id,value)=>{const node=el(id);if(node&&node.textContent!==value)node.textContent=value;};
  function renderCard(){
   const character=getCharacter(),exp=getExperience(),name=character?.name||'Nhân vật',level=exp?.status==='ready'&&exp.level>=1?'LV '+exp.level:'LV –';
   const signature=[name,level,character?.modelId,portrait].join('|');if(signature===cardSignature)return;cardSignature=signature;
   text('playerCardName',name);text('playerCardLevel',level);
   const image=el('playerPortraitImage'),glyph=el('playerPortraitGlyph');
   if(image){image.hidden=!portrait;if(portrait&&image.getAttribute?.('src')!==portrait)image.setAttribute?.('src',portrait);}
   if(glyph){glyph.hidden=!!portrait;glyph.textContent=Array.from(name.trim())[0]?.toUpperCase()||'?';}
   el('playerCard')?.setAttribute?.('aria-label','Nhân vật '+name+' · '+level);
  }
  function destination(entry){
   if(!entry)return '';
   if(entry.source==='learning'){
    const s=entry.learning?.status;
    if(s==='accepted')return 'Tìm thẻ học trong Làng Việt';
    if(s==='collected')return 'Mở bảng nhiệm vụ để làm bài';
    if(s==='practice_pending')return 'Nhờ thầy cô xác nhận phần thực hành';
    if(s==='ready_to_turn_in')return 'Đến: '+(nameOf(entry.turnInNpc)||'người nhận');
    return 'Đến: '+(nameOf(entry.giverNpc)||'người giao');
   }
   const target=entry.state==='available'?entry.giverNpc:entry.state==='ready'?entry.turnInNpc:entry.objective?.targetNpc||entry.objective?.targetProp||entry.turnInNpc;
   return target?'Đến: '+(nameOf(target)||'mục tiêu')+' · Làng Việt':'';
  }
  function open(){return (board?.entries||[]).filter(e=>['ready','active','available'].includes(e.state));}
  function renderTracker(){
   const root=el('questTracker');if(!root)return;
   const entry=board?.entries?.find(e=>e.id===board.tracked)||null,list=open();
   const signature=JSON.stringify([board?.status,board?.revision,collapsed,getRegionName()]);if(signature===trackerSignature)return;trackerSignature=signature;
   root.classList?.[collapsed?'add':'remove']('is-collapsed');
   const toggle=el('questTrackerToggle');toggle?.setAttribute?.('aria-expanded',String(!collapsed));
   if(toggle)toggle.textContent=(collapsed?'▸ ':'▾ ')+'Nhiệm vụ'+(list.length?' · '+list.length:'');
   const body=el('questTrackerBody');if(body)body.hidden=collapsed;
   const sw=el('questTrackerSwitch');if(sw){sw.hidden=collapsed||list.length<2;sw.disabled=list.length<2;}
   if(!board||board.status==='loading'){text('questTrackerName','Đang tải nhiệm vụ…');text('questTrackerTag','');text('questTrackerObjective','');text('questTrackerWhere','');setActions(null);return;}
   if(board.status==='error'){text('questTrackerName','Chưa đọc được tiến độ nhiệm vụ');text('questTrackerTag','');text('questTrackerObjective','Dữ liệu cũ được giữ nguyên. Hãy tải lại trang.');text('questTrackerWhere','');setActions(null);return;}
   if(!entry){text('questTrackerName','Chưa có nhiệm vụ đang mở');text('questTrackerTag','');text('questTrackerObjective','Trò chuyện với dân làng có dấu ! để nhận nhiệm vụ.');text('questTrackerWhere','');setActions(null);return;}
   const tag=el('questTrackerTag');if(tag){tag.textContent=entry.categoryLabel;tag.className='quest-tracker-tag quest-tag-'+entry.category;}
   text('questTrackerName',entry.name);
   const progress=entry.objective?(entry.state==='available'?'Có thể nhận':'Mục tiêu: '+entry.objective.text+' · '+entry.objective.done+'/'+entry.objective.total):'';
   text('questTrackerObjective',entry.state==='ready'&&entry.source==='village'?'Đã đạt mục tiêu · Trả nhiệm vụ':progress);
   text('questTrackerWhere',destination(entry));setActions(entry);
  }
  function setActions(entry){const go=el('questTrackerGo'),detail=el('questTrackerDetail');if(go)go.disabled=!entry;if(detail)detail.disabled=!entry&&!board?.entries?.length;}
  function render(next){if(next)board=next;renderTracker();}
  function update(){renderCard();if(!board)board=getBoard();renderTracker();}
  function setCollapsed(value){collapsed=!!value;trackerSignature='';try{storage?.setItem?.(PREF_KEY,JSON.stringify({collapsed}));}catch(_){}renderTracker();}
  const on=(id,fn)=>{const node=el(id);if(node)node.onclick=fn;};
  on('questTrackerToggle',()=>setCollapsed(!collapsed));
  on('questTrackerSwitch',()=>{const list=open();if(list.length<2)return;const i=list.findIndex(e=>e.id===board.tracked);track(list[(i+1)%list.length].id);});
  on('questTrackerGo',()=>{const entry=board?.entries?.find(e=>e.id===board.tracked);if(entry)goTo(entry);});
  on('questTrackerDetail',()=>openDetail(board?.entries?.find(e=>e.id===board.tracked)||null));
  // HUD taps must not reach the 3D view (camera drag, tap-to-walk) behind it.
  for(const id of ['playerCard','questTracker'])for(const type of ['pointerdown','pointerup','pointermove','click','dblclick','wheel','touchstart','touchend','keydown'])el(id)?.addEventListener?.(type,e=>e.stopPropagation());
  return Object.freeze({render,update,setPortrait(url){portrait=typeof url==='string'&&url.startsWith('data:image/')?url:null;cardSignature='';renderCard();},
   lock(){board=null;cardSignature='';trackerSignature='';portrait=null;},get state(){return {collapsed,tracked:board?.tracked||null,status:board?.status||null};}});
 };
})(typeof window==='undefined'?globalThis:window);
