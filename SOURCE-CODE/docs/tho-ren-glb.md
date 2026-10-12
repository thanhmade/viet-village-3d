# Thợ rèn — tích hợp trong CAP-NHAT

Ngày kiểm tra: 12/10/2026. Thư mục thực thi và Git root:
`H:\CHAT GPT\3D-GAME\VIET-VILLAGE-3D\VIET-VILLAGE-3D-CAP-NHAT`, nhánh `cap-nhat`.
Không tìm thấy AGENTS.md áp dụng. Bảo toàn thay đổi có từ trước; không sửa bản chính, commit, push hoặc triển khai.

## Vị trí, model và animation

- ID `NPC_LANG_VIET_THO_REN`, MAP `lang-viet`.
- Hồ sơ `LANG_VIET_NPC_PORTAL_DE_XUAT/DESIGN/LANG_VIET_NPC_PORTAL_DESIGN.json` chỉ định nhà gần cổng bên trái; đã xem `REF_01_CHINH_DIEN.jpg`, đối chiếu `BUILDINGS/houses.js`, `MAP/house-portals.js` và hệ va chạm.
- Nhà thực tế `(-11, 10)`, cửa `nha-03`. NPC ở sân cạnh hiên, bên phải cửa: `(-8.95, 0.56, 14.15)`, tiếp cận `(-9.8, 14.4)`, hướng ban đầu 0 rad. Không lấy tọa độ schematic làm vị trí 3D.
- Nền lối vào nhà này được nâng cao để đi qua khu vườn. Raycast từ trên nền xác nhận Y = `0.56`; `groundOffset = 0`, chiều cao model 2,4 m. Bán kính cản 0,56 m; nói chuyện trong 2,2 m.
- NPC nằm ngoài vòng vào nhà `(-11, 14.4)`, không chắn cửa, điểm ra sân `(-12.65, 14.4)` hoặc hàng rào. Đường tự động từ điểm xuất hiện tới NPC đã được thử trong game.
- Model 11.029.720 byte, 22.501 đỉnh, 18.949 tam giác; 3 texture base color, normal, roughness/metallic nhúng trong GLB. Không gắn búa hoặc vũ khí vào tay.
- SHA-256 GLB giữ nguyên: `796ba9188d6c036a4aacae0149ee32aacda022c30245e8b5b8dc76a9ec67c296`.
- `idle` lặp 15,33 giây; `greet_01` chào một lần 3,5 giây; `fold_arms` một lần 17,08 giây; `agree` 4 giây được đăng ký để dùng khi có giao dịch thật. Tái sử dụng chuyển mượt 250 ms, căn chân và khóa trôi Hips.

## Hội thoại và tình trạng dịch vụ

Lời chào: “Chào khách! Cần xem trang bị hay sửa lại đồ dùng? Cứ để ta xem.”

| Lựa chọn | Hành vi hiện tại |
| --- | --- |
| Xem trang bị | Báo cửa hàng chưa sẵn sàng vì chưa có danh mục bán, bảng giá, ví tiền và túi đồ giao dịch |
| Sửa chữa | Báo chưa có chỉ số độ bền và bảng chi phí; không sửa hoặc trừ tiền |
| Hỏi về nghề rèn | Phát `fold_arms` và giới thiệu ngắn về nung, tạo dáng, tôi, mài và kiểm tra dụng cụ |
| Kết thúc / nút đóng / Esc | Đóng ngay, trả điều khiển, chuyển về idle kể cả khi động tác chưa kết thúc |

Đã rà soát các script đang được nạp, `weapons-village.js`, dữ liệu vũ khí, hồ sơ người chơi và mã Firebase: hiện có bộ chọn/cầm vũ khí để dùng kỹ năng, nhưng chưa có API cửa hàng, giá bán, tiền, sức chứa túi đồ, độ bền hoặc sửa chữa. Điểm học tập không phải tiền. Những trường inventory trong bài test chuyển MAP là dữ liệu kiểm thử, không phải hệ thống túi đồ của game.

Theo yêu cầu khi thiếu hệ thống, chưa xây dựng giao dịch giả, không tự đặt giá và không tạo bước xác nhận mua/sửa. Hai nút dịch vụ chỉ hiện thông báo, không gọi bộ chọn vũ khí để cấp đồ. `agree` được kiểm tra như clip thật nhưng chưa phát qua nút giao dịch vì chưa có giao dịch thành công thật.

Các handler kiểm tra phiên hội thoại, UID, MAP, trạng thái sống, khoảng cách và chuyển cảnh; handler cũ không tác động sang hội thoại mới. Động tác đang chạy không được xếp chồng khi bấm liên tục. Đã sửa mất focus khi khóa nút động tác: chuyển focus sang nút đóng để Esc và Tab vẫn hoạt động.

## Kết quả kiểm tra

