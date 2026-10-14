(function (global) {
  'use strict';
  const prefix = 'viet-village:experience:v1:';
  const fail = (code, message) => Object.assign(new Error(message), {code: 'experience/' + code});
  // Local Alpha progress only. Never upload this ledger as authoritative progress.
  // One current character per UID maps to primary; model/name changes are not IDs.
  global.createVillageExperience = function ({getIdentity, storage, withLock, getMode = () => 'local', onChange = () => {}, onReward = () => {}}) {
    const core = global.VillageExperienceCore;
    let owner = null, current = null, error = null, queue = Promise.resolve(), viewSource = null, view = null;
    function identity() {
      let value; try { value = getIdentity?.(); } catch (_) { return null; }
      return value?.authenticated === true && typeof value.uid === 'string' && value.uid.length > 0 && value.uid.length <= 128
        ? value.uid : null;
    }
    const key = uid => prefix + encodeURIComponent(uid) + ':primary';
    function guard(uid) { if (!uid || identity() !== uid) throw fail('auth-changed', 'Tài khoản đã thay đổi. Chưa nhận EXP.'); }
    function legacy(uid) {
      const raw = storage.getItem('viet-village:character:v1:' + encodeURIComponent(uid));
      if (raw === null) return null;
      const record = JSON.parse(raw);
      if (!record || record.uid !== uid || record.schemaVersion !== 1) throw fail('legacy', 'Hồ sơ cũ chưa đọc được; giữ nguyên tiến độ.');
      // Only explicit character progression fields. Quiz score/unlocked and
      // tutorial flags are not character levels or learning ability.
      return record.progression ?? record.character?.progression ??
        (Object.hasOwn(record, 'level') || Object.hasOwn(record, 'exp') ? {level: record.level ?? 1, exp: record.exp ?? 0} : null);
    }
    function read(uid) {
      guard(uid);
      if (!storage?.getItem) throw fail('read', 'Trình duyệt không cho đọc tiến độ EXP. Dữ liệu cũ được giữ nguyên.');
      const raw = storage.getItem(key(uid));
      if (raw === null) return core.normalize(legacy(uid));
      const record = JSON.parse(raw);
      if (record.uid !== uid || record.characterId !== 'primary') throw fail('identity', 'Tiến độ EXP không khớp nhân vật.');
      if (!['schemaVersion','tableVersion','level','exp','receipts'].every(field => Object.hasOwn(record, field)))
        throw fail('incomplete', 'Tiến độ EXP đã lưu thiếu trường bắt buộc; chưa ghi đè dữ liệu.');
      return core.normalize(record);
    }
    function changed() { try { onChange(getState()); } catch (_) {} }
    function refresh() {
      owner = identity(); current = null; error = null;
      if (owner) try { current = read(owner); } catch (cause) { error = cause; }
      changed(); return getState();
    }
    function sync() { if (owner !== identity()) { owner = identity(); current = null; error = null; if (owner) try { current = read(owner); } catch (cause) { error = cause; } } }
    function getState() {
      sync();
      if (!owner) return {status: 'signed-out', level: 0, text: 'Đăng nhập để xem EXP'};
      if (getMode() !== 'local') return {status: 'error', level: 0, text: 'EXP online chưa sẵn sàng', message: 'Cần nối dịch vụ EXP đã xác thực phía máy chủ. Không dùng tiến độ local thay cho online.'};
      if (error) return {status: 'error', level: 0, text: 'Chưa đọc được EXP · Thử lại', message: error.message};
      if (viewSource !== current || !view) {
        viewSource = current;
        view = Object.freeze({status: 'ready', ...core.describe(current), tableVersion: current.tableVersion, scope: 'local', characterId: 'primary'});
      }
      return view;
    }
    function complete(kind, activityId) {
      const uid = identity();
      const amount = core.config.rewards[kind]?.[activityId];
      if (!Number.isSafeInteger(amount) || amount <= 0) return Promise.reject(fail('unconfigured', 'Hoạt động chưa có phần thưởng EXP.'));
      const rewardId = kind + ':' + activityId;
      const operation = async () => {
        guard(uid);
        if (getMode() !== 'local') throw fail('online-unavailable', 'EXP online chưa được kết nối; không nhận thưởng cục bộ thay cho máy chủ.');
        if (!withLock) throw fail('lock', 'Trình duyệt thiếu Web Locks; chưa lưu EXP để tránh nhận trùng giữa các tab. Hãy dùng Chrome/Edge qua localhost hoặc HTTPS.');
        return withLock(key(uid), () => {
          guard(uid);
          if (getMode() !== 'local') throw fail('online-unavailable', 'Chế độ tiến độ đã thay đổi. Hãy tải lại hồ sơ.');
          const before = read(uid), result = core.grant(before, {rewardId, amount});
          if (!result.duplicate) {
            const record = {...result.state, uid, characterId: 'primary'};
            // Progress and every receipt are committed in the same atomic localStorage write.
            const serialized = JSON.stringify(record);
            try { storage.setItem(key(uid), serialized); }
            catch (_) { throw fail('write', 'Chưa lưu được EXP. Giữ nguyên tiến độ; hãy thử nhận lại thưởng.'); }
            guard(uid);
            if (storage.getItem(key(uid)) !== serialized) throw fail('verify', 'Chưa xác minh được lần nhận EXP. Hãy thử lại an toàn.');
          }
          current = read(uid); owner = uid; error = null; changed();
          if (!result.duplicate) { try { onReward(result); } catch (_) {} }
          return result;
        });
      };
      const result = queue.then(operation); queue = result.catch(() => {}); return result;
    }
    function lock() { owner = null; current = null; error = null; }
    return Object.freeze({getState, complete, refresh, lock, storagePrefix: prefix});
  };
})(typeof window === 'undefined' ? globalThis : window);
