# Thiết kế bản đồ tổng và các map con

## Cấu trúc sử dụng

**Toàn quốc → cụm địa danh → map trung tâm → map phụ nhận nhiệm vụ/luyện cấp.**

Bản đồ toàn quốc giữ đường bao, vị trí tương đối và địa giới của nền chính thức. Cụm địa danh tổ chức nội dung chơi; không thay thế hoặc vẽ lại ranh giới tỉnh. Mỗi địa danh có thể mở một cụm scene riêng sau khi được tích hợp vào game.

Người chơi chọn điểm trên bản đồ hoặc trong danh sách, xem giai đoạn lịch sử và các map liên quan, rồi chọn scene đã được phát triển. Bản xem HTML hiện tại kết thúc ở bước xem thiết kế; không có dịch chuyển thật.

## Tham khảo cách game tổ chức bản đồ

| Nguồn chính thức | Nội dung tham khảo | Cách áp dụng cho dự án |
|---|---|---|
| [Black Desert — World Map](https://blackdesert.pearlabyss.com/Asia/en-Us/Game/Wiki?_masterWikiNo=19) | Bản đồ thế giới 3D, các lớp thông tin, biểu tượng điểm/vùng, tìm kiếm và dẫn đường | Tách nền, địa giới, điểm địa danh và nội dung nhiệm vụ; cho người dùng bật/tắt lớp |
| [Guild Wars 2 — Explore the World](https://www.guildwars2.com/en/news/explore-the-world-of-guild-wars-2/) | Địa điểm khám phá, waypoint và NPC hướng dẫn | Địa danh lịch sử là điểm khám phá; cổng map/waypoint chỉ mở theo tiến trình chơi sau này |
| [Genshin Impact — Version 4.0 Update](https://genshin.hoyoverse.com/en/news/detail/112690) | Chức năng bản đồ nhiều lớp | Khi phát triển scene có hang hoặc thành nhiều tầng, tách sơ đồ tầng khỏi bản đồ toàn quốc |

Chỉ học cấu trúc điều hướng và phân lớp. Không sao chép bản đồ, biểu tượng, texture hoặc bố cục nguyên mẫu của các game. Chức năng nhiệm vụ, mở khóa và nhiều tầng nêu trên là thiết kế cho giai đoạn tích hợp tiếp theo.

## Các điểm địa danh đã bố trí

| Địa danh | Vùng hành chính đối chiếu năm 2025 | Bối cảnh/chương dự kiến | Trạng thái |
|---|---|---|---|
| Thăng Long | Hà Nội | Lý–Trần–Lê; cần chọn triều đại cụ thể cho mỗi scene | Có ảnh tham chiếu |
| Cổ Loa | Hà Nội | Khu thành theo hướng thời Ngô, thế kỷ X | Có ảnh tham chiếu |
| Vân Đồn | Quảng Ninh, vùng cảng đảo | Thương cảng thế kỷ XVI–XVII | Có ảnh tham chiếu |
| Bạch Đằng | Quảng Ninh | Hậu cần/bến sông thời Trần, 1288 | Có ảnh tham chiếu |
| Hoa Lư | Ninh Bình | Đinh–Tiền Lê | Có ảnh tham chiếu |
| Thành Nhà Hồ | Thanh Hóa | Nhà Hồ | Có ảnh tham chiếu |
| Lam Kinh | Thanh Hóa | Nhà Lê | Có ảnh tham chiếu |
| Huế | Huế | Nhà Nguyễn | Có ảnh tham chiếu |
| Hội An | Đà Nẵng | Đô thị và thương cảng thế kỷ XVII–XVIII | Có ảnh tham chiếu |
| Mỹ Sơn | Đà Nẵng | Kiến trúc Champa; cần chọn giai đoạn cụ thể | Có ảnh tham chiếu |
| Thành Hoàng Đế | Gia Lai | Tây Sơn, 1778–1793 | Đề xuất mới |
| Gia Định | Thành phố Hồ Chí Minh | Thành và bến sông, 1790–1835 | Đề xuất mới |
| Hà Tiên | An Giang | Trấn biển họ Mạc, thế kỷ XVIII | Đề xuất mới |
| Châu Đốc – Vĩnh Tế | An Giang | Thủy lộ nhà Nguyễn, sau 1824 | Đề xuất mới |

“Có ảnh tham chiếu” không đồng nghĩa đã có mô hình 3D hoặc scene chơi được. Các điểm là vị trí định hướng; không phải tọa độ cổng di tích đo đạc. Tên tỉnh mới dùng để tra cứu; tên địa danh lịch sử giữ nguyên.

Bộ hiện tại có 14 điểm tiêu biểu, chưa phải danh mục đầy đủ địa danh ở mọi vùng. Nền bản đồ vẫn giữ đủ toàn bộ 34 vùng; có thể bổ sung điểm Tây Bắc, Đông Bắc, Tây Nguyên và biển đảo sau khi chọn địa danh cùng nguồn lịch sử phù hợp.

## Làng và map phụ

**Làng Việt** là làng chính. **Làng tân thủ** là khu hướng dẫn riêng. Hai map chưa được gắn tọa độ thật nên được liệt kê ngoài lớp địa danh.

Map phụ **Ngoại ô Làng Việt – Đồng Tre** tổ chức một vùng an toàn nhận nhiệm vụ gần cổng, sau đó ra khu ruộng, rừng tre và bãi đá để luyện cấp. Phân bố đề xuất: ruộng cấp 1–3, rừng tre cấp 4–6, bãi đá/hang cấp 7–10. Các mức này cần cân bằng lại khi có hệ chiến đấu.

Khi thêm map phụ cho từng địa danh, dùng một vòng chơi ngắn: nhận nhiệm vụ ở khu an toàn → đi qua cổng/đường dẫn → hoàn thành hoạt động ở ngoại vi → quay về trả nhiệm vụ. Không đặt quái lên điểm hồi sinh hoặc lối đi chính.

## Kiến trúc và thời gian

Các vùng có thể đại diện những chương lịch sử khác nhau. Không trình bày tất cả là một triều đại cùng thời. Khi dựng scene, khóa giai đoạn rồi mới chọn cung điện, thành, vật dụng và trang phục.

Dùng vật liệu phù hợp địa phương: gỗ, tre, ngói, gạch, đất nện, đá và đá ong khi có căn cứ. Không đưa xe cơ giới, đường nhựa, dây điện, đèn điện hoặc nhà hiện đại vào cảnh phong kiến. Ảnh tham chiếu là concept game; việc phục dựng khảo cổ chính xác cần thêm tư liệu mặt bằng và niên đại từng công trình.

## Đưa nền vào Three.js ở giai đoạn sau

Bản đồ tổng nên là lớp atlas chọn vùng. Scene chơi của mỗi địa danh được tải riêng để kiểm soát dung lượng, mật độ vật thể và hiệu năng; không cần dựng toàn bộ Việt Nam ở mức chi tiết đi bộ trong một scene.

Các đường trong dữ liệu dùng tọa độ trang. Với viewBox `[vx, vy, w, h]`, chọn một hệ số `s` duy nhất, đổi điểm `(px, py)` sang mặt phẳng XZ bằng:

```text
x = (px - vx - w / 2) * s
z = (py - vy - h / 2) * s
y = 0
```

Tăng/giảm `s` cho toàn bản đồ. Không dùng hai hệ số riêng cho X và Z, không kéo giãn miền Trung, không phóng đảo riêng. Diện tích trên mặt phẳng game thay đổi đồng đều theo `s²`, giữ tương quan diện tích của bản đồ nguồn. Camera nghiêng chỉ thay đổi cách quan sát; ảnh gốc là bản đồ mặt phẳng, không phải dữ liệu cao độ.

Texture nền không chữ, đường địa giới và marker nên ở các lớp riêng. ID của tỉnh và địa danh trong JSON là khóa nối đến scene registry sau này. Vị trí cổng bên trong scene là một hệ tọa độ cục bộ riêng, không lấy trực tiếp từ tọa độ trang quốc gia.
