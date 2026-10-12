'use strict';
const assert = require('node:assert/strict');
const {test} = require('node:test');
const createHarness = require('./harness.cjs');
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-6, `${actual} ≈ ${expected}`);
// Advance at least 17 ms between rendered frames; the village caps rendering at 60 Hz.

test('local weapons use the original player, scene and walking without an online room', () => {
  const {run, context} = createHarness();
  const scene = context.VietVillageGame.scene(), player = context.VietVillageGame.avatarTemplate();
  assert.equal(context.VietVillageOnline, undefined);
  assert.equal(context.VietVillageWeapons.equip('staff'), true);
  assert.equal(run('localWalking && player.visible && !multiplayerWalking'), true);
  assert.equal(context.VietVillageGame.scene(), scene);
  assert.equal(context.VietVillageGame.avatarTemplate(), player);
  const grip = player.getObjectByName('village-local-weapon');
  assert.equal(grip.parent, run('rightArm'));
  assert.equal(grip.userData.localOnly, true);
  assert.equal(grip.children.filter(child => child.name.startsWith('weapon-')).length, 1,
    'Only the equipped model participates in scene matrix traversal');
  const before = player.position.clone();
  run('keys.KeyW=true; tick(17); keys.KeyW=false;');
  assert.ok(player.position.distanceTo(before) > 0, 'Existing WASD movement advances the player');
  const afterKeyboard = player.position.clone();
  run('joystick.x=1;tick(34);joystick.x=0;');
  assert.ok(player.position.distanceTo(afterKeyboard) > 0, 'Existing touch joystick advances the player');
  run('yaw=0;player.position.set(24,bridgeHeight(24,21),21);keys.KeyD=true;tick(102);keys.KeyD=false;');
  assert.ok(run('player.position.x') <= 24.1, 'Existing world collision still prevents leaving the map');
  context.VietVillageGame.stopRoomWalk();
  assert.equal(run('localWalking && player.visible'), true, 'Room state changes do not stop local practice');
});

test('all five equipped models cast their three skills, preserve cooldown and follow +Z avatar orientation', () => {
  const {run, context} = createHarness();
  const controller = context.VietVillageWeapons, scene = context.VietVillageGame.scene();
  const configs = context.WeaponVFXCore.getWeaponConfigs();
  for (const config of configs) {
    assert.equal(controller.equip(config.weaponId), true);
    for (const skill of config.skills) {
      assert.equal(controller.cast(skill.slot).ok, true, skill.id);
      assert.ok(scene.getObjectByName(skill.id + '-vfx'));
      controller.update(skill.duration + .05);
      assert.equal(controller.state.active, 0, 'Completed effects release their groups');
    }
  }
  controller.equip('staff');
  run('body.rotation.y=Math.PI/2;body.updateWorldMatrix(true,true);');
  const caster = scene.getObjectByName('village-weapon-caster'), T = context.THREE;
  const direction = new T.Vector3(0,0,-1).applyQuaternion(caster.getWorldQuaternion(new T.Quaternion()));
  near(direction.x, 1); near(direction.z, 0);
  const tip = scene.getObjectByName('staff-tip');
  const before = tip.getWorldPosition(new T.Vector3());
  run('rightArm.rotation.x=.4;body.updateWorldMatrix(true,true);');
  assert.ok(tip.getWorldPosition(new T.Vector3()).distanceTo(before) > .05, 'Emission tip is attached to the actual animated arm');
  controller.update(20);
  assert.equal(controller.cast(1).ok, true);
  controller.equip('sword'); controller.equip('staff');
  assert.equal(controller.cast(1).reason, 'cooldown', 'Switching equipment does not reset cooldown');
});

