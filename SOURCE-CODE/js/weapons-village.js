/* Local visual effects, advanced by the village's existing frame loop. */
'use strict';
window.createVillageWeapons = function ({THREE: T, scene, body, rightArm, getState, getGroundY, startRoaming, stopRoaming, clearMotion, onSkillUsed}) {
  const el = id => document.getElementById(id);
  const panel = el('weaponsPanel'), bar = el('weaponSkillBar');
  const configs = window.WeaponVFXCore.getWeaponConfigs();
  const configById = new Map(configs.map(config => [config.weaponId, config]));
  const skillLabels = new Map(configs.map(config => [config.weaponId,
    config.skills.map((skill, index) => `${index + 1} · ${skill.name}`)]));
  const nameLabel = el('equippedWeaponName');
  const skillButtons = [el('weaponSkill1'), el('weaponSkill2'), el('weaponSkill3')];
  const hiddenState = new WeakMap();
  let models = null, grip = null, manager = null, selectedModel = null, avatarSocket = null;
  function attachGrip() {
    if (!grip) return;
    (avatarSocket || rightArm).add(grip);
    grip.scale.setScalar(.7); grip.rotation.set(0, Math.PI, 0);
    if (avatarSocket) {
      // Each weapon has a different authored grip centre. Align that exact
      // point with the animated palm and retain the existing model orientation.
      grip.position.copy(selectedModel?.gripPoint || new T.Vector3()).multiplyScalar(-.7).applyQuaternion(grip.quaternion);
    } else grip.position.set(0, -.50, .28);
  }
  function setAvatarSocket(socket) { cancel(); avatarSocket = socket || null; attachGrip(); }
  // The village avatar faces +Z; the VFX contract faces -Z.
  const caster = new T.Object3D(); caster.name = 'village-weapon-caster';
  caster.rotation.y = Math.PI; caster.userData.localOnly = true; body.add(caster);
  let weaponId = 'staff', enabled = false, focused = true, disposed = false, poseTime = 0, poseLength = 0;
  let currentConfig = configById.get(weaponId), lastAllowed = false, uiElapsed = 0;
  let roamingClass = document.body.classList.contains('weapons-roaming');
  function ensureResources() {
    if (models) return;
    models = window.createVillageWeaponModels(T); grip = models.root;
    grip.name = 'village-local-weapon';
    grip.position.set(0, -.50, .28); grip.scale.setScalar(.7); grip.rotation.y = Math.PI;
    attachGrip(); grip.visible = false;
    // Keep unequipped models out of the scene's matrix traversal.
    for (const model of models.models.values()) model.group.removeFromParent();
    manager = new window.WeaponVFXCore({THREE: T, scene, quality: 'low', maxActive: 4,
      getGroundY, getEquippedWeapon: () => weaponId});
  }
  const bindings = [];
  function listen(target, name, handler) {
    target?.addEventListener(name, handler);
    bindings.push(() => target?.removeEventListener?.(name, handler));
  }
  function hide(element, value) {
    if (!element || hiddenState.get(element) === value) return;
    element.classList[value ? 'add' : 'remove']('hidden'); hiddenState.set(element, value);
  }
  function showRoaming(value) {
    if (roamingClass === value) return;
    document.body.classList[value ? 'add' : 'remove']('weapons-roaming'); roamingClass = value;
  }
  function showEquipped(value) { if (grip && grip.visible !== value) grip.visible = value; hide(bar, !value); showRoaming(value); }
  function setExpanded(value) { el('weaponsBtn')?.setAttribute?.('aria-expanded', String(value)); }
  function cancel() {
    if (manager?.hasActiveEffects) manager.cancelAll();
    if (poseTime || poseLength) grip?.rotation.set(0, Math.PI, 0);
    poseTime = poseLength = 0;
  }
  function usable() { return !disposed && enabled && focused && !document.hidden && getState().canCast; }
  function render(allowed) {
    if (nameLabel.textContent !== currentConfig.name) nameLabel.textContent = currentConfig.name;
    const labels = skillLabels.get(weaponId);
    for (let index = 0; index < skillButtons.length; index++) {
      const button = skillButtons[index], skill = currentConfig.skills[index];
      const remaining = manager?.cooldownRemaining(skill.id, caster) || 0;
      const label = labels[index] + (remaining > 0 ? ` (${remaining.toFixed(1)}s)` : '');
      const disabled = !allowed || remaining > 0;
      if (button.textContent !== label) button.textContent = label;
      if (button.disabled !== disabled) button.disabled = disabled;
    }
  }
  function closePanel() { hide(panel, true); setExpanded(false); clearMotion(); }
  function openPanel() {
    if (!getState().authenticated || disposed) return;
    clearMotion(); cancel(); hide(panel, false); hide(bar, true); setExpanded(true);
    el('equip-' + weaponId)?.focus?.();
  }
  function equip(id) {
    if (!getState().authenticated || disposed || !configById.has(id)) return false;
    ensureResources(); cancel(); weaponId = id; currentConfig = configById.get(id); caster.userData.weaponId = id;
    if (selectedModel) { selectedModel.group.visible = false; selectedModel.group.removeFromParent(); }
    selectedModel = models.models.get(id); grip.add(selectedModel.group); selectedModel.group.visible = true;
    attachGrip();
    closePanel();
    if (!startRoaming()) return false;
    enabled = true; update(0); render(usable()); return true;
  }
  function deactivate() {
    enabled = false; cancel(); showEquipped(false); closePanel();
    stopRoaming(); lastAllowed = false; render(false);
  }
  function cast(slot) {
    const allowed = usable();
    if (!allowed) return {ok: false, reason: 'village-unavailable'};
    const skill = currentConfig.skills.find(item => item.slot === slot);
    if (!skill) return {ok: false, reason: 'unknown-slot'};
    // Core reads world transforms from the caster/tip ancestor chains itself.
    const result = manager.cast(skill.id, {caster, weaponTip: selectedModel.tip});
    if (result.ok) {
      poseTime = 0; poseLength = Math.min(skill.duration, .9);
      try { onSkillUsed?.({weaponId, skillId: skill.id, slot}); } catch (_) { /* Progress UI cannot interrupt a successful cast. */ }
    }
    render(allowed); uiElapsed = 0; return result;
  }
  function update(dt) {
    if (disposed) return;
    const allowed = usable(), changed = allowed !== lastAllowed;
    lastAllowed = allowed; showEquipped(allowed);
    if (!allowed) {
      if (manager?.hasActiveEffects || poseLength) cancel();
      if (changed) render(false);
      return;
    }
    if (poseLength && !avatarSocket) {
      poseTime += dt;
      const phase = Math.min(1, poseTime / poseLength);
      grip.rotation.z = Math.sin(phase * Math.PI) * (weaponId === 'bow' ? .15 : -.75);
      grip.rotation.x = Math.sin(phase * Math.PI) * (weaponId === 'spear' ? .7 : -.35);
      if (phase === 1) poseLength = 0;
    }
    manager.update(dt);
    uiElapsed += dt;
    // Match the tenths-of-a-second label precision, not the display refresh rate.
    if (changed || uiElapsed >= .1) { render(allowed); uiElapsed = 0; }
  }
  for (const id of ['weaponsBtn', 'homeWeaponsBtn']) listen(el(id), 'click', openPanel);
  listen(el('closeWeaponsPanel'), 'click', closePanel);
  listen(el('putAwayWeapon'), 'click', deactivate);
  listen(el('changeWeapon'), 'click', openPanel);
  for (const config of configs) listen(el('equip-' + config.weaponId), 'click', () => equip(config.weaponId));
  for (let slot = 1; slot <= 3; slot++) listen(el('weaponSkill' + slot), 'click', () => cast(slot));
  for (const node of [panel, bar]) {
    for (const event of ['pointerdown', 'pointerup', 'pointermove', 'wheel', 'click']) {
      listen(node, event, event => { event.stopPropagation(); if (node === panel && event.type === 'pointerdown') clearMotion(); });
    }
    listen(node, 'keydown', event => { event.stopPropagation(); if (event.key === 'Escape') closePanel(); });
  }
  listen(window, 'keydown', event => {
    if (event.repeat || event.altKey || event.ctrlKey || event.metaKey || !usable()) return;
    if (['BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'A'].includes(event.target?.tagName) || event.target?.isContentEditable) return;
    if (/^Digit[123]$/.test(event.code)) { event.preventDefault(); cast(Number(event.code.slice(-1))); }
  });
  listen(window, 'blur', () => { focused = false; cancel(); update(0); });
  listen(window, 'focus', () => { focused = true; });
  listen(document, 'visibilitychange', () => { if (document.hidden) { cancel(); clearMotion(); update(0); } });
  hide(panel, true); hide(bar, true); setExpanded(false); render(false);
  return Object.freeze({equip, cast, update, openPanel, closePanel, deactivate, setAvatarSocket,
    suspend() { cancel(); showEquipped(false); lastAllowed = false; render(false); },
    lock() { deactivate(); },
    get state() { return {enabled, weaponId, active: manager?.effects.length || 0, particles: manager?.pool.count || 0}; },
    dispose() {
      if (disposed) return; deactivate(); disposed = true; bindings.forEach(remove => remove()); manager?.dispose();
      // The model helper owns every model, including detached cached equipment.
      if (models) { for (const model of models.models.values()) grip.add(model.group); models.dispose(); }
      caster.removeFromParent();
    }
  });
};
