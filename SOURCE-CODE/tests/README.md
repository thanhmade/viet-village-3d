# Kiểm tra mã

Từ thư mục gốc: `node SOURCE-CODE/tests/run-checks.cjs`.

Các kiểm tra được chuyển từ bộ kiểm tra thực tế của dự án sang đường dẫn tương đối để dùng sau khi giải nén. Chúng tải Three.js r160 thật và lần lượt các script của bản xuất. Renderer và DOM được thay bằng mô phỏng để chạy không cần GPU.

Phạm vi: sáu lối vào/ra nhà; góc nhìn và va chạm phòng; giờ UTC+7, mùa/ngày đêm/mưa; đèn nhà; hướng và độ sáng trăng; chế độ chất lượng. Đây không phải kiểm thử đồ họa trên trình duyệt và không đo FPS.

`export-procedural-models.cjs` tạo lại 5 tệp Three JSON dẫn xuất từ mã hiện có. Chỉ chạy khi chủ ý muốn thay các bản model đã đóng gói; trang vẫn dựng cảnh từ mã thay vì đọc các JSON này.

## Bản đồ tổng — kiểm tra trình duyệt tùy chọn

Game không cần npm để chạy. Bộ kiểm tra giao diện riêng cần Node.js, Playwright và Chromium:

```sh
npm install --no-save --package-lock=false playwright@1.51.1
npx playwright install chromium
node SOURCE-CODE/tests/check-world-map-browser.cjs
```

Script tự mở HTTP server cục bộ, kiểm tra desktop và màn hình cảm ứng 390 × 844, rồi đóng server. Ảnh kiểm tra nằm trong thư mục tạm hệ điều hành. Không đưa `node_modules` lên GitHub. Kiểm tra này chạy riêng với `run-checks.cjs` vì cần trình duyệt.

Phạm vi: sáu mốc đúng tọa độ nguồn; chọn/zoom/fit; M/Esc; giữ nội thất khi đóng; về làng; pinch; màn hình không tràn ngang; thử lại khi tải lỗi; không nhân đôi điểm khi mở lại.
