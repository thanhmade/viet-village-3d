/* Chạy tại thư mục gói: node --test SOURCE-CODE/tests/weapons-vfx.test.cjs.
 * Dùng Three.js thật đã đóng gói; không cần npm, DOM hoặc WebGL.
 * Các kiểm tra này xác minh timeline/định vị/tài nguyên, không xác minh hình ảnh GPU.
 */
'use strict';
const assert = require('node:assert/strict');
const { test } = require('node:test');
const THREE = require('../../ASSETS/vendor/three.min.js');
const Core = require('../js/vfx/weapon-vfx-core.js');
for (const weapon of ['staff', 'sword', 'spear', 'bow', 'axe']) {
  require(`../js/vfx/${weapon}-skill-vfx.js`);
}
// Hiệu ứng riêng của Côn chạy trên cùng timeline/sự kiện/dispose của lõi.
require('../js/vfx/staff-skill-effects.js');

const expectedIds = {
  staff: ['con-quet', 'ho-than', 'chan-dia'],
  sword: ['nhat-kiem', 'kiem-hoa', 'kiem-khi'],
  spear: ['xuyen-kich', 'thuong-phong', 'pha-tran'],
  bow: ['xuyen-tien', 'lien-tien', 'mua-ten'],
  axe: ['khai-son', 'pha-giap', 'cuong-phong']
};
const configs = Core.getWeaponConfigs();
const skills = configs.flatMap(c => c.skills);
const skillById = id => skills.find(s => s.id === id);
const weaponOf = id => id.split('.')[0];

function fixture(options = {}) {
  const scene = new THREE.Scene();
  const caster = new THREE.Group();
  const events = [];
  scene.add(caster);
  const vfx = new Core({
    THREE, scene, quality: 'low', maxActive: 6,
    getGroundY: () => 0,
    random: Math.random,
    onEvent: event => events.push(event),
    ...options
  });
  return { scene, caster, events, vfx };
}
function near(actual, expected, message, epsilon = 1e-6) {
  assert.ok(Math.abs(actual - expected) < epsilon, `${message}: ${actual} ≈ ${expected}`);
}
function vectorNear(actual, expected, message) {
  near(actual.x, expected.x, `${message}.x`);
  near(actual.y, expected.y, `${message}.y`);
  near(actual.z, expected.z, `${message}.z`);
}
function finish(vfx, step = 1 / 60, seconds = 16) {
  for (let elapsed = 0; elapsed < seconds; elapsed += step) vfx.update(step);
}
function finiteScene(scene) {
  scene.traverse(object => {
    for (const value of [...object.position.toArray(), ...object.quaternion.toArray(), ...object.scale.toArray()]) {
      assert.ok(Number.isFinite(value), `Transform của ${object.name || object.type} phải hữu hạn`);
    }
    const position = object.geometry?.getAttribute('position');
    if (position) for (const value of position.array) assert.ok(Number.isFinite(value), 'Đỉnh mesh phải hữu hạn');
  });
}
function watchDisposals(effect) {
  const counters = new Map();
  for (const resource of [...effect.geometries, ...effect.materials]) {
    if (counters.has(resource)) continue;
    counters.set(resource, 0);
    resource.addEventListener('dispose', () => counters.set(resource, counters.get(resource) + 1));
  }
  assert.ok(counters.size > 0, 'Hiệu ứng cần có tài nguyên thật để kiểm tra dispose');
  return () => {
    for (const count of counters.values()) assert.equal(count, 1, 'Mỗi geometry/material chỉ dispose một lần');
  };
}

