# Thầy thuốc — bản thử nghiệm CAP-NHAT

Kiểm tra ngày 12/10/2026 tại Git root và thư mục thực thi
`H:\CHAT GPT\3D-GAME\VIET-VILLAGE-3D\VIET-VILLAGE-3D-CAP-NHAT`, nhánh `cap-nhat`.
Không có AGENTS.md áp dụng. Giữ các thay đổi có từ trước. Không sửa bản chính, commit, push hoặc thay đổi Firebase.

## Vị trí và tài nguyên

- ID `NPC_LANG_VIET_THAY_THUOC`, MAP `lang-viet`.
- Hồ sơ thiết kế đặt nhà thuốc tại nhà giữa dãy phải. Cảnh thực tế xác định nhà `(11, 0)`, cửa `nha-05`; không sử dụng tọa độ schematic.
- NPC ở `(13.05, 0.3, 3.83)`, sân lát đá sát hiên, bên phải cửa. Điểm tiếp cận `(12.2, 4.25)`. Va chạm bán kính 0,56 m; tương tác trong 2,2 m và chênh cao dưới 0,85 m.
- Raycast trên mesh sàn cho cao độ `0.3225`; `groundOffset = 0.0225`, chiều cao model 2,4 m. Giữ cơ chế căn chân và khóa trôi Hips hiện có.
- Vòng vào nhà `(11, 4.4)`, điểm quay ra `(9.35, 4.4)`, cửa và đường đi không bị NPC chắn. Đã đi bằng đường tự động từ điểm xuất hiện tới NPC trên localhost, không tự vào nhà.
- GLB gốc: `CHARACTERS/NPC/LANG_VIET/THAY_THUOC/NPC_LANG_VIET_THAY_THUOC.glb`, 10.643.504 byte, 21.788 đỉnh, 19.068 tam giác. Ba texture base color, normal, roughness/metallic nhúng trong GLB.
- SHA-256 giữ nguyên: `5cca79a501cc3a9a12231b3159c3c5da4bc51769bf1450c53788f8833e71d8b8`.

## Hội thoại và hồi phục

Lời chào: “Đi đường xa chắc con đã mệt. Hãy nghỉ chân, ta có thể giúp con hồi phục.”

- `idle` lặp (15,33 giây). Mở hội thoại phát `bow` một lần (6 giây), chuyển về idle trong 250 ms.
- Ba lựa chọn: **Hồi phục**, **Hỏi về thảo dược**, **Kết thúc**. Nút đóng và Esc luôn dùng được, kể cả giữa animation.
- Mã trước đây chỉ có `alive`, cấp độ và hướng dẫn; chưa có số HP, ví tiền hoặc quy tắc hồi phục. Đã mở rộng `player-journey.js`: HP tối đa 100, khởi đầu 100, API nhận sát thương và hồi đầy; thống nhất HP bằng 0 với trạng thái không còn sống.
- Hồi phục thử nghiệm miễn phí. Phải còn sống, cùng tài khoản đã mở hội thoại, đang ở Làng Việt, đứng gần NPC, không chuyển cảnh và không có động tác đang chạy. Kiểm tra ngay lúc bấm, không chỉ vô hiệu hóa nút.
- HP đầy chỉ hiện thông báo, không phát hiệu ứng hoặc animation hồi phục. Hồi thành công cập nhật HP thật và thanh HP, phát `agree` một lần (4 giây), vòng sáng xanh nhẹ trong khoảng 1 giây. Hiệu ứng tái sử dụng một mesh, không dùng texture ngoài.
- Bấm liên tục không chồng animation. Handler của hội thoại đã đóng không được dùng lại, kể cả mở lại cùng NPC. Đổi UID/MAP hoặc nhân vật chết sẽ đóng hội thoại.
- Thảo dược chỉ có lời giới thiệu vì nhiệm vụ chưa được triển khai. Không thêm vật phẩm, phần thưởng hoặc điểm thu thập.

HP hiện là chỉ số cục bộ trong phiên chơi, được giữ khi chuyển MAP; tải lại trang hoặc đổi tài khoản sẽ khởi đầu 100 HP. Không ghi HP vào Firebase hay thay khóa lưu hướng dẫn/nhiệm vụ/điểm cũ. Đây chưa phải cơ chế HP được máy chủ xác thực cho multiplayer. Trong làng chưa có nguồn sát thương chiến đấu; không thêm quái hoặc nút gây sát thương vào game.

## Kiểm tra

