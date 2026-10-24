# VIET VILLAGE 3D — VPS độc lập / `vps-deploy`

> TRẠNG THÁI: chuẩn bị và kiểm thử nội bộ. Chưa duyệt production; chưa cài trên VPS thật.
> Bộ nền: VPS Starter v0.2. PostgreSQL + Node.js + Google ID Token + Cloudflare R2.

## 1. Vai trò của nhánh

| Nhánh | Vai trò |
|---|---|
| `main` | Bản chính hiện có; không bị thay đổi trong lần bổ sung này |
| `cap-nhat` | Phát triển game; commit gốc `05ba24a22fcf9cd374ac954b73bfbe4dbb47eafd` |
| `vps-deploy` | Giữ bản game từ commit gốc và bổ sung gói VPS để kiểm thử/cài sau |

`VPS/` không thay thế `SOURCE-CODE/`, MAP, NPC, nhân vật, Firebase hay package.json của game.
Chưa nối frontend game với Auth/API mới; clone nhánh chưa đồng nghĩa có game online hoàn chỉnh.
Không thêm GitHub Actions hay cơ chế tự deploy. Cấu hình Vercel của commit gốc đã đặt `git.deploymentEnabled=false` và được giữ nguyên.

## 2. Cấu trúc

```text
README-VPS.md                 # Điểm vào tại gốc repo
VPS/
  README.md                   # Tài liệu này
  README-STARTER-v0.2.md       # Hướng dẫn gốc của gói v0.2
  IMPORT-MANIFEST.json         # Nguồn và checksum, không có bí mật
  SERVER/
    src/index.mjs             # API tài khoản, nhân vật, R2, Admin thử nghiệm
    src/admin.html
    sql/001_init.sql
    sql/002_security_storage.sql
    Dockerfile
    .dockerignore
    package.json
  DEPLOY/
    compose.yaml
    .env.example              # Chỉ mẫu; .env thật không đưa lên GitHub
    init-env.sh               # Sinh mật khẩu ngẫu nhiên, không ghi đè .env
    preflight.sh              # Kiểm tra đúng nhánh và cấu hình; không chạy dịch vụ
    backup.sh
    migrate.sh
```

## 3. Chuẩn bị máy cài (làm sau khi có VPS)

Cần Git, OpenSSL, Docker Engine và Docker Compose plugin. Chưa có VPS/tên miền vẫn có thể kiểm thử trên máy Linux riêng hoặc môi trường Docker tương thích.
Với repo private, tạo deploy key SSH **chỉ đọc** cho VPS. Không dùng khóa riêng trong repo, không bật quyền ghi cho key cài đặt, không đưa token vào URL.
Xác minh host key GitHub khi kết nối lần đầu; không bỏ kiểm tra host key.

HTTPS (Git sẽ yêu cầu xác thực hợp lệ nếu repo private):

```bash
git clone --branch vps-deploy --single-branch https://github.com/thanhmade/viet-village-3d.git viet-village-3d-vps
cd viet-village-3d-vps
git branch --show-current
git rev-parse HEAD
```

SSH, sau khi đã cấu hình deploy key:

```bash
git clone --branch vps-deploy --single-branch git@github.com:thanhmade/viet-village-3d.git viet-village-3d-vps
```

Chỉ dùng một trong hai cách clone. Các lệnh này không khởi động game/server.

## 4. Tạo cấu hình kín và chạy staging thủ công

Từ thư mục repo vừa clone:

```bash
cd VPS/DEPLOY
sh init-env.sh
```

Script sinh mật khẩu 32 byte ngẫu nhiên dạng hex, đồng bộ `POSTGRES_PASSWORD` và `DATABASE_URL`, đặt quyền `.env` là 0600. Không in mật khẩu và từ chối ghi đè `.env` có sẵn.
Giữ `NODE_ENV=development`, `COOKIE_SECURE=false`; API chỉ publish tại `127.0.0.1:3000`. Đây là cấu hình LOCAL, không phải cấu hình truy cập Internet.

Chỉ khi chủ động thử nghiệm:

```bash
sh preflight.sh
docker compose --env-file .env up -d --build
docker compose --env-file .env ps
curl --fail http://127.0.0.1:3000/health
```

Kết quả `/health` dự kiến là `{"status":"ok"}` khi API và database hoạt động. Đây là kết quả dự kiến, không phải bằng chứng đã chạy thành công trên VPS.
`preflight.sh` chỉ kiểm cấu hình Compose và một số điều kiện staging, không thay thế kiểm thử tích hợp/bảo mật.
Không chạy `npm install` tại gốc repo để cài backend; Docker build dùng riêng `VPS/SERVER/`.
`COMPOSE_PROJECT_NAME=vv3d-vps-staging` giúp ổn định tên volume khi đổi thư mục clone. Với DB cũ, phải xác định đúng project/volume trước khi chạy, không tạo nhầm DB rỗng hoặc xóa volume.

Nếu cài trên VPS, giữ API nội bộ và kết nối thử qua SSH tunnel từ máy cá nhân:

```bash
ssh -N -L 3000:127.0.0.1:3000 ten_user@IP_VPS
```

Không mở cổng 3000/5432 ra Internet. Chưa dựng reverse proxy/HTTPS/public frontend trong gói này.
Không phục vụ toàn bộ gốc repo qua web: có thể lộ mã server hoặc `.env` nếu cấu hình sai.

