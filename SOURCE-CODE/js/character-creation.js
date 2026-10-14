import {characterModels,appearanceGroups} from './character-models.js';
import {createCharacterPreview} from './character-preview.js';

// No Auth/Firestore writes here. A profile error is never interpreted as absence.
export function createCharacterCreation({store,getUid,game,THREE,onReady=()=>{},onLogout=()=>{},
 document=globalThis.document,models=characterModels,createPreview=createCharacterPreview}){
 const el=id=>document.getElementById(id),screen=el('characterCreation'),name=el('characterName');
 let uid=null,revision=0,modelRevision=0,ready=false,open=false,phase='locked',character=null;
 const defaultModel=()=>models.find(m=>m.available&&m.defaultChoice)||models.find(m=>m.available);
 let selected=defaultModel()?.id||null,preview=null,modelReady=false,modelBusy=false,busy=false;
 let errorKind='',pending=null,draftUid=null,mode='create';
 const available=id=>models.find(m=>m.id===id&&m.available);
 function status(text,error=false){el('characterStatus').textContent=text;el('characterStatus').classList.toggle('character-error',error);}
 function controls(){
  const locked=busy||phase==='loading'||['profile','saved-model'].includes(errorKind);
  el('createCharacterBtn').disabled=locked||!modelReady||modelBusy||!!errorKind||mode!=='create';
  el('resetCharacterBtn').disabled=locked||mode!=='create';name.disabled=locked||mode!=='create';
  for(const model of models){const button=el('characterModel-'+model.id);button.disabled=!model.available||locked||mode!=='create';button.setAttribute('aria-pressed',String(selected===model.id));}
  el('characterRetryBtn').hidden=!errorKind;
  el('characterCreationClose').hidden=mode!=='profile';
  el('createCharacterBtn').hidden=el('resetCharacterBtn').hidden=mode==='profile';
  el('characterProfileBack').hidden=mode!=='profile';
  const testing=!!globalThis.location&&['localhost','127.0.0.1','[::1]'].includes(globalThis.location.hostname)&&new URLSearchParams(globalThis.location.search).get('characterTest')==='1';
  el('characterAnimationTestBtn').hidden=mode!=='profile'||!testing;
  screen.setAttribute('aria-busy',String(locked||modelBusy));
 }
 function show(nextMode){
  mode=nextMode;open=true;screen.hidden=false;game.pauseCharacterSetup?.();
  el('playerAvatarBtn').setAttribute('aria-expanded','true');
  screen.querySelector?.('.character-columns')?.scrollTo?.(0,0);
  el('characterCreationTitle').textContent=mode==='profile'?'NHÂN VẬT CỦA EM':'KHỞI TẠO NHÂN VẬT';
  el('characterCreationIntro').textContent=mode==='profile'?'Hồ sơ đã tạo · Xem nhân vật, giữ nguyên hành trình.':'Chọn người đồng hành trong hành trình khám phá làng Việt.';
  controls();
 }
 function stopPreview(){modelRevision++;preview?.dispose();preview=null;modelReady=false;modelBusy=false;}
 function hide(){open=false;screen.hidden=true;el('playerAvatarBtn').setAttribute('aria-expanded','false');stopPreview();game.clearMotion?.();}
 async function selectModel(id){
  const model=available(id);if(!model||busy||!open||!getUid()||phase==='loading'||['profile','saved-model'].includes(errorKind))return false;
  if(mode==='profile'&&id!==character?.modelId)return false;
  selected=id;const request=++modelRevision,owner=uid;modelReady=false;modelBusy=true;errorKind='';controls();
  status('Đang tải mô hình '+model.label+'…');
  try{
   preview ||= createPreview({container:el('characterPreview'),THREE});preview.start();
   await preview.showModel(model.url,model.visual);
   if(request!==modelRevision||owner!==getUid()||!open)return false;
   modelReady=true;status(mode==='profile'?'Đã tải đúng mẫu '+model.label+' của '+character.name+'.':'Mẫu '+model.label+' sẵn sàng. Nhập tên rồi tạo nhân vật.');return true;
  }catch(error){if(request===modelRevision&&open){errorKind='model';status('Không tải được mô hình: '+error.message+' Hãy thử lại.',true);}return false;}
  finally{if(request===modelRevision){modelBusy=false;controls();}}
 }
 async function applySaved(saved,request,newCharacter){
  character=saved;selected=saved.modelId;name.value=saved.name;
  if(!available(saved.modelId))throw Object.assign(new Error('Mẫu đã lưu chưa có trên máy này. Hồ sơ được giữ nguyên; cần bổ sung đúng GLB rồi thử lại.'),{kind:'saved-model'});
  const applied=await game.applyCharacter(saved,available(saved.modelId));
  if(request!==revision||getUid()!==uid)return false;
  if(!applied)throw Object.assign(new Error('Chưa tải được mẫu nhân vật đã lưu vào game. Hồ sơ vẫn được giữ nguyên.'),{kind:'saved-model'});
  ready=true;phase='ready';errorKind='';hide();onReady(saved);
  const entered=game.enterCharacter?.({newCharacter});
  if(entered===false){ready=false;throw new Error('Điểm khởi đầu chưa sẵn sàng. Hồ sơ đã lưu; hãy thử lại.');}
  return true;
 }
 async function load(){
  const owner=getUid();if(!owner)return false;
  const request=++revision;uid=owner;ready=false;phase='loading';errorKind='';show('create');status('Đang tải hồ sơ nhân vật theo tài khoản…');
  try{
   const result=await store.load();if(request!==revision||owner!==getUid())return false;
   if(result.status==='ready')return await applySaved(result.character,request,false);
   if(!['missing','legacy'].includes(result.status))throw new Error('Trạng thái hồ sơ không hợp lệ.');
   character=null;phase='creating';
   if(draftUid!==owner){name.value='';selected=defaultModel()?.id||null;draftUid=owner;}
   controls();
   if(selected)await selectModel(selected);else{errorKind='model';status('Chưa có mô hình nhân vật để khởi tạo.',true);controls();}
   return false;
  }catch(error){if(request===revision&&owner===getUid()){phase='error';errorKind=error.kind||'profile';show('create');status(error.message+' Hồ sơ cũ không bị ghi đè.',true);controls();}return false;}
 }
 async function onAuthState(authenticated){
  if(!authenticated||!getUid()){
   revision++;ready=false;busy=false;pending=null;phase='locked';character=null;hide();return false;
  }
  if(uid===getUid()&&(ready||pending||phase==='creating'))return ready;
  const task=load();pending=task;try{return await task;}finally{if(pending===task)pending=null;}
 }
 async function submit(){
  if(busy||!open||mode!=='create'||!modelReady||modelBusy||errorKind||getUid()!==uid)return false;
  const owner=uid,request=revision;busy=true;controls();status('Đang lưu nhân vật…');
  try{
   const saved=await store.create({modelId:selected,name:name.value,customization:{}});
   if(owner!==getUid()||request!==revision)return false;
   return await applySaved(saved,request,true);
  }catch(error){if(owner===getUid()&&request===revision){
   phase='creating';errorKind=character?'saved-model':'save';show('create');status('Chưa vào làng: '+error.message+' Lựa chọn được giữ để thử lại.',true);
  }return false;}
  finally{if(request===revision){busy=false;controls();}}
 }
 async function retry(){
  if(busy||modelBusy||!getUid())return false;
  const kind=errorKind;errorKind='';controls();
  if(kind==='model')return selectModel(selected);
  if(kind==='save')return submit();
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
 el('characterAppearanceGroups').replaceChildren();
 for(const title of appearanceGroups){const item=document.createElement('div');item.className='character-option';const heading=document.createElement('strong'),description=document.createElement('small');heading.textContent=title;
  description.textContent=title==='Chiều cao'?'Mặc định 2,35 m · Chưa có dữ liệu tùy chỉnh':title==='Độ tuổi'?'Mặc định theo mẫu · Chưa có dữ liệu tùy chỉnh':'Chưa có dữ liệu tùy chỉnh';item.append(heading,description);el('characterAppearanceGroups').append(item);
 }
 el('characterForm').addEventListener('submit',event=>{event.preventDefault();void submit();});
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
  if(event.key==='Tab'){const nodes=[...screen.querySelectorAll('button:not(:disabled),input:not(:disabled)')].filter(node=>node.offsetParent!==null),first=nodes[0],last=nodes.at(-1);
   if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
   else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
  }
 });
 screen.hidden=true;
 return Object.freeze({onAuthState,submit,retry,openProfile,close,selectModel,isReady:()=>ready,isOpen:()=>open,isBlocking:()=>!ready||open,
  get state(){return {ready,open,phase,mode,busy,modelReady,modelBusy,selected,errorKind,character};}});
}
