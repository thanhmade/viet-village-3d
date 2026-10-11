import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createAuthSession, validateFirebaseConfig } from '../js/auth-session.js';

// Unit-only Firebase fixtures: no network, no real Google account or successful OAuth claimed.
function fixture() {
  let timestamp = 1700000000000, timer, reloads = 0;
  const user = { uid: 'unit-only-user', isAnonymous: false, email: 'private@example.test' };
  const auth = { currentUser: user }, states = [];
  const result = { expirationTime: new Date(timestamp + 3600000).toISOString(),
    claims: { aud: 'viet-village-3d', sub: user.uid, firebase: { sign_in_provider: 'google.com' } } };
  const sdk = {
    reload: async () => { reloads++; }, getIdTokenResult: async () => result,
    signInWithPopup: async () => { auth.currentUser = user; },
    signOut: async () => { auth.currentUser = null; }
  };
  const model = createAuthSession({ sdk, auth, provider: {}, projectId: 'viet-village-3d',
    onState: state => states.push(state), now: () => timestamp,
    schedule: fn => { timer = fn; return 1; }, cancel: () => {} });
  return { model, sdk, auth, user, result, states, reloads: () => reloads,
    expire: () => { timestamp += 3600001; timer(); } };
}
function deferred() { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; }

assert.throws(() => validateFirebaseConfig({ projectId: 'viet-village-3d' }), { code: 'app/config-invalid' });
assert.throws(() => validateFirebaseConfig({ projectId: 'other-project', apiKey: 'unit', authDomain: 'unit', appId: 'unit' }), { code: 'app/config-invalid' });

for (const change of [
  f => { f.auth.currentUser = null; },
  f => { f.user.isAnonymous = true; },
  f => { f.result.claims.firebase.sign_in_provider = 'password'; },
  f => { f.result.claims.aud = 'other-project'; },
  f => { f.result.claims.sub = 'other-user'; },
  f => { f.result.expirationTime = new Date(1).toISOString(); },
  f => { f.result.expirationTime = 'invalid'; },
  f => { f.sdk.reload = async () => { throw { code: 'auth/user-disabled' }; }; }
]) {
  const f = fixture(); change(f);
  assert.equal(await f.model.verify(), false);
  assert.equal(f.model.isAuthenticated(), false);
  assert.equal(f.model.getProfile(), null);
}

{
  const f = fixture();
  const a = f.model.verify(), b = f.model.verify();
  assert.equal(a, b, 'coalesce concurrent checks');
  assert.equal(await a, true);
  assert.equal(f.reloads(), 1);
  assert.equal(f.model.getProfile().uid, f.user.uid);
  assert.equal(f.model.getProfile().persistence, 'memory-only');
  assert.equal(JSON.stringify(f.model.getProfile()).includes('email'), false);
  assert.equal(JSON.stringify(f.model.getProfile()).includes('token'), false);
  const wait = deferred(); f.sdk.signOut = async () => { await wait.promise; f.auth.currentUser = null; };
  const leaving = f.model.signOut();
  assert.equal(f.model.isAuthenticated(), false, 'lock before signOut resolves');
  assert.equal(f.model.getProfile(), null, 'erase profile immediately');
  wait.resolve(); await leaving;
}
{
  const f = fixture(), wait = deferred();
  f.sdk.reload = () => wait.promise;
  const stale = f.model.verify();
  await f.model.signOut(); wait.resolve();
  assert.equal(await stale, false, 'late validation cannot undo logout');
  assert.equal(f.model.isAuthenticated(), false);
}
{
  const f = fixture(); await f.model.verify();
  f.sdk.signOut = async () => { throw { code: 'auth/sign-out-failed' }; };
  await f.model.signOut();
  assert.equal(await f.model.observe(f.user), false);
  assert.equal(await f.model.verify(), false, 'SDK cache cannot restore a failed logout');
  f.sdk.signInWithPopup = async () => { throw { code: 'auth/popup-closed-by-user' }; };
  await f.model.signIn();
  assert.equal(await f.model.verify(), false, 'cancelled login cannot bypass logout lock');
}
{
  const f = fixture(); await f.model.verify(); f.expire();
  assert.equal(f.model.isAuthenticated(), false, 'expired session locks immediately');
  await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
  assert.equal(f.model.getProfile(), null);
}
{
  const f = fixture(); await f.model.verify(); f.model.offline();
  assert.equal(f.model.isAuthenticated(), false);
  assert.equal(f.model.getProfile(), null);
  assert.equal(await f.model.verify(), true, 'recovery requires SDK verification');
  f.model.invalidate('auth/user-disabled');
  assert.equal(f.model.isAuthenticated(), false);
}
{
  const require = createRequire(import.meta.url);
  const { run } = require('./harness.cjs')({ authenticated: false });
  assert.equal(run('typeof renderer'), 'undefined', 'no renderer before authentication');
  assert.equal(run('VietVillageGame.initialize()'), false);
  run('openScenery();tick(100);');
  assert.equal(run('typeof renderer'), 'undefined');
  assert.equal(run('active'), false);
  assert.equal(run('overlays()'), true, 'input and portal activation stay blocked');
}
{
  const require = createRequire(import.meta.url);
  const { run, context, listeners } = require('./harness.cjs')();
  let prevented = false;
  for (const handler of listeners.get('keydown') || []) handler({
    key: ' ', code: 'Space', target: { tagName: 'BUTTON' },
    preventDefault: () => { prevented = true; }
  });
  assert.equal(prevented, false, 'game must not intercept logout/home buttons');
  run('VietVillageGame.lock()');
  context.testAuthAllowed = false;
  for (const handler of listeners.get('keydown') || []) handler({
    key: ' ', code: 'Space', target: { tagName: 'BUTTON' },
    preventDefault: () => { prevented = true; }
  });
  assert.equal(prevented, false, 'game must not intercept the login button after logout');
  assert.equal(run('active || roaming || insideHouse'), false);
}
console.log('PASS: authentication unit checks — deny invalid sessions; SDK validation; private draft; expiry; logout race; offline recovery; game gate.');
console.log('UNIT ONLY: Firebase SDK is mocked. This is not a real Google sign-in test.');