test('5 vũ khí đăng ký đúng 15 mã chiêu riêng và có mốc thời gian hợp lệ', () => {
  assert.equal(configs.length, 5);
  assert.equal(new Set(configs.map(c => c.weaponId)).size, 5);
  assert.equal(skills.length, 15);
  assert.equal(new Set(skills.map(s => s.id)).size, 15);
  for (const config of configs) {
    assert.ok(config.name && config.palette);
    assert.deepEqual(config.skills.map(s => s.localId), expectedIds[config.weaponId]);
    assert.deepEqual(config.skills.map(s => s.slot).sort(), [1, 2, 3]);
    for (const skill of config.skills) {
      assert.equal(skill.id, `${config.weaponId}.${skill.localId}`);
      assert.ok(skill.name && skill.type);
      assert.ok(Number.isFinite(skill.duration) && skill.duration > 0);
      assert.ok(Number.isFinite(skill.cooldown) && skill.cooldown > 0);
      assert.ok(skill.activeAt >= 0 && skill.activeAt <= skill.activeEnd);
      assert.ok(skill.activeEnd <= skill.duration);
      for (const key of ['radius', 'range', 'forwardOffset']) {
        assert.ok(Number.isFinite(skill[key]) && skill[key] >= 0, `${skill.id}.${key}`);
      }
    }
  }
});

test('mọi chiêu hoàn tất đúng sự kiện ở 30 FPS, 60 FPS, delta lệch và delta lớn', () => {
  for (const delta of [1 / 30, 1 / 60, 0.37, 10]) {
    for (const skill of skills) {
      const { scene, caster, events, vfx } = fixture();
      const result = vfx.cast(skill.id, { caster });
      assert.equal(result.ok, true, `Thi triển ${skill.id} với delta ${delta}`);
      assert.equal(result.skillId, skill.id);
      const fx = vfx.effects.find(effect => effect.handle === result.handle);
      assert.ok(fx);
      const assertDisposed = watchDisposals(fx);
      finish(vfx, delta, Math.max(16, skill.duration + 10));
      const byType = type => events.filter(event => event.type === type);
      assert.equal(byType('cast').length, 1, skill.id);
      assert.equal(byType('complete').length, 1, skill.id);
      assert.equal(byType('cancel').length, 0, skill.id);
      if (skill.id === 'staff.ho-than') {
        assert.equal(byType('shield-start').length, 1);
        assert.equal(byType('shield-end').length, 1);
        assert.ok(events.indexOf(byType('shield-start')[0]) < events.indexOf(byType('shield-end')[0]));
      } else if(['bow.xuyen-tien','bow.lien-tien','sword.nhat-kiem','sword.kiem-hoa'].includes(skill.id)){
        assert.equal(byType('release').length,skill.id==='bow.lien-tien'?3:1);assert.equal(byType('impact').length,0,'empty scene is a miss');
      } else {
        assert.ok(byType('impact').length >= 1, `${skill.id} không mất va chạm ở delta ${delta}`);
        assert.ok(events.indexOf(byType('cast')[0]) < events.indexOf(byType('impact')[0]));
        assert.ok(events.indexOf(byType('impact').at(-1)) < events.indexOf(byType('complete')[0]));
      }
      assert.equal(vfx.stats.active, 0);
      assert.equal(vfx.stats.particles, 0);
      assert.equal(vfx.effects.length, 0);
      assert.equal(fx.group.parent, null, 'Group hiệu ứng đã rời scene');
      assertDisposed();
      finiteScene(scene);
      vfx.dispose();
      assert.deepEqual(scene.children, [caster], 'Chỉ còn đối tượng game do người gọi sở hữu');
      assertDisposed();
    }
  }
});

