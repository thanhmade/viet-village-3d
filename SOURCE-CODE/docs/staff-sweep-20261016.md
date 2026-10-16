# Côn quét — bản triển khai 16/10/2026

Nguồn thiết kế: ảnh người dùng `Vk-Côn.jpg`, chỉ hàng đầu “Côn Quét”; file “Văn bản đã dán (1).txt” với bốn prompt 10 giây. Hộ Thân và Chấn Địa không được thiết kế lại trong bản này. Không dùng asset tải từ game khác.

## Phân tích và nhịp chơi

Bốn clip tổng 40 giây là cách xem chậm để phân tích. Một lần dùng trong game dài **1,8 giây**, hồi **2,4 giây** tính từ lúc thi triển thành công. Các trị số là lựa chọn thiết kế để chơi thử, không phải số đo từ ảnh.

| Nhịp | Thời gian | Biểu hiện trong game |
| --- | --- | --- |
| Mở cung | 0–0,36 s | Tay đưa côn ngang; bắt đầu phát vệt sau đầu côn ở 0,14 s. |
| Tăng lực | 0,36–0,82 s | Côn tăng tốc; dải ngọc mở rộng, viền vàng mảnh, đuôi cũ mờ và trôi ra ngoài. |
| Khép vòng | 0,82–1,12 s | Giảm tốc; vệt côn tắt dần, dải năng lượng thấp khép quanh chân. |
| Bộc phát | 1,12–1,48 s | Đúng một sóng mở từ bán kính 1,65 m tới 3,2 m. Đá/bụi phản ứng khi sóng tới. |
| Thu chiêu | 1,48–1,80 s | Đá rơi, bụi và ánh sáng tan; tay chuyển về hoạt ảnh đang dùng. |

Màu chính xanh ngọc, mép vàng nhạt, đất nâu. Hiệu ứng trong suốt, vẫn kiểm tra chiều sâu, không phủ kín nhân vật. Không thêm nện côn, cột sáng đứng, lốc xoáy, quả cầu khiên, chớp trắng hoặc sóng thứ hai.

## Phần đã nối vào game

- `staff-sweep.js`: timeline, vệt tip lấy mẫu 120 Hz bằng nội suy vị trí đo được, shader dải khí, vòng sát đất, bụi/đá instancing, một đèn cục bộ không đổ bóng, cửa sổ trúng đòn và dọn tài nguyên. Buffer/mesh tạo lúc cast, tái sử dụng trong mỗi frame.
- `weapon-vfx-core.js`: điểm đăng ký renderer riêng theo skill ID; các chiêu còn lại giữ builder cũ.
- `player-gltf.js`: IK hai tay trên xương thật của Male/Female; không thêm/bẻ cong/nhân đôi côn. Chỉ sửa tư thế hiển thị, không sửa collider, vị trí người chơi, rig nguồn hay GLB. Gỡ lớp tư thế trước khi tính frame mới.
- `player-avatar.js`, `weapons-village.js`, `app.js`: nối cast, chặn chồng chiêu trong Côn quét, hủy tư thế cùng hiệu ứng khi cất côn/đổi trang bị/ẩn game/chuyển cảnh. Chiêu này yêu cầu đang ở mặt đất và nhân vật không bận animation khác. WASD/joystick vẫn có thể di chuyển trong lúc đánh.
- `village-npcs.js`: Côn quét chỉ ghi luyện bia khi cửa sổ đòn thật chạm bia; hủy ở tụ lực không ghi thành công. Cách ghi nhiệm vụ và thưởng hiện có được giữ.
- Trang `SOURCE-CODE/weapons-vfx-demo.html`: dùng chính renderer/timeline này, nhãn bốn nhịp, cùng nút Côn Quét; mannequin của trang vẫn là mannequin cũ.

## Vùng đánh và hợp đồng nối chiến đấu

