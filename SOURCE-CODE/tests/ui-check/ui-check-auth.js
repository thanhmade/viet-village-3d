// Browser UI-check fixture (test server on 127.0.0.1 only). Replaces the Google /
// Firebase entry with a fake local UID so layouts, quests and orientation can be
// checked repeatedly. Progress lives in this origin's localStorage under
// "ui-check-*" UIDs; no server, no online rewards, no real account.
import {createCharacterProfileStore} from '../../js/character-profile.js';
import {createCharacterCreation} from '../../js/character-creation.js';

if (!['localhost', '127.0.0.1', '[::1]'].includes(location.hostname)) throw new Error('UI check runs on localhost only.');
const $ = id => document.getElementById(id);
const params = new URLSearchParams(location.search);
const uid = 'ui-check-' + ((params.get('player') || 'a').replace(/[^a-z0-9-]/gi, '').slice(0, 20) || 'a');
let authenticated = true;

window.VietVillageExperiencePolicy = Object.freeze({localOnly: true});
// Same "practice" mode as static hosting: browser practice only, never EXP.
window.VietVillageLearningTransport = Object.freeze({mode: async () => 'practice',
  invoke: async () => { throw Object.assign(new Error('Trang kiểm thử không có máy chủ nhiệm vụ.'), {code: 'learning/backend-unavailable'}); }});
const store = createCharacterProfileStore({storage: {getItem: key => localStorage.getItem(key), setItem: (key, value) => localStorage.setItem(key, value)},
  getUid: () => authenticated ? uid : null, withLock: navigator.locks?.request ? (name, operation) => navigator.locks.request(name, operation) : undefined});
const characters = createCharacterCreation({store, getUid: () => authenticated ? uid : null, game: window.VietVillageGame, THREE: window.THREE,
  onLogout: () => signOut(), onStart: () => window.VietVillageLandscape?.requestOnStart(), onScreenChange: () => window.VietVillageLandscape?.schedule(),
  onReady: profile => { $('playerIdentity').textContent = 'Kiểm thử · ' + profile.name; $('play').disabled = false; }});
window.VietVillageCharacter = characters;
window.VietVillageAuth = Object.freeze({isAuthenticated: () => authenticated, getProfile: () => authenticated ? {uid, nickname: 'Kiểm thử'} : null,
  enterGame: async callback => { if (authenticated && characters.isReady() && !characters.isOpen()) callback(); }});

const gameElements = [...document.querySelectorAll('#view,#hud,#home,#quiz,#levels,#complete,#referenceGallery,#climatePanel,#roomControls,#entryLayer')];
function render() {
  document.body.classList.toggle('auth-locked', !authenticated);
  document.body.dataset.authState = authenticated ? 'authenticated' : 'signed-out';
  for (const element of gameElements) element.inert = !authenticated;
  $('authGate').hidden = authenticated; $('authGate').setAttribute('aria-busy', 'false');
  $('googleLoginBtn').disabled = authenticated; $('googleLoginBtn').textContent = 'Vào lại bằng UID giả (' + uid + ')';
  $('authStatus').textContent = 'Trang kiểm thử giao diện · không dùng Google/Firebase.';
  $('homeLogoutBtn').disabled = $('logoutBtn').disabled = !authenticated;
  if (authenticated) { const ready = window.VietVillageGame.initialize(); $('play').disabled = !ready || !characters.isReady(); if (ready) void characters.onAuthState(true); }
  else { void characters.onAuthState(false); window.VietVillageGame.lock(); $('play').disabled = true; }
  window.VietVillageLandscape?.schedule();
}
function signOut() { authenticated = false; render(); }
$('googleLoginBtn').onclick = () => { authenticated = true; render(); };
$('homeLogoutBtn').onclick = $('logoutBtn').onclick = signOut;
const banner = document.createElement('div');
banner.textContent = 'KIỂM THỬ GIAO DIỆN · UID giả ' + uid + ' · không Google/Firebase';
banner.style.cssText = 'position:fixed;left:50%;bottom:2px;transform:translateX(-50%);z-index:200;padding:2px 8px;border-radius:6px;background:#7a1f1fcc;color:#fff;font:600 10px system-ui;pointer-events:none';
document.body.append(banner);
render();
