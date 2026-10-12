'use strict';
const { randomInt } = require('node:crypto');
const MAX_PLAYERS = 8, LEASE_MS = 60000;
const AVATARS = new Set(['villager-default', 'villager-blue', 'villager-rose']);
class RoomError extends Error { constructor(code, message) { super(message); this.code = code; } }
function requireGoogle(auth) {
  if (!auth?.uid || auth.token?.firebase?.sign_in_provider !== 'google.com')
    throw new RoomError('unauthenticated', 'Cần đăng nhập bằng Google.');
  return auth.uid;
}
function isTeacher(auth) { return ['teacher', 'admin'].includes(auth?.token?.role); }
function validateInput(data, allowed) {
  if (!data || typeof data !== 'object' || Object.keys(data).some(k => !allowed.includes(k)))
    throw new RoomError('invalid-argument', 'Yêu cầu không hợp lệ.');
}
function roomCode(value) {
  if (typeof value !== 'string' || !/^[A-Z2-9]{6}$/.test(value))
    throw new RoomError('invalid-argument', 'Mã phòng gồm 6 chữ hoặc số.');
  return value;
}
function connectionId(value) {
  if (typeof value !== 'string' || !/^[a-f0-9]{32}$/.test(value))
    throw new RoomError('invalid-argument', 'Kết nối không hợp lệ.');
  return value;
}
function validateProfile(profile, uid) {
  if (!profile || profile.uid !== uid || typeof profile.nickname !== 'string'
      || !/^[^@<>]{1,24}$/.test(profile.nickname) || !profile.nickname.trim()
      || !AVATARS.has(profile.avatarId))
    throw new RoomError('failed-precondition', 'Hãy lưu hồ sơ người chơi trước.');
  return {nickname: profile.nickname, avatarId: profile.avatarId};
}
function pruneMembers(members, now) {
  const result = {};
  for (const [uid, member] of Object.entries(members || {})) {
    const connections = Object.fromEntries(Object.entries(member.connections || {})
      .filter(([, c]) => Number.isFinite(c.leaseExpiresAt) && c.leaseExpiresAt > now));
    if (Object.keys(connections).length) result[uid] = {...member, connections,
      leaseExpiresAt: Math.max(...Object.values(connections).map(c => c.leaseExpiresAt))};
  }
  return result;
}
function makeCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({length: 6}, () => alphabet[randomInt(alphabet.length)]).join('');
}
function makeRoomService({db, getProfile, now = Date.now, generateCode = makeCode}) {
  async function roomTransaction(code, update) {
    const reference = db.ref('rooms/' + code), keepSnapshot = () => {};
    // Keep the server snapshot cached until the transaction completes. A cold local
    // null must not abort an existing room before the server can retry the update.
    reference.on('value', keepSnapshot);
    try {
      await reference.once('value');
      return await reference.transaction(update);
    } finally { reference.off('value', keepSnapshot); }
  }
  async function create(auth, data) {
    const uid = requireGoogle(auth);
    if (!isTeacher(auth)) throw new RoomError('permission-denied', 'Chỉ giáo viên hoặc quản trị viên được tạo phòng.');
    validateInput(data, ['title', 'connectionId']);
    const id = connectionId(data.connectionId), title = typeof data.title === 'string' ? data.title.trim() : '';
    if (!title || title.length > 40) throw new RoomError('invalid-argument', 'Tên phòng cần từ 1 đến 40 ký tự.');
    const profile = validateProfile(await getProfile(uid), uid);
    for (let attempt = 0; attempt < 8; attempt++) {
      const code = roomCode(generateCode()), time = now();
      const room = {meta: {ownerUid: uid, title, status: 'open', maxPlayers: MAX_PLAYERS, createdAt: time},
        members: {[uid]: {...profile, joinedAt: time, leaseExpiresAt: time + LEASE_MS,
          connections: {[id]: {joinedAt: time, leaseExpiresAt: time + LEASE_MS}}}}};
      const result = await db.ref('rooms/' + code).transaction(current => current ? undefined : room);
      if (result.committed) return {code, connectionId: id, maxPlayers: MAX_PLAYERS};
    }
    throw new RoomError('resource-exhausted', 'Chưa tạo được mã phòng. Hãy thử lại.');
  }
  async function join(auth, data) {
    const uid = requireGoogle(auth); validateInput(data, ['code', 'connectionId']);
    const code = roomCode(data.code), id = connectionId(data.connectionId);
    const profile = validateProfile(await getProfile(uid), uid); let failure;
    const result = await roomTransaction(code, current => {
      failure = null;
      if (!current) { failure = new RoomError('not-found', 'Không tìm thấy phòng.'); return; }
      if (current.meta?.status !== 'open') { failure = new RoomError('failed-precondition', 'Phòng đã đóng.'); return; }
      const time = now(), members = pruneMembers(current.members, time);
      if (!members[uid] && Object.keys(members).length >= MAX_PLAYERS) {
        failure = new RoomError('resource-exhausted', 'Phòng đã đủ 8 người.'); return;
      }
      const member = members[uid] || {...profile, joinedAt: time, connections: {}};
      if (!member.connections[id] && Object.keys(member.connections).length >= 4) {
        failure = new RoomError('resource-exhausted', 'Tài khoản đang mở quá nhiều cửa sổ trong phòng.'); return;
      }
      members[uid] = {...member, ...profile, leaseExpiresAt: time + LEASE_MS, connections: {...member.connections,
        [id]: {joinedAt: member.connections[id]?.joinedAt || time, leaseExpiresAt: time + LEASE_MS}}};
      return {...current, members};
    });
    if (!result.committed) throw failure || new RoomError('aborted', 'Phòng đang thay đổi. Hãy thử lại.');
    return {code, connectionId: id, maxPlayers: MAX_PLAYERS};
  }
  async function leave(auth, data) {
    const uid = requireGoogle(auth); validateInput(data, ['code', 'connectionId']);
    const code = roomCode(data.code), id = connectionId(data.connectionId);
    await roomTransaction(code, current => {
      if (!current) return;
      const members = {...(current.members || {})}, member = members[uid];
      if (!member?.connections?.[id]) return;
      const connections = {...member.connections}; delete connections[id];
      if (Object.keys(connections).length) members[uid] = {...member, connections}; else delete members[uid];
      return {...current, members};
    });
    await db.ref(`presence/${code}/${uid}/${id}`).remove();
    return {left: true};
  }
  async function close(auth, data) {
    const uid = requireGoogle(auth); validateInput(data, ['code']); const code = roomCode(data.code); let failure;
    const result = await roomTransaction(code, current => {
      failure = null;
      if (!current) {failure = new RoomError('not-found', 'Không tìm thấy phòng.'); return;}
      if (!isTeacher(auth) || (current.meta.ownerUid !== uid && auth.token.role !== 'admin')) {
        failure = new RoomError('permission-denied', 'Bạn không được quản lý phòng này.'); return;
      }
      return {...current, meta: {...current.meta, status: 'closed', closedAt: now()}, members: null};
    });
    if (!result.committed) throw failure || new RoomError('aborted', 'Hãy thử lại.');
    await db.ref('presence/' + code).remove(); return {closed: true};
  }
  async function prune(code) {
    roomCode(code);
    await roomTransaction(code, current => current
      ? {...current, members: pruneMembers(current.members, now())} : undefined);
  }
  return {create, join, leave, close, prune};
}
module.exports = {makeRoomService, RoomError, requireGoogle, validateProfile, pruneMembers, MAX_PLAYERS, LEASE_MS};
