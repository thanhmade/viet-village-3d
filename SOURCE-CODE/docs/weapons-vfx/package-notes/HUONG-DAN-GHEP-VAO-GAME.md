# Nối bộ hiệu ứng v2 vào VIET VILLAGE 3D

## Nơi đặt và thứ tự nạp

Thử trước trong thư mục riêng. Sau khi xem demo, đặt `SOURCE-CODE/js/vfx` vào cùng đường dẫn tương ứng của bản game thử. Đặt ảnh gốc tại `ASSETS/reference` nếu cần trang đối chiếu. Demo HTML/CSS/JS chỉ phục vụ sân thử, không phải mã khởi tạo game chính.

Nếu trang game nằm trong `SOURCE-CODE`, dùng các thẻ sau **sau Three.js** và **trước mã khởi tạo VFX**:

```html
<script src="js/vfx/weapon-vfx-core.js"></script>
<script src="js/vfx/staff-skill-config.js"></script>
<script src="js/vfx/staff-skill-vfx.js"></script>
<script src="js/vfx/sword-skill-config.js"></script>
<script src="js/vfx/sword-skill-vfx.js"></script>
<script src="js/vfx/spear-skill-config.js"></script>
<script src="js/vfx/spear-skill-vfx.js"></script>
<script src="js/vfx/bow-skill-config.js"></script>
<script src="js/vfx/bow-skill-vfx.js"></script>
<script src="js/vfx/axe-skill-config.js"></script>
<script src="js/vfx/axe-skill-vfx.js"></script>
```

Bản thử kiểm tra trên Three.js **r160 / WebGLRenderer**. Dùng namespace Three.js hiện có của game; không nạp thêm vendor của demo khi game đã có Three.js. Nếu game dùng revision khác, WebGPURenderer hoặc ES modules, cần nối namespace và kiểm tra tương thích riêng. Bộ này dùng UMD; CommonJS dùng `require`, trang script thường có `window.WeaponVFXCore`.

v2 thay thế cặp staff của v1 và thêm file lõi dùng chung. Không nạp hai phiên bản `StaffSkillVFX` cùng trang. `WeaponVFXCore` nhận mã đầy đủ; class riêng `StaffSkillVFX`, `SwordSkillVFX`, `SpearSkillVFX`, `BowSkillVFX`, `AxeSkillVFX` có thể nhận mã ngắn thuộc đúng vũ khí. Khi dùng nhiều vũ khí, chọn một manager chung để dùng chung pool hạt và thống nhất cooldown.

## Khởi tạo bằng scene và nhân vật thật

Đoạn dưới là mẫu kết nối; `scene`, `player`, `weaponTip`, `sampleTerrainHeight`, `combat` là các đối tượng/hàm của game chủ, không được tạo sẵn bởi gói:

```js
player.userData.weaponId = 'staff';

const weaponVFX = new WeaponVFXCore({
  THREE,
  scene,
  quality: 'medium',
  maxActive: 8,
  getEquippedWeapon: caster => caster.userData.weaponId,
  getGroundY: worldPoint => sampleTerrainHeight(worldPoint.x, worldPoint.z),
  onEvent(event) {
    // Chuyển sự kiện sang combat của game, nơi kiểm tra địch/hitbox/damage.
    combat.onSkillVFXEvent(event);
  }
});

function castEquippedSkill(slot) {
  const profile = WeaponVFXCore.getWeaponConfigs()
    .find(item => item.weaponId === player.userData.weaponId);
  const skill = profile?.skills.find(item => item.slot === slot);
  if (!skill) return;
  return weaponVFX.cast(skill.id, { caster: player, weaponTip });
}

// Thêm vào vòng lặp đang có, với delta tính bằng GIÂY:
weaponVFX.update(deltaSeconds);
// Game tiếp tục gọi renderer.render(scene, camera) tại vị trí hiện có.
```

Game nền phẳng có thể dùng `getGroundY: () => 0`. Khi có địa hình, trả về độ cao thế giới tại điểm được yêu cầu. Game phải cập nhật animation/transform nhân vật trước `weaponVFX.update()` để VFX đọc đúng vị trí hiện tại. `caster` là `THREE.Object3D`; hướng trước là local **-Z**, trục cao là **Y**. Nếu model hướng +Z, dùng một group điều hướng có -Z đúng hướng nhìn làm caster. Quy ước demo: 1 đơn vị = 1 mét. Scale game khác cần chỉnh tham số/phần hình học.

`weaponTip` là một `Object3D` gắn vào vị trí phát khí thật trên mesh hoặc bone của vũ khí. Không dùng tên bone đoán; lấy đối tượng đúng từ model đang có. Khi không truyền, hệ thống dùng điểm xuất mặc định cao 1.35 m và offset cấu hình cho chiêu phóng. Với Cung, có thể dùng điểm nock/muzzle theo model thật. Điểm này không làm manager sở hữu model hay bone.

## Mục tiêu và giới hạn tầm

```js
const target = new THREE.Vector3(targetX, targetY, targetZ);
const result = weaponVFX.cast('bow.mua-ten', {
  caster: player,
  weaponTip,
  point: target
});

if (!result.ok && result.reason === 'cooldown') {
  showCooldown(result.retryAfter);
}
```

`point` là tọa độ thế giới hữu hạn. Áp dụng cho phóng kiếm/tên, Liên Tiễn, Xuyên Kích, Mưa Tên, Khai Sơn, Phá Giáp và Chấn Địa. Khoảng cách XZ từ caster tới tâm mục tiêu phải <= `range`; quá tầm bị từ chối với `out-of-range`, không tự trừ hồi chiêu. Độ cao tác động lấy từ `getGroundY`, phù hợp nền Y-up. Đây là VFX định hướng trên mặt phẳng di chuyển, chưa có bắn đạn ballistic/va chạm theo tầng cao hay homing.

