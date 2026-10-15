import assert from 'node:assert/strict';
import {test} from 'node:test';
import {spawnSync} from 'node:child_process';
import {createLearningTransport} from '../js/learning-transport.js';

// Identity stubs exercise transport boundaries only, not Google sign-in.
const identity = uid => ({uid, getIdToken: async () => 'unit-test-token-' + uid});
const deferred = () => {let resolve; const promise = new Promise(done => {resolve = done;}); return {promise, resolve};};
const body = {characterId: 'primary'};
const ok = result => ({ok: true, json: async () => ({ok: true, result})});
function fixture(options = {}) {
  const auth = {currentUser: identity('unit-account-a')}, calls = [];
  const transport = createLearningTransport({app: {unitOnly: true}, auth,
    onlineConfig: {enabled: false, functionsRegion: 'asia-southeast1'}, sdkVersion: 'unit-version',
    location: {protocol: 'http:', hostname: 'localhost'}, fetch: async (url, request) => {calls.push({url, request}); return ok({scope: 'localhost-preview'});}, ...options});
  return {auth, calls, transport};
}

test('local transport sends one same-origin request; token is only an Authorization header', async () => {
  const f = fixture(), context = {mapId: 'lang-viet', position: {x: 1, y: 0.3, z: 2}};
  const result = await f.transport.invoke('state', body, context);
  assert.equal(result.scope, 'localhost-preview'); assert.equal(f.calls.length, 1);
  const {url, request} = f.calls[0];
  assert.equal(url, '/__viet_village_learning__/state'); assert.equal(request.method, 'POST');
  assert.equal(request.headers.Authorization, 'Bearer unit-test-token-unit-account-a');
  assert.equal(request.headers['Content-Type'], 'application/json');
  assert.deepEqual(JSON.parse(request.body), {data: body, context});
  assert.equal(request.body.includes('unit-test-token'), false);
  assert.ok(request.signal instanceof AbortSignal);
});

test('online disabled refuses every non-loopback origin without fetching data or obtaining a token', async () => {
  for (const location of [
    {protocol: 'https:', hostname: 'viet-village-3d.web.app'},
    {protocol: 'http:', hostname: 'example.com'},
    {protocol: 'file:', hostname: ''},
    {protocol: 'http:', hostname: 'localhost.example.com'},
    {protocol: 'https:', hostname: 'localhost'}
  ]) {
    let tokens = 0, fetches = 0;
    const auth = {currentUser: {uid: 'a', getIdToken: async () => {tokens++; return 'unit-only';}}};
    const f = fixture({location, auth, fetch: async () => {fetches++; return ok({});}});
    await assert.rejects(f.transport.invoke('state', body), /online chưa được bật/);
    assert.equal(tokens, 0); assert.equal(fetches, 0);
  }
});

test('127.0.0.1 uses loopback transport, while signed-out and unknown method calls are refused', async () => {
  const f = fixture({location: {protocol: 'http:', hostname: '127.0.0.1'}});
  await f.transport.invoke('state', body); assert.equal(f.calls.length, 1);
  f.auth.currentUser = null;
  await assert.rejects(f.transport.invoke('state', body), /đăng nhập Google/);
  await assert.rejects(f.transport.invoke('__proto__', body), /không hợp lệ/);
  await assert.rejects(f.transport.invoke('grantFreeExperience', body), /không hợp lệ/);
  assert.equal(f.calls.length, 1);
});

test('changing accounts while a token refresh is pending prevents any local request', async () => {
  const token = deferred(), f = fixture();
  f.auth.currentUser.getIdToken = () => token.promise;
  const response = f.transport.invoke('state', body);
  f.auth.currentUser = identity('unit-account-b'); token.resolve('old-token');
  await assert.rejects(response, /Tài khoản đã thay đổi/); assert.equal(f.calls.length, 0);
});

test('changing accounts while a local response is pending rejects the stale result', async () => {
  const network = deferred(), auth = {currentUser: identity('unit-account-a')};
  const f = fixture({auth, fetch: () => network.promise});
  const response = f.transport.invoke('state', body);
  await Promise.resolve(); auth.currentUser = identity('unit-account-b'); network.resolve(ok({runs: ['old-account-private-progress']}));
  await assert.rejects(response, /Tài khoản đã thay đổi/);
});

test('local server errors retain their code and non-JSON responses explain how to restart the launcher', async () => {
  const f = fixture({fetch: async () => ({ok: false, json: async () => ({ok: false, error: {code: 'permission-denied', message: 'Chưa có quyền giáo viên.'}})})});
  await assert.rejects(f.transport.invoke('approve', body), {code: 'permission-denied', message: 'Chưa có quyền giáo viên.'});
  const html = fixture({fetch: async () => ({ok: false, json: async () => {throw new SyntaxError('HTML instead of JSON');}})});
  await assert.rejects(html.transport.invoke('state', body), /START-GAME\.bat/);
});

