# MALE và bộ điều khiển Nam/Nữ — CAP-NHAT, cập nhật 13/10/2026

## Mở bản thử và phạm vi

Git root: `H:\CHAT GPT\3D-GAME\VIET-VILLAGE-3D\VIET-VILLAGE-3D-CAP-NHAT`, nhánh `cap-nhat`.
Chạy `START-GAME.bat` tại đây; bản nguồn được xác minh đang ở
http://localhost:8002/SOURCE-CODE/index.html.

Tài khoản chưa có nhân vật: Google Login → chọn **Nam** hoặc **Nữ** → đặt tên →
**Tạo nhân vật & vào làng**. Hồ sơ đã có mở qua **Công cụ → Nhân vật** ở chế độ xem,
không được ghi đè để kiểm thử. Thêm `?characterTest=1` trên localhost, rồi chọn
**Công cụ → Nhân vật → Kiểm tra hoạt ảnh → Mẫu Nam/Mẫu Nữ** để đổi mẫu trong phiên;
F5 sẽ nạp lại mẫu đã lưu của tài khoản.

Không chỉnh main, GitHub, Firebase Rules/config, Alpha hay live. Giữ nguyên GLB,
ZIP nhiều phần và các thay đổi chưa commit từ trước. Không rebuild `public-game`.

## Tệp thật và cấu hình

| Thuộc tính | MALE |
|---|---|
| Nguồn | `CHARACTERS/PLAYER/MALE/PLAYER_BASE_MALE_GLB.glb` |
| Kích thước | 13.156.272 byte |
| Mã hồ sơ / avatar | `male-base` / `male` |
| Chiều cao / hướng | 2,35 m / `forwardYaw: 0` |
| Skin | 65 khớp, cùng tên và phân cấp với FEMALE |
| Mesh / vật liệu / morph | 1 / 1 / 0 |
| Hình học | 20.874 đỉnh, 18.845 tam giác |
| Texture nhúng | base color JPEG 4096², normal JPEG 2048², metallic/roughness PNG 2048²; đã giải mã ảnh |

Hai tệp có cùng tập 33 tên animation nhưng khác thứ tự: `idle` của Nam ở index 14,
của Nữ ở index 26. Không dùng các index này trong gameplay: tra action theo tên
và lấy clip của chính GLB được chọn. Không retarget hoặc tạo lại skeleton.

`idle`, `walk`, `run` dùng cùng controller/va chạm hiện có; crossfade 200 ms,
không reset mỗi frame. `jump` nối Space/nút Nhảy hiện có, `slash` chỉ sau thao tác
ra chiêu cận chiến thành công, `hit_to_body_01` nối HP giảm.
`greet_01`, `bow`, `agree`, `cheer`, `clap` đi qua sự kiện NPC hiện có.
`defeat_02`/`defeat_03` vẫn phải được xem hết trước khi chọn cho phiên;
không giả định clip `defeat` hoặc tự quyết thay người dùng.

Khóa Hips X/Z về rest pose của chính mẫu để không cộng root motion vào di chuyển
controller. Dữ liệu run Hips Z của Nam khoảng 0,494127, khác Nữ khoảng 0,524119;
vì vậy không dùng offset của Nữ cho Nam. Giữ biến thiên Y của jump, căn bàn chân
theo mô hình và nền; collider/camera/player root cũ được giữ.

Các socket phải/trái nhận diện khớp nguồn `mixamorig:RightHand` và
`mixamorig:LeftHand`, lấy tâm lòng bàn tay và rest rotation từ từng GLB.
Vị trí lòng bàn tay Nam ở idle trong không gian chuẩn hóa xấp xỉ
phải [-0,319192; 1,048961; 0,043125], trái [0,316786; 1,048178; 0,040339].
Cán của 5 vũ khí được kiểm tra theo socket riêng trong idle/run/slash.
Chưa có animation nắm ngón tay hoặc kéo cung hai tay dành riêng từng vũ khí.

