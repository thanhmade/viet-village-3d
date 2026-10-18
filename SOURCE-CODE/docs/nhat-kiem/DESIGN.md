# Nhất Kiếm V3 · Kiếm

Bản tái thiết kế sau đối soát game 3D và canvas chạy thật; xem `RESEARCH-V3.md`.

Mã `sword.nhat-kiem`, ô 1 khi cầm Kiếm. Nền GitHub `thanhmade/viet-village-3d@cap-nhat`, commit `4632104861ec93c03e2f55bc81bad56e6c9a0946`. Giữ Three.js r160, WeaponVFXCore, avatar/controller và luồng nhiệm vụ đang có.

## Ảnh và quyết định thiết kế

Ảnh người dùng tại `SOURCE-CODE/docs/nhat-kiem-reference.png` cho thấy kiếm thẳng, thế tiến công, vệt kiếm xanh–trắng nhiều lớp, kiếm khí bay về phía điểm va chạm sáng và bụi/mảnh vụn ở vách. Dòng mô tả trong ảnh nêu “vạch kiếm đa lớp, liên hoàn chém, kiếm khí bay”.

Ảnh tĩnh không chứng minh số hit, thời gian hay collider. Ba nhịp chém, tổng 1,8 giây, các mốc dưới đây và chân trước–sau là đề xuất triển khai; không suy ra thành dữ kiện từ ảnh. Không tạo vách/map mới hoặc phá hủy địa hình.

## Nhịp chiêu

| Thời gian | Hành động và hình ảnh |
|---|---|
| 0–0,25 s | Vào thế, hạ trọng tâm 22–31 cm, xoay hông/thân và mở thế chân; ánh tụ lực tại đầu kiếm thật |
| 0,25–0,47 s | Trảm chéo xuống; nhát nhanh 0,29–0,42 s, thân vệt xanh mềm và mép trắng |
| 0,47–0,56 s | Chuyển thế; vệt cũ lưu rồi tan |
| 0,56–0,78 s | Hất chéo lên; nhát nhanh 0,59–0,73 s |
| 0,78–0,88 s | Nén thế chuẩn bị chém cuối |
| 0,88–1,12 s | Chém kết thúc gần ngang, tăng tốc 0,94–1,08 s |
| 1,01 s | Phóng một kiếm khí hình lưỡi liềm từ đầu kiếm |
| 1,01–1,29 s | Kiếm khí lao theo hướng khóa lúc cast, bị bia/vách đầu tiên chặn |
| 1,12–1,50 s | Thu kiếm, trả tay/chân về pose gốc; cho di chuyển lại ở 1,50 s |
| 1,29–1,54 s | Kiếm khí chém hụt tan dần; tiếp xúc thật có sao sáng/tia lửa |
| Đến 1,80 s | Dư quang/bụi/mảnh vụn hết, giải phóng tài nguyên |

Mốc va chạm phụ thuộc vị trí bia/vách, không ép chớp sáng đúng một thời điểm khi chém hụt. Chiêu cũ dài 1,3 s; bản này dài 1,8 s để có tụ lực, ba nhịp rõ, phóng khí và thu thế. Hồi chiêu cũ 1,5 s vẫn giữ, bắt đầu ở cast thành công; controller khóa thao tác pose 1,5 s.

## Pose và vũ khí

Hai GLB nam/nữ thật của dự án, nền clip `idle`, IK hai đoạn đang có; không yêu cầu clip mới. Tay phải giữ đúng gripPoint kiếm, tay trái hộ thế, chân trái tiến 46 cm/chân phải lùi 30 cm, mở ngang thêm 19 cm mỗi bên, hông xoay tới khoảng ±42°, tiến hông 10–18 cm và nghiêng thân về hướng đánh khoảng 14°. Root/collider/camera gameplay không dịch chuyển. Không kéo giãn xương để đạt điểm cầm.

Mô hình kiếm trong `weapons-village-models.js` giữ nguyên: scale 0,7, grip local Y=-0,12, gốc phần lưỡi Y=0,16, tip Y=1,62. Trong pose, các khoảng cách từ lòng bàn tay theo trục kiếm là 0,196 m và 1,220 m. Actor nhìn +Z; Core caster nhìn -Z qua child quay PI. Avatar nguyên thủy dùng tay phải đối xứng và pose tay nhẹ; thế chân/thân đầy đủ áp dụng cho GLB.

Vệt mới nhất lấy trực tiếp hai đầu lưỡi đang cầm. Các mẫu giữa hai frame theo cùng đường pose; release tại 1,01 s được kiểm tra với đầu kiếm thật của cả GLB. Test Node kiểm tra rig; V3 kiểm tra thêm raster WebGL2/SwiftShader với texture thật trên hai GLB. Sửa lún chân khi blend trước arm IK, không đổi vị trí root/collider.

## Kỹ xảo và điện ảnh

