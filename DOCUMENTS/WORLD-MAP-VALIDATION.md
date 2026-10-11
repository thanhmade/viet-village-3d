# Kiểm tra tích hợp bản đồ tổng

Ngày: 11/10/2026. Mục tiêu: nhánh `test/new-features`.

## Kết quả

- Kiểm tra hồi quy `check-interior.cjs`, `check-climate.cjs`, `check-house-lights.cjs`, `check-moonlight.cjs`: đạt.
- Trình duyệt Chromium 134, Playwright 1.51.1, WebGL SwiftShader: đạt trên viewport desktop 1440 × 1000 và mô phỏng cảm ứng 390 × 844.
- Sáu điểm chọn khớp tọa độ dữ liệu nguồn trong phạm vi 0,017 pixel hiển thị. Đây là kiểm tra phép chiếu lên giao diện, không phải khẳng định sai số tọa độ ngoài thực địa.
- Chọn điểm, zoom/fit, phím M/Esc, trả focus, đóng giữ nội thất, về làng, pinch hai ngón, thử lại sau lỗi tải và mở lại không nhân đôi điểm: đạt.
- Không ghi nhận JavaScript page error trong lượt kiểm tra desktop/mobile.

## Phạm vi bàn giao

Giao diện bản đồ dùng PNG không chữ và tọa độ từ bản đồ nguồn hành chính 2025. GLB, SVG và dữ liệu đường biên được đặt cùng thư mục để phát triển tiếp. Giao diện hiện tại chưa nạp GLB, chưa có cảnh chơi di tích hoặc làng tân thủ. Nút vào cảnh chưa dựng được vô hiệu hóa.

Chưa đo FPS trên điện thoại vật lý. Không chạy lại kiểm tra model xuất vì các model cũ không thay đổi. Chạy lại giao diện bằng `node SOURCE-CODE/tests/check-world-map-browser.cjs` theo hướng dẫn trong thư mục tests.