test('liên tiễn và mưa tên giữ các va chạm riêng khi một frame đi qua nhiều mốc', () => {
  for (const id of ['bow.lien-tien', 'bow.mua-ten']) {
    for (const delta of [1 / 60, 10]) {
      const { caster, events, vfx } = fixture();
      if(id==='bow.lien-tien')vfx.onEvent=e=>{events.push(e);if(['target-query','hit-window'].includes(e.type))e.testTarget('wide-target',new THREE.Vector3(0,0,-4),2);};
      assert.equal(vfx.cast(id, { caster }).ok, true);
      finish(vfx, delta);
      const impacts = events.filter(event => event.type === 'impact');
      if (id === 'bow.lien-tien') assert.equal(impacts.length, 3);
      else assert.equal(impacts.length, 12, 'Mưa tên có đủ 12 va chạm');
      const indices = impacts.map(event => event.hitIndex);
      assert.ok(indices.every(Number.isInteger));
      assert.equal(new Set(indices).size, impacts.length, 'Không lặp hitIndex khi delta lớn');
      vfx.dispose();
    }
  }
});

test('hồi chiêu tách biệt theo mã chiêu và nhân vật', () => {
  const { scene, caster, vfx } = fixture();
  const other = new THREE.Group(); scene.add(other);
  assert.equal(vfx.cast('sword.nhat-kiem', { caster }).ok, true);
  assert.equal(vfx.cast('sword.nhat-kiem', { caster }).reason, 'cooldown');
  assert.ok(vfx.cooldownRemaining('sword.nhat-kiem', caster) > 0);
  assert.equal(vfx.cast('sword.kiem-hoa', { caster }).ok, true);
  assert.equal(vfx.cast('sword.nhat-kiem', { caster: other }).ok, true);
  finish(vfx, 0.37, skillById('sword.nhat-kiem').cooldown + 1);
  assert.equal(vfx.cooldownRemaining('sword.nhat-kiem', caster), 0);
  assert.equal(vfx.cast('sword.nhat-kiem', { caster }).ok, true);
  vfx.dispose();
});

test('giới hạn số hiệu ứng không làm tiêu hao hồi chiêu khi từ chối', () => {
  const { caster, vfx } = fixture({ maxActive: 2 });
  assert.equal(vfx.cast('staff.con-quet', { caster }).ok, true);
  assert.equal(vfx.cast('sword.nhat-kiem', { caster }).ok, true);
  assert.equal(vfx.cast('axe.khai-son', { caster }).reason, 'capacity');
  assert.equal(vfx.cooldownRemaining('axe.khai-son', caster), 0);
  vfx.cancelAll({ resetCooldowns: true });
  assert.equal(vfx.cast('axe.khai-son', { caster }).ok, true);
  vfx.dispose();
});

test('kiểm tra vũ khí đang cầm khi có hook; không ép khi game chưa cung cấp hook', () => {
  const { caster, vfx } = fixture({ getEquippedWeapon: object => object.userData.weaponId });
  caster.userData.weaponId = 'sword';
  assert.equal(vfx.cast('staff.con-quet', { caster }).reason, 'wrong-weapon');
  assert.equal(vfx.cooldownRemaining('staff.con-quet', caster), 0);
  assert.equal(vfx.cast('sword.nhat-kiem', { caster }).ok, true);
  caster.userData.weaponId = 'staff';
  assert.equal(vfx.cast('staff.con-quet', { caster }).ok, true);
  vfx.dispose();
  const permissive = fixture();
  assert.equal(permissive.vfx.cast('bow.xuyen-tien', { caster: permissive.caster }).ok, true);
  permissive.vfx.dispose();
});

test('khiên theo vị trí thế giới dưới group quay và sau khi nhân vật di chuyển', () => {
  const { scene, caster, vfx } = fixture({ getGroundY: () => 2 });
  const parent = new THREE.Group();
  parent.position.set(10, 0, 5); parent.rotation.y = Math.PI / 2;
  scene.add(parent); parent.add(caster); caster.position.set(3, 0, -4);
  assert.equal(vfx.cast('staff.ho-than', { caster }).ok, true);
  vfx.update(0.5);
  const fx = vfx.effects[0], world = caster.getWorldPosition(new THREE.Vector3());
  near(fx.group.position.x, world.x, 'Khiên thế giới X');
  near(fx.group.position.z, world.z, 'Khiên thế giới Z');
  near(fx.group.position.y, 2, 'Khiên nền Y');
  caster.position.x += 2; parent.position.z += 3; vfx.update(0.1);
  caster.getWorldPosition(world);
  near(fx.group.position.x, world.x, 'Khiên theo X');
  near(fx.group.position.z, world.z, 'Khiên theo Z');
  vfx.dispose();
});

