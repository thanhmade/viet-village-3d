'use strict';
const assert = require('node:assert/strict');
const {test} = require('node:test');
const createHarness = require('./harness.cjs');
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-6, `${actual} ≈ ${expected}`);
// Advance at least 17 ms between rendered frames; the village caps rendering at 60 Hz.

test('putting away every weapon preserves the actor, walking, map, camera and cooldowns',()=>{
 const {run,context}=createHarness(),weapons=context.VietVillageWeapons;
 for(const id of ['staff','sword','spear','bow','axe']){
  weapons.equip(id);weapons.cast(1);
  const actor=run('player'),pose=actor.position.clone(),yaw=run('yaw'),region=context.VietVillageRegions.currentId;
  const remaining=weapons.skills()[0].remaining;
  weapons.deactivate();weapons.deactivate();
  assert.equal(run('localWalking&&player.visible'),true);
  assert(actor.position.equals(pose));assert.equal(run('yaw'),yaw);assert.equal(context.VietVillageRegions.currentId,region);
  assert.equal(actor.getObjectByName('village-local-weapon').visible,false);
  assert.equal(weapons.state.enabled,false);assert.equal(weapons.skills()[0].remaining,remaining);
  run('yaw=0;keys.KeyW=true;tick((last||0)+40);');assert(actor.position.distanceTo(pose)>0);
  run('clearMotion();');
 }
 run('multiplayerWalking=true;');weapons.equip('sword');weapons.deactivate();assert.equal(run('multiplayerWalking&&player.visible'),true);
 context.VietVillageGame.lock();assert.equal(run('localWalking||multiplayerWalking||player.visible'),false);
});

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
  controller.update(context.StaffSkillConfig.skills[0].duration-1+.01);
  assert.equal(controller.state.active, 0);
  controller.update(context.StaffSkillConfig.skills[0].cooldown);
  assert.equal(controller.cast(1).ok, true, 'Cooldown continues after effects finish and the pool becomes idle');
  for (const id of ['sword', 'spear', 'bow', 'axe', 'staff']) controller.equip(id);
  assert.equal(builds, 1, 'Switching equipment reuses the prepared models');
  controller.dispose(); controller.dispose();
  assert.ok(disposalCounts.size > 20, 'The check includes resources of detached equipment');
  for (const count of disposalCounts.values()) assert.equal(count, 1,
    'Every cached model resource is disposed exactly once, including unequipped models');
});

test('aiming: cancel never starts a cooldown; confirm faces the clamped point and casts once; suspend keeps cooldowns', () => {
  const {run, context} = createHarness();
  const weapons = context.VietVillageWeapons;
  assert.equal(weapons.equip('bow'), true);
  const skill = weapons.skills()[0];
  assert.equal(skill.aimed, true, 'Bow slot 1 is an aimed projectile');
  assert.equal(weapons.beginAim(1, 'touch'), true); assert.equal(weapons.isAiming(), true);
  assert.equal(weapons.cancelAim(), true); assert.equal(weapons.isAiming(), false);
  assert.equal(weapons.skills()[0].remaining, 0, 'Viewing/cancelling the aim does not spend the cooldown');
  run('player.position.set(0,bridgeHeight(0,18),18);body.rotation.y=0;');
  assert.equal(weapons.beginAim(1, 'key'), true);
  weapons.aimAt(new context.THREE.Vector3(100, 0, 18));
  const point = weapons.state.aiming.point;
  assert.ok(Math.hypot(point.x - 0, point.z - 18) <= skill.range + 1e-6, 'Aim point is clamped to the real skill range');
  assert.equal(weapons.confirmAim().ok, true);
  near(run('body.rotation.y'), Math.PI / 2);
  assert.ok(weapons.skills()[0].remaining > 0, 'Only a successful cast starts the cooldown');
  assert.equal(weapons.confirmAim().reason, 'not-aiming');
  assert.equal(weapons.cast(1).reason, 'cooldown');
  const before = weapons.skills()[0].remaining;
  weapons.beginAim(2, 'touch'); weapons.suspend();
  assert.equal(weapons.isAiming(), false, 'Menus/orientation suspension cancel aiming');
  assert.ok(weapons.skills()[0].remaining > 0 && weapons.skills()[0].remaining <= before, 'Suspension does not reset cooldowns');
  assert.equal(weapons.equip('sword'), true); assert.equal(weapons.equip('bow'), true);
  assert.ok(weapons.skills()[0].remaining > 0, 'Switching skill sets keeps the cooldown');
  const sheet = context.VietVillageGame.characterSheet();
  assert.equal(sheet.weapon.id, 'bow'); assert.equal(sheet.weapon.skills.length, 3);
  assert.equal(sheet.health.maxHp, context.VietVillageJourney.getState().maxHp, 'Sheet reads the live journey, not a copy');
  assert.deepEqual({...sheet.movement}, {walk: 4.5, run: 6.5});
});

