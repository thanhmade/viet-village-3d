'use strict';
const assert = require('node:assert/strict');
const {test} = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../js/weapons-demo-link.js'), 'utf8');

function fixture() {
  const events = [], listeners = new Map();
  const originalHandlers = new Map();
  const buttons = new Map(['weaponsDemoBtn', 'homeWeaponsDemoBtn'].map(id => {
    const previousClick = () => {};
    originalHandlers.set(id, previousClick);
    return [id, {
      onclick: previousClick,
      addEventListener(type, handler) {
        assert.equal(type, 'click', 'Only the two entry buttons receive handlers');
        listeners.set(id, handler);
      }
    }];
  }));
  const context = {
    URL,
    document: {
      baseURI: 'http://localhost:8001/SOURCE-CODE/index.html?quality=low',
      getElementById: id => buttons.get(id)
    },
    open: (...args) => { events.push(['open', ...args]); return null; },
    VietVillageGame: { clearMotion: () => events.push(['clearMotion']) }
  };
  context.window = context;
  vm.runInNewContext(source, context);
  return {context, events, listeners, buttons, originalHandlers,
    click(id) { listeners.get(id)({stopPropagation() {}}); }};
}

test('both demo entries stay closed before Google authentication is verified', () => {
  const f = fixture();
  for (const id of f.listeners.keys()) f.click(id);
  f.context.VietVillageAuth = {isAuthenticated: () => false};
  for (const id of f.listeners.keys()) f.click(id);
  assert.deepEqual(f.events, [], 'No motion state or browser navigation changes while locked');
});

test('verified user opens a separate local tab synchronously and keeps existing button handlers', () => {
  const f = fixture();
  f.context.VietVillageAuth = {isAuthenticated: () => true};
  for (const id of f.listeners.keys()) {
    f.click(id);
    assert.equal(f.buttons.get(id).onclick, f.originalHandlers.get(id));
  }
  const oneClick = [
    ['clearMotion'],
    ['open', 'http://localhost:8001/SOURCE-CODE/weapons-vfx-demo.html', '_blank', 'noopener,noreferrer']
  ];
  assert.deepEqual(f.events, [...oneClick, ...oneClick]);
});

test('entry rechecks the live session and rejects a click after logout', () => {
  const f = fixture();
  let authenticated = true;
  f.context.VietVillageAuth = {isAuthenticated: () => authenticated};
  f.click('weaponsDemoBtn');
  authenticated = false;
  f.click('homeWeaponsDemoBtn');
  assert.equal(f.events.length, 2, 'The logged-out click does not open another tab or clear movement');
});
