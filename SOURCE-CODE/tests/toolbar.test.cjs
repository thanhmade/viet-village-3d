'use strict';
const assert = require('node:assert/strict');
const {test} = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../js/toolbar.js'), 'utf8');
const storageKey = 'viet-village-3d-toolbar-v1';

// This fixture tests the real disclosure controller and event propagation. It
// does not pretend to measure browser layout, native scrolling or WebGL.
function fixture(options = {}) {
  let document, now = 0, nextId = 0, clearCount = 0;
  const timers = new Map(), frames = new Map(), observers = [], sceneEvents = [];
  class Element {
    constructor(id, tagName = 'DIV') {
      Object.assign(this, {id, tagName, children: [], parent: null, listeners: new Map(),
        attrs: new Map(), hidden: false, inert: false, disabled: false, display: 'block',
        offsetWidth: 110, width: 90, scrollHeight: 160, textContent: '', style: {
          values: new Map(), setProperty(name, value) { this.values.set(name, value); }
        }});
      const classes = new Set();
      this.classList = {add: name => classes.add(name), contains: name => classes.has(name),
        toggle(name, enabled) { if (enabled) classes.add(name); else classes.delete(name); }};
    }
    append(child) { child.parent = this; this.children.push(child); return child; }
    addEventListener(type, handler, listenerOptions) {
      if (!this.listeners.has(type)) this.listeners.set(type, []);
      this.listeners.get(type).push({handler, options: listenerOptions});
    }
    setAttribute(name, value) { this.attrs.set(name, value); }
    getAttribute(name) { return this.attrs.get(name); }
    contains(other) { return other === this || this.children.some(child => child.contains(other)); }
    querySelector(selector) { return selector === '.tools-items' ? this.children[0] : null; }
    querySelectorAll(selector) {
      return this.children.flatMap(child => [
        ...(selector === 'button' && child.tagName === 'BUTTON' ? [child] : []),
        ...child.querySelectorAll(selector)
      ]);
    }
    closest(selector) { return selector === 'button' && this.tagName === 'BUTTON' ? this : this.parent?.closest(selector); }
    getBoundingClientRect() { return {width: this.width}; }
    focus() { document.activeElement = this; emit(this, 'focusin'); }
  }
  function emit(target, type, details = {}) {
    const event = {type, target, defaultPrevented: false, stopped: false, ...details,
      stopPropagation() { this.stopped = true; }, preventDefault() { this.defaultPrevented = true; }};
    for (let element = target; element; element = element.parent) {
      element['on' + type]?.(event);
      for (const {handler} of element.listeners.get(type) || []) handler(event);
      if (event.stopped) break;
    }
    if (!event.stopped) sceneEvents.push(type);
    return event;
  }
  function media(matches) {
    const listeners = [];
    return {matches, addEventListener(type, handler) { assert.equal(type, 'change'); listeners.push(handler); },
      change(value) { this.matches = value; listeners.forEach(handler => handler({matches: value})); }};
  }
  const tools = new Element('gameTools'), panel = tools.append(new Element('toolsPanel'));
  const items = panel.append(new Element('tools-items'));
  const buttons = ['mapBtn', 'walkBtn', 'overviewBtn', 'weaponsBtn', 'walkRoomBtn', 'logoutBtn'].map(id => items.append(new Element(id, 'BUTTON')));
  buttons[0].display = 'none'; // The existing game hides its old level button.
  buttons[4].disabled = true;
  const toggle = tools.append(new Element('toolsToggle', 'BUTTON'));
  panel.hidden = panel.inert = true;
  tools.classList.add('is-collapsed');
  const byId = new Map([tools, panel, items, toggle, ...buttons].map(element => [element.id, element]));
  document = {activeElement: null, documentElement: {clientWidth: options.mobile ? 390 : 1440},
    querySelector: selector => selector === '#gameTools' ? tools : null,
    getElementById: id => byId.get(id)};
  const mobile = media(!!options.mobile), reduced = media(!!options.reduced);
  const storage = options.storage || new Map();
  const windowListeners = new Map();
  const context = {document, innerHeight: 844,
    getComputedStyle: element => ({display: element.display, columnGap: '4px'}),
    matchMedia: query => query.includes('reduced-motion') ? reduced : mobile,
    localStorage: {
      getItem(key) { if (options.blockStorage) throw new Error('Storage blocked'); return storage.get(key) ?? null; },
      setItem(key, value) { if (options.blockStorage) throw new Error('Storage blocked'); storage.set(key, value); }
    },
    setTimeout(fn, delay) { const id = ++nextId; timers.set(id, {fn, time: now + delay}); return id; },
    clearTimeout: id => timers.delete(id),
    requestAnimationFrame(fn) { const id = ++nextId; frames.set(id, fn); return id; },
    cancelAnimationFrame: id => frames.delete(id),
    addEventListener: (type, handler) => windowListeners.set(type, handler),
    ResizeObserver: class { constructor(fn) { this.fn = fn; observers.push(this); } observe(target) { this.target = target; } },
    MutationObserver: class { constructor(fn) { this.fn = fn; observers.push(this); } observe(target) { this.target = target; } }
  };
  if (!options.noGameBridge) context.VietVillageGame = {clearMotion() { clearCount++; options.clearMotion?.(); }};
  context.window = context;
  vm.runInNewContext(source, context, {filename: 'toolbar.js'});
  function flushFrames() { const current = [...frames.values()]; frames.clear(); current.forEach(fn => fn(now)); }
  flushFrames();
  return {tools, panel, items, buttons, toggle, mobile, reduced, storage, timers, frames, observers, sceneEvents, document, emit,
    clearCount: () => clearCount,
    click: element => emit(element, 'click'),
    key: (element, key, type = 'keydown') => emit(element, type, {key}),
    advance(ms) { now += ms; for (const [id, timer] of timers) if (timer.time <= now) { timers.delete(id); timer.fn(); } },
    resize(width) { document.documentElement.clientWidth = width; windowListeners.get('resize')?.(); flushFrames(); },
    flushFrames};
}

