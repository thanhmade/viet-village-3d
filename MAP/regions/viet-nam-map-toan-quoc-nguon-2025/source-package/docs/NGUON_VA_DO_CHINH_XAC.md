# Nguồn và độ chính xác

## Nền địa lý và địa giới

Nguồn chính: **Cục Đo đạc, Bản đồ và Thông tin địa lý Việt Nam — Bản đồ hành chính Việt Nam 2025**, tỷ lệ công bố **1:9.000.000**.

- PDF: https://vnsdi.mae.gov.vn/downloads/hcvn_9tr_2025.pdf
- Đối chiếu nghị quyết sắp xếp đơn vị cấp tỉnh: https://baochinhphu.vn/nghi-quyet-cua-quoc-hoi-ve-sap-xep-don-vi-hanh-chinh-cap-tinh-102250612191145158.htm
- Cổng bản đồ hành chính của Nhà xuất bản Tài nguyên – Môi trường và Bản đồ Việt Nam: https://sapnhap.bando.com.vn/
- Ngày tra cứu: 11/10/2026.
- Mốc nội dung bản đồ: **2025; 34 đơn vị cấp tỉnh**. Metadata PDF ghi thời điểm tạo lại 24/05/2026; điều đó không đổi mốc hành chính in trên bản đồ.
- SHA-256 PDF: `8caa80f799a05960f6343f1e93a77e55997d0e3933bbf2e2f66f5a51289d2cf9`.

PDF gốc được giữ trong `sources/` để đối chiếu. SVG đầu vào là bản trích xuất phục vụ thiết kế: đã bỏ nhãn, đường giao thông và thành phần trình bày không cần thiết. Hình học của nền, bờ biển, đảo, ký hiệu bãi/san hô, biên giới và địa giới được giữ để dựng nền mới. 34 đường vùng cấp tỉnh dùng cho thao tác chọn được lấy từ lớp hành chính đất liền trong PDF; chúng không phải bộ hồ sơ địa giới biển của từng tỉnh.

## Giữ tỷ lệ và phạm vi

- Giữ cùng viewBox và cùng hệ số thu phóng X/Y. Không nắn các miền cho đẹp bố cục.
- Giữ phạm vi và vị trí đảo/quần đảo theo bản đồ công bố, gồm Hoàng Sa và Trường Sa. Không gom vào ô phụ hoặc phóng đại riêng.
- Không thêm đường yêu sách biển hoặc tự suy diễn ranh giới biển.
- Kiểm tra tự động so với SVG trích xuất: **3.220 phần tử nguồn**, gồm **2.616 path và 461 ký hiệu use**, giữ nguyên thuộc tính hình học. Việc kiểm tra này xác nhận bước tạo màu mới không sửa hình học; không phải chứng nhận độ chính xác đo đạc của bản đồ gốc.
- Màu tỉnh, nét viền, sắc độ và vân biển là cách trình bày. Chúng không phải DEM, bản đồ thổ nhưỡng hoặc dữ liệu độ sâu.
- Tỷ lệ 1:9.000.000 áp dụng bản công bố ở kích thước gốc. PNG trên màn hình có kích thước hiển thị thay đổi, không được hiểu là luôn giữ tỷ lệ in đó.

## Phép chiếu và tương quan diện tích

WKT nhúng trong PDF xác nhận Lambert Conformal Conic, hệ quy chiếu Vietnam 2000, ellipsoid WGS 84; vĩ tuyến chuẩn 11°/21°, kinh tuyến trục 108°, vĩ độ gốc 4°, dịch đông 1.000.000 m.

Kiểm tra hệ số diện tích bằng `pyproj.Proj.get_factors` tại 2.737 điểm trong miền chẩn đoán **8–24°B, 102–110°Đ** cho kết quả:

| Đại lượng | Kết quả |
|---|---:|
| Hệ số diện tích nhỏ nhất | 0,992450 |
| Hệ số diện tích lớn nhất | 1,012103 |
| Biến dạng diện tích cục bộ so với ellipsoid | −0,755% đến +1,210% |
| Chênh lệch tương đối lớn nhất giữa các mẫu | 1,980% |

Đây là **riêng ảnh hưởng của phép chiếu** trong miền kiểm tra, không phải tổng sai số bản đồ, không bao trùm mọi đảo phía nam/đông, không phải phép đối chiếu diện tích pháp lý từng tỉnh. Bản đồ tỷ lệ nhỏ đã khái quát hóa bờ biển và ranh giới; không dùng để đo thửa đất, xác định ranh trên thực địa hoặc tính diện tích pháp lý. Tỷ lệ diện tích được giữ gần thực ở mức bản đồ tổng, không cam kết trùng tuyệt đối với số liệu hành chính.

## Điểm địa danh

14 điểm được dùng để định hướng và chọn map. Một số lấy tọa độ đã dùng trong bộ thiết kế trước; các điểm bổ sung là vị trí đại diện vùng do thiết kế ước lượng. Mỗi điểm ghi rõ `coordinate_quality` trong JSON. Nguồn lịch sử xác nhận địa danh/bối cảnh, không mặc nhiên xác nhận tọa độ.

Chuyển đổi marker dùng tham số phép chiếu và phép biến đổi trang trích xuất. Chưa áp dụng một bộ tham số chuyển datum WGS84–VN2000 được hiệu chuẩn chính thức; vì vậy vị trí marker chỉ phù hợp định hướng trên bản đồ tổng. Không dùng làm tọa độ dẫn đường đến cổng di tích.

Vân Đồn là điểm đại diện vùng cảng đảo nên có thể nằm ngoài polygon hành chính đất liền. Làng Việt và làng tân thủ không có tọa độ, không xuất hiện thành điểm giả trên bản đồ quốc gia.

## Nguồn lịch sử cho bốn map đề xuất

| Map | Nguồn và phần dùng |
|---|---|
| Thành Hoàng Đế | [Cổng du lịch tỉnh Bình Định](https://dulichquynhon.binhdinh.gov.vn/vi/thanhhoangde): giai đoạn Tây Sơn và cấu trúc thành. Địa chỉ hành chính trên bài cũ không dùng làm ranh giới hiện hành. |
| Gia Định | [Bảo tàng Lịch sử Quốc gia](https://baotanglichsu.vn/VI/Articles/3096/70886/thanh-co-nam-bo-dau-tich-thanh-gia-djinh.html): thành năm 1790, cổng, hào và các khu chức năng; chọn bối cảnh trước khi thành bị phá năm 1835. |
| Hà Tiên | [Cục Di sản văn hóa](https://dsvh.gov.vn/le-gio-lan-thu-281-duc-khai-tran-mac-cuu-1221): lịch sử Mạc Cửu và mốc 1708; không dùng bài này để khẳng định mặt bằng trấn. |
| Châu Đốc – Vĩnh Tế | [Cổng An Giang — bối cảnh đào kênh](https://angiang.gov.vn/vi/boi-canh-lich-su-va-y-nghia-chien-luoc-cua-su-kien-dao-kenh-vinh-te) và [kỷ niệm hoàn thành](https://angiang.gov.vn/vi/nhieu-hoat-dong-y-nghia-ky-niem-200-nam-hoan-thanh-kenh-vinh-te): khởi đào 1819, hoàn thành 1824; chọn bối cảnh sau 1824. |

Nguồn của các địa danh đã có ảnh nằm trong trường `source` của từng mục ở `data/map-data.json`. Thiết kế nhiệm vụ, bố trí NPC, bãi luyện cấp và các chi tiết bổ sung phục vụ game là đề xuất sáng tạo, không phải dữ kiện khảo cổ.
