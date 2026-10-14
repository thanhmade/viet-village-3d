# Khởi tạo nhân vật và mẫu Nữ — CAP-NHAT, 12/10/2026

**Cập nhật MALE:** cả Nam/Nữ đã có GLB và được nối vào khởi tạo/game. Xem [báo cáo MALE](male-integration.md). Nhận định “chưa có mẫu Nam” và số test bên dưới thuộc mốc đầu, không phản ánh cấu hình hiện tại.

**Cập nhật tiếp theo:** xem [hoàn thiện luồng FEMALE](female-integration.md) để biết thay đổi mới về NPC, nhảy tại chỗ, điểm cầm vũ khí và giữ vị trí cùng phiên. Lượt này đã kiểm thử trực tiếp bằng phiên Google thật trong tab Codex; các kết quả dưới đây giữ mốc triển khai ban đầu.

## Mở bản chạy

Chạy START-GAME.bat trong CAP-NHAT. Máy chủ mã nguồn đã được xác minh tại
http://localhost:8002/SOURCE-CODE/index.html, nhánh `cap-nhat`.
Đây là bản nguồn; `public-game`, localhost:5005 và Firebase Alpha chưa được cập nhật.

Sau Google Login thật, tài khoản chưa có nhân vật sẽ thấy **KHỞI TẠO NHÂN VẬT**.
Chọn Nữ, nhập biệt danh 1–24 ký tự, bấm **Tạo nhân vật & vào làng**.
Tài khoản đã tạo sẽ tải mẫu đã lưu rồi vào làng. **Công cụ → Nhân vật** chỉ xem hồ sơ,
không tạo lại hoặc đặt lại hành trình.

Bảng hoạt ảnh chỉ mở khi dùng URL local
http://localhost:8002/SOURCE-CODE/index.html?characterTest=1:
**Công cụ → Nhân vật → Kiểm tra hoạt ảnh**.
Trong bảng này có thể thử 33 clip, dừng/tiếp tục, về idle hoặc tạm trở về nhân vật khối.
Thay đổi mẫu trong bảng kiểm tra chỉ có hiệu lực trong phiên; không sửa hồ sơ đã tạo.

## Tài nguyên đã kiểm tra

| Mẫu | Kết quả |
|---|---|
| Nữ | `CHARACTERS/PLAYER/FEMALE/PLAYER_BASE_FEMALE_GLB.glb`, 13.627.448 byte, GLB thật |
| Nam | Không tìm thấy `PLAYER_BASE_MALE_GLB.glb`; nút bị khóa và không đoán URL |
| Cấu trúc Nữ | 1 skinned mesh, 1 material, 20.195 vertex, 17.748 triangle, 65 khớp |
| Texture | 3 ảnh nhúng: basecolor JPEG 4096², normal JPEG 2048², metallic/roughness PNG 2048² |
| Hoạt ảnh | 33 clip đọc trực tiếp; idle, walk, run, jump, slash, hit_to_body_01, defeat_02, defeat_03 đều có; không có defeat |
| Tùy chỉnh | Không có morph target hoặc mesh trang phục/tóc tách riêng được cấu hình |

Tóc, khuôn mặt, mắt, mũi, miệng, tai, độ tuổi, chiều cao đều hiện
**Chưa có dữ liệu tùy chỉnh**. Giữ hình dáng/tuổi theo mẫu và cao 2,35 m theo quy ước game.
Trang phục: **Bộ tân thủ mặc định**. Không đổi màu toàn bộ vật liệu hoặc lưu slider giả.

## Lưu trữ và dữ liệu cũ

Firebase Authentication giữ nguyên. `onlineConfig.enabled` vẫn false; không ghi Firestore/RTDB,
không thay cấu hình Firebase hoặc Rules. Ngoại hình dùng localStorage theo UID, cùng phương pháp
tách tài khoản đang dùng cho tiến độ hướng dẫn. Đây chưa phải lưu hồ sơ lên đám mây.

