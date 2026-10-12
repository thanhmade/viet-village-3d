# Chuẩn bị Firebase Hosting cho CAP-NHAT

> Đây là báo cáo giai đoạn chuẩn bị trên commit local trước khi đồng bộ. Quy trình tiếp theo đã được chủ dự án cho phép: [đồng bộ cap-nhat và xuất Alpha 7 ngày](firebase-hosting-alpha.md). Các mốc “chưa commit/deploy” bên dưới mô tả thời điểm kiểm tra ban đầu.

Ngày kiểm tra: 12/10/2026. Chỉ chuẩn bị và chạy localhost; chưa deploy, chưa thay đổi gói dịch vụ, backend hoặc Database Rules.

## Phiên bản và phạm vi

- Git root: `H:\CHAT GPT\3D-GAME\VIET-VILLAGE-3D\VIET-VILLAGE-3D-CAP-NHAT`.
- Nhánh local: `cap-nhat`, commit nguồn `4fb93880dff7c96abd4c4548d7cae6e731710993`.
- Remote: `https://github.com/thanhmade/viet-village-3d.git`.
- Ban đầu working tree sạch. Local chậm hơn remote-tracking `origin/cap-nhat` 3 commit (`536bf57`, `fb27337`, `3fcaa05`); không fetch/merge hoặc thay đổi lịch sử trong bước chuẩn bị này. Đóng gói bản local đã kiểm tra.
- Dùng Node **22.23.3** trong `.local-tools/node-22/node-v22.23.3-win-x64`, Firebase CLI **15.33.0** đã cài. Không cài thêm thư viện.
- Mã game, HTML, CSS, ảnh và mô hình gốc không bị chỉnh sửa. Chỉ bổ sung cấu hình Hosting, công cụ đóng gói/kiểm tra và tài liệu.

## Cấu hình

- `.firebaserc`: chọn project hiện có `viet-village-3d`. Không tạo project/site hoặc channel trên Firebase.
- `firebase.json`: thêm `hosting.public = public-game`, bỏ qua dotfile/node_modules, `Cache-Control: no-cache` để trình duyệt kiểm tra phiên bản mới; giữ nguyên các mục Firestore, RTDB, Functions và emulator cũ.
- Có predeploy hook **chỉ chạy bộ đóng gói** để ngăn xuất nhầm bản cũ nếu sau này chủ dự án cho phép deploy. Bước này chưa gọi deploy.
- `emulators.hosting`: `127.0.0.1:5005`. Chỉ chạy `--only hosting`; không khởi động emulator database hoặc Functions.
- Không có rewrite SPA: đây là các trang HTML thật, root `index.html` chuyển đến `SOURCE-CODE/index.html`; bản đồ tổng là iframe HTML riêng. Đường dẫn không tồn tại phải trả về 404 thay vì HTML giả làm JS/GLB.
- Không có GitHub Actions hoặc kết nối tự triển khai mới. Giữ nguyên `vercel.json` đang tắt deploy theo Git.

