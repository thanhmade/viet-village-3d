# Quy trình Git và phân loại tài nguyên — 12/10/2026

## Hai bản làm việc độc lập

- Repository: https://github.com/thanhmade/viet-village-3d.git, giữ nguyên chế độ Private.
- Nhánh của bản này: `cap-nhat`; mã nguồn nằm ngay tại gốc nhánh.
- Thư mục chính dùng `main`. Worktree con VIET-VILLAGE-3D-CAP-NHAT dùng `cap-nhat`.
- Main bỏ qua /VIET-VILLAGE-3D-CAP-NHAT/ trong .gitignore và .git/info/exclude. Không thêm thư mục đó hoặc gitlink vào main.
- Luôn kiểm tra `git rev-parse --show-toplevel`, `git branch --show-current`, `git status` và `git worktree list` trước khi sửa/commit.
- Fetch trước push; kiểm tra `git rev-list --left-right --count HEAD...@{upstream}`. Không force push, reset --hard hoặc tự merge cap-nhat vào main.
- Đã tạo bản sao lưu có thời gian bên ngoài hai thư mục, gồm dữ liệu chưa commit, thư mục Git, bundle toàn bộ refs và manifest SHA-256. Bản sao lưu không thuộc repository này.

## Đồng bộ code không triển khai

Root Directory Vercel được chủ dự án xác nhận để trống. `vercel.json` tại gốc đặt `git.deploymentEnabled: false` cho mọi nhánh để tắt tạo deployment từ Git push. Cấu hình này không xóa deployment đang có và không khóa lệnh deploy thủ công. Chỉ bật lại khi có yêu cầu triển khai riêng; không chạy lệnh deploy Firebase/Vercel trong quy trình đồng bộ code.

Tài liệu cấu hình: https://vercel.com/docs/project-configuration/git-configuration

## Chạy từ bản clone ở bất kỳ ổ đĩa nào

Clone đúng nhánh, giữ toàn bộ thư mục gốc; không chỉ lấy SOURCE-CODE. Chạy HTTP từ gốc bản clone. Không cần cài npm để mở game; cần Python 3, trình duyệt WebGL và Internet cho Firebase Google Login.

- Main: `START-SERVER.bat`, localhost:8000/SOURCE-CODE/index.html.
- CAP-NHAT: `START-GAME.bat` hoặc `START-SERVER.bat`, localhost:8001/SOURCE-CODE/index.html; có thể dùng `START-SERVER.bat --port 8002 --no-browser`.
- Máy khác: `python -B -m http.server 8000 --bind 127.0.0.1` (đổi cổng khi cần), rồi mở bằng hostname localhost.
- Main: `node SOURCE-CODE/tests/run-checks.cjs`.
- CAP-NHAT: `npm test` cho logic/hình học/asset. Bộ Firebase riêng: Node 22+, Java 21+, `npm ci`, rồi `npm run test:firebase`; chỉ dùng project demo-viet-village-3d.
- Các đường dẫn ổ H trong tài liệu cũ là ghi chép máy phát triển, không phải yêu cầu để game tải tài nguyên. Vài công cụ tạo bộ bản đồ nguồn giữ đường dẫn môi trường tác giả; game dùng dữ liệu đã xuất và không chạy các công cụ đó.
- Unit/emulator không thay thế Google Login thật hoặc kiểm tra GPU trên thiết bị học sinh.

## Kiểm kê trước đồng bộ

Bảng sau thống kê tệp nguồn/tài nguyên hiện có trước khi thêm tài liệu quy trình và cấu hình Git lần này; không tính dependency/cache, BACKUP hoặc worktree con.

| Nhóm | Số tệp | MiB |
|---|---:|---:|
| ASSETS | 38 | 40.13 |
| BUILDINGS | 26 | 39.26 |
| CHARACTERS | 18 | 83.01 |
| DOCUMENTS | 2 | 0.01 |
| ENVIRONMENT | 3 | 0.02 |
| INTERIORS | 11 | 13.93 |
| MAP | 115 | 303.97 |
| SOURCE-CODE | 118 | 0.86 |
| firebase | 6 | 0.03 |
| scripts | 2 | 0.00 |

Bản CAP-NHAT có 8 GLB NPC, đủ clip theo cấu hình và 22 ảnh nhúng; không có URI texture ngoài trong 8 GLB. Các bộ dựng cảnh Làng Việt, Làng Tân Thủ và Đồng Tre, atlas, cổng nhà, thời tiết/ánh sáng, VFX, hồ sơ/phòng và các bài kiểm tra được giữ trong nhánh này. 14 thư mục MAP/regions gồm cả ảnh tham chiếu cho vùng chưa dựng 3D. Không coi tất cả 14 vùng là MAP chơi được.