Quét tay: bán kính tối đa **2,1 m**, kiểm tra cung giữa hai vị trí đầu côn liên tiếp. Sóng: kiểm tra vành khăn từ bán kính frame trước tới frame hiện tại, tránh bỏ sót mục tiêu khi FPS thấp. Mỗi mục tiêu chỉ được ghi trúng **một lần cho cả lượt chiêu** (quét và sóng chia sẻ tập ID đã trúng).

Core phát `onEvent` với `type: 'hit-window'`; event có `kind`, `position`, `innerRadius`, `outerRadius`, `height`, `startAngle`, `angle` và `testTarget(id, position, radius)`. Hàm `testTarget` vừa kiểm tra vừa ghi ID; gọi sau khi hệ thống chiến đấu đã xét điều kiện mục tiêu, vật cản và quyền gây sát thương. Không dùng kết quả VFX client làm thẩm quyền thay đổi HP trên máy chủ.

Trong bản này hook được nối với bia tập. Chưa nối trừ HP/đẩy lùi quái, xuyên tường, PvP hoặc dữ liệu máy chủ. Không thay đổi Firebase Functions, Authentication hay Rules.

## Mức độ bám tham chiếu và giới hạn

Đã có bốn nhịp, màu ngọc/vàng, vệt sau đầu côn, một vòng bộc phát, mảnh đất có trọng lực, hai tay cùng cây côn, thu chiêu và hủy an toàn.

Đây là bản hiệu ứng thời gian thực để duyệt trong game. Nhân vật và mẫu côn vẫn là asset đang có; không tự đổi trang phục theo poster. Chân dùng idle/walk/run hiện có, chưa có bộ hoạt ảnh võ thuật riêng cho tấn rộng, xoay hông/đạp chân như video. Chưa thêm âm thanh, chuyển động vải/tóc vật lý hoặc hậu kỳ bloom điện ảnh. Mẫu nhân vật thủ tục cũ chỉ có chuyển động côn dự phòng; IK hai tay áp dụng cho hai GLB nam/nữ. Cần duyệt mỹ thuật và tốc độ trên điện thoại thật; kiểm tra phần mềm không thay thế bước này.

## Kiểm chứng

- **111/111 kiểm tra tự động đạt** trong lượt cuối, gồm logic hiệu ứng, trang demo/input, controller vũ khí, avatar/GLB thật, NPC và đóng gói Hosting. Build/check: 374 tệp runtime, 59 GLB; không chạy deploy.
- Bổ sung `staff-sweep.test.cjs`: 30/60/120 Hz, sóng duy nhất, không trúng lặp, frame chậm, bám tip, giữ tâm sau bộc phát, giải phóng tài nguyên, ba mức chất lượng.
- Bổ sung regression trên GLB thật nam/nữ: độ lệch hai điểm nắm dưới 6,5 cm trong pha đã vào tư thế; không di chuyển actor; trở lại đi bộ và hủy tư thế.
- Bổ sung NPC: bấm chiêu chưa hoàn thành luyện bia; hủy tụ lực không tính; đòn tới mới ghi nhận.
- Kiểm tra Chromium WebGL/SwiftShader: shader biên dịch không lỗi, ảnh năm mốc; chạy controller trong trang game bằng fixture local, cất côn giữa chiêu vẫn hiện người, hết busy, không còn hiệu ứng, có thể đánh lại và di chuyển.
- Fixture trình duyệt là `SOURCE-CODE/tests/staff-sweep.browser.cjs`. Chỉ phục vụ từ localhost và mock đăng nhập ngay trong runner, không chỉnh mã Authentication, không gửi tới tài khoản thật. Cần Playwright và Chromium đã cài; tùy chọn `VILLAGE_CHROMIUM_PATH` để chọn executable.

