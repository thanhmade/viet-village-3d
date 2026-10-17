# Biểu tượng 3 chiêu Côn — 17/10/2026

Gói `SKILL-THAM-CHIEU\Bo-Bieu-Tuong-3-Skill-Con.zip` (sha256 `588fe5be…`, nền `3ae6aae`) ghép trên `121ce38` (Côn Quét xoay 360°).

- Ảnh: `ASSETS/ui/skills/staff/{con-quet,ho-than,chan-dia}-jade.png` (1254 × 1254, RGBA; ~7,65 MiB tổng). Dự án chưa có công cụ tối ưu ảnh giao diện nên dùng thẳng bản nguồn; có thể xuất bản 256 px sau.
- `SOURCE-CODE/css/staff-skill-icons.css` (nạp sau `game-hud.css`): nền nút theo `data-skill-id`; tên dưới huy hiệu, phím trên mép, đếm ngược và số lá chắn Hộ Thân (⛨) vẫn là DOM; trạng thái ready/cooldown/blocked/aiming, focus bàn phím.
- `SOURCE-CODE/js/weapons-village.js`: `render()` gắn `data-equipped-weapon` lên thanh và `data-skill-id` lên từng nút. Không đổi phím, hồi chiêu, thao tác chuột/cảm ứng hay logic chiến đấu; vũ khí khác giữ ký hiệu cũ.
- Chỉnh so với gói sau khi đo bố cục trong game: máy tính chừa 18 px dưới hàng nút (nhãn không che dòng hướng dẫn) thay cho `padding-bottom` của thanh; nhãn tràn hai bên 3 px (nút chính 5 px) để không chạm nhau; nút Nhảy dời thêm 16 px khi cầm Côn (thanh rộng 351 px > 340 px chỗ chừa — chồng nhau sẵn có với mọi vũ khí); cảm ứng nâng Chấn Địa 18 px để nhãn không đè phím "2" của Hộ Thân và nút Côn Quét.
- Kiểm tra (Chrome GPU, trang UID giả): 1280×720, điện thoại ngang 844×390 cảm ứng, màn thấp 667×375 — 3 ảnh tải đủ, không nhãn/nút ra ngoài màn hình hay chồng lên nhau (kể cả nút Nhảy), đổi sang kiếm trả ký hiệu cũ, một lần chạm một chiêu, focus 3 px.
