import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createCharacterCreation} from '../js/character-creation.js';
import {characterModels} from '../js/character-models.js';
import {createCharacterProfileStore, characterStoragePrefix} from '../js/character-profile.js';

// This exercises the real screen orchestration with unit-only DOM, storage and
// GLB-viewer collaborators. It does not simulate or claim a real Google login.
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return {promise, resolve, reject};
}
const flush = async () => { for (let n = 0; n < 6; n++) await Promise.resolve(); };
const saved = (name = 'Em An', modelId = 'female-base') => ({schemaVersion: 1, created: true, modelId, name,
  customization: {}, height: 2.35, outfitId: 'starter-default', createdAt: '2026-10-12T00:00:00.000Z'});

function fakeDocument() {
  const nodes = [];
  const doc = {activeElement: null, getElementById: id => nodes.find(node => node.id === id) || null};
  doc.createElement = tag => {
    const classes = new Set(), listeners = new Map();
    const node = {id: '', tagName: tag.toUpperCase(), children: [], parentNode: null, hidden: false,
      disabled: false, value: '', textContent: '', attributes: {},
      classList: {toggle(name, force) { const add = force ?? !classes.has(name); if (add) classes.add(name); else classes.delete(name); return add; }, contains: name => classes.has(name)},
      append(...children) { for (const child of children) { child.parentNode = node; node.children.push(child); } },
      replaceChildren(...children) { node.children.forEach(child => { child.parentNode = null; }); node.children = []; node.append(...children); },
      setAttribute(name, value) { node.attributes[name] = String(value); },
      addEventListener(type, listener) { if (!listeners.has(type)) listeners.set(type, []); listeners.get(type).push(listener); },
      emit(type, detail = {}) {
        const event = {type, target: node, prevented: false, stopped: false,
          preventDefault() { this.prevented = true; }, stopPropagation() { this.stopped = true; }, ...detail};
        for (const listener of listeners.get(type) || []) listener(event);
        return event;
      },
      focus() { doc.activeElement = node; }, blur() { if (doc.activeElement === node) doc.activeElement = null; },
      querySelectorAll() {
        const result = [];
        const visit = item => { for (const child of item.children) { if (['BUTTON','INPUT'].includes(child.tagName) && !child.disabled) result.push(child); visit(child); } };
        visit(node); return result;
      },
      get offsetParent() { let current = node; while (current) { if (current.hidden) return null; current = current.parentNode; } return doc; }
    };
    nodes.push(node); return node;
  };
  const ids = ['characterCreation', 'characterName', 'characterStatus', 'createCharacterBtn', 'resetCharacterBtn',
    'characterRetryBtn', 'characterCreationClose', 'characterProfileBack', 'characterAnimationTestBtn',
    'characterCreationTitle', 'characterCreationIntro', 'characterPreview', 'view', 'characterModelChoices',
    'characterAppearanceGroups', 'characterForm', 'characterFrontBtn', 'characterLogoutBtn', 'playerAvatarBtn',
    'characterEnterBtn', 'characterPreviewState'];
  for (const id of ids) {
    const node = doc.createElement(id === 'characterName' ? 'input' : /Btn$|Close$|Back$/.test(id) ? 'button' : 'div');
    node.id = id;
  }
  const screen = doc.getElementById('characterCreation');
  for (const id of ids.filter(id => !['characterCreation','view','playerAvatarBtn'].includes(id))) screen.append(doc.getElementById(id));
  return doc;
}

