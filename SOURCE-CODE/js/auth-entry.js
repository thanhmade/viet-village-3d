import { firebaseConfig } from './firebase-config.js';
import { createAuthSession, validateFirebaseConfig } from './auth-session.js';
import { initializeOnline } from './online-entry.js';

const SDK_VERSION = '13.0.0';
const $auth = id => document.getElementById(id);
const status = $auth('authStatus'), login = $auth('googleLoginBtn'), retry = $auth('authRetryBtn');
const gameElements = [...document.querySelectorAll('#view,#hud,#home,#quiz,#levels,#complete,#referenceGallery,#climatePanel,#roomControls,#entryLayer')];
let session, online, booting = false, gameReady = false;

const messages = {
  'app/config-invalid': 'Chưa có cấu hình đăng nhập hợp lệ. Vui lòng liên hệ giáo viên.',
  'auth/popup-blocked': 'Trình duyệt chặn cửa sổ Google. Hãy cho phép cửa sổ bật lên rồi thử lại.',
  'auth/popup-closed-by-user': 'Bạn đã đóng cửa sổ đăng nhập. Hãy đăng nhập bằng Google để tiếp tục.',
  'auth/cancelled-popup-request': 'Một cửa sổ đăng nhập khác đang mở. Hãy hoàn tất cửa sổ đó.',
  'auth/unauthorized-domain': 'Địa chỉ này chưa được phép đăng nhập. Khi thử trên máy tính, hãy mở game bằng localhost.',
  'auth/operation-not-allowed': 'Đăng nhập Google chưa được bật cho ứng dụng. Vui lòng liên hệ giáo viên.',
  'auth/network-request-failed': 'Chưa kết nối được dịch vụ đăng nhập. Kiểm tra Internet rồi nhấn Kiểm tra lại.',
  'auth/web-storage-unsupported': 'Trình duyệt không cho phép lưu phiên. Hãy dùng Chrome/Edge và cho phép dữ liệu trang web.',
  'auth/user-disabled': 'Tài khoản đã bị vô hiệu hóa. Vui lòng liên hệ giáo viên.',
  'auth/user-not-found': 'Tài khoản không còn tồn tại. Hãy đăng nhập lại bằng Google.',
  'auth/session-invalid': 'Phiên hiện tại không hợp lệ cho game. Hãy đăng nhập lại bằng Google.',
  'auth/session-expired': 'Phiên đã hết hạn. Đang kiểm tra lại với Firebase…',
  'auth/user-token-expired': 'Phiên đăng nhập đã hết hiệu lực. Hãy đăng nhập lại bằng Google.',
  'auth/invalid-user-token': 'Phiên đăng nhập đã hết hiệu lực. Hãy đăng nhập lại bằng Google.',
  'auth/invalid-api-key': 'Cấu hình dịch vụ đăng nhập chưa hợp lệ. Vui lòng liên hệ giáo viên.'
};

function renderState({ phase, code = '', profile = null }) {
  const authenticated = phase === 'authenticated' && session?.isAuthenticated();
  const locked = !authenticated;
  document.body.classList.toggle('auth-locked', locked);
  document.body.dataset.authState = authenticated ? 'authenticated' : phase;
  for (const element of gameElements) element.inert = locked;
  $auth('authGate').hidden = authenticated;
  login.disabled = !session || ['checking', 'signing-in', 'signing-out'].includes(phase);
  retry.classList.toggle('hidden', !['error'].includes(phase));
  status.textContent = code ? (messages[code] || 'Chưa hoàn tất đăng nhập. Hãy thử lại hoặc liên hệ giáo viên.')
    : phase === 'signing-in' ? 'Đang chờ bạn đăng nhập trong cửa sổ Google…'
    : phase === 'checking' ? 'Đang xác minh phiên đăng nhập với Firebase…'
    : phase === 'signing-out' ? 'Đang đăng xuất…'
    : 'Đăng nhập bằng tài khoản Google để vào ngôi làng.';
  $auth('authGate').setAttribute('aria-busy', String(['checking', 'signing-in', 'signing-out'].includes(phase)));
  $auth('playerIdentity').textContent = authenticated ? 'Đã đăng nhập · ' + profile.nickname : '';
  $auth('homeLogoutBtn').disabled = $auth('logoutBtn').disabled = locked;
  if (authenticated) {
    gameReady = window.VietVillageGame.initialize();
    $auth('play').disabled = !gameReady;
  } else {
    gameReady = false;
    window.VietVillageGame?.lock();
    $auth('play').disabled = true;
  }
  online?.onAuthState(authenticated);
}

window.VietVillageAuth = Object.freeze({
  isAuthenticated: () => !!session?.isAuthenticated(),
  getProfile: () => session?.getProfile() || null,
  enterGame: async callback => {
    $auth('play').disabled = true;
    try { if (await session?.verify(true)) { if (gameReady) callback(); } }
    finally { $auth('play').disabled = !gameReady || !session?.isAuthenticated(); }
  }
});

async function boot() {
  if (booting || session) return;
  booting = true;
  renderState({ phase: 'checking' });
  try {
    validateFirebaseConfig(firebaseConfig);
    if (!['http:', 'https:'].includes(location.protocol)) {
      throw Object.assign(new Error('HTTP required'), { code: 'auth/unauthorized-domain' });
    }
    const [appSDK, sdk] = await Promise.all([
      import(`https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-auth.js`)
    ]);
    const app = appSDK.initializeApp(firebaseConfig);
    const auth = sdk.initializeAuth(app, { persistence: sdk.browserSessionPersistence,
      popupRedirectResolver: sdk.browserPopupRedirectResolver });
    const provider = new sdk.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    session = createAuthSession({ sdk, auth, provider, projectId: firebaseConfig.projectId, onState: renderState });
    online = initializeOnline({app,auth,authSDK:sdk,isAuthenticated:()=>session.isAuthenticated(),sdkVersion:SDK_VERSION});
    sdk.onIdTokenChanged(auth, user => session.observe(user), error => session.invalidate(error?.code));
    login.onclick = () => session.signIn();
    $auth('homeLogoutBtn').onclick = $auth('logoutBtn').onclick = () => session.signOut();
    // Force server validation periodically and when returning to a suspended tab.
    setInterval(() => { if (auth.currentUser && navigator.onLine) session.verify(true); }, 120000);
    addEventListener('online', () => session.verify(true));
    addEventListener('offline', () => session.offline());
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && auth.currentUser) session.verify(true);
    });
    addEventListener('focus', () => { if (auth.currentUser) session.verify(true); });
  } catch (error) {
    renderState({ phase: 'error', code: error?.code || 'auth/network-request-failed' });
  } finally { booting = false; }
}

retry.onclick = () => session ? session.verify(true) : boot();
renderState({ phase: 'checking' });
boot();
