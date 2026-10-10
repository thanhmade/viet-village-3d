# Báo cáo xuất dự án — 10/10/2026

## Phạm vi đã tiếp cận

Đã rà soát nội dung yêu cầu trong cuộc trò chuyện hiện tại; checkout mã nguồn trang đang chạy; 9 commit Git; các tệp upload còn trong workspace; và kết quả tìm kiếm các ảnh/tài liệu cùng dự án trong những cuộc trò chuyện liên quan. Những cuộc trò chuyện được tìm thấy gồm định hướng làm game, thiết kế nhân vật 3D và các yêu cầu tạo map/cổng/nhà/nội thất.

Chỉ truy xuất được những đoạn ngữ cảnh liên quan của cuộc trò chuyện khác, **không có bản xuất nguyên văn toàn bộ lịch sử chat**. Những ảnh từng bị giao diện báo “không đọc được” đã tìm lại được trong upload hiện tại. Không có quyền truy cập ổ H: trên máy người dùng; ZIP cần được người dùng tải và giải nén tại đó.

Nguồn mã: bản phát hành v8 của trang `https://dao-kho-bau-toan-3d-thanh.chuotcodoc.chatgpt.site`, commit `d36f5be347d606e23e4f06a42630707fd14435d3`. Gói xuất không thay đổi trang đang hoạt động.

## Đã xuất thành công

| Hạng mục | Tệp/mã thực tế có trong gói | Trạng thái sử dụng |
|---|---|---|
| HTML/CSS/JavaScript | SOURCE-CODE/index.html, style.css và 16 phần mã theo hạng mục | Đã tách từ mã gốc; kiểm tra logic khởi tạo thành công |
| Three.js | ASSETS/vendor/three.min.js, r160, giấy phép MIT | Chạy từ tệp cục bộ, không phụ thuộc CDN |
| Map | Nền làng, sân cây đa, đình, sáu nhà, vườn rau, hồ sen/cầu, tre/cây, đường đá | Có hình học 3D bằng mã; chưa xác nhận trùng khớp hoàn toàn ảnh |
| Cổng làng | Mã cổng, mái ngói, đầu cuộn, cột gỗ, hàng rào và cây trang trí | Có trong map và các góc xem cổng |
| Nhà dân | Mã nhà mái ngói, hiên bốn cột, cửa, móng, sân, rào tre, chum, củi | Có sáu nhà; một bản xem riêng bốn phía |
| Nội thất | Sàn gạch, tường, cửa sổ, xà mái, bàn/ghế, bàn học, rương, giường, tủ, ấm/chén | Một mẫu chung cho sáu nhà; vào/ra và di chuyển có va chạm |
| Nhân vật hiện có | CHARACTERS/player-procedural.js và mô hình khối Three JSON | Có mã/mô hình đơn giản; đang ẩn trong chế độ bối cảnh |
| Ảnh tham chiếu đang dùng | 17 PNG: 5 map, 4 cổng, 4 nhà, 4 nội thất | Có trong ASSETS và bản sao phân loại |
| Ảnh nguyên gốc tìm lại | 28 PNG: 6 nhân vật, 5 map, 9 cổng/chi tiết, 4 nhà, 4 nội thất | Ảnh tham chiếu, gồm nhiều phiên bản; không phải 28 mô hình 3D |
| Đính kèm cuộc trò chuyện | 17 ảnh upload gốc, 4 PowerPoint gốc | Đã giữ nguyên byte; có checksum |
| Mô hình dẫn xuất | 5 tệp Three JSON: nhân vật, map, nhà, cổng, nội thất | Xuất từ mã hình học thực tế; không phải tài nguyên GLB do tác giả cung cấp |
| Môi trường | UTC+7; chọn/tua giờ; hai mùa; quang/mây/mưa/sương; mặt trời/trăng/sao; bóng; độ ướt | Có mã hoạt động; mô phỏng gần đúng |
| Đèn nhà | Ô cửa phát sáng, đèn hắt hiên và cửa sổ; đèn phòng | Bật/tắt theo giờ, chuyển tiếp mượt; có giới hạn bóng đổ |
| Mã trò chơi cũ | 12 câu hỏi cơ bản và 12 nâng cao, mã thu thập/đáp án/tiến độ | Được giữ để tránh mất dữ liệu; hiện tắt theo yêu cầu chỉ xây bối cảnh |
| Sao lưu | dist nguyên trạng v8, Git bundle đủ 9 commit, 9 HTML lịch sử và script phát triển còn truy cập được | Có thể phục hồi bằng Git; các helper cũ không được coi là công cụ chạy hiện tại |