test('skill buttons: one pointer tap casts once (no click duplicate); a drag released on Hủy cancels', () => {
  const {run, context} = createHarness();
  const listeners = new Map(), record = (owner, name, handler) => listeners.set(owner + ':' + name, handler);
  const elementPrototype = Object.getPrototypeOf(context.document.getElementById('weaponsPanel'));
  elementPrototype.addEventListener = function (name, handler) { record(this.id, name, handler); };
  const windowAdd = context.addEventListener;
  context.addEventListener = (name, handler) => record('window', name, handler);
  run(`villageWeapons=createVillageWeapons({THREE,scene,body,rightArm,clearMotion,startRoaming,stopRoaming,
    aim:{fromScreen:aimFromScreen,fromDrag:aimFromDrag},
    getGroundY:point=>bridgeHeight(point.x,point.z),
    getState:()=>({authenticated:VietVillageAuth.isAuthenticated(),canCast:localWalking&&world.visible&&!insideHouse&&!overlays()})});`);
  context.addEventListener = windowAdd;
  const weapons = run('villageWeapons');
  assert.equal(weapons.equip('sword'), true);
  const event = (pointerId, x, y, extra = {}) => ({pointerId, pointerType: 'touch', button: 0, clientX: x, clientY: y, stopPropagation() {}, preventDefault() {}, ...extra});
  listeners.get('weaponSkill1:pointerdown')(event(7, 50, 50));
  listeners.get('weaponSkill1:pointerup')(event(7, 51, 50));
  listeners.get('weaponSkill1:lostpointercapture')(event(7, 51, 50));
  listeners.get('weaponSkill1:click')({stopPropagation() {}});
  assert.equal(weapons.state.active, 1, 'Tap + synthetic click = one cast');
  assert.ok(weapons.skills()[0].remaining > 0);
  // Sword slot 3 (projectile) aims by dragging; release over the cancel zone.
  context.document.getElementById('skillAimCancel').getBoundingClientRect = () => ({left: 0, top: 0, right: 100, bottom: 100, width: 100, height: 100});
  listeners.get('weaponSkill3:pointerdown')(event(9, 300, 300));
  listeners.get('weaponSkill3:pointermove')(event(9, 250, 250));
  assert.equal(weapons.isAiming(), true);
  listeners.get('weaponSkill3:pointermove')(event(9, 40, 40));
  assert.equal(weapons.state.aiming.cancel, true);
  listeners.get('weaponSkill3:pointerup')(event(9, 40, 40));
  assert.equal(weapons.isAiming(), false);
  assert.equal(weapons.skills()[2].remaining, 0, 'Cancelled aim casts nothing and starts no cooldown');
  // Lost capture (app switch, cancelled touch) during aiming also cancels without casting.
  listeners.get('weaponSkill3:pointerdown')(event(11, 300, 300));
  listeners.get('weaponSkill3:pointermove')(event(11, 240, 260));
  listeners.get('weaponSkill3:lostpointercapture')(event(11, 240, 260));
  assert.equal(weapons.isAiming(), false); assert.equal(weapons.skills()[2].remaining, 0);
  // The skill bar stops propagation: the real path is the captured button itself.
  let stopped = 0; listeners.get('weaponSkillBar:pointermove')({type: 'pointermove', stopPropagation() { stopped++; }});
  assert.equal(stopped, 1, 'Moves inside the cluster never reach the camera/world');
  weapons.dispose();
});

test('putting the weapon away stows only the weapon: the character stays visible and keeps walking', () => {
  const {run, context} = createHarness();
  const controller = context.VietVillageWeapons, player = context.VietVillageGame.avatarTemplate();
  assert.equal(controller.equip('staff'), true);
  assert.equal(controller.cast(2).ok, true);
  controller.deactivate(); // the "Cất vũ khí" button handler
  assert.equal(run('localWalking && player.visible'), true, 'the player root is never hidden by putting the weapon away');
  assert.equal(player.getObjectByName('village-local-weapon').visible, false);
  assert.equal(controller.state.active, 0, 'live skill visuals are cancelled with the weapon');
  assert.equal(context.document.body.classList.contains('weapons-roaming'), false);
  const before = player.position.clone();
  run('keys.KeyW=true;tick(17);keys.KeyW=false;');
  assert.ok(player.position.distanceTo(before) > 0, 'walking continues without a weapon');
  assert.equal(controller.equip('staff'), true);
  assert.equal(player.getObjectByName('village-local-weapon').visible, true);
});