function fixture(options = {}) {
  const document = fakeDocument(); let uid = 'unit-account';
  const calls = {load: 0, create: [], apply: [], applyModels: [], enter: [], previews: [], previewOptions: [], disposed: 0, pause: 0, clear: 0, ready: [], reset: 0, logout: 0, starts: 0, screens: []};
  const handlers = {
    load: options.load || (async () => ({status: 'missing', character: null})),
    create: options.create || (async input => saved(input.name.trim(), input.modelId)),
    showModel: options.showModel || (async () => true),
    apply: options.apply || (async () => true),
    enter: options.enter || (() => true)
  };
  const controller = createCharacterCreation({document, models: options.models || characterModels,
    getUid: () => uid, THREE: {},
    store: {load() { calls.load++; return handlers.load(); }, create(input) { calls.create.push(input); return handlers.create(input); }},
    game: {
      applyCharacter(character, model) { calls.apply.push(character); calls.applyModels.push(model); return handlers.apply(character, model); },
      enterCharacter(input) { calls.enter.push(input); return handlers.enter(input); },
      pauseCharacterSetup() { calls.pause++; }, clearMotion() { calls.clear++; }, canOpenCharacter: () => true
    },
    createPreview: () => ({start() {}, stop() {}, showModel(url, options) { calls.previews.push(url); calls.previewOptions.push(options); return handlers.showModel(url, options); },
      dispose() { calls.disposed++; }, resetView() { calls.reset++; }}),
    onReady: value => calls.ready.push(value), onLogout: () => { calls.logout++; },
    onStart: () => { calls.starts++; }, onScreenChange: open => calls.screens.push(open)
  });
  return {controller, document, calls, handlers, el: id => document.getElementById(id), setUid: value => { uid = value; }};
}

test('missing/legacy profiles require explicit creation after the model is ready', async () => {
  for (const status of ['missing', 'legacy']) {
    const model = deferred(), f = fixture({load: async () => ({status, character: null}), showModel: () => model.promise});
    assert.equal(f.controller.isBlocking(), true);
    const loading = f.controller.onAuthState(true); await flush();
    assert.equal(f.controller.state.phase, 'creating'); assert.equal(f.controller.state.modelBusy, true);
    assert.equal(f.el('createCharacterBtn').disabled, true); assert.equal(await f.controller.submit(), false);
    model.resolve(); assert.equal(await loading, false);
    assert.equal(f.controller.isReady(), false); assert.equal(f.controller.isOpen(), true);
    assert.equal(f.el('createCharacterBtn').disabled, false); assert.equal(f.calls.create.length, 0);
    f.controller.close(); assert.equal(f.controller.isOpen(), true, 'required creation is not bypassed by closing');
    f.el('characterName').value = ' Em Mới ';
    assert.equal(await f.controller.submit(), true);
    assert.deepEqual(f.calls.create, [{name: ' Em Mới ', modelId: 'female-base', customization: {}}]);
    assert.deepEqual(f.calls.enter, [{newCharacter: true}]); assert.equal(f.controller.isBlocking(), false);
  }
});

