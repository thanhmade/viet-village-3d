# Quy ước tên và nơi đặt file vũ khí / chiêu thức

## Nơi thử trên máy tính

Thư mục gốc của bản thử:

```text
H:\CHAT GPT\3D-GAME\VIET-VILLAGE-3D\VIET-VILLAGE-3D-CAP-NHAT
```

Các đường dẫn trong bảng dưới đều tính từ thư mục gốc này. Đặt trực tiếp nội dung `SOURCE-CODE` vào đúng `SOURCE-CODE` đã có; tránh tạo thêm một lớp `SOURCE-CODE\SOURCE-CODE`. PNG đặt trong `ASSETS\reference`, mã thực thi đặt trong `SOURCE-CODE\js\vfx`.

## Bảng mã và file JS

| Vũ khí | Mã ổn định | Cấu hình | Bộ hiệu ứng | Biến cấu hình khi nạp bằng script |
|---|---|---|---|---|
| Côn / Gậy | `staff` | `SOURCE-CODE/js/vfx/staff-skill-config.js` | `SOURCE-CODE/js/vfx/staff-skill-vfx.js` | `StaffSkillConfig` |
| Kiếm | `sword` | `SOURCE-CODE/js/vfx/sword-skill-config.js` | `SOURCE-CODE/js/vfx/sword-skill-vfx.js` | `SwordSkillConfig` |
| Thương / Giáo | `spear` | `SOURCE-CODE/js/vfx/spear-skill-config.js` | `SOURCE-CODE/js/vfx/spear-skill-vfx.js` | `SpearSkillConfig` |
| Cung | `bow` | `SOURCE-CODE/js/vfx/bow-skill-config.js` | `SOURCE-CODE/js/vfx/bow-skill-vfx.js` | `BowSkillConfig` |
| Rìu | `axe` | `SOURCE-CODE/js/vfx/axe-skill-config.js` | `SOURCE-CODE/js/vfx/axe-skill-vfx.js` | `AxeSkillConfig` |

Phần dùng chung: **`SOURCE-CODE/js/vfx/weapon-vfx-core.js`**. Phần lõi chứa các hàm tái dựng VFX; file riêng của vũ khí đăng ký cấu hình riêng, nên không cần sao chép lõi cho cả năm vũ khí.

Quy tắc file: chữ thường, không dấu, không khoảng trắng, ngăn từ bằng dấu `-`. Tên hiển thị trong giao diện vẫn dùng tiếng Việt đầy đủ. Không dùng tên chung `skill.js` hoặc `config.js` cho từng vũ khí vì dễ ghi đè.

## Mã chiêu

| Vũ khí | Ô 1 | Ô 2 | Ô 3 |
|---|---|---|---|
| `staff` | `staff.con-quet` | `staff.ho-than` | `staff.chan-dia` |
| `sword` | `sword.nhat-kiem` | `sword.kiem-hoa` | `sword.kiem-khi` |
| `spear` | `spear.xuyen-kich` | `spear.thuong-phong` | `spear.pha-tran` |
| `bow` | `bow.xuyen-tien` | `bow.lien-tien` | `bow.mua-ten` |
| `axe` | `axe.khai-son` | `axe.pha-giap` | `axe.cuong-phong` |

Trong cấu hình, `id` là mã đầy đủ, `localId` chỉ phần sau dấu chấm và `slot` là 1, 2 hoặc 3. Dùng mã đầy đủ khi lưu lựa chọn, log hoặc kết nối logic game. Nếu sau này có hai vũ khí đều có Hộ Thân, hai mã như `staff.ho-than` và `sword.ho-than` vẫn phân biệt được.

## Đối chiếu chính xác 10 PNG

Các tên đích dưới đây dùng ASCII, ổn định qua phiên bản. Nội dung ảnh được sao chép nguyên bản; đổi tên file không phải chỉnh sửa ảnh. Manifest JSON có SHA-256 và kích thước để kiểm tra lại.

| Ảnh người dùng gửi | Mã | Đường dẫn trong gói |
|---|---|---|
| `Con-gay(2).png` | `staff` | `ASSETS/reference/staff/weapon-reference.png` |
| `Skill-Con-gay(4).png` | `staff` | `ASSETS/reference/staff/skills-reference.png` |
| `Kiem(2).png` | `sword` | `ASSETS/reference/sword/weapon-reference.png` |
| `Skill-Kiem(2).png` | `sword` | `ASSETS/reference/sword/skills-reference.png` |
| `Thuong(2).png` | `spear` | `ASSETS/reference/spear/weapon-reference.png` |
| `Skill-Thuong(2).png` | `spear` | `ASSETS/reference/spear/skills-reference.png` |
| `Cung(2).png` | `bow` | `ASSETS/reference/bow/weapon-reference.png` |
| `Skill-Cung(2).png` | `bow` | `ASSETS/reference/bow/skills-reference.png` |
| `Riu(2).png` | `axe` | `ASSETS/reference/axe/weapon-reference.png` |
| `Skill-Riu(2).png` | `axe` | `ASSETS/reference/axe/skills-reference.png` |

Đây là các ảnh tham chiếu trong dự án. Chưa có ảnh icon từng chiêu đã tách, atlas particle hoặc texture PBR vật liệu vũ khí trong danh sách này. Hiệu ứng 3D được dựng từ code; PNG nguyên tấm không được dùng như một model GLB.

## Thứ tự nạp mã

Đối với game đang sử dụng `window.THREE`, thứ tự là:

1. Three.js đúng phiên bản của game chủ.
2. `js/vfx/weapon-vfx-core.js`.
3. File `*-skill-config.js` của vũ khí.
4. File `*-skill-vfx.js` tương ứng.
5. Mã khởi tạo game / kết nối scene, nhân vật và vòng lặp.

Ví dụ đường dẫn nếu trang HTML nằm trong `SOURCE-CODE`:

```html
<!-- Three.js đã được nạp ở phía trước bằng bản game đang dùng. -->
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

Nếu HTML nằm tại thư mục gốc thì đường dẫn phải có tiền tố `SOURCE-CODE/`. Nếu game dùng ES module hoặc bundler và không có `window.THREE`, cần truyền/lộ đúng namespace Three.js theo hướng dẫn tích hợp, không nạp thêm một phiên bản Three.js khác để tránh hai bản thư viện.

Giữ v1 như bản sao lưu riêng khi thử v2. Không nạp đồng thời bộ `StaffSkillVFX` cũ và bộ staff mới trên cùng một trang, vì cùng tên biến có thể bị ghi đè và hiệu ứng có thể bị cập nhật hai lần. Gói này chưa chứng minh việc nối vào `index.html` của game chính chỉ bằng thêm thẻ script; phải kết nối scene, transform người chơi, thời gian, input và logic gameplay.
