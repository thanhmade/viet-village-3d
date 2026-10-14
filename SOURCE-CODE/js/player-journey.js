(function (global) {
  'use strict';
  const STORAGE_PREFIX = 'viet-village:journey:v1:';
  const MOVEMENT_METERS = 3;
  const MAX_HP = 100;

  // getIdentity returns only Firebase's current {authenticated, uid}. These local
  // tutorial flags are UI progress, never trusted grades, roles or server rights.
  global.createVillageJourney = function ({getIdentity, storage, notify, getExperience} = {}) {
    let identity = null, authenticated = false, uid = null, walked = 0;
    let alive = false, hp = 0, level = 0, movement = false, skills = false, snapshot;
    function publish() {
      snapshot = Object.freeze({alive, hp, maxHp: MAX_HP, level, tutorials: Object.freeze({movement, skills})});
    }
    function reset(isAuthenticated, nextUid) {
      authenticated = isAuthenticated; uid = nextUid; walked = 0;
      alive = authenticated; level = authenticated ? 1 : 0; movement = skills = false;
      hp = alive ? MAX_HP : 0;
      if (authenticated && uid) {
        try {
          const saved = JSON.parse(storage?.getItem(STORAGE_PREFIX + encodeURIComponent(uid)) || 'null');
          if (saved && typeof saved === 'object' && !Array.isArray(saved)) {
            movement = saved.movement === true; skills = saved.skills === true;
          }
        } catch (_) { /* A damaged/blocked browser store does not block the game. */ }
      }
      publish();
    }
    function syncIdentity() {
      let current;
      try { current = getIdentity?.(); } catch (_) { current = null; }
      const allowed = current?.authenticated === true;
      const nextUid = allowed && typeof current?.uid === 'string' && current.uid.length > 0 && current.uid.length <= 128 ? current.uid : null;
      const nextIdentity = allowed ? 'authenticated:' + (nextUid === null ? '<ephemeral>' : JSON.stringify(nextUid)) : 'signed-out';
      if (identity !== nextIdentity) { identity = nextIdentity; reset(allowed, nextUid); }
      return authenticated;
    }
    function complete(kind, message) {
      if (kind === 'movement') movement = true; else skills = true;
      publish();
      if (uid) {
        const flags = {};
        if (movement) flags.movement = true;
        if (skills) flags.skills = true;
        try { storage?.setItem(STORAGE_PREFIX + encodeURIComponent(uid), JSON.stringify(flags)); } catch (_) {}
      }
      try { notify?.(message); } catch (_) { /* A notification must not cancel an action. */ }
      return true;
    }
    function getState() {
      syncIdentity();
      if (!getExperience || !authenticated) return snapshot;
      const experience = getExperience();
      return Object.freeze({...snapshot, level: experience.status === 'ready' ? experience.level : 0,
        exp: experience.exp ?? 0, experience});
    }
    function recordMovement(distance) {
      if (!syncIdentity() || !alive || movement || !Number.isFinite(distance) || distance <= 0) return false;
      walked += distance;
      if (walked < MOVEMENT_METERS) return false;
      return complete('movement', 'Đã hoàn thành hướng dẫn di chuyển: đi bộ ít nhất 3 m.');
    }
    function recordSkillUse() {
      if (!syncIdentity() || !alive || skills) return false;
      return complete('skills', 'Đã hoàn thành hướng dẫn kỹ năng: sử dụng thành công một kỹ năng.');
    }
    function setCharacterState(value) {
      if (!syncIdentity()) return false;
      const object = value !== null && typeof value === 'object' && !Array.isArray(value);
      const validAlive = object && (!Object.hasOwn(value, 'alive') || typeof value.alive === 'boolean');
      const validLevel = object && (!Object.hasOwn(value, 'level') || Number.isSafeInteger(value.level) && value.level >= 0);
      const validHp = object && (!Object.hasOwn(value, 'hp') || Number.isFinite(value.hp) && value.hp >= 0);
      if (!validAlive || !validLevel || !validHp) { alive = false; hp = 0; level = 0; publish(); return false; }
      if (Object.hasOwn(value, 'alive')) {
        alive = value.alive;
        if (alive && hp === 0) hp = MAX_HP;
      }
      if (Object.hasOwn(value, 'hp')) hp = Math.min(MAX_HP, value.hp);
      if (!alive) hp = 0;
      if (hp === 0) alive = false;
      if (Object.hasOwn(value, 'level')) level = value.level;
      publish(); return true;
    }
    // Session health only: no changes to saved tutorials, grades or Firebase.
    // The NPC controller checks location and conversation ownership before healing.
    function healToFull() {
      if (!syncIdentity()) return {ok: false, code: 'signed-out', message: 'Hãy đăng nhập lại để hồi phục.'};
      if (!alive || hp <= 0) return {ok: false, code: 'not-alive', message: 'Nhân vật không còn sống; Thầy thuốc chưa hỗ trợ hồi sinh.'};
      if (hp >= MAX_HP) return {ok: false, code: 'full', message: 'HP đã đầy. Con chưa cần hồi phục.'};
      const before = hp; hp = MAX_HP; publish();
      return {ok: true, before, hp, maxHp: MAX_HP, amount: hp - before, message: 'Đã hồi đầy HP: ' + hp + '/' + MAX_HP + ' · Miễn phí trong bản thử nghiệm.'};
    }
    function takeDamage(amount) {
      if (!syncIdentity() || !alive || !Number.isFinite(amount) || amount <= 0) return false;
      hp = Math.max(0, hp - amount); alive = hp > 0; publish(); return true;
    }
    function lock() {
      // Firebase has already blocked the session before the game's lock hook.
      // Forget in-flight walking even if the same account signs back in later.
      identity = null; reset(false, null);
    }
    reset(false, null);
    return Object.freeze({getState, recordMovement, recordSkillUse, setCharacterState, takeDamage, healToFull, lock});
  };
})(typeof window === 'undefined' ? globalThis : window);