test('existing characters open the select screen; Vào làng applies once and profile viewing never creates or resets them', async () => {
  const character = saved(), model = deferred(), f = fixture({load: async () => ({status: 'ready', character}), showModel: () => model.promise});
  const loading = f.controller.onAuthState(true); await flush();
  assert.equal(f.controller.state.mode, 'select'); assert.equal(f.controller.state.phase, 'select');
  assert.equal(f.el('characterName').value, character.name); assert.equal(f.el('characterName').disabled, true);
  assert.equal(f.el('characterEnterBtn').hidden, false); assert.equal(f.el('characterEnterBtn').disabled, true, 'no entry before the saved model is shown');
  assert.equal(f.el('createCharacterBtn').hidden, true); assert.equal(f.el('characterPreviewState').textContent, 'Đang tải mô hình…');
  assert.equal(await f.controller.enter(), false); assert.equal(f.calls.starts, 0);
  model.resolve(); assert.equal(await loading, false, 'a saved character is not entered without the player');
  assert.equal(f.calls.apply.length, 0); assert.equal(f.calls.enter.length, 0); assert.equal(f.calls.create.length, 0);
  assert.equal(await f.controller.selectModel('male-base'), false, 'the saved Female model cannot be swapped on the select screen');
  assert.equal(f.el('characterEnterBtn').disabled, false); assert.equal(f.controller.isBlocking(), true);
  const first = f.controller.enter(), second = f.controller.enter();
  assert.equal(f.calls.starts, 1, 'fullscreen/orientation hook runs synchronously inside the tap, once');
  assert.equal(await first, true); assert.equal(await second, false);
  assert.deepEqual(f.calls.apply, [character]); assert.deepEqual(f.calls.enter, [{newCharacter: false}]);
  assert.equal(f.calls.create.length, 0); assert.equal(f.controller.isBlocking(), false); assert.deepEqual(f.calls.screens.slice(-1), [false]);
  assert.equal(await f.controller.onAuthState(true), true); assert.equal(f.calls.load, 1, 'token refresh does not reload/reset ready character');
  assert.equal(await f.controller.openProfile(), true); assert.equal(f.controller.state.mode, 'profile');
  assert.equal(f.controller.isBlocking(), true); assert.equal(f.el('characterName').value, character.name);
  assert.equal(f.el('characterName').disabled, true); assert.equal(f.el('resetCharacterBtn').disabled, true);
  assert.equal(await f.controller.selectModel('male-base'), false, 'read-only Female profile cannot preview a replacement model');
  assert.equal(f.controller.state.selected, 'female-base');
  assert.equal(await f.controller.submit(), false); assert.equal(await f.controller.enter(), false);
  f.el('resetCharacterBtn').emit('click'); await flush();
  assert.equal(f.el('characterName').value, character.name); assert.equal(f.calls.create.length, 0);
  assert.equal(f.el('characterCreationClose').hidden, false);
  f.controller.close(); assert.equal(f.controller.isBlocking(), false); assert.equal(f.document.activeElement, f.el('view'));
  assert.equal(f.calls.enter.length, 1); assert.equal(f.calls.apply.length, 1);
});

test('a failed entry keeps the saved profile, shows the error and can be retried without creating anything', async () => {
  const character = saved(), f = fixture({load: async () => ({status: 'ready', character}), enter: () => false});
  await f.controller.onAuthState(true); assert.equal(await f.controller.enter(), false);
  assert.equal(f.controller.state.mode, 'select'); assert.match(f.el('characterStatus').textContent, /Chưa vào làng/);
  assert.equal(f.controller.isReady(), false); assert.equal(f.calls.create.length, 0);
  f.handlers.enter = () => true; await f.controller.retry(); assert.equal(await f.controller.enter(), true);
  assert.equal(f.calls.enter.length, 2); assert.equal(f.calls.create.length, 0);
});

test('creating a character also runs the start hook synchronously, once per accepted tap', async () => {
  const f = fixture(); await f.controller.onAuthState(true); f.el('characterName').value = 'Bắt đầu';
  const first = f.controller.submit(); assert.equal(f.calls.starts, 1); assert.equal(await f.controller.submit(), false);
  assert.equal(await first, true); assert.equal(f.calls.starts, 1); assert.equal(f.calls.create.length, 1);
});

test('profile read failures disable creation until successful retry and are never treated as missing', async () => {
  const f = fixture({load: async () => { throw new Error('Storage blocked'); }});
  assert.equal(await f.controller.onAuthState(true), false);
  assert.equal(f.controller.state.errorKind, 'profile'); assert.equal(f.el('createCharacterBtn').disabled, true);
  assert.equal(f.el('characterRetryBtn').hidden, false); assert.match(f.el('characterStatus').textContent, /Storage blocked/);
  assert.equal(await f.controller.submit(), false); assert.equal(f.calls.previews.length, 0);
  // Model/reset controls must not clear a profile-loading error and unlock create.
  await f.controller.selectModel('female-base'); f.el('resetCharacterBtn').emit('click'); await flush();
  assert.equal(f.controller.state.errorKind, 'profile'); assert.equal(f.el('createCharacterBtn').disabled, true);
  assert.equal(f.calls.create.length, 0);
  f.handlers.load = async () => ({status: 'missing', character: null});
  await f.controller.retry(); assert.equal(f.calls.load, 2); assert.equal(f.controller.state.phase, 'creating');
  assert.equal(f.controller.state.errorKind, ''); assert.equal(f.el('createCharacterBtn').disabled, false);
});

