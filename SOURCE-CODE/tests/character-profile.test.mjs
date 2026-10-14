import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createCharacterProfileStore, characterStoragePrefix} from '../js/character-profile.js';

const key = uid => characterStoragePrefix + encodeURIComponent(uid);
const input = (name = 'An', modelId = 'female-base') => ({name, modelId, customization: {}});
function fixture(uid = 'local-unit-user') {
  const records = new Map(); let writes = 0, current = uid;
  const storage = {getItem: name => records.has(name) ? records.get(name) : null,
    setItem(name, value) { writes++; records.set(name, value); }};
  const getUid = () => current;
  return {records, storage, getUid, setUid: value => { current = value; }, get writes() { return writes; },
    store: createCharacterProfileStore({storage, getUid})};
}
function locking() {
  const tails = new Map();
  return (name, operation) => {
    const promise = (tails.get(name) || Promise.resolve()).catch(() => {}).then(operation);
    tails.set(name, promise); return promise;
  };
}

test('new local character uses the verified UID, preserves Unicode and survives reload', async () => {
  const f = fixture('uid/with space');
  assert.deepEqual(await f.store.load(), {status: 'missing', character: null});
  const saved = await f.store.create(input('  Làng Việt 🌾  '));
  assert.deepEqual(saved, {schemaVersion: 1, created: true, modelId: 'female-base', name: 'Làng Việt 🌾',
    customization: {}, height: 2.35, outfitId: 'starter-default', createdAt: saved.createdAt});
  assert.equal(new Date(saved.createdAt).toISOString(), saved.createdAt);
  assert.ok(Object.isFrozen(saved)); assert.ok(Object.isFrozen(saved.customization));
  const record = JSON.parse(f.records.get(key('uid/with space')));
  assert.equal(record.uid, 'uid/with space'); assert.equal(record.schemaVersion, 1);
  const reloaded = createCharacterProfileStore({storage: f.storage, getUid: f.getUid});
  assert.deepEqual(await reloaded.load(), {status: 'ready', character: saved});
  assert.equal(f.writes, 1);
});

test('legacy records retain all unrelated fields and do not alter journey or other keys', async () => {
  for (const includeNull of [false, true]) {
    const f = fixture();
    const legacy = {schemaVersion: 1, uid: f.getUid(), level: 7, exp: 341, inventory: [{id: 'old-item'}],
      quests: {first: true}, extra: {version: 12}, ...(includeNull ? {character: null} : {})};
    const journeyKey = 'viet-village:journey:v1:' + f.getUid();
    f.records.set(journeyKey, '{"movement":true,"skills":true}');
    f.records.set('unrelated', 'keep'); f.records.set(key(f.getUid()), JSON.stringify(legacy));
    assert.deepEqual(await f.store.load(), {status: 'legacy', character: null});
    const saved = await f.store.create(input('Bình', 'male-base'));
    assert.deepEqual(JSON.parse(f.records.get(key(f.getUid()))), {...legacy, character: saved});
    assert.equal(f.records.get(journeyKey), '{"movement":true,"skills":true}');
    assert.equal(f.records.get('unrelated'), 'keep'); assert.equal(f.records.size, 3);
  }
});

test('corrupt, foreign and unsupported records never become missing or get overwritten', async () => {
  const f = fixture();
  const invalid = ['{', 'null', '[]', '42', '{}', JSON.stringify({uid: 'other', schemaVersion: 1}),
    JSON.stringify({uid: f.getUid(), schemaVersion: 2}),
    JSON.stringify({uid: f.getUid(), schemaVersion: 1, character: false}),
    JSON.stringify({uid: f.getUid(), schemaVersion: 1, character: {created: false}})];
  for (const raw of invalid) {
    f.records.set(key(f.getUid()), raw);
    await assert.rejects(f.store.load(), {code: 'character/corrupt'});
    await assert.rejects(f.store.create(input()), {code: 'character/corrupt'});
    assert.equal(f.records.get(key(f.getUid())), raw);
  }
  assert.equal(f.writes, 0);
});

test('storage read failure is explicit and cannot trigger replacement creation', async () => {
  let writes = 0;
  const store = createCharacterProfileStore({getUid: () => 'a', storage: {
    getItem() { throw new Error('blocked'); }, setItem() { writes++; }}});
  await assert.rejects(store.load(), {code: 'character/storage-read'});
  await assert.rejects(store.create(input()), {code: 'character/storage-read'});
  assert.equal(writes, 0);
});

