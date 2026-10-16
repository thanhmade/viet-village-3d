/* Chạy: node --test SOURCE-CODE/tests/staff-skill-effects.test.cjs
 * Hiệu ứng riêng của 3 chiêu Côn trên Three.js thật (không cần WebGL): bám điểm trên
 * thân côn, khiên theo nhân vật và gợn tại điểm trúng thật, Chấn Địa nện một lần
 * đúng mặt đất. Kiểm tra vị trí/thời gian/tài nguyên, không thay cho kiểm tra hình ảnh GPU.
 */
'use strict';
const assert = require('node:assert/strict');
const {test} = require('node:test');
const THREE = require('../../ASSETS/vendor/three.min.js');
const Core = require('../js/vfx/weapon-vfx-core.js');
require('../js/vfx/staff-skill-vfx.js');
const VFX = require('../js/vfx/staff-vfx-config.js');
require('../js/vfx/staff-skill-effects.js');

const staff = Core.getWeaponConfigs().find(config => config.weaponId === 'staff');
const skill = id => staff.skills.find(item => item.id === id);
const byType = (events, type) => events.filter(event => event.type === type);
const close = (actual, expected, message, epsilon = 1e-4) => assert.ok(Math.abs(actual - expected) < epsilon, `${message}: ${actual} ≈ ${expected}`);
const closeVector = (actual, expected, message, epsilon = 1e-4) => { close(actual.x, expected.x, message + '.x', epsilon); close(actual.y, expected.y, message + '.y', epsilon); close(actual.z, expected.z, message + '.z', epsilon); };

// Staff like the village model: shaft along local X (−1.4…+1.4), tip object at +1.4.
function rig({ground = () => 0, quality = 'low'} = {}) {
  const scene = new THREE.Scene(), caster = new THREE.Group(), events = [];
  scene.add(caster);
  const hand = new THREE.Group(); hand.position.set(.35, 1.3, -.2); caster.add(hand);
  const weapon = new THREE.Group(); weapon.name = 'weapon-staff'; hand.add(weapon);
  const tip = new THREE.Object3D(); tip.position.x = 1.4; weapon.add(tip);
  const vfx = new Core({THREE, scene, quality, maxActive: 8, getGroundY: point => ground(point), onEvent: event => events.push(event)});
  return {scene, caster, hand, weapon, tip, events, vfx};
}
const staffPoint = (weapon, x) => weapon.localToWorld(new THREE.Vector3(x, 0, 0));
const vertex = (mesh, array, index) => mesh.localToWorld(new THREE.Vector3().fromArray(array, index * 3));

