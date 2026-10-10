# Kiểm tra mã

Từ thư mục gốc: `node SOURCE-CODE/tests/run-checks.cjs`.

Các kiểm tra được chuyển từ bộ kiểm tra thực tế của dự án sang đường dẫn tương đối để dùng sau khi giải nén. Chúng tải Three.js r160 thật và lần lượt các script của bản xuất. Renderer và DOM được thay bằng mô phỏng để chạy không cần GPU.

Phạm vi: sáu lối vào/ra nhà; góc nhìn và va chạm phòng; giờ UTC+7, mùa/ngày đêm/mưa; đèn nhà; hướng và độ sáng trăng; chế độ chất lượng. Đây không phải kiểm thử đồ họa trên trình duyệt và không đo FPS.

`export-procedural-models.cjs` tạo lại 5 tệp Three JSON dẫn xuất từ mã hiện có. Chỉ chạy khi chủ ý muốn thay các bản model đã đóng gói; trang vẫn dựng cảnh từ mã thay vì đọc các JSON này.
