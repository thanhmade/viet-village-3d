# Vũ khí và chiêu thức v2 trong CAP-NHAT

Bộ 5 vũ khí / 15 chiêu đã được đưa vào đúng cấu trúc nguồn và nối với nhân vật làng. Bản tích hợp dùng chung Three.js, scene và vòng lặp của game, không khởi tạo renderer hoặc bộ điều khiển WASD thứ hai. Mọi thay đổi thuộc nhánh `cap-nhat` và chưa commit/push.

## Chạy và sử dụng

Từ thư mục CAP-NHAT:

```powershell
python -B -m http.server 8001 --bind 127.0.0.1
```

Nếu server đúng worktree đã chạy ở cổng 8001 thì dùng lại. Bản chính dùng cổng 8000.

- Game: `http://localhost:8001/SOURCE-CODE/index.html`. Đăng nhập Google, chọn **Cầm vũ khí trong làng**, chọn vũ khí và thi triển bằng ba nút hoặc phím 1/2/3. Nhấp vào cảnh để điều khiển lại bằng bàn phím sau khi thao tác nút.
- Sân luyện: `http://localhost:8001/SOURCE-CODE/weapons-vfx-demo.html`. Q/E đổi vũ khí, 1/2/3 ra chiêu, WASD đi lại, kéo chuột/một ngón để xoay, cuộn/chụm hai ngón để thu phóng. Chọn **Xem 15 chiêu** để chạy toàn bộ.

## Tệp chạy

| Đường dẫn từ gốc CAP-NHAT | Vai trò |
|---|---|
| `SOURCE-CODE/js/vfx/weapon-vfx-core.js` | Timeline, hạt, sự kiện và dọn tài nguyên |
| `SOURCE-CODE/js/vfx/*-skill-config.js`, `*-skill-vfx.js` | 5 bộ cấu hình/đăng ký, mỗi bộ 3 chiêu |
| `SOURCE-CODE/js/weapons-village.js` | Trang bị, chiêu thức, UI và vòng đời hiệu ứng trong làng |
| `SOURCE-CODE/js/weapons-village-models.js` | Dựng 5 vũ khí 3D và điểm phát hiệu ứng trên vũ khí |
| `SOURCE-CODE/js/app.js`, `load-order.json`, `index.html` | Nối mô-đun vào trình khởi tạo và vòng lặp hiện có |
| `SOURCE-CODE/css/weapons-village.css` | Bảng trang bị, thanh chiêu và giao diện cảm ứng |
| `SOURCE-CODE/weapons-vfx-demo.html`, `js/demo/`, `css/weapons-vfx-demo.css` | Sân diễn họa riêng |
| `SOURCE-CODE/js/weapons-demo-link.js` | Mở sân luyện từ nút trong game đã đăng nhập |
| `ASSETS/reference/{staff,sword,spear,bow,axe}/` | 10 ảnh gốc, giữ SHA-256 như gói nhận được |
| `ASSETS/vendor/three.min.js` | Three.js r160 dùng chung; giữ nguyên thư viện và giấy phép |
| `SOURCE-CODE/tests/weapons*.test.cjs` | Kiểm thử lõi, đường dẫn/ảnh, điều khiển và tích hợp |

`package.json` riêng trong `js/vfx` và `ASSETS/vendor` khai báo CommonJS cho các UMD khi kiểm thử Node. Không đổi `type: module` của gốc dự án hoặc các module Firebase.

## Quy ước tích hợp

Nhân vật làng nhìn theo +Z, còn VFX dùng -Z; đối tượng caster được xoay để đồng nhất hướng đánh. Điểm phát lấy từ đầu vũ khí thật; cao độ dùng `bridgeHeight`. Trang bị là tài nguyên riêng của mô-đun và được đánh dấu `localOnly`, không tự sao chép sang nhân vật phòng.

Hiệu ứng dừng khi ngữ cảnh không phù hợp: nội thất, chế độ xem công trình, hộp thoại, tab mất focus hoặc phiên đăng nhập hết hiệu lực. Không tạo dữ liệu hồ sơ/phòng thật; `onlineConfig.enabled` giữ `false`.

