'use strict';
// Execute the real input/lifecycle factories. The page exits before WebGL setup.
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const context = vm.createContext({ window: {}, document: { getElementById: () => ({}) } });
vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/demo/weapons-vfx-demo.js'), 'utf8'), context);

class Surface {
  constructor() { this.listeners = new Map(); this.captures = new Set(); this.hidden = false; this.clientHeight = 800; }
  addEventListener(name, callback) {
    if (!this.listeners.has(name)) this.listeners.set(name, new Set());
    this.listeners.get(name).add(callback);
  }
  removeEventListener(name, callback) { this.listeners.get(name)?.delete(callback); }
  emit(name, data = {}) {
    const event = { target: { closest: () => null }, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; }, ...data };
    for (const callback of this.listeners.get(name) || []) callback(event);
    return event;
  }
  setPointerCapture(id) { this.captures.add(id); }
  hasPointerCapture(id) { return this.captures.has(id); }
  releasePointerCapture(id) { this.captures.delete(id); }
  focus() {}
  listenerCount() { return [...this.listeners.values()].reduce((sum, group) => sum + group.size, 0); }
}
function fixture() {
  const canvas = new Surface(), win = new Surface(), doc = new Surface();
  const calls = { pause: 0, cast: [], cycle: [], orbit: [], zoom: [] };
  const input = context.createWeaponDemoInput({ canvas, windowTarget: win, documentTarget: doc,
    onPause: () => calls.pause++, onCastSlot: slot => calls.cast.push(slot), onCycle: delta => calls.cycle.push(delta),
    onOrbit: (x, y) => calls.orbit.push([x, y]), onZoom: ratio => calls.zoom.push(ratio) });
  return { canvas, win, doc, calls, input };
}
const pointer = (id, x, y = 0) => ({ pointerId: id, clientX: x, clientY: y, pointerType: 'touch', button: 0 });

test('native button/link/summary/editable keyboard activation stays separate from game shortcuts', () => {
  const f = fixture();
  for (const tag of ['button', 'a[href]', 'summary', 'input', 'select', 'textarea', '[contenteditable="true"]', '[role="button"]']) {
    const target = { closest: selector => selector.split(',').includes(tag) ? { tag } : null };
    for (const code of ['Space', 'Digit1', 'KeyE', 'ArrowUp']) {
      assert.equal(f.win.emit('keydown', { code, target }).defaultPrevented, false, tag + ' ' + code);
    }
  }
  assert.equal(f.calls.pause, 0); assert.equal(f.calls.cast.length, 0); assert.equal(f.calls.cycle.length, 0);
  assert.equal(f.input.keys.size, 0);
  assert.equal(f.win.emit('keydown', { code: 'Space' }).defaultPrevented, true);
  f.win.emit('keydown', { code: 'Space', repeat: true });
  f.win.emit('keydown', { code: 'Digit3' }); f.win.emit('keydown', { code: 'KeyQ' });
  f.win.emit('keydown', { code: 'Digit1', isComposing: true });
  f.win.emit('keydown', { code: 'Digit1', defaultPrevented: true });
  for (const modifier of ['ctrlKey', 'altKey', 'metaKey']) f.win.emit('keydown', { code: 'Digit1', [modifier]: true });
  assert.equal(f.calls.pause, 1); assert.deepEqual(f.calls.cast, [2]); assert.deepEqual(f.calls.cycle, [-1]);
  f.input.dispose();
});

test('movement releases when focus, visibility or window changes; disposing removes input listeners', () => {
  const f = fixture();
  f.win.emit('keydown', { code: 'KeyW' }); assert.equal(f.input.keys.has('KeyW'), true);
  f.doc.emit('focusin', { target: { closest: () => ({}) } }); assert.equal(f.input.keys.size, 0);
  f.win.emit('keydown', { code: 'KeyW' }); f.win.emit('keyup', { code: 'KeyW', target: { closest: () => ({}) } });
  assert.equal(f.input.keys.size, 0);
  f.canvas.emit('pointerdown', pointer(1, 5)); f.win.emit('keydown', { code: 'KeyD' });
  f.doc.hidden = true; f.doc.emit('visibilitychange');
  assert.equal(f.canvas.captures.size, 0); assert.equal(f.input.keys.size, 0);
  f.canvas.emit('pointerdown', pointer(2, 8)); f.win.emit('blur'); assert.equal(f.canvas.captures.size, 0);
  f.canvas.emit('pointerdown', pointer(3, 8)); f.input.dispose(); f.input.dispose();
  assert.equal(f.canvas.captures.size, 0);
  for (const surface of [f.canvas, f.win, f.doc]) assert.equal(surface.listenerCount(), 0);
  f.win.emit('keydown', { code: 'Space' }); assert.equal(f.calls.pause, 0);
});

