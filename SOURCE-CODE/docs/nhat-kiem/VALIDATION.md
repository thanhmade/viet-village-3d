# Kiểm chứng Nhất Kiếm V2

Ngày 2026-10-18. Nền `b78881f8d5ecef5cfeaefd754597d0d045e39a3d`, nhánh `cap-nhat`. Runtime và GLB lấy từ repo; không thay Three.js r160.

| Kiểm tra đã chạy | Kết quả |
|---|---|
| `npm run test:vfx` | 151/151 PASS, 0 fail/skip; gồm 17 ca Nhất Kiếm |
| `node --test SOURCE-CODE/tests/player-gltf.test.cjs SOURCE-CODE/tests/player-avatar.test.cjs SOURCE-CODE/tests/village-npcs.test.cjs` | 65/65 PASS, 0 fail/skip |
| `npm run build:hosting` | PASS; 392 tệp, 239727120 byte, 59 GLB |
| `node scripts/build-public-game.mjs --check` | PASS; hash gói khớp nguồn |
| WebGL2 qua ANGLE/SwiftShader | 54 mẫu ghi số liệu V2, không console error, glError=0, không program báo compile thất bại |
| Canvas trước/sau | Hai chuỗi 67 khung ở 30 mẫu/giây; video tốc độ thật rồi chậm 0,5x |

Tổng **216 ca logic/rig đạt**. Nhật ký và báo cáo WebGL nằm trong `VALIDATION/` của ZIP; video trong `REVIEW/`.

## Rig và logic

- Các ca cũ về 30/60/120 Hz, frame dài 0,43/5 giây, một hit/mục tiêu, thứ tự bia/vách, miss, hủy, dispose, cooldown và tiến trình bia đều đạt.
- Hai GLB nam/nữ: gốc/đầu lưỡi so với quỹ đạo dưới 5 mm ở 30/60/120 Hz; lòng bàn tay giữ grip, chiều dài xương và root không đổi.
- Thêm hai ca cho lỗi thực sự phát hiện khi đo: chân lún khoảng 4 cm ở blend vào/thu thế. Sau sửa, mọi mẫu 60 Hz trong 1,5 giây giữ đế trên ngưỡng -3 mm; chân trụ trong pha active lệch dưới 8 mm. Thế chân rộng trên 43 cm, sâu trên 49 cm ở cả hai GLB.
- Camera/collider root không được dịch chuyển để tạo cảm giác lao tới; hông/thân xoay trong visual, tay/chân giải bằng IK đang có.
- Giữ nguyên bản sửa GPU Mưa Tên trước đó, cùng cache key `mua-ten-2`. Test hồi quy Côn/Cung, người chơi và NPC đạt.

## Kiểm tra hình ảnh thật

Chromium 153, renderer `ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)), SwiftShader driver)`, canvas 800×600. Có texture thật; không dùng stub bitmap của Node. V1 và V2 dùng cùng GLB, ánh sáng, góc máy và sân trống để so sánh.

Đã kiểm tra: hai giới tính; Low/Medium/High; sân trống, bia gần, bia cuối tầm, vách, vách sát người, hai bia nối tiếp. Các mẫu đo .36 / 1.04 / 1.25 / 1.80 s cho thấy đúng bia cần trúng được ghi nhận một lần; miss/vách không ghi nhận bia phía sau. Chuỗi video còn xác nhận effect đã dọn ở 2,2 s; mốc danh nghĩa 1,8 s có thể chờ frame kế do làm tròn số thực.

Đã xem các khung tiêu biểu và bảng chuyển động: ba hướng chém khác nhau, mép vệt bám kiếm, đế chân bám sân, tay trái hạ khuỷu, kiếm khí rời lưỡi, chớp/bụi tại vách; canvas không chứa UI tài khoản.

Số draw calls của **toàn sân preview** tại các mẫu: Low 18–26, Medium 19–27, High 19–26. Các mức dùng những tình huống khác nhau, không dùng bảng này để kết luận High nhanh/chậm hơn. Đây không phải FPS, thời gian GPU hay chi phí riêng của chiêu.

## Phạm vi còn lại

Chưa đo GPU vật lý/mobile, bộ nhớ GPU hay FPS. SwiftShader là render phần mềm, đủ kiểm chứng shader và pixel trong môi trường này nhưng không thay thử nghiệm thiết bị. Chưa kiểm tra Nhất Kiếm trong phiên game đăng nhập của người dùng, icon 48 px trên thiết bị, hoặc triển khai Alpha. Không truy cập ổ H: hay Claude Desktop.

Chưa chạy toàn bộ `npm test`/`npm run test:hosting`; đã chạy nhóm hồi quy liên quan, build và kiểm tra hash gói. Theo `PROMPT-CLAUDE.md`, Claude đồng bộ GitHub, kiểm tra game thật rồi triển khai đúng Alpha bằng phiên Firebase hiện có.

