# Kiểm tra mã

Từ thư mục gốc: `node SOURCE-CODE/tests/run-checks.cjs`.

Các kiểm tra được chuyển từ bộ kiểm tra thực tế của dự án sang đường dẫn tương đối để dùng sau khi giải nén. Chúng tải Three.js r160 thật và lần lượt các script của bản xuất. Renderer và DOM được thay bằng mô phỏng để chạy không cần GPU.

Phạm vi: sáu lối vào/ra nhà; góc nhìn và va chạm phòng; giờ UTC+7, mùa/ngày đêm/mưa; đèn nhà; hướng và độ sáng trăng; chế độ chất lượng. Đây không phải kiểm thử đồ họa trên trình duyệt và không đo FPS.

`export-procedural-models.cjs` tạo lại 5 tệp Three JSON dẫn xuất từ mã hiện có. Chỉ chạy khi chủ ý muốn thay các bản model đã đóng gói; trang vẫn dựng cảnh từ mã thay vì đọc các JSON này.

`check-portals.cjs` chạy hành trình thật qua điều khiển/pathfinding trong harness: sáu nhà, điểm xuất hiện, giữ trạng thái, bước ngang, hủy trước 0,8 giây, vào lại, joystick/nút, lối ra quanh đồ đạc, chờ map, lỗi tải và chống lặp. Thông báo `Test load failure` là lỗi được cố ý tạo trong kiểm thử, không phải lỗi game đang chạy. Renderer vẫn là mock; cần thử WebGL và thiết bị thật.

`check-auth.mjs` dùng SDK Firebase mô phỏng chỉ trong unit test. Kiểm tra cấu hình thiếu/sai, phiên không có Google, UID/project sai, hết hạn, tài khoản bị vô hiệu hóa, xác minh đồng thời, hồ sơ tạm không chứa email/token, khóa game khi đăng xuất và không mở lại bởi phản hồi đến muộn, mất mạng/kết nối lại. Harness kiểm tra chưa xác thực thì không tạo renderer; phím Space không bị điều khiển game chặn trên nút đăng nhập/đăng xuất. Bộ kiểm tra được chạy bằng Node.js hiện có trên máy; các ES module `.js` cần Node.js 22.7 trở lên với syntax detection mặc định.

Lệnh `node SOURCE-CODE/tests/run-checks.cjs` chạy cả sáu nhóm. Có thể chạy riêng `node SOURCE-CODE/tests/check-auth.mjs`. Harness không chạy entry module Firebase thật, không ghi dữ liệu cloud và không phải chứng cứ đăng nhập Google thành công.

Kiểm thử thật tại `http://localhost:8000/SOURCE-CODE/index.html` bằng Chrome/Edge:

1. Chưa đăng nhập: chỉ thấy Google Login; không vào được game.
2. Hoàn tất popup Google với tài khoản thử nghiệm: thấy trang chào và nút vào game; kiểm tra mở được cảnh 3D.
3. Tải lại cùng tab: Firebase xác minh trước khi mở game, không chỉ tin user đã lưu.
4. Đăng xuất từ trang chào hoặc Công cụ: quay lại Google Login; thử Space/Enter trên nút, đăng nhập lại và mở game.
5. Tắt mạng rồi bật lại: game khóa, chỉ mở sau khi Firebase xác minh lại.
6. Đóng popup trước khi xong: hiển thị thông báo, chưa mở game; thử đăng nhập lại.
7. Kiểm tra Console/Network, WebGL, vào/ra nhà và thời tiết sau đăng nhập. Không sửa Security Rules hoặc dùng tài khoản/token giả để vượt màn hình đăng nhập.
