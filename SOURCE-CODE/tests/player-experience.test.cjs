'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const root = path.resolve(__dirname, '../..');
const key = uid => 'viet-village:experience:v1:' + encodeURIComponent(uid) + ':primary';
const characterKey = uid => 'viet-village:character:v1:' + encodeURIComponent(uid);
const plain = value => JSON.parse(JSON.stringify(value));
function sharedLocks() {
  const tails = new Map();
  return (name, operation) => {
    const task = (tails.get(name) || Promise.resolve()).then(operation);
    tails.set(name, task.catch(() => {}));
    return task;
  };
}
function fixture(options = {}) {
  const records = options.records || new Map(), notices = [], changes = [];
  let uid = options.uid || 'learner-a', authenticated = true, writes = 0;
  const storage = options.storage || {
    getItem: name => records.has(name) ? records.get(name) : null,
    setItem(name, value) { writes++; records.set(name, value); }
  };
  const scope = {console}; scope.window = scope;
  for (const filename of ['firebase/functions/shared/experience-config.js', 'firebase/functions/shared/experience-core.js', 'SOURCE-CODE/js/player-experience.js'])
    vm.runInNewContext(fs.readFileSync(path.join(root, filename), 'utf8'), scope, {filename});
  const create = () => scope.createVillageExperience({
    getIdentity: () => ({authenticated, uid}), storage,
    getMode: options.getMode,
    withLock: options.noLock ? undefined : options.withLock || sharedLocks(),
    onChange: state => changes.push(plain(state)), onReward: result => notices.push(plain(result))
  });
  return {records, storage, scope, changes, notices, create, store: create(),
    setUid(value) { uid = value; }, signOut() { authenticated = false; }, signIn(value) { authenticated = true; uid = value; },
    get writes() { return writes; }};
}

test('missing local progress reads LV 1 without creating or altering records', () => {
  const f = fixture(); const state = f.store.getState();
  assert.equal(state.status, 'ready'); assert.equal(state.level, 1); assert.equal(state.exp, 0);
  assert.equal(state.scope, 'local'); assert.equal(state.characterId, 'primary');
  assert.equal(state.required, 100); assert.equal(state.percent, 0);
  assert(Object.isFrozen(state)); assert.equal(f.records.size, 0); assert.equal(f.writes, 0);
});

test('online mode never falls back to local awards and does not alter saved data', async () => {
  let mode = 'local'; const f = fixture({getMode: () => mode});
  await f.store.complete('quests', 'QUEST_LV_01');
  const before = [...f.records]; mode = 'online-unavailable';
  assert.equal(f.store.getState().status, 'error');
  await assert.rejects(f.store.complete('lessons', 'core:0'), /online/);
  assert.deepEqual([...f.records], before);
});

test('partial records in the new namespace fail closed instead of defaulting missing fields', async () => {
  const f = fixture(); const serialized = JSON.stringify({uid: 'learner-a', characterId: 'primary', level: 8});
  f.records.set(key('learner-a'), serialized);
  assert.equal(f.store.getState().status, 'error');
  await assert.rejects(f.store.complete('quests', 'QUEST_LV_01'), /thiếu trường/);
  assert.equal(f.records.get(key('learner-a')), serialized);
});

test('configured completion persists EXP and receipt together, and a repeated reward does not write or notify twice', async () => {
  const f = fixture(), result = await f.store.complete('quests', 'QUEST_LV_01');
  assert.equal(result.awarded, 60); assert.equal(result.duplicate, false); assert.equal(f.writes, 1);
  const saved = JSON.parse(f.records.get(key('learner-a')));
  assert.equal(saved.uid, 'learner-a'); assert.equal(saved.characterId, 'primary');
  assert.equal(saved.level, 1); assert.equal(saved.exp, 60); assert.equal(saved.tableVersion, 1);
  assert.equal(saved.receipts['quests:QUEST_LV_01'].awarded, 60);
  const duplicate = await f.store.complete('quests', 'QUEST_LV_01');
  assert.equal(duplicate.duplicate, true); assert.equal(duplicate.awarded, 0);
  assert.equal(f.writes, 1); assert.equal(f.notices.length, 1);
  assert.equal(f.store.getState().exp, 60);
});

test('two tabs using a shared lock grant the same reward exactly once', async () => {
  const records = new Map(), withLock = sharedLocks();
  const a = fixture({records, withLock}), b = fixture({records, withLock});
  const result = await Promise.all([a.store.complete('quests', 'QUEST_LV_01'), b.store.complete('quests', 'QUEST_LV_01')]);
  assert.equal(result.filter(r => r.duplicate).length, 1);
  assert.equal(a.writes + b.writes, 1); assert.equal(a.notices.length + b.notices.length, 1);
  assert.equal(JSON.parse(records.get(key('learner-a'))).exp, 60);
  assert.equal(a.store.refresh().exp, b.store.refresh().exp);
});

