# NGOẠI Ô LÀNG VIỆT – ĐỒNG TRE

Bộ thiết kế map phụ dựa trên phong cách năm ảnh trong Lang-Viet.zip do người dùng cung cấp. Bối cảnh Việt Nam phong kiến; sân nhận nhiệm vụ nối với ba khu luyện cấp. Bốn PNG đều có kích thước 1536 × 1024, không chữ và không đồ hiện đại.

## Tệp ảnh

| Tệp | Góc nhìn |
|---|---|
| 01_Ngoai_Lang_Dong_Tre_Truoc.png | Từ phía cổng nhìn vào khu luyện cấp |
| 02_Ngoai_Lang_Dong_Tre_Trai.png | Từ bên trái; cổng nằm bên phải ảnh |
| 03_Ngoai_Lang_Dong_Tre_Phai.png | Từ bên phải; cổng nằm bên trái ảnh |
| 04_Ngoai_Lang_Dong_Tre_Sau.png | Từ phía gò đá nhìn về cổng; thấy mặt lưng khối đá |

Quy ước khi đọc ảnh Trước: cổng ở dưới, hang ở trên, ruộng bên trái, tre bên phải. Đây là hướng cục bộ của map game, không phải tọa độ địa lý.

## Bố cục và tuyến chơi

Làng Việt → cổng chuyển map → sân nhận nhiệm vụ → cầu gỗ → ruộng ven làng → lũy tre → gò đá và hang thú → trở về sân trả nhiệm vụ.

Sân phía cổng là vùng an toàn. Nhà mái ngói là trạm giao nhiệm vụ; nhà mái tranh là nơi thầy thuốc; cây và giếng là mốc nhận biết khu hồi phục. Suối ngăn sân với vùng luyện cấp; cầu giữa map là lối đi chính. Các đường đất phía bên kia cầu nối ba bãi trống thành một vòng, có nhánh ngắn đến hang.

## NPC đề xuất

| NPC | Vị trí | Vai trò |
|---|---|---|
| Trưởng trạm | Hiên nhà mái ngói | Hướng dẫn nhập môn, giao và nhận trả nhiệm vụ |
| Nông dân | Sân phía nhà mái ngói, gần giỏ nông sản | Giao nhiệm vụ bảo vệ ruộng và thu thập nông sản |
| Tiều phu | Rìa sân phía trước cầu, giữ lối đi trống | Chỉ đường lũy tre, giao nhiệm vụ lấy gỗ |
| Thầy thuốc | Nhà mái tranh và vườn dược liệu | Hồi phục, giao nhiệm vụ hái thuốc |

## Vùng luyện cấp đề xuất

| Khu vực | Cấp | Quái đề xuất | Nhiệm vụ mẫu |
|---|---|---|---|
| Bãi đất cạnh ruộng | 1–3 | Chuột đồng lớn | Bảo vệ mùa màng, thu gom nông sản |
| Khoảng trống trong lũy tre | 4–6 | Lợn rừng nhỏ | Mở lối đi, thu thập gỗ và dược liệu |
| Sân trước hang và gò đá | 7–10 | Lợn rừng trưởng thành; một thủ lĩnh | Khảo sát dấu vết, đánh bại lợn rừng đầu đàn |

Các cấp độ và loại quái là đề xuất thiết kế mới, cần cân chỉnh theo hệ thống chiến đấu và tốc độ lên cấp thực tế. Ảnh chỉ thể hiện môi trường; chưa bao gồm tài nguyên nhân vật hoặc quái.

## Dịch chuyển và vùng an toàn khi triển khai

- Kết nối hai chiều: Làng Việt ↔ Ngoại ô Làng Việt – Đồng Tre.
- Điểm đến ở map phụ đặt trong sân sau cổng, hướng nhân vật về cầu; đặt ngoài vùng kích hoạt cổng để tránh chuyển map qua lại liên tục.
- Điểm trở về đặt phía trong cổng Làng Việt, trên phần đất đi được.
- Không sinh quái ở sân, trên cầu, tại hai đầu cầu hoặc trên tuyến đường quay về chính. Giới hạn truy đuổi của quái trước cầu, giữ an toàn cho khu NPC.
- Đặt quái trên các bãi đất trống; không đặt trong ruộng nước, bụi tre đặc, đá hoặc đồ trang trí. Chừa lối tiếp cận hang và đường vòng để tránh kẹt nhân vật.
- Khi dựng 3D, kiểm tra bề rộng cầu, va chạm, chênh cao bờ suối, lối vào ba bãi và góc camera ở độ cao nhân vật.

## Phạm vi bàn giao

Đây là ảnh tham chiếu mỹ thuật và mô tả thiết kế; chưa phải scene Three.js/GLB có thể chơi. Các góc là ảnh tạo theo cùng bố cục, không phải ảnh xuất từ một mesh duy nhất. Lấy ảnh Trước làm bố cục chuẩn, dùng ba ảnh còn lại để tham khảo mặt bên và vật liệu; cần thống nhất kích thước khi dựng mô hình. Gói này chưa được đưa lên GitHub.
