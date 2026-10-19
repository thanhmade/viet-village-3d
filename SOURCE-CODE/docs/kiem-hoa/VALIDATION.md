# Kiếm Hoa — kết quả kiểm tra

Ngày: 19/10/2026. Mã nền: `cap-nhat@e963df859fb9341e1e21de249a1bc4acc1a13a32`.

## Logic và tích hợp

- **170/170** bài `test:vfx` đạt (Node test runner, concurrency 2, reporter TAP). Bao gồm 15 bài Kiếm Hoa mới và hồi quy Côn/Cung/Nhất Kiếm/controller.
- 65 bài avatar/NPC được xác nhận: 64 bài đạt ở lượt chạy bộ ba `player-gltf`, `player-avatar`, `village-npcs`; bài dữ liệu còn lại thiếu tệp thiết kế trong checkout cục bộ, đã khôi phục đúng từ commit nền và chạy lại đạt. Không sửa test dữ liệu hoặc dữ liệu NPC để bỏ qua lỗi.
- Kiếm Hoa: 30/60/120 Hz, dt 0,43 và 5 s; đòn gần và hoa dùng chung bộ chống trùng; bia phía sau/ngang trong tầm được nhận, bia ngoài tầm/khác tầng bị loại; vách chặn hướng bị che.
- Hủy ở chuẩn bị, từng vòng chém, lúc nở và dư quang; tài nguyên dispose đúng một lần, giữ cooldown. Hủy ngay trong callback query không tạo hit/release về sau. Callback đã giữ lại hết hiệu lực sau khi host trả về.
- Controller: không ghi nhận luyện bia ở lúc bấm nút; khóa di chuyển và skill khác trong pose; ngắt marker của avatar hủy hit còn chờ, kể cả khi frame sau dài 5 s.
- Pose GLB nam/nữ thật: bám chuôi và quỹ đạo lưỡi; không kéo dài xương; root/collider giữ nguyên; phục hồi hoạt ảnh, có thể dùng Nhất Kiếm sau đó. Kiểm tra toàn bộ điểm đế giày, đổi trụ và trượt chân ở 240 Hz. Chỉ tính trượt khi cả hai đầu khoảng đo đều sát đất, tránh tính nhầm bước đang hạ từ trên không ở tốc độ xoay cao.

## Hình ảnh WebGL thực

Đã mở `SOURCE-CODE/kiem-hoa-preview.html` trên Chromium headless với ANGLE/SwiftShader. Canvas dùng engine r160, hai file GLB và module Kiếm Hoa thực trong repo; không dùng tranh render thay hiệu ứng.

36 tổ hợp = 2 giới tính × 3 mức chất lượng × 6 tình huống:

| Tình huống | Số bia nhận đòn |
|---|---:|
| Sân trống | 0 |
| Bia trong đường kiếm | 1 |
| Bia ở rìa hoa | 1 |
| Vách chắn trước bia | 0 |
| Vách sát người | 0 |
| Hai bia ở hai phía của hoa | 2, mỗi bia một lần |

Tất cả: `glError = 0`, không shader program lỗi, không lỗi JavaScript/console. Ảnh các mốc 0,32/0,85/1,4/2/2,5/3 s đã được xem; hoa có sáu cánh rõ từ góc cao, đường kiếm bám vũ khí và nhân vật hiện rõ ở tâm. Dải vàng là chi tiết phụ mảnh, không lấn sắc xanh trắng.

Sau 8 lần cast/hủy, số geometry/texture của sân thử trở về **23/4**, như trước cast, trên cả hai GLB. Draw calls ở mốc 2,8 s là 40–48 tùy chất lượng và bia/vách; đây là số của sân thử, không phải ngân sách cả MAP.

`webgl-validation.json` chứa các kết quả từng tổ hợp. `Kiem-Hoa-Kiem.mp4` dài khoảng 16 s: nam tốc độ thật, nữ góc cao tốc độ thật, rồi phát chậm 0,5× để đối chiếu. Video 1280×720/30 fps là thông số tệp xuất, **không phải FPS đo trên máy chơi game**. Clip không có âm thanh sản xuất.

## Build và phạm vi nghiệm thu

Chạy `npm run build:hosting` và `node scripts/build-public-game.mjs --check` trên nguồn hiện tại. Manifest gồm module và icon Kiếm Hoa, 394 tệp runtime / 59 GLB. Không đưa tài liệu, ảnh tham chiếu chuyên đề hoặc trang preview nội bộ vào Hosting ngoài chính sách có sẵn.

