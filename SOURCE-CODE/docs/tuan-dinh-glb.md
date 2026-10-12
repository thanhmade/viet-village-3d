# NPC Tuần đinh — bản CAP-NHAT

Kiểm tra ngày 12/10/2026. Thư mục làm việc và Git root:
`H:\CHAT GPT\3D-GAME\VIET-VILLAGE-3D\VIET-VILLAGE-3D-CAP-NHAT`, nhánh `cap-nhat`.

## Cấu hình đã tích hợp

- ID giữ nguyên: `NPC_LANG_VIET_TUAN_DINH`; MAP: `lang-viet`.
- Model gốc: `CHARACTERS/NPC/LANG_VIET/TUAN_DINH/NPC_LANG_VIET_TUAN_DINH.glb`, 7.567.200 byte. Không chỉnh sửa GLB.
- SHA-256: `358ccdfa9120300769ad72a13d6e33d1a01df43a23bafe66f23b1ce93bed7858`.
- Giữ tọa độ NPC đã có `(6.3, 0.3, 22.25)`, điểm tiếp cận `(7.6, 21.6)`.
- Cổng thật trong `BUILDINGS/gate.js` ở `(0, 0.24, 24)`, rộng 8,7 m, lối mở 3,7 m. NPC đứng phía trong, cạnh phải, ngoài lối mở và cách vòng chung `(0, 20)` khoảng 6,69 m.
- Raycast vào hình học nền thực tế tại NPC cho Y = 0,25. Model dùng `groundOffset: -0.05`, cao 2,4 m, neo root motion theo xương Hips. Collider bán kính 0,56 m và vùng nói chuyện 2,2 m giữ nguyên.
- Ba texture base color/normal/roughness-metallic được nhúng trong GLB; không cần tải ảnh ngoài.
- Tái sử dụng GLTFLoader r160 cục bộ, bộ căn chân, điều khiển animation, tương tác và nhiệm vụ của Lý trưởng/Võ sư.

## Animation và hội thoại

| Clip | Cách sử dụng |
| --- | --- |
| `idle` | Lặp mặc định, chu kỳ khoảng 15,33 giây |
| `look_around` | Một lần, khoảng 15,58 giây; sau mỗi khoảng đứng chờ ngẫu nhiên 18–30 giây trong gameplay |
| `greet_01` | Một lần khi mở hội thoại, 3,5 giây |
| `agree` | Một lần khi chọn “Tôi hiểu rồi”, 4 giây |
| `walk` | Giữ nguyên trong GLB; chưa được đưa vào danh sách động tác chạy trong game |

Các động tác dùng chuyển mượt 250 ms về `idle`. Đếm thời gian nhìn quanh tạm dừng khi có bảng NPC, ở MAP khác hoặc không trong trạng thái chơi hợp lệ; không dùng timeout hay hàng đợi động tác. Hội thoại ưu tiên hơn nhìn quanh: kết thúc mềm động tác cũ rồi mới chào. Nút động tác bị khóa khi đang phát; gọi lặp cũng bị bộ animation từ chối.

Tên hiển thị “Tuần đinh”, lời chào đúng yêu cầu:

> Chào mừng đến Làng Việt! Nếu mới tới, hãy vào sân đình gặp Lý trưởng để được hướng dẫn.

- “Gặp Lý trưởng ở đâu?” hiện mô tả sân đình và nút “Đi tới Lý trưởng”. Nút này lấy điểm `approach` của NPC Lý trưởng đã đăng ký qua hệ thống dẫn đường hiện có, không sao chép tọa độ riêng.
- “Tôi hiểu rồi” phát `agree`; “Kết thúc”, nút đóng hoặc Esc trả điều khiển cho người chơi.
- Giữ nhiệm vụ Chào làng, liên kết bản đồ tổng và kiểm tra đường Đồng Tre.
- Model lỗi vẫn giữ NPC dự phòng và các chức năng hội thoại/chỉ đường; có thông báo và nút thử lại ở Dân làng.

## Tệp thay đổi trong lần này

