# VIET VILLAGE 3D — 5 vũ khí, 15 chiêu — v2

Bộ hiệu ứng 3D JavaScript/Three.js được dựng theo 10 ảnh thầy gửi: Côn/Gậy, Kiếm, Thương/Giáo, Cung và Rìu. Có demo chọn vũ khí, thử ba chiêu riêng và chạy lần lượt cả 15 chiêu. Mười ảnh gốc được giữ nguyên nội dung trong gói.

## Mở demo

1. Giải nén toàn bộ ZIP vào một thư mục riêng.
2. Trên Windows, chạy **`START-DEMO.bat`**; hoặc mở `SOURCE-CODE/weapons-vfx-demo.html` bằng Chrome/Edge có WebGL.
3. Chọn vũ khí rồi bấm chiêu; phím **1/2/3** để thi triển, **Q/E** đổi vũ khí, kéo chuột để xoay góc nhìn, cuộn để phóng to/thu nhỏ. Bấm **Xem 15 chiêu** để xem toàn bộ.

Demo dùng Three.js r160 có sẵn trong `ASSETS/vendor`, không tải CDN và không cần npm. Nếu máy chặn tài nguyên qua `file://`, dùng `START-DEMO-SERVER.bat` với Python đã cài. Trên macOS/Linux, từ thư mục gói chạy `python3 -m http.server 8000 --bind 127.0.0.1` rồi mở `http://localhost:8000/SOURCE-CODE/weapons-vfx-demo.html`.

## Bộ chiêu

| Vũ khí / mã | Chiêu 1 | Chiêu 2 | Chiêu 3 |
|---|---|---|---|
| Côn/Gậy — `staff` | Côn Quét | Hộ Thân | Chấn Địa |
| Kiếm — `sword` | Nhất Kiếm | Kiếm Hoa | Kiếm Khí |
| Thương/Giáo — `spear` | Xuyên Kích | Thương Phong | Phá Trận |
| Cung — `bow` | Xuyên Tiễn | Liên Tiễn | Mưa Tên |
| Rìu — `axe` | Khai Sơn | Phá Giáp | Cuồng Phong |

Mỗi vũ khí có ba chiêu riêng. Mã đầy đủ như `sword.kiem-khi` giúp tránh trùng khi thêm vũ khí. Tên hiển thị vẫn giữ dấu tiếng Việt. Thời gian, hồi chiêu, bán kính và tầm là thông số thử nghiệm được chọn cho demo, không phải số liệu suy ra từ ảnh.

## File chính

| File hoặc thư mục | Vai trò |
|---|---|
| `SOURCE-CODE/js/vfx/weapon-vfx-core.js` | Timeline, sự kiện, pool hạt, hình học, vật liệu và quản lý tài nguyên dùng chung |
| `SOURCE-CODE/js/vfx/{weapon}-skill-config.js` | Tên, mã, màu, thời gian và phạm vi của ba chiêu |
| `SOURCE-CODE/js/vfx/{weapon}-skill-vfx.js` | Đăng ký bộ chiêu và class riêng của vũ khí |
| `SOURCE-CODE/weapons-vfx-demo.html` | Sân luyện và bộ điều khiển thử hiệu ứng |
| `ASSETS/reference/{weapon}/` | Hai ảnh gốc: vũ khí và ba chiêu |
| `DOCUMENTS/PHAN-TICH-5-VU-KHI-15-CHIEU.md` | Bóc tách hình khối và lớp hiệu ứng của đủ 15 chiêu |
| `DOCUMENTS/SO-DO-DAT-TEN-VA-THU-MUC.md` | Mã chiêu, tên file, đường dẫn và đối chiếu ảnh |
| `DOCUMENTS/HUONG-DAN-GHEP-VAO-GAME.md` | Cách nối vào scene, người chơi, vòng lặp và gameplay |
| `DOCUMENTS/VALIDATION.md` | Kết quả kiểm tra và giới hạn xác minh |

## Ghép vào game

Đặt mã tại `SOURCE-CODE/js/vfx`, nạp lõi rồi năm cặp config/VFX, tạo **một** `WeaponVFXCore` bằng `THREE` và `scene` hiện có của game. Gọi `cast()` khi người chơi ra chiêu và `update(deltaSeconds)` trong vòng lặp game. Hướng dẫn đầy đủ nằm trong `DOCUMENTS/HUONG-DAN-GHEP-VAO-GAME.md`.

Gói này là bộ mô-đun và demo độc lập. File `index.html` đã cung cấp chỉ chuyển hướng tới `SOURCE-CODE/index.html`; mã game chính, model có rig và bộ xử lý chiến đấu chưa có trong nguồn được cung cấp. Vì vậy chưa thể xác nhận đã ghép vào game chính. Model trong demo dựng hình khối theo ảnh; hoa văn, UV/PBR, animation nhân vật, âm thanh và sát thương thật cần được bổ sung trong dự án game.

## Kiểm tra bằng Node

Tại thư mục gói chạy:

```bash
node --test SOURCE-CODE/tests/weapons-vfx.test.cjs
```

Đã đạt 16/16 bài kiểm tra logic bằng Three.js thật. Đã dựng 15 cảnh bằng OpenGL ES phần mềm và kiểm tra giao diện bằng mô phỏng DOM/renderer; chưa xác minh trực tiếp bằng trình duyệt. Xem phạm vi và báo cáo trong `DOCUMENTS/VALIDATION.md`.

Three.js đi kèm theo giấy phép MIT trong `ASSETS/vendor/LICENSE-THREE.txt`.