```bash
node --test SOURCE-CODE/tests/staff-sweep.test.cjs SOURCE-CODE/tests/weapons-vfx.test.cjs SOURCE-CODE/tests/weapons-village.test.cjs SOURCE-CODE/tests/player-avatar.test.cjs SOURCE-CODE/tests/player-gltf.test.cjs SOURCE-CODE/tests/village-npcs.test.cjs SOURCE-CODE/tests/weapons-demo-input.test.cjs SOURCE-CODE/tests/weapons-demo-link.test.cjs SOURCE-CODE/tests/hosting-package.test.mjs
node SOURCE-CODE/tests/staff-sweep.browser.cjs
node scripts/build-public-game.mjs
node scripts/build-public-game.mjs --check
```

Tài liệu kỹ thuật đối chiếu: [Three.js BufferGeometry](https://threejs.org/docs/pages/BufferGeometry.html), [InstancedMesh](https://threejs.org/docs/pages/InstancedMesh.html). Triển khai dùng Three.js r160 đang đóng gói trong repo, không nâng phiên bản.

## Tiếp tục trên máy Windows và Alpha

Nhánh đích `cap-nhat`, repo `thanhmade/viet-village-3d`. Bản này nối sau commit sửa cất vũ khí/di chuyển/nhảy `b6d35021f89581541b731ffbf998d869fe2c79d7`.

Thư mục máy thầy: `H:\CHAT GPT\3D-GAME\VIET-VILLAGE-3D\VIET-VILLAGE-3D-CAP-NHAT`.

1. Kiểm tra Git, bảo toàn thay đổi chưa commit và các file `.bat`; fetch và tích hợp `cap-nhat`, không `reset --hard`.
2. Mở sân luyện → Côn → Côn Quét để duyệt hiệu ứng; vào game thử nam/nữ, J hoặc 1/nút chính, luyện bia, cất côn giữa chiêu, đổi vũ khí, di chuyển.
3. Build/check theo lệnh trên; xác minh đúng project/site Firebase `viet-village-3d` rồi mới cập nhật riêng channel `alpha` theo quy trình hiện có.
4. Báo SHA, URL Alpha, hạn preview và kết quả trên PC/điện thoại. Không cập nhật `main`, live, Functions hay Rules.

Trong môi trường tạo bản này chưa truy cập được ổ H: và chưa có phiên Firebase CLI khả dụng. Chưa triển khai Alpha; URL Alpha cũ chưa phản ánh thay đổi chỉ vì GitHub đã được cập nhật.

## Kết hợp với dải khí bám thân côn (Claude, 16/10/2026)

Theo lựa chọn của chủ dự án khi gộp nhánh: giữ nguyên timeline 4 nhịp, IK hai tay, cửa sổ trúng (`hit-window`), vòng sát đất, sóng bộc phát, đá/bụi, đèn và tia của bản này; chỉ thay 3 lớp vệt đầu côn bằng dải khí lấy từ **hai điểm trên thân côn** (`StaffSkillEffects.createStaffRibbon` trong `staff-skill-effects.js`, thông số `sweep` ở `staff-vfx-config.js`).

- Dải phát từ `windup` tới `closeEnd`, mờ dần trước `releaseAt + 0,14 s`; dải phụ mờ hơn ở đầu kia của côn. Mẫu lấy sau hoạt ảnh/IK của khung, chèn thêm khi côn quét nhanh, xóa lịch sử khi nhảy xa hơn 2,5 m.
- Đỉnh nằm trong không gian thế giới (lớp có ma trận nghịch đảo của nhóm hiệu ứng), nên lịch sử không xoay/trượt theo người. `fx.sweep.samples` (lịch sử đầu côn) vẫn được ghi như cũ; `fx.sweep.ribbons` nay là các mesh dải khí.
- Không có mô hình côn (sân luyện/kiểm thử thiếu `weapon`) thì dải chạy từ đầu côn vào phía người.
- Hộ Thân và Chấn Địa thiết kế riêng trong `staff-skill-effects.js` (xem `SOURCE-CODE/docs/weapons-vfx/README.md`).
