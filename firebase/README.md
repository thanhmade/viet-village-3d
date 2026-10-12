# Giai đoạn 7.2 — Hồ sơ và phòng chơi

Thư mục làm việc: `H:\CHAT GPT\3D-GAME\VIET-VILLAGE-3D\VIET-VILLAGE-3D-CAP-NHAT`.
Nhánh: `cap-nhat`, đồng bộ độc lập với `main`. Backend/rules chưa deploy và các thay đổi thử nghiệm chưa merge vào bản chính.

## Trạng thái hiện tại

- Đã viết phần hồ sơ Firestore, giao diện phòng, client Realtime Database, backend Cloud Functions và Security Rules.
- Google Login vẫn dùng Firebase Authentication và chỉ mở game sau khi xác minh phiên Google hợp lệ. Người dùng đã xác nhận đăng nhập, mở game, đăng xuất trên localhost:8001 hoạt động.
- `SOURCE-CODE/js/online-config.js` hiện đặt `enabled: false`: chưa ghi hồ sơ hoặc phòng vào Firebase thật. Giao diện thông báo chờ phê duyệt backend/rules; các nút lưu và tham gia phòng chưa được bật.
- Hai UID, đồng bộ dữ liệu, mất mạng/kết nối lại và giới hạn phòng đã kiểm thử bằng SDK/Functions/Rules thật trong emulator. Danh tính thử nghiệm chỉ thuộc emulator, chưa thay thế kiểm thử hai tài khoản Google thật trong phòng online.
- Chưa thay đổi Security Rules trên Console, cấp quyền giáo viên thật, triển khai Functions hoặc bật multiplayer thật.

## Chạy cục bộ

Mở PowerShell trong chính worktree này:

```powershell
Set-Location -LiteralPath 'H:\CHAT GPT\3D-GAME\VIET-VILLAGE-3D\VIET-VILLAGE-3D-CAP-NHAT'
git rev-parse --show-toplevel
git branch --show-current
python -m http.server 8001 --bind 127.0.0.1
```

Mở `http://localhost:8001/SOURCE-CODE/index.html`. Nếu server 8001 đang chạy, dùng server đó; không mở thêm tiến trình trên cùng cổng. Bản chính vẫn dùng 8000.
Game là HTML/JavaScript tĩnh; không cần bước build hoặc cài npm để chơi. Các gói npm phục vụ backend và kiểm thử.

```powershell
npm.cmd test
npm.cmd run test:firebase
```

Để giữ emulator chạy: `npm.cmd run emulators`. Launcher kiểm tra Git root và nhánh, luôn dùng project `demo-viet-village-3d`, chỉ lắng nghe loopback. Không cung cấp lệnh deploy trong launcher.

Bộ công cụ đã được cài riêng ở đây theo sự đồng ý của người dùng: Firebase CLI 15.33.0, Firebase SDK 13.0.0, rules-unit-testing 6.0.0. Backend dùng Admin SDK 14.5.0, Functions SDK 7.4.0, Node.js 22. Node 22 portable nằm trong `.local-tools`; Java 21 đã có sẵn trong Android Studio, không cài Java mới. Launcher giữ cache/JAR/tệp tạm trong `.cache`. Các thư mục này và `node_modules` được Git bỏ qua.

Trên máy khác, cài dependency từ lockfile trong worktree bằng Node 22: `npm.cmd ci --cache .cache/npm --ignore-scripts --no-audit --no-fund`. Cần Java 21+ để chạy emulator.

## Dữ liệu và quyền

Firestore `players/{uid}` chỉ chứa:

| Trường | Ý nghĩa |
| --- | --- |
| `uid` | Firebase UID, bất biến |
| `nickname` | Biệt danh 1–24 ký tự; không dùng email |
| `avatarId` | Một trong ba nhân vật áo xanh lá, xanh dương, hồng |
| `createdAt` | Timestamp máy chủ, không được sửa |
| `lastLoginAt` | Timestamp máy chủ khi tải hồ sơ/đăng nhập |
| `schemaVersion` | Phiên bản cấu trúc, hiện là 1 |