test('effects use bridge height and cancel for house, gate and overlay transitions', () => {
  const {run, context} = createHarness();
  const controller = context.VietVillageWeapons, scene = context.VietVillageGame.scene();
  controller.equip('staff');
  run('player.position.set(15,bridgeHeight(15,18),18);');
  assert.equal(controller.cast(2).ok, true);
  near(scene.getObjectByName('staff.ho-than-vfx').position.y, run('bridgeHeight(15,18)'));
  run('enterHouse(0);tick(17);');
  assert.equal(controller.state.active, 0);
  assert.equal(run('player.visible'), false);
  assert.equal(context.document.body.classList.contains('weapons-roaming'), false, 'Exterior joystick is hidden in interiors');
  assert.equal(controller.cast(1).ok, false);
  run('leaveHouse();tick(34);');
  assert.equal(context.document.body.classList.contains('weapons-roaming'), true);
  controller.equip('sword'); assert.equal(controller.cast(1).ok, true);
  run("$('gateBtn').onclick();");
  const before = context.VietVillageGame.avatarTemplate().position.clone();
  run('keys.KeyW=true;tick(102);keys.KeyW=false;');
  assert.equal(controller.state.active, 0);
  assert.equal(controller.cast(2).ok, false);
  near(context.VietVillageGame.avatarTemplate().position.distanceTo(before), 0);
  controller.equip('axe'); assert.equal(controller.cast(1).ok, true);
  run("$('referenceGallery').classList.remove('hidden');tick(119);");
  assert.equal(controller.state.active, 0);
  assert.equal(controller.cast(2).ok, false);
  run("$('referenceGallery').classList.add('hidden');");
  controller.openPanel();
  assert.equal(controller.cast(2).ok, false, 'Equipment menu blocks casting until closed');
});

test('logout and disposal remove only local effects/models and never unlock authentication', () => {
  const {run, context} = createHarness();
  const player = context.VietVillageGame.avatarTemplate(), scene = context.VietVillageGame.scene();
  const originalMesh = run('body.children[0]');
  const originalGeometry = originalMesh.geometry;
  let disposedOriginal = false;
  originalGeometry.addEventListener('dispose', () => { disposedOriginal = true; });
  context.VietVillageWeapons.equip('staff');
  assert.equal(context.VietVillageWeapons.cast(2).ok, true);
  context.testAuthAllowed = false;
  context.VietVillageGame.lock();
  assert.equal(context.VietVillageWeapons.state.active, 0);
  assert.equal(context.VietVillageWeapons.state.particles, 0);
  assert.equal(run('localWalking || multiplayerWalking || player.visible'), false);
  assert.equal(context.VietVillageWeapons.equip('bow'), false);
  assert.equal(context.VietVillageWeapons.cast(1).ok, false);
  context.VietVillageWeapons.dispose(); context.VietVillageWeapons.dispose();
  assert.equal(player.getObjectByName('village-local-weapon'), undefined);
  assert.equal(scene.getObjectByName('village-weapon-caster'), undefined);
  assert.equal(originalMesh.geometry, originalGeometry);
  assert.equal(disposedOriginal, false);
});

test('skill input preserves movement and native controls; focus/visibility and equipment menu suspend safely', () => {
  const {run, context} = createHarness();
  context.VietVillageWeapons.dispose();
  const listeners = new Map();
  const record = (target, name, handler) => listeners.set(target + ':' + name, handler);
  context.addEventListener = (name, handler) => record('window', name, handler);
  context.document.addEventListener = (name, handler) => record('document', name, handler);
  const elementPrototype = Object.getPrototypeOf(context.document.getElementById('weaponsPanel'));
  elementPrototype.addEventListener = function (name, handler) { record(this.id, name, handler); };
  run(`villageWeapons=createVillageWeapons({THREE,scene,body,rightArm,clearMotion,startRoaming,stopRoaming,
    getGroundY:point=>bridgeHeight(point.x,point.z),
    getState:()=>({authenticated:VietVillageAuth.isAuthenticated(),canCast:localWalking&&world.visible&&!insideHouse&&!overlays()})});`);
  const controller = run('villageWeapons');
  controller.equip('staff');
  let prevented = 0;
  const keydown = listeners.get('window:keydown');
  for (const tagName of ['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON', 'A']) {
    keydown({code:'Digit1',target:{tagName},preventDefault:()=>prevented++});
  }
  keydown({code:'KeyW',target:{tagName:'DIV'},preventDefault:()=>prevented++});
  assert.equal(prevented, 0, 'Native controls and movement keys are not intercepted');
  assert.equal(controller.state.active, 0);
  keydown({code:'Digit1',target:{tagName:'DIV'},preventDefault:()=>prevented++});
  assert.equal(prevented, 1);
  assert.equal(controller.state.active, 1);
  listeners.get('window:blur')();
  assert.equal(controller.state.active, 0);
  assert.equal(controller.cast(2).ok, false);
  listeners.get('window:focus')();
  assert.equal(controller.cast(2).ok, true);
  context.document.hidden = true;
  listeners.get('document:visibilitychange')();
  assert.equal(controller.state.active, 0);
  assert.equal(controller.cast(3).ok, false);
  context.document.hidden = false;
  run('keys.KeyW=true;joystick.x=1;');
  let stopped = false;
  listeners.get('weaponSkillBar:pointerdown')({type:'pointerdown',stopPropagation:()=>{stopped=true;}});
  assert.equal(stopped, true);
  assert.equal(run('!!keys.KeyW && !!joystick.x'), true, 'Touch casting can coexist with a held movement joystick');
  listeners.get('weaponsPanel:pointerdown')({type:'pointerdown',stopPropagation(){}});
  assert.equal(run('!!keys.KeyW || !!joystick.x'), false);
  controller.dispose();
});