test('failed model loads cannot create and model retry keeps the draft name', async () => {
  const f = fixture({showModel: async () => { throw new Error('GLB 404'); }});
  await f.controller.onAuthState(true); f.el('characterName').value = 'Tên giữ lại';
  assert.equal(f.controller.state.errorKind, 'model'); assert.equal(f.el('createCharacterBtn').disabled, true);
  assert.equal(await f.controller.submit(), false); assert.match(f.el('characterStatus').textContent, /GLB 404/);
  f.handlers.showModel = async () => true;
  assert.equal(await f.controller.retry(), true); assert.equal(f.calls.load, 1);
  assert.equal(f.controller.state.modelReady, true); assert.equal(f.el('characterName').value, 'Tên giữ lại');
  assert.equal(f.calls.create.length, 0);
});

test('unavailable male model remains disabled and cannot replace the valid choice', async () => {
  const models = characterModels.map(model => model.id === 'male-base' ? {...model, available: false, url: null} : model);
  const f = fixture({models}); await f.controller.onAuthState(true);
  const calls = f.calls.previews.length;
  assert.equal(f.el('characterModel-male-base').disabled, true);
  assert.match(f.el('characterModel-male-base').textContent, /Chưa có mẫu/);
  assert.equal(await f.controller.selectModel('male-base'), false);
  assert.equal(f.controller.state.selected, 'female-base'); assert.equal(f.calls.previews.length, calls);
});

test('rapid create clicks make one storage request and one entry', async () => {
  const pending = deferred(), f = fixture({create: () => pending.promise});
  await f.controller.onAuthState(true); f.el('characterName').value = 'Một lần';
  const first = f.controller.submit(); assert.equal(f.el('createCharacterBtn').disabled, true);
  assert.equal(await f.controller.submit(), false); assert.equal(f.calls.create.length, 1);
  pending.resolve(saved('Một lần')); assert.equal(await first, true);
  assert.equal(f.calls.apply.length, 1); assert.equal(f.calls.enter.length, 1); assert.equal(f.calls.ready.length, 1);
});

test('failed profile writes retain name and selected model for a successful retry', async () => {
  const f = fixture({create: async () => { throw new Error('Quota exceeded'); }});
  await f.controller.onAuthState(true); f.el('characterName').value = 'Tên chưa mất';
  assert.equal(await f.controller.submit(), false); assert.equal(f.controller.state.errorKind, 'save');
  assert.equal(f.el('characterName').value, 'Tên chưa mất'); assert.equal(f.controller.state.selected, 'female-base');
  assert.equal(f.el('createCharacterBtn').disabled, true); assert.equal(f.calls.enter.length, 0);
  f.handlers.create = async input => saved(input.name, input.modelId);
  assert.equal(await f.controller.retry(), true);
  assert.equal(f.calls.create.length, 2); assert.deepEqual(f.calls.create[0], f.calls.create[1]);
  assert.deepEqual(f.calls.enter, [{newCharacter: true}]);
});

test('logout during profile load cancels stale results without opening creation or entering', async () => {
  const pending = deferred(), f = fixture({load: () => pending.promise});
  const request = f.controller.onAuthState(true); f.setUid(null); await f.controller.onAuthState(false);
  pending.resolve({status: 'ready', character: saved()});
  assert.equal(await request, false); assert.equal(f.controller.isReady(), false); assert.equal(f.controller.isOpen(), false);
  assert.equal(f.calls.apply.length, 0); assert.equal(f.calls.enter.length, 0); assert.equal(f.controller.isBlocking(), true);
});

