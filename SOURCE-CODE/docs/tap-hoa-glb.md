# Người bán hàng — tích hợp trong CAP-NHAT

Kiểm tra ngày 12/10/2026. Thư mục thực thi và Git root:
`H:\CHAT GPT\3D-GAME\VIET-VILLAGE-3D\VIET-VILLAGE-3D-CAP-NHAT`, nhánh `cap-nhat`.
Đã đọc hệ thống NPC, hội thoại, chỉ số người chơi, vũ khí và hồ sơ thiết kế. Không có AGENTS.md áp dụng. Giữ các thay đổi có từ trước; không cập nhật bản chính, commit, push hoặc triển khai.

## Vị trí và tài nguyên

- ID `NPC_LANG_VIET_TAP_HOA`, MAP `lang-viet`, role `merchant`.
- Hồ sơ `LANG_VIET_NPC_PORTAL_DE_XUAT/DESIGN/LANG_VIET_NPC_PORTAL_DESIGN.json` đặt NPC ở nhà gần cổng bên phải, hiên hướng ra đường. Đối chiếu ảnh REF_01 và nhà thực tế `(11, 10)`, `nha-06`, cùng hệ thống nền/va chạm/cổng vào nhà; không dùng tọa độ schematic làm tọa độ 3D.
- Vị trí NPC `(13.05, 0.36, 14.25)`, điểm tiếp cận `(12.2, 14.4)`, hướng 0 rad. Raycast từ trên nền xác nhận mặt sàn Y = `0.36`. Bán kính va chạm `0.56 m`, tương tác `2.2 m`, model cao `2.4 m`, `groundOffset = 0`.
- Đã kiểm tra toàn bộ vòng va chạm, đường đi đến NPC, cửa nhà `(11, 14.4)` và điểm ra sân `(9.35, 14.4)` đều thông. Không chồng lên vòng vào nhà hoặc lối đi.
- Model giữ nguyên ở `CHARACTERS/NPC/LANG_VIET/TAP_HOA/NPC_LANG_VIET_TAP_HOA.glb`: 9.564.648 byte, 21.171 đỉnh, 19.289 tam giác; 3 texture nhúng (base color, normal, roughness/metallic). Không cần đường dẫn texture ngoài.
- SHA-256: `ee6412b5fb9e9900df961d64e94e608ee9512af8ac7e397f28d37f5f325f05a4`.

## Animation và hội thoại

- `idle` lặp (15,33 giây); mở hội thoại phát `greet_01` một lần (3,5 giây), chuyển mượt 250 ms về `idle`.
- `agree` (4 giây) được đăng ký và kiểm thử, dành cho giao dịch thành công thật sau này. Hai nút dịch vụ chưa sẵn sàng không phát clip này.
- Tái sử dụng khóa trôi Hips, AnimationMixer và kiểm soát động tác đang chạy. Có thể đóng bằng Kết thúc, nút đóng hoặc Esc bất kỳ lúc nào.
- Riêng model này dùng `footProbeRatio = 0.01`: 246 điểm dò bàn chân, sửa sai lệch khoảng 4,4 mm trong clip chào ở chế độ dò cũ. Các NPC khác giữ tỷ lệ mặc định `0.015`; không skin toàn bộ 21.171 đỉnh mỗi khung hình để tìm mặt đất.
- Gần NPC hiện **Nói chuyện · Người bán hàng (F)**. Danh sách Dân làng có nút **Đi tới Người bán hàng**.
- Lời chào: “Chào khách! Ghé xem ít đồ dùng nhé. Chuẩn bị đầy đủ rồi hãy lên đường.”
- Lựa chọn: **Mua hàng**, **Bán vật phẩm**, **Kết thúc**. Thông báo dịch vụ lấy từ dữ liệu từng NPC; lời thoại/động tác của Thợ rèn vẫn giữ nguyên.

## Phạm vi mua bán hiện tại

Rà soát mã đang chạy chưa thấy cửa hàng, danh mục/giá, ví tiền, túi đồ giao dịch, sức chứa, quyền bán vật phẩm hoặc quy tắc khóa/đang trang bị/đồ nhiệm vụ. Bộ chọn vũ khí hiện tại dùng để cầm vũ khí và diễn kỹ năng; điểm học tập không phải tiền. Trường inventory trong bài kiểm tra chuyển MAP chỉ là dữ liệu kiểm thử.

Theo yêu cầu số 8, hai nút hiện thông báo rõ **chưa sẵn sàng**. Chưa dựng danh mục hoặc giá giả, chưa báo giao dịch thành công, không thay tiền hay vật phẩm. Vì vậy chưa có xác nhận số lượng/tổng giá hoặc giao dịch mua/bán thực sự để kiểm thử.

Trước khi mở mua bán cần bổ sung: danh mục và bảng giá được duyệt, ví tiền/túi đồ có lưu trữ, sức chứa, số lượng sở hữu, quy tắc vật phẩm khóa/đang trang bị/đồ nhiệm vụ; giao dịch nguyên tử kiểm tra lại toàn bộ điều kiện và chống xử lý lặp. Chỉ sau xác nhận thành công mới cập nhật giao diện và phát `agree`.

