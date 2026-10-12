# Thầy đồ — tích hợp trong CAP-NHAT

Ngày kiểm tra: 12/10/2026. Git root/thư mục thực thi:
`H:\CHAT GPT\3D-GAME\VIET-VILLAGE-3D\VIET-VILLAGE-3D-CAP-NHAT`, nhánh `cap-nhat`.
Không tìm thấy AGENTS.md áp dụng. Giữ mọi thay đổi có từ trước; không sửa bản chính, commit, push hoặc triển khai.

## Vị trí và mô hình

- ID: `NPC_LANG_VIET_THAY_DO`, MAP `lang-viet`.
- Hồ sơ `LANG_VIET_NPC_PORTAL_DE_XUAT/DESIGN/LANG_VIET_NPC_PORTAL_DESIGN.json` đặt Thầy đồ ở hiên nhà giữa dãy trái, nhìn từ cổng. Đã đối chiếu ảnh `REF_01_CHINH_DIEN.jpg` và cảnh dựng trong `BUILDINGS/houses.js`.
- Nhà tương ứng trong cảnh thật ở `(-11, 0)`, ID `nha-02`. Hiên/bậc hiện bị chặn bởi va chạm nhà, nên đặt NPC ở sân lát đá sát hiên, bên phải cửa, thay vì mở thêm đường qua tường/bậc.
- Vị trí: `(-8.95, 0.3, 3.83)`; điểm tiếp cận `(-9.8, 4.25)`; hướng mặc định 0 rad. Khi trò chuyện, thầy quay về phía người chơi.
- Raycast xuống nền dựng thực tế cho Y = `0.3225`; model dùng `groundOffset: 0.0225`, cao 2,4 m. Tái sử dụng căn chân và khóa trôi Hips của bộ GLTF hiện có. Bán kính cản 0,56 m; nói chuyện trong 2,2 m.
- Điểm đứng/tiếp cận nằm ngoài vòng vào nhà. Cửa, điểm quay ra sân `(-12.65, 4.4)` và lối chính giữ thông thoáng. Đường đi tự động từ điểm xuất hiện tới Thầy đồ đã được thử trong trình duyệt, không tự vào nội thất.
- Model: `CHARACTERS/NPC/LANG_VIET/THAY_DO/NPC_LANG_VIET_THAY_DO.glb`, 11.110.544 byte. Ba texture base color, normal và roughness/metallic nhúng trong GLB.
- SHA-256 giữ nguyên: `adc869e930211d8a05f3273151d8ce1145d7e2471c9ea0468170f2a177711588`.

## Hội thoại, bài học và animation

Lời chào: “Chào con! Mỗi ngày học thêm một điều, đường phía trước sẽ rộng mở hơn.”

- Mặc định lặp `idle` (15,33 giây). Mở hội thoại phát `bow` (6 giây) một lần.
- Các lựa chọn **Học bài**, **Trả lời câu hỏi**, **Kết thúc** dùng bảng NPC hiện có. Bài học không yêu cầu chờ animation; nút đóng và Esc luôn sử dụng được.
- Trả lời sai hiện lời giải và cho chọn lại. Trả lời đúng khóa đáp án, phát `agree` (4 giây) một lần.
- Hoàn thành khi đã mở Học bài và trả lời đúng, theo thứ tự nào cũng được. Phát `clap` (13,67 giây) một lần. Nếu `bow` hoặc `agree` đang chạy, động tác kế tiếp đợi clip và pha chuyển về idle kết thúc; không phát chồng hoặc xếp thêm khi bấm dồn.
- Chuyển mượt 250 ms. Đóng bảng hủy phản ứng chưa chạy và đưa động tác đang chạy về idle. Đổi tài khoản/MAP hoặc nhân vật chết cũng đóng bài học, không để thao tác cũ tác động sang hội thoại khác.

Game đã có ngân hàng câu hỏi tại `SOURCE-CODE/js/state-and-questions.js`, nên ưu tiên dùng **core[0] — Chìa khóa phân số**:

- Kiến thức: nhân tử và mẫu của 1/2 với cùng một số; `1/2 = (1 × 2)/(2 × 2) = 2/4`.
- Câu hỏi: “Thẻ nào có giá trị bằng 1/2?”; đáp án `2/4`, `1/3`, `3/4`, `2/3`; đúng `2/4`.
- Không sửa ngân hàng câu hỏi hoặc bật lại luồng quiz/điểm cũ đang bị tắt.

Nếu nguồn ngân hàng thiếu/không hợp lệ, dùng bài dự phòng trong `dialogues.json` đúng yêu cầu:

- “Chu vi hình vuông bằng độ dài một cạnh nhân 4.”
- “Hình vuông cạnh 5 m có chu vi bao nhiêu?”
- `10 m`, `20 m`, `25 m`; đúng `20 m`. Sai hiện `5 × 4 = 20 m` và cho thử lại.

Đây là bài luyện trong **một phiên hội thoại**. Đóng và mở lại cho phép luyện lại; chưa lưu kết quả mới dài hạn, cộng điểm, vật phẩm, mở khóa hoặc gửi dữ liệu Firebase. Các khóa lưu tiến độ Toán, hướng dẫn và nhiệm vụ cũ không bị sửa. `QUEST_LV_04` vẫn chưa bật chuỗi nhiệm vụ/phần thưởng; đã cập nhật lý do để phân biệt với bài học đang dùng được.