test('Chấn Địa giữ điểm nện trên địa hình sau va chạm', () => {
  const { caster, events, vfx } = fixture({ getGroundY: () => 1.25 });
  const skill = skillById('staff.chan-dia');
  assert.equal(vfx.cast(skill.id, { caster }).ok, true);
  caster.position.x = 2;
  vfx.update(skill.activeAt + 0.02);
  const impact = events.find(event => event.type === 'impact');
  assert.ok(impact && impact.position);
  const fixed = impact.position.clone();
  near(fixed.y, 1.25, 'Điểm nện khớp mặt đất');
  caster.position.set(8, 0, 7); vfx.update(0.1);
  vectorNear(vfx.effects[0].group.position, fixed, 'Điểm nện giữ cố định');
  vfx.dispose();
});

test('chiêu định hướng nhận điểm hữu hạn trong tầm, không nhận điểm ngoài tầm', () => {
  for (const id of ['sword.kiem-khi', 'spear.xuyen-kich', 'bow.xuyen-tien', 'bow.lien-tien', 'bow.mua-ten', 'axe.khai-son', 'axe.pha-giap']) {
    const { caster, scene, events, vfx } = fixture();
    const skill = skillById(id);
    assert.ok(skill.range > 0, `${id} có tầm dùng chiêu`);
    const tooFar = new THREE.Vector3(0, 0, -skill.range * 2);
    assert.equal(vfx.cast(id, { caster, point: tooFar }).reason, 'out-of-range', id);
    assert.equal(vfx.cooldownRemaining(id, caster), 0);
    const target = new THREE.Vector3(0, 0, -skill.range * 0.65);
    assert.equal(vfx.cast(id, { caster, point: target }).ok, true, id);
    for (let elapsed = 0; elapsed < skill.duration + 3; elapsed += 1 / 30) {
      vfx.update(1 / 30); finiteScene(scene);
    }
    for (const event of events.filter(e => e.type === 'impact')) {
      assert.ok(event.position);
      for (const value of event.position.toArray()) assert.ok(Number.isFinite(value));
      assert.ok(Math.hypot(event.position.x, event.position.z) <= skill.range + skill.radius + 1e-6, `${id} tác động trong giới hạn tầm/vùng`);
    }
    vfx.dispose();
  }
});

test('mũi tên mưa chạm đúng mặt đất dốc theo vị trí thế giới dưới group quay', () => {
  const ground = point => 0.45 * point.x - 0.2 * point.z;
  const { scene, caster, events, vfx } = fixture({ getGroundY: ground });
  const parent = new THREE.Group();
  parent.position.set(5, 0, 3); parent.rotation.y = 0.7;
  scene.add(parent); parent.add(caster); caster.position.set(2, 0, -1);
  caster.position.y = ground(caster.getWorldPosition(new THREE.Vector3()));
  const target = caster.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(2, 0, -4));
  assert.equal(vfx.cast('bow.mua-ten', { caster, point: target }).ok, true);
  const fx = vfx.effects[0];
  caster.position.x += 8; // Vùng mưa đã chọn phải giữ nguyên khi người bắn rời đi.
  const finalImpactAt = Math.max(...fx.rain.map(arrow => arrow.impact));
  vfx.update(finalImpactAt + 1e-6);
  const impacts = events.filter(event => event.type === 'impact');
  assert.equal(impacts.length, 12);
  for (const event of impacts) {
    const instance = new THREE.Matrix4(); fx.bow.heads.getMatrixAt(event.hitIndex, instance);
    fx.bow.heads.updateWorldMatrix(true, false);
    const visualTip = new THREE.Vector3().applyMatrix4(instance).applyMatrix4(fx.bow.heads.matrixWorld);
    vectorNear(visualTip, event.position, `Mũi tên ${event.hitIndex} khớp sự kiện va chạm`);
    near(visualTip.y, ground(visualTip), `Mũi tên ${event.hitIndex} khớp mặt đất`);
  }
  vfx.dispose();
});

