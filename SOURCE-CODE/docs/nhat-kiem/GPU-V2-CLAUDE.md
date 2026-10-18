# Nhật ký GPU V2 do Claude bổ sung

Trích nguyên phần ghi nhận trong commit `4632104861ec93c03e2f55bc81bad56e6c9a0946`. Đây là kết quả cho V2 và bản sửa bước chân của Claude, không phải số đo V3. V3 kế thừa bước chân, test và font; cần đo lại V3 trên thiết bị.

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
