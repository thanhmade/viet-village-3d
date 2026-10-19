# Bàn giao Claude — Kiếm Khí

Thực hiện trên dự án hiện có, dùng phiên GitHub/Firebase còn hiệu lực.

Đích dự kiến: `H:\CHAT GPT\3D-GAME\VIET-VILLAGE-3D\VIET-VILLAGE-3D-CAP-NHAT`.
Nguồn gói tham chiếu: `H:\CHAT GPT\3D-GAME\SKILL-THAM-CHIEU\Kiem-Khi-Kiem`.
Gói: `Kiem-Khi-Kiem.zip`. Video chạy thật: `Kiem-Khi-Kiem.mp4`.
Repo: `thanhmade/viet-village-3d`, nhánh `cap-nhat`. Mã nền trước Kiếm Khí: `bb6921e9c3725da6ace9f1bf1ed11f570bd4f5f8`; commit mới nằm trong README-CLAUDE.md của gói.

1. Xác minh thư mục, Git root, nhánh, status và hướng dẫn dự án. Giữ thay đổi chưa commit. Fetch `origin cap-nhat`, đồng bộ fast-forward khi hợp lệ; nếu đã có thay đổi mới hơn thì đối chiếu diff, không chép đè toàn bộ controller từ ZIP. Nếu mã mới đã có thì không nhập lại gói.
2. Đọc `SOURCE-CODE/docs/kiem-khi/DESIGN.md`, `skill-spec.json`, `VALIDATION.md`. Kiếm Khí thuộc Kiếm/slot 3; giữ Nhất Kiếm, Kiếm Hoa, Cung và Côn.
3. Kiểm tra icon `ASSETS/ui/skills/sword/kiem-khi-ice-gold.png`, runtime `SOURCE-CODE/js/vfx/sword-qi.js`, load-order, CSS và liên kết pose nam/nữ.
4. Chạy `npm run test:vfx`, rồi `node --test SOURCE-CODE/tests/player-gltf.test.cjs SOURCE-CODE/tests/player-avatar.test.cjs SOURCE-CODE/tests/village-npcs.test.cjs`.
5. Mở server HTTP từ gốc repo. Kiểm tra `SOURCE-CODE/kiem-khi-preview.html` và game thật: hạ tấn, tụ vòng, đâm/phát 1,04 s, tầm 11 m, toàn chiêu 3,2 s. Đối chiếu video, ảnh gốc và góc bên/hơi cao; kiểm tra cả nam/nữ, low/medium/high, desktop/điện thoại.
6. Thử phím 3 và nút chạm; trúng/hụt, bia gần/xa/lệch, hai bia, tường giữa đường và tường sát tay, spam, đổi vũ khí/MAP/avatar, chết, mất focus. Bia chỉ ghi nhận khi contact, tối đa một bia hợp lệ gần nhất; đổi vũ khí không reset hồi chiêu. Kiểm tra console, Network và FPS trên thiết bị thật.
7. Chạy `npm run build:hosting` và `node scripts/build-public-game.mjs --check`. Khi visual và hồi quy đạt, triển khai Hosting vào kênh Alpha hiện có của project `viet-village-3d` theo quy trình dự án đã được người dùng yêu cầu. Không deploy production hoặc đổi Auth/Rules/Functions. Không thay đổi quyền truy cập để né lỗi deploy.
8. Kiểm tra URL Firebase thực trả về, icon/script mới trả 200 và Kiếm/slot 3 chạy đúng; báo commit, URL thực tế, thời hạn Alpha và kết quả thử máy thật. URL Alpha hiện dùng: https://viet-village-3d--alpha-g1lx8owy.web.app/ . Không tự đoán URL sau triển khai.

Chỉ thực hiện sao lưu phiên bản cục bộ khi người dùng yêu cầu, theo chỉ dẫn mới hơn ngày 17/10; không tự tạo tag/release hoặc đưa backup lên GitHub. Codex chưa ghi trực tiếp ổ H, chưa chạy lệnh trên máy Claude và chưa triển khai Alpha cho bản này.
