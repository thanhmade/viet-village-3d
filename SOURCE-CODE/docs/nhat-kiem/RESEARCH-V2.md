# Đối soát Nhất Kiếm V2 — 18/10/2026

## Nguồn đã kiểm tra

1. [Naraka: Bladepoint — hướng dẫn vũ khí chính thức, tab Longsword](https://www.narakathegame.com/guide/weapon/). Đã tải và xem các khung hình liên tiếp của [clip Longsword chính thức 6,13 giây](https://www.narakathegame.com/2023/0621/b95404f4622f544bfc47c40a83507cb3.mp4), từ trang hướng dẫn. Quan sát: thế chân mở, hạ người lấy đà, thân và tay chuyển cùng nhau, một đợt kiếm khí thoát khỏi động tác chém rồi nhân vật hồi thế. Clip này không chứng minh thời gian/hitbox/cooldown của Làng Việt. Không đưa asset hoặc clip của Naraka vào game/gói bàn giao.
2. [Sucker Punch — Ghost of Tsushima: Mastering the katana](https://blog.playstation.com/2020/06/23/ghost-of-tsushima-mastering-the-katana/). Đã đọc bài của nhà phát triển; không tuyên bố xem các video YouTube nhúng. Bài nhấn mạnh tốc độ, độ sắc và độ chính xác; ưu tiên phản hồi điều khiển, chuyển động liền mạch và sự khác nhau giữa đòn mở đầu với nhịp tiếp theo. Áp dụng ở đây là nhịp lấy thế → nhát chém nhanh → dừng ngắn, không sao chép cân bằng combat hoặc thế katana hai tay.
3. [Everstone — Where Winds Meet, thiết kế chiến đấu võ hiệp](https://blog.playstation.com/2025/09/25/how-where-winds-meets-wuxia-inspired-combat-turns-the-umbrella-into-a-weapon/). Đã đọc lời nhà phát triển về đặc trưng trọng lượng/tốc độ từng vũ khí, phối hợp diễn viên võ thuật và motion capture toàn thân. Bài chủ yếu nói về ô; dùng làm nguyên tắc phối hợp cơ thể, không làm bằng chứng về một chiêu kiếm cụ thể.
4. [Riot Art Education — Visual Effects](https://www.riotgames.com/en/artedu/visual-effects). Nguyên tắc tham khảo: hiệu ứng cần rõ thông tin, phù hợp hình ảnh chung và hấp dẫn; mật độ ánh sáng không thay thế khả năng đọc hành động.

## Quan sát bản trước và quyết định V2

Bản trước được dựng từ commit `b78881f8d5ecef5cfeaefd754597d0d045e39a3d`, cùng GLB nam, góc máy, ánh sáng và sân thử với V2. Nhận xét dưới đây dựa trên khung canvas WebGL và mã nguồn, không dựa trên ảnh AI.

| Thành phần | Bản trước | V2 đã triển khai |
|---|---|---|
| Hướng chém | Ba nhịp gần mặt phẳng ngang, ít khác biệt | Trảm chéo xuống → hất chéo lên → chém kết thúc gần ngang |
| Nhịp nhanh/chậm | Mỗi nhát nội suy đều gần trọn cửa sổ | Giữ thế ngắn, tăng tốc trong khoảng 0,13–0,14 giây, dư đà và hồi thế |
| Thân/chân | Thân xoay nhẹ, chân trước 14 cm/sau 10 cm | Xoay hông tới khoảng ±25°, xoay thân bổ sung, hạ trọng tâm 10–15 cm, chân tiến 32 cm/lùi 18 cm và mở ngang |
| Tay trái | Hộ thế cố định, khuỷu cao | Tay hộ thế thay đổi cao độ theo nhịp, khuỷu hạ tự nhiên hơn |
| Vệt kiếm | Sáng rộng từ gốc lưỡi, lưu 0,31 giây | Vệt xanh mỏng từ 36% lưỡi, mép trắng hẹp, tan trong 0,16 giây |
| Kiếm khí | Bản rộng và echo sáng | Lưỡi khí mảnh hơn, mặt phẳng nghiêng dễ đọc; hình va chạm nghiêng cùng VFX |
| Tiếp xúc | Chớp to, tan chậm | Chớp gọn 0,20 giây; bụi/mảnh chỉ tại va chạm môi trường |
| Vào/thu thế | Có lún chân khi blend trong lần đo V2 đầu | Sửa mặt đế trước khi giải tay IK; giữ đầu kiếm đúng quỹ đạo |

Đây là thiết kế mới viết bằng mã của dự án, không phải animation motion capture nhập từ các game tham khảo. Giữ ID, thời lượng 1,8 giây, pose 1,5 giây, hồi 1,5 giây, tầm 3,6 m và một hit/mục tiêu/cast. Quỹ đạo kiếm thay đổi theo động tác nên vùng tiếp xúc chi tiết thay đổi tương ứng; không mở rộng thành AoE.

## Đối soát hình ảnh và giới hạn

Đã xuất canvas bằng Three.js r160 trong Chromium 153, WebGL2 qua ANGLE/SwiftShader (render phần mềm). Clip `Nhat-Kiem-V2-So-Sanh.mp4` đặt bản trước/bản mới cạnh nhau, tốc độ thật rồi 0,5x. Không có cảnh từ game khác trong clip. Ảnh kiểm tra bao gồm hai GLB, ba mức chất lượng và các tình huống hit/miss/vách.

Shader, texture, đường kiếm và tiếp xúc đã được dựng thực; đây không phải số đo FPS hoặc chứng nhận GPU vật lý. Chưa triển khai hay nghiệm thu trên Alpha/thiết bị của người dùng. Chi tiết ở `VALIDATION.md`.