test('cancel khiên phát shield-end một lần và tài nguyên chỉ giải phóng một lần', () => {
  const { caster, events, vfx } = fixture();
  const { handle } = vfx.cast('staff.ho-than', { caster });
  vfx.update(0.5);
  const fx = vfx.effects[0], assertDisposed = watchDisposals(fx);
  assert.equal(vfx.cancel(handle), true);
  assert.equal(vfx.cancel(handle), false);
  assertDisposed();
  const ends = events.filter(e => e.type === 'shield-end');
  assert.equal(ends.length, 1);
  assert.equal(ends[0].cancelled, true);
  assert.equal(events.filter(e => e.type === 'cancel').length, 1);
  assert.equal(events.filter(e => e.type === 'complete').length, 0);
  finish(vfx);
  assert.equal(events.filter(e => e.type === 'shield-end').length, 1);
  vfx.dispose(); vfx.dispose(); assertDisposed();
});

test('pool hạt giữ giới hạn khi nhiều người dùng chiêu cùng lúc', () => {
  const { scene, vfx } = fixture({ maxActive: 30 });
  for (let i = 0; i < 30; i++) {
    const caster = new THREE.Group(); caster.position.x = i * 0.3;
    scene.add(caster);
    assert.equal(vfx.cast('staff.chan-dia', { caster }).ok, true);
  }
  let maximum = 0;
  for (let i = 0; i < 200; i++) {
    vfx.update(1 / 60);
    assert.ok(vfx.stats.particles >= 0 && vfx.stats.particles <= vfx.stats.capacity);
    assert.ok(vfx.pool.count >= 0 && vfx.pool.count <= vfx.pool.capacity);
    maximum = Math.max(maximum, vfx.stats.particles);
  }
  assert.ok(maximum > 0, 'Pool thực sự phát hạt');
  finish(vfx);
  assert.equal(vfx.stats.active, 0); assert.equal(vfx.stats.particles, 0);
  vfx.dispose();
});

test('đổi chất lượng huỷ hiệu ứng cũ và khởi chạy hiệu ứng mới sạch', () => {
  const { scene, caster, vfx } = fixture();
  const originalCapacity = vfx.stats.capacity;
  vfx.cast('staff.ho-than', { caster }); vfx.update(0.5);
  const assertDisposed = watchDisposals(vfx.effects[0]);
  vfx.setQuality('medium');
  assertDisposed();
  assert.equal(vfx.stats.active, 0); assert.equal(vfx.stats.particles, 0);
  assert.ok(vfx.stats.capacity > originalCapacity);
  assert.equal(vfx.cast('bow.xuyen-tien', { caster }).ok, true);
  finish(vfx);
  vfx.setQuality('low');
  assert.equal(vfx.stats.capacity, originalCapacity);
  vfx.dispose();
  assert.deepEqual(scene.children, [caster]);
});

test('dispose nhiều lần không xoá hoặc dispose tài nguyên của game', () => {
  const { scene, caster, vfx } = fixture();
  const geometry = new THREE.BoxGeometry(), material = new THREE.MeshBasicMaterial();
  const unrelated = new THREE.Mesh(geometry, material); scene.add(unrelated);
  let gameDisposals = 0;
  geometry.addEventListener('dispose', () => gameDisposals++);
  material.addEventListener('dispose', () => gameDisposals++);
  vfx.cast('axe.cuong-phong', { caster }); vfx.update(0.2);
  const assertDisposed = watchDisposals(vfx.effects[0]);
  vfx.dispose(); vfx.dispose(); assertDisposed();
  assert.equal(gameDisposals, 0);
  assert.deepEqual(scene.children, [caster, unrelated]);
  assert.equal(vfx.cast('staff.con-quet', { caster }).reason, 'disposed');
  geometry.dispose(); material.dispose();
});