test('animation segments last exactly as long as each VFX timeline', () => {
  for (const item of staff.skills) {
    const segment = VFX.animation[item.id];
    assert.ok(segment && segment.clip, item.id);
    close(segment.to - segment.from, item.duration, item.id + ' segment length');
    assert.ok(item.activeAt < item.activeEnd && item.activeEnd <= item.duration);
  }
  for (const value of Object.values(VFX.colors)) assert.match(value, /^#[0-9a-f]{6}$/i);
  for (const tier of ['low', 'medium', 'high']) assert.ok(VFX.quality[tier].trailSamples > 0 && VFX.quality[tier].rocks > 0);
});

test('Côn Quét: the ribbon is built from two real points on the staff, only while the sweep is live', () => {
  const {scene, caster, hand, weapon, tip, events, vfx} = rig(), s = skill('staff.con-quet');
  assert.equal(vfx.cast(s.id, {caster, weapon, weaponTip: tip}).ok, true);
  const fx = vfx.effects[0], [trail, mirror] = fx.sweep.trails;
  assert.ok(mirror, 'a fainter mirror trail from the other end');
  vfx.update(s.activeAt * .5);
  assert.equal(trail.mesh.visible, false); assert.equal(trail.count, 0); assert.equal(byType(events, 'impact').length, 0);
  let spawned = 0, teleported = false;
  for (let t = s.activeAt * .5; t < s.activeEnd - .05; t += 1 / 60) {
    hand.rotation.y += 9 / 60; // fast horizontal swing (tip ≈ 13 m/s)
    // Teleport mid-swing (map change / respawn): the history restarts, no streak across the map.
    const jump = !teleported && fx.age > s.activeAt + .3;
    if (jump) { caster.position.x += 30; teleported = true; }
    const before = vfx.pool.count; vfx.update(1 / 60); spawned += Math.max(0, vfx.pool.count - before);
    if (jump) assert.equal(trail.count, 1, 'history restarted at the new position');
    if (fx.age < s.activeAt + 2 / 60 || jump) continue;
    for (let i = 1; i < trail.count; i++) {
      const a = vertex(trail.mesh, trail.position, i * 2 + 1), b = vertex(trail.mesh, trail.position, (i - 1) * 2 + 1);
      assert.ok(a.distanceTo(b) < VFX.sweep.teleportDistance, 'no segment spans a jump');
    }
    assert.equal(trail.mesh.visible, true);
    closeVector(vertex(trail.mesh, trail.position, 1), staffPoint(weapon, VFX.sweep.outer[0]), 'newest outer vertex sits on the staff');
    closeVector(vertex(trail.mesh, trail.position, 0), staffPoint(weapon, VFX.sweep.inner[0]), 'newest inner vertex sits on the staff');
    closeVector(vertex(mirror.mesh, mirror.position, 1), staffPoint(weapon, -VFX.sweep.outer[0]), 'mirror follows the other end');
    for (let i = 1; i < trail.count; i++) assert.ok(trail.age[i * 2] >= trail.age[(i - 1) * 2], 'newest first, older samples fade');
  }
  assert.ok(teleported && spawned > 0, 'sparks and tip glints come from the swing');
  assert.equal(byType(events, 'impact').length, 1, 'one gameplay hit window event');
  vfx.update(s.activeEnd + VFX.sweep.life + .02 - fx.age);
  assert.equal(trail.mesh.visible, false, 'trail is gone shortly after the hit window');
  vfx.update(5);
  assert.equal(vfx.stats.active, 0); assert.equal(fx.group.parent, null);
  vfx.dispose(); assert.deepEqual(scene.children, [caster]);
});

test('Hộ Thân: shell centred on the body, never tilted, ripples only on a real hit inside the active window', () => {
  const {scene, caster, events, vfx} = rig({ground: () => .8}), s = skill('staff.ho-than');
  caster.position.set(3, 0, -2); caster.rotation.set(.3, 1.1, .2);
  assert.equal(vfx.cast(s.id, {caster, casterHeight: 2.35}).ok, true);
  const fx = vfx.effects[0], sh = fx.shield;
  close(sh.radius, Math.max(s.radius * .75, 2.35 * VFX.shield.radiusFactor), 'radius from character height');
  close(sh.root.position.y, 2.35 * VFX.shield.centerFactor, 'centre at mid body');
  const chest = new THREE.Vector3(3, .8 + 1.2, -2 - sh.radius);
  vfx.update(s.activeAt * .5);
  assert.equal(vfx.hitShield(caster, chest), false, 'no ripple before the shield is up');
  vfx.update(s.activeAt);
  closeVector(fx.group.position, new THREE.Vector3(3, .8, -2), 'feet anchor on the ground');
  assert.deepEqual(fx.group.rotation.toArray().slice(0, 3), [0, 0, 0], 'never tilts with the body');
  assert.equal(vfx.hitShield(new THREE.Group(), chest), false, 'another character is not this shield');
  assert.equal(vfx.hitShield(caster, chest), true);
  const hit = byType(events, 'shield-hit');
  assert.equal(hit.length, 1); closeVector(hit[0].position, chest, 'event keeps the real impact point');
  const slot = sh.hits[0], local = sh.shell.worldToLocal(chest.clone()).normalize();
  closeVector(new THREE.Vector3(slot.x, slot.y, slot.z), local, 'ripple origin = hit point in shell space');
  close(slot.w, fx.age, 'ripple starts now');
  assert.equal(vfx.hitShield(caster, {x: NaN, y: 0, z: 0}), false);
  caster.position.x += 4; vfx.update(.2);
  close(fx.group.position.x, 7, 'shell follows the character');
  vfx.update(s.activeEnd - fx.age + .01);
  assert.equal(vfx.hitShield(caster, chest), false, 'no ripple after the buff ended');
  assert.equal(byType(events, 'shield-end').length, 1);
  vfx.update(5); assert.equal(vfx.stats.active, 0);
  vfx.dispose(); assert.deepEqual(scene.children, [caster]);
});

test('Hộ Thân cancel: shield-end once, later hits ignored', () => {
  const {caster, events, vfx} = rig(), s = skill('staff.ho-than');
  const {handle} = vfx.cast(s.id, {caster}); vfx.update(s.activeAt + .2);
  assert.equal(vfx.cancel(handle), true);
  assert.equal(vfx.hitShield(caster, new THREE.Vector3(0, 1, -1)), false);
  assert.equal(byType(events, 'shield-end').length, 1); assert.equal(byType(events, 'shield-end')[0].cancelled, true);
  vfx.dispose();
});

test('Chấn Địa: charge at the tip, one impact where the staff end meets sloped ground', () => {
  const ground = point => .2 * point.x - .1 * point.z;
  const {scene, caster, weapon, tip, events, vfx} = rig({ground}), s = skill('staff.chan-dia');
  weapon.rotation.set(0, Math.PI / 2, -.5); // tip end forward and down: the striking (lower) end
  assert.equal(vfx.cast(s.id, {caster, weapon, weaponTip: tip}).ok, true);
  const fx = vfx.effects[0], sl = fx.slam;
  vfx.update(s.activeAt * .6);
  assert.equal(sl.orb.visible, true, 'energy gathers before contact');
  closeVector(sl.orb.getWorldPosition(new THREE.Vector3()), tip.getWorldPosition(new THREE.Vector3()), 'charge sits on the real tip');
  assert.equal(fx.column.visible, false); assert.equal(byType(events, 'impact').length, 0, 'nothing hits the ground early');
  vfx.update(s.activeAt * .4 + .01);
  const impacts = byType(events, 'impact');
  assert.equal(impacts.length, 1);
  const tipWorld = tip.getWorldPosition(new THREE.Vector3()), contact = impacts[0].position;
  assert.ok(tipWorld.y < staffPoint(weapon, -1.4).y, 'fixture: the tip is the lower end');
  close(contact.x, tipWorld.x, 'contact under the striking staff end x'); close(contact.z, tipWorld.z, 'contact under the striking staff end z');
  close(contact.y, ground(contact), 'contact on the terrain');
  closeVector(impacts[0].normal, new THREE.Vector3(-.2, 1, .1).normalize(), 'impact aligned to the slope');
  assert.ok(impacts[0].shake > 0, 'impact carries the configured light camera shake');
  closeVector(fx.group.position, contact, 'effect anchored on the struck point');
  assert.equal(sl.orb.visible, false); assert.equal(fx.column.visible, true); assert.equal(sl.cracks.visible, true);
  const crack = sl.crackGeometry.attributes.position;
  for (let i = 0; i < crack.count; i++) {
    const p = vertex(sl.cracks, crack.array, i); close(p.y, ground(p) + VFX.slam.decalLift, 'crack decal follows terrain');
  }
  caster.position.set(5, 0, 5); // the player walks away: the strike stays where it landed
  const matrix = new THREE.Matrix4(), rockPosition = new THREE.Vector3();
  let sawRing = false, sawRock = false;
  for (let i = 0; i < 90; i++) {
    vfx.update(1 / 60); if (!fx.alive) break;
    closeVector(fx.group.position, contact, 'impact stays put');
    for (const wave of sl.waves) if (wave.mesh.visible) {
      sawRing = true; const array = wave.ring.position;
      for (let k = 0; k < array.length / 3; k += 7) { const p = vertex(wave.mesh, array, k); assert.ok(p.y - ground(p) > 0 && p.y - ground(p) < .1, 'ring hugs the ground'); }
    }
    if (sl.rocks.visible) for (let r = 0; r < sl.rockState.length; r++) {
      if (!sl.rockState[r].alive) continue; sawRock = true;
      sl.rocks.getMatrixAt(r, matrix); rockPosition.setFromMatrixPosition(matrix); sl.rocks.localToWorld(rockPosition);
      assert.ok(rockPosition.y >= ground(rockPosition) - 1e-4, 'rocks never sink into the ground');
    }
  }
  assert.ok(sawRing && sawRock);
  assert.equal(byType(events, 'impact').length, 1, 'still exactly one impact');
  vfx.update(5); assert.equal(vfx.stats.active, 0);
  vfx.dispose(); assert.deepEqual(scene.children, [caster]);
});

test('Chấn Địa: the lower end beside the feet is used; behind the player falls back ahead; a huge frame impacts once', () => {
  {
    const {caster, weapon, events, vfx} = rig(), s = skill('staff.chan-dia');
    weapon.rotation.set(0, 0, -.5); // lower (+X) end lands to the side, not ahead
    vfx.cast(s.id, {caster, weapon, weaponTip: weapon.children[0]}); vfx.update(s.activeAt + .01);
    const end = staffPoint(weapon, 1.4), hit = byType(events, 'impact')[0].position;
    close(hit.x, end.x, 'side strike x'); close(hit.z, end.z, 'side strike z');
    vfx.dispose();
  }
  const {caster, weapon, tip, events, vfx} = rig(), s = skill('staff.chan-dia');
  weapon.rotation.set(0, -Math.PI / 2, -.5); // lower end behind the player
  vfx.cast(s.id, {caster, weapon, weaponTip: tip}); vfx.update(10);
  const impacts = byType(events, 'impact');
  assert.equal(impacts.length, 1);
  closeVector(impacts[0].position, new THREE.Vector3(0, 0, -VFX.slam.contactFallback), 'fallback ahead of the feet');
  assert.equal(byType(events, 'complete').length, 1);
  vfx.dispose();
});

test('Chấn Địa cancelled during the raise never strikes later (no timers)', () => {
  const {caster, weapon, tip, events, vfx} = rig(), s = skill('staff.chan-dia');
  const {handle} = vfx.cast(s.id, {caster, weapon, weaponTip: tip}); vfx.update(s.activeAt * .5);
  vfx.cancel(handle);
  for (let i = 0; i < 200; i++) vfx.update(1 / 60);
  assert.equal(byType(events, 'impact').length, 0);
  assert.equal(vfx.stats.active, 0); assert.equal(vfx.stats.particles, 0);
  vfx.dispose();
});

test('repeated casts reuse shared resources and free every per-cast buffer exactly once', () => {
  for (const quality of ['low', 'medium', 'high']) {
    const {scene, caster, weapon, tip, vfx} = rig({quality});
    const counts = new Map();
    for (let round = 0; round < 12; round++) {
      for (const item of staff.skills) {
        assert.equal(vfx.cast(item.id, {caster, weapon, weaponTip: tip}).ok, true, quality + ' ' + item.id);
        const fx = vfx.effects.at(-1), owned = [...fx.geometries, ...fx.materials];
        for (const resource of owned) { counts.set(resource, 0); resource.addEventListener('dispose', () => counts.set(resource, counts.get(resource) + 1)); }
        if (item.id === 'staff.con-quet') assert.equal(fx.sweep.trails[0].ring.length, VFX.quality[quality].trailSamples);
        if (item.id === 'staff.chan-dia') assert.equal(fx.slam.rockState.length, VFX.quality[quality].rocks);
        for (let t = 0; t < item.cooldown + .1; t += 1 / 30) { if (round % 3 === 0) caster.rotation.y += .05; vfx.update(1 / 30); }
      }
      assert.equal(vfx.shared.size, 1, 'one shared texture/geometry set per quality');
      assert.equal(vfx.stats.active, 0);
      assert.equal(scene.children.length, 2, 'only the caster and the particle pool stay in the scene');
    }
    for (const value of counts.values()) assert.equal(value, 1, 'each per-cast geometry/material disposed once');
    const shared = vfx.shared.values().next().value, sharedDisposals = [];
    for (const key of ['noise', 'crack', 'sphere', 'rockMaterial']) shared[key].addEventListener('dispose', () => sharedDisposals.push(key));
    vfx.dispose(); vfx.dispose();
    assert.deepEqual(sharedDisposals.sort(), ['crack', 'noise', 'rockMaterial', 'sphere']);
    assert.equal(vfx.shared.size, 0); assert.deepEqual(scene.children, [caster]);
  }
});

test('shaders never raise a possibly negative base with pow() (undefined in GLSL → NaN pixels)', () => {
  const source = require('node:fs').readFileSync(require.resolve('../js/vfx/staff-skill-effects.js'), 'utf8');
  for (const match of source.matchAll(/(?<!Math\.)pow\(([^,)]+),/g)) {
    const base = match[1].trim();
    assert.ok(/^(1\.-|\.5\+\.5\*|fract\(|leading$|max\()/.test(base) || /^[a-z]+$/i.test(base) && base !== 'd', 'pow base must be non-negative: ' + base);
  }
});