Số ảnh nêu trên là theo nguồn. Có bản sao giữa ASSETS, các thư mục phân loại và BACKUP; không nên cộng tổng số tệp PNG để suy ra số tài nguyên độc lập.

## Chưa có tệp nguồn / chưa tìm thấy

| Nội dung | Bằng chứng/phạm vi tìm kiếm | Việc cần làm nếu tiếp tục dự án |
|---|---|---|
| Nhân vật cậu bé hoàn chỉnh theo ảnh | Tìm được 6 ảnh PNG; mã hiện tại chỉ dựng nhân vật khối; không tìm thấy GLB/GLTF/FBX/OBJ/BLEND của dự án trong dữ liệu truy cập được | Dựng model theo ảnh, UV/texture, rig và animation; tích hợp vào chế độ chơi |
| Model tác giả riêng cho cổng/nhà/map/nội thất | Không có các tệp model ngoài mã procedural hiện có; các Three JSON trong gói là bản dẫn xuất mới khi xuất | Nếu có tệp tác giả lưu nơi khác cần cung cấp; hoặc dựng lại/chi tiết hóa theo ảnh |
| Texture PBR, normal/roughness maps | Bản chạy dùng vật liệu màu/hình học và ảnh gallery; không tìm thấy bộ texture PBR dự án | Tạo texture nếu cần chất lượng gần ảnh tham chiếu |
| Âm thanh/nhạc nền đã thu | Không có tệp âm thanh trong checkout/upload liên quan; chỉ có hàm phát tiếng bíp tổng hợp | Tạo/cung cấp âm thanh khi phát triển gameplay |
| Toàn bộ transcript các cuộc trò chuyện khác | Công cụ chỉ trả ngữ cảnh từng phần, không có tệp xuất nguyên văn | Nếu cần lưu đầy đủ, bổ sung bản xuất chat do người dùng cung cấp |
| Phiên bản/tài nguyên nằm trên máy hoặc dịch vụ khác | Chỉ kiểm kê được checkout, upload và kết quả truy xuất hiện tại; không thể chứng minh không tồn tại bản khác | Bổ sung những tệp chưa chia sẻ, rồi nhập vào dự án |

Không tạo tệp rỗng giả làm GLB/FBX hoặc âm thanh để lấp các thư mục.

## Phần cần xây dựng hoặc hiệu chỉnh

- Bố cục và chi tiết map cần được đối chiếu thêm với ảnh. Người dùng đã phản hồi map còn sai một số phần; phiên xuất này giữ đúng nguồn hiện có, không tuyên bố đã sửa hết khác biệt.
- Nội thất đang là phòng mẫu độc lập, không phải không gian liên tục nằm bên trong vỏ mỗi nhà trong map. Sáu nhà dùng chung một nội thất.
- Nhân vật trong mã không có hình dáng/rig của cậu bé tham chiếu. Chế độ bối cảnh hiện tại không điều khiển nhân vật ngoài làng.
- Nhiều cấp độ/nhiệm vụ thu thập, câu đố, điểm số chưa được tích hợp hoạt động trong bản bối cảnh. Không chỉ bật lại mã cũ là có trò chơi hoàn chỉnh: cần rà soát va chạm, điểm nhiệm vụ, tiến độ và giao diện trên map nhà mới.
- Đèn trăng/sao có tăng sáng để dễ nhìn đường; không mô phỏng pha trăng, tọa độ thiên văn hoặc cường độ chiếu sáng vật lý chính xác. Chưa có thời tiết trực tiếp hay hệ thống bốn mùa; hiện là hai mùa theo thiết kế Nam Bộ.
- Bộ câu hỏi cũ và PowerPoint cần được giáo viên rà soát độ phù hợp học sinh lớp 6 trước khi mở chế độ học tập. Phiên xuất này chưa thẩm định nội dung giáo dục.
- Chưa kiểm thử GPU/trình duyệt, hiệu suất điện thoại hoặc màn hình tương tác trong phiên đóng gói. Bộ kiểm tra hiện có chỉ chứng minh logic, hình học và đường dẫn ở phạm vi nêu trong VALIDATION.md.

## Cách đọc nguồn gốc và kiểm tra dữ liệu

`IMAGE-PROVENANCE.json` ánh xạ 28 ảnh tìm lại được sang đường dẫn trong ZIP. `FILE-SOURCES.json` ghi nguồn của các bản sao và phần mã. `FILE-INVENTORY.csv`/`SHA256SUMS.txt` ghi kích thước và SHA-256 các tệp; danh mục không tự tính checksum của chính nó để tránh vòng lặp.