Tham khảo [cấu hình Firebase Hosting](https://firebase.google.com/docs/hosting/full-config) và [Hosting Emulator](https://firebase.google.com/docs/emulator-suite/use_hosting).

## Bộ đóng gói và tài nguyên

`scripts/build-public-game.mjs` đọc entrypoint, script/link/CSS và ES module import; không bundle, minify hay đổi thứ tự. Các tải động được bổ sung từ catalog NPC, catalog atlas, ba scene và manifest đã duyệt `scripts/public-game.config.json`. Khi thêm cơ chế tải động mới cần cập nhật manifest và kiểm thử trình duyệt; đây không phải trình phân tích mọi biểu thức JavaScript.

`public-game` gồm **130 tệp, 152.183.091 byte = 152,18 MB = 145,13 MiB**:

| Nhóm | Số tệp | Dung lượng byte |
| --- | ---: | ---: |
| JavaScript: game, Three.js, GLTFLoader, MAP/nhà/nội thất/môi trường/VFX | 65 | 1.231.552 |
| CSS | 9 | 40.567 |
| HTML: root, game, diễn họa vũ khí, bản đồ tổng | 4 | 4.421.139 |
| JSON gameplay/hội thoại/nhiệm vụ | 3 | 12.482 |
| NPC GLB | 8 | 76.690.388 |
| PNG và JPG trong gallery game, MAP, vũ khí | 40 | 69.785.820 |
| Giấy phép Three.js | 1 | 1.143 |

- Ba MAP: `lang-viet`, `lang-tan-thu`, `ngoai-lang-dong-tre`. Nhà dân, nội thất, thời tiết, ánh sáng và vũ khí dựng bằng mã Three.js hiện có.
- Đủ 8 NPC; kiểm tra header/độ dài GLB, **30 animation và 22 ảnh texture nhúng**; đối chiếu clip idle và one-shot theo `gameplay.json`. Không thay đổi vị trí, model hay clip.
- `git lfs ls-files` không liệt kê tài nguyên nào. Bộ đóng gói cũng kiểm tra nội dung từng tệp để từ chối con trỏ LFS. GLB đang là dữ liệu nhị phân thật; tệp lớn nhất là Thầy đồ, **11.110.544 byte**, không cần chuyển LFS cho bước này.
- Bản đồ tổng giữ vị trí `MAP/regions/viet-nam-map-toan-quoc-nguon-2025/source-package/04_Xem_Ban_Do.html`. SVG, nền và dữ liệu được nhúng sẵn trong trang, nên không cần xuất thêm các PNG/SVG nguồn, PDF, script Python hoặc JSON kiểm toán của gói.
- Âm thanh game dùng oscillator Web Audio trong `state-and-questions.js`; không có MP3/OGG/WAV được mã đang chạy tải. Đã giữ mã âm thanh.

Không xuất `.git`, BACKUP, `.env`, khóa máy chủ, tài khoản dịch vụ, token, dữ liệu người chơi, dependency, log, cache, tests, công cụ phát triển, PDF thiết kế, tài liệu riêng, ZIP gốc và ảnh MAP chưa được mã chạy dùng. Các tệp này giữ nguyên trên máy. Các bản `*.three.json` xuất cũ cũng không được game hiện tại tải nên không nằm trong bản web. Ảnh có tên `references`/`reference` vẫn được xuất khi gallery thực sự sử dụng; không loại bỏ ảnh theo tên thư mục một cách hàng loạt.

Firebase Web config là cấu hình client công khai cần cho đăng nhập, được giữ nguyên. Bộ kiểm tra dấu hiệu bí mật không thay thế rà soát nội dung mỗi lần bổ sung dữ liệu mới.

## Chạy và kiểm tra lại

Từ gốc CAP-NHAT, dùng Node 22.23.3 trong PATH của phiên PowerShell (xem README):

```powershell
npm.cmd run build:hosting
npm.cmd run test:hosting
npm.cmd run preview:hosting
```

Mở [bản đóng gói tại localhost](http://localhost:5005/). Tại terminal thứ hai cùng thư mục và Node 22:

```powershell
node scripts/check-hosting-http.mjs http://127.0.0.1:5005
```

`build:hosting` tạo bản staging dưới `.cache/hosting`, so sánh hash rồi mới thay bản xuất. Không ghi vào mã nguồn. Nếu có `public-game` chưa có manifest hoặc bị sửa/thêm tệp, script dừng, không ghi đè. Bản xuất cũ hợp lệ được giữ trong `previous-*`. Manifest/SHA-256 và báo cáo HTTP ở `.cache/hosting/package-manifest.json`, `.cache/hosting/http-check.json`; không phục vụ các báo cáo này trên web.

## Kết quả thực tế

- 6 kiểm tra riêng cho đóng gói đạt; `--check` xác nhận toàn bộ bản xuất khớp nguồn.
- `npm test` chạy bằng Node 22.23.3: **231 test và 4 nhóm kiểm tra logic đều đạt**, không có test thất bại; log tại `.cache/hosting/regression-tests.log`. Không chạy lại backend emulator vì Rules/Functions không thay đổi.
- Hosting Emulator báo `Serving hosting files from: public-game`, HTTP `127.0.0.1:5005`.
- **130/130 tài nguyên HTTP 200, SHA-256 khớp nguồn**; bao gồm 8 GLB, module tải GLB, cấu hình NPC, scene MAP và gallery. 11 URL dò tệp không xuất bản/route không tồn tại trả về **404**.
- Trực tiếp trên trình duyệt Codex: mở `/` chuyển đúng entrypoint; Google Login hiện nút hoạt động sau Firebase SDK; atlas độc lập hiển thị, phóng to và chọn Thăng Long; trang diễn họa dựng cảnh WebGL và thi triển Côn Quét. Không thấy lỗi JavaScript/WebGL trong các thao tác này. Có cảnh báo deprecation có sẵn của Three.js khi dùng `three.min.js`; giữ nguyên vì game đang phụ thuộc script toàn cục.
- **Người dùng xác nhận tại localhost:5005**: đã đăng nhập Google, đủ 8 NPC, mở được bản đồ tổng. Đây là thao tác tài khoản thật do người dùng thực hiện, không phải phiên đăng nhập mô phỏng của công cụ.
- Chưa trực tiếp thử đầy đủ tương tác cả 8 NPC/chuyển MAP trong phiên tài khoản người dùng trên bản xuất, chưa thử điện thoại/FPS/tải mạng chậm; chưa kiểm tra HTTPS/domain Hosting online vì chưa triển khai.

## Tệp thêm/sửa

| Tệp | Mục đích |
| --- | --- |
| `.firebaserc` (mới) | Chọn Firebase project hiện có |
| `firebase.json` | Bổ sung Hosting và cổng emulator; giữ backend |
| `scripts/public-game.config.json` (mới) | Manifest tài nguyên động được phép xuất |
| `scripts/build-public-game.mjs` (mới) | Đóng gói, kiểm tra an toàn, hash và clip GLB |
| `scripts/check-hosting-http.mjs` (mới) | Xác minh tệp được phục vụ và URL không xuất bản |
| `SOURCE-CODE/tests/hosting-package.test.mjs` (mới) | Kiểm tra thiếu tài nguyên, tệp bí mật, LFS và cấu hình |
| `package.json` | Lệnh build/test/preview Hosting; dependencies không đổi |
| `.gitignore` | Loại trừ bản sinh `public-game/` |
| `README.md` | Cách chạy bản đóng gói với Node 22 |
| `SOURCE-CODE/docs/firebase-hosting.md` (mới) | Báo cáo này |

Chưa commit hoặc push các thay đổi. `public-game/`, `.cache/hosting/` và log emulator được Git bỏ qua. Không sửa thư mục chính hoặc nhánh `main`.

## Backend game kết nối

| Dịch vụ | Cấu hình | Trạng thái hiện tại |
| --- | --- | --- |
| Firebase project | `viet-village-3d` | Giữ nguyên |
| Authentication | `viet-village-3d.firebaseapp.com`, Web SDK 13.0.0 từ `www.gstatic.com` | Google Login thật; localhost đã được phép |
| Realtime Database | `https://viet-village-3d-default-rtdb.asia-southeast1.firebasedatabase.app` | Có cấu hình; profile/room client chưa khởi tạo vì `onlineConfig.enabled=false` |
| Cloud Firestore | Project `viet-village-3d`, database mặc định, collection `players` trong mã chuẩn bị | Chưa đọc/ghi hồ sơ thật |
| Cloud Functions | Project trên, vùng `asia-southeast1` | Mã gọi phòng đã chuẩn bị nhưng đang tắt |
| Storage | `viet-village-3d.firebasestorage.app` | Chỉ có cấu hình, không dùng để tải NPC/ảnh trong bản này |

Hosting Emulator chỉ phục vụ tệp. Nó không chuyển Auth sang emulator: Google Sign-In vẫn cần Internet và tài khoản thật. Không thay đổi `onlineConfig.enabled`, không deploy Rules/Functions và không mở quyền database. Việc triển khai online sau này cần quyết định riêng đích preview/site, domain đăng nhập và phê duyệt của chủ dự án; không dùng lệnh deploy toàn bộ backend cho bước Hosting.
