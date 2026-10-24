# VIET VILLAGE 3D — nhánh `vps-deploy`

**Nhánh chuẩn bị VPS, CHƯA phải bản mở server công khai.**

Nhánh này được tạo từ `cap-nhat` tại commit `05ba24a22fcf9cd374ac954b73bfbe4dbb47eafd`.
Toàn bộ mã game và tài nguyên của commit gốc được giữ nguyên. Chỉ bổ sung thư mục `VPS/` và tài liệu này; không sửa `main`, không ghi ngược vào `cap-nhat`.

## Điểm bắt đầu

- [Hướng dẫn cài từ GitHub và vận hành staging](VPS/README.md).
- [Nguồn gói, commit gốc, checksum](VPS/IMPORT-MANIFEST.json).
- [Giới hạn của bộ Starter v0.2](VPS/README-STARTER-v0.2.md).

Kiến trúc chuẩn bị: **PostgreSQL + Node.js + xác thực Google ID Token + Cloudflare R2**.
Backend nằm trong `VPS/SERVER/`; Docker và script nằm trong `VPS/DEPLOY/`.
Chưa nối cơ chế đăng nhập/lưu game của frontend hiện có sang backend mới.

## Lấy đúng nhánh

```bash
git clone --branch vps-deploy --single-branch https://github.com/thanhmade/viet-village-3d.git viet-village-3d-vps
cd viet-village-3d-vps
git branch --show-current
```

Kết quả phải là `vps-deploy`. Với repo riêng tư, sử dụng quyền GitHub hợp lệ; ưu tiên deploy key chỉ đọc trên VPS, không nhúng token vào URL hoặc mã nguồn.
Lệnh trên chỉ tải mã, không cài hay mở server. Xem `VPS/README.md` trước khi chạy Docker.

**Không có workflow tự triển khai được thêm vào nhánh này. Không commit `.env`, credential, dữ liệu học sinh, dump database hoặc khóa SSH.**
