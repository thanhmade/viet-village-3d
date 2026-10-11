// No database access and no manual storage of Firebase/Google tokens.
export function validateFirebaseConfig(config) {
  const missing = ['apiKey', 'authDomain', 'projectId', 'appId']
    .filter(key => typeof config?.[key] !== 'string' || !config[key].trim());
  if (missing.length || config.projectId !== 'viet-village-3d') {
    throw Object.assign(new Error('Invalid Web App configuration'), { code: 'app/config-invalid' });
  }
}

export function createAuthSession({ sdk, auth, provider, projectId, onState,
  now = Date.now, schedule = setTimeout, cancel = clearTimeout }) {
  let allowed = false, expiry = 0, profile = null, uid = null;
  let revision = 0, pending = null, expiryTimer = null;
  let signingIn = false, signingOut = false, requireSignIn = false, intent = 0;

  const isAuthenticated = () => allowed && !requireSignIn && expiry > now()
    && !!auth.currentUser && auth.currentUser.uid === uid;
  const publish = (phase, code = '') => onState({ phase, code,
    profile: isAuthenticated() ? profile : null });
  function block(code = '', phase = 'signed-out') {
    revision++; pending = null; allowed = false; expiry = 0; profile = null;
    cancel(expiryTimer); expiryTimer = null;
    publish(phase, code);
  }

  function verify(force = true) {
    if (signingIn || signingOut || requireSignIn) return Promise.resolve(false);
    const user = auth.currentUser;
    if (!user) { uid = null; block(); return Promise.resolve(false); }
    if (uid !== user.uid) { uid = user.uid; block('', 'checking'); }
    if (pending) return pending;
    const version = revision;
    if (!isAuthenticated()) publish('checking');
    let task;
    task = Promise.resolve().then(async () => {
      try {
        // A persisted SDK user alone is insufficient: check the account with Firebase.
        await sdk.reload(user);
        const result = await sdk.getIdTokenResult(user, force);
        if (version !== revision || auth.currentUser?.uid !== user.uid || signingOut || requireSignIn) return false;
        const expires = Date.parse(result.expirationTime);
        const claims = result.claims;
        if (user.isAnonymous || claims?.firebase?.sign_in_provider !== 'google.com'
          || claims.aud !== projectId || claims.sub !== user.uid
          || !Number.isFinite(expires) || expires <= now()) {
          throw Object.assign(new Error('Invalid Google session'), { code: 'auth/session-invalid' });
        }
        expiry = expires; allowed = true;
        profile = Object.freeze({ schemaVersion: 1, uid: user.uid,
          nickname: 'Người chơi', avatarId: 'villager-default', persistence: 'memory-only' });
        cancel(expiryTimer);
        expiryTimer = schedule(() => {
          allowed = false;
          publish('checking', 'auth/session-expired');
          verify(true);
        }, Math.max(0, expiry - now()));
        publish('authenticated');
        return true;
      } catch (error) {
        if (version === revision) {
          const code = error?.code || 'auth/verification-failed';
          if (['auth/user-disabled', 'auth/user-token-expired', 'auth/invalid-user-token',
            'auth/user-not-found', 'auth/session-invalid'].includes(code)) requireSignIn = true;
          block(code, 'error');
        }
        return false;
      } finally { if (pending === task) pending = null; }
    });
    pending = task;
    return task;
  }

  function observe(user) {
    if (signingOut || requireSignIn || signingIn) return Promise.resolve(false);
    if (!user) { uid = null; block(); return Promise.resolve(false); }
    return verify(!isAuthenticated());
  }

  async function signIn() {
    if (signingIn || signingOut) return false;
    const request = intent;
    const wasRequired = requireSignIn;
    signingIn = true; requireSignIn = false;
    block('', 'signing-in');
    try {
      // Run immediately within the button's user gesture; do not await before opening the popup.
      await sdk.signInWithPopup(auth, provider);
      signingIn = false;
      if (request !== intent) return false;
      return await verify(true);
    } catch (error) {
      requireSignIn = wasRequired;
      if (request === intent) block(error?.code || 'auth/sign-in-failed', 'error');
      return false;
    } finally { signingIn = false; }
  }

  async function signOut() {
    if (signingOut) return false;
    intent++; signingOut = true; requireSignIn = true; uid = null;
    // Lock the game and erase the draft before waiting on the SDK.
    block('', 'signing-out');
    try { await sdk.signOut(auth); publish('signed-out'); return true; }
    catch (error) { publish('error', error?.code || 'auth/sign-out-failed'); return false; }
    finally { signingOut = false; }
  }

  function offline() { block('auth/network-request-failed', 'error'); }
  return Object.freeze({ isAuthenticated, verify, observe, signIn, signOut, offline,
    invalidate: code => block(code || 'auth/verification-failed', 'error'),
    getProfile: () => isAuthenticated() ? profile : null });
}
