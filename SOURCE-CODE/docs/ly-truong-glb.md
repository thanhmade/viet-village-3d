# Lý trưởng GLB trong Làng Việt

Ngày kiểm tra: 12/10/2026. Thư mục: `VIET-VILLAGE-3D-CAP-NHAT`, nhánh `cap-nhat`.

## Kết quả tích hợp

- Giữ ID `NPC_LANG_VIET_LY_TRUONG`, hội thoại và liên kết nhiệm vụ đang có; thay phần hình học dự phòng của riêng Lý trưởng bằng mô hình GLB.
- Nguồn giữ nguyên: `CHARACTERS/NPC/LANG_VIET/LY_TRUONG/NPC_LANG_VIET_LY_TRUONG_Idle.glb` (5.555.548 byte).
- SHA-256: `8bb3ccc611af463a509b91611cd18b4b2c1a2e6f36d413017d218a24a3636b91`.
- Clip được chọn bằng tên chính xác `idle.001`, dài 15,375 giây; `LoopRepeat`, số lần lặp vô hạn. Không tự thay bằng clip khác khi thiếu clip yêu cầu.
- GLB có một skinned mesh, 65 xương, 10.795 đỉnh, 10.032 tam giác, một chất liệu và JPEG 4096 × 4096 nhúng trong GLB. Không cần đường dẫn texture ngoài.
- Dùng GLTFLoader chính thức cùng phiên bản r160 với Three.js đang chạy; dùng chung engine. Nguồn, mã kiểm tra và giấy phép tại `ASSETS/vendor/gltf-r160/provenance.json` và `ASSETS/vendor/LICENSE-THREE.txt`.
- Các module dùng đuôi `.js`: máy chủ localhost hiện tại trả `.mjs` dưới dạng `text/plain`, khiến trình duyệt từ chối ES module. Không cần sửa máy chủ hoặc cài thư viện toàn cục.

## Vị trí được xác định từ cảnh thực tế

`BUILDINGS/temple.js` đặt gốc đình tại `(0, 0.24, -19)`. Hàng cột trước ở `z=-16.3`; mép ngoài bậc thềm cuối ở `z=-14.2`.

| Thuộc tính | Giá trị |
| --- | --- |
| MAP | `lang-viet` |
| Chân NPC | `(2, 0.31, -12.8)` |
| Điểm người chơi đi tới | `(2, -10.9)` theo trục X/Z |
| Chiều cao mô hình ở đầu clip | `2.35` đơn vị; người chơi khoảng `2.4` |
| Bán kính va chạm / hội thoại | `0.56` / `2.2` |
| Hướng ban đầu | `yaw=0`; quay về người chơi khi trò chuyện |

Vị trí thuộc sân lát đá, bên phải trục vào đình và ngoài bậc thềm. Raycast xuống mesh sân cho cao độ `0.310000006`; đường tìm kiếm từ sân làng tới điểm tiếp cận đi được. Không lấy tọa độ schematic trong hồ sơ thiết kế.

Mô hình được căn theo giới hạn hình học sau khi áp dụng tư thế đầu animation. Khi chạy, lấy mẫu 64 đỉnh thấp ở bàn chân để bù độ cao cho nhóm chứa mô hình, giữ chân sát sàn và không thay đổi điểm va chạm. Dừng cập nhật animation khi NPC không hiện trong MAP. Không tính lại toàn bộ 10.795 đỉnh mỗi khung hình.

## Tương tác và xử lý lỗi

- Đến gần hiện `Nói chuyện · Lý trưởng (F)`. Có thể bấm nút hoặc nhấn F.
- Hội thoại có tiêu đề `Lý trưởng`, lời chào thử nghiệm và phần nhiệm vụ cũ.
- Đóng bằng nút đóng hoặc Esc trả lại điều khiển.
- Chỉ hiện NPC tại Làng Việt, giữ nguyên Võ sư, Tuần đinh và bia tập.
- Nếu mô hình/texture/clip lỗi, giữ NPC hình học dự phòng và hiển thị lỗi trong **Dân làng**, có nút **Thử lại**. Không báo tải thành công khi đang dùng bản dự phòng.
- Các yêu cầu tải đồng thời dùng một lần tải; quay lại MAP tái sử dụng NPC hiện có. Tài nguyên trả về sau khi controller bị hủy được giải phóng.