test('logout during model/apply work cannot complete entry for the old UID', async () => {
  for (const stage of ['preview', 'apply']) {
    const pending = deferred(), f = fixture(stage === 'preview'
      ? {showModel: () => pending.promise}
      : {load: async () => ({status: 'ready', character: saved()}), apply: () => pending.promise});
    let request = f.controller.onAuthState(true); await flush();
    if (stage === 'apply') { assert.equal(await request, false); request = f.controller.enter(); await flush(); assert.equal(f.calls.apply.length, 1); }
    f.setUid(null); await f.controller.onAuthState(false); pending.resolve(true);
    assert.equal(await request, false); assert.equal(f.controller.isReady(), false); assert.equal(f.controller.isOpen(), false);
    assert.equal(f.calls.enter.length, 0); assert.equal(f.calls.ready.length, 0);
  }
});

test('a new UID cannot receive the former account draft or pending save result', async () => {
  const pending = deferred(), f = fixture({create: () => pending.promise});
  await f.controller.onAuthState(true); f.el('characterName').value = 'Tài khoản cũ';
  const request = f.controller.submit(); f.setUid(null); await f.controller.onAuthState(false);
  f.setUid('second-account'); await f.controller.onAuthState(true);
  assert.equal(f.el('characterName').value, ''); assert.equal(f.controller.state.phase, 'creating');
  pending.resolve(saved('Tài khoản cũ')); assert.equal(await request, false);
  assert.equal(f.controller.isReady(), false); assert.equal(f.calls.enter.length, 0); assert.equal(f.calls.apply.length, 0);
});

test('creation/profile modal blocks game input; Escape closes only a ready profile', async () => {
  const f = fixture(); await f.controller.onAuthState(true);
  const screen = f.el('characterCreation');
  assert.equal(f.controller.isBlocking(), true); assert.ok(f.calls.pause > 0);
  for (const type of ['pointerdown','pointermove','pointerup','click','wheel']) assert.equal(screen.emit(type).stopped, true);
  const escape = screen.emit('keydown', {key: 'Escape'});
  assert.equal(escape.stopped, true); assert.equal(escape.prevented, true); assert.equal(f.controller.isOpen(), true);
  f.el('characterName').value = 'An'; await f.controller.submit(); await f.controller.openProfile();
  assert.equal(f.controller.isBlocking(), true); screen.emit('keydown', {key: 'Escape'});
  assert.equal(f.controller.isOpen(), false); assert.equal(f.controller.isBlocking(), false); assert.ok(f.calls.clear > 0);
});

test('a saved model that is unavailable preserves the profile and offers reload, not replacement', async () => {
  const character = saved('Mẫu Nam đã lưu', 'male-base');
  const models = characterModels.map(model => model.id === 'male-base' ? {...model, available: false, url: null} : model);
  const f = fixture({models, load: async () => ({status: 'ready', character})});
  assert.equal(await f.controller.onAuthState(true), false); assert.equal(f.controller.state.errorKind, 'saved-model');
  assert.equal(f.controller.state.character, character); assert.equal(f.el('createCharacterBtn').disabled, true);
  assert.equal(await f.controller.submit(), false); assert.equal(f.calls.create.length, 0); assert.equal(f.calls.enter.length, 0);
});

test('both available choices pass their own URL/calibration from preview through creation to the game', async () => {
  for (const model of characterModels) {
    assert.equal(model.available, true);
    const f = fixture(); await f.controller.onAuthState(true);
    assert.equal(f.el('characterModel-' + model.id).disabled, false);
    assert.equal(await f.controller.selectModel(model.id), true);
    assert.equal(f.calls.previews.at(-1), model.url);
    assert.equal(f.calls.previewOptions.at(-1), model.visual);
    assert.equal(f.el('characterModel-' + model.id).attributes['aria-pressed'], 'true');
    f.el('characterName').value = 'Nhân vật ' + model.label;
    assert.equal(await f.controller.submit(), true);
    assert.equal(f.calls.create[0].modelId, model.id);
    assert.equal(f.calls.apply[0].modelId, model.id);
    assert.equal(f.calls.applyModels[0], model);
    assert.equal(f.calls.disposed, 1, 'entry releases the separate preview');
  }
});

