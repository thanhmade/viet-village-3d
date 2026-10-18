# Kiểm chứng Mưa Tên

Ngày 2026-10-18. Nền `271ecfe560f7be2f5d60d4c598fbff9b489c6e30`, `cap-nhat`. Node dùng Three.js r160, GLTFLoader và hai GLB thật của repo. Texture decode được stub trong kiểm tra Node; không có WebGL raster.

| Kiểm tra đã chạy | Kết quả |
|---|---|
| `npm run test:vfx` | 134/134 PASS, 0 fail/skip; gồm 14 ca Mưa Tên |
| `node --test SOURCE-CODE/tests/player-gltf.test.cjs SOURCE-CODE/tests/player-avatar.test.cjs SOURCE-CODE/tests/village-npcs.test.cjs` | 65/65 PASS, 0 fail/skip |
| `npm run build:hosting` | PASS; 389 tệp, 237173318 byte; 59 GLB |
| `node scripts/build-public-game.mjs --check` | PASS; danh sách và hash nguồn/gói khớp |
| Syntax module, controller, pose, demo, preview | PASS |
| Đường dẫn script/icon/ảnh preview | 12 tham chiếu local tồn tại, đúng chữ hoa/thường |

Tổng **199 ca logic/rig đạt**. Riêng Mưa Tên kiểm tra:

- 30/60/120 Hz, bước 0,41 và 6 s: đủ 12 tên chạm đất, không lặp/mất nhịp.
- Mục tiêu trên cao gần hơn thắng mục tiêu thấp dù liệt kê sau; bia ngoài vùng/độ cao không trúng.
- Mái che chặn mưa trước bia ở dưới; trần thấp chặn tên gọi phép trước khi đầu tên thoát qua mái, không mở mưa.
- Hủy ở năm pha và ba mức chất lượng: geometry/material/buffer InstancedMesh dispose đúng một lần; cooldown giữ; callback cũ vô hiệu.
- Hủy ngay trong callback ngăn các lần phóng sau; chất lượng không đổi số hit.
- Đầu tên thật khớp điểm tiếp xúc trên địa hình dốc, caster trong group quay; vùng mưa giữ nguyên khi người bắn rời đi.
- Controller giữ khóa 1,8 s rồi phục hồi tay/di chuyển. Gián đoạn pose được xử lý cả khi nhảy frame dài.
- Nhiệm vụ Võ sư thật không tiến triển ở lúc kích hoạt/tụ lực hay hủy sớm; chỉ sẵn sàng sau tên rơi chạm bia.
- Cả GLB nam/nữ ở 30/60/120 Hz: tay kéo–nock và đầu tên–điểm phóng sai lệch dưới 5 mm, hướng tên trùng hướng phóng, chiều dài xương và root không đổi; dùng được Xuyên Tiễn/Liên Tiễn sau hồi thế.

Các sửa collider đình/cây đa và module Côn/Xuyên Tiễn/Liên Tiễn giữ nguyên. Bộ kiểm tra hồi quy liên quan đều đạt. Nhật ký lệnh đầy đủ ở `VALIDATION/` trong ZIP.

## Phần còn cần kiểm tra trên máy chạy game

Chưa render/chụp/quay WebGL thật, chưa đo FPS, GPU memory hoặc draw calls. Browser Chromium không có trong môi trường; lần cài trước đã bị CDN trả “Site Unavailable”. Không khẳng định shader đã compile trên GPU hoặc hiệu ứng đạt hình ảnh mong muốn trước khi Claude mở preview/game thật.

Chưa chạy toàn bộ `npm test` hoặc `npm run test:hosting`; đã chạy build và đối chiếu gói Hosting. Chưa truy cập ổ H:, chưa điều khiển Claude và chưa deploy Alpha trong công việc này. Hướng dẫn còn lại ở `PROMPT-CLAUDE.md`. Không đưa `public-game`, cache, GLB trùng lặp hoặc dữ liệu riêng tư vào ZIP delta.

## Kiểm tra GPU trên máy chạy game (Claude, 2026-10-18)

Chrome 155 headless, ANGLE D3D11, bước khung thủ công 60 Hz (preview) và 17 ms (game, trang kiểm thử UID giả).

- Preview nam/nữ, Nhẹ/Vừa/Cao: cung nghiêng 55°, tay trái–nock 0 mm, tên gọi phép nhả 0,85 s cách đầu tên thật 0,3 mm; mở trận 1,46 s; 12 tên thả 1,62–3,15 s; bia trong trận mỗi bia trúng một lần, 8 tên còn lại chạm đất đến 4,00 s; xong 4,82 s. Mái che chặn cả 12 tên; trần thấp chặn tên gọi phép (không mở mưa, hồi chiêu vẫn tính); bia ngoài trận không trúng; hủy trước tên gọi phép/giữa mưa không phát thêm tên.
- Sửa sau khi xem ảnh: dải xoáy trên trời rộng 3,6 cm ở độ cao 8,2 m nhỏ hơn một điểm ảnh, gần như không thấy; nay rộng 0,32 m và lõm 0,6 m ở tâm. Khí xanh quanh tên rơi rộng 8 cm, vòng gọi phép dày 2,6 cm. Số dải/đoạn theo mức chất lượng và gameplay không đổi.
- Trong game (nam, nữ, hình khối, điện thoại 844×390): ngắm bằng chuột + phím 3, xác nhận bằng phím 3 hoặc chuột trái, Esc hủy không tốn hồi chiêu; chạm nút bắn 7 m phía trước, giữ–kéo để ngắm; tên đầu chạm đúng tâm đã chọn. Khóa di chuyển đến 1,80 s, rời vùng thì mưa vẫn rơi tại chỗ. Mái nhà, đình, thân cây đa chặn tên; đứng trong hộp mái nhà thì tên gọi phép bị chặn. Nhiệm vụ bia Võ sư chỉ sẵn sàng khi tên chạm bia. Đổi vũ khí/MAP/nhân vật, mở bảng, mất tiêu điểm, chết giữa mưa đều dừng sạch. Console không lỗi.
