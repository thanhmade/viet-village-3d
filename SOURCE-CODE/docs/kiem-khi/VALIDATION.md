# Kiếm Khí — kết quả kiểm tra ngày 19/10/2026

Mã nền GitHub: `bb6921e9c3725da6ace9f1bf1ed11f570bd4f5f8`, nhánh `cap-nhat`, repo `thanhmade/viet-village-3d`. Kiểm tra trên bản tích hợp Kiếm Khí xây dựng từ mã nền này. Không coi video hoặc ảnh thiết kế là bằng chứng đã triển khai Alpha.

## Kiểm thử tự động

| Kiểm tra | Kết quả |
|---|---|
| `npm run test:vfx` | **190/190 đạt**, không bỏ qua; lần cuối 33,18 s |
| `node --test SOURCE-CODE/tests/player-gltf.test.cjs SOURCE-CODE/tests/player-avatar.test.cjs SOURCE-CODE/tests/village-npcs.test.cjs` | **65/65 đạt**, không bỏ qua |
| `npm run build:hosting` | Đạt: **396 file**, **244.782.031 byte**, **59 GLB thật** |
| `node scripts/build-public-game.mjs --check` | Đạt: nội dung gói Hosting khớp mã nguồn |

Các bài mới kiểm tra cast 30/60/120 Hz và delta lớn 0,43/5 s; hit gần nhất đúng một lần, hết tầm/hụt/lệch/khác tầng, vách trước và sau bia, vách sát thân, callback loại mục tiêu; hủy trước và sau release, hủy lồng trong callback, cooldown, đổi vũ khí, movement lock và không cộng luyện bia tại cast. Geometry/material/instancing được dispose đúng một lần ở cả ba mức chất lượng.

GLB nam và nữ thật được kiểm tra xương gốc, chân trụ, mặt đế giày, hạ hông/nghiêng ngực và trở về pose. Anchor mũi kiếm thật khớp anchor thiết kế trong 5 mm tại các pha được lấy mẫu. Đây là dung sai kiểm thử, không phải phép đo từ ảnh tham chiếu.

## Render WebGL thật

Chi tiết máy đọc được: `webgl-validation.json`.

- Chromium 133, ANGLE Vulkan/SwiftShader; dùng WebGL thật bằng renderer phần mềm.
- **36 tình huống** = hai giới tính × ba mức chất lượng × sáu ca: hụt, bia gần 4 m, bia xa 9 m, vách 5,1 m, vách sát người 0,7 m và hai bia 4/7 m.
- **252 pha render** ở 0,40 / 0,85 / 1,08 / 1,23 / 1,47 / 1,75 / 2,80 s. Không có lỗi GL, shader hoặc JavaScript được ghi nhận trong ma trận.
- Ca hụt/vách/vách sát người: 0 bia trúng. Bia gần/xa: đúng một bia, một lần. Hai bia: chỉ bia gần trúng.
- Sau tám vòng cast/hủy mỗi giới tính, số geometry/texture về đúng **23/4** như trước; không tích lũy tài nguyên trong phạm vi thử này.
- Toàn cảnh thử gồm sân, nhân vật, kiếm, bia/vách và effect: **20–51 draw call** ở các pha lấy mẫu. Không dùng con số này làm ngân sách draw call của toàn game.
- Nút chạm đã kích hoạt được ở viewport 390×844. Preview có điều chỉnh góc nhìn theo tỉ lệ dọc để thấy cả nhân vật và đường bay; không thay camera gameplay.

## Video bàn giao

`Kiem-Khi-Kiem.mp4` ghi trực tiếp canvas từ trang `SOURCE-CODE/kiem-khi-preview.html`: nam phóng hụt, nữ trúng bia xa, đoạn nam phát chậm 0,5× và nam bị tường chặn. H.264, 1280×720, 30 khung/giây, khoảng 20 giây; đoạn chậm có nhãn. Không có video AI, không dựng thêm chiêu bên ngoài runtime, không thêm âm thanh sản xuất.

Khung hình được xuất với delta mô phỏng cố định 1/30 giây. **30 fps của MP4 không phải kết quả benchmark FPS của game**. Video dùng cảnh thử và camera phụ; không phải bản ghi Alpha đã đăng nhập.

## Việc còn cần Claude kiểm tra tại máy triển khai

Chưa chạy trên GPU/điện thoại vật lý, chưa xác nhận FPS, nhiệt độ hoặc bộ nhớ toàn game trên máy học sinh. Chưa ghi ổ H, chưa chạy lệnh trong phiên Claude và chưa triển khai hoặc kiểm tra tài khoản game trên Firebase Alpha. Cần đối chiếu visual trong MAP thật, chuyển MAP/avatar, chết/mất focus và dữ liệu trực tuyến theo `PROMPT-CLAUDE.md` trước khi kết luận bản Alpha đạt.

Không chỉnh Auth, Rules, Functions, dữ liệu tài khoản, nhánh main hoặc production. Tài liệu này báo các phép thử đã chạy và giới hạn của chúng, không chứng nhận toàn bộ trò chơi.