Chưa đo GPU vật lý/điện thoại cho Kiếm Hoa, chưa chạy session game có tài khoản thật trên Alpha mới và chưa triển khai Alpha từ môi trường này. Claude cần hoàn tất vòng kiểm tra mục 4–7 trong `PROMPT-CLAUDE.md`; GPU review của Nhất Kiếm cũ không được tính là review của Kiếm Hoa.

## Kiểm tra GPU trên máy chạy game (Claude, 2026-10-19)

Nền `bb6921e9c3725da6ace9f1bf1ed11f570bd4f5f8` (`cap-nhat`). `Kiem-Hoa-Kiem.zip` có 26/26 tệp dự án trùng blob của commit, MP4 trùng bản trong `SKILL-THAM-CHIEU`, nên không nhập lại. Chrome 155 headless, ANGLE D3D11 trên GPU thật (NVIDIA GeForce RTX 3090, WebGL2); bước khung thủ công 60–240 Hz ở trang preview, 17 ms và 4,17 ms trong game (trang kiểm thử UID giả `tests/ui-check`). Chưa triển khai Alpha, chưa thử điện thoại thật hay tài khoản Google.

- Test trên checkout đầy đủ, trước sửa: `npm run test:vfx` 170/170, player/avatar/NPC 65/65, `npm test` 532/532; `build:hosting` 394 tệp / 59 GLB, `test:hosting` 12/12 và kiểm hash.
- Sau sửa: `test:vfx` 172/172, player/avatar/NPC 65/65, `npm test` 534/534 (run-checks đạt), `build:hosting` 394 tệp / 59 GLB, `test:hosting` 12/12 và kiểm hash.

### Lỗi đã sửa: chân trượt theo pha của clip idle

Clip `idle` của hai GLB dài 15,33 s và tự dịch mỗi bàn chân tới 25–30 cm. Pose kiếm đọc gốc IK của chân từ clip này ở mọi khung, nên nếu bấm chiêu đúng lúc idle đang dịch chân thì chân trụ trượt trên đất. Test cũ chỉ cast ở thời điểm idle 0 nên không thấy.

- Trước sửa (bb6921e), đo 240 Hz trong game, 6 pha idle: Kiếm Hoa trượt 14–45 cm ở 5/6 lần cast (nam tối đa 41,7 cm, nữ 44,7 cm); Nhất Kiếm 25,8–27,1 cm ở 1/6 lần. Trang preview cho kết quả tương tự (9 pha: tới 15 cm mỗi pha; Nhất Kiếm tới 31 cm).
- Sửa trong `CHARACTERS/player-gltf.js`: khi đang chém kiếm (và đã xong blend walk→idle), clip idle được giữ ở thời điểm bắt đầu chiêu; hết chiêu clip chạy tiếp từ đó nên không trượt lúc trả về clip. Áp dụng chung cho Nhất Kiếm vì dùng chung `poseSwordStrike`. Cache key `player-gltf.js?v=kiem-khi-2`.
- Sau sửa: preview 9 pha × 2 GLB ≤ 0,42 cm mỗi pha; trong game 240 Hz Kiếm Hoa ≤ 1,8 cm, Nhất Kiếm ≤ 2,6 cm (bước vào thế vốn có). Đế giày −1,3 đến +12 mm, chân nhấc ~10 cm.
- Test mới trong `kiem-hoa-pose.test.cjs` cast ở idle 0/4,9/6,2/12,3 s cho cả hai skill và hai GLB: trên mã cũ hỏng (Kiếm Hoa 19,1 cm nam / 21,9 cm nữ ở idle 4,9 s), trên mã mới đạt.

### Preview `kiem-hoa-preview.html?test`

36 tổ hợp (2 GLB × Nhẹ/Vừa/Cao × 6 tình huống) cho đúng bảng trên: bia trong đường chém trúng lưỡi 0,683 s; bia rìa hoa và hai bia trong hoa trúng vòng nở 2,517 s, mỗi bia một lần; vách chắn 0; vách sát người: lưỡi chạm vách 0,55 s, bia sau vách 0. Đầu lưỡi thật trùng đường tính trúng (0 mm, 0,55–2,25 s); khoảng cách lòng bàn tay–chuôi không đổi (28,3 mm nam, 27,4 mm nữ, lệch 0). Hiệu ứng gỡ ở 3,617 s (60 Hz); geometry/texture/program về nền (22–24/4/3–4, chỉ dao động ±1 do pool tia lửa, không tăng sau 18 lần cast và 7 lần hủy). Hủy ở 0,3/0,8/1,5/2,0/2,4/2,9/3,4 s: không phát sự kiện muộn, không thêm hit, pose nhả. Draw call toàn sân: nghỉ 19–20; đỉnh Nhẹ 43–46, Vừa/Cao 47–49. Nhẹ 2 dải/20 mảnh/2 dòng khí; Vừa = Cao 3/48/4.