## Các tệp của thay đổi này

Tạo mới:

- `CHARACTERS/npc-gltf.js`
- `ASSETS/vendor/gltf-r160/GLTFLoader.js`
- `ASSETS/vendor/gltf-r160/BufferGeometryUtils.js`
- `ASSETS/vendor/gltf-r160/three-global.js`
- `ASSETS/vendor/gltf-r160/package.json`
- `ASSETS/vendor/gltf-r160/provenance.json`
- `SOURCE-CODE/tests/npc-gltf.test.cjs`
- `SOURCE-CODE/docs/ly-truong-glb.md`

Cập nhật:

- `CHARACTERS/village-npcs.js`: gắn mô hình, cập nhật animation, tải lại và giải phóng tài nguyên.
- `MAP/regions/lang-viet/gameplay.json`: vị trí sân đình và cấu hình mô hình.
- `MAP/regions/lang-viet/dialogues.json`: tên, lời chào và hướng dẫn vị trí mới.
- `SOURCE-CODE/js/village-npcs.js`: tải mô hình, trạng thái lỗi và nút Nói chuyện.
- `SOURCE-CODE/js/app.js`: phiên bản URL dữ liệu NPC để tránh cache cũ.
- `SOURCE-CODE/index.html`, `SOURCE-CODE/load-order.json`: thứ tự tải adapter và phiên bản script.
- `SOURCE-CODE/tests/village-npcs.test.cjs`: tọa độ mới và kiểm tra mặt sân thực tế.
- `package.json`: thêm bài kiểm tra mô hình vào `test:npcs`.

## Kiểm tra

### Tự động

- `npm test`: **178/178 bài đạt**, cộng 4 bộ kiểm tra logic/hình học nhà, khí hậu và ánh sáng.
- Sau khi đổi đuôi module để sửa MIME: chạy lại `npm run test:npcs`, **15/15 bài đạt**.
- Parse GLB thật, xác nhận skeleton/chất liệu/clip chính xác, chiều cao; chạy qua 2 chu kỳ animation. Sai lệch chân so với sàn dưới 0,015 đơn vị trong các mẫu kiểm tra.
- Tải đồng thời không sinh trùng; tải lỗi giữ dự phòng; thử lại thành công; hủy giữa lúc tải không làm NPC xuất hiện lại.
- NPC và bia tập có va chạm, điểm tiếp cận đi được, không chặn cửa/cổng; hội thoại khóa điều khiển; nhiệm vụ giữ theo UID và lưu cục bộ.
- Node chỉ giả lập bước giải mã pixel ảnh vì không có trình duyệt; phần pixel và WebGL được kiểm tra riêng trên localhost.

### Thao tác trên localhost

Tại `http://localhost:8001/SOURCE-CODE/index.html`, dùng phiên Google đã đăng nhập sẵn:

- Mở game, vào **Dân làng → Đi tới Lý trưởng**, người chơi tự đi tới sân đình.
- Quan sát GLB thật có quần áo, mặt, texture; đúng tỷ lệ, chân nằm trên sân trước bậc thềm.
- Đi ra ngoài cự ly làm nút hội thoại ẩn; đi lại gần nút hiện.
- Bấm nút và nhấn F đều mở đúng tên/lời chào; Esc và nút đóng hoạt động; đi bộ tiếp được.
- Chuyển qua Làng Tân Thủ: tương tác dân làng bị chặn với thông báo đúng MAP. Quay lại Làng Việt có thể tiếp cận và trò chuyện với Lý trưởng.
- Không ghi nhận lỗi JavaScript/WebGL; còn cảnh báo đã có của Three.js về bản build classic.
- HTTP của GLB và ba module loader/bridge: kiểm tra tải cục bộ; không dùng CDN cho bộ đọc GLB.

Ảnh và log kiểm tra cục bộ nằm trong `.cache/ly-truong-glb/` (được Git bỏ qua). Chưa đo hiệu năng trên điện thoại thật hoặc các GPU khác; không tuyên bố kiểm thử trên các thiết bị đó.

Không sửa bản chính, không commit/push, không triển khai website hoặc thay đổi Firebase. Các thay đổi cũ đang có trong CAP-NHAT được giữ nguyên.
