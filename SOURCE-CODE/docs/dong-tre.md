# Đồng Tre — cảnh 3D và cổng hai chiều

Thực hiện ngày 11/10/2026 tại `H:\CHAT GPT\3D-GAME\VIET-VILLAGE-3D\VIET-VILLAGE-3D-CAP-NHAT`, Git root đúng thư mục này, nhánh `cap-nhat`. Giữ các thay đổi có trước. Không commit, push, merge, triển khai hoặc sửa bản chính/Firebase thật.

> Điều kiện vào hiện tại: xem [chính sách Đồng Tre](dong-tre-access.md). Đã bật `gameplay`: nhân vật phải tự đi ít nhất 3 m và dùng thành công một kỹ năng, cùng các điều kiện sống/cấp/MAP sẵn sàng. Xem [kết quả kiểm thử hồ sơ riêng](dong-tre-gameplay-check.md).

## Chạy và sử dụng

Mở <http://localhost:8001/SOURCE-CODE/index.html>, tải lại trang nếu đang mở bản cũ. Đăng nhập Google như trước rồi chọn **Khám phá làng 3D**.

- **Công cụ → Bản đồ tổng → Ngoại ô Làng Việt – Đồng Tre → Đến khu vực**: vào bằng spawn atlas.
- Ở Làng Việt, chọn **Đi tới cổng Đồng Tre · E** để nhân vật đi đến cổng, hoặc tự đi tới vòng xanh bên cạnh cổng Tân Thủ. Khi thấy hướng dẫn, nhấn **E** hoặc chạm nút xanh để chuyển.
- Ở Đồng Tre, chọn **Đi tới cổng Làng Việt · Nhấn E**, rồi nhấn E/chạm nút khi đến gần.
- Đi bộ, joystick và ba chiêu vũ khí dùng điều khiển hiện có. Chỉ đứng trong cổng Đồng Tre sẽ không tự dịch chuyển. Giữ phím E không chuyển lặp.
- Các cổng nhà và Làng Tân Thủ vẫn dùng điều kiện đứng 0,8 giây như trước.

Nếu cần chạy lại máy chủ, mở PowerShell ngay tại CAP-NHAT:

```powershell
python -m http.server 8001 --bind 127.0.0.1
```

Dự án HTML/JS tĩnh, không cần build hoặc cài thư viện mới cho phần này.

## Mã MAP và điểm xuất hiện

Giữ ID chọn trong gói atlas là `dong_tre`; tái sử dụng mã thư mục tham chiếu `ngoai-lang-dong-tre` làm mapId/network mapId. Khu vực thuộc Làng Việt (`parentMapId: lang-viet`). Không tạo ID vùng trùng khác.

| MAP | spawnId | Tọa độ x, y, z | Dùng khi |
|---|---|---|---|
| `ngoai-lang-dong-tre` | `village-entry` | `0, 0.3, 15` | Đến từ bản đồ tổng; spawn mặc định |
| `ngoai-lang-dong-tre` | `from-lang-viet` | `0, 0.3, 17` | Đi qua cổng từ Làng Việt |
| `lang-viet` | `from-dong-tre` | `5, 0.3, 16.5` | Quay về từ Đồng Tre |

Cổng ở Làng Việt: ID `dong-tre`, tâm `(5, 0.335, 20)`, đích `ngoai-lang-dong-tre/from-lang-viet`. Cổng ở Đồng Tre: ID `lang-viet`, tâm `(0, 0.335, 20.5)`, đích `lang-viet/from-dong-tre`. Vòng hình học bán kính 1m, vùng tương tác 1,8m. Cả ba spawn đều trên sàn hợp lệ, ngoài vùng tương tác và có đường đi thông tới cổng.

## Cảnh và bố cục theo ảnh

Đã đọc đủ bốn PNG trong `MAP/regions/ngoai-lang-dong-tre/references/`: trước, trái, phải, sau, cùng `docs/HUONG_DAN_MAP.md`. Không thiếu ảnh. Ảnh vẫn là tham chiếu, không dùng làm mặt phẳng thay cảnh.