## Tải mẫu và lưu hồ sơ

- Catalog dùng chung cho preview và game; có cấu hình visual riêng từng mẫu.
- Mỗi mẫu có GLB/texture/skeleton/mixer riêng. Trong game chỉ mẫu đang chọn hiện và
  cập nhật mixer. Hai mẫu cache tối đa một instance mỗi mẫu; tránh tải lại khi đổi thử.
- Số thứ tự yêu cầu bảo vệ lựa chọn cuối, kể cả khi tải cũ hoàn thành/lỗi muộn.
  Đổi UID/đăng xuất vô hiệu hóa yêu cầu cũ. Preview giải phóng riêng khi đổi/đóng,
  không dispose nhầm tài nguyên avatar đang chơi.
- Store cũ giữ UID, `schemaVersion`, `created`, `modelId`, tên hợp lệ, customization
  `{}`, chiều cao và `starter-default`. Không sửa store hoặc tạo kho lưu mới.
- Đọc lỗi không thành “hồ sơ mới”; lưu lỗi giữ draft. Nhấn tạo lặp chỉ ghi một lần.
  Không ghi đè hồ sơ đã tạo, LV/EXP/túi đồ/trang bị/nhiệm vụ hoặc khóa hành trình khác.
- Tài khoản mới dùng `lang-viet / village-entry`; xác thực lại cùng UID giữ vị trí
  phiên đang chơi. F5 vẫn vào điểm an toàn vì game chưa có lưu vị trí qua tải trang.
- Hồ sơ chỉ lưu localStorage theo UID trong cùng browser/origin; chưa đồng bộ cloud.

Nam không có morph targets hay mesh/vật liệu tách cho ngoại hình. Tóc, mặt, mắt,
mũi, miệng, tai, tuổi, chiều cao và trang phục tiếp tục báo thiếu dữ liệu;
không thêm slider giả hoặc đổi màu toàn bộ vật liệu.

## Kiểm tra

