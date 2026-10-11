# Bản đồ tổng Việt Nam

Thư mục bản đồ tổng của VIET VILLAGE 3D. Ảnh nền không có chữ; tên địa danh nằm ở bảng điều khiển riêng.

## Sử dụng trong game

- Mở game từ thư mục gốc qua HTTP, bấm **Xem bối cảnh 3D**, rồi **Bản đồ Việt Nam**, hoặc phím **M**.
- Kéo bản đồ bằng chuột/ngón tay. Cuộn chuột, chụm hai ngón hoặc dùng nút +/− để zoom. Nút khung ngắm đưa về toàn cảnh.
- Chọn điểm vàng hoặc tên địa danh. **Xem vị trí** phóng tới điểm đã chọn.
- **Quay lại game** hoặc Esc giữ nguyên góc nhìn/vị trí trước khi mở. **Về làng chính** thoát nội thất nếu có và đưa camera về toàn cảnh làng.
- Cảnh 3D phía sau dừng cập nhật và vẽ khi bản đồ mở, tránh chạy hai phần đồ họa cùng lúc trên điện thoại.

Thăng Long, Hoa Lư, Thành Nhà Hồ, Huế, Hội An, Mỹ Sơn là các mốc chọn trên bản đồ. Scene chơi chi tiết của các địa danh và làng tân thủ chưa có trong nhánh này nên nút vào các map đó chưa bật. Làng hiện có vẫn là làng chính.

## Tệp

| Tệp | Vai trò |
|---|---|
| `world-map-ui.js`, `world-map-ui.css` | Cửa sổ bản đồ responsive và điều khiển chuột/cảm ứng/bàn phím |
| `map-config.json` | Khung tọa độ, nguồn bản đồ và nội dung điểm đến |
| `diem-vao-map.json` | Sáu tọa độ địa danh và nguồn từng điểm |
| `ban-do-nen-khong-chu.png` | Texture 3394 × 4096, được giao diện nạp khi mở lần đầu |
| `ban-do-nen-khong-chu.svg` | Bản vector để chỉnh mỹ thuật mà giữ đường biên |
| `ranh-gioi-34-vung.json` | Đường biên gốc theo tọa độ trang PDF, 34 vùng đất liền |
| `viet-nam-world-map.glb` | Mô hình nền 3D phẳng nâng khối, texture nhúng và biểu tượng; để phát triển tiếp, chưa nạp trong giao diện bản đồ hiện tại |

## Nguồn và phạm vi chính xác

Nguồn chính thức: https://vnsdi.mae.gov.vn/downloads/hcvn_9tr_2025.pdf

Bản đồ hành chính Việt Nam **2025**, **1:9.000.000**, 34 đơn vị cấp tỉnh. Đơn vị chủ quản ghi trên nguồn: Cục Đo đạc, Bản đồ và Thông tin địa lý Việt Nam. Tải ngày 11/10/2026; mã SHA-256 của PDF được ghi trong `map-config.json` và `ranh-gioi-34-vung.json`.

Giữ hình học vector của nguồn, không kéo giãn riêng từng miền. Đảo, bãi và ký hiệu san hô giữ cách thể hiện và vị trí trên bản đồ nguồn, gồm khu vực Hoàng Sa và Trường Sa. Không tự thêm đường phân định trên biển. Mức chi tiết phù hợp bản đồ tổng, không phải dữ liệu khảo sát hoặc địa chính. Mốc hành chính là mốc nguồn 2025; chưa khẳng định mọi thay đổi sau đó đã được cập nhật.

Tọa độ các điểm di tích được đặt qua georeference bốn góc PDF đã làm tròn; chưa áp dụng bộ tham số chuyển datum VN-2000/WGS84 chính thức. Hoa Lư là điểm đại diện xấp xỉ. Vì vậy chỉ dùng các mốc để chọn map toàn quốc, không dùng định vị cấu kiện di tích. Nguồn tọa độ từng điểm nằm trong `diem-vao-map.json`.

GLB nâng đất đồng đều để nhìn rõ đường bao, không phải dữ liệu độ cao. Các công trình là biểu tượng loại điểm đến, không phải phục dựng khảo cổ. Đường chia hành chính hiện đại là lớp định hướng theo yêu cầu thiết kế; không đại diện ranh giới của một triều đại. Lớp mỹ thuật phong kiến và địa hình chi tiết sẽ được xây riêng ở các scene địa phương.

## Kết nối scene mới

Script dùng Three.js r160 đã có trong game; không tải thêm một bản Three.js hoặc CDN. Nền bản đồ là giao diện 2D phía trên cảnh 3D, dùng chung tọa độ nguồn. Chỉ khi scene chi tiết đã sẵn sàng mới đăng ký bộ xử lý, ví dụ:

```js
// loadHueScene là hàm thực tế do module scene của game cung cấp.
VietnamWorldMap.registerDestination('hue', async (site) => {
  await loadHueScene(site);
});
```

Đăng ký sẽ bật nút **Vào khu vực** tương ứng. Khi chuyển scene lỗi, cửa sổ bản đồ giữ lại và báo thử lại. Sự kiện `vietnam-map-select` phát ra khi đổi điểm chọn; nó không tự chuyển scene hoặc dịch chuyển nhân vật.

Không đổi đường dẫn tương đối của PNG/JSON riêng lẻ. Phục vụ website từ thư mục gốc repository để đường dẫn `../MAP/` trong `SOURCE-CODE/index.html` hoạt động cả trên localhost và khi website ở thư mục con.