test('two-finger pinch zoom keeps individual pointer positions and ignores unrelated fingers', () => {
  const f = fixture();
  f.canvas.emit('pointerdown', pointer(1, 0));
  f.canvas.emit('pointermove', pointer(1, 10, 2)); assert.deepEqual(f.calls.orbit, [[10, 2]]);
  f.canvas.emit('pointerdown', pointer(2, 110, 2));
  f.canvas.emit('pointermove', pointer(2, 210, 2));
  assert.equal(f.calls.zoom[0], .5); assert.equal(f.calls.orbit.length, 1);
  f.canvas.emit('pointerdown', pointer(3, 900));
  f.canvas.emit('pointermove', pointer(3, 1200)); f.canvas.emit('pointerup', pointer(3, 1200));
  assert.equal(f.canvas.captures.size, 2); assert.equal(f.calls.zoom.length, 1);
  f.canvas.emit('pointerup', pointer(2, 210, 2));
  f.canvas.emit('pointermove', pointer(1, 15, 5)); assert.deepEqual(f.calls.orbit.at(-1), [5, 3]);
  f.canvas.emit('pointercancel', pointer(1, 15, 5));
  f.canvas.emit('pointermove', pointer(1, 80, 80)); assert.equal(f.calls.orbit.length, 2);
  f.canvas.emit('pointerdown', { ...pointer(4, 0), pointerType: 'mouse', button: 2 });
  assert.equal(f.canvas.captures.size, 0);
  f.input.dispose();
});

test('wheel delta units are normalized and zoom does not scroll the document', () => {
  const f = fixture();
  assert.equal(f.canvas.emit('wheel', { deltaY: 16, deltaMode: 0 }).defaultPrevented, true);
  f.canvas.emit('wheel', { deltaY: 1, deltaMode: 1 });
  assert.equal(f.calls.zoom[0], f.calls.zoom[1]);
  f.canvas.emit('wheel', { deltaY: 100000, deltaMode: 0 });
  assert.equal(f.calls.zoom.at(-1), Math.E);
  f.input.dispose();
});

test('shutdown runs once and releases shared resources, instancing, shadows and all listener groups', () => {
  const calls = new Map();
  const count = name => () => calls.set(name, (calls.get(name) || 0) + 1);
  const resource = name => ({ dispose: count(name) });
  const geometry = resource('geometry'), texture = { ...resource('texture'), isTexture: true };
  const material = { ...resource('material'), map: texture };
  const instance = { ...resource('instance'), isInstancedMesh: true, geometry, material };
  const shadow = resource('shadow');
  const scene = { traverse: callback => [instance, { geometry, material: [material] }, { shadow }].forEach(callback) };
  const renderer = { dispose: count('renderer'), domElement: { remove: count('canvas') } };
  const bindings = [count('UI listener')], skillBindings = [count('skill listener')];
  const shutdown = context.createWeaponDemoCleanup({ scene, renderer, vfx: resource('vfx'), input: resource('input'), bindings, skillBindings, stopFrames: count('RAF') });
  shutdown(); shutdown();
  assert.equal(bindings.length, 0); assert.equal(skillBindings.length, 0);
  for (const name of ['geometry', 'texture', 'material', 'instance', 'shadow', 'renderer', 'canvas', 'UI listener', 'skill listener', 'vfx', 'input', 'RAF']) {
    assert.equal(calls.get(name), 1, name + ' released exactly once');
  }
});

test('hidden demo cancels RAF entirely and resumes with zero simulation delta instead of a time jump', () => {
  const doc = new Surface(), queue = new Map(), renders = [];
  let serial = 0;
  const loop = context.createWeaponDemoFrameLoop({ documentTarget: doc,
    requestFrame: callback => { queue.set(++serial, callback); return serial; },
    cancelFrame: id => queue.delete(id), renderFrame: (now, delta) => renders.push({ now, delta }) });
  function frame(now) {
    assert.equal(queue.size, 1, 'Exactly one pending RAF');
    const [id, callback] = [...queue][0]; queue.delete(id); callback(now);
  }
  loop.start(); loop.start();
  frame(4); assert.equal(renders[0].delta, 0, 'First RAF does not subtract performance.now at initialization');
  frame(20); assert.equal(renders[1].delta, .016);
  doc.hidden = true; doc.emit('visibilitychange');
  assert.equal(queue.size, 0, 'No background render callbacks remain');
  assert.equal(renders.length, 2);
  doc.hidden = false; doc.emit('visibilitychange'); doc.emit('visibilitychange');
  frame(100000); assert.equal(renders.at(-1).delta, 0, 'Time spent in another tab is excluded');
  frame(100016); assert.equal(renders.at(-1).delta, .016);
  frame(100015); assert.equal(renders.at(-1).delta, 0, 'Clock jitter never sends negative delta to the core');
  frame(200000); assert.equal(renders.at(-1).delta, .08, 'Visible long frame remains capped');
  loop.dispose(); loop.dispose();
  assert.equal(queue.size, 0); assert.equal(doc.listenerCount(), 0);
  doc.emit('visibilitychange'); loop.start(); assert.equal(queue.size, 0);
});

test('a demo opened in a background tab waits until visible before its first render', () => {
  const doc = new Surface(), queue = new Map(); let renders = 0;
  doc.hidden = true;
  const loop = context.createWeaponDemoFrameLoop({ documentTarget: doc,
    requestFrame: callback => { queue.set(1, callback); return 1; }, cancelFrame: id => queue.delete(id),
    renderFrame: () => renders++ });
  loop.start(); assert.equal(queue.size, 0); assert.equal(renders, 0);
  doc.hidden = false; doc.emit('visibilitychange'); assert.equal(queue.size, 1);
  loop.dispose(); assert.equal(queue.size, 0);
});