Khóa: `viet-village:character:v1:<UID đã encodeURIComponent>`. Record có schemaVersion, UID
và trường character gồm schemaVersion=1, created=true, modelId, name, customization={},
height=2.35, outfitId=starter-default, createdAt. Không lưu email, token hoặc mật khẩu.
Tên hiển thị bằng textContent; chặn tên trống/quá 24 codepoint/ký tự điều khiển/@/< />.

Phân biệt missing, legacy, ready và lỗi đọc. JSON hỏng, phiên bản chưa hỗ trợ, UID sai hoặc lỗi
lưu trữ không được coi là chưa tạo. Nút tạo bị khóa đến khi tải lại hợp lệ.
Record cũ chưa có character được bổ sung riêng trường character, giữ trường khác.
Tài khoản cũ chưa có khóa này được tạo ngoại hình mới mà không đụng khóa nhiệm vụ/hướng dẫn/điểm.
Không thay LV, EXP, túi đồ, trang bị, nhiệm vụ hoặc HP để phục vụ khởi tạo.

Kiểm tra UID trước/sau các tác vụ bất đồng bộ; gom thao tác tạo lặp, dùng Web Locks trên trình
duyệt hỗ trợ để tuần tự hóa nhiều tab, đọc lại trước ghi và kiểm chứng sau ghi.
Lỗi ghi giữ tên/mẫu để thử lại. Hồ sơ đã tạo là bất biến trong màn hình này.
Lưu chỉ tồn tại trên cùng trình duyệt và origin: đổi cổng/thiết bị hoặc xóa dữ liệu trình duyệt
sẽ không tự mang ngoại hình theo. Đồng bộ cloud cần một giai đoạn backend/Rules riêng.

## Tích hợp nhân vật

- Giữ nguyên player/body, vị trí điều khiển, camera, va chạm, HP và hành trình. Mẫu khối được giữ để quay về khi kiểm thử; tải GLB lỗi giữ nhân vật cũ.
- Điểm khởi đầu dùng đăng ký `lang-viet / village-entry`: x=0, y=0,3, z=16,5, ngoài vòng dịch chuyển z=20. Mở hồ sơ không gọi lại điểm xuất hiện.
- Idle/walk/run theo quãng đường di chuyển thật; đứng trước vật cản trở về idle. Mixer cập nhật một lần mỗi frame, cache action, crossfade 200 ms; không reset clip mỗi frame.
- Khóa hips X/Z theo idle để loại bỏ offset của run; giữ chuyển động Y của jump. Căn nền lúc dựng và chỉ sửa xuyên nền, không ghim pha bay xuống đất.
- `slash` nối lần phát chiêu cận chiến thành công. Hiệu ứng vũ khí hiện chưa có sát thương. `hit_to_body_01` nối HP giảm qua hệ thống chỉ số hiện có.
- Chưa có vật lý nhảy: jump chỉ có nút xem thử, không tự thêm cơ chế nhảy gameplay.
- Phải xem hết defeat_02 và defeat_03 trong bảng thử rồi mới chọn động tác hết HP cho phiên. Chưa tự chọn thay người dùng.
- Xác minh khớp nguồn mixamorig:RightHand/LeftHand; loader bỏ dấu hai chấm. Socket theo bàn tay thật, bù scale cho vũ khí procedural; caster/VFX/cooldown giữ nguyên.
- Nhân vật từ xa vẫn dùng mẫu procedural theo giao thức phòng hiện tại; không clone sai skeleton cục bộ.
- Khung xem 3D riêng 30 FPS, DPR tối đa 1,5, dừng render làng sau màn hình khởi tạo. Hủy và giải phóng model cũ khi đổi/đóng; không giữ RAF chạy sau khi đóng.

## Kết quả kiểm tra

