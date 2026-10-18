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

## Kiểm tra GPU V3 trên máy chạy game (Claude, 2026-10-18)

Nền `bd2cf9943842280ddc977cc57ca7fcf92225ae0d`; `Nhat-Kiem-Kiem-V3.zip` có 35/35 tệp dự án trùng commit nên không nhập lại. Chrome 155 headless, ANGLE D3D11 trên GPU thật; bước khung thủ công 60–240 Hz (preview) và 17 ms (game, trang kiểm thử UID giả). Không phát hiện lỗi cần sửa mã.

- Test trên checkout đầy đủ: `npm run test:vfx` 155/155, player/avatar/NPC 65/65, `npm test` 518/518; bản xuất sạch: `build:hosting` 392 tệp, `test:hosting` 12/12.
- Preview nam/nữ, Nhẹ/Vừa/Cao, camera rộng và bên hông: lưỡi kiếm thật trùng đường quét tính trúng (0 mm) trong ba nhát; khí phóng 1,012 s, cách đầu kiếm 4,5 mm. Bia gần trúng 0,367 s, bia cuối tầm trúng khí 1,15 s, mỗi bia một lần. Vách: chạm 1,083 s có chớp xanh–trắng/vàng, tia, bụi, đá. Vách sát người chặn ở 0,333 s, không phóng khí. Hai bia thẳng hàng: chỉ bia trước (1,10 s). Chém hụt: khí tan, không chớp/tia/bụi/đá. Nhẹ 2 dải vệt, Vừa/Cao 4 ở nhát cuối. Hủy ở 0,60 s và 1,08 s: geometry/texture/program về đúng mức nền.
- Bước chân kế thừa vẫn đạt với tấn V3: trượt sát đất ≤ 0,94 cm (vào/thu thế), chân nhấc khoảng 7 cm, đế giày không xuống dưới mặt đất, chân trụ đứng yên trong ba nhát.
- Trong game (nam, nữ, hình khối, điện thoại 844×390): phím 1; bấm thêm trong chiêu vẫn một lần cast. Giữ W lúc chém không nhích; mở khóa 1,513 s, đi được ngay; cast lại được sau hồi 1,5 s. Bia 3 m trúng khí 1,156 s; bia trong tầm chém 0,357 s một lần; hai bia thẳng hàng chỉ bia trước. Nhiệm vụ bia Võ sư giữ “đang làm” đến khi khí chạm bia (1,156 s). Tường nhà 1,105 s và đình 1,122 s có đá vụn; sát tường 0,6 m chặn ở 0,34 s, không phóng khí; chém hụt không có điểm chạm. Đế giày cách mặt đất −1 đến +9 mm.
- Gián đoạn: đổi sang cung giữa chém hoặc sau khi phóng, mở bảng nhân vật, mất tiêu điểm, đổi MAP, đổi nhân vật, chết. Hiệu ứng được gỡ ngay, không phát sự kiện muộn, không trúng bia. Icon 80 px (desktop)/84 px (điện thoại) vẫn thấy tên, phím, số hồi; chạm lần hai bị bỏ qua. Hồi quy Xuyên Tiễn, Liên Tiễn, Mưa Tên, Côn Quét, Hộ Thân, Chấn Địa đạt. Console chỉ có cảnh báo cũ về `three.min.js`.
- FPS thời gian thực (Cao): desktop 1280×720 nghỉ 110–113 fps; lần cast đầu (biên dịch shader) 92–112 fps, khung dài nhất 70–127 ms (lúc nghỉ headless cũng có khung tới 157 ms); các lần sau khoảng 120 fps, khung dài nhất ≤ 22 ms. Điện thoại 844×390 (DPR 2): sau khi nóng 115 fps, khung dài nhất 29 ms. Draw call tăng 23 khi chiêu chạy (91 → 114; hình khối 107 → 130).
- Hình ảnh trong game: khí tụ quanh thân ở nhiều độ cao, ba vệt xanh–trắng và kiếm khí nhìn rõ từ camera sau lưng; chớp va chạm chỉ khi chạm bia/vách.

Chưa xác minh trên điện thoại thật và chưa chơi thử bằng tài khoản Google trên Alpha. Mỹ thuật V3 vẫn chờ chủ dự án nghiệm thu.