- Các nhóm trong `npm test`: tổng 208 bài và 4 script kiểm tra hình học/logic. Lần chạy đầu có 3 lỗi ở fixture GLTF cũ giả định toàn làng cao 0,3 m; đã cập nhật fixture theo lối vào nhà phía trước cao 0,56 m. Không sửa nền game để chiều theo test.
- Sau sửa, `npm run test:npcs`: **45/45 đạt**, gồm 7 bài mới của Thợ rèn. Các nhóm còn lại đã đạt trong lần chạy toàn bộ.
- GLTFLoader, geometry, skin và AnimationMixer thật: clip chính xác, texture nhúng, chiều cao, chân chạm nền suốt các clip, không trôi, một lần rồi về idle; clip `agree` cũng đạt.
- Va chạm, điểm tiếp cận, đường đi và cửa ra/vào được kiểm tra trên cảnh thật trong harness. Rời MAP và quay lại giữ đúng một Thợ rèn, tổng 6 NPC và 1 bia tập.
- Bấm mua/sửa mỗi nút 20 lần: không thay tiến độ, điểm, HP, trang bị, dữ liệu nhân vật hoặc ghi localStorage; không phát `agree` giả. Kiểm tra bấm chồng động tác, đóng giữa chào/khoanh tay, handler cũ, quá xa, đổi tài khoản và lỗi tải model đều đạt.
- Năm NPC đã có vẫn tải và tương tác; bộ kiểm tra riêng của Lý trưởng, Võ sư, Tuần đinh, Thầy đồ và Thầy thuốc vẫn đạt.
- Trình duyệt localhost với phiên Google hiện có: mở game, danh sách 6 NPC, đi tới Thợ rèn, hiện Nói chuyện, chào, xem trang bị, sửa chữa, giới thiệu nghề, Kết thúc và Esc giữa `fold_arms` đã được thao tác thực tế. Model và chất liệu hiển thị đúng; không ghi nhận lỗi JavaScript/WebGL mới. Còn cảnh báo cũ của Three.js về script classic.
- Chưa kiểm thử giao dịch thành công/thiếu tiền/túi đầy vì chưa có hệ thống giao dịch; chưa đo trên điện thoại thật. Harness không thay thế kiểm tra GPU: phần hình ảnh được kiểm tra riêng trên localhost.

Log và ảnh: `.cache/tho-ren-glb/full-tests.log`, `npc-regression.log`, `model-tests.log`, `smith-in-village.jpg`. Snapshot trước sửa ở `.cache/tho-ren-glb/before/`; toàn bộ thư mục này được Git bỏ qua.

## Tệp tạo/sửa

| Tệp | Nội dung |
| --- | --- |
| `MAP/regions/lang-viet/gameplay.json` | Thêm Thợ rèn, tọa độ đã đo và model/clip |
| `MAP/regions/lang-viet/dialogues.json` | Lời chào, dịch vụ chưa sẵn sàng, giới thiệu nghề |
| `SOURCE-CODE/js/village-npcs.js` | Nút dịch vụ, kiểm tra handler, giữ focus khi khóa động tác |
| `SOURCE-CODE/js/app.js` | Dấu cache dữ liệu NPC |
| `SOURCE-CODE/index.html` | Dấu cache script |
| `SOURCE-CODE/tests/tho-ren-gltf.test.cjs` | Mới: 7 bài kiểm tra |
| `SOURCE-CODE/tests/npc-gltf.test.cjs` | Cập nhật số NPC và fixture nền cao |
| `SOURCE-CODE/tests/village-npcs.test.cjs` | Số lượng 6 NPC + bia tập |
| `SOURCE-CODE/tests/vo-su-gltf.test.cjs` | Cập nhật tổng số NPC |
| `SOURCE-CODE/tests/tuan-dinh-gltf.test.cjs` | Cập nhật tổng số NPC |
| `SOURCE-CODE/tests/thay-do-gltf.test.cjs` | Cập nhật tổng số NPC |
| `SOURCE-CODE/tests/thay-thuoc-gltf.test.cjs` | Cập nhật tổng số NPC |
| `package.json` | Thêm test Thợ rèn |
| `SOURCE-CODE/docs/tho-ren-glb.md` | Báo cáo này |

Hồ sơ hiện chỉ định vị trí khu nghề rèn; cảnh chưa có lò/đe riêng. Chưa bổ sung các đạo cụ này hoặc cơ chế nâng cấp trang bị. Khi triển khai mua/sửa sau này cần danh mục và giá thật, ví tiền, sức chứa túi, độ bền và giao dịch nguyên tử chống xử lý lặp; hiển thị báo giá trước xác nhận, chỉ phát `agree` sau kết quả thành công được xác nhận.

Chơi thử tại `http://localhost:8001/SOURCE-CODE/index.html`, Ctrl+F5 → vào game → **Công cụ → Dân làng → Đi tới Thợ rèn → Nói chuyện (F)**.