test('idle adapter avoids DOM and whole-body work; lazily built cached equipment is fully disposed', () => {
  const {run, context} = createHarness();
  const controller = context.VietVillageWeapons, player = context.VietVillageGame.avatarTemplate();
  assert.equal(player.getObjectByName('village-local-weapon'), undefined,
    'Opening the village does not allocate or attach all five weapon models');
  let builds = 0;
  const disposalCounts = new Map(), makeModels = context.createVillageWeaponModels;
  context.createVillageWeaponModels = function (...args) {
    builds++;
    const collection = makeModels(...args);
    collection.root.traverse(object => {
      const resources = [object.geometry, ...[object.material].flat()].filter(Boolean);
      for (const resource of resources) {
        if (disposalCounts.has(resource)) continue;
        disposalCounts.set(resource, 0);
        resource.addEventListener('dispose', () => disposalCounts.set(resource, disposalCounts.get(resource) + 1));
      }
    });
    return collection;
  };
  controller.equip('staff'); controller.update(10);
  let domWrites = 0, classWrites = 0, labelLookups = 0, fullBodyUpdates = 0;
  const labelIds = new Set(['equippedWeaponName', 'weaponSkill1', 'weaponSkill2', 'weaponSkill3']);
  for (const id of ['equippedWeaponName', 'weaponSkill1', 'weaponSkill2', 'weaponSkill3']) {
    const element = context.document.getElementById(id);
    for (const property of ['textContent', 'disabled']) {
      let value = element[property];
      Object.defineProperty(element, property, {configurable: true, get: () => value,
        set: next => { domWrites++; value = next; }});
    }
  }
  for (const element of [context.document.body, context.document.getElementById('weaponSkillBar')]) {
    for (const method of ['add', 'remove']) {
      const original = element.classList[method];
      element.classList[method] = (...args) => { classWrites++; return original(...args); };
    }
  }
  const getElement = context.document.getElementById;
  // The host's live overlay/auth guard still reads its own UI; count only adapter labels.
  context.document.getElementById = id => { if (labelIds.has(id)) labelLookups++; return getElement(id); };
  const body = run('body'), updateWorldMatrix = body.updateWorldMatrix;
  body.updateWorldMatrix = function (parents, children) {
    if (parents && children) fullBodyUpdates++;
    return updateWorldMatrix.call(this, parents, children);
  };
  for (let frame = 0; frame < 600; frame++) controller.update(1/60);
  assert.deepEqual({domWrites, classWrites, labelLookups, fullBodyUpdates},
    {domWrites: 0, classWrites: 0, labelLookups: 0, fullBodyUpdates: 0});
  assert.equal(controller.cast(1).ok, true);
  domWrites = 0;
  for (let frame = 0; frame < 60; frame++) controller.update(1/60);
  assert.ok(domWrites <= 12, `Cooldown label updates are limited to its 0.1s precision: ${domWrites}`);
  controller.update(.21);
  assert.equal(controller.state.active, 0);
  controller.update(.3);
  assert.equal(controller.cast(1).ok, true, 'Cooldown continues after effects finish and the pool becomes idle');
  for (const id of ['sword', 'spear', 'bow', 'axe', 'staff']) controller.equip(id);
  assert.equal(builds, 1, 'Switching equipment reuses the prepared models');
  controller.dispose(); controller.dispose();
  assert.ok(disposalCounts.size > 20, 'The check includes resources of detached equipment');
  for (const count of disposalCounts.values()) assert.equal(count, 1,
    'Every cached model resource is disposed exactly once, including unequipped models');
});