## Tệp thay đổi

| Tệp | Nội dung |
| --- | --- |
| `MAP/regions/lang-viet/gameplay.json` | Thêm NPC thứ tư, vị trí/model/clip; bỏ Thầy đồ khỏi danh sách trì hoãn |
| `MAP/regions/lang-viet/dialogues.json` | Lời chào và cấu hình nguồn bài học/dự phòng |
| `MAP/regions/lang-viet/quests.json` | Cập nhật thông báo nhiệm vụ chưa bật |
| `SOURCE-CODE/js/npc-lesson.js` | **Mới**: chọn nguồn bài học, xử lý học/sai/đúng/hoàn thành một lần |
| `SOURCE-CODE/js/village-npcs.js` | Gắn bài học vào bảng NPC, tuần tự animation, hủy khi đóng, số dân tự cập nhật |
| `SOURCE-CODE/js/app.js` | Cung cấp ngân hàng hiện có và đổi dấu cache dữ liệu |
| `SOURCE-CODE/index.html` | Vùng nội dung bài học, script mới và dấu cache |
| `SOURCE-CODE/css/village-npcs.css` | Kiểu hiển thị nội dung/đáp án bài học |
| `SOURCE-CODE/load-order.json` | Thứ tự module bài học trước bộ điều khiển NPC |
| `SOURCE-CODE/tests/thay-do-gltf.test.cjs` | **Mới**: 6 bài kiểm tra nội dung, GLB, va chạm và luồng hội thoại |
| `SOURCE-CODE/tests/npc-gltf.test.cjs` | Cập nhật tổng số NPC/root trong bài kiểm tra cũ |
| `SOURCE-CODE/tests/vo-su-gltf.test.cjs` | Cập nhật tổng số NPC |
| `SOURCE-CODE/tests/tuan-dinh-gltf.test.cjs` | Cập nhật tổng số NPC |
| `SOURCE-CODE/tests/village-npcs.test.cjs` | Cập nhật tổng số NPC/root, giữ kiểm tra vị trí/nhiệm vụ cũ |
| `package.json` | Thêm bộ test Thầy đồ |
| `SOURCE-CODE/docs/thay-do-glb.md` | **Mới**: báo cáo này |

Không sửa GLB, loader, bộ căn chân/animation `CHARACTERS/npc-gltf.js`, mã dựng MAP/nhà, cấu hình của ba NPC cũ hoặc ngân hàng câu hỏi. Snapshot trước sửa và bằng chứng ở `.cache/thay-do-glb/`, được Git bỏ qua.

## Kết quả kiểm thử

- `npm.cmd run test:npcs`: **31/31 đạt**.
- `npm.cmd test`: **194/194 đạt**, cộng **4 nhóm logic/hình học**. Log: `.cache/thay-do-glb/full-tests.log`.
- Cú pháp JavaScript, thứ tự tải và JSON hợp lệ; đường dẫn GLB/script giải quyết từ `SOURCE-CODE/index.html`.
- GLB thật: đủ bốn clip, texture nhúng, skin weights hợp lệ, xương tay/tay áo có ảnh hưởng đến vertex; mọi clip giữ hình học hữu hạn, không trôi Hips, chân sai lệch dưới 3 mm so với nền trong kiểm tra.
- Luồng thực: chào → học → sai/thử lại → đúng → agree → clap → idle; thứ tự trả lời trước/học sau; bấm dồn; đóng trong bow/clap; mở lại không mang phản ứng cũ; đổi UID; model tải lỗi vẫn dùng bài học dự phòng dạng NPC thủ tục.
- Hồi quy: Lý trưởng idle.001/hội thoại, Võ sư bow/các động tác, Tuần đinh chào/đồng ý/nhìn quanh, cửa nhà và portal, đi/đổi MAP, không sinh trùng NPC; không đổi điểm hoặc journal cũ.
- Localhost với phiên Google có sẵn: tự đi tới Thầy đồ, nhìn model và chất liệu trên sân nhà học; mở bằng Nói chuyện và F; thấy lời chào, bài học đúng ngân hàng, chọn sai được giải thích và thử lại, chọn đúng có phản ứng, học sau câu đúng có clap; đóng ngay trong bow/clap được. Lý trưởng mở hội thoại; Võ sư chào và dùng Xem đòn tay được.
- Tuần đinh vẫn mở hội thoại, chuyển từ nhìn quanh sang chào và phát Tôi hiểu rồi. Console trong phiên kiểm tra không có lỗi JavaScript/WebGL; chỉ có cảnh báo cũ về bản classic Three.js.

Các bài Node dùng hình học/animation thật, giả lập renderer và giải mã ảnh. Trình duyệt kiểm tra texture/WebGL và giao diện thực; chưa thử điện thoại vật lý hoặc mọi loại GPU. Chưa có kiểm tra học tập trên backend, lưu tiến độ bài học dài hạn hay chuỗi nhiệm vụ/phần thưởng cho Thầy đồ.

## Chạy thử

Mở `http://localhost:8001/SOURCE-CODE/index.html`, tải lại trang, chọn **Khám phá làng 3D → Công cụ → Dân làng → Đi tới Thầy đồ**. Đợi nhân vật đến sân rồi nhấn **F / Nói chuyện**.

Không commit/push; không cập nhật main hoặc website chính; không thay Firebase.
