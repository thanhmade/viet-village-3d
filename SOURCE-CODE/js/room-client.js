export function normalizeRoomCode(value) {
  const code = String(value || '').trim().toUpperCase();
  if (!/^[A-Z2-9]{6}$/.test(code)) throw Object.assign(new Error('Mã phòng gồm 6 chữ hoặc số.'), {code:'room/invalid-code'});
  return code;
}
export function newConnectionId() {
  return [...crypto.getRandomValues(new Uint8Array(16))].map(b => b.toString(16).padStart(2,'0')).join('');
}
export function activeMembers(members, time) {
  return Object.entries(members || {}).filter(([, m]) => m.leaseExpiresAt > time && Object.keys(m.connections || {}).length)
    .map(([uid,m]) => ({uid, nickname:m.nickname, avatarId:m.avatarId}));
}
export function createRoomClient({db, sdk, invoke, getUid, onState, onPeers, getPose, config}) {
  let current = null, epoch = 0, busy = false, connected = false, serverOffset = 0;
  let members = {}, poses = {}, meta = null, subscriptions = [], heartbeat = null;
  let lastPose = '', lastPoseAt = 0, writingPose = false;
  const time = () => Date.now() + serverOffset;
  const readState = () => ({room:current ? {...current} : null, connected,
    members:activeMembers(members,time()), meta});
  const publish = (message='') => {
    onState({...readState(), message, busy});
    onPeers(connected && current ? {members:readState().members, poses, uid:getUid(),
      connections:Object.fromEntries(Object.entries(members).map(([uid,m])=>[uid,m.connections]))} : null);
  };
  function clearLocal() {
    clearInterval(heartbeat); heartbeat = null;
    for (const unsubscribe of subscriptions) unsubscribe(); subscriptions = [];
    members = {}; poses = {}; meta = null; current = null; lastPose = ''; onPeers(null);
  }
  async function release(room) {
    if (!room) return;
    const conn = sdk.ref(db, `rooms/${room.code}/members/${room.uid}/connections/${room.connectionId}`);
    const pose = sdk.ref(db, `presence/${room.code}/${room.uid}/${room.connectionId}`);
    // Remove data before cancelling disconnect handlers. Failure leaves the server fallback armed.
    await Promise.all([sdk.remove(conn), sdk.remove(pose)]);
    await Promise.all([sdk.onDisconnect(conn).cancel(), sdk.onDisconnect(pose).cancel()]);
    await invoke('leaveVillageRoom', {code:room.code,connectionId:room.connectionId});
  }
  async function leave(message='Đã rời phòng.') {
    epoch++; const room = current; clearLocal(); busy = false; publish(message);
    try { await release(room); }
    catch { publish('Đã rời phòng trên máy này. Máy chủ sẽ thu hồi kết nối khi mất mạng hoặc hết thời hạn.'); }
  }
  async function renew() {
    if (!current || !connected || getUid() !== current.uid) return;
    const room = current, expiry = time() + config.leaseMs - 2000;
    await sdk.update(sdk.ref(db), {
      [`rooms/${room.code}/members/${room.uid}/leaseExpiresAt`]:expiry,
      [`rooms/${room.code}/members/${room.uid}/connections/${room.connectionId}/leaseExpiresAt`]:expiry
    });
    await writePose(true);
  }
  async function writePose(force=false) {
    if (!current || !connected || getUid() !== current.uid || writingPose) return;
    const pose = getPose(); if (!pose) return;
    const key = JSON.stringify(pose), timestamp = performance.now();
    if (!force && (timestamp-lastPoseAt < config.poseIntervalMs || key===lastPose)) return;
    const room=current, revision=epoch; writingPose=true;
    try {
      await sdk.set(sdk.ref(db,`presence/${room.code}/${room.uid}/${room.connectionId}`),
        {...pose,updatedAt:sdk.serverTimestamp()});
      if(revision===epoch){lastPose=key;lastPoseAt=timestamp;}
    } catch(error) {
      if(revision===epoch && connected && /permission.denied/i.test(error.code || error.message || ''))
        void leave('Không còn quyền đồng bộ nhân vật. Hãy tham gia lại.');
      throw error;
    } finally {writingPose=false;}
  }
  async function enter(method, data) {
    if (busy) return; const uid = getUid();
    if (!uid) throw Object.assign(new Error('Cần đăng nhập.'),{code:'auth/session-invalid'});
    if (!connected) throw Object.assign(new Error('Chưa kết nối được máy chủ phòng.'),{code:'room/offline'});
    if (current) await leave();
    const revision = ++epoch, id = newConnectionId(); busy = true; publish('Đang vào phòng…');
    let reservation;
    try {
      reservation = await invoke(method,{...data,connectionId:id});
      const room = {...reservation,uid};
      if (revision !== epoch || getUid() !== uid) { await release(room).catch(()=>{}); return; }
      current = room;
      const conn = sdk.ref(db,`rooms/${room.code}/members/${uid}/connections/${id}`);
      const pose = sdk.ref(db,`presence/${room.code}/${uid}/${id}`);
      await Promise.all([sdk.onDisconnect(conn).remove(),sdk.onDisconnect(pose).remove()]);
      if (revision !== epoch || getUid() !== uid) { await release(room).catch(()=>{}); return; }
      const listen = (reference, fn) => subscriptions.push(sdk.onValue(reference, snapshot => {
        if (revision === epoch) { fn(snapshot.val()); publish(); }
      }, error => { if (revision === epoch) void leave('Không còn quyền truy cập phòng. Hãy tham gia lại.'); }));
      listen(sdk.ref(db,`rooms/${room.code}/meta`), value => {
        meta = value; if (value?.status !== 'open') void leave('Giáo viên đã đóng phòng.');
      });
      listen(sdk.ref(db,`rooms/${room.code}/members`), value => {
        members = value || {};
        if(!members[uid]?.connections?.[id]) void leave('Kết nối phòng đã hết hiệu lực. Hãy tham gia lại.');
      });
      listen(sdk.ref(db,`presence/${room.code}`), value => {poses = value || {};});
      await renew();
      if(revision!==epoch || getUid()!==uid)return;
      heartbeat = setInterval(() => renew().catch(() => {
        if(revision===epoch)void leave('Kết nối phòng đã hết hiệu lực. Hãy tham gia lại.');
      }), config.heartbeatMs);
      busy = false; publish('Đã tham gia phòng.');
    } catch (error) {
      if (revision === epoch) {clearLocal(); busy=false; publish(error.message || 'Chưa vào được phòng.');}
      if (reservation) await release({...reservation,uid}).catch(()=>{});
      throw error;
    }
  }
  const stopConnection = sdk.onValue(sdk.ref(db,'.info/connected'), snapshot => {
    const wasConnected = connected; connected = snapshot.val() === true;
    if (!connected && current) {
      // Old member listeners can receive the server's disconnect cleanup before
      // the new reservation exists. Suspend them and retain only the room code.
      epoch++; busy=false;clearInterval(heartbeat);heartbeat=null;
      for(const unsubscribe of subscriptions)unsubscribe();subscriptions=[];
      publish('Mất kết nối phòng. Đang chờ mạng trở lại…');
    }
    else if (connected && !wasConnected && current) {
      const code = current.code; epoch++; busy=false; clearLocal();
      void enter('joinVillageRoom',{code}).catch(error=>publish(error.message));
    } else publish();
  });
  const stopOffset = sdk.onValue(sdk.ref(db,'.info/serverTimeOffset'), snapshot => {serverOffset=snapshot.val() || 0;});
  return {join:code=>enter('joinVillageRoom',{code:normalizeRoomCode(code)}),
    create:title=>enter('createVillageRoom',{title}),leave,
    close:async()=>{if(current) await invoke('closeVillageRoom',{code:current.code});},
    syncPose:()=>writePose().catch(()=>{}),getState:readState,getServerTime:time,
    dispose:()=>{void leave();stopConnection();stopOffset();}};
}