Chỉ chính UID đã đăng nhập Google được đọc/lưu hồ sơ. Không cho liệt kê hồ sơ, đọc hồ sơ của người khác, thêm email, role, điểm số hoặc token. Firebase Auth vẫn quản lý danh tính Google; ứng dụng không sao chép email/ảnh Google sang hồ sơ hay danh sách phòng.

Realtime Database:

```text
rooms/{CODE}/meta
  ownerUid, title, status, maxPlayers: 8, createdAt, closedAt (khi đóng)
rooms/{CODE}/members/{UID}
  nickname, avatarId, joinedAt, leaseExpiresAt
  connections/{CONNECTION_ID}: joinedAt, leaseExpiresAt
presence/{CODE}/{UID}/{CONNECTION_ID}
  x, y, z, yaw, mapId, moving, updatedAt
```

- Mã phòng gồm 6 chữ/số. Meta của một mã cụ thể được người đăng nhập Google đọc; không cho liệt kê toàn bộ phòng.
- Thành viên còn hiệu lực được đọc thành viên/vị trí trong chính phòng của mình. Chủ phòng có claim giáo viên và quản trị viên có quyền đọc/quản lý phù hợp.
- Backend lấy biệt danh/avatar từ hồ sơ Firestore, không tin role, UID, số chỗ hoặc hồ sơ do client gửi trong yêu cầu vào phòng.
- Chỉ backend tạo phòng hoặc thêm thành viên. Client chỉ gia hạn kết nối đã được cấp, ghi vị trí của chính UID/kết nối và xóa kết nối của mình. Không được sửa metadata, hồ sơ phòng hoặc tạo thêm kết nối tùy ý.
- Dữ liệu vị trí có giới hạn tọa độ, hướng, map ID và timestamp máy chủ; từ chối trường thừa. Đây là đồng bộ chuyển động, chưa phải hệ thống chống gian lận di chuyển hoặc chấm điểm.
- Mọi đường dẫn khác khóa đọc/ghi. Dữ liệu học tập/điểm chưa mở cho trình duyệt.

