# Kiểm tra trước khi đưa lên nhánh VPS — 24/10/2026

## Đã thực hiện

- ZIP nguồn v0.2: kiểm tra tính toàn vẹn đạt.
- `node --check VPS/SERVER/src/index.mjs`: đạt.
- `sh -n` cho 4 script trong `VPS/DEPLOY/`: đạt.
- JSON của package/manifest và YAML Compose: đọc thành công.
- Kiểm tra cấu hình: API bind `127.0.0.1:3000`, database không publish port, mạng DB là internal.
- Không có `.env` thật, credential thực hoặc database dump trong tập tệp bổ sung.
- 15 phép kiểm tra script trong thư mục tạm: đạt. Bao gồm tạo mật khẩu và đồng bộ URL, quyền 0600, không in secret, không ghi đè env, gitignore, chặn nhánh main, backup thành công/thất bại, không để tệp dump dở, migration yêu cầu xác nhận và đọc hai SQL.

## Phạm vi và giới hạn

Các kiểm tra script dùng Docker/PostgreSQL giả lập để kiểm luồng lỗi, KHÔNG phải database thật.
Môi trường kiểm tra không có Docker CLI/daemon; chưa build image, chạy container, migrate/restore DB thật hoặc kiểm tải.
Chưa kiểm thử đăng nhập Google, SMTP, R2, trình duyệt Admin, kết nối Three.js hoặc bất kỳ VPS/production nào.
Các kết quả trên không chứng nhận hệ thống an toàn để công khai. Xem mục chặn production trong README.