test('delta 0 giữ timeline; đầu vào hỏng không tạo hiệu ứng hoặc giữ hồi chiêu', () => {
  const { caster, vfx } = fixture();
  assert.equal(vfx.cast('unknown.skill', { caster }).reason, 'unknown-skill');
  assert.equal(vfx.cast('staff.con-quet', {}).reason, 'missing-caster');
  assert.equal(vfx.cast('staff.con-quet', { caster: {} }).reason, 'missing-caster');
  for (const point of [{ x: NaN, y: 0, z: 0 }, { x: 0, y: Infinity, z: 0 }, { x: 0, y: 0 }]) {
    assert.equal(vfx.cast('bow.xuyen-tien', { caster, point }).reason, 'invalid-point');
  }
  assert.equal(vfx.cast('staff.con-quet', { caster, weaponTip: {} }).reason, 'invalid-weapon-tip');
  assert.equal(vfx.stats.active, 0);
  assert.equal(vfx.cooldownRemaining('staff.con-quet', caster), 0);
  assert.equal(vfx.cast('staff.con-quet', { caster }).ok, true);
  const age = vfx.effects[0].age;
  vfx.update(0); assert.equal(vfx.effects[0].age, age);
  for (const delta of [NaN, Infinity, -1]) assert.throws(() => vfx.update(delta), RangeError);
  vfx.dispose();
});

test('hạt vũ khí phát ở đầu côn thật theo world transform', () => {
  const { scene, caster, vfx } = fixture();
  const parent = new THREE.Group();
  parent.position.set(4, 0, -3); parent.rotation.y = 0.75;
  scene.add(parent); parent.add(caster);
  const tip = new THREE.Object3D(); tip.position.set(0.25, 2, -1); caster.add(tip);
  assert.equal(vfx.cast('staff.con-quet', { caster, weaponTip: tip }).ok, true);
  vfx.update(0.3);
  const world = tip.getWorldPosition(new THREE.Vector3());
  let found = false;
  for (let i = 0; i < vfx.pool.capacity; i++) {
    const j = i * 3;
    if (vfx.pool.life[i] > 0 && Math.abs(vfx.pool.origin[j] - world.x) < 1e-5 &&
      Math.abs(vfx.pool.origin[j + 1] - world.y) < 1e-5 && Math.abs(vfx.pool.origin[j + 2] - world.z) < 1e-5) found = true;
  }
  assert.ok(found, 'Có hạt phát từ weaponTip sau chuyển đổi thế giới');
  vfx.dispose();
});

test('idle VFX advances cooldowns without uploading particle buffers or submitting empty points', () => {
  for (const quality of ['low', 'medium', 'high']) {
    const { caster, vfx } = fixture({ quality });
    const attributes = Object.values(vfx.pool.geometry.attributes);
    const before = attributes.map(attribute => attribute.version);
    for (let i = 0; i < 600; i++) vfx.update(1 / 60);
    assert.deepEqual(attributes.map(attribute => attribute.version), before, quality + ': zero idle buffer updates');
    assert.equal(vfx.pool.mesh.visible, false);
    assert.equal(vfx.pool.geometry.drawRange.count, 0);
    assert.equal(vfx.hasActiveEffects, false);
    near(vfx.time, 10, quality + ': idle clock advances');
    vfx.cast('staff.con-quet', { caster }); vfx.cancelAll();
    vfx.update(10);
    assert.equal(vfx.cooldownRemaining('staff.con-quet', caster), 0, 'Hiding VFX must not freeze cooldown');
    assert.deepEqual(attributes.map(attribute => attribute.version), before);
    vfx.dispose();
  }
});