test('desktop starts expanded; collapse protects focus immediately and hides after 250 ms', () => {
  const f = fixture();
  assert.equal(f.toggle.getAttribute('aria-expanded'), 'true');
  assert.equal(f.panel.hidden, false);
  assert.equal(f.panel.inert, false);
  f.buttons[1].focus();
  f.click(f.toggle);
  assert.equal(f.document.activeElement, f.toggle);
  assert.equal(f.toggle.getAttribute('aria-expanded'), 'false');
  assert.equal(f.panel.getAttribute('aria-hidden'), 'true');
  assert.equal(f.panel.inert, true);
  assert.equal(f.panel.hidden, false, 'The visual closing animation still has a panel to animate');
  f.advance(249);
  assert.equal(f.panel.hidden, false);
  f.advance(1);
  assert.equal(f.panel.hidden, true);
  assert.equal(f.toggle.textContent, '☰ Công cụ');
});

test('rapid repeated toggles cannot leave an expanded panel hidden by an old timer', () => {
  const f = fixture();
  for (let i = 0; i < 20; i++) {
    f.click(f.toggle);
    f.advance(35);
    f.click(f.toggle);
  }
  f.advance(1000);
  f.flushFrames();
  assert.equal(f.panel.hidden, false);
  assert.equal(f.panel.inert, false);
  assert.equal(f.toggle.getAttribute('aria-expanded'), 'true');
  assert.equal(f.timers.size, 0);
});

test('mobile defaults closed; selecting a control runs its existing handler before collapsing', () => {
  const f = fixture({mobile: true});
  assert.equal(f.panel.hidden, true);
  assert.equal(f.toggle.getAttribute('aria-expanded'), 'false');
  let calls = 0;
  const original = () => { calls++; assert.equal(f.panel.inert, false); };
  f.buttons[3].onclick = original;
  f.click(f.toggle);
  assert.equal(f.panel.hidden, false);
  f.click(f.buttons[4]);
  assert.equal(f.panel.inert, false, 'A disabled control does not dismiss the menu');
  f.click(f.buttons[3]);
  assert.equal(calls, 1);
  assert.equal(f.buttons[3].onclick, original);
  assert.equal(f.panel.inert, true);
  f.advance(250);
  assert.equal(f.panel.hidden, true);
  assert.deepEqual(f.sceneEvents, []);
});

test('mobile command route survives automatic dismissal and focus restoration, while manual menu input stops motion', () => {
  for (const input of ['pointer', 'keyboard']) {
    let route = null;
    const f = fixture({mobile: true, clearMotion() { route = null; }});
    if (input === 'pointer') {
      f.click(f.toggle);
      route = ['previous route'];
      f.emit(f.buttons[1], 'pointerdown');
      assert.equal(route, null, 'Touching the menu stops a previous movement');
      route = ['previous route'];
      f.buttons[1].focus();
      assert.equal(route, null, 'User focus still stops a previous movement');
    } else {
      route = ['previous route'];
      f.key(f.toggle, 'ArrowDown');
      assert.equal(route, null, 'Manually opening the menu stops a previous movement');
    }
    const houseRoute = Object.freeze([{x: 2, z: 4}, {x: 6, z: 8}]);
    f.buttons[1].onclick = () => { route = houseRoute; };
    const beforeCommand = f.clearCount();
    f.click(f.buttons[1]);
    assert.equal(f.panel.inert, true);
    assert.equal(f.document.activeElement, f.toggle, 'Focus leaves the now-inert commands');
    assert.equal(f.clearCount(), beforeCommand, 'Automatic collapse and its focus event do not clear the new command');
    f.advance(250);
    assert.equal(route, houseRoute, 'The complete selected route survives dismissal');
    f.click(f.toggle);
    assert.equal(route, null, 'A later manual toggle still stops motion');
    route = houseRoute;
    f.key(f.toggle, 'Escape');
    assert.equal(route, null, 'Escape remains an explicit stop and close action');
  }
});

