/* Local visual effects, advanced by the village's existing frame loop. */
'use strict';
// Skill cluster: slot 1 is the main (largest) button; slots 2-3 form the arc.
// Aimed skill types accept a world point (core range check); the others act
// around the player. Aiming never starts a cooldown: only a successful cast does.
// VFX hooks: getQuality() → 'low'|'medium'|'high' (applied when no effect is live),
// onVfxEvent(event) receives the core's cast/impact/shield events (camera shake),
// getCasterHeight() sizes body-centred effects such as the Hộ Thân shell.
window.createVillageWeapons = function ({THREE: T, scene, body, rightArm, leftArm = null, leftLeg = null, rightLeg = null, getState, getGroundY, startRoaming, clearMotion, onSkillUsed, onSkillHit = null, onSkillCancel = null, aim = null, notify = () => {},
  getQuality = () => 'low', onVfxEvent = null, getCasterHeight = () => 2.35, getProjectileBounds = () => []}) {
  const el = id => document.getElementById(id);
  const panel = el('weaponsPanel'), bar = el('weaponSkillBar');
  const configs = window.WeaponVFXCore.getWeaponConfigs();
  const guard = window.createStaffGuard();
  const configById = new Map(configs.map(config => [config.weaponId, config]));
  const skillLabels = new Map(configs.map(config => [config.weaponId,
    config.skills.map((skill, index) => `${index + 1} · ${skill.name}`)]));
  const nameLabel = el('equippedWeaponName');
  const skillButtons = [el('weaponSkill1'), el('weaponSkill2'), el('weaponSkill3')];
  // Same aimed set as the VFX core (Chấn Địa strikes where the staff lands, in front).
  const AIMED = new Set(window.WeaponVFXCore.aimedTypes);
  const GLYPHS = {sweep: '↻', combo: '⚔', thrust: '➶', projectile: '➹', volley: '⇶', rain: '☂', cleave: '⚒', 'armor-break': '✸', slam: '◎', shield: '⛨', lotus: '✿', vortex: '❂', cyclone: '✺'};
  const KEYS = ['J', '2', '3'];
  // Child labels are built once; render() only touches the parts that changed.
  const parts = skillButtons.map(button => {
    if (!button) return null;
    const make = name => { const node = document.createElement('span'); node.className = name; return node; };
    const part = {icon: make('skill-icon'), name: make('skill-name'), key: make('skill-key'), cd: make('skill-cd'), text: {}};
    button.replaceChildren?.(); button.append(part.icon, part.name, part.key, part.cd);
    return part;
  });
  const signatures = ['', '', ''];
  const cancelZone = el('skillAimCancel'), status = el('skillStatus');
  let aiming = null, indicator = null, suppressClickUntil = 0, lastMouse = null, statusTimer = null;
  const presses = new Map();
  const now = () => (window.performance || Date).now();
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
  // The pose publishes a temporary grip offset only for Côn Quét. Other staff skills keep their grip.
  function syncSweepGrip() {
    if (!grip || !selectedModel || weaponId !== 'staff') return;
    if(fallbackSlam&&grip.parent===sweepPivot)return;
    const active = manager?.effects.find(fx => fx.skill.id === 'staff.con-quet');
    const x = avatarSocket ? avatarSocket.userData.staffSweepGripX : active ? window.StaffSweep.sample(poseTime).gripX : undefined;
    const desired = Number.isFinite(x) ? x : selectedModel.gripPoint.x;
    selectedModel.group.userData.staffSweepGripX = desired;
    if (avatarSocket) {
      grip.position.copy(selectedModel.gripPoint); grip.position.x = desired;
      grip.position.multiplyScalar(-.7).applyQuaternion(grip.quaternion);
    } else {
      const offset = new T.Vector3(desired * -.7, 0, 0).applyQuaternion(grip.quaternion);
      grip.position.set(0, -.50, .28).add(offset);
    }
  }
  // Original procedural avatar: rotate only its visual parts; caster, collider and camera stay put.
  let sweepPivot=null,fallbackSlam=null;
  function startFallbackSpin(){
    if(avatarSocket||sweepPivot)return;
    const parts=body.children.filter(part=>part.userData.proceduralAvatarPart);
    if(!parts.length)return;
    sweepPivot=new T.Group();sweepPivot.name='village-staff-sweep-pose';body.add(sweepPivot);
    for(const part of parts)sweepPivot.add(part);
  }
  function stopFallbackSpin(){
    if(!sweepPivot)return;
    if(fallbackSlam){for(const [part,state] of fallbackSlam){part.position.copy(state.p);part.quaternion.copy(state.q);part.scale.copy(state.s);}fallbackSlam=null;attachGrip();}
    for(const part of [...sweepPivot.children])body.add(part);
    sweepPivot.removeFromParent();sweepPivot=null;
  }
  function startFallbackSlam(){
    startFallbackSpin();if(!sweepPivot)return;
    sweepPivot.name='village-staff-slam-pose';fallbackSlam=new Map();
    for(const part of [...sweepPivot.children,...[rightArm,leftArm].filter(Boolean).flatMap(arm=>arm.children.filter(o=>o.isMesh))])
      fallbackSlam.set(part,{p:part.position.clone(),q:part.quaternion.clone(),s:part.scale.clone()});
    sweepPivot.add(grip);
  }
  function poseFallbackSlam(time){
    if(!fallbackSlam)return;
    const state=window.StaffSlam.sample(time),weight=state.weight,up=new T.Vector3(0,1,0);
    sweepPivot.position.y=state.lift-state.crouch;
    for(const leg of [leftLeg,rightLeg])if(leg)leg.scale.y=(.77-state.crouch)/.77;
    const palm=new T.Vector3(.10,Math.min(1.98,state.handY)+state.crouch,state.handZ);
    const rotation=new T.Quaternion().setFromAxisAngle(up,Math.PI).multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0,0,1),-state.staffPitch));
    grip.position.copy(palm);grip.quaternion.copy(rotation);
    for(const [arm,x] of [[rightArm,0],[leftArm,.42]]){
      if(!arm)continue;
      const target=palm.clone().add(new T.Vector3(x*.7,0,0).applyQuaternion(rotation));
      const origin=arm.position.clone(),axis=target.clone().sub(origin),distance=Math.min(.6799,axis.length());axis.normalize();
      const pole=new T.Vector3(arm===rightArm?.6:-.6,-.1,.35);pole.addScaledVector(axis,-pole.dot(axis)).normalize();
      const elbow=origin.clone().addScaledVector(axis,distance/2).addScaledVector(pole,Math.sqrt(.34*.34-distance*distance/4));
      const end=origin.clone().addScaledVector(axis,distance),joints=[origin,elbow,end];arm.quaternion.identity();
      arm.children.filter(o=>o.isMesh).slice(0,2).forEach((mesh,i)=>{
        const a=joints[i],b=joints[i+1],base=fallbackSlam.get(mesh),direction=b.clone().sub(a);
        mesh.position.copy(base.p).lerp(a.clone().add(b).multiplyScalar(.5).sub(origin),weight);
        mesh.quaternion.copy(base.q).slerp(new T.Quaternion().setFromUnitVectors(up,direction.clone().normalize()),weight);
        mesh.scale.copy(base.s);mesh.scale.y*=1+(direction.length()/(i?.28:.40)-1)*weight;
      });
    }
  }
  function bowPoseSpec(id){return id==='bow.mua-ten'?window.BowRain:id==='bow.lien-tien'?window.BowVolley:id==='bow.xuyen-tien'?window.BowPiercing:null;}
  function bowPoseActive(fx){const spec=bowPoseSpec(fx.skill.id);return !!spec&&fx.age<spec.poseDuration;}
  function poseFallbackBow(time,skillId='bow.xuyen-tien'){
    if(!fallbackSlam)return;
    const state=bowPoseSpec(skillId).sample(time),weight=state.weight,up=new T.Vector3(0,1,0);
    const palm=new T.Vector3(.10,state.handY,state.handZ).applyAxisAngle(up,state.yaw||0);
    const rotation=new T.Quaternion().setFromAxisAngle(up,state.yaw||0).multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),state.pitch||0));
    grip.quaternion.copy(rotation).multiply(new T.Quaternion().setFromAxisAngle(up,Math.PI));
    grip.position.copy(palm).sub(selectedModel.gripPoint.clone().multiplyScalar(.7).applyQuaternion(grip.quaternion));
    for(const [arm,target] of [[rightArm,palm],[leftArm,palm.clone().add(new T.Vector3(0,.0245,-(.4+state.draw)*.7).applyQuaternion(rotation))]]){
      if(!arm)continue;
      const origin=arm.position.clone(),axis=target.clone().sub(origin),distance=Math.min(.6799,axis.length());axis.normalize();
      const pole=new T.Vector3(arm===rightArm?.6:-.6,-.1,-.35);pole.addScaledVector(axis,-pole.dot(axis)).normalize();
      const elbow=origin.clone().addScaledVector(axis,distance/2).addScaledVector(pole,Math.sqrt(.34*.34-distance*distance/4));
      const end=origin.clone().addScaledVector(axis,distance),joints=[origin,elbow,end];arm.quaternion.identity();
      arm.children.filter(o=>o.isMesh).slice(0,2).forEach((mesh,i)=>{
        const a=joints[i],b=joints[i+1],base=fallbackSlam.get(mesh),direction=b.clone().sub(a);
        mesh.position.copy(base.p).lerp(a.clone().add(b).multiplyScalar(.5).sub(origin),weight);
        mesh.quaternion.copy(base.q).slerp(new T.Quaternion().setFromUnitVectors(up,direction.clone().normalize()),weight);
        mesh.scale.copy(base.s);mesh.scale.y*=1+(direction.length()/(i?.28:.40)-1)*weight;
      });
    }
  }
  function swordPoseActive(fx){return fx.skill.id==='sword.nhat-kiem'&&fx.age<window.SwordStrike.poseDuration;}
  function poseFallbackSword(time){
    if(!fallbackSlam)return;
    const state=window.SwordStrike.sample(time),weight=state.weight,up=new T.Vector3(0,1,0);state.handX*=-1;state.angle*=-1;
    const palm=new T.Vector3(state.handX,state.handY,state.handZ),rotation=window.SwordStrike.rotation(T,state);
    grip.quaternion.copy(rotation).multiply(new T.Quaternion().setFromAxisAngle(up,Math.PI));
    grip.position.copy(palm).sub(selectedModel.gripPoint.clone().multiplyScalar(.7).applyQuaternion(grip.quaternion));
    for(const [arm,target] of [[rightArm,palm],[leftArm,new T.Vector3(-.33,1.56,.19)]]){
      if(!arm)continue;const origin=arm.position.clone(),axis=target.clone().sub(origin),distance=Math.min(.6799,axis.length());axis.normalize();
      const pole=new T.Vector3(arm===rightArm?.6:-.6,-.1,-.35);pole.addScaledVector(axis,-pole.dot(axis)).normalize();
      const elbow=origin.clone().addScaledVector(axis,distance/2).addScaledVector(pole,Math.sqrt(.34*.34-distance*distance/4)),end=origin.clone().addScaledVector(axis,distance),joints=[origin,elbow,end];arm.quaternion.identity();
      arm.children.filter(o=>o.isMesh).slice(0,2).forEach((mesh,i)=>{const a=joints[i],b=joints[i+1],base=fallbackSlam.get(mesh),direction=b.clone().sub(a);mesh.position.copy(base.p).lerp(a.clone().add(b).multiplyScalar(.5).sub(origin),weight);mesh.quaternion.copy(base.q).slerp(new T.Quaternion().setFromUnitVectors(up,direction.clone().normalize()),weight);mesh.scale.copy(base.s);mesh.scale.y*=1+(direction.length()/(i?.28:.40)-1)*weight;});
    }
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
    manager = new window.WeaponVFXCore({THREE: T, scene, quality: qualityName(), maxActive: 4,
      getGroundY, getEquippedWeapon: () => weaponId,
      onEvent: event => {
        if (event.type === 'hit-window' || event.type === 'target-query') onSkillHit?.(event);
        try { onVfxEvent?.(event); } catch (_) { /* Camera/UI reactions never break the effect. */ }
      }});
  }
  function qualityName() { const value = getQuality?.(); return ['low', 'medium', 'high'].includes(value) ? value : 'low'; }
  // Switching quality rebuilds the pool, so it only happens while nothing is on screen.
  function syncQuality() { const value = qualityName(); if (manager && manager.quality !== value && !manager.hasActiveEffects) manager.setQuality(value); }
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
    cancelAim();guard.cancel();onSkillCancel?.();
    if (manager?.hasActiveEffects) manager.cancelAll();
    if (poseTime || poseLength) grip?.rotation.set(0, Math.PI, 0);
    stopFallbackSpin();selectedModel?.setDraw?.(0,true);
    poseTime = poseLength = 0; syncSweepGrip();
  }
  function usable() { return !disposed && enabled && focused && !document.hidden && getState().canCast; }
  function setText(part, key, value) { if (part.text[key] !== value) { part.text[key] = value; part[key].textContent = value; } }
  function skillState(skill, allowed) {
    const remaining = manager?.cooldownRemaining(skill.id, caster) || 0;
    return {remaining, state: !allowed ? 'blocked' : remaining > 0 ? 'cooldown' : 'ready'};
  }
  function render(allowed) {
    bar?.setAttribute?.('data-equipped-weapon', weaponId);
    allowed=allowed&&!manager?.effects.some(fx=>['staff.con-quet','staff.chan-dia'].includes(fx.skill.id)||bowPoseActive(fx)||swordPoseActive(fx));
    if (nameLabel.textContent !== currentConfig.name) nameLabel.textContent = currentConfig.name;
    for (let index = 0; index < skillButtons.length; index++) {
      const button = skillButtons[index], skill = currentConfig.skills[index], part = parts[index];
      if (!button || !skill || !part) continue;
      const {remaining, state} = skillState(skill, allowed), aimed = AIMED.has(skill.type);
      const protection = skill.id === 'staff.ho-than' && guard.state?.active ? Math.ceil(guard.state.remaining) : null;
      const signature = [skill.id, state, remaining > 0 ? remaining.toFixed(1) : '', protection, aiming?.slot === skill.slot].join('|');
      if (signatures[index] === signature) continue;
      signatures[index] = signature;
      button.setAttribute?.('data-skill-id', skill.id);
      setText(part, 'icon', GLYPHS[skill.type] || '✦'); setText(part, 'name', skill.name);
      setText(part, 'key', index === 0 ? 'J · 1' : KEYS[index]); setText(part, 'cd', protection !== null ? '⛨ ' + protection : remaining > 0 ? remaining.toFixed(1) : '');
      button.style?.setProperty?.('--cd', remaining > 0 ? String(Math.min(1, remaining / skill.cooldown)) : '0');
      button.setAttribute?.('data-state', aiming?.slot === skill.slot ? 'aiming' : state);
      button.setAttribute?.('aria-label', skill.name + ' · phím ' + (index === 0 ? 'J hoặc 1' : KEYS[index])
        + (remaining > 0 ? ' · đang hồi ' + remaining.toFixed(1) + ' giây' : state === 'blocked' ? ' · chưa dùng được ở đây' : '')
        + (protection !== null ? ' · bảo vệ còn ' + protection : '')
        + (aimed ? ' · giữ và kéo để ngắm' : ' · chạm để dùng'));
      const disabled = !allowed || remaining > 0;
      if (button.disabled !== disabled) button.disabled = disabled;
    }
  }
  function say(text) {
    if (!status) return; status.textContent = text; status.hidden = !text;
    clearTimeout(statusTimer); if (text) statusTimer = setTimeout(() => { status.textContent = ''; status.hidden = true; }, 1600);
  }
  // ---- Aiming: one shared ground indicator, created once, reused ----
  function ensureIndicator() {
    if (indicator) return indicator;
    const group = new T.Group(); group.name = 'village-skill-aim'; group.userData.localOnly = true;
    const material = (color, opacity) => new T.MeshBasicMaterial({color, transparent: true, opacity, depthWrite: false, side: T.DoubleSide});
    const range = new T.Mesh(new T.RingGeometry(.975, 1, 72), material(0xfff2b0, .5)); range.rotation.x = -Math.PI / 2;
    const target = new T.Mesh(new T.RingGeometry(.78, 1, 48), material(0xffd23f, .9)); target.rotation.x = -Math.PI / 2;
    const pivot = new T.Group(), line = new T.Mesh(new T.PlaneGeometry(.14, 1), material(0xffd23f, .55));
    line.rotation.x = -Math.PI / 2; pivot.add(line);
    group.add(range, target, pivot); group.visible = false; scene.add(group);
    indicator = {group, range, target, pivot, line};
    return indicator;
  }
  function casterPosition() { const p = caster.getWorldPosition(new T.Vector3()); p.y = getGroundY(p); return p; }
  function clampPoint(skill, point) {
    const origin = casterPosition(), out = new T.Vector3(point.x, 0, point.z);
    const dx = out.x - origin.x, dz = out.z - origin.z, distance = Math.hypot(dx, dz), max = Math.max(.5, skill.range - .01);
    if (distance > max) { out.x = origin.x + dx / distance * max; out.z = origin.z + dz / distance * max; }
    else if (distance < .01) { const forward = new T.Vector3(0, 0, 1).applyQuaternion(body.getWorldQuaternion(new T.Quaternion())); out.x = origin.x + forward.x * max * .6; out.z = origin.z + forward.z * max * .6; }
    out.y = getGroundY(out); return out;
  }
  function drawAim() {
    if (!aiming) return;
    const view = ensureIndicator(), origin = casterPosition(), point = aiming.point, skill = aiming.skill;
    view.group.position.set(origin.x, origin.y + .06, origin.z); view.group.visible = true;
    view.range.scale.setScalar(skill.range);
    view.target.position.set(point.x - origin.x, point.y - origin.y + .01, point.z - origin.z);
    view.target.scale.setScalar(skill.type === 'rain' || skill.type === 'slam' ? Math.max(.6, skill.radius) : .5);
    const dx = point.x - origin.x, dz = point.z - origin.z, length = Math.max(.01, Math.hypot(dx, dz));
    view.pivot.rotation.y = Math.atan2(-dx, -dz); view.line.scale.y = length; view.line.position.z = -length / 2;
    const tint = aiming.cancel ? 0xff8a7a : 0xffd23f; view.target.material.color.setHex(tint); view.line.material.color.setHex(tint);
  }
  function beginAim(slot, source, pointerId = null) {
    const skill = currentConfig.skills.find(item => item.slot === slot);
    if (!skill || !AIMED.has(skill.type) || !usable()) return false;
    const remaining = manager?.cooldownRemaining(skill.id, caster) || 0;
    if (remaining > 0) { say(skill.name + ' đang hồi ' + remaining.toFixed(1) + ' giây'); return false; }
    const origin = casterPosition(), forward = new T.Vector3(0, 0, 1).applyQuaternion(body.getWorldQuaternion(new T.Quaternion()));
    const start = origin.clone().addScaledVector(forward, Math.min(skill.range, Math.max(2.5, skill.range * .6)));
    aiming = {slot, skill, source, pointerId, point: clampPoint(skill, start), cancel: false};
    document.body.classList.add('skill-aiming'); if (cancelZone) cancelZone.hidden = source !== 'touch';
    drawAim(); signatures.fill(''); render(usable()); return true;
  }
  function aimAt(point) { if (!aiming || !point) return false; aiming.point = clampPoint(aiming.skill, point); drawAim(); return true; }
  function cancelAim() {
    if (!aiming) return false;
    aiming = null; if (indicator) indicator.group.visible = false;
    document.body.classList.remove('skill-aiming'); if (cancelZone) { cancelZone.hidden = true; cancelZone.classList.remove('is-hot'); }
    signatures.fill(''); return true;
  }
  function confirmAim() {
    if (!aiming) return {ok: false, reason: 'not-aiming'};
    const {slot, point} = aiming; cancelAim();
    return cast(slot, {point});
  }
  function closePanel() { hide(panel, true); setExpanded(false); clearMotion(); }
  function openPanel() {
    if (!getState().authenticated || disposed) return;
    clearMotion(); cancel(); hide(panel, false); hide(bar, true); setExpanded(true);
    el('equip-' + weaponId)?.focus?.();
  }
  function equip(id) {
    if (!getState().authenticated || disposed || !configById.has(id)) return false;
    ensureResources(); cancel(); syncQuality(); weaponId = id; currentConfig = configById.get(id); caster.userData.weaponId = id;
    if (selectedModel) { selectedModel.group.visible = false; selectedModel.group.removeFromParent(); }
    selectedModel = models.models.get(id); grip.add(selectedModel.group); selectedModel.group.visible = true;
    attachGrip();
    closePanel();
    if (!startRoaming()) return false;
    enabled = true; update(0); render(usable()); return true;
  }
  // Putting the weapon away only stows the weapon: the player keeps walking and stays visible.
  function deactivate() {
    enabled = false; cancel(); showEquipped(false); closePanel();
    // Equipment does not own the actor, walking mode, camera or map.
    // Logout/scene exit remains the responsibility of the game controller.
    lastAllowed = false; render(false);
  }
  function cast(slot, {point = null} = {}) {
    const allowed = usable();
    if (manager?.effects.some(fx=>fx.skill.id==='staff.con-quet'||fx.skill.id==='staff.chan-dia'))return {ok:false,reason:'busy'};
    if (!allowed) return {ok: false, reason: 'village-unavailable'};
    const skill = currentConfig.skills.find(item => item.slot === slot);
    if (!skill) return {ok: false, reason: 'unknown-slot'};
    if(manager?.effects.some(fx=>bowPoseActive(fx)||swordPoseActive(fx)))return {ok:false,reason:manager.cooldownRemaining(skill.id,caster)>0?'cooldown':'busy'};
    if(['staff.con-quet','staff.chan-dia','bow.xuyen-tien','bow.lien-tien','bow.mua-ten','sword.nhat-kiem'].includes(skill.id)&&getState().poseBusy)return {ok:false,reason:'avatar-busy'};
    // Aimed casts turn the player toward the chosen point first, so the
    // effect, the training-dummy facing check and the avatar agree.
    let target = null;
    if (point && AIMED.has(skill.type)) {
      target = clampPoint(skill, point);
      const origin = body.getWorldPosition(new T.Vector3());
      if (Math.hypot(target.x - origin.x, target.z - origin.z) > .05) body.rotation.y = Math.atan2(target.x - origin.x, target.z - origin.z);
    }
    // Core reads world transforms from the caster/tip/staff ancestor chains itself.
    syncQuality();
    const height = Number(getCasterHeight?.());
    const strikeTip = skill.id === 'staff.con-quet' ? selectedModel.sweepTip || selectedModel.tip : selectedModel.tip;
    const result = manager.cast(skill.id, {caster, weaponTip: strikeTip, weapon: selectedModel.group, point: target,
      casterHeight: Number.isFinite(height) && height > 0 ? height : 2.35});
    if (result.ok) {
      if (skill.id === 'staff.ho-than') { const state = getState(); guard.start(skill, {maxHp: state.maxHp, ownerId: state.uid || null, handle: result.handle}); }
      poseTime = 0; poseLength = skill.id==='sword.nhat-kiem'?window.SwordStrike.poseDuration:['staff.con-quet','staff.chan-dia'].includes(skill.id)?skill.duration:bowPoseSpec(skill.id)?bowPoseSpec(skill.id).poseDuration:Math.min(skill.duration, .9);
      const button = skillButtons[slot - 1];
      button?.classList?.add?.('skill-fired'); setTimeout(() => button?.classList?.remove?.('skill-fired'), 260);
      try { onSkillUsed?.({weaponId, skillId: skill.id, slot}); } catch (_) { /* Progress UI cannot interrupt a successful cast. */ }
      if(skill.id==='sword.nhat-kiem'){
        clearMotion();const fx=manager.effects.find(effect=>effect.handle===result.handle);
        fx.strike.avatarPoseLinked=!!avatarSocket&&Number.isFinite(avatarSocket.userData.swordStrikeTime);
        fx.strike.trace=(a,b,r)=>window.BowPiercing.traceWorld(T,a,b,r,getProjectileBounds(),getGroundY);
        if(!avatarSocket){startFallbackSlam();if(sweepPivot)sweepPivot.name='village-sword-strike-pose';fx.strike.handedness=-1;poseFallbackSword(0);}
      }
      if(bowPoseSpec(skill.id)){
        clearMotion();const fx=manager.effects.find(effect=>effect.handle===result.handle);
        fx.bow.avatarPoseLinked=!!avatarSocket&&Number.isFinite(avatarSocket.userData.bowDrawTime);
        fx.bow.trace=skill.id==='bow.mua-ten'?(a,b)=>window.BowRain.traceWorld(T,a,b,getProjectileBounds(),getGroundY):(a,b,r)=>window.BowPiercing.traceWorld(T,a,b,r,getProjectileBounds(),getGroundY);
        if(!avatarSocket){startFallbackSlam();if(sweepPivot)sweepPivot.name='village-bow-draw-pose';fx.bow.handX=.10;poseFallbackBow(0,skill.id);}
        selectedModel.setDraw(0,true);
      }
      if(skill.id==='staff.chan-dia'){
        clearMotion();
        const fx=manager.effects.find(effect=>effect.handle===result.handle);
        if(fx?.slam){fx.slam.authoredLeap=true;fx.slam.avatarPoseLinked=!!avatarSocket&&Number.isFinite(avatarSocket.userData.staffSlamTime);}
        if(!avatarSocket){startFallbackSlam();if(fx?.slam)fx.slam.contactOffset={x:.10,z:window.StaffSlam.contact.z};poseFallbackSlam(0);}
      }
      if(skill.id==='staff.con-quet'){
        startFallbackSpin();
        if(!avatarSocket)grip.rotation.set(0,Math.PI+window.StaffSweep.sample(0).staffYaw,0);
        syncSweepGrip();
        const fx=manager.effects.find(effect=>effect.handle===result.handle);
        // Seed after the avatar IK and end grip are in place, at the activation instant.
        fx?.sweep?.ribbon?.update(0,{emitting:true,opacity:1,spinAngle:0,spinPivot:caster.getWorldPosition(new T.Vector3())});
      }
    } else if (result.reason === 'cooldown') say(skill.name + ' đang hồi ' + (result.retryAfter || 0).toFixed(1) + ' giây');
    else if (result.reason === 'capacity') say('Hiệu ứng trước chưa kết thúc. Thử lại sau giây lát.');
    else if (result.reason === 'out-of-range') say('Điểm ngắm ngoài tầm ' + skill.range + ' m.');
    signatures.fill(''); render(allowed); uiElapsed = 0; return result;
  }
  // Touch/mouse on a skill button: tap = use now (forward), hold + drag = aim
  // (aimed types only), release over "Hủy" = cancel. One pointer per press;
  // the click that follows a pointer press is ignored to avoid double casts.
  function pointInside(node, x, y) { const r = node?.getBoundingClientRect?.(); return !!r && !node.hidden && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom; }
  function onPressStart(event, slot) {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    event.stopPropagation(); if (!usable() || presses.size >= 3) return;
    const button = skillButtons[slot - 1]; try { button.setPointerCapture?.(event.pointerId); } catch (_) { /* detached */ }
    const r = button.getBoundingClientRect?.() || {left: event.clientX, top: event.clientY, width: 0, height: 0};
    presses.set(event.pointerId, {slot, x: event.clientX, y: event.clientY, cx: r.left + r.width / 2, cy: r.top + r.height / 2, aiming: false, type: event.pointerType});
  }
  function onPressMove(event) {
    const press = presses.get(event.pointerId); if (!press) return; event.stopPropagation();
    const skill = currentConfig.skills.find(item => item.slot === press.slot); if (!skill || !AIMED.has(skill.type)) return;
    if (!press.aiming && Math.hypot(event.clientX - press.x, event.clientY - press.y) < 14) return;
    if (!press.aiming) { if (!beginAim(press.slot, press.type === 'mouse' ? 'mouse-drag' : 'touch', event.pointerId)) { presses.delete(event.pointerId); return; } press.aiming = true; }
    const dx = event.clientX - press.cx, dy = event.clientY - press.cy, length = Math.hypot(dx, dy), reach = Math.min(1, length / 96);
    if (length > 1) aimAt(aim?.fromDrag?.(dx / length * reach, dy / length * reach, skill.range));
    const hot = pointInside(cancelZone, event.clientX, event.clientY);
    if (aiming && aiming.cancel !== hot) { aiming.cancel = hot; cancelZone?.classList?.[hot ? 'add' : 'remove']?.('is-hot'); drawAim(); }
  }
  function onPressEnd(event) {
    const press = presses.get(event.pointerId); if (!press) return;
    presses.delete(event.pointerId); event.stopPropagation(); suppressClickUntil = now() + 450;
    try { skillButtons[press.slot - 1]?.releasePointerCapture?.(event.pointerId); } catch (_) { /* already released */ }
    if (press.aiming) { if (!aiming || aiming.pointerId !== event.pointerId) return; if (aiming.cancel) { cancelAim(); say('Đã hủy ngắm.'); render(usable()); } else confirmAim(); return; }
    cast(press.slot);
  }
  function onPressCancel(event) {
    const press = presses.get(event.pointerId); if (!press) return;
    presses.delete(event.pointerId);
    if (press.aiming && aiming?.pointerId === event.pointerId) { cancelAim(); render(usable()); }
  }
  function update(dt) {
    if (disposed || !Number.isFinite(dt) || dt < 0) return;
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
      const slam=manager.effects.find(fx=>fx.skill.id==='staff.chan-dia');
      if(manager.effects.some(swordPoseActive)){poseFallbackSword(poseTime);
      }else if(manager.effects.some(bowPoseActive)){
        poseFallbackBow(poseTime,manager.effects.find(bowPoseActive).skill.id);
      }else if(slam){
        poseFallbackSlam(poseTime);
      }else if(weaponId==='staff'&&poseLength>1){
        const pose=window.StaffSweep.sample(poseTime);
        if(sweepPivot)sweepPivot.rotation.y=pose.bodyYaw;
        grip.rotation.set(0,Math.PI+pose.staffYaw-(sweepPivot?pose.bodyYaw:0),0);
      }else {
      grip.rotation.z = Math.sin(phase * Math.PI) * (weaponId === 'bow' ? .15 : -.75);
      grip.rotation.x = Math.sin(phase * Math.PI) * (weaponId === 'spear' ? .7 : -.35);
      }
      if (phase === 1) {poseLength = 0;stopFallbackSpin();grip.rotation.set(0,Math.PI,0);}
    }
    // A jump during anticipation cancels only this strike; an existing shield survives.
    if (getState().airborne) {
      const pending = manager.effects.filter(fx => (fx.skill.id === 'staff.chan-dia' || fx.skill.id === 'sword.nhat-kiem' || !!bowPoseSpec(fx.skill.id)) && fx.age < fx.skill.activeAt);
      if (pending.length) {
        pending.forEach(fx => manager.cancel(fx.handle));
        cancelAim(); onSkillCancel?.();
        if (poseTime || poseLength) grip?.rotation.set(0, Math.PI, 0);
        poseTime = poseLength = 0;
      }
    }
    for(const fx of manager.effects.slice())if(fx.skill.id==='staff.chan-dia'&&fx.slam.avatarPoseLinked&&
      !Number.isFinite(avatarSocket?.userData.staffSlamTime)){manager.cancel(fx.handle);onSkillCancel?.();}
    for(const fx of manager.effects.slice())if(bowPoseActive(fx)&&fx.bow.avatarPoseLinked&&
      (!Number.isFinite(avatarSocket?.userData.bowDrawTime)||(avatarSocket.userData.bowDrawSkillId&&avatarSocket.userData.bowDrawSkillId!==fx.skill.id))){manager.cancel(fx.handle);onSkillCancel?.();}
    for(const fx of manager.effects.slice())if(swordPoseActive(fx)&&fx.strike.avatarPoseLinked&&!Number.isFinite(avatarSocket?.userData.swordStrikeTime)){manager.cancel(fx.handle);onSkillCancel?.();}
    const arrowPose=manager.effects.find(bowPoseActive);
    if(weaponId==='bow'){
      const spec=arrowPose?bowPoseSpec(arrowPose.skill.id):window.BowPiercing,t=arrowPose?arrowPose.age+dt:spec.poseDuration,pose=spec.sample(t);
      selectedModel.setDraw(pose.draw,pose.arrowVisible??(t<window.BowPiercing.releaseAt||t>=spec.poseDuration));
    }
    guard.advance(dt);
    syncSweepGrip();
    manager.update(dt);
    if (!manager.effects.some(fx => fx.skill.id === 'staff.con-quet')) syncSweepGrip();
    if(!manager.effects.some(fx=>fx.skill.id==='staff.chan-dia')&&sweepPivot?.name==='village-staff-slam-pose'){stopFallbackSpin();poseTime=poseLength=0;attachGrip();}
    if(!manager.effects.some(bowPoseActive)&&sweepPivot?.name==='village-bow-draw-pose'){stopFallbackSpin();poseTime=poseLength=0;selectedModel.setDraw(0,true);}
    if(!manager.effects.some(swordPoseActive)&&sweepPivot?.name==='village-sword-strike-pose'){stopFallbackSpin();poseTime=poseLength=0;attachGrip();}
    uiElapsed += dt;
    // Match the tenths-of-a-second label precision, not the display refresh rate.
    if (changed || uiElapsed >= .1) { render(allowed); uiElapsed = 0; }
  }
  for (const id of ['weaponsBtn', 'homeWeaponsBtn']) listen(el(id), 'click', openPanel);
  listen(el('closeWeaponsPanel'), 'click', closePanel);
  listen(el('putAwayWeapon'), 'click', deactivate);
  listen(el('changeWeapon'), 'click', openPanel);
  for (const config of configs) listen(el('equip-' + config.weaponId), 'click', () => equip(config.weaponId));
  for (let slot = 1; slot <= 3; slot++) {
    const button = el('weaponSkill' + slot);
    listen(button, 'pointerdown', event => onPressStart(event, slot));
    // The press is captured by its button, and the skill bar stops propagation,
    // so moves/releases are handled here (window listeners stay as a fallback).
    listen(button, 'pointermove', onPressMove);
    listen(button, 'pointerup', onPressEnd);
    listen(button, 'pointercancel', onPressCancel);
    listen(button, 'lostpointercapture', onPressCancel);
    // Keyboard activation (Enter/Space) still arrives as a click without a pointer press.
    listen(button, 'click', event => { if (now() < suppressClickUntil) return; event?.stopPropagation?.(); cast(slot); });
    listen(button, 'contextmenu', event => event.preventDefault?.());
  }
  listen(window, 'pointermove', event => { if (event.pointerType === 'mouse') lastMouse = {x: event.clientX, y: event.clientY}; if (presses.has(event.pointerId)) { onPressMove(event); return; }
    if (aiming?.source === 'key' && event.pointerType === 'mouse') aimAt(aim?.fromScreen?.(event.clientX, event.clientY)); });
  listen(window, 'pointerup', onPressEnd);
  listen(window, 'pointercancel', onPressCancel);
  for (const node of [panel, bar]) {
    for (const event of ['pointerdown', 'pointerup', 'pointermove', 'wheel', 'click']) {
      listen(node, event, event => { event.stopPropagation(); if (node === panel && event.type === 'pointerdown') clearMotion(); });
    }
    listen(node, 'keydown', event => { event.stopPropagation(); if (event.key === 'Escape') closePanel(); });
  }
  listen(window, 'keydown', event => {
    if (event.key === 'Escape' && aiming) { event.preventDefault(); cancelAim(); render(usable()); return; }
    if (event.repeat || event.altKey || event.ctrlKey || event.metaKey || !usable()) return;
    if (['BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'A'].includes(event.target?.tagName) || event.target?.isContentEditable) return;
    const slot = /^Digit[123]$/.test(event.code) ? Number(event.code.slice(-1)) : event.code === 'KeyJ' ? 1 : 0;
    if (!slot) return;
    event.preventDefault();
    const skill = currentConfig.skills.find(item => item.slot === slot);
    // PC: an aimed skill key opens aiming at the mouse; the same key or a left
    // click confirms, Esc or a right click cancels. Other skills act at once.
    if (aiming?.slot === slot) { confirmAim(); return; }
    if (skill && AIMED.has(skill.type) && lastMouse && aim?.fromScreen) {
      cancelAim(); if (beginAim(slot, 'key')) aimAt(aim.fromScreen(lastMouse.x, lastMouse.y)); return;
    }
    cancelAim(); cast(slot);
  });
  listen(window, 'blur', () => { focused = false; cancel(); update(0); });
  listen(window, 'focus', () => { focused = true; });
  listen(document, 'visibilitychange', () => { if (document.hidden) { cancel(); clearMotion(); update(0); } });
  hide(panel, true); hide(bar, true); setExpanded(false); render(false);
  return Object.freeze({get movementLocked(){return !!manager?.effects.some(fx=>fx.skill.id==='staff.chan-dia'||bowPoseActive(fx)||swordPoseActive(fx));},equip, cast, update, openPanel, closePanel, deactivate, setAvatarSocket,
    beginAim, aimAt, confirmAim, cancelAim, isAiming: () => !!aiming,
    // Same configs and cooldown clock as the buttons: the character sheet reads this.
    skills() {
      return currentConfig.skills.map(skill => ({slot: skill.slot, id: skill.id, name: skill.name, type: skill.type, aimed: AIMED.has(skill.type),
        cooldown: skill.cooldown, range: skill.range, radius: skill.radius, description: skill.description,
        remaining: manager?.cooldownRemaining(skill.id, caster) || 0}));
    },
    suspend() { cancel(); showEquipped(false); lastAllowed = false; render(false); },
    lock() { deactivate(); },
    // Called by session health before HP changes; VFX failure cannot undo combat.
    absorbDamage({amount, source = null, uid = null}) {
      if (!usable() || weaponId !== 'staff') { guard.cancel(); return amount; }
      if (guard.state && guard.state.ownerId !== uid) { manager?.cancel(guard.state.handle); guard.cancel(); return amount; }
      const result = guard.absorb(amount, uid);
      if (result.absorbed > 0) {
        try {
          const point = source?.position;
          if (point) manager?.hitShield(caster, point);
          if (result.broken) manager?.endShield(result.handle, 'depleted');
        } catch (_) { /* Visual reactions do not own HP or guard. */ }
        try { signatures.fill(''); render(usable()); } catch (_) { /* UI is not combat. */ }
      }
      return result.damage;
    },
    // Explicit visual-only hook for previews; real combat uses absorbDamage above.
    onPlayerHit(point) { return !!manager && !disposed && enabled && manager.hitShield(caster, point); },
    get state() { return {enabled, weaponId, guard: guard.state, weaponName: currentConfig.name, aiming: aiming ? {slot: aiming.slot, source: aiming.source, cancel: aiming.cancel, point: {x: aiming.point.x, z: aiming.point.z}} : null, active: manager?.effects.length || 0, particles: manager?.pool.count || 0}; },
    dispose() {
      if (disposed) return; deactivate(); disposed = true; bindings.forEach(remove => remove()); manager?.dispose();
      if (indicator) { indicator.group.removeFromParent(); indicator.group.traverse(o => { o.geometry?.dispose(); o.material?.dispose(); }); indicator = null; }
      // The model helper owns every model, including detached cached equipment.
      if (models) { for (const model of models.models.values()) grip.add(model.group); models.dispose(); }
      caster.removeFromParent();
    }
  });
};