Vai trò `teacher`/`admin` lấy từ **custom claim `role` trên Firebase ID token**. Chỉ môi trường máy chủ tin cậy với Admin SDK được cấp claim. Không có ô tự chọn giáo viên hoặc cách cấp role bằng hồ sơ/database. [Tài liệu Firebase về custom claims](https://firebase.google.com/docs/auth/admin/custom-claims).

## Kiểm soát phòng và kết nối

Backend chuẩn bị bốn callable: `createVillageRoom`, `joinVillageRoom`, `leaveVillageRoom`, `closeVillageRoom` tại `asia-southeast1`. Trigger `releaseVillageConnection` dọn thành viên/vị trí khi mất kết nối. Runtime Node 22.

Tạo/tham gia/rời/đóng phòng dùng transaction trên phòng. Transaction giữ subscription trong lúc xử lý để tránh nhầm snapshot local chưa tải với phòng không tồn tại; Firebase tự thử lại khi có ghi đồng thời.

- Tối đa **8 UID**, tính cả giáo viên đang tham gia. Một tài khoản mở nhiều cửa sổ vẫn là một người; tối đa 4 kết nối cho UID trong phòng.
- Kết nối có lease 60 giây, gia hạn mỗi 15 giây. Client dùng độ lệch giờ từ Firebase và biên 2 giây.
- `onDisconnect` xóa riêng kết nối/vị trí; trigger dọn UID khi không còn kết nối. Reservation bị bỏ dở hết lease được loại bỏ khi transaction tham gia tiếp theo xử lý.
- Khi kết nối RTDB gián đoạn nhưng phiên Google còn được xác minh: ẩn nhân vật từ xa, dừng listener/heartbeat cũ, giữ mã phòng. Khi kết nối RTDB trở lại: xin kết nối mới qua backend rồi đăng ký lại listener. Nếu phòng đóng/đầy hoặc bị từ chối, hiển thị thông báo để người dùng xử lý.
- Khi trình duyệt báo mất Internet hoặc phiên Auth không còn hợp lệ, giữ cách khóa game của Google Login hiện có: rời phòng và kiểm tra lại Firebase trước khi mở game. Sau khi xác minh lại, người dùng nhập lại mã phòng. Chưa kiểm thử luồng này với hai tài khoản Google thật trên Firebase production.
- Rời phòng/đăng xuất: xóa dữ liệu kết nối trước khi hủy `onDisconnect`; không xóa các cửa sổ khác của cùng UID.
- Đồng bộ vị trí tối đa 10 lần/giây khi thay đổi; heartbeat gửi lại vị trí. Nhân vật từ xa dùng UID, nội suy vị trí/hướng, biệt danh và avatar. Chỉ hiển thị trong cùng `village` hoặc `house-1` đến `house-6`; tối đa 7 nhân vật từ xa. Không thay đổi hình học hay vật liệu gốc khi dọn bản sao.
- Nút “Đi cùng bạn” thêm chế độ đi lại bằng điều khiển đang có, dùng va chạm/camera của game. Chế độ xem cảnh và nội thất cũ vẫn được giữ.

## Kết quả kiểm thử — 11/10/2026

| Kiểm tra | Kết quả và giới hạn |
| --- | --- |
| Google Login, vào game, đăng xuất | Người dùng xác nhận hoạt động thật ở localhost:8001 |
| `npm test` | 4 nhóm kiểm tra game cũ và 7 bài unit mới đạt; renderer được mô phỏng, không phải đo GPU |
| `npm run test:firebase` | 10 bài đạt; Firestore, RTDB, Functions SDK chạy thật trên emulator |
| Hồ sơ | Chủ UID, timestamp máy chủ; từ chối email/role/điểm/list/nội dung người khác và tài khoản chưa đăng nhập |
| Phòng | Google bắt buộc; chỉ claim tin cậy tạo/đóng; học sinh không tự thêm thành viên hoặc tăng số chỗ |
| Đồng thời | 12 yêu cầu vào phòng: 7 học sinh được vào cùng giáo viên, 5 bị từ chối vì đầy; không vượt 8 UID |
| Hai UID với client SDK | Cùng thấy thành viên/vị trí, mất mạng ẩn peers, tự tham gia lại bằng connection ID mới, rời phòng dọn dữ liệu |
| Nhiều kết nối một UID | Một chỗ; rời một kết nối giữ kết nối còn lại |
| Bản sao nhân vật Three.js | UID riêng, tối đa 7 peers, lọc cùng map; giữ geometry/vật liệu mô hình gốc |
| Trình duyệt trước đăng nhập | Không khởi tạo cảnh 3D; nút vào game bị khóa; trang login không có console error khi kiểm tra |
| Màn hình 390 × 844 | Login vừa chiều rộng, nút đăng nhập 48px; chưa kiểm tra phòng multiplayer thật trên điện thoại |
| Tài nguyên localhost | 44 đường dẫn HTML/CSS/JS/ảnh trả HTTP 200 |
| Bảo toàn dữ liệu | SHA-256 tổng hợp của 208 tệp bản chính và 84 tệp tài nguyên/map/nội thất/môi trường của CAP-NHAT giữ nguyên so với trước khi sửa |

Các cảnh báo `permission_denied` trong log emulator đến từ các bài cố tình thử truy cập trái phép và phải bị từ chối. Test token/role/UID thuộc project demo, không phải bằng chứng đăng nhập Google thật. [Tài liệu Firebase về mock auth trong kiểm thử Rules](https://firebase.google.com/docs/rules/unit-tests).

## Danh sách tệp

Tổng cộng 27 tệp thuộc thay đổi này: 6 tệp hiện có đã sửa và 21 tệp mới; bộ công cụ/cache/ảnh kiểm tra được bỏ qua bởi Git.

Tệp hiện có đã sửa:

- `.gitignore`
- `SOURCE-CODE/index.html`, `SOURCE-CODE/css/style.css`
- `SOURCE-CODE/js/app.js`, `SOURCE-CODE/js/legacy-game-controls.js`
- `SOURCE-CODE/tests/harness.cjs`

Tệp mới:

- `SOURCE-CODE/css/online.css`
- `SOURCE-CODE/js/auth-entry.js`, `auth-session.js`, `firebase-config.js` — đưa phần Google Login đã có ở bản chính vào riêng worktree từ origin/main; thêm databaseURL do người dùng cung cấp.
- `SOURCE-CODE/js/online-config.js`, `online-entry.js`, `player-profile.js`, `room-client.js`, `remote-players.js`
- `SOURCE-CODE/tests/online-unit.test.mjs`, `firebase-emulator.test.mjs`
- `firebase/firestore.rules`, `firebase/database.rules.json`
- `firebase/functions/package.json`, `index.cjs`, `room-service.cjs`
- `firebase/README.md`, `firebase.json`, `package.json`, `package-lock.json`, `scripts/firebase-local.mjs`

Không sửa ASSETS, MAP, BUILDINGS, CHARACTERS, INTERIORS, ENVIRONMENT của bản thử nghiệm. Không sửa tệp bản chính hoặc BACKUP. Firebase Web config là cấu hình công khai; không thêm service-account key, mật khẩu hoặc token thật vào mã nguồn.

## Các việc cần phê duyệt trước khi dùng Firebase thật

1. Xác nhận project `viet-village-3d` và databaseURL đã cung cấp. Xem hai tệp Rules và mã Functions trong worktree này. Sao lưu Rules hiện tại trước khi áp dụng, không ghi đè BACKUP cũ.
2. Xác nhận triển khai **backend Firebase** gồm Rules và 5 Functions đã chuẩn bị. Việc này độc lập với xuất bản giao diện/Vercel. Cần kiểm tra quyền tài khoản quản trị, vùng database và Firestore mặc định, dịch vụ/API liên quan trước khi triển khai.
3. Kiểm tra gói Blaze và đồng ý ngân sách/cảnh báo chi phí nếu cần dùng Cloud Functions. Chưa thực hiện nâng gói hay thao tác thanh toán. [Điều kiện triển khai Functions của Firebase](https://firebase.google.com/docs/functions/get-started).
4. Chọn UID Google thật được cấp `role: teacher` (hoặc admin nếu thực sự cần). Cấp qua Admin SDK ở môi trường tin cậy, giữ các claim khác; không đưa credential máy chủ vào Git. Đăng nhập lại/làm mới ID token sau khi cấp quyền.
5. Sau khi backend, Rules và quyền giáo viên được xác nhận, mới bật `onlineConfig.enabled` trên **cap-nhat**. Kiểm tra tạo hồ sơ thật, đổi biệt danh/avatar, giáo viên tạo phòng, học sinh nhập mã, số người, rời/đóng phòng bằng hai tài khoản Google khác nhau trong hai hồ sơ trình duyệt.
6. Kiểm tra đăng xuất/đăng nhập lại, mất mạng/kết nối lại, hai cửa sổ cùng UID, tài khoản ngoài phòng bị từ chối; thử 8 người và đo FPS/WebGL/băng thông trên máy tính/điện thoại. Chưa kết luận hiệu năng thật chỉ từ emulator.

Chưa mở lưu điểm/kết quả học tập; giai đoạn sau cần backend xác thực kết quả. Chưa deploy Vercel, push hoặc merge vào main, và chưa thay đổi website ChatGPT Sites.