## Kiểm thử

```powershell
npm.cmd test
npm.cmd run test:vfx
```

Các kiểm thử Node dùng Three.js thật nhưng renderer/DOM có thể được mô phỏng; không thay thế thử trên trình duyệt. Chạy thử Google Login bằng người dùng thật, vào làng, đổi 5 vũ khí, thử các chiêu, vào/ra nhà và đăng xuất. Sân luyện riêng có thể kiểm tra WebGL mà không truy cập Firebase.

### Kết quả kiểm tra ngày 11/10/2026

- `npm.cmd test`: đạt 4 nhóm kiểm tra game, 7 bài online-unit và 33 bài VFX/tích hợp. Các bài online-unit là kiểm thử cục bộ, không phải xác nhận multiplayer trên Firebase thật.
- 73/73 tài nguyên cục bộ đã kiểm tra trả HTTP 200, đúng chữ hoa/thường và nội dung khớp tệp trên đĩa; 10 PNG tham chiếu khớp SHA-256 của gói gốc. Phép kiểm tra này không bao gồm các SDK Firebase tải từ CDN.
- Sân luyện WebGL chạy hết trình tự 15 chiêu trên trình duyệt. Sau khi sửa delta âm ở khung hình đầu và đổi phiên bản URL script để bỏ cache cũ, lần kiểm tra lại không phát sinh lỗi JavaScript/WebGL mới. Nút thi triển bằng phím Space hoạt động; bố cục 390 × 844 không tràn ngang.
- Người dùng đã đăng nhập Google trên bản CAP-NHAT, vào làng và xác nhận: “Đã thử, nhân vật và các chiêu hoạt động”. Đây là kết quả chơi thử do người dùng xác nhận; không dùng tài khoản hay phiên đăng nhập giả.
- Chưa kiểm tra trực tiếp trên điện thoại vật lý, chưa xác nhận đầy đủ vào/ra mọi nội thất khi đang dùng vũ khí, và chưa đo hiệu năng multiplayer. Các nhánh khóa điều khiển, dọn hiệu ứng và cảm ứng có kiểm thử tự động.
- 115 tệp được Git theo dõi của bản chính và 40 tệp trong gói v2 gốc giữ nguyên checksum. Giữ nguyên 40 trạng thái xóa đã có trước trong CAP-NHAT; không tạo thêm việc xóa các tệp đó. Không stage, commit, push, deploy hoặc thay đổi Firebase.

Các tệp được sửa đã có trong Git: `.gitignore`, `README.md`, `package.json`, `SOURCE-CODE/index.html`, `SOURCE-CODE/load-order.json`, `SOURCE-CODE/js/app.js`, `SOURCE-CODE/js/legacy-game-controls.js`, `SOURCE-CODE/js/remote-players.js`, `SOURCE-CODE/tests/online-unit.test.mjs`. Các tệp mới thuộc những đường dẫn VFX, giao diện, demo, ảnh, tài liệu và kiểm thử ở bảng trên.

## Gói gốc và giới hạn

`package-notes/` lưu nguyên tài liệu của gói nhận được. Các báo cáo/checksum và nhận định về mã game trong đó phản ánh thời điểm tạo gói, không phải kết quả mới của bản tích hợp. Không ghi đè `DOCUMENTS/VALIDATION.md` của dự án.

Hai bản giải nén gốc và các ZIP vẫn ở vị trí cũ nhưng được Git bỏ qua. Mã chạy chỉ dùng các đường dẫn chuẩn bên trên. Không chạy các BAT cài đặt từ gói, không cài thêm thư viện.

Đây là VFX và vũ khí dựng bằng hình học 3D, chưa phải hệ thống chiến đấu hoàn chỉnh: chưa có sát thương, hitbox địch, rig/animation sản xuất, PBR, âm thanh hoặc đồng bộ chiêu thức online. Chưa thay đổi Firebase, main, GitHub hay website.