test('desktop/mobile preferences persist independently across reload and resize', () => {
  const storage = new Map(), f = fixture({storage});
  f.click(f.toggle); // desktop closed
  f.mobile.change(true);
  assert.equal(f.panel.inert, true, 'Mobile still starts from its own default');
  f.click(f.toggle); // mobile open
  f.mobile.change(false);
  assert.equal(f.panel.inert, true, 'Returning to desktop restores desktop preference');
  assert.deepEqual(JSON.parse(storage.get(storageKey)), {desktop: true, mobile: false});
  assert.equal(fixture({storage}).panel.hidden, true);
  assert.equal(fixture({storage, mobile: true}).panel.hidden, false);
  const damaged = fixture({storage: new Map([[storageKey, 'invalid JSON']])});
  assert.equal(damaged.panel.inert, false);
  const blocked = fixture({blockStorage: true});
  blocked.click(blocked.toggle);
  blocked.advance(250);
  blocked.click(blocked.toggle);
  assert.equal(blocked.panel.inert, false, 'Storage denial does not break interaction');
});

test('keyboard opens and restores focus; native activation/Tab remain available while scene shortcuts are isolated', () => {
  const f = fixture({mobile: true});
  assert.equal(f.key(f.toggle, 'ArrowDown').defaultPrevented, true);
  assert.equal(f.document.activeElement, f.buttons[1], 'ArrowDown skips hidden level button');
  for (const key of [' ', 'Enter', 'Tab', 'w', 'a', 's', 'd']) {
    const event = f.key(f.buttons[1], key);
    assert.equal(event.defaultPrevented, false, 'The browser retains native keyboard behavior');
    assert.equal(event.stopped, true);
  }
  const escape = f.key(f.buttons[1], 'Escape');
  assert.equal(escape.defaultPrevented, true);
  assert.equal(f.panel.inert, true);
  assert.equal(f.document.activeElement, f.toggle);
  assert.equal(f.key(f.toggle, 'w', 'keyup').stopped, false, 'Keys held before focus can still release in the scene');
  assert.deepEqual(f.sceneEvents.filter(type => type === 'keydown' || type === 'keyup'), ['keyup']);
  assert.ok(f.clearCount() > 0, 'Menu interaction clears existing motion');
});

test('menu pointer/touch/wheel events never reach scene and do not suppress native menu scrolling', () => {
  const f = fixture({noGameBridge: true});
  for (const type of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'click', 'dblclick', 'touchstart', 'touchmove', 'touchend', 'wheel']) {
    const event = f.emit(f.buttons[1], type);
    assert.equal(event.stopped, true, type);
    assert.equal(event.defaultPrevented, false, type);
  }
  for (const type of ['touchstart', 'touchmove', 'touchend', 'wheel']) {
    assert.equal(f.tools.listeners.get(type)[0].options.passive, true);
  }
  assert.deepEqual(f.sceneEvents, []);
});

test('reduced motion skips closing delay, including a preference change during animation', () => {
  const f = fixture({reduced: true});
  f.click(f.toggle);
  assert.equal(f.panel.hidden, true);
  assert.equal(f.timers.size, 0);
  const pending = fixture();
  pending.click(pending.toggle);
  assert.equal(pending.panel.hidden, false);
  pending.reduced.change(true);
  assert.equal(pending.panel.hidden, true);
  assert.equal(pending.timers.size, 0);
});

test('menu height adapts to viewport and disabled/hidden changes do not change the open state', () => {
  const f = fixture({mobile: true});
  f.click(f.toggle);
  f.resize(280);
  const width = parseFloat(f.panel.style.values.get('--tools-panel-width'));
  const limitHeight = parseFloat(f.panel.style.values.get('--tools-limit-height'));
  assert.ok(width > 0 && width <= 256, 'Menu remains inside a narrow viewport');
  assert.ok(limitHeight > 0 && limitHeight <= 754, 'Menu has a finite scrollable viewport');
  f.buttons[3].hidden = true;
  for (const observer of f.observers) observer.fn();
  assert.equal(f.frames.size, 1, 'Multiple observer changes share one layout pass');
  f.flushFrames();
  assert.equal(f.panel.inert, false);
});

test('page keeps each original toolbar button and connects the disclosure with local assets', () => {
  const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
  const toolbar = html.slice(html.indexOf('id="gameTools"'), html.indexOf('<div class="help"'));
  for (const id of ['mapBtn', 'overviewBtn', 'gateBtn', 'houseBtn', 'enterHouseBtn', 'climateBtn', 'referenceBtn',
    'weaponsBtn', 'weaponsDemoBtn', 'cameraBtn', 'soundBtn', 'onlineRoomBtn', 'walkRoomBtn', 'logoutBtn', 'fullBtn', 'walkBtn']) {
    assert.equal((toolbar.match(new RegExp('id="' + id + '"', 'g')) || []).length, 1, id);
  }
  assert.ok(toolbar.includes('aria-controls="toolsPanel"'));
  for (const asset of ['./css/toolbar.css', './js/toolbar.js']) {
    assert.match(html, new RegExp('"' + asset.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?:\\?[^"<>]*)?"'));
    assert.ok(fs.existsSync(path.join(__dirname, '..', asset)));
  }
});
