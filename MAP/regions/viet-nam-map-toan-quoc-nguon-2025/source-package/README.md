# Việt Nam — bản đồ tổng cho VIET VILLAGE 3D

Bản dựng ngày 11/10/2026. Nền hành chính theo bản đồ Việt Nam **năm 2025, 34 đơn vị cấp tỉnh**, do Cục Đo đạc, Bản đồ và Thông tin địa lý Việt Nam công bố. Giữ hình học nguồn và tỷ lệ thu phóng đồng nhất hai chiều.

## Mở và sử dụng

1. Giải nén toàn bộ gói.
2. Mở `04_Xem_Ban_Do.html` bằng trình duyệt. Tệp tự chứa hình và dữ liệu, không cần máy chủ hoặc kết nối mạng.
3. Kéo để di chuyển, cuộn hoặc dùng nút +/− để thu phóng. Chọn địa danh hoặc tìm tỉnh trong bảng bên cạnh. Có thể bật/tắt lớp địa giới và điểm vào map.
4. Để lấy ảnh sạch cho thiết kế, dùng ba PNG hoặc SVG bên dưới. Chữ trong bảng điều khiển HTML không nằm trong ảnh xuất.

## Các tệp chính

| Tệp | Nội dung |
|---|---|
| `01_Viet_Nam_Nen_Khong_Chu.png` và `.svg` | Nền Việt Nam, ẩn ranh giới nội bộ |
| `02_Viet_Nam_Dia_Gioi_Khong_Chu.png` và `.svg` | Nền có địa giới 34 vùng cấp tỉnh |
| `03_Viet_Nam_Diem_Vao_Map_Khong_Chu.png` và `.svg` | Nền hành chính cùng 14 điểm địa danh |
| `04_Xem_Ban_Do.html` | Bản xem ngoại tuyến, chọn tỉnh và địa danh |
| `data/map-data.json` | Dữ liệu 34 vùng, 14 địa danh, trạng thái map và hai làng chưa gán vị trí |
| `data/ranh-gioi-34-vung-nguon.json` | Hình học trích xuất, tọa độ trang bản đồ; không phải GeoJSON WGS84 |
| `data/kiem-tra-phep-chieu.json` | Thông số hệ quy chiếu và kiểm tra biến dạng diện tích |
| `sources/` | PDF chính thức, SVG đã trích xuất và dữ liệu đầu vào |
| `docs/THIET_KE_MAP_TOAN_QUOC.md` | Cấu trúc bản đồ và các cụm map cho game |
| `docs/NGUON_VA_DO_CHINH_XAC.md` | Nguồn, phương pháp và giới hạn độ chính xác |

Cả ba PNG có kích thước **4971 × 6000 px**, không có chữ hiển thị. SVG có thể xuất ở kích thước khác mà không kéo giãn riêng từng chiều.

Ở ảnh số 03: **chấm vàng tròn** là map đã có bộ ảnh tham chiếu; **hình thoi rỗng** là map mới đề xuất. Ký hiệu được phóng lớn để nhận biết, không biểu thị diện tích công trình.

## Phạm vi bàn giao

Đây là nền bản đồ và bộ thiết kế lựa chọn map. Gói chưa chứa địa hình 3D có cao độ, nhân vật, quái, logic nhiệm vụ hoặc chuyển scene chơi được. Màu sắc nền là phong cách minh họa bản đồ, không biểu thị cao độ.

Tên các ZIP map địa danh trong JSON giúp đối chiếu các gói ảnh đã tạo trước; những ZIP đó không được lặp lại bên trong gói bản đồ tổng. Gói **Ngoại ô Làng Việt – Đồng Tre** được cung cấp riêng. Làng Việt và làng tân thủ chưa có tọa độ địa lý thật, vì vậy không đặt tùy tiện lên bản đồ quốc gia.

## Tái tạo

Các tệp cuối đã sẵn dùng. Nếu muốn tái tạo bằng Python, cần `lxml`, `cairosvg`, `Pillow`, `numpy`, `pyproj`, `shapely`; chạy lần lượt tại thư mục gói:

```bash
python3 build_art.py
python3 build_data.py
python3 build_markers.py
python3 build_viewer.py
```

Giữ nguyên các tệp trong `sources/` và `data/`. Báo cáo kiểm tra hình học nằm trong `art-validation.json`, `marker-validation.json`. Trạng thái kiểm tra bản xem nằm trong `viewer-validation.json`.

## Trạng thái kiểm tra

Đã kiểm tra trực quan ảnh bản đồ và kiểm tra tự động việc giữ hình học nguồn, số vùng/địa danh, kích thước PNG, không có text hiển thị trong SVG. 14 kiểm tra logic JavaScript của bản HTML đạt, gồm tìm kiếm, lọc, lựa chọn và bật/tắt lớp.

Chưa kiểm tra hiển thị và thao tác trực tiếp trên trình duyệt vì môi trường chạy Chromium bị chặn. Vì vậy bố cục trên từng màn hình và thao tác cảm ứng cần được kiểm tra thêm khi tích hợp. Các PNG/SVG dùng độc lập với bản HTML.