test('GPU particle draw range contains only live slots and colour/size uploads occur only on spawn', () => {
  const { vfx } = fixture();
  const pool = vfx.pool, pos = new THREE.Vector3(), velocity = new THREE.Vector3(1, 0, 0);
  pool.spawn(pos, velocity, 0xff0000, .05, .1);
  pool.spawn(pos, velocity, 0x00ff00, 1, .2);
  vfx.update(.01);
  const colourVersion = pool.geometry.attributes.aColor.version, sizeVersion = pool.geometry.attributes.aSize.version;
  vfx.update(.01);
  assert.equal(pool.geometry.attributes.aColor.version, colourVersion);
  assert.equal(pool.geometry.attributes.aSize.version, sizeVersion);
  vfx.update(.06);
  assert.equal(pool.count, 1); assert.equal(pool.geometry.drawRange.count, 1);
  const live = pool.geometry.index.array[0];
  assert.ok(pool.life[live] > 0); assert.equal(pool.size[live], Math.fround(.2));
  assert.equal(pool.mesh.visible, true);
  pool.spawn(pos, velocity, 0x0000ff, 1, .3);
  vfx.update(.01);
  assert.ok(pool.geometry.attributes.aColor.version > colourVersion);
  assert.ok(pool.geometry.attributes.aSize.version > sizeVersion);
  assert.equal(new Set(pool.geometry.index.array.slice(0, pool.count)).size, 2);
  vfx.update(2);
  assert.equal(pool.count, 0); assert.equal(pool.geometry.drawRange.count, 0); assert.equal(pool.mesh.visible, false);
  const versions = Object.values(pool.geometry.attributes).map(attribute => attribute.version);
  vfx.update(1);
  assert.deepEqual(Object.values(pool.geometry.attributes).map(attribute => attribute.version), versions);
  vfx.dispose();
});

test('saturated particle slots are reusable after expiry and clear without missing or duplicate live indices', () => {
  const { vfx } = fixture();
  const pool = vfx.pool, pos = new THREE.Vector3(), velocity = new THREE.Vector3();
  for (let i = 0; i < pool.capacity; i++) assert.equal(pool.spawn(pos, velocity, 0xffffff, i % 2 ? 1 : .01, .1), true);
  assert.equal(pool.spawn(pos, velocity, 0xffffff, 1, .1), false);
  vfx.update(.02);
  assert.equal(pool.count, pool.capacity / 2);
  for (let i = 0; i < pool.capacity / 2; i++) assert.equal(pool.spawn(pos, velocity, 0xffffff, 1, .1), true);
  assert.equal(pool.spawn(pos, velocity, 0xffffff, 1, .1), false);
  const slots = Array.from(pool.geometry.index.array.slice(0, pool.count));
  assert.equal(new Set(slots).size, pool.capacity);
  assert.ok(slots.every(slot => pool.life[slot] > 0));
  vfx.cancelAll();
  for (let i = 0; i < pool.capacity; i++) assert.equal(pool.spawn(pos, velocity, 0xffffff, 1, .1), true);
  assert.equal(new Set(pool.geometry.index.array.slice(0, pool.count)).size, pool.capacity);
  vfx.dispose();
});

test('fully transparent timed meshes stop rendering and return when their visual phase starts', () => {
  const { caster, vfx } = fixture();
  vfx.cast('staff.chan-dia', { caster });
  const effect = vfx.effects[0];
  vfx.update(.01);
  assert.equal(effect.column.material.uniforms.uOpacity.value, 0);
  assert.equal(effect.column.visible, false);
  vfx.update(effect.skill.activeAt);
  assert.ok(effect.column.material.uniforms.uOpacity.value > 0);
  assert.equal(effect.column.visible, true);
  finish(vfx); vfx.dispose();
});