| Tệp | Thay đổi |
| --- | --- |
| `MAP/regions/lang-viet/gameplay.json` | Khai báo model, kích thước, căn nền, clip và lịch nhìn quanh cho Tuần đinh |
| `MAP/regions/lang-viet/dialogues.json` | Lời chào, hỏi vị trí Lý trưởng, greet/agree |
| `SOURCE-CODE/js/village-npcs.js` | Lịch animation nền, ưu tiên hội thoại, chỉ đường, thông báo model theo tên NPC |
| `SOURCE-CODE/index.html` | Đổi dấu phiên bản cache cho các script/CSS NPC đang có |
| `SOURCE-CODE/js/app.js` | Đổi dấu phiên bản cache cho dữ liệu NPC |
| `SOURCE-CODE/tests/npc-gltf.test.cjs` | Cô lập fixture Lý trưởng khỏi model của hai NPC còn lại |
| `SOURCE-CODE/tests/tuan-dinh-gltf.test.cjs` | Mới: kiểm tra GLB thật, vị trí, nền, clip, chống lặp, hội thoại và hồi quy |
| `package.json` | Thêm bài kiểm tra Tuần đinh vào `test:npcs` |
| `SOURCE-CODE/docs/tuan-dinh-glb.md` | Báo cáo này |

Không thay đổi `CHARACTERS/npc-gltf.js`, `CHARACTERS/village-npcs.js`, model gốc, cấu hình Lý trưởng/Võ sư, mã dựng MAP hay tiến độ hiện có. Bản chụp trước sửa và bằng chứng kiểm tra nằm trong `.cache/tuan-dinh-glb/`, đã được Git bỏ qua.

## Kết quả kiểm tra

- `npm.cmd test`: đạt **188/188 bài kiểm tra**, cộng **4 nhóm logic/hình học**. Log cuối: `.cache/tuan-dinh-glb/full-tests-final.log`.
- `npm.cmd run test:npcs`: đạt **25/25**, trong đó 4 bài mới cho Tuần đinh.
- Kiểm tra mô hình thật: đủ năm clip chính xác, texture nhúng, màu sRGB; các động tác phát một lần, có pha chuyển mượt, chân sai lệch dưới 3 mm so với nền trong bài kiểm tra, Hips không trôi ngang. Bấm dồn không chồng động tác.
- Kiểm tra bộ điều khiển: timer 18–30 giây; dừng phát mới trong hội thoại/menu/MAP khác; lời chào ưu tiên; hướng dẫn dùng điểm Lý trưởng thật; quay về không sinh trùng; Lý trưởng vẫn `idle.001`, Võ sư vẫn chào `bow` và dùng được các động tác.
- Kiểm tra cú pháp các JavaScript thay đổi: đạt.
- Trên `http://localhost:8001/SOURCE-CODE/index.html`, dùng phiên Google có sẵn: model có màu/chất liệu; đến gần hiện Nói chuyện; mở bằng nút và phím F; hiển thị lời chào và trạng thái chào; chọn Tôi hiểu rồi; kết thúc/Esc và mở lại; đi theo chỉ dẫn tới Lý trưởng; mở hội thoại Lý trưởng; tới Võ sư, thấy chào và chạy Xem đòn chân.
- Console trong phiên kiểm tra không có lỗi JavaScript/WebGL; có cảnh báo cũ của Three.js về bản classic `three.min.js`.
- Lỗi null model được bộ kiểm tra phát hiện ở lần đầu đã sửa; lần chạy toàn bộ sau cùng đạt. Nhân vật dự phòng vẫn dùng được khi chưa tải GLB.

Node kiểm tra skin/geometry/animation thật nhưng giả lập giải mã ảnh và renderer; phần texture/WebGL được đối chiếu bằng trình duyệt. Chưa kiểm tra trên điện thoại vật lý hoặc GPU khác; tuyến tuần tra chưa triển khai theo phạm vi yêu cầu.

## Chạy thử

Mở `http://localhost:8001/SOURCE-CODE/index.html`, tải lại trang; chọn **Khám phá làng 3D → Công cụ → Dân làng → Đi tới Tuần đinh**. Đợi nhân vật tới nơi rồi nhấn F hoặc Nói chuyện. Đứng chờ ngoài hội thoại để quan sát động tác nhìn quanh.

Chỉ cập nhật CAP-NHAT; không commit, push, cập nhật main, triển khai website hoặc thay đổi Firebase.