test('concurrent different rewards reread the locked record and carry surplus without losing either receipt', async () => {
  const records = new Map(), withLock = sharedLocks();
  const a = fixture({records, withLock}), b = fixture({records, withLock});
  await Promise.all([a.store.complete('quests', 'QUEST_LV_01'), b.store.complete('quests', 'QUEST_LV_02')]);
  const saved = JSON.parse(records.get(key('learner-a')));
  assert.equal(saved.level, 2); assert.equal(saved.exp, 60);
  assert.deepEqual(Object.keys(saved.receipts).sort(), ['quests:QUEST_LV_01', 'quests:QUEST_LV_02']);
  assert.equal(a.store.refresh().level, 2); assert.equal(b.store.refresh().exp, 60);
});

test('rapid same-tab requests are serialized and unknown reward sources cannot grant EXP', async () => {
  const f = fixture();
  const results = await Promise.all(Array.from({length: 15}, () => f.store.complete('lessons', 'core:0')));
  assert.equal(results.filter(r => !r.duplicate).length, 1); assert.equal(f.store.getState().exp, 40);
  for (const [kind, id] of [['quests', 'QUEST_LV_03'], ['monsters', 'fake'], ['lessons', 'wrong'], ['quests', '__proto__']])
    await assert.rejects(f.store.complete(kind, id), {code: 'experience/unconfigured'});
  assert.equal(f.writes, 1);
});

test('changing UID while waiting for the cross-tab lock rejects the stale reward without writing either account', async () => {
  let release, entered;
  const ready = new Promise(resolve => { entered = resolve; });
  const f = fixture({withLock: async (name, operation) => { entered(); await new Promise(resolve => { release = resolve; }); return operation(); }});
  const pending = f.store.complete('quests', 'QUEST_LV_01'); await ready;
  f.setUid('learner-b'); release();
  await assert.rejects(pending, {code: 'experience/auth-changed'});
  assert.equal(f.writes, 0); assert.equal(f.records.size, 0); assert.equal(f.notices.length, 0);
  assert.equal(f.store.getState().level, 1); assert.equal(f.store.getState().exp, 0);
});

test('UID namespaces, logout, reload and explicit storage refresh preserve independent character progress', async () => {
  const f = fixture({uid: 'a/with space'});
  await f.store.complete('quests', 'QUEST_LV_01'); f.signOut(); f.store.lock();
  assert.equal(f.store.getState().status, 'signed-out');
  await assert.rejects(f.store.complete('quests', 'QUEST_LV_02'), {code: 'experience/auth-changed'});
  f.signIn('learner-b'); assert.equal(f.store.getState().exp, 0);
  await f.store.complete('lessons', 'core:0'); assert.equal(f.store.getState().exp, 40);
  f.signIn('a/with space'); const reloaded = f.create();
  assert.equal(reloaded.getState().exp, 60); assert.equal((await reloaded.complete('quests', 'QUEST_LV_01')).duplicate, true);
  assert.equal(f.records.size, 2); assert(f.records.has(key('a/with space')));
});

test('legacy LV and EXP migrate without editing character appearance, inventory, quests or other stores', async () => {
  const legacy = {schemaVersion: 1, uid: 'learner-a', level: 7, exp: 341,
    character: {created: true, modelId: 'female-base', name: 'Giữ nguyên'},
    inventory: [{id: 'old-item', quantity: 2}], equipment: {hand: 'sword'}, quests: {first: true}, extra: {version: 12}};
  const original = JSON.stringify(legacy);
  const records = new Map([[characterKey('learner-a'), original],
    ['viet-village:journey:v1:learner-a', '{"movement":true,"skills":true}'], ['math-island-3d-v1-core', '{"score":987}']]);
  const before = new Map(records), f = fixture({records});
  assert.equal(f.store.getState().level, 7); assert.equal(f.store.getState().exp, 341); assert.equal(f.writes, 0);
  await f.store.complete('quests', 'QUEST_LV_01'); assert.equal(f.store.getState().exp, 401);
  for (const [name, value] of before) assert.equal(records.get(name), value, name + ' stays byte-for-byte unchanged');
  assert.equal(records.size, before.size + 1);
});

