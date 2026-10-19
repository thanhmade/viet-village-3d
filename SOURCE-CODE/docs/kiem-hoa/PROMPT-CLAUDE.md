# Bàn giao Claude — Kiếm Hoa / CAP-NHAT

Thực hiện ngay trên repo đã đăng nhập, không tạo lại dự án hoặc yêu cầu đăng nhập lại nếu phiên hiện tại vẫn hợp lệ.

**Dự án:** `H:\CHAT GPT\3D-GAME\VIET-VILLAGE-3D\VIET-VILLAGE-3D-CAP-NHAT`  
**GitHub:** `thanhmade/viet-village-3d`, nhánh `cap-nhat`.  
**Gói:** `Kiem-Hoa-Kiem.zip`. **Video chạy thật:** `Kiem-Hoa-Kiem.mp4`.

1. Kiểm tra Git root, nhánh, status và chỉ dẫn dự án. Giữ mọi thay đổi đang có. Fetch `origin cap-nhat`, đối chiếu commit Kiếm Hoa trong `README-CLAUDE.md` của ZIP, đồng bộ bằng fast-forward khi hợp lệ. Nếu nhánh đã có commit mới, tích hợp theo diff, giữ phần sửa mới của Claude; không chép nguyên các file controller cũ đè lên. Khi GitHub đã đồng bộ đủ thì không cần chép ZIP lần nữa.
2. Đọc `SOURCE-CODE/docs/kiem-hoa/DESIGN.md`, `skill-spec.json` và `VALIDATION.md`. Icon phải ở `ASSETS/ui/skills/sword/kiem-hoa-ice-gold.png`; runtime ở `SOURCE-CODE/js/vfx/sword-flower.js`. Đây là chiêu slot 2 của Kiếm; không thay Nhất Kiếm hoặc các chiêu Cung/Côn.
3. Chạy `npm run test:vfx`; chạy thêm `node --test SOURCE-CODE/tests/player-gltf.test.cjs SOURCE-CODE/tests/player-avatar.test.cjs SOURCE-CODE/tests/village-npcs.test.cjs`. So sánh log với bản bàn giao. Không chỉ kiểm tra syntax.
4. Mở game từ server HTTP và `SOURCE-CODE/kiem-hoa-preview.html`. Kiểm tra nam/nữ, Low/Medium/High, desktop và điện thoại; xem ba vòng chém, tay bám chuôi, chân đổi trụ, sáu cánh nở và tan hết sau 3,6 s. Xem từ trên và ngang; so với ảnh gốc và video. Không dùng FPS của video để báo FPS thiết bị.
5. Trong game thật, trang bị Kiếm, bấm 2 bằng bàn phím và nút chạm. Thử trúng/hụt bia, vách, spam, đổi vũ khí/MAP, mở avatar, chết và mất focus. Bia chỉ ghi nhận sau contact; mỗi mục tiêu một lần trong cả chiêu. Các skill Côn/Cung/Nhất Kiếm vẫn hoạt động. Đo FPS/draw calls và nhớ kiểm tra console/network.
6. Chạy `npm run build:hosting` rồi `node scripts/build-public-game.mjs --check`. Dùng quy trình preview channel **Alpha** hiện có của dự án; chỉ triển khai Hosting cho `viet-village-3d`, channel `alpha`, sau khi kiểm tra visual đạt. Không triển khai production, không thay Auth/Rules/backend. URL người dùng đang dùng: https://viet-village-3d--alpha-g1lx8owy.web.app/ . Nếu Firebase trả URL kênh mới, báo URL thực từ lệnh, không tự đoán.
7. Sau triển khai kiểm tra lại URL thực, cache-busted scripts/icon trả 200, trang bị Kiếm/slot 2 chạy bản mới; báo commit đã triển khai, URL, kết quả máy thật và phần còn lỗi nếu có.

Codex đã sửa mã GitHub và dựng preview trong môi trường riêng; chưa ghi trực tiếp ổ H hoặc thực hiện lệnh trên máy Claude. Bản Kiếm Hoa này cần vòng nghiệm thu GPU/Alpha trên máy của bạn.