test('staff skills: trail sits on the equipped staff, Chấn Địa is a tap skill, shield ripples on a real HP hit', () => {
  const {run, context} = createHarness();
  const controller = context.VietVillageWeapons, scene = context.VietVillageGame.scene(), T = context.THREE;
  assert.equal(controller.equip('staff'), true);
  assert.equal(controller.skills().filter(skill => skill.aimed).length, 0, 'no staff skill needs aiming');
  assert.equal(controller.beginAim(3, 'touch'), false);
  assert.equal(controller.cast(1).ok, true);
  const skill = context.WeaponVFXCore.getWeaponConfigs().find(config => config.weaponId === 'staff').skills[0];
  controller.update(skill.activeAt + .05); controller.update(1 / 60);
  const world = scene.getObjectByName('staff.con-quet-vfx').getObjectByName('staff-ribbon-world');
  const trail = world.children.find(child => child.isMesh && child.geometry.getAttribute('aAge'));
  assert.ok(trail && trail.visible);
  const staff = scene.getObjectByName('weapon-staff'), outer = staff.localToWorld(new T.Vector3(context.StaffVFXConfig.sweep.outer[0], 0, 0));
  const newest = trail.localToWorld(new T.Vector3().fromArray(trail.geometry.getAttribute('position').array, 3));
  assert.ok(newest.distanceTo(outer) < 1e-4, 'ribbon vertex = point on the visible staff model');
  controller.update(skill.duration + 2);
  // Hộ Thân + a real damage call with a world hit position → guard absorbs damage and ripples only at known impact points.
  const journey = context.VietVillageJourney, hpBefore = journey.getState().hp;
  assert.equal(controller.cast(2).ok, true);
  controller.update(.5);
  const shell = scene.getObjectByName('shield-shell'), hits = shell.children[1].material.uniforms.uHits.value;
  assert.ok(hits.every(hit => hit.w < 0), 'no ripple without a hit');
  assert.equal(journey.takeDamage(7), true);
  assert.ok(hits.every(hit => hit.w < 0), 'a blow without a position does not invent a ripple point');
  const origin = shell.getWorldPosition(new T.Vector3());
  assert.equal(journey.takeDamage(5, {source: {position: {x: origin.x + 3, y: origin.y, z: origin.z}}}), true);
  assert.ok(hits[0].w >= 0 && hits[0].x > .99, 'ripple starts on the side the blow came from');
  assert.equal(journey.getState().hp, hpBefore, 'guard absorbs both hits before HP');
  assert.equal(controller.state.guard.remaining, 18);
  controller.update(5);
  // Chấn Địa shakes the camera lightly, only if the player keeps the option on.
  run("$('cameraShake').checked=true;");
  assert.equal(controller.cast(3).ok, true); controller.update(2);
  assert.ok(run('cameraShakeAmount') > 0, 'impact requests a light shake');
  run('cameraShakeAmount=0;'); controller.update(5);
  run("$('cameraShake').checked=false;");
  assert.equal(controller.cast(3).ok, true); controller.update(2);
  assert.equal(run('cameraShakeAmount'), 0, 'option off: no shake');
});



test('Hộ Thân combat: startup, absorption, overflow, cooldown and weapon cancellation', () => {
 const {context:c,run} = createHarness(), w=c.VietVillageWeapons,j=c.VietVillageJourney;
 w.equip('staff');assert.equal(w.cast(2).ok,true);assert.equal(w.cast(2).reason,'cooldown');
 j.takeDamage(5);assert.equal(j.getState().hp,95,'startup is unprotected');
 w.update(.25);j.takeDamage(12);assert.equal(j.getState().hp,95);assert.equal(w.state.guard.remaining,18);
 const label=c.document.getElementById('weaponSkill2').getAttribute('aria-label');assert.match(label,/bảo vệ còn 18/);
 j.takeDamage(25);assert.equal(j.getState().hp,88,'only seven overflow damage');assert.equal(w.state.guard,null);
 j.takeDamage(4);assert.equal(j.getState().hp,84,'broken shield cannot absorb again');
 w.update(5);w.cast(2);w.update(.4);w.equip('sword');j.takeDamage(6);assert.equal(j.getState().hp,78);
 w.equip('staff');assert.equal(w.cast(2).reason,'cooldown','equipment cannot reset cooldown');
 w.update(5);w.cast(2);w.update(2.65);j.takeDamage(8);assert.equal(j.getState().hp,70,'no absorption at exact expiry');
 w.update(5);w.cast(2);w.update(.5);w.suspend();j.takeDamage(9);assert.equal(j.getState().hp,61,'map/menu suspension clears guard');
 w.update(5);w.cast(2);w.update(.5);j.setCharacterState({hp:0});w.update(.01);assert.equal(w.state.guard,null);
 assert.equal(w.cast(2).ok,false,'dead characters cannot recast');
 c.VietVillageGame.lock();assert.equal(w.state.guard,null);
});

test('Hộ Thân: identity change never transfers remaining protection',()=>{
 const {context:c}=createHarness(),w=c.VietVillageWeapons,j=c.VietVillageJourney;
 w.equip('staff');w.cast(2);w.update(.4);
 c.VietVillageAuth.getProfile=()=>({uid:'second-student'});
 j.takeDamage(10);assert.equal(j.getState().hp,90);assert.equal(w.state.guard,null);
});
