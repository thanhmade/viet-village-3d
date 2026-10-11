# HƯỚNG DẪN THỬ NGHIỆM VÀ TÍCH HỢP VFX VÀO VIET VILLAGE 3D

## A. Gắn thử nghiệm, không ảnh hưởng bản chính

Giữ thư mục chính tại:

`H:\CHAT GPT\3D-GAME\VIET-VILLAGE-3D`

Giải nén thư mục ZIP vào **bên trong bản thử nghiệm**:

`H:\CHAT GPT\3D-GAME\VIET-VILLAGE-3D\VIET-VILLAGE-3D-CAP-NHAT\ASSETS\WEAPONS\VFX-DEMO\`

Nếu bản thử nghiệm đặt theo cấu trúc này, sẽ có:

```text
VIET-VILLAGE-3D/
├── SOURCE-CODE/                  (game gốc, không sửa)
├── ASSETS/                       (tài nguyên game gốc)
└── VIET-VILLAGE-3D-CAP-NHAT/     (bản thử nghiệm)
    ├── SOURCE-CODE/
    ├── ASSETS/
    │   └── WEAPONS/
    │       └── VFX-DEMO/
    │           ├── index.html
    │           ├── src/
    │           ├── references/
    │           └── ...
    └── ...
```

Nếu chưa có bản sao đủ cấu trúc, **chỉ thử module ở thư mục độc lập**. Không giả định bản cập nhật đã có toàn bộ `SOURCE-CODE` hoặc `ASSETS`.

Từ CMD tại thư mục `VIET-VILLAGE-3D-CAP-NHAT`, chạy:

```bat
py -m http.server 8001 --bind 127.0.0.1
```

Sau đó truy cập:

`http://localhost:8001/ASSETS/WEAPONS/VFX-DEMO/`

Nếu chỉ dùng thư mục độc lập: chạy `START-DEMO.bat` của module.

## B. Tách phần thực sự có thể tái sử dụng

| Tệp | Vai trò khi đưa vào game |
|---|---|
| `src/models.js` | Hàm `createWeapon(THREE, weaponId)` tạo Object3D để gắn vào tay nhân vật |
| `src/effects.js` | `new WeaponVFX(THREE, scene)` quản lý hiệu ứng runtime; `attack()` thực hiện vệt/đạn/chạm; `update()` cập nhật mỗi frame |
| `src/main.js` | **Chỉ dành cho demo**: dựng sân, mục tiêu, điều khiển 1-5 / JKL; không đưa nguyên tệp vào game chính |
| `index.html` / `style.css` | **Chỉ dành cho demo**, không thay giao diện chính |
| `references/*.png` | Ảnh tham chiếu, không phải model 3D hoặc PBR texture |

Game gốc tải Three.js như script cổ điển từ `../ASSETS/vendor/three.min.js`, sử dụng `window.THREE` và nhiều script phụ thuộc thứ tự. **Không được chuyển 16 script đó thành module hoặc thêm `async` tùy ý**.

Có thể tải hai mô-đun VFX qua `import()` trong một *script bridge* riêng mà vẫn dùng chung `window.THREE`. Đặt bridge ở thư mục phù hợp với trang game thử nghiệm và chỉnh đường dẫn tương ứng.

**Ví dụ minh họa (các biến `scene`, `playerHand`, `enemy` phải do game thật cung cấp):**

```js
// bridge-combat.js, chạy sau khi window.THREE và cảnh 3D đã được tạo.
(async () => {
  const THREE = window.THREE;
  const base = '../ASSETS/WEAPONS/VFX-DEMO/src/';
  const { createWeapon } = await import(base + 'models.js');
  const { WeaponVFX } = await import(base + 'effects.js');

  const weapon = createWeapon(THREE, 'sword');
  // Điều chỉnh vị trí/tỷ lệ theo xương bàn tay nhân vật thật.
  playerHand.add(weapon);
  weapon.position.set(0, 0, 0);
  weapon.scale.setScalar(0.65);

  const weaponVFX = new WeaponVFX(THREE, scene, { quality: 'medium' });

  // Gọi trong vòng lặp update/animate hiện có:
  function updateWeaponVFX(deltaSeconds) {
    weaponVFX.update(deltaSeconds);
  }

  // Gọi khi người dùng bấm/nhấn skill, không yêu cầu câu hỏi:
  function castSkill(weaponId, skillIndex, enemy) {
    if (!enemy || !enemy.alive) return;
    const from = new THREE.Vector3();
    const to = new THREE.Vector3();
    playerHand.getWorldPosition(from);
    enemy.getWorldPosition(to);
    to.y += 1.1; // nhắm tới thân mục tiêu (ví dụ)

    weaponVFX.attack(weaponId, skillIndex, from, to, () => {
      // Hook sát thương khi đến frame va chạm, game tự xử lý HP/network:
      applyDamage(enemy, skillIndex);
    });
  }

  // Chỉ là ví dụ; expose vào module combat thực tế tùy kiến trúc dự án.
})();
```

**Quan trọng:** `playerHand`, `scene`, `enemy`, `applyDamage`, vòng lặp `updateWeaponVFX` và logic chống spam skill trong ví dụ là các điểm kết nối cần được hiện thực dựa trên mã game thật; ví dụ **không phải bản tích hợp chạy ngay**. `WeaponVFX.attack` hiện gọi callback dựa trên thời gian hoạt ảnh, **không raycast/hitbox**. Khi tích hợp thật, kiểm tra phạm vi, tầm đánh, hướng nhìn, cooldown, mana, phòng chống gian lận, authority của server trước khi trừ HP.

## C. Gắn với cửa sổ nhân vật và túi đồ

Một cấu trúc dữ liệu gợi ý:

```js
const weaponDefinitions = {
  sword: { slot: 'mainHand', category: 'sword', meshId: 'sword' },
  staff: { slot: 'mainHand', category: 'staff', meshId: 'staff' },
  axe: { slot: 'mainHand', category: 'axe', meshId: 'axe' },
  spear: { slot: 'mainHand', category: 'spear', meshId: 'spear' },
  bow: { slot: 'mainHand', category: 'bow', meshId: 'bow' }
};
```

Khi người chơi kéo trang bị từ túi đồ sang ô vũ khí: kiểm tra item, tháo mesh cũ, tạo mesh mới, gắn vào xương tay. Khi bấm skill: đọc `category` và `skillIndex (0|1|2)`, gọi `castSkill()`. Hệ hiệu ứng **không phụ thuộc hệ thống câu hỏi học tập**.

## D. Checklist trước khi ghép vào game chính

1. Xác nhận bản thử nghiệm và bản chính nằm ở hai thư mục/Git worktree khác nhau.
2. Xem đúng 5 vũ khí, đúng 4 góc ảnh trong khu tham chiếu.
3. Kiểm thử 15 chiêu trên Chrome, Edge và Android; theo dõi FPS.
4. Đối chiếu ngoại hình 3D với ảnh: bản tạo thủ tục hiện chưa đồng nhất chi tiết khắc chạm/silhouette tuyệt đối.
5. Kiểm tra quỹ đạo sát thương với NPC di chuyển, va chạm, chướng ngại, tốc độ và khoảng cách.
6. Dùng Game Server/Firebase Rules để bảo vệ dữ liệu nhân vật: client chỉ dựng hiệu ứng, server mới duyệt sát thương/tài nguyên.
7. Sau khi xác nhận đạt mới hợp nhất nhánh Git thử nghiệm vào nhánh chính.
