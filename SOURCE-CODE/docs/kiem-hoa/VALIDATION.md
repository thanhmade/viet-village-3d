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