## Kiểm tra GPU trên máy chạy game (Claude, 2026-10-18)

Nền `dea46a676100158ab1b6dde20f9e503324d74e20`. Chrome 155 headless, ANGLE D3D11 trên GPU thật, bước khung thủ công 60–240 Hz (preview) và 17 ms (game, trang kiểm thử UID giả).

- Sửa sau khi đo GPU: lúc vào thế (0–0,20 s) và hồi thế (1,23–1,50 s), cả hai bàn chân lướt sát mặt đất, chân trái 35 cm và chân phải 24 cm, nhanh tới 2,8 m/s. Nguyên nhân: chỉ pha trộn góc xương chân theo trọng số. Nay từng chân bước lần lượt (vào thế chân trái trước, hồi thế chân phải trước), nhấc cao 7 cm, và chỉ dịch ngang khi đã rời đất; IK chân đạt đủ ở 1/3 trọng số. Đo lại: trượt sát đất ≤ 1,2 cm, chân nhấc 5–7 cm, đế giày không xuống dưới mặt đất (≥ −1 mm), chân trụ trong lúc chém vẫn đứng yên. Test mới trong `nhat-kiem-pose.test.cjs` bắt lỗi này (bản trước trượt 0,356 m). Cache `player-gltf.js?v=nhat-kiem-3`.
- Tiêu đề preview: Georgia trên Windows thiếu Ấ/Ế nên hiện “NHÂ´T KIÊ´M”. Nay dùng Palatino Linotype, rơi về Georgia/serif.
- Preview nam/nữ, Nhẹ/Vừa/Cao, camera rộng và bên hông: lưỡi kiếm thật trùng đường quét tính trúng (0 mm) trong ba nhát. Khí phóng ở 1,012 s, cách đầu kiếm 3 mm. Bia gần trúng 0,367 s; bia cuối tầm trúng khí 1,167 s; mỗi bia một lần. Vách: khí chạm 1,10 s có chớp, bụi, đá. Vách sát người chặn ở 0,317 s, không phóng khí. Hai bia thẳng hàng: chỉ bia trước (1,117 s). Chém hụt: khí tan, không chớp. Nhẹ 2 dải vệt, Vừa/Cao 3. Hủy ở 0,60 s và 1,08 s: geometry/texture/program về đúng mức nền.
- Trong game (nam, nữ, hình khối, điện thoại 844×390): phím 1; bấm thêm trong chiêu vẫn chỉ một lần cast. Giữ W lúc chém không nhích; mở khóa 1,513 s, đi được ngay; cast lại được sau hồi 1,5 s. Bia 3 m trúng khí 1,156 s; bia trong tầm chém trúng 0,357 s một lần; hai bia thẳng hàng chỉ bia trước. Nhiệm vụ bia Võ sư giữ “đang làm” đến khi khí chạm bia (1,156 s). Tường nhà và đình: khí chạm 1,122 s có đá vụn; sát tường 0,6 m: chặn ở 0,323 s, không phóng khí; chém hụt: không có điểm chạm.
- Gián đoạn: đổi sang cung giữa chém hoặc sau khi phóng, mở bảng nhân vật, mất tiêu điểm, đổi MAP, đổi nhân vật, chết. Hiệu ứng được gỡ ngay, không phát sự kiện muộn, không trúng bia.
- Icon 80 px (desktop)/84 px (điện thoại) vẫn thấy tên, phím, số hồi chiêu; chạm lần hai bị bỏ qua. Hồi quy Xuyên Tiễn, Liên Tiễn, Mưa Tên, Côn Quét, Hộ Thân, Chấn Địa đều đạt. Console chỉ có cảnh báo cũ về `three.min.js`.
- FPS thời gian thực (Cao, 1280×720): nghỉ 105–120 fps. Lần cast đầu biên dịch shader: 96–114 fps, khung dài nhất 51–123 ms (lúc nghỉ headless cũng có khung tới 116 ms). Các lần sau khoảng 120 fps, khung dài nhất ≤ 20 ms. Draw call tăng 6 (91 → 97).
- Ghi nhận hình ảnh: vệt V2 mảnh và tan sau 0,16 s, nên từ camera sau lưng nhát hất lên khó thấy hơn bản trước. Đây là lựa chọn thiết kế V2, không sửa.

Chưa xác minh trên điện thoại thật và chưa chơi thử bằng tài khoản Google trên Alpha. Nút “Ảnh tham chiếu” của preview trả 404 trên máy chủ kiểm thử cục bộ vì máy chủ này chặn thư mục `docs`, như preview Liên Tiễn/Mưa Tên; gói Hosting cũng loại `docs`.