- 201 bài kiểm tra trong các nhóm của `npm test` và 4 script hình học/logic: đạt sau khi sửa kỳ vọng số NPC trong test cũ. Lần chạy toàn bộ ban đầu có một assertion số lượng cũ (4 NPC + bia tập); đã cập nhật thành 5 NPC + bia tập và chạy lại `npm run test:npcs`: **38/38 đạt**.
- 7 bài mới dùng GLTFLoader, geometry, AnimationMixer và bộ điều khiển NPC thật: texture nhúng, clip chính xác, chiều cao, nền, va chạm, đường đi, căn chân suốt clip, không trôi, giữ clip một lần và chuyển idle.
- Hồ sơ tự động riêng: nhận 63 sát thương, HP `100 → 37`; chọn Hồi phục, HP `37 → 100`, thanh HP 100/100 và hiệu ứng bật, `agree` một lần. Bấm dồn, HP đầy, quá xa, chết, phiên đăng nhập đổi, handler cũ đều không hồi sai.
- Cấp độ, hướng dẫn, nhiệm vụ, tiến độ Toán và vũ khí giữ nguyên khi hồi phục. Đi Đồng Tre và quay về giữ HP, không sinh NPC trùng. Bốn NPC trước vẫn có hội thoại và clip chào đúng; các bộ test riêng của họ vẫn đạt.
- Localhost `http://localhost:8001/SOURCE-CODE/index.html`: phiên Google hiện có mở được game; danh sách 5 NPC; đi tới nhà thuốc; hiển thị model/texture, tên và Nói chuyện; cúi chào, trở về idle; thông báo HP đầy; giới thiệu thảo dược; Esc và Kết thúc trong lúc cúi chào hoạt động.
- Browser không ghi nhận lỗi JavaScript/WebGL khi kiểm tra. Có cảnh báo cũ của Three.js về bản script classic. Ảnh bằng chứng: `.cache/thay-thuoc-glb/healer-in-village.jpg`.
- Phép thử mất HP rồi hồi phục chạy trong harness tự động với hồ sơ tách biệt; không gây sát thương lên phiên Google đang mở. Chưa đo hiệu năng trên điện thoại thật và chưa thử HP qua backend multiplayer.

Log: `.cache/thay-thuoc-glb/full-tests.log`, `npc-regression.log`, `final-health-tests.log`. Harness dùng renderer giả lập cho kiểm tra logic; kiểm tra hình ảnh GPU thực tế được thực hiện riêng trên localhost.

## Các tệp tạo/sửa trong lần này

| Tệp | Thay đổi |
| --- | --- |
| `MAP/regions/lang-viet/gameplay.json` | Thêm NPC thứ năm, model, vị trí và clip |
| `MAP/regions/lang-viet/dialogues.json` | Lời chào, hồi phục và giới thiệu thảo dược |
| `SOURCE-CODE/js/player-journey.js` | HP trong phiên, nhận sát thương, hồi đầy, gắn với alive |
| `SOURCE-CODE/js/player-health-view.js` | Mới: thanh HP và hiệu ứng nhẹ |
| `SOURCE-CODE/js/village-npcs.js` | Dịch vụ hồi phục, kiểm tra điều kiện và chống thao tác cũ |
| `SOURCE-CODE/js/app.js` | Kết nối HP, hiệu ứng và trạng thái chuyển cảnh |
| `SOURCE-CODE/index.html` | Thanh HP, vùng thông báo dịch vụ, script và dấu cache |
| `SOURCE-CODE/css/village-npcs.css` | Kiểu thông báo hồi phục và thanh HP |
| `SOURCE-CODE/load-order.json` | Nạp module hiển thị HP |
| `SOURCE-CODE/tests/thay-thuoc-gltf.test.cjs` | Mới: 7 bài kiểm tra Thầy thuốc và HP |
| `SOURCE-CODE/tests/player-journey.test.cjs` | Bổ sung HP trong snapshot kỳ vọng |
| `SOURCE-CODE/tests/village-npcs.test.cjs` | Số lượng 5 NPC + bia tập |
| `SOURCE-CODE/tests/npc-gltf.test.cjs` | Cập nhật số lượng, giữ kiểm tra Lý trưởng |
| `SOURCE-CODE/tests/vo-su-gltf.test.cjs` | Cập nhật số lượng NPC |
| `SOURCE-CODE/tests/tuan-dinh-gltf.test.cjs` | Cập nhật số lượng NPC |
| `SOURCE-CODE/tests/thay-do-gltf.test.cjs` | Cập nhật số lượng NPC |
| `package.json` | Thêm bộ test Thầy thuốc vào nhóm NPC |
| `SOURCE-CODE/docs/thay-thuoc-glb.md` | Báo cáo này |

Snapshot trước sửa, nhật ký và ảnh nằm trong `.cache/thay-thuoc-glb/`, được Git bỏ qua. Không thay GLB, bộ dựng cảnh, dữ liệu của các NPC cũ hoặc Security Rules.

Để chơi thử: mở localhost, Ctrl+F5, vào game → **Công cụ → Dân làng → Đi tới Thầy thuốc**, rồi nhấn **F / Nói chuyện**.