Bốn ZIP nguồn vũ khí dưới ASSETS/WEAPONS đang được quy tắc có sẵn loại khỏi Git: VIET-VILLAGE-3D-WEAPON-VFX.zip, VIET-VILLAGE-3D-WEAPON-VFX-PATCH-V1.1.zip, VIET-VILLAGE-3D-WEAPON-VFX-V1.2-FULL.zip và VIET-VILLAGE-3D-WEAPONS-VFX-v2.zip. Đã đọc danh sách và kiểm tra CRC trước khi giữ quy tắc này. Chúng là gói giao nhận cũ/bản sao; nguồn VFX v2 và 10 ảnh được tích hợp tại SOURCE-CODE/js/vfx và ASSETS/reference. Gói VFX v2 gốc còn được lưu trên nhánh main. Hai cây demo V1.2 đã bị xóa trong công việc trước lần đồng bộ này; lịch sử commit cũ vẫn lưu chúng. Không xóa thêm dữ liệu để đồng bộ.

Các cây giải nén giao nhận VIET-VILLAGE-3D-WEAPONS-VFX-v2 ở gốc và ASSETS/WEAPONS tiếp tục chỉ lưu cục bộ; không chạy game từ các cây bản sao này. Bộ cài INTEGRATION-v2 được giữ trong Git để lưu nguồn đầu vào, không tự chạy bộ cài. Ba ZIP MAP trong MAP/_ARCHIVE_ZIP được giữ cùng nội dung đã nhập.

Báo cáo MAP-IMPORT và MAP-3D trong DOCUMENTS phản ánh thời điểm tạo báo cáo. Danh sách MAP đang chạy và NPC mới hơn xem SOURCE-CODE/docs/world-atlas.md, dong-tre.md và npc-audit.md; không hiểu trạng thái “chưa dựng” trong báo cáo nhập cũ là trạng thái hiện tại.

Không có tài nguyên nào trong danh sách đồng bộ vượt 50 MiB hoặc giới hạn Git 100 MiB. Dùng Git thông thường lần này; chưa bật LFS và không viết lại lịch sử. Tệp lớn 130,4 MiB (emulator JAR) và 82,9 MiB (node.exe) nằm trong cache/công cụ cục bộ, không đưa lên Git. Nếu sau này thêm tài nguyên vượt ngưỡng, phân loại và thỏa thuận LFS/kho tài nguyên trước commit.

Không có tệp âm thanh trong hai cây nguồn đã kiểm kê. Ảnh tham chiếu, mô hình JSON và các GLB hiện có được giữ; không tạo âm thanh/texture còn thiếu để báo đã đầy đủ.

### ZIP được giữ trong nhánh này

| ZIP | MiB | Thành viên | Phân loại/kết quả |
|---|---:|---:|---|
| `MAP/_ARCHIVE_ZIP/BACH_DANG_4_GOC_THAM_CHIEU.zip` | 13.84 | 4 | CRC đạt; lưu gói nguồn, không tự thực thi |
| `MAP/_ARCHIVE_ZIP/NGOAI_LANG_DONG_TRE_4_GOC_THAM_CHIEU.zip` | 12.84 | 5 | CRC đạt; lưu gói nguồn, không tự thực thi |
| `MAP/_ARCHIVE_ZIP/VIET_NAM_MAP_TOAN_QUOC_NGUON_2025.zip` | 10.52 | 26 | CRC đạt; lưu gói nguồn, không tự thực thi |
| `VIET-VILLAGE-3D-WEAPONS-INTEGRATION-v2.zip` | 27.94 | 39 | CRC đạt; lưu gói nguồn, không tự thực thi |

### Dữ liệu chỉ giữ cục bộ

- BACKUP và bundle cũ; các bản sao lưu kiểm toán bên ngoài dự án.
- node_modules, .cache, .local-tools, log emulator, tệp tạm và output có thể tạo lại.
- .env thật, private key, service-account, token, cấu hình CLI/tài khoản.
- Tài liệu bài giảng gốc, ngữ cảnh chat, ảnh chụp, báo cáo kết nối/kiểm toán máy không cần để chạy game; chỉ các tài liệu được liệt kê trong .gitignore được đưa lên.
- Tiến độ/phiên người chơi không xuất ra Git. Cấu hình Firebase Web công khai được giữ; đây không phải khóa riêng hoặc token đăng nhập. Không tạo .env.example giả khi ứng dụng hiện không dùng .env.

Quét mẫu khóa riêng/token/service-account/mật khẩu trong tệp văn bản và thành viên văn bản của ZIP chưa phát hiện bí mật máy chủ. Địa chỉ email tìm thấy trong test là fixture .test/.invalid; email trong package-lock là nội dung thông báo công khai của dependency. Đây là kiểm tra theo mẫu kết hợp rà soát phạm vi, không phải chứng nhận bảo mật toàn diện.