test('failed writes can be retried and failed readback does not report success', async () => {
  const f = fixture(), original = f.storage.setItem;
  f.storage.setItem = () => { throw new Error('quota'); };
  await assert.rejects(f.store.create(input()), {code: 'character/storage-write'});
  assert.deepEqual(await f.store.load(), {status: 'missing', character: null});
  f.storage.setItem = original;
  assert.equal((await f.store.create(input())).name, 'An');
  assert.equal(f.writes, 1);
  const lost = createCharacterProfileStore({getUid: () => 'b', storage: {getItem: () => null, setItem() {}}});
  await assert.rejects(lost.create(input()), {code: 'character/storage-verify'});
});

test('rapid duplicate clicks and subsequent submissions create only once', async () => {
  const f = fixture();
  const [a, b] = await Promise.all([f.store.create(input('First')), f.store.create(input('Second', 'male-base'))]);
  assert.deepEqual(a, b); assert.equal(a.name, 'First'); assert.equal(f.writes, 1);
  const c = await f.store.create(input('Third', 'male-base'));
  assert.deepEqual(c, a); assert.equal(f.writes, 1);
});

test('two stores share a UID lock and re-read inside it before creation', async () => {
  const f = fixture(), withLock = locking();
  const a = createCharacterProfileStore({storage: f.storage, getUid: f.getUid, withLock});
  const b = createCharacterProfileStore({storage: f.storage, getUid: f.getUid, withLock});
  const result = await Promise.all([a.create(input('One')), b.create(input('Two', 'male-base'))]);
  assert.deepEqual(result[0], result[1]); assert.equal(f.writes, 1);
});

test('UID namespaces are isolated and signout invalidates an in-flight read or creation', async () => {
  const f = fixture('first');
  const first = await f.store.create(input('First'));
  f.setUid('second'); assert.deepEqual(await f.store.load(), {status: 'missing', character: null});
  const second = await f.store.create(input('Second', 'male-base'));
  f.setUid('first'); assert.deepEqual((await f.store.load()).character, first);
  assert.notDeepEqual(first, second); assert.equal(f.records.size, 2);
  const loading = f.store.load(); f.setUid(null);
  await assert.rejects(loading, {code: 'character/auth-changed'});
  f.setUid('third'); const creating = f.store.create(input('Third')); f.setUid('fourth');
  await assert.rejects(creating, {code: 'character/auth-changed'});
  assert.equal(f.records.has(key('third')), false); assert.equal(f.records.has(key('fourth')), false);
});

test('changing UID while waiting for a lock prevents a write', async () => {
  const f = fixture(); let enter;
  const waited = new Promise(resolve => { enter = resolve; });
  const store = createCharacterProfileStore({storage: f.storage, getUid: f.getUid,
    withLock: async (name, operation) => { await waited; return operation(); }});
  const creating = store.create(input()); await Promise.resolve(); f.setUid(null); enter();
  await assert.rejects(creating, {code: 'character/auth-changed'}); assert.equal(f.writes, 0);
});

test('names use Unicode codepoints and unsupported customization/model inputs are rejected', async () => {
  const bad = [null, input(''), input('   '), input('A'.repeat(25)), input('a@b'), input('<b>'), input('a\nB'),
    input('a\u007fB'), input('a\u200bB'), input('a\ud800B'), input('An', 'missing'),
    {...input(), customization: {hair: 'black'}}, {...input(), customization: []}, {...input(), customization: null}];
  for (const item of bad) {
    const f = fixture(); await assert.rejects(f.store.create(item), {code: 'character/invalid'}); assert.equal(f.writes, 0);
  }
  const f = fixture(); assert.equal((await f.store.create(input('🌾'.repeat(24)))).name, '🌾'.repeat(24));
});

test('stored character schema and supported capabilities are validated before reuse', async () => {
  const f = fixture(); await f.store.create(input()); const original = JSON.parse(f.records.get(key(f.getUid())));
  for (const patch of [{schemaVersion: 2}, {created: false}, {modelId: 'other'}, {height: 2.5},
    {outfitId: 'unknown'}, {name: ' untrimmed '}, {customization: {color: 'red'}}, {createdAt: 'yesterday'}]) {
    const raw = JSON.stringify({...original, character: {...original.character, ...patch}});
    f.records.set(key(f.getUid()), raw);
    await assert.rejects(f.store.load(), {code: 'character/corrupt'});
    await assert.rejects(f.store.create(input('Replacement')), {code: 'character/corrupt'});
    assert.equal(f.records.get(key(f.getUid())), raw);
  }
  assert.equal(f.writes, 1);
});