| Phạm vi | Kết quả / bằng chứng |
|---|---|
| Toàn dự án | `npm test`: 297/297 test và 5 script logic/geometry/auth đạt; Node 22.23.3 |
| Character suite | 62/62: 11 store, 16 creation, 17 avatar, 18 GLB/preview |
| GLB thật | Đọc 2 GLB: 65 khớp, 33 tên, thứ tự khác; own clips/root lock/feet/socket/animation once/dispose độc lập đạt |
| Gameplay tự động | Controller thật với DOM/renderer mô phỏng: đi/chạy, jump, hit, slash, NPC events, đổi MAP giữ model/HP/trang bị/cooldown; lỗi tải/auth race đạt |
| Hồ sơ tự động | Chọn Nam → save `male-base` → tạo controller mới/tái đăng nhập → vẫn Nam; giữ byte dữ liệu hành trình; lỗi đọc/lưu/model và tạo lặp đạt |
| HTTP | 6 tệp source/GLB kiểm tra HTTP 200 khớp byte trên đĩa; không phải public-game hoặc LFS pointer |
| Browser component | Giao diện và GLB thật trong trang kiểm thử bộ nhớ riêng: đổi Nam/Nữ liên tục, Nam cuối cùng đúng hình/texture; xoay/zoom bằng bàn phím, chính diện; lỗi lưu giữ tên/mẫu, retry lưu `male-base` đúng 1 lần |
| Browser game, 12/10 | Phiên Google đang có, hồ sơ Nữ giữ nguyên; đổi sang Nam tạm thời qua bảng thử, tải đủ 33 clip; thấy Nam đi lại, nhảy và cầm kiếm |
| NPC trực tiếp | Danh sách đủ 8 NPC; đi tới Thợ rèn, hiện Nói chuyện, mở lời chào, chọn Xem trang bị nhận đúng thông báo chưa có cửa hàng, đóng hội thoại được |
| MAP trực tiếp | Nam + kiếm + HP 100/100: Làng Việt → Làng Tân Thủ → Làng Việt bằng Bản đồ tổng; sau về vẫn đúng mẫu Nam và kiếm. Chưa hoàn tất riêng chuyến quay về bằng vòng 0,8 giây trong lượt này |
| F5 trực tiếp, 12/10 | Firebase xác thực lại, vào làng; Công cụ → Nhân vật vẫn tên “Nữ thử nghiệm”, Nữ được chọn và hồ sơ readonly. Đổi Nam trong phiên thử không ghi đè hồ sơ Nữ cũ |
| Tạo Nam trực tiếp, 13/10 | Trong tab game 8002 đã xác thực Google, màn hình tạo mới có Nam được chọn và ô tên còn trống. Nhập “Nam thử nghiệm”, bấm Tạo nhân vật & vào làng; thấy trạng thái đang lưu và nút bị khóa, sau đó vào Làng Việt với mô hình Nam, HP 100/100 |
| F5 hồ sơ Nam trực tiếp, 13/10 | Tải lại trang, Firebase xác thực phiên rồi game tự vào làng. Công cụ → Nhân vật mở hồ sơ readonly: tên “Nam thử nghiệm”, Nam có aria-pressed=true, Nữ có aria-pressed=false |
| Đăng xuất/đăng nhập lại hồ sơ Nam, 13/10 | Đăng xuất thành công về Google Login; người dùng chọn lại tài khoản Google, game mở Làng Việt. Công cụ → Nhân vật hiện NHÂN VẬT CỦA EM, tên “Nam thử nghiệm” bị khóa sửa, Nam được chọn và Nữ không được chọn |
| Preview hồ sơ Nam sau đăng nhập lại, 13/10 | Thấy mô hình Nam với texture trong hồ sơ và trạng thái “Đã tải đúng mẫu Nam của Nam thử nghiệm.” |
| Console | Không ghi nhận lỗi JavaScript/WebGL/GLB trong lượt browser; có cảnh báo global build Three.js cũ |

Trang component ghi rõ không đăng nhập Google, không chạy game và không ghi dữ liệu
người chơi. Không coi kết quả fixture/test mô phỏng là chứng cứ đăng nhập Google thật.
Ngày 13/10 đã kiểm chứng trực tiếp toàn luồng tạo → lưu → vào làng → F5 → đăng
xuất → người dùng đăng nhập Google lại → vẫn giữ tên và mẫu Nam. Bước đăng nhập
lại được kiểm tra riêng sau đăng xuất, không suy ra từ việc F5 còn phiên đăng nhập.
Không xóa hoặc ghi đè hồ sơ Nữ cũ để tạo Nam.

Giới hạn: jump là hoạt ảnh tại chỗ, collider vẫn trên nền, chưa nhảy vượt vật cản;
chiêu vũ khí hiện là VFX, chưa triển khai sát thương. Chưa đo FPS dài hạn hoặc thử
cảm ứng thật cho mẫu Nam. Giữ Shift chạy và clip hit được kiểm tra tự động, chưa
thao tác trực tiếp trong browser ở lượt này. Tab nền bị giảm tốc độ cập nhật nên
không dùng số FPS của phiên tự động làm benchmark. Console có cảnh báo global build Three.js cũ;
không đổi hệ script toàn cục trong công việc này.

## Kiểm tra tiếp ngày 13/10/2026

- Xác nhận lại Git root đúng CAP-NHAT, nhánh `cap-nhat`, giữ nguyên các thay đổi chưa commit.
- Máy chủ và tab từ phiên trước không còn hoạt động. Khởi động lại launcher trên
  `127.0.0.1:8002`, xác minh identity đúng CAP-NHAT và đủ 8 NPC. Tiến trình server
  thử trong sandbox không nhận được kết nối đã được dừng; chỉ thay chính tiến trình
  vừa tạo bằng server local ngoài sandbox. Không dừng ứng dụng khác.
