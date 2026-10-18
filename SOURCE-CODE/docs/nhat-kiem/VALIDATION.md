# Kiểm chứng Nhất Kiếm V3

Ngày 18/10/2026; nền `4632104861ec93c03e2f55bc81bad56e6c9a0946`, nhánh `cap-nhat`, repo `thanhmade/viet-village-3d`. Runtime Three.js r160, hai GLB và texture gốc của repo.

| Kiểm tra đã thực hiện | Kết quả |
|---|---|
| Bộ tệp của `npm run test:vfx`, chạy Node TAP với concurrency=2 | 155/155 PASS; 21 ca Nhất Kiếm, các ca Côn/Cung và controller cũ đều đạt |
| Player GLTF/avatar/NPC | 65/65 PASS |
| `npm run build:hosting` | PASS; 392 tệp, 239732909 byte, 59 GLB |
| `node scripts/build-public-game.mjs --check` | PASS; hash gói Hosting khớp nguồn |
| WebGL2 / SwiftShader, canvas 800×600 | 66 mẫu ghi số liệu V3 (clip V2 đối chứng giữ từ lần render cùng thiết lập); 0 console error, glError=0, 0 program compile lỗi |
| Clip `Nhat-Kiem-V3-Vo-Hiep.mp4` | 13,33 s, 1600×660: so sánh V2/V3, nam chạm vách, nữ đánh bia cuối tầm; tốc độ thật rồi 0,5x |

**220 ca logic/rig đạt.** Lần gọi npm đầu kết thúc nhưng nhật ký không có tổng kết test; không dùng lần đó làm bằng chứng. Đã chạy lại chính danh sách tệp của script với `node --test --test-concurrency=2 --test-reporter=tap`, nhật ký đủ 155 PASS, exit 0. Danh sách lệnh nằm đầu `VALIDATION/vfx-tests.log` trong ZIP.

## Các rủi ro đã kiểm tra

- Male/female thật ở 30/60/120 Hz: gốc/đầu lưỡi lệch quỹ đạo dưới 5 mm, grip giữ đúng, chiều dài xương và root không đổi.
- Test mới cho cả hai rig: hông hạ hơn 20 cm, tiến hơn 10 cm; vector hông→cổ nghiêng về hướng đánh hơn lúc idle. Tránh lỗi dùng nhầm trục cục bộ của spine.
- Đế chân không xuống dưới ngưỡng -3 mm trong vào/thu thế; chân trụ lệch dưới 8 mm trong pha active. Thế trước–sau không bị kéo theo xoay hông.
- Frame 30/60/120 Hz và frame dài 0,43/5 s; một hit/mục tiêu/cast; bia gần nhất/vách chặn đúng; vách sát người ngăn phát kiếm khí.
- Chém hụt không có chớp trắng, chớp vàng, cụm tia, bụi hay mảnh vụn. Hạt khí quanh người không làm tăng hit hoặc cấp tiến trình bia.
- Hủy ở từng pha, hủy trong callback, đổi vũ khí/avatar và ngắt pose không để sót wave/pose, cooldown được giữ, geometry/material giải phóng đúng một lần. Bộ cũ được áp dụng cả các resource V3 vừa thêm.
- Hồi quy Côn, Xuyên Tiễn, Liên Tiễn, Mưa Tên, người chơi và NPC đạt. Giữ cache key Mưa Tên `mua-ten-2`; SwordStrike dùng `nhat-kiem-3`, player-gltf dùng `nhat-kiem-4`.

## Hình ảnh đã xem và số liệu thực tế

Các chuỗi được lấy trực tiếp từ canvas Three.js có texture thật, không dùng stub bitmap của Node hay video AI. V2/V3 so sánh với cùng sân, GLB nam, ánh sáng và camera. Clip chỉ ghép hai canvas và thêm nhãn; không thêm bloom/particle hậu kỳ ngoài runtime.

Đã xem bảng khung chuyển động V3 và các mốc tấn/chém/phóng khí/chạm vách, cùng khung phim xuất cuối. Trong các mẫu kiểm tra có nam/nữ, Low/Medium/High, sân trống, bia gần, bia cuối tầm, vách, vách sát người và hai bia nối tiếp. Kết quả contact đúng: miss/vách không đánh bia phía sau, melee trúng bia gần một lần, qi trúng bia cuối tầm một lần, nearest chỉ trúng bia trước.

Draw calls **toàn sân preview** ở các mẫu: Low 18–33, Medium 19–45, High 19–43. Các mức dùng tình huống khác nhau; không dùng số này so tốc độ giữa các mức. Render dùng ANGLE/SwiftShader, không phải GPU vật lý. 30 khung/giây của video là tần suất lấy mẫu để phát lại thời gian mô phỏng, không phải đo FPS game.

Effect dọn xong ở các mẫu video sau 1,8 s; ở mẫu ghi nominal 1,80 s, sai số cộng dt có thể còn giữ handle cho tới frame kế. Các test vượt mốc và hủy xác nhận dọn tài nguyên. Không thay lifecycle chung chỉ để ép một mẫu thời gian tròn.

## Giới hạn nghiệm thu

Người dùng chưa chấp nhận V2 và chưa nghiệm thu hình ảnh V3. Kết quả kỹ thuật trên không có nghĩa mỹ thuật đã đạt mong muốn. Đọc `RESEARCH-V3.md` về nguồn võ hiệp/tiên hiệp đã xem và cách lựa chọn thiết kế.

Chưa đo FPS/GPU memory/mobile hoặc xem V3 trong phiên game đăng nhập thực; chưa triển khai Alpha trong phiên này. Không truy cập ổ H: hay Claude Desktop. Chưa chạy toàn bộ `npm test`/`npm run test:hosting`; đã chạy các nhóm liên quan, build và kiểm tra hash. Claude cần đồng bộ GitHub, kiểm tra game thực/thiết bị và triển khai đúng Alpha theo `PROMPT-CLAUDE.md`.

## Hợp nhất cập nhật đồng thời từ Claude

Trong khi hoàn thiện, nhánh có thêm commit `4632104861ec93c03e2f55bc81bad56e6c9a0946`. Đã đối chiếu hash đủ 12 tệp cập nhật và giữ cơ chế từng chân bước trên cung nhấc 7 cm, hai test chống trượt, font Palatino của preview. Chạy lại bộ VFX trên pose V3 đã hợp nhất và render lại các chuỗi V3. Nhật ký GPU V2 của Claude được giữ nguyên trong `GPU-V2-CLAUDE.md`; không lấy các số FPS cũ làm số đo V3.

Bản hợp nhất đầu tiên không qua hai test chống trượt (nam thu thế 3,2 cm; nữ vào thế 3,1 cm). Đã giữ ngưỡng test 3 cm và điều chỉnh IK chân đạt đủ ở 1/6 trọng số thay vì 1/3 để hợp thế tấn rộng của V3. Hai test chống trượt và sáu test pose còn lại đều đạt sau sửa; clip V3 được render lại theo sửa này.