Ảnh xem ở 0,30/0,85/1,40/2,00/2,45/2,80/3,20/3,50 s từ góc rộng, từ trên và bên hông: ba vòng chém bám lưỡi, sáu cánh mở dần, vòng nở, cánh tan hết trước 3,6 s; khớp `kiem-hoa-reference.png` và khung của `Kiem-Hoa-Kiem.mp4`. Ảnh tham chiếu trong preview trả 404 dưới `serve-game.py`/`ui-check-server.py` vì máy chủ chặn `docs/` (giống mọi trang preview khác); với `python -m http.server` thì hiện.

### Trong game

Nam, nữ, hình khối gốc; desktop 1280×720 và điện thoại 844×390 (DPR 2, chạm). Làng Việt, 12:00.

- Trúng/hụt: bia 1,25 m phía trước trúng lưỡi 0,697 s; bia 2 m phía sau trúng lưỡi 1,479 s (lưỡi quét vòng); bia 3 m trúng vòng nở 2,516 s; bia 4,9 m không trúng; mỗi bia một lần. Giống nhau ở cả ba avatar và hai thiết bị.
- Phím 2 bấm thêm trong chiêu vẫn một lần cast; cast lại ở 3,1 s bị từ chối `busy` (hết hồi 3 s nhưng pose còn bận); giữ W 0,3–2,0 s không nhích; mở khóa 3,315 s, đi được ngay (0,76 m); cast lại ở 3,9 s được. Điện thoại: chạm hai lần một cast; nút 60 px giữ tên, phím, số hồi (2,8 → 1,7 → 0,6), trạng thái `blocked` rồi `ready`; chạm sau chiêu cast lại.
- Nhiệm vụ bia Võ sư (`QUEST_LV_02`): bấm chiêu vẫn “đang làm”; chém hụt xa bia vẫn “đang làm”; bia cách 3 m chuyển “sẵn sàng” đúng lúc vòng nở chạm (2,516 s).
- Vách: tường nhà 2,5 m không có điểm chạm, cánh phía tường thu ngắn; sát tường 0,6 m lưỡi chạm một lần 0,561 s; đình và sân trống không chạm. Nhẹ/Vừa/Cao cùng kết quả trúng.
- Gián đoạn: đổi cung lúc chém (0,8 s) và lúc nở (2,4 s), mở bảng nhân vật, mất tiêu điểm, đổi MAP, đổi nhân vật, chết (1,2 s): hiệu ứng gỡ trong khung đó, mở khóa, không sự kiện muộn hay hit thêm; sau khi chết cast bị từ chối `village-unavailable`.
- Tay luôn ở chuôi (socket–chuôi 0 mm, lòng bàn tay–chuôi lệch 0). Hồi quy: Nhất Kiếm (phím 1) phóng khí 1,02 s, chạm 1,156 s, mở khóa 1,513 s; Xuyên Tiễn 1 tên/1 chạm, Liên Tiễn 3/1, Mưa Tên 13/12; Côn Quét kết thúc 1,802 s, Hộ Thân bật khiên, Chấn Địa chạm 3,91 s, mở khóa 5,406 s.
- Mạng: mọi script/CSS/icon/GLB của Kiếm Hoa trả 200 với cache key mới; console chỉ có cảnh báo cũ về `three.min.js`.

FPS thời gian thực (chất lượng mặc định, policy level 2), headless trên RTX 3090: desktop nghỉ 107–119 fps, lần cast đầu (biên dịch shader) 107–115 fps với khung dài nhất 56–127 ms, các lần sau 119–120 fps, khung dài nhất ≤ 23 ms. Điện thoại 844×390: lần đầu 108–115 fps (khung dài nhất 56–120 ms), sau đó 119–120 fps (≤ 28 ms). Draw call tăng 30 khi chiêu chạy: GLB 94 → 124, hình khối 110 → 140, điện thoại 105 → 135; thêm ~6,4 nghìn tam giác. Đây là số đo trên máy dev, không phải điện thoại thật.

Ghi chú mỹ thuật cho chủ dự án: giữa trưa trên nền cỏ, blend cộng làm cánh xanh nhạt ngả trắng-xanh ngọc, không còn sắc lam như ảnh tham chiếu nền tối. Mỹ thuật Kiếm Hoa vẫn chờ chủ dự án nghiệm thu.
