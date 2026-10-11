import {onlineConfig} from './online-config.js';
import {createProfileStore,profileInput} from './player-profile.js';
import {createRoomClient} from './room-client.js';
import {createRemotePlayers} from './remote-players.js';
const element=id=>document.getElementById(id);
export function initializeOnline({app,auth,authSDK,isAuthenticated,sdkVersion}) {
  let uid=null,profile=null,role='student',room=null,avatars=null,revision=0,starting=false;
  const panel=element('roomPanel'),status=element('onlineStatus');
  const ready=()=>onlineConfig.enabled && !!profile && isAuthenticated();
  const getUid=()=>isAuthenticated()?auth.currentUser?.uid:null;
  const notice=(message,error=false)=>{status.textContent=message;panel.classList.toggle('error',error);};
  function renderRoom(state={}) {
    const current=state.room; element('roomDetails').hidden=!current;
    element('saveProfileBtn').disabled=!ready() || !!current;
    element('joinRoomBtn').disabled=element('createRoomBtn').disabled=!ready() || !!state.busy;
    element('walkRoomBtn').disabled=!current || !state.connected;
    element('currentRoomCode').textContent=current?'Phòng '+current.code:'';
    element('roomMemberCount').textContent=current?(state.connected?`${state.members?.length || 0} / 8 người`:'Đang kết nối lại…'):'';
    element('roomMembers').replaceChildren();
    for(const member of state.members || []){const item=document.createElement('li');item.textContent=member.nickname+(member.uid===uid?' · Em':'');element('roomMembers').append(item);}
    element('closeOnlineRoomBtn').hidden=!current || !(['teacher','admin'].includes(role) && (state.meta?.ownerUid===uid || role==='admin'));
    if(state.message)notice(state.message);
    if(!current)window.VietVillageGame?.stopRoomWalk();
  }
  function openPanel(){panel.classList.remove('hidden');window.VietVillageGame?.clearMotion();element('closeRoomPanel').focus();}
  function closePanel(){panel.classList.add('hidden');window.VietVillageGame?.clearMotion();}
  element('onlineRoomBtn').onclick=element('homeRoomBtn').onclick=openPanel;
  element('closeRoomPanel').onclick=closePanel;
  panel.addEventListener('keydown',event=>{event.stopPropagation();if(event.key==='Escape')closePanel();});
  for(const type of ['pointerdown','pointerup','pointermove','wheel','click'])panel.addEventListener(type,event=>event.stopPropagation());
  async function attempt(callback){try{await callback();}catch(error){notice(error.message || 'Chưa hoàn tất thao tác. Hãy thử lại.',true);}}
  let store;
  element('profileForm').onsubmit=event=>{event.preventDefault();void attempt(async()=>{
    if(!ready())return;profile=await store.save(profileInput(element('nicknameInput').value,element('avatarInput').value));
    element('playerIdentity').textContent='Đã đăng nhập · '+profile.nickname;notice('Đã lưu hồ sơ.');
  });};
  element('joinRoomForm').onsubmit=event=>{event.preventDefault();void attempt(()=>room?.join(element('roomCodeInput').value));};
  element('createRoomForm').onsubmit=event=>{event.preventDefault();void attempt(()=>room?.create(element('roomTitleInput').value));};
  element('leaveRoomBtn').onclick=()=>void room?.leave();
  element('closeOnlineRoomBtn').onclick=()=>void attempt(()=>room?.close());
  element('walkRoomBtn').onclick=()=>{closePanel();window.VietVillageGame?.startRoomWalk();};
  async function onAuthState(authenticated) {
    const nextUid=getUid();
    if(!authenticated || !nextUid){revision++;uid=null;profile=null;starting=false;room?.dispose();room=null;avatars?.clear();renderRoom();panel.classList.add('hidden');element('createRoomForm').hidden=true;return;}
    if(uid===nextUid && (starting || profile)){
      if(profile)element('playerIdentity').textContent='Đã đăng nhập · '+profile.nickname;
      return;
    }
    uid=nextUid;
    if(!onlineConfig.enabled){notice('Hồ sơ và phòng chơi đã được chuẩn bị. Đang chờ phê duyệt backend và Security Rules để bật lưu dữ liệu thật.');renderRoom();return;}
    const request=++revision;starting=true;notice('Đang tải hồ sơ người chơi…');
    try{
      const [firestoreSDK,databaseSDK,functionsSDK]=await Promise.all([
        import(`https://www.gstatic.com/firebasejs/${sdkVersion}/firebase-firestore.js`),
        import(`https://www.gstatic.com/firebasejs/${sdkVersion}/firebase-database.js`),
        import(`https://www.gstatic.com/firebasejs/${sdkVersion}/firebase-functions.js`)]);
      if(request!==revision || getUid()!==nextUid)return;
      store=createProfileStore({db:firestoreSDK.getFirestore(app),sdk:firestoreSDK,getUid});profile=await store.ensure();
      const token=await authSDK.getIdTokenResult(auth.currentUser,true);role=['teacher','admin'].includes(token.claims.role)?token.claims.role:'student';
      if(request!==revision || getUid()!==nextUid){profile=null;return;}
      const functions=functionsSDK.getFunctions(app,onlineConfig.functionsRegion);
      const invoke=async(name,data)=>(await functionsSDK.httpsCallable(functions,name)(data)).data;
      avatars=createRemotePlayers({THREE:window.THREE,game:window.VietVillageGame});
      room=createRoomClient({db:databaseSDK.getDatabase(app),sdk:databaseSDK,invoke,getUid,config:onlineConfig,
        onState:renderRoom,onPeers:value=>avatars.update(value),getPose:()=>window.VietVillageGame?.getPose()});
      element('nicknameInput').value=profile.nickname;element('avatarInput').value=profile.avatarId;
      element('playerIdentity').textContent='Đã đăng nhập · '+profile.nickname;element('createRoomForm').hidden=!['teacher','admin'].includes(role);
      renderRoom(room.getState());notice('Hồ sơ đã sẵn sàng. Nhập mã phòng do giáo viên cung cấp.');
    }catch(error){profile=null;renderRoom();notice(error.code?.includes('permission')?'Firebase đang từ chối quyền dữ liệu. Cần rules đã kiểm thử và được phê duyệt.':error.message || 'Chưa tải được hồ sơ.',true);}
    finally{if(request===revision)starting=false;}
  }
  const controller={onAuthState,hasRoom:()=>!!room?.getState().room,
    tick:dt=>{room?.syncPose();avatars?.tick(dt,room?.getServerTime() || Date.now());},dispose:()=>{revision++;room?.dispose();avatars?.clear();}};
  window.VietVillageOnline=Object.freeze(controller);return controller;
}
