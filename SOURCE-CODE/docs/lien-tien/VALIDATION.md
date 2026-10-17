# Kiểm chứng Liên Tiễn

Nền GitHub: `844f75bd4ee86c75e44b61c2dfd6d9892aea3b16`, nhánh `cap-nhat`. Ngày: 2026-10-17. Môi trường: Node, Three.js r160 thật trong repo, GLTFLoader và hai GLB nam/nữ thật; texture decode được thay bằng stub trong Node, không có raster/WebGL.

| Kiểm tra đã chạy | Kết quả |
|---|---|
| `npm run test:vfx` | 120/120 PASS, 0 fail/skip (gồm 16 ca Liên Tiễn và hồi quy Côn/Xuyên Tiễn/weapon controller) |
| `node --test SOURCE-CODE/tests/player-gltf.test.cjs SOURCE-CODE/tests/player-avatar.test.cjs SOURCE-CODE/tests/village-npcs.test.cjs` | 65/65 PASS, 0 fail/skip |
| `npm run build:hosting` | PASS; 387 tệp, 234669416 byte; 59 GLB được kiểm tra trong gói |
| `node scripts/build-public-game.mjs --check` | PASS; nguồn và public-game có cùng danh sách/hash |
| Node syntax check | PASS cho module, demo và script module của preview |
| Đường dẫn script/icon/ảnh của preview | Tồn tại, đúng chữ hoa/thường |

Tổng 185 ca kiểm tra logic/rig đạt. Test Liên Tiễn bao gồm 30/60/120 Hz, bước 0.47 và 4 giây; không bỏ nhịp khi vượt nhiều mốc; mục tiêu gần nhất thắng dù danh sách đảo thứ tự; vật cản gần nhất; vách sát đầu cung; bia ngoài độ cao/tầm; bắn hụt không impact; hủy giữa các pha; callback hết hiệu lực; geometry/material dispose đúng một lần; chất lượng không đổi gameplay; chân/root không trượt; tay kéo dây và đầu tên khớp dưới 5 mm trên GLB thật; nhiệm vụ Võ sư chỉ tiến triển sau tiếp xúc.

Build Hosting đã phát hiện thiếu script mới trong index có tiền tố ./; đã bổ sung và build/check lại đạt. Các tệp house-travel, bow-piercing, staff-slam và staff-sweep giữ đúng hash nền. Adapter app giữ `getProjectileBounds: projectileBounds` mới nhất của Claude.

## Chưa kiểm chứng

- Chưa render/chụp/quay WebGL thật. Cài Chromium thất bại do CDN trả “Site Unavailable”. Không có kết luận shader đã compile trên GPU, chất lượng ánh sáng thực tế hay icon đọc rõ trên thiết bị.
- Chưa đo FPS, GPU memory, draw calls hoặc mobile performance. Low/Medium/High chỉ đã kiểm tra logic/lifecycle.
- Chưa chạy toàn bộ `npm test` hoặc `npm run test:hosting`; đã chạy build và kiểm tra byte của gói Hosting.
- Chưa truy cập ổ H:, chưa chạy Claude trên máy người dùng, chưa deploy Alpha trong lần này. Claude cần tiếp tục theo PROMPT-CLAUDE.md, kiểm tra local GPU rồi deploy và kiểm tra Alpha.
- Preview độc lập ở SOURCE-CODE/lien-tien-cung-preview.html chỉ dùng local; không thêm preview/ảnh tài liệu vào manifest công khai của Hosting.

Nhật ký đầy đủ nằm trong thư mục VALIDATION của Lien-Tien-Cung.zip. Build artifact public-game không được thêm vào commit hay ZIP delta.