Cảnh dựng bằng Three.js dùng chung renderer, vật liệu kiểu game và hệ thống môi trường: cổng/sân phía nam, nhà mái ngói phía tây, nhà mái rơm phía đông, giếng và cây; suối ngang cùng cầu gỗ ở giữa; ruộng phía tây bắc, rặng tre phía đông bắc, đường vòng tới ba bãi tập và hang đá phía bắc. Nhà mới là công trình ngoại cảnh, chưa mở nội thất riêng; hình nhân là đạo cụ, chưa thêm AI/quái/NPC hoặc logic nhiệm vụ mới.

Kích thước đi được trong biên x từ -25 đến 25 và z từ -27 đến 27; nhân vật và tỷ lệ điều khiển được giữ nguyên. Sông chỉ băng qua được tại cầu; độ cao đường dốc theo mặt sàn thật. Nhà, giếng, cây, ruộng, đá và lan can chặn đi xuyên; hang có lối vào đi được. Cảnh cung cấp camera blockers, mái che mưa, mặt nước, vật liệu ướt và đèn cho bộ môi trường sẵn có. Minimap có nhánh dựng riêng theo metadata của Đồng Tre.

Hình học cảnh tĩnh: **29 draw calls, 79.459 tam giác, 5.702 instances**, hai đèn điểm không tạo shadow. Đây là số liệu scene, không phải tổng draw calls gồm cổng/nhân vật/VFX và không phải cam kết FPS trên mọi máy.

## Chuyển vùng và bảo toàn trạng thái

Manager đăng ký factory `createDongTreRegion` và các spawn trước khi atlas bật nút. Scene chỉ dựng khi cần và được giữ trong cache; 10 vòng khứ hồi không tạo thêm scene. Trước khi chuyển, manager kiểm factory, spawn, nền và vùng kích hoạt. Cùng đối tượng nhân vật, camera, trang bị, cooldown và tiến độ được tái sử dụng. Không tải lại trang hoặc đăng nhập lại. Hoạt ảnh chiêu đang diễn ra được dừng khi chuyển để không để hiệu ứng ở sai map; trang bị/kỹ năng/cooldown được giữ.

Cổng E có khóa sau mỗi lần chuyển, cần ra khỏi vùng tương tác để được kích hoạt tiếp. Overlay, mất focus, ẩn tab, vào nội thất và các chế độ xem công trình khóa tương tác. Nếu dựng đích hoặc cập nhật cảnh lỗi, thông báo rõ, giữ/khôi phục MAP nguồn, vị trí và camera. Không thử lại liên tục mỗi frame.

## Tệp tạo/sửa trong đợt này

Tạo mới:

- `MAP/regions/ngoai-lang-dong-tre/scene.js`: cảnh 3D, floor/collision, spawns, cổng, metadata môi trường.
- `SOURCE-CODE/tests/dong-tre-scene.test.cjs`: 7 bài kiểm hình học, đường đi, raycast sàn, nguồn và tài nguyên GPU.
- `SOURCE-CODE/tests/dong-tre-travel.test.cjs`: 8 bài tích hợp manager, E, joystick/nút chạm, bảo toàn trạng thái và rollback.
- `SOURCE-CODE/docs/dong-tre.md`: báo cáo này.

Chỉnh sửa:

- `MAP/atlas-destinations.js`: nối `dong_tre` với MAP/spawn đã đăng ký.
- `MAP/regions/lang-viet/scene.js`: thêm cổng E và điểm quay về, giữ cổng Tân Thủ cũ.
- `MAP/navigation.js`: minimap Đồng Tre; giữ pathfinding hiện có.
- `SOURCE-CODE/js/region-travel.js`: factory thứ ba, named spawns, manual gates, lazy cache và kiểm tra/rollback.
- `SOURCE-CODE/js/legacy-game-controls.js`: phím E không lặp, tuân theo khóa điều khiển/đăng nhập.
- `SOURCE-CODE/index.html`, `SOURCE-CODE/load-order.json`: tải scene, nút đi tới cổng/nút chạm và vùng lời nhắc.
- `SOURCE-CODE/css/regions.css`: nút cổng nhận chạm riêng, lời nhắc không đè đồng hồ hoặc thanh chiêu.
- `SOURCE-CODE/tests/region-travel.test.cjs`, `SOURCE-CODE/tests/world-atlas.test.cjs`: cập nhật danh mục ba vùng và spawn thực.
- `firebase/database.rules.json`: thêm chính xác ID Đồng Tre vào allowlist pose.
- `SOURCE-CODE/tests/firebase-emulator.test.mjs`: kiểm ID mới và từ chối ID/quyền/session/tọa độ sai.
- `package.json`: thêm `test:dong-tre` vào `npm test`.
- `SOURCE-CODE/docs/world-atlas.md`: trạng thái Đồng Tre hiện tại và số khu còn khóa.

