# Kiểm chứng Nhất Kiếm

Ngày 2026-10-18. Nền `2eeeb2457f180ef1e3fd3daff8b1deeb9810ab8a`, nhánh `cap-nhat`. Dùng Three.js r160, GLTFLoader và hai GLB thật. Node stub texture decode; không raster WebGL.

| Kiểm tra đã chạy | Kết quả |
|---|---|
| `npm run test:vfx` | 149/149 PASS; 0 fail/skip; gồm 15 ca Nhất Kiếm |
| `node --test SOURCE-CODE/tests/player-gltf.test.cjs SOURCE-CODE/tests/player-avatar.test.cjs SOURCE-CODE/tests/village-npcs.test.cjs` | 65/65 PASS; 0 fail/skip |
| `npm run build:hosting` | PASS; 392 tệp, 239725561 byte, 59 GLB |
| `node scripts/build-public-game.mjs --check` | PASS; tên và hash gói khớp nguồn |
| Node syntax | PASS: 8 tệp JavaScript runtime và module inline của preview |
| Đường dẫn preview | PASS: 13 script/ảnh/import local tồn tại |

Tổng **214 ca logic/rig đạt**. Nhật ký lệnh đầy đủ trong `VALIDATION/` của ZIP.

## Các trường hợp đã chứng minh bằng mã

- 30/60/120 Hz, frame 0,43 và 5 giây: ba nhịp + kiếm khí chỉ cấp một hit/mục tiêu/cast, không mất lần phóng vì frame dài.
- Chọn bia trước bia sau, không trúng bia sau lưng/trên cao/ngoài tầm; vách chặn khí, vách sát người chặn lần phóng còn lại.
- Chém hụt có khí tan dần, không chớp contact/bụi hoặc cấp nhiệm vụ. Callback bị giữ lại không có hiệu lực.
- Vệt mới nhất bám hai đầu lưỡi thật. Hai GLB nam/nữ ở 30/60/120 Hz: đầu kiếm/gốc lưỡi so với đường pose sai lệch dưới 5 mm, lòng bàn tay bám grip; chiều dài xương và root không đổi.
- Hủy ở năm pha, cả ba mức chất lượng: geometry/material/instance được dispose đúng một lần, cooldown giữ; hủy trong callback không phóng khí ma.
- Controller khóa pose, trả tay/kiếm khi hết hoặc đổi nhân vật/hủy; gián đoạn marker được bắt cả khi frame dài.
- Nhiệm vụ bia thật chỉ tiến triển sau tiếp xúc kiếm/kiếm khí. Test cũ đòi cấp ngay khi cast đã cập nhật theo hành vi này; test avatar cũng xác nhận pose Nhất Kiếm thay cho clip slash chung.
- Các bài hồi quy Côn, Xuyên Tiễn, Liên Tiễn, Mưa Tên, nhân vật và NPC đều đạt.

## Chưa được xác minh

Chưa chụp/quay WebGL thật, chưa xác nhận compile shader trên GPU, độ đọc icon 48 px trong game, chân không xuyên đất theo pixel, hay chất lượng hình ảnh cuối trên thiết bị người dùng. Chưa đo FPS, draw calls/GPU memory. Chromium không có trong môi trường; lần tải từ CDN trước đó trả “Site Unavailable”.

Chưa chạy toàn bộ `npm test` hoặc `npm run test:hosting`; đã build và check gói Hosting. Chưa truy cập ổ H:, chưa thao tác Claude Desktop và chưa deploy Alpha trong công việc này. Claude cần thực hiện phần GPU và Alpha trong `PROMPT-CLAUDE.md`.

ZIP delta không chứa public-game, cache, GLB trùng lặp hoặc dữ liệu tài khoản. Preview tham chiếu dùng HTTP local từ repo; thư mục docs được loại khỏi gói Hosting theo chính sách sẵn có.

Đã hợp nhất cập nhật đồng thời `2eeeb2457f180ef1e3fd3daff8b1deeb9810ab8a`: giữ nguyên bản sửa GPU Mưa Tên, ghi chú kiểm chứng của Claude và cache key `mua-ten-2`. Các khẳng định GPU của Mưa Tên không được dùng làm bằng chứng GPU cho Nhất Kiếm.
