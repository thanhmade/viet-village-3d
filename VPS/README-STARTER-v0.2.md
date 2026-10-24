# VIET VILLAGE 3D — VPS Starter v0.2 (STAGING ONLY)

Bản mở rộng từ gói v0.1, **không thay đổi game hiện hành**, không tự push GitHub, không triển khai production. Định hướng PostgreSQL + Node.js/Express + Google ID Token + Cloudflare R2.

## Nội dung
- `SERVER/src/index.mjs`: đăng ký, đăng nhập, xác minh email, quên/đặt lại mật khẩu, Google ID Token, cookie phiên, danh sách/tạo nhân vật; chỉ admin mới xem được `/admin`.
- `SERVER/sql/001_init.sql`, `002_security_storage.sql`: database và bảng token/metadata upload.
- `DEPLOY/compose.yaml`: DB riêng trên mạng Docker internal, API chỉ bind `127.0.0.1:3000` của máy host.
- `DEPLOY/migrate.sh`: áp dụng các SQL idempotent sau khi nâng cấp database v0.1; `backup.sh`: dump DB (cần sao lưu ra vị trí ngoài VPS).

## Thử nghiệm local (chỉ trên máy phát triển)
1. `cd DEPLOY && cp .env.example .env`; tạo mật khẩu ngẫu nhiên và cập nhật cả `POSTGRES_PASSWORD` và `DATABASE_URL` (URL-encode ký tự đặc biệt của mật khẩu trong URL).
2. Đặt `NODE_ENV=development`, `COOKIE_SECURE=false`, `ALLOWED_ORIGINS=http://localhost:8000,...`.
3. `docker compose --env-file .env up -d --build`; `docker compose --env-file .env ps`.
4. Nếu nâng cấp DB cũ, `sh migrate.sh` **sau khi backup**. Init scripts trong Docker chỉ chạy khi volume DB trống.
5. `curl http://127.0.0.1:3000/health` (chỉ từ VPS/local máy host).
6. Gọi các route POST từ frontend có Origin cho phép và `credentials:'include'`.

## Auth
- `POST /auth/register` body `{email,password,displayName}` (mật khẩu >=12 ký tự) gửi liên kết xác minh tới SMTP.
- `POST /auth/verify` body `{token}`.
- `POST /auth/login` body `{email,password}` sau xác minh.
- `POST /auth/forgot` body `{email}`; `POST /auth/reset` body `{token,password}`.
- `POST /auth/google` body `{credential}`: Google ID token do frontend nhận từ Google Identity Services; backend kiểm tra audience và identity. **Không tự ghép** Google với email đã tồn tại: phản hồi `account_link_required`. Chưa có chức năng liên kết tài khoản an toàn.
- `GET /auth/me`, `POST /auth/logout`, `GET/POST /characters`.
- `GET /admin` và `/admin/api/overview`, `/admin/api/users`: chỉ `role='admin'`. **Không có admin mặc định**. Việc cấp admin phải thực hiện qua quy trình quản trị có chứng thực và audit trước khi public.

## R2
- Đặt R2_ENDPOINT (https://ACCOUNT_ID.r2.cloudflarestorage.com), R2_BUCKET, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY.
- `POST /storage/presign` với `{contentType,size}` phát URL PUT 120 giây vào prefix private theo ID người dùng. Cấu hình bucket CORS cho origin được phép.
- **Chưa đảm bảo kích thước upload thực tế**: `size` mới là kích thước khai báo. Trước khi mở public bắt buộc xác minh object HEAD, kích thước, kiểm tra nội dung/malware, trạng thái upload và thực hiện quota/cleanup. Không cấp GET public cho prefix private.

## Cảnh báo trước production
- Chưa có CSRF token độc lập; đang kiểm Origin/Referer với SameSite cookie. Cần CSRF token/double-submit và kiểm thử qua reverse proxy.
- Rate limiter là RAM từng process, cần Redis/shared store nếu chạy nhiều replica.
- Cấu hình staging gửi token mail vào log khi không có SMTP: **không dùng trên môi trường công khai**. Production yêu cầu SMTP thực.
- Chưa có RBAC teacher đầy đủ, audit quản trị đầy đủ, email resend/link Google, limit số nhân vật, dữ liệu game authoritative, WebSocket, R2 upload validation hay giao diện admin có bộ lọc/phân trang.
- Chưa có domain/TLS thực tế và chưa kiểm thử tích hợp Docker/Postgres/SMTP/R2. Không mở cổng 5432, 6379, 9000 trên mạng công khai.
- Chưa có khóa dependency lockfile, quét CVE và CI. Cần hoàn thiện trước vận hành thật.

## Phân quyền, dữ liệu học sinh
Chỉ thu thập dữ liệu cần thiết; lớp học và hồ sơ học sinh cần chính sách quyền truy cập, thời hạn lưu trữ, xóa dữ liệu và sự chấp thuận phù hợp.

## Lưu ý an toàn vận hành
Không commit `.env` hoặc bất kỳ credential nào. `docker compose down -v` sẽ xóa volume. Sao lưu và thử khôi phục trước migration. Không tự động triển khai lên GitHub/Firebase/production.