- Ba băng vệt riêng theo ba mặt phẳng chém: thân xanh có nhiễu mềm để tránh mảng đặc, mép trắng và hai sợi phụ ở Medium/High; tan theo tuổi trong khoảng 0,20 s. Shader nhiễu chỉ ở thân vệt, mép sáng vẫn liên tục.
- Luồng khí ngắt đoạn xoay quanh thân ở nhiều độ cao, tụ trước nhát đầu và nhát cuối; không tạo vòng khiên kín hoặc vùng damage. Một kiếm khí bay có bốn lớp xanh–trắng lệch chiều sâu/cao độ; tuyến tiến công rõ, không sinh thêm hit từ echo.
- Sao sáng xanh–trắng/vàng ngắn 0,24 s tại tiếp xúc, các tia kéo dài tan trong 0,30 s và hạt sáng bay ra. Bụi bán trong suốt và mảnh vụn instanced chỉ ở va chạm môi trường.
- Mỗi cast dùng geometry/material được Core sở hữu, particle pool dùng chung. Không thêm bloom composer, renderer hoặc RAF vào game.
- Preview có camera toàn cảnh/bên hông và rung rất nhẹ tại impact; camera game giữ cơ chế hiện có. Âm tổng hợp thử trong preview mặc định tắt, không thêm âm chưa duyệt vào gameplay.

## Gameplay và va chạm

Giữ cooldown 1,5 s, range 3,6 m, radius cấu hình 3 m, forwardOffset 0,25 m. Radius cấu hình không trở thành đòn AoE: tiếp xúc được quyết định theo đường vũ khí/kiếm khí thật. Không thêm chi phí tài nguyên hoặc công thức damage mới.

Ba nhịp và kiếm khí dùng chung `hitIndex=0`, tối đa một lần ghi nhận cho mỗi mục tiêu trong cả cast. Mục tiêu đã trúng vẫn cản kiếm khí, không cho khí xuyên qua để cấp hit thứ hai cho bia sau. `target-query` chỉ liệt kê, luôn trả false; chỉ `hit-window` được xác nhận mới gọi hậu quả của host. Host hiện có chỉ ghi nhận luyện bia, không gây damage lên NPC hòa bình.

Substep tối đa 1/180 s kiểm tra đoạn palm→tip trong các cửa sổ chém, radius 0,055 m. Kiếm khí kiểm tra 15 đoạn song song dọc lưỡi liềm với radius 0,12 m, dừng ở vách/bia gần nhất; đỉnh khí kết thúc ở khoảng tiến 3,6 m. Dùng helper va chạm hiện có trong `bow-piercing.js` qua provider nạp trễ; không sửa module Cung. Vách sát người chặn các chém và lần phóng còn lại. Callback giữ lại sau lượt gọi hoặc sau hủy không thể cấp tiến trình.

Đổi map/vũ khí/avatar, mở UI khóa, chết, hủy hoặc pose bị ngắt đi qua lifecycle hiện có: xóa VFX/pose, trả grip, giữ cooldown. Bộ test có frame dài, không dựa vào setTimeout.

## Chất lượng và tích hợp

| Mức | Vệt / nhịp | Luồng khí | Mẫu visual | Đoạn kiếm khí | Hạt / tia kéo dài | Mảnh vụn |
|---|---:|---:|---:|---:|---:|---:|
| Low | 2 lớp | 2 | 90 Hz | 32 | 10 / 6 | 8 |
| Medium / High | 4 lớp | 4 | 180 Hz | 64 | 22 / 12 | 14 |

Logic hit và substep giống nhau ở ba mức. Chưa đo FPS/draw calls trên thiết bị thật. Draw calls preview phần mềm được ghi riêng trong VALIDATION.md; không dùng chúng thay số đo GPU.

- Effect: `SOURCE-CODE/js/vfx/sword-strike.js`, nạp trước `sword-skill-vfx.js`.
- Pose: `CHARACTERS/player-gltf.js`; controller: `SOURCE-CODE/js/weapons-village.js`.
- Icon: `ASSETS/ui/skills/sword/nhat-kiem-ice-white.png`; CSS: `SOURCE-CODE/css/sword-skill-icons.css`. Label, phím tắt và cooldown vẫn là DOM dễ đọc.
- Preview HTTP local: `SOURCE-CODE/nhat-kiem-preview.html`, thêm `?test` để bắt đầu tạm dừng.
- Gọi gameplay: trang bị Kiếm và dùng ô 1 / `VietVillageWeapons.cast(1)`.

Bản V3 sửa hình ảnh sau phản hồi chưa đạt của người dùng; không coi đạt test là đã được duyệt mỹ thuật. Đọc `VALIDATION.md` để phân biệt WebGL phần mềm đã chạy với GPU thiết bị thật/Alpha còn cần Claude chạy.

V3 kế thừa bản sửa bước chân từ Claude (`4632104`): vào thế chân trái dẫn trước, thu thế chân phải dẫn trước; chân dịch ngang khi đã nhấc khỏi đất. Shared player script tăng cache lên `nhat-kiem-4`.
