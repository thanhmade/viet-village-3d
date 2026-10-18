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