Controller `world-atlas.js`, ảnh và dữ liệu gói atlas, mã Google Login, VFX và nội thất hiện có không đổi trong đợt này. Các thay đổi đã có trước, kể cả danh sách tệp VFX bị xóa sẵn trong Git status, được giữ nguyên.

## Kết quả kiểm tra

- `npm test`: **141/141 Node tests đạt**, cùng 4 chương trình kiểm hình học/môi trường hiện có. Riêng Đồng Tre 15/15; atlas 12/12; vùng cũ 22/22.
- Firebase emulator: **10/10 đạt**; rules cho phép đúng mapId, từ chối alias sai/anonymous/người ngoài/giả UID/session sai/tọa độ quá giới hạn. Emulator đã dừng.
- Test bằng scene Three.js thật trong Node: sàn raycast cầu khớp groundHeight sai lệch tối đa 0,00134m; toàn vòng đường, cổng và spawn đi được, không xuyên sông hay đạo cụ; raycast mái/camera đúng. WebGL renderer/auth được thay thế trong harness, không dùng kết quả đó để tuyên bố đăng nhập thật.
- Trình duyệt localhost dùng phiên Google thật đang có: atlas hiển thị **Sẵn sàng**, nút Đến khu vực vào được Đồng Tre.
- **10 vòng khứ hồi thực tế (20 lần chuyển)** bằng dẫn đường + phím E giữa Đồng Tre/Làng Việt; tên khu và Kiếm được kiểm sau từng chiều. Không bị chuyển lặp, rơi hoặc mắc ở điểm đến. Test tự động riêng cũng chạy 10 vòng và kiểm identity/trang bị/cooldown/tiến độ/camera/cache.
- Đi WASD từ sân lên cầu và qua bờ bên kia; cả ba chiêu Kiếm tạo VFX thật ở cảnh Đồng Tre.
- Viewport điện thoại **390×844**: menu tự thu gọn sau chọn, lời nhắc rõ, nút chạm chuyển được hai chiều, Kiếm giữ nguyên. Phát hiện và đã sửa lỗi HUD chặn pointer-events của nút; kiểm lại trên browser đạt. Joystick được kiểm bằng harness; chưa thử trên điện thoại vật lý.
- Console phiên browser kiểm thử không có lỗi JavaScript/WebGL. Cảnh báo Three.js classic/deprecated trong Node là cảnh báo thư viện cũ hiện có.
- Lỗi factory, spawn không an toàn và lỗi khi commit cảnh được gây có chủ đích trong test: MAP/vị trí/camera nguồn được giữ; retry chỉ sau thao tác hợp lệ. Không làm hỏng tài nguyên thật hoặc giả lập thành công đăng nhập.
- **58/58 URL localhost HTTP 200**, nội dung trùng SHA-256 trên ổ đĩa; 42 mục load-order khớp HTML và đúng tên/chữ hoa thường. 10 JS/CJS được kiểm cú pháp; diff của 15 tệp mã không có lỗi khoảng trắng.
- **30/30 tệp nguồn** giữ nguyên hash: 4 PNG Đồng Tre và 26 tệp gói atlas. Không dịch chuyển thư mục/tệp gốc.

Log, hash và ảnh kiểm thử chỉ nằm trong `.cache/dong-tre-integration/`, được loại khỏi Git.

## Giới hạn

Chưa thử điện thoại vật lý, benchmark dài hạn trên máy cấu hình thấp hoặc hai người chơi thật cùng Đồng Tre. Rules mới chỉ là tệp cục bộ đã kiểm emulator: chưa áp dụng lên Firebase thật. Nếu multiplayer thật còn dùng rules cũ, cần duyệt và triển khai allowlist này trong một bước riêng trước khi đồng bộ pose ở Đồng Tre. Không tự mở database, cập nhật Firebase, push GitHub hoặc deploy website.
