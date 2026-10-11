# SỬA LỖI CHUYỂN VŨ KHÍ — V1.2

Đây là bản sửa tiếp theo vì người dùng vẫn chưa thể chọn các vũ khí khác sau V1.1. **Không xác nhận được trạng thái mã đã cài trên máy của người dùng**, vì vậy bản này có cơ chế nhận dạng phiên bản và tự kiểm tra trực tiếp.

## Triệu chứng

Bấm vào Côn, Rìu, Thương, Cung nhưng vẫn hiển thị Kiếm hoặc trạng thái không đổi.

## Cập nhật chính

- Đầu trang hiển thị rõ **V1.2**; HTML, CSS, `main.js`, `models.js` dùng phiên bản URL để tránh cache cũ.
- Điều khiển chọn vũ khí dùng một handler duy nhất trên thanh bên, tương thích khi bấm biểu tượng hoặc chữ.
- Khi tạo mô hình thất bại, hiển thị thông báo **màu đỏ** ngay trong mục thông tin và ghi lỗi ở `F12 → Console`.
- Trạng thái chọn được cập nhật sau khi mô hình mới được tạo; tháo mô hình/VFX cũ an toàn, lỗi dọn dẹp không ngăn cập nhật.
- Thêm nút **TỰ KIỂM TRA 5 VŨ KHÍ**, chuyển thử lần lượt và kiểm tra tên, trạng thái, mô hình 3D; sau đó về lại vũ khí đã chọn.
- `window.__WEAPON_VFX_DIAGNOSTICS__` và `window.__weaponVfxSelfTest()` cho chẩn đoán trong F12 Console.

## Cài trên Windows

1. Giải nén ZIP V1.2 vào bất kỳ thư mục tạm ngoài dự án (ví dụ Downloads).
2. Nháy đúp `INSTALL-V1.2.bat`. Bộ cài kiểm tra đúng `VFX-DEMO/index.html` và `src/models.js`, sau đó sao lưu bốn tệp cũ vào `BACKUP-BEFORE-V1.2` và chép đè `index.html`, `src/main.js`, `src/models.js`, `src/style.css`.
3. Mở `http://localhost:8765/?build=1.2.0`. Nếu không được, chạy `START-DEMO.bat` trong VFX-DEMO rồi truy cập lại.
4. **Xác nhận nhãn V1.2 ở góc phải**, nhấn nút `TỰ KIỂM TRA 5 VŨ KHÍ`.
5. Khi gặp lỗi gửi lại ảnh mục thông tin bên phải và F12 Console.

Vị trí đích đã cấu hình sẵn:
`H:\CHAT GPT\3D-GAME\VIET-VILLAGE-3D\VIET-VILLAGE-3D-CAP-NHAT\ASSETS\WEAPONS\VFX-DEMO`

Nếu folder thực tế không ở đường dẫn trên, kéo thư mục VFX-DEMO và thả vào `INSTALL-V1.2.bat`.

**Quan trọng:** Máy chủ `localhost:8765` có thể đang phục vụ thư mục khác. Nếu nhãn V1.2 không xuất hiện dù đã cài đúng, hãy đóng cửa sổ máy chủ Python cũ, chạy lại `START-DEMO.bat` từ chính thư mục VFX-DEMO.

Gói này chỉ cập nhật demo thử nghiệm, không sửa Firebase/GitHub/game chính.
