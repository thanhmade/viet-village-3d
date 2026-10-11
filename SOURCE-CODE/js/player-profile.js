export const avatarIds = Object.freeze(['villager-default', 'villager-blue', 'villager-rose']);
export function profileInput(nickname, avatarId) {
  const clean = typeof nickname === 'string' ? nickname.trim() : '';
  if (!clean || clean.length > 24 || /[@<>\x00-\x1f]/.test(clean) || !avatarIds.includes(avatarId))
    throw Object.assign(new Error('Biệt danh cần 1–24 ký tự, không chứa email hoặc ký tự < >. Hãy chọn nhân vật có sẵn.'), {code:'profile/invalid'});
  return {nickname:clean, avatarId};
}
export function publicPlayer(profile) {
  return Object.freeze({uid:profile.uid, nickname:profile.nickname, avatarId:profile.avatarId});
}
export function createProfileStore({db, sdk, getUid}) {
  async function save(input) {
    const uid = getUid(); if (!uid) throw Object.assign(new Error('Cần đăng nhập.'), {code:'auth/session-invalid'});
    let result;
    await sdk.runTransaction(db, async transaction => {
      const reference = sdk.doc(db, 'players', uid), current = await transaction.get(reference);
      const fields = profileInput(input?.nickname ?? current.data()?.nickname ?? 'Người chơi',
        input?.avatarId ?? current.data()?.avatarId ?? 'villager-default');
      if (current.exists()) {
        transaction.update(reference, {...fields, lastLoginAt:sdk.serverTimestamp()});
        result = {...current.data(), ...fields, uid};
      } else {
        transaction.set(reference, {uid, ...fields, schemaVersion:1,
          createdAt:sdk.serverTimestamp(), lastLoginAt:sdk.serverTimestamp()});
        result = {uid, ...fields, schemaVersion:1};
      }
    });
    const refreshed = await sdk.getDoc(sdk.doc(db,'players',uid));
    if (getUid() !== uid) throw Object.assign(new Error('Phiên đăng nhập đã đổi.'), {code:'auth/session-invalid'});
    return refreshed.exists() ? refreshed.data() : result;
  }
  return {ensure: () => save(null), save};
}