test('online adapter calls the exact eight deployed method names and uses one SDK instance', async () => {
  const calls = []; let imports = 0;
  const app = {unitOnly: true}, api = {unitApi: true};
  const sdk = {getFunctions(actual, region) {assert.equal(actual, app); assert.equal(region, 'asia-southeast1'); return api;},
    httpsCallable(actual, name) {assert.equal(actual, api); return async data => {calls.push({name, data}); return {data: {name}};};}};
  const f = fixture({app, onlineConfig: {enabled: true, functionsRegion: 'asia-southeast1'},
    loadFunctionsSDK: async () => {imports++; return sdk;},
    fetch: async () => {throw new Error('Online mode must not contact local API.');}});
  const methods = {state: 'getVillageQuestState', begin: 'beginVillageQuest', collect: 'collectVillageQuestItem',
    answer: 'answerVillageQuest', assign: 'assignVillageQuest', approve: 'approveVillageQuestPractice',
    turnIn: 'turnInVillageQuest', review: 'reviewVillageQuest'};
  for (const [method, name] of Object.entries(methods)) assert.equal((await f.transport.invoke(method, body)).name, name);
  assert.equal(imports, 1); assert.deepEqual(calls.map(c => c.name), Object.values(methods));
  for (const call of calls) assert.deepEqual(call.data, body);
});

test('account switch during SDK load must prevent dispatch under the newly signed-in user', async () => {
  const loaded = deferred(), auth = {currentUser: identity('unit-account-a')}; let writes = 0;
  const sdk = {getFunctions: () => ({}), httpsCallable: () => async () => {writes++; return {data: {}};}};
  const f = fixture({auth, onlineConfig: {enabled: true, functionsRegion: 'asia-southeast1'}, loadFunctionsSDK: () => loaded.promise});
  const pending = f.transport.invoke('begin', body);
  auth.currentUser = identity('unit-account-b'); loaded.resolve(sdk);
  await assert.rejects(pending, /Tài khoản đã thay đổi/); assert.equal(writes, 0);
});

test('account switch during the online callable rejects its old response', async () => {
  const reply = deferred(), dispatched = deferred(), auth = {currentUser: identity('unit-account-a')};
  const sdk = {getFunctions: () => ({}), httpsCallable: () => () => {dispatched.resolve(); return reply.promise;}};
  const f = fixture({auth, onlineConfig: {enabled: true, functionsRegion: 'asia-southeast1'}, loadFunctionsSDK: async () => sdk});
  const pending = f.transport.invoke('state', body); await dispatched.promise;
  auth.currentUser = null; reply.resolve({data: {runs: ['old-account-progress']}});
  await assert.rejects(pending, /Tài khoản đã thay đổi/);
});

test('real-Google localhost worker refuses emulator environment before reading credentials or player state', () => {
  for (const variable of ['FIREBASE_AUTH_EMULATOR_HOST', 'FIRESTORE_EMULATOR_HOST']) {
    const child = spawnSync(process.execPath, ['scripts/learning-preview-worker.mjs'], {
      env: {...process.env, [variable]: '127.0.0.1:1'}, input: '', encoding: 'utf8', timeout: 5000, windowsHide: true});
    assert.equal(child.status, 1); assert.match(child.stderr, /must not use emulator credentials/);
    assert.equal(child.stdout, '');
  }
});

test('mode: launcher localhost uses the private quest server; Hosting, emulator or plain servers fall back to practice', async () => {
  const probe = health => fixture({fetch: async (url, request) => {
    assert.equal(url, '/__viet_village_launcher__/health'); assert.equal(request.cache, 'no-store');
    if (health instanceof Error) throw health;
    return {ok: !!health, json: async () => health};
  }});
  assert.equal(await probe({protocol: 'viet-village-local-v1'}).transport.mode(), 'localhost');
  assert.equal(await probe(null).transport.mode(), 'practice', 'Hosting emulator / http.server have no launcher identity');
  assert.equal(await probe({protocol: 'something-else'}).transport.mode(), 'practice');
  assert.equal(await probe(new Error('offline')).transport.mode(), 'practice');
  const hosted = fixture({location: {protocol: 'https:', hostname: 'viet-village-3d--alpha-g1lx8owy.web.app'}});
  assert.equal(await hosted.transport.mode(), 'practice'); assert.equal(hosted.calls.length, 0, 'no probe or token outside loopback');
  const online = fixture({onlineConfig: {enabled: true, functionsRegion: 'asia-southeast1'}});
  assert.equal(await online.transport.mode(), 'online'); assert.equal(online.calls.length, 0);
});

test('mode probe runs once and is shared by concurrent callers', async () => {
  let probes = 0;
  const f = fixture({fetch: async () => {probes++; return {ok: true, json: async () => ({protocol: 'viet-village-local-v1'})};}});
  assert.deepEqual(await Promise.all([f.transport.mode(), f.transport.mode(), f.transport.mode()]), ['localhost', 'localhost', 'localhost']);
  assert.equal(probes, 1);
});
