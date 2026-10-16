import {characterModels} from './character-models.js';
import {createCharacterPreview} from './character-preview.js';
import {characterSlots} from './character-profile.js';

// No Auth/Firestore writes here. A profile error is never interpreted as absence.
// Modes: 'select' (roster of saved characters, explicit "Vào làng"), 'create'
// (the "+" slot: model + name, "Quay lại"/"Tạo nhân vật") and 'profile' (the
// in-game character sheet, read-only). The roster has exactly as many slots as
// the profile store supports (characterSlots); no placeholder slots.
// onStart runs synchronously inside the player's Enter tap so fullscreen and
// orientation lock may be requested by the browser.
export function createCharacterCreation({store,getUid,game,THREE,onReady=()=>{},onLogout=()=>{},onStart=()=>{},onScreenChange=()=>{},
 getExperience=()=>null,document=globalThis.document,models=characterModels,createPreview=createCharacterPreview,slots=characterSlots}){
 const el=id=>document.getElementById(id),screen=el('characterCreation'),name=el('characterName');
 let uid=null,revision=0,modelRevision=0,ready=false,open=false,phase='locked',character=null;
 const defaultModel=()=>models.find(m=>m.available&&m.defaultChoice)||models.find(m=>m.available);
 let selected=defaultModel()?.id||null,preview=null,modelReady=false,modelBusy=false,busy=false;
 let errorKind='',pending=null,draftUid=null,mode='create',portrait=null,justCreated=false,sheetTab='stats',sheetTimer=null,sheetSignature='';
 const available=id=>models.find(m=>m.id===id&&m.available);
 const modelLabel=id=>models.find(m=>m.id===id)?.label||'';
 function status(text,error=false){el('characterStatus').textContent=text;el('characterStatus').classList.toggle('character-error',error);}
 function previewState(){
  const node=el('characterPreviewState');if(!node)return;
  const text=modelBusy?'Đang tải mô hình…':errorKind==='model'?'Chưa tải được mô hình. Bấm Thử lại.':errorKind==='saved-model'?'Chưa hiển thị được mẫu đã lưu.':'';
  node.textContent=text;node.hidden=!text;node.classList?.toggle?.('is-error',!!errorKind);
 }
 function node(tag,className,text){const item=document.createElement(tag);if(className)item.className=className;if(text!=null)item.textContent=text;return item;}
 function levelText(){const exp=getExperience?.();return exp?.status==='ready'&&exp.level>=1?'LV '+exp.level:'LV –';}
 // Saved characters (at most `slots`) plus a "+" slot only while one is free.
 function renderRoster(){
  const box=el('characterRoster');if(!box)return;box.replaceChildren?.();
  const saved=character?[character]:[];
  for(const item of saved){
   const button=node('button','character-slot');button.type='button';button.id='characterSlot-'+item.modelId;
   button.setAttribute('aria-pressed',String(mode!=='create'));button.disabled=busy;
   const face=node('span','character-slot-portrait');
   if(portrait){const image=node('img');image.alt='';image.src=portrait;face.append(image);}else face.textContent=Array.from(item.name)[0]?.toUpperCase()||'?';
   const text=node('span','character-slot-text');text.append(node('strong',null,item.name),node('small',null,levelText()+' · '+modelLabel(item.modelId)));
   button.append(face,text);button.addEventListener('click',()=>void back());box.append(button);
  }
  if(saved.length<slots&&phase!=='loading'&&!['profile','saved-model'].includes(errorKind)){
   const add=node('button','character-slot character-slot-add');add.type='button';add.id='characterSlotAdd';add.disabled=busy;
   add.setAttribute('aria-pressed',String(mode==='create'));
   add.append(node('span','character-slot-portrait','+'),node('span','character-slot-text','Tạo nhân vật mới'));
   add.addEventListener('click',()=>void startCreate());box.append(add);
  }
  const note=el('characterRosterNote');
  if(note)note.textContent='Mỗi tài khoản hiện lưu '+slots+' nhân vật trên trình duyệt này ('+saved.length+'/'+slots+').';
 }
 function controls(){
  const locked=busy||phase==='loading'||['profile','saved-model'].includes(errorKind);
  el('createCharacterBtn').disabled=locked||!modelReady||modelBusy||!!errorKind||mode!=='create';
  el('resetCharacterBtn').disabled=locked||mode!=='create';name.disabled=locked||mode!=='create';
  for(const model of models){const button=el('characterModel-'+model.id);button.disabled=!model.available||locked||mode!=='create';button.setAttribute('aria-pressed',String(selected===model.id));}
  el('characterRetryBtn').hidden=!errorKind;
  el('characterCreationClose').hidden=mode!=='profile';
  el('createCharacterBtn').hidden=mode!=='create';el('resetCharacterBtn').hidden=mode!=='create';
  const backButton=el('characterBackBtn');if(backButton){backButton.hidden=mode!=='create'||!character;backButton.disabled=busy;}
  const enter=el('characterEnterBtn');if(enter){enter.hidden=mode!=='select';enter.disabled=locked||!modelReady||modelBusy||!!errorKind||mode!=='select'||!character;}
  const createPanel=el('characterCreatePanel'),infoPanel=el('characterInfoPanel'),tabs=el('characterSheetTabs'),roster=el('characterRosterPanel');
  if(createPanel)createPanel.hidden=mode!=='create';if(infoPanel)infoPanel.hidden=mode==='create';
  if(tabs)tabs.hidden=mode!=='profile';if(roster)roster.hidden=mode==='profile';
  previewState();renderRoster();renderInfo();
  el('characterProfileBack').hidden=mode!=='profile';
  const testing=!!globalThis.location&&['localhost','127.0.0.1','[::1]'].includes(globalThis.location.hostname)&&new URLSearchParams(globalThis.location.search).get('characterTest')==='1';
  el('characterAnimationTestBtn').hidden=mode!=='profile'||!testing;
  screen.setAttribute('aria-busy',String(locked||modelBusy));
 }
 function renderInfo(){
  const nameNode=el('characterInfoName');if(!nameNode)return;
  nameNode.textContent=character?.name||'';
  const model=el('characterInfoModel');if(model)model.textContent=character?modelLabel(character.modelId)+' · 2,35 m · '+levelText():'';
  const face=el('characterInfoPortrait');
  if(face){face.replaceChildren?.();if(portrait){const image=node('img');image.alt='';image.src=portrait;face.append(image);}else face.textContent=Array.from(character?.name||'?')[0]?.toUpperCase()||'?';}
 }
 // ---- In-game character sheet (Hình 2): read-only, from the live systems ----
 const TABS=[['stats','Thuộc tính','◈'],['gear','Trang bị','⚔'],['skills','Kỹ năng','✦'],['journey','Hành trình','✓']];
 const fmt=new Intl.NumberFormat('vi-VN'),dec=new Intl.NumberFormat('vi-VN',{maximumFractionDigits:1});
 function row(list,label,value,hint){const item=node('div','character-stat');item.append(node('span','character-stat-label',label),node('strong','character-stat-value',value));if(hint)item.append(node('small',null,hint));list.append(item);}
 function renderSheet(force=false){
  const box=el('characterSheet');if(!box||mode!=='profile')return;
  const sheet=game.characterSheet?.()||null,exp=sheet?.experience,skillsNow=sheet?.weapon?.skills||[];
  const signature=JSON.stringify([sheetTab,exp?.text,sheet?.health,sheet?.weapon?.id,skillsNow.map(s=>s.remaining.toFixed(1)),sheet?.completedQuests?.length,sheet?.openQuests,sheet?.tutorials]);
  if(!force&&signature===sheetSignature)return;sheetSignature=signature;
  for(const [id] of TABS){const tab=el('characterTab-'+id);tab?.setAttribute('aria-selected',String(id===sheetTab));}
  box.replaceChildren?.();
  if(!sheet){box.append(node('p',null,'Chưa đọc được dữ liệu nhân vật.'));return;}
  if(sheetTab==='stats'){
   const list=node('div','character-stat-list');box.append(list);
   row(list,'Cấp độ',exp?.status==='ready'?'LV '+fmt.format(exp.level):'Chưa đọc được',exp?.capped?'Đã đạt giới hạn Alpha':'LV không đánh giá năng lực học tập');
   if(exp?.status==='ready')row(list,'Kinh nghiệm',exp.capped?'Tối đa Alpha':fmt.format(exp.exp)+' / '+fmt.format(exp.required)+' EXP',exp.capped?'':'Còn '+fmt.format(exp.remaining)+' EXP để lên LV '+(exp.level+1));
   if(sheet.health)row(list,'Máu (HP)',fmt.format(sheet.health.hp)+' / '+fmt.format(sheet.health.maxHp),sheet.health.alive?'Hồi đầy tại Thầy thuốc':'Đã gục');
   row(list,'Tốc độ di chuyển','Đi '+dec.format(sheet.movement.walk)+' m/s · Chạy '+dec.format(sheet.movement.run)+' m/s','Giữ Shift để chạy');
   row(list,'Năng lực học tập','Chưa đánh giá','Năm mức: Yếu–kém · Trung bình · Trung bình khá · Khá · Giỏi');
   box.append(node('p','character-sheet-note','Bản thử nghiệm chưa có chỉ số công, thủ hay tài nguyên dùng kỹ năng; kỹ năng chỉ có hồi chiêu.'));
  }else if(sheetTab==='gear'){
   const list=node('div','character-stat-list');box.append(list);
   row(list,'Vũ khí',sheet.weapon?sheet.weapon.name:'Chưa cầm vũ khí',sheet.weapon?'Đổi trong Công cụ → Vũ khí':'Mở Công cụ → Vũ khí để chọn');
   row(list,'Trang phục','Bộ tân thủ mặc định','Chưa có trang phục khác');
   row(list,'Mẫu nhân vật',modelLabel(character?.modelId)+' · cao 2,35 m');
  }else if(sheetTab==='skills'){
   if(!sheet.weapon){box.append(node('p',null,'Chưa cầm vũ khí. Mỗi vũ khí có 3 kỹ năng: ô 1 là đòn chính (phím J hoặc 1), ô 2 và 3 dùng phím 2, 3.'));return;}
   const list=node('div','character-skill-list');box.append(list);
   for(const skill of skillsNow){
    const item=node('div','character-skill');
    item.append(node('strong',null,skill.slot+' · '+skill.name),node('small',null,(skill.aimed?'Ngắm hướng/điểm · giữ và kéo (điện thoại) hoặc phím rồi chuột (máy tính)':'Tác động quanh nhân vật · chạm hoặc bấm phím')+' · Hồi '+dec.format(skill.cooldown)+' giây · Tầm '+dec.format(skill.range)+' m'),node('p',null,skill.description));
    if(skill.remaining>0)item.append(node('small','character-skill-cooldown','Đang hồi: '+skill.remaining.toFixed(1)+' giây'));
    list.append(item);
   }
  }else{
   const list=node('div','character-stat-list');box.append(list);
   row(list,'Nhiệm vụ đã hoàn thành',fmt.format(sheet.completedQuests.length),sheet.openQuests?'Đang làm '+sheet.openQuests+' nhiệm vụ':'');
   for(const quest of sheet.completedQuests)row(list,quest.category,'✓ '+quest.name);
   if(sheet.tutorials){row(list,'Hướng dẫn di chuyển',sheet.tutorials.movement?'Đã xong':'Chưa xong');row(list,'Hướng dẫn dùng chiêu',sheet.tutorials.skills?'Đã xong':'Chưa xong');}
  }
 }
 function showTab(id){if(!TABS.some(t=>t[0]===id))return false;sheetTab=id;renderSheet(true);return true;}
 function show(nextMode){
  mode=nextMode;open=true;screen.hidden=false;game.pauseCharacterSetup?.();screen.setAttribute?.('data-mode',mode);
  el('playerAvatarBtn').setAttribute('aria-expanded','true');
  screen.querySelector?.('.character-columns')?.scrollTo?.(0,0);
  el('characterCreationTitle').textContent=mode==='profile'?'NHÂN VẬT':mode==='select'?'CHỌN NHÂN VẬT':'TẠO NHÂN VẬT MỚI';
  el('characterCreationIntro').textContent=mode==='profile'?'Thông tin lấy trực tiếp từ hành trình đang chơi · Esc hoặc C để đóng.':mode==='select'?'Chọn nhân vật rồi bấm Vào làng · Tiến độ được giữ nguyên.':'Chọn người đồng hành và đặt tên cho hành trình ở Làng Việt.';
  clearInterval(sheetTimer);sheetTimer=null;
  if(mode==='profile'){sheetSignature='';renderSheet(true);sheetTimer=setInterval(()=>renderSheet(),500);}
  controls();try{onScreenChange(true);}catch(_){}
 }
 function stopPreview(){modelRevision++;preview?.dispose();preview=null;modelReady=false;modelBusy=false;}
 function hide(){open=false;screen.hidden=true;clearInterval(sheetTimer);sheetTimer=null;el('playerAvatarBtn').setAttribute('aria-expanded','false');stopPreview();game.clearMotion?.();try{onScreenChange(false);}catch(_){}}
 async function selectModel(id){
  const model=available(id);if(!model||busy||!open||!getUid()||phase==='loading'||['profile','saved-model'].includes(errorKind))return false;
  if(mode!=='create'&&id!==character?.modelId)return false;
  selected=id;const request=++modelRevision,owner=uid;modelReady=false;modelBusy=true;errorKind='';controls();
  status('Đang tải mô hình '+model.label+'…');previewState();
  try{
   preview ||= createPreview({container:el('characterPreview'),THREE});preview.start();
   await preview.showModel(model.url,model.visual);
   if(request!==modelRevision||owner!==getUid()||!open)return false;
   modelReady=true;
   // Head-and-shoulders snapshot of the saved character for the HUD/roster; memory only, never stored.
   if(mode!=='create')try{portrait=preview.capturePortrait?.()||portrait;}catch(_){}
   status(mode==='profile'?character.name+' · '+model.label+' · Kéo để xoay nhân vật.':mode==='select'?character.name+' · Mẫu '+model.label+' sẵn sàng. Bấm Vào làng để tiếp tục.':'Mẫu '+model.label+' sẵn sàng. Nhập tên rồi bấm Tạo nhân vật.');return true;
  }catch(error){if(request===modelRevision&&open){errorKind='model';status('Không tải được mô hình: '+error.message+' Hãy thử lại.',true);}return false;}
  finally{if(request===modelRevision){modelBusy=false;controls();}}
 }
 async function applySaved(saved,request,newCharacter){
  character=saved;selected=saved.modelId;name.value=saved.name;
  if(!available(saved.modelId))throw Object.assign(new Error('Mẫu đã lưu chưa có trên máy này. Hồ sơ được giữ nguyên; cần bổ sung đúng GLB rồi thử lại.'),{kind:'saved-model'});
  const applied=await game.applyCharacter(saved,available(saved.modelId));
  if(request!==revision||getUid()!==uid)return false;
  if(!applied)throw Object.assign(new Error('Chưa tải được mẫu nhân vật đã lưu vào game. Hồ sơ vẫn được giữ nguyên.'),{kind:'saved-model'});
  ready=true;phase='ready';errorKind='';justCreated=false;if(portrait)game.setPortrait?.(portrait);hide();onReady(saved);
  const entered=game.enterCharacter?.({newCharacter});
  if(entered===false){ready=false;throw new Error('Điểm khởi đầu chưa sẵn sàng. Hồ sơ đã lưu; hãy thử lại.');}
  return true;
 }
 async function showSelect(){
  phase='select';show('select');
  if(!available(character.modelId))throw Object.assign(new Error('Mẫu đã lưu chưa có trên máy này. Hồ sơ được giữ nguyên; cần bổ sung đúng GLB rồi thử lại.'),{kind:'saved-model'});
  return selectModel(character.modelId);
 }
 async function load(){
  const owner=getUid();if(!owner)return false;
  const request=++revision;uid=owner;ready=false;phase='loading';errorKind='';justCreated=false;show('create');status('Đang tải hồ sơ nhân vật theo tài khoản…');
  try{
   const result=await store.load();if(request!==revision||owner!==getUid())return false;
   if(result.status==='ready'){
    // A saved character is shown first and entered only on "Vào làng": no re-creation,
    // and previewing never writes the profile.
    character=result.character;selected=character.modelId;name.value=character.name;draftUid=owner;
    await showSelect();return false;
   }
   if(!['missing','legacy'].includes(result.status))throw new Error('Trạng thái hồ sơ không hợp lệ.');
   character=null;phase='creating';
   if(draftUid!==owner){name.value='';selected=defaultModel()?.id||null;draftUid=owner;}
   controls();
   if(selected)await selectModel(selected);else{errorKind='model';status('Chưa có mô hình nhân vật để khởi tạo.',true);controls();}
   return false;
  }catch(error){if(request===revision&&owner===getUid()){phase='error';errorKind=error.kind||'profile';show(character?'select':'create');status(error.message+' Hồ sơ cũ không bị ghi đè.',true);controls();}return false;}
 }
 // Saved profile → game. Only from the select screen, once, for the same UID.
 async function enter(){
  if(busy||!open||mode!=='select'||!character||!modelReady||modelBusy||errorKind||getUid()!==uid)return false;
  try{onStart();}catch(_){}
  const owner=uid,request=revision;busy=true;controls();status('Đang vào làng…');
  try{return await applySaved(character,request,justCreated);}
  catch(error){if(owner===getUid()&&request===revision){errorKind=error.kind||'enter';show('select');status('Chưa vào làng: '+error.message,true);}return false;}
  finally{if(request===revision){busy=false;controls();}}
 }
 // "+" slot: only while the account has a free slot; the draft name stays across resizes.
 async function startCreate(){
  if(busy||!open||mode==='profile'||phase==='loading'||(character&&slots<=1)||['profile','saved-model'].includes(errorKind))return false;
  phase='creating';show('create');if(!available(selected))selected=defaultModel()?.id||null;
  return selected?selectModel(selected):false;
 }
 async function back(){
  if(busy||!open||!character||mode==='profile')return false;
  if(mode==='select'&&modelReady)return true;
  errorKind='';return showSelect().catch(error=>{errorKind=error.kind||'profile';status(error.message,true);controls();return false;});
 }
 async function onAuthState(authenticated){
  if(!authenticated||!getUid()){
   revision++;ready=false;busy=false;pending=null;phase='locked';character=null;portrait=null;justCreated=false;hide();return false;
  }
  if(uid===getUid()&&(ready||pending||phase==='creating'||phase==='select'))return ready;
  const task=load();pending=task;try{return await task;}finally{if(pending===task)pending=null;}
 }
 // Create writes the profile once (store lock + pending guard), then returns to
 // the roster with the new character selected; "Vào làng" enters the game.
 async function submit(){
  if(busy||!open||mode!=='create'||!modelReady||modelBusy||errorKind||getUid()!==uid)return false;
  const owner=uid,request=revision;busy=true;controls();status('Đang lưu nhân vật…');
  try{
   const saved=await store.create({modelId:selected,name:name.value,customization:{}});
   if(owner!==getUid()||request!==revision)return false;
   character=saved;justCreated=true;busy=false;
   await showSelect();
   if(owner===getUid()&&request===revision&&modelReady)status('Đã tạo '+saved.name+'. Bấm Vào làng để bắt đầu.');
   return true;
  }catch(error){if(owner===getUid()&&request===revision){
   phase='creating';errorKind=character?'saved-model':'save';show(character?'select':'create');status('Chưa tạo được nhân vật: '+error.message+' Lựa chọn được giữ để thử lại.',true);
  }return false;}
  finally{if(request===revision){busy=false;controls();}}
 }
 async function retry(){
  if(busy||modelBusy||!getUid())return false;
  const kind=errorKind;errorKind='';controls();
  if(kind==='model')return selectModel(selected);
  if(kind==='save')return submit();
  if(kind==='enter'){await selectModel(selected);return false;}
  return load();
 }
 async function openProfile(){
  if(!ready||!character||!getUid())return false;
  if(!game.canOpenCharacter?.())return false;
  show('profile');name.value=character.name;await selectModel(character.modelId);return true;
 }
 function close(){if(mode!=='profile'||busy)return;hide();document.activeElement?.blur?.();el('view')?.focus?.({preventScroll:true});}
 el('characterModelChoices').replaceChildren();
 for(const model of models){const button=document.createElement('button');button.id='characterModel-'+model.id;button.type='button';button.textContent=model.label+(model.available?'':' · Chưa có mẫu');button.title=model.reason||model.label;button.disabled=!model.available;
  button.addEventListener('click',()=>selectModel(model.id));el('characterModelChoices').append(button);
 }
 // Only real data is shown: no selectable hair/face/age options until they exist.
 el('characterAppearanceGroups').replaceChildren();
 for(const [title,detail] of [['Chiều cao','2,35 m · theo mẫu'],['Tùy chỉnh ngoại hình','Chưa hỗ trợ · dùng ngoại hình mặc định của mẫu']]){const item=document.createElement('div');item.className='character-option';const heading=document.createElement('strong'),description=document.createElement('small');heading.textContent=title;description.textContent=detail;item.append(heading,description);el('characterAppearanceGroups').append(item);}
 const tabs=el('characterSheetTabs');
 if(tabs){tabs.replaceChildren?.();for(const [id,label,glyph] of TABS){const tab=node('button','character-tab');tab.type='button';tab.id='characterTab-'+id;tab.setAttribute('role','tab');tab.append(node('span','character-tab-icon',glyph),node('span',null,label));tab.addEventListener('click',()=>showTab(id));tabs.append(tab);}}
 el('characterForm').addEventListener('submit',event=>{event.preventDefault();if(mode==='select')void enter();else if(mode==='create')void submit();});
 el('characterEnterBtn')?.addEventListener('click',()=>void enter());
 el('characterBackBtn')?.addEventListener('click',()=>void back());
 el('characterRetryBtn').addEventListener('click',()=>void retry());
 el('resetCharacterBtn').addEventListener('click',()=>{if(busy||mode!=='create'||phase==='loading'||['profile','saved-model'].includes(errorKind))return;name.value='';errorKind='';void selectModel(defaultModel()?.id);preview?.resetView();});
 el('characterFrontBtn').addEventListener('click',()=>preview?.resetView());
 el('characterPreview').addEventListener('character-preview-error',event=>{
  if(!open)return;stopPreview();errorKind='model';status(event.detail+' Nhấn Thử lại để dựng lại khung xem.',true);controls();
 });
 el('characterCreationClose').addEventListener('click',close);el('characterProfileBack').addEventListener('click',close);
 el('characterLogoutBtn').addEventListener('click',()=>{if(!busy)onLogout();});
 el('playerAvatarBtn').addEventListener('click',()=>void openProfile());
 el('characterAnimationTestBtn').addEventListener('click',()=>{close();globalThis.VietVillagePlayerAvatar?.open();});
 for(const event of ['pointerdown','pointermove','pointerup','click','wheel'])screen.addEventListener(event,e=>e.stopPropagation());
 screen.addEventListener('keydown',event=>{
  event.stopPropagation();if(event.key==='Escape'){event.preventDefault();close();}
  if(event.code==='KeyC'&&mode==='profile'&&!event.repeat&&!['INPUT','TEXTAREA','SELECT'].includes(event.target?.tagName)){event.preventDefault();close();}
  if(event.key==='Tab'){const nodes=[...screen.querySelectorAll('button:not(:disabled),input:not(:disabled)')].filter(node=>node.offsetParent!==null),first=nodes[0],last=nodes.at(-1);
   if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
   else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
  }
 });
 screen.hidden=true;
 return Object.freeze({onAuthState,submit,enter,startCreate,back,showTab,retry,openProfile,close,selectModel,isReady:()=>ready,isOpen:()=>open,isBlocking:()=>!ready||open,
  get state(){return {ready,open,phase,mode,busy,modelReady,modelBusy,selected,errorKind,character,slots,sheetTab,justCreated};}});
}