## 5. Google, SMTP, R2 và quản trị

| Thành phần | Cấu hình / giới hạn |
|---|---|
| Google | `GOOGLE_CLIENT_ID`; backend xác minh ID Token. Chưa có UI đăng nhập Google nối với game; chưa có liên kết an toàn với tài khoản email cũ |
| Email | `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `MAIL_FROM`; không có SMTP thì development ghi mail/token vào log, chỉ dùng dữ liệu giả trên máy riêng |
| URL frontend | `PUBLIC_APP_URL`, `ALLOWED_ORIGINS`; cần frontend thực xử lý `/verify` và `/reset`, hiện chưa được bổ sung |
| R2 | `R2_ENDPOINT`, `R2_BUCKET`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`; bucket riêng tư, key giới hạn đúng bucket, CORS chỉ origin cần thiết |
| Admin | `/admin` yêu cầu phiên role admin; không có admin mặc định, không tự cấp quyền, chưa có quy trình cấp quyền/audit hoàn chỉnh |

Không cần điền khóa Google/R2/SMTP để lưu nhánh GitHub. Không đưa các khóa đó vào file mẫu hoặc gửi trong chat.
R2 mới tạo URL PUT có thời hạn, chưa kiểm kích thước thực tế, malware, quota hoặc xác nhận upload.
Trang Admin v0.2 còn dùng JavaScript inline trong khi Helmet bật CSP; cần xử lý tương thích trước khi nghiệm thu giao diện.

## 6. Xem trạng thái, sao lưu, migration

```bash
# Đang đứng trong VPS/DEPLOY
docker compose --env-file .env ps
docker compose --env-file .env logs --tail=100 api
```

Log development có thể chứa token xác minh/reset. Không chụp hoặc công khai log có dữ liệu thật.

```bash
# Đặt đường dẫn NGOÀI thư mục repo, do tài khoản vận hành sở hữu.
BACKUP_DIR=/duong-dan-tuyet-doi-ngoai-repo sh backup.sh
```

`backup.sh` tạo dump PostgreSQL custom format (`.dump`), quyền 0600, báo lỗi nếu `pg_dump` thất bại; không sao chép ra cloud và không mã hóa tự động.
Phải mã hóa, chuyển bản sao ra ngoài VPS và thử restore vào database thử nghiệm riêng. Không dùng dump để ghi đè DB thật khi chưa duyệt.

Với volume mới, Docker tự chạy `001` và `002` khi khởi tạo lần đầu. Chỉ với volume v0.1 đã có dữ liệu, sau khi backup đã được kiểm tra:

```bash
sh migrate.sh --after-backup
```

Cờ này là xác nhận của người vận hành, không tự chứng minh backup khôi phục được. Mỗi file SQL chạy trong một transaction; gói hiện tại chỉ có hai script idempotent, chưa có migration runner theo phiên bản/checksum.
**Không chạy `docker compose down -v`, `docker volume prune` hoặc xóa volume database.**

## 7. Cập nhật từ GitHub có kiểm soát

```bash
# Từ gốc repo; bước này chỉ kiểm tra và tải metadata, chưa thay mã đang chạy.
git branch --show-current
git status --short
git fetch origin vps-deploy
git log --oneline HEAD..origin/vps-deploy
git diff --stat HEAD..origin/vps-deploy
```

Chỉ khi đúng nhánh, working tree sạch, đã đọc thay đổi, có backup và được duyệt:

```bash
git merge --ff-only origin/vps-deploy
```

Sau đó mới chủ động build lại staging và chạy migration nếu bản cập nhật yêu cầu.
Không dùng `git reset --hard`, không force push, không tự merge sang `main` hoặc `cap-nhat`.
Không dùng `git clean -fdx`: lệnh này có thể xóa `.env` bị gitignore.
Lưu SHA bản đang chạy trước cập nhật. Rollback mã không tự đảo ngược thay đổi schema/dữ liệu; phải có kế hoạch riêng.

## 8. Những việc còn chặn production

Chưa kiểm thử Docker/PostgreSQL/Auth end-to-end; chưa tích hợp game, Google thật, SMTP thật, R2 thật; chưa có lockfile/CVE audit, CSRF token đầy đủ, hardening proxy/TLS, DB application role tối thiểu (v0.2 đang dùng user khởi tạo DB), MFA/audit Admin, hạn mức và xác thực upload, kiểm thử restore/tải, WebSocket và logic game authoritative.
Không đánh giá gói này là hệ thống sẵn sàng khai mở. 4 vCPU/8 GB RAM/50 GB NVMe là cấu hình mục tiêu, không phải cam kết CCU.

## 9. Thay đổi khi đưa gói lên nhánh

Giữ nguyên mã API, SQL, Dockerfile, package.json, Compose và HTML Admin của ZIP v0.2. Thêm hướng dẫn GitHub, `.dockerignore`, script tạo env/kiểm tra, tên Compose project trong env mẫu và quy tắc bỏ qua bí mật/dump.
Sửa script backup để không che mất lỗi `pg_dump`; sửa migration để dùng biến môi trường từ DB container và yêu cầu xác nhận backup.
Không đưa ZIP, node_modules, `.env` thật, dump database, credential hoặc dữ liệu học sinh lên GitHub.
