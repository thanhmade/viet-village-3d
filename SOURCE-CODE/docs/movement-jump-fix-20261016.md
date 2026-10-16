# Sửa cất vũ khí, chuyển động và nhảy — 16/10/2026

Nguồn kiểm tra: `thanhmade/viet-village-3d`, nhánh `cap-nhat`, commit gốc
`f5a2fa0eefdf0137152f998095eff525124d2fb4`.

## Thay đổi

- **Cất vũ khí:** `deactivate()` không còn gọi `stopRoaming()`. Chỉ ẩn trang bị/hiệu ứng; giữ actor, camera, bản đồ và chế độ đi bộ. Thoát game/đăng xuất vẫn do bộ điều khiển game xử lý.
- **Di chuyển:** thêm bộ điều khiển vận tốc dùng delta time, tăng/giảm tốc, xoay theo hướng dịch chuyển thực tế và đường quay ngắn nhất. Va chạm được chia bước tối đa 1/120 giây. Camera bám vị trí có nội suy; nhân vật khối không còn bị nâng hạ toàn thân bằng sóng sin. Đi theo đường không giảm tốc ở từng điểm trung gian.
- **Hoạt ảnh:** giữ các clip GLB Nam/Nữ hiện có, chỉnh tốc độ phát theo vận tốc, giữ pha bước giữa walk/run và dùng hai ngưỡng chuyển walk/run để tránh đổi qua lại khi vận tốc dao động.
- **Nhảy:** Space trên PC; nút Nhảy trên điện thoại. Giữ WASD/joystick khi nhảy. Tốc độ đầu 6,4 m/s, gia tốc trọng trường 18 m/s²: độ cao cực đại khoảng 1,14 m trên mặt bằng và thời gian bay khoảng 0,71 giây. Không nhảy thêm khi còn trên không.
- **Va chạm theo độ cao:** vượt và tiếp đất trên hàng rào thấp quanh sân nhà Làng Việt; gánh tre, giỏ tre đã đánh dấu; các chum thấp ở Đồng Tre. Không mở quyền xuyên tường, cây, giếng, ruộng nước, ao/sông, hàng rào biên hoặc ranh giới bản đồ. Vật cản chưa có độ cao được khai báo vẫn chặn.
- **Nhảy + GLB:** độ cao thật do actor điều khiển; clip jump không cộng thêm độ cao lần nữa. Chế độ xem thử hoạt ảnh giữ chuyển động gốc. Khi đổi bản đồ/vị trí điều khiển, trạng thái nhảy được đặt lại.
- **Cảm ứng:** một lần chạm nút Nhảy chỉ gọi một lần dù có sự kiện click tiếp theo; không xóa joystick. Mất pointer capture của joystick giải phóng input.

Không thay Authentication, Database Rules, dữ liệu người chơi, nhiệm vụ hoặc file BAT. Không sửa mô hình GLB.

## Kiểm chứng

- 68 kiểm thử đạt trong lượt tổng hợp: player-motion, player-gltf, player-avatar, weapons-village, dong-tre-scene, pond-integration.
- 1 kiểm thử bổ sung cho chạm Nhảy rồi click, giữ joystick và hủy pointer.
- 6 kiểm thử Hosting package đạt.
- Hai GLB thực tế Nam/Nữ có Git blob SHA khớp commit gốc. Kiểm thử dùng skeleton và clip thật; bitmap trong bộ kiểm thử Node được mô phỏng, không phải kiểm chứng hình ảnh GPU.
- Kiểm tra vị trí ở 30/60/120 Hz; nhảy qua vật cản thấp; không vượt tường/mặt nước/ranh giới; không nhảy hai lần; tiếp đất trên vật cản và rơi xuống khi bước khỏi.
- Build `public-game`: 373 tệp, 222.030.420 byte, kiểm tra 59 GLB; chạy `build-public-game.mjs --check` khớp nguồn.
- HTTP cục bộ: 8 đường dẫn HTML/JS/GLB/JSON trả 200, hash khớp manifest; các JSON parse thành công.

Lệnh kiểm thử chính:

```sh
node --test SOURCE-CODE/tests/player-motion.test.cjs SOURCE-CODE/tests/player-gltf.test.cjs SOURCE-CODE/tests/player-avatar.test.cjs SOURCE-CODE/tests/weapons-village.test.cjs SOURCE-CODE/tests/dong-tre-scene.test.cjs SOURCE-CODE/tests/pond-integration.test.cjs
node --test SOURCE-CODE/tests/hosting-package.test.mjs
npm run build:hosting
node scripts/build-public-game.mjs --check
```

## Giới hạn và trạng thái triển khai

- Bản sửa thực hiện trong workspace từ nguồn GitHub; không có truy cập trực tiếp ổ H: của người dùng.
- Chưa kiểm tra GPU/trình duyệt hay điện thoại thật trong lượt này. Chromium không có sẵn; cài đặt phụ thuộc không được môi trường cho phép và tải trình duyệt thất bại. Chưa khẳng định chất lượng chuyển động nhìn bằng mắt đã được duyệt.
- Chưa deploy Firebase. Không có phiên CLI/ADC/credentials Firebase trong môi trường; Firebase plugin được tìm thấy nhưng chưa cài/kết nối tại lúc bàn giao. Không yêu cầu đưa token vào chat.
- Cấu hình đã đọc: project `viet-village-3d`, Hosting site `viet-village-3d`, public `public-game`, predeploy chỉ build tệp web; không có Hosting rewrites. Channel cần cập nhật: `alpha`.
- URL Alpha đã dùng: https://viet-village-3d--alpha-g1lx8owy.web.app . Đây là bản online trước sửa, chưa phải bằng chứng bản vá đã triển khai. Chưa xác minh hạn kênh qua CLI.
- Không tác động `main`, live Hosting, Functions hay Rules.

## Tiếp tục trên máy Windows

Trong `H:\CHAT GPT\3D-GAME\VIET-VILLAGE-3D\VIET-VILLAGE-3D-CAP-NHAT`:

1. Đọc AGENTS.md và trạng thái Git hiện tại; giữ mọi thay đổi chưa commit. Fetch và tích hợp commit sửa này từ origin/cap-nhat; chỉ pull --ff-only khi nhánh/trạng thái cho phép, không reset --hard hoặc ghi đè công việc khác.
2. Chạy các kiểm thử trên, mở game qua máy chủ HTTP và đăng nhập thật. Thử cả Nam/Nữ, 5 vũ khí; WASD/Shift + Space, joystick + Nhảy; cất vũ khí khi đứng/di chuyển; hàng rào sân nhà, cầu/ao, Đồng Tre; mở menu, chuyển ứng dụng, đổi bản đồ và quay lại.
3. Xem thực tế độ mượt, chân chạm đất, camera và bố cục ở 844×390, 1366×768; thử điện thoại thật riêng. Nếu cần chỉnh tiếp, commit/push lên cap-nhat và ghi lại SHA mới.
4. Build từ nguồn đã kiểm thử. Xác minh project/site/channel bằng Firebase CLI đang đăng nhập trên máy. Chỉ triển khai Hosting Alpha, ví dụ `firebase hosting:channel:deploy alpha --project viet-village-3d` sau khi đối chiếu cấu hình hiện tại. Không dùng deploy toàn bộ hoặc live.
5. Lấy URL và ngày hết hạn thực từ CLI; kiểm tra bản online có `SOURCE-CODE/js/player-motion.js`, nguồn mới và dữ liệu JSON đúng. Báo riêng GitHub và Firebase; không nhận là hoàn tất online nếu chưa deploy.