test('existing high-level characters retain levels and EXP above the Alpha cap', async () => {
  for (const level of [20, 42, 100, 101]) {
    const records = new Map([[characterKey('learner-a'), JSON.stringify({schemaVersion: 1, uid: 'learner-a', level, exp: 1234})]]);
    const f = fixture({records});
    assert.equal(f.store.getState().level, level); assert.equal(f.store.getState().exp, 1234);
    const result = await f.store.complete('quests', 'QUEST_LV_01');
    assert.equal(result.awarded, 0); assert(result.capped);
    assert.equal(f.store.getState().level, level); assert.equal(f.store.getState().exp, 1234);
    assert.match(f.store.getState().text, /giới hạn Alpha/);
  }
});

test('malformed, foreign and unsupported progress fails closed without replacing saved data', async () => {
  const valid = {uid: 'learner-a', characterId: 'primary', level: 3, exp: 12, schemaVersion: 1, tableVersion: 1, receipts: {}};
  for (const raw of ['{', 'null', '[]', JSON.stringify({...valid, uid: 'another'}),
    JSON.stringify({...valid, characterId: 'another'}), JSON.stringify({...valid, tableVersion: 99}),
    JSON.stringify({...valid, level: -1}), JSON.stringify({...valid, exp: '100'}), JSON.stringify({...valid, receipts: []})]) {
    const records = new Map([[key('learner-a'), raw]]), f = fixture({records});
    assert.equal(f.store.getState().status, 'error', raw);
    await assert.rejects(f.store.complete('quests', 'QUEST_LV_01'));
    assert.equal(records.get(key('learner-a')), raw); assert.equal(f.writes, 0); assert.equal(f.notices.length, 0);
  }
});

test('legacy read failure is an error rather than missing progress, then explicit retry recovers', async () => {
  const records = new Map(), original = '{"schemaVersion":1,"uid":"learner-a","level":8,"exp":350}';
  let blocked = true;
  const f = fixture({records, storage: {getItem(name) { if (blocked) throw new Error('blocked storage'); return name === characterKey('learner-a') ? original : records.get(name) ?? null; }, setItem(name, value) { records.set(name, value); }}});
  assert.equal(f.store.getState().status, 'error'); await assert.rejects(f.store.complete('quests', 'QUEST_LV_01'));
  assert.equal(records.size, 0); blocked = false;
  assert.equal(f.store.refresh().level, 8); assert.equal(f.store.getState().exp, 350);
  await f.store.complete('quests', 'QUEST_LV_01'); assert.equal(f.store.getState().exp, 410);
});

test('failed writes do not show success and can retry the same reward without duplicating it', async () => {
  const records = new Map(); let failWrite = true;
  const f = fixture({records, storage: {getItem: name => records.get(name) ?? null,
    setItem(name, value) { if (failWrite) throw new Error('quota'); records.set(name, value); }}});
  assert.equal(f.store.getState().exp, 0);
  await assert.rejects(f.store.complete('quests', 'QUEST_LV_01'), {code: 'experience/write'});
  assert.equal(f.store.getState().exp, 0); assert.equal(f.notices.length, 0); assert.equal(records.size, 0);
  failWrite = false; assert.equal((await f.store.complete('quests', 'QUEST_LV_01')).awarded, 60);
  assert.equal((await f.store.complete('quests', 'QUEST_LV_01')).duplicate, true);
  assert.equal(f.store.getState().exp, 60); assert.equal(f.notices.length, 1);
});

test('a lost acknowledgement after commit is retried idempotently from the persisted receipt', async () => {
  const records = new Map(); let failReadback = false, writes = 0;
  const f = fixture({records, storage: {
    getItem(name) { if (failReadback && name === key('learner-a')) { failReadback = false; throw new Error('lost acknowledgement'); } return records.get(name) ?? null; },
    setItem(name, value) { writes++; records.set(name, value); failReadback = true; }
  }});
  await assert.rejects(f.store.complete('quests', 'QUEST_LV_01'));
  assert.equal(f.notices.length, 0); assert.equal(writes, 1);
  const retried = await f.store.complete('quests', 'QUEST_LV_01');
  assert.equal(retried.duplicate, true); assert.equal(writes, 1); assert.equal(f.store.getState().exp, 60);
});

test('local mode remains local when disconnected and browser without shared locks refuses an unsafe write', async () => {
  const lockedOut = fixture({noLock: true});
  assert.equal(lockedOut.store.getState().status, 'ready');
  await assert.rejects(lockedOut.store.complete('quests', 'QUEST_LV_01'), {code: 'experience/lock'});
  assert.equal(lockedOut.writes, 0); assert.equal(lockedOut.notices.length, 0);
  // No network mock or fake online success: this store deliberately makes no fetch.
  const local = fixture(); local.scope.navigator = {onLine: false};
  await local.store.complete('quests', 'QUEST_LV_01');
  assert.equal(local.store.getState().scope, 'local'); assert.equal(local.store.getState().exp, 60);
});