- Chạy lại `npm run test:characters` với Node 22.23.3: **62/62 đạt**.
  `git diff --check` không báo lỗi. Không cần sửa thêm logic nhân vật sau rà soát.
- HTTP 200 và byte khớp đĩa cho entry HTML, character-creation.js, character-models.js,
  MALE GLB và FEMALE GLB. Console trước đăng nhập chỉ có cảnh báo Three.js cũ.
- Sau khi người dùng đăng nhập, đã kiểm tra trực tiếp màn hình khởi tạo thật trong
  tab Codex 8002. Chọn Nam, nhập “Nam thử nghiệm”, lưu và vào Làng Việt thành công;
  quan sát trạng thái lưu khóa nút, mô hình Nam và HP 100/100. Đây là trang game
  có phiên Google hợp lệ, không phải trang component hoặc dữ liệu giả.
- F5 xác thực lại phiên và tự vào làng. Mở Công cụ → Nhân vật: hồ sơ chỉ đọc giữ
  đúng tên “Nam thử nghiệm”, Nam được chọn, Nữ không được chọn.
- Đã đăng xuất và thấy màn hình Google Login. Người dùng chọn lại tài khoản trong
  cửa sổ Google; game mở Làng Việt. Sau khi đóng bảng chọn nơi dịch chuyển, mở hồ
  sơ thấy “NHÂN VẬT CỦA EM”, tên “Nam thử nghiệm” chỉ đọc, Nam được chọn và Nữ
  không được chọn. Đã xác nhận khôi phục hồ sơ sau đăng nhập lại thực tế.
- Preview hồ sơ tải mô hình Nam với texture và báo “Đã tải đúng mẫu Nam của Nam
  thử nghiệm.” Console lượt kiểm tra này chỉ có cảnh báo global build Three.js cũ,
  không có bản ghi lỗi.
- Chỉ cập nhật báo cáo và log kiểm thử local; chưa push, merge, rebuild public-game,
  deploy hoặc thay đổi Firebase. Hồ sơ cũ chưa bị sửa/xóa.

## Tệp thay đổi trong lượt MALE

- `CHARACTERS/player-gltf.js`: nhận modelId/chiều cao/hướng riêng, giữ animation/calibration theo GLB.
- `SOURCE-CODE/js/character-models.js`: đăng ký Male thật, catalog chia sẻ với classic controller.
- `SOURCE-CODE/js/character-creation.js`: lựa chọn/default/catalog, chặn đổi hồ sơ readonly.
- `SOURCE-CODE/js/character-preview.js`: nhận cấu hình visual riêng, frame theo chiều cao.
- `SOURCE-CODE/js/player-avatar.js`: cache/race-safe Nam/Nữ, animation và socket mẫu đang chọn.
- `SOURCE-CODE/js/app.js`: nối saved model qua catalog; dùng `isGLTF` cho cả hai mẫu.
- `SOURCE-CODE/index.html`: nút Mẫu Nam, mô tả hỗ trợ hai mẫu; giữ thứ tự script.
- `SOURCE-CODE/tests/character-creation.test.mjs`, `player-avatar.test.cjs`, `player-gltf.test.cjs`: hồi quy Nam/Nữ.
- `scripts/public-game.config.json`: đăng ký GLB Nam cho lần đóng gói sau, không chạy build/deploy.
- `README.md`, `SOURCE-CODE/docs/character-creation.md`, `female-integration.md`: hướng dẫn và liên kết mốc mới.
- `SOURCE-CODE/docs/male-integration.md`: báo cáo này.

Không chỉnh binary GLB. Các tệp đang modified/untracked khác trong Git status thuộc
các lượt FEMALE/khởi tạo trước; không coi toàn bộ chúng là thay đổi của lượt MALE.