| Phạm vi | Bằng chứng và kết quả |
|---|---|
| Bộ kiểm tra cũ | 231 Node test đạt, cùng 5 script logic/geometry/auth; renderer được mô phỏng |
| Bộ kiểm tra mới | `npm run test:characters`: 42/42 đạt (11 lưu hồ sơ, 12 luồng tạo, 11 tích hợp avatar, 8 GLB thật) |
| Lỗi và thao tác đồng thời | Missing/legacy/ready, lỗi đọc/lưu/model, dữ liệu hỏng, nhấn tạo lặp, đổi UID/đăng xuất khi tải, retry giữ draft, profile không tạo lại đều đạt trong test tự động |
| Bảo toàn game | Test chạy mã điều khiển/va chạm/chuyển MAP thật với renderer mô phỏng; giữ root, HP, túi đồ fixture, hướng dẫn, cooldown; vào đúng village-entry |
| GLB thật | Loader/skin/33 clip/65 khớp/scale/feet/root motion/socket đạt; Node chỉ mô phỏng giải mã bitmap |
| HTTP nguồn | Nhận diện đúng CAP-NHAT:8002; 60 tệp HTTP khớp byte trên đĩa, bao gồm GLB; launcher xác nhận 8 NPC |
| Browser trực tiếp | Trang kiểm thử component riêng dùng GLB/giao diện thật, dữ liệu chỉ trong bộ nhớ. Thấy model/texture/idle, xem hồ sơ, chặn tên trống, lỗi ghi giữ draft, retry ghi một lần, xoay/zoom bằng bàn phím; không có lỗi Console/WebGL trong phạm vi này |
| Responsive | Đã xem desktop và viewport 390×844: mô hình, vùng cuộn và nút phía dưới hiện được; chưa thử chụm hai ngón trên thiết bị cảm ứng thật |
| Tài khoản Google thật | Người dùng xác nhận: “Đã vào làng, tải lại vẫn đúng tên và mẫu Nữ”. Không coi trang fixture là bằng chứng Google Login |
| Giới hạn trực tiếp | Tab Codex của agent chưa đăng nhập; chưa tự thao tác toàn bộ game bằng tài khoản thật hoặc xác nhận một vòng đăng xuất–đăng nhập sau tạo. Chưa thử đồng bộ nhiều thiết bị (chưa triển khai) |

Console còn cảnh báo cũ của Three.js về bản global build; chưa chuyển sang ES modules để tránh đổi thứ tự tải hiện tại.
Chưa đo FPS dài hạn với mẫu Nữ trên điện thoại. Chưa có mẫu Nam và dữ liệu thay tóc/mặt/trang phục/tuổi.

## Tệp tạo/sửa

Tạo:
- `CHARACTERS/player-gltf.js`
- `SOURCE-CODE/js/player-avatar.js`, `character-models.js`, `character-profile.js`, `character-preview.js`, `character-creation.js`
- `SOURCE-CODE/css/player-avatar.css`, `character-creation.css`
- `SOURCE-CODE/tests/player-gltf.test.cjs`, `player-avatar.test.cjs`, `character-profile.test.mjs`, `character-creation.test.mjs`
- Báo cáo này.

Sửa:
- `CHARACTERS/player-procedural.js` (đánh dấu các phần fallback)
- `SOURCE-CODE/index.html`, `load-order.json` (giao diện và thứ tự script)
- `SOURCE-CODE/js/app.js`, `auth-entry.js`, `legacy-game-controls.js` (luồng khởi tạo, điều khiển, khóa màn hình)
- `SOURCE-CODE/js/weapons-village.js`, `remote-players.js` (socket vũ khí, bảo toàn clone procedural)
- `package.json` (bổ sung test:characters), `README.md`
- `scripts/public-game.config.json` (đăng ký GLB để lần đóng gói sau có đủ tài nguyên; chưa chạy đóng gói)

GLB và các ZIP người dùng thêm được giữ nguyên. Trang fixture/log nằm trong `.cache`, được Git bỏ qua.
Không commit, push, merge, thay main, đóng máy chủ khác, rebuild public-game hoặc deploy Alpha/live.