## Kết quả kiểm tra

- `npm.cmd test`: **215/215 bài đạt**, cộng **4 script kiểm tra logic/hình học đạt**; trong đó nhóm NPC **52/52**, gồm 7 bài mới cho Người bán hàng.
- GLTFLoader, skin, AnimationMixer và geometry thật: clip chính xác, ảnh nhúng đọc được, chiều cao đúng, chân trên nền trong các clip, không trôi gốc, không chồng động tác, mỗi động tác kết thúc một lần và về idle. Renderer trong harness là mock; hình ảnh GPU được kiểm tra riêng bằng trình duyệt.
- Nền/va chạm/đường đi/cửa nhà được kiểm tra trên cảnh thật trong harness. Rời Làng Việt và quay về giữ đúng một Người bán hàng, tổng **7 NPC + 1 bia tập**; 6 NPC trước vẫn tải và tương tác. Bộ kiểm tra bài học, hồi HP, animation của các NPC cũ đều đạt.
- Bấm Mua/Bán mỗi nút 20 lần trong lúc chào và sau khi idle: không đổi tiến độ, điểm, HP, trang bị, dữ liệu nhân vật hoặc ghi localStorage; không phát `agree` giả. Kiểm tra callback cũ, đứng xa, chưa đăng nhập, đổi UID, đóng giữa clip và lỗi tải model đều đạt.
- Trình duyệt tại `http://localhost:8001/SOURCE-CODE/index.html` với phiên Google hiện có: vào game, danh sách 7 NPC, đi tới Người bán hàng, mở hội thoại, Mua hàng, Bán vật phẩm, Kết thúc và Esc ngay khi đang chào đã thử thực tế. Model và chất liệu hiển thị được. Đi sang Thợ rèn và mở dịch vụ cũ vẫn hoạt động.
- Console trình duyệt không có lỗi JavaScript/WebGL mới trong lượt kiểm tra; chỉ có cảnh báo cũ về script Three.js classic.
- Chưa kiểm thử giao dịch thật hoặc điện thoại thật vì hệ thống mua bán chưa có. Không thay đổi dữ liệu Firebase. Không cần cài thư viện mới.

Log/model audit/snapshot trước sửa lưu trong `.cache/tap-hoa-glb/` (Git bỏ qua). Ảnh kết quả: `merchant-in-village.png`. Các URL tài nguyên đã được xác nhận qua dữ liệu cục bộ và tải thành công trong trình duyệt; lệnh HTTP HEAD trong shell bị giới hạn socket của môi trường.

## Tệp tạo/sửa trong lần này

| Tệp | Nội dung |
| --- | --- |
| `MAP/regions/lang-viet/gameplay.json` | Thêm Người bán hàng, vị trí và cấu hình model |
| `MAP/regions/lang-viet/dialogues.json` | Lời chào, ba lựa chọn, thông báo riêng từng NPC |
| `CHARACTERS/npc-gltf.js` | Cho phép chỉnh mật độ dò bàn chân theo model, giữ mặc định cũ |
| `CHARACTERS/village-npcs.js` | Truyền cấu hình dò bàn chân |
| `SOURCE-CODE/js/village-npcs.js` | Dùng bảng dịch vụ chung với nút Kết thúc và thông báo từ dữ liệu |
| `SOURCE-CODE/js/app.js` | Dấu cache mới cho dữ liệu NPC |
| `SOURCE-CODE/index.html` | Dấu cache mới cho script thay đổi |
| `SOURCE-CODE/tests/tap-hoa-gltf.test.cjs` | Mới: 7 bài kiểm tra Người bán hàng |
| `SOURCE-CODE/tests/npc-gltf.test.cjs` | Số NPC và fixture nền lối vào nhà bên phải |
| `SOURCE-CODE/tests/village-npcs.test.cjs` | Cập nhật số lượng 7 NPC + bia tập |
| `SOURCE-CODE/tests/vo-su-gltf.test.cjs` | Cập nhật tổng số NPC |
| `SOURCE-CODE/tests/tuan-dinh-gltf.test.cjs` | Cập nhật tổng số NPC |
| `SOURCE-CODE/tests/thay-do-gltf.test.cjs` | Cập nhật tổng số NPC |
| `SOURCE-CODE/tests/thay-thuoc-gltf.test.cjs` | Cập nhật tổng số NPC |
| `SOURCE-CODE/tests/tho-ren-gltf.test.cjs` | Cập nhật tổng số NPC |
| `package.json` | Thêm test Người bán hàng vào nhóm NPC |
| `SOURCE-CODE/docs/tap-hoa-glb.md` | Báo cáo này |

Chơi thử: **Ctrl+F5 → vào game → Công cụ → Dân làng → Đi tới Người bán hàng → Nói chuyện (F)**.
