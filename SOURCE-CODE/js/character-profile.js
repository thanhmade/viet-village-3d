// Local character identity only. This record never grants server permissions,
// changes the existing journey save, or stores Firebase credentials.
export const characterStoragePrefix = 'viet-village:character:v1:';
export const characterModelIds = Object.freeze(['female-base', 'male-base']);
// One character per account and browser: EXP, journey, quest journal and learning
// records are all keyed to the single 'primary' character. The roster shows exactly
// this many slots; raising it needs per-character keys in those stores first.
export const characterSlots = 1;
const HEIGHT = 2.35;
const OUTFIT = 'starter-default';

function failure(code, message, cause) {
  return Object.assign(new Error(message, cause ? {cause} : undefined), {code: 'character/' + code});
}
function object(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
}
function validName(value) {
  return typeof value === 'string' && value === value.trim() && Array.from(value).length >= 1
    && Array.from(value).length <= 24 && !/[@<>\p{Cc}\p{Cf}\p{Cs}]/u.test(value);
}
function emptyCustomization(value) { return object(value) && Object.keys(value).length === 0; }
function validateCharacter(value) {
  if (!object(value) || value.schemaVersion !== 1 || value.created !== true
      || !characterModelIds.includes(value.modelId) || !validName(value.name)
      || !emptyCustomization(value.customization) || value.height !== HEIGHT || value.outfitId !== OUTFIT
      || typeof value.createdAt !== 'string' || !Number.isFinite(Date.parse(value.createdAt))
      || new Date(value.createdAt).toISOString() !== value.createdAt) {
    throw failure('corrupt', 'Hồ sơ nhân vật không hợp lệ hoặc dùng phiên bản chưa được hỗ trợ. Dữ liệu đã lưu được giữ nguyên.');
  }
  return Object.freeze({...value, customization: Object.freeze({})});
}
function inputFields(input) {
  const name = typeof input?.name === 'string' ? input.name.trim() : '';
  if (!object(input) || !characterModelIds.includes(input.modelId) || !validName(name)
      || !emptyCustomization(input.customization)) {
    throw failure('invalid', 'Hãy chọn mẫu nhân vật có sẵn và tên 1–24 ký tự, không chứa @, <, > hoặc ký tự điều khiển. Tùy chỉnh khác chưa được hỗ trợ.');
  }
  return {modelId: input.modelId, name, customization: {}};
}

// withLock(name, operation) may delegate to navigator.locks.request. The shared
// lock serializes different tabs; the pending promise also coalesces rapid clicks
// in one screen. Storage is re-read inside the lock before any write.
export function createCharacterProfileStore({storage, getUid, withLock} = {}) {
  let pending = null;
  function currentUid() {
    let uid;
    try { uid = getUid?.(); } catch (cause) { throw failure('auth-changed', 'Phiên đăng nhập đã thay đổi. Hãy đăng nhập lại.', cause); }
    if (typeof uid !== 'string' || !uid || uid.length > 128) throw failure('auth-changed', 'Cần đăng nhập để đọc hoặc tạo nhân vật.');
    return uid;
  }
  function guard(uid) {
    if (currentUid() !== uid) throw failure('auth-changed', 'Tài khoản đã thay đổi. Thao tác nhân vật đã dừng.');
  }
  function read(uid) {
    guard(uid);
    let raw;
    try {
      if (typeof storage?.getItem !== 'function') throw new Error('Local storage unavailable');
      raw = storage.getItem(characterStoragePrefix + encodeURIComponent(uid));
    } catch (cause) { throw failure('storage-read', 'Không đọc được hồ sơ trên máy này. Chưa thể tạo hồ sơ mới để tránh ghi đè dữ liệu.', cause); }
    guard(uid);
    if (raw === null) return {status: 'missing', character: null, record: null};
    let record;
    try { record = JSON.parse(raw); } catch (cause) { throw failure('corrupt', 'Hồ sơ nhân vật đã lưu không đọc được. Dữ liệu được giữ nguyên.', cause); }
    if (!object(record) || record.schemaVersion !== 1 || record.uid !== uid)
      throw failure('corrupt', 'Hồ sơ nhân vật không đúng tài khoản hoặc phiên bản. Dữ liệu được giữ nguyên.');
    if (!Object.hasOwn(record, 'character') || record.character === null)
      return {status: 'legacy', character: null, record};
    return {status: 'ready', character: validateCharacter(record.character), record};
  }
  async function load() {
    const uid = currentUid();
    await Promise.resolve();
    const {status, character} = read(uid);
    guard(uid);
    return {status, character};
  }
  function create(input) {
    let uid;
    try { uid = currentUid(); } catch (error) { return Promise.reject(error); }
    if (pending) {
      if (pending.uid === uid) return pending.promise;
      return Promise.reject(failure('busy', 'Đang hoàn tất thao tác của tài khoản trước. Hãy thử lại.'));
    }
    const entry = {uid, promise: null};
    pending = entry;
    const operation = () => {
      guard(uid);
      const existing = read(uid);
      // Creation is idempotent, even if a stale screen submits different fields.
      if (existing.status === 'ready') return existing.character;
      const fields = inputFields(input);
      const character = validateCharacter({schemaVersion: 1, created: true, ...fields,
        height: HEIGHT, outfitId: OUTFIT, createdAt: new Date().toISOString()});
      const record = {...(existing.record || {}), schemaVersion: 1, uid, character};
      const key = characterStoragePrefix + encodeURIComponent(uid), serialized = JSON.stringify(record);
      guard(uid);
      try {
        if (typeof storage?.setItem !== 'function') throw new Error('Local storage unavailable');
        storage.setItem(key, serialized);
      } catch (cause) { throw failure('storage-write', 'Chưa lưu được nhân vật trên máy này. Hãy kiểm tra dung lượng hoặc quyền lưu trữ rồi thử lại.', cause); }
      guard(uid);
      const verified = read(uid);
      if (verified.status !== 'ready' || JSON.stringify(verified.record) !== serialized)
        throw failure('storage-verify', 'Chưa xác minh được nhân vật vừa lưu. Hãy tải lại hồ sơ trước khi thử lại.');
      return verified.character;
    };
    entry.promise = Promise.resolve().then(async () => {
      guard(uid);
      const character = withLock
        ? await withLock(characterStoragePrefix + encodeURIComponent(uid), operation)
        : operation();
      guard(uid);
      return character;
    }).finally(() => { if (pending === entry) pending = null; });
    return entry.promise;
  }
  return Object.freeze({load, create});
}