test('rapid Male/Female switches accept only the final choice, including out-of-order failures', async () => {
  const f = fixture(); await f.controller.onAuthState(true);
  const requests = [];
  f.handlers.showModel = (url, options) => { const request = deferred(); requests.push({...request, url, options}); return request.promise; };
  const first = f.controller.selectModel('male-base');
  const second = f.controller.selectModel('female-base');
  const last = f.controller.selectModel('male-base');
  assert.equal(f.controller.state.selected, 'male-base');
  assert.equal(f.controller.state.modelReady, false); assert.equal(await f.controller.submit(), false);
  requests[2].resolve(); assert.equal(await last, true);
  const status = f.el('characterStatus').textContent;
  requests[0].reject(new Error('late Male load failure')); assert.equal(await first, false);
  requests[1].resolve(); assert.equal(await second, false);
  assert.equal(f.controller.state.selected, 'male-base'); assert.equal(f.controller.state.modelReady, true);
  assert.equal(f.controller.state.errorKind, ''); assert.equal(f.el('characterStatus').textContent, status);
  assert.match(status, /Mẫu Nam sẵn sàng/);
  assert.equal(requests[2].options, characterModels.find(model => model.id === 'male-base').visual);
});

test('a failed final Male selection never saves or enters with the previous Female preview', async () => {
  const f = fixture(); await f.controller.onAuthState(true);
  f.handlers.showModel = async () => { throw new Error('MALE GLB 404'); };
  assert.equal(await f.controller.selectModel('male-base'), false);
  f.el('characterName').value = 'Nam đang đợi';
  assert.equal(f.controller.state.selected, 'male-base'); assert.equal(f.controller.state.errorKind, 'model');
  assert.equal(await f.controller.submit(), false); assert.equal(f.calls.enter.length, 0);
  f.handlers.showModel = async () => true;
  await f.controller.retry(); assert.equal(f.el('characterName').value, 'Nam đang đợi');
  assert.equal(await f.controller.submit(), true); assert.equal(f.calls.apply[0].modelId, 'male-base');
});

test('Male identity survives a fresh controller and sign-in without writing over journey data', async () => {
  const journey = JSON.stringify({level: 8, exp: 90, equipment: ['sword'], bag: ['herb'], quests: ['tutorial']});
  const entries = new Map([['existing-journey', journey]]);
  const storage = {getItem: key => entries.get(key) ?? null, setItem: (key, value) => entries.set(key, value)};
  const store = createCharacterProfileStore({storage, getUid: () => 'unit-account'});
  const f = fixture({load: store.load, create: store.create});
  await f.controller.onAuthState(true); await f.controller.selectModel('male-base');
  f.el('characterName').value = 'Nam đã lưu'; assert.equal(await f.controller.submit(), true);
  const serialized = entries.get(characterStoragePrefix + 'unit-account');
  await f.controller.onAuthState(false); assert.equal(await f.controller.onAuthState(true), false);
  assert.equal(f.controller.state.mode, 'select'); assert.equal(await f.controller.enter(), true);
  assert.equal(f.calls.apply.at(-1).modelId, 'male-base');
  const reloaded = fixture({load: store.load, create: store.create});
  assert.equal(await reloaded.controller.onAuthState(true), false); assert.equal(await reloaded.controller.enter(), true);
  assert.equal(reloaded.calls.apply[0].modelId, 'male-base'); assert.equal(reloaded.calls.apply[0].name, 'Nam đã lưu');
  assert.equal(reloaded.calls.create.length, 0); assert.deepEqual(reloaded.calls.enter, [{newCharacter: false}]);
  assert.equal(entries.get(characterStoragePrefix + 'unit-account'), serialized);
  assert.equal(entries.get('existing-journey'), journey);
});