Không truyền point: chiêu phóng/đâm dùng hướng trước và tầm cấu hình; Mưa Tên đặt tâm cách 7 m, Khai Sơn/Phá Giáp cách 1.5 m, Chấn Địa cách 0.65 m. Demo Cung truyền mục tiêu riêng: phóng tối đa 9 m, Mưa Tên có tâm cách 5 m, bán kính 3.8 m. Vùng bán kính có thể vượt tâm mục tiêu; `range` giới hạn **tâm**, không giới hạn mép AoE.

Khiên và các chiêu xoay quanh người theo caster. Chấn Địa theo vị trí nện cho đến mốc va chạm rồi khóa tại đó; chuyển động sau đó không kéo vết nứt đi theo. Đạn, vùng Mưa Tên và điểm bổ/phá giáp được chốt khi cast. Hạt đã phát giữ vị trí thế giới.

## Sự kiện và gameplay

| `event.type` | Ý nghĩa |
|---|---|
| `cast` | Đã nhận chiêu và bắt đầu hồi chiêu |
| `impact` | Đến mốc tác động hình ảnh; có `position`, `radius`, `hitIndex`, `activeSeconds` |
| `shield-start` | Hộ Thân vào pha hoạt động |
| `shield-end` | Hộ Thân hết pha hoặc bị hủy; trường `cancelled` là true nếu hủy khi khiên đang hoạt động |
| `complete` | VFX hoàn tất và tài nguyên được giải phóng |
| `cancel` | VFX bị hủy trước khi hoàn tất |

Mỗi sự kiện có `skillId`, `weaponId`, `caster`, `handle` và thời gian manager. `position` là bản sao Vector3. Đơn vị thời gian là giây của manager; khi game tạm dừng, ngừng gọi update thì timeline và cooldown cùng dừng.

Trong bản thử, Liên Tiễn có **3** mốc va chạm riêng (`hitIndex` 0–2), Mưa Tên có **12** điểm rơi (0–11). Những chiêu đánh khác có một mốc `impact` mở pha hình ảnh, dù có nhiều dải chém/vòng xoắn. Điều này không quy định số hit sát thương: combat có thể dùng cửa sổ hoạt động để kiểm tra nhiều địch hoặc tác động theo thời gian. Manager không giảm HP/giáp, không bật miễn thương và không tự tìm mục tiêu. Tên Phá Giáp hoặc Hộ Thân không tự tạo cơ chế gameplay.

Hook chạy đồng bộ; nên chuyển sự kiện sang hàng đợi combat và xử lý ngắn. Handler cần tự kiểm tra lỗi và tránh gọi cast liên tục đệ quy từ chính sự kiện cast.

## Đổi trang bị, chất lượng và dọn tài nguyên

```js
function equipWeapon(nextId) {
  weaponVFX.cancelAll(); // giữ cooldown của các chiêu đã dùng
  player.userData.weaponId = nextId;
  // Game đổi mesh và gán lại weaponTip tương ứng.
}

weaponVFX.cancel(handle);                  // hủy một hiệu ứng
weaponVFX.cooldownRemaining(id, player);   // số giây còn lại
weaponVFX.setQuality('low');               // hủy chiêu, đổi pool, giữ cooldown
weaponVFX.cancelAll({ resetCooldowns: true }); // dành cho reset/test
weaponVFX.dispose();                      // khi tháo scene/bộ manager
```

Pool giới hạn: low 450, medium 1100, high 2200 hạt. `maxActive` mặc định 8, nhận 1–32. Manager chỉ giải phóng geometry/material/instance của VFX và pool do nó tạo; không dispose model người chơi/vũ khí/scene của game. Không tạo renderer, camera, RAF hoặc listener input riêng. Hạt có thể còn tồn tại ngắn sau `complete`, rồi tự hết tuổi; `cancelAll` xóa luôn hạt đang sống.

`cast` thành công trả `{ok:true,handle,skillId}`. Những lý do từ chối có thể là `disposed`, `unknown-skill`, `missing-caster`, `invalid-weapon-tip`, `invalid-point`, `wrong-weapon`, `out-of-range`, `cooldown`, `capacity`. Nếu không cung cấp `getEquippedWeapon`, manager không ép trang bị — game tự chịu trách nhiệm chọn skill hợp lệ. Từ chối không tiêu hao cooldown.

## Phần còn cần nối trong dự án thật

Nguồn cung cấp hiện có `index.html` chuyển hướng, README và các file khởi động; chưa có script dựng scene/player/combat của game. Vì vậy gói không sửa file chuyển hướng đó và chưa xác nhận game chính đã chạy 15 chiêu. Khi nối vào dự án, các điểm cần có là caster thật, vũ khí đang cầm, weaponTip/bone thật, thời gian vòng lặp, sampling địa hình và combat. Chi tiết model/texture/animation/audio cần được sản xuất từ các ảnh tham chiếu.

Các lớp hình ảnh đã được dựng procedural để thử; bloom, soft particles, depth sampling, motion blur, decals bám địa hình và shader postprocessing chưa thêm vào pipeline game. Kiểm tra trên renderer/device thật trước khi coi đây là asset final.

Tài liệu Three.js để tham khảo: [BufferGeometry](https://threejs.org/docs/pages/BufferGeometry.html), [ShaderMaterial](https://threejs.org/docs/pages/ShaderMaterial.html), [InstancedMesh](https://threejs.org/docs/pages/InstancedMesh.html). Bản demo khóa r160; những trang docs mới có thể mô tả API ở revision mới hơn.
