# Nhất Kiếm · Kiếm

Mã `sword.nhat-kiem`, ô 1 khi cầm Kiếm. Nền GitHub `thanhmade/viet-village-3d@cap-nhat`, commit `2eeeb2457f180ef1e3fd3daff8b1deeb9810ab8a`. Giữ Three.js r160, WeaponVFXCore, avatar/controller và luồng nhiệm vụ đang có.

## Ảnh và quyết định thiết kế

Ảnh người dùng tại `SOURCE-CODE/docs/nhat-kiem-reference.png` cho thấy kiếm thẳng, thế tiến công, vệt kiếm xanh–trắng nhiều lớp, kiếm khí bay về phía điểm va chạm sáng và bụi/mảnh vụn ở vách. Dòng mô tả trong ảnh nêu “vạch kiếm đa lớp, liên hoàn chém, kiếm khí bay”.

Ảnh tĩnh không chứng minh số hit, thời gian hay collider. Ba nhịp chém, tổng 1,8 giây, các mốc dưới đây và chân trước–sau là đề xuất triển khai; không suy ra thành dữ kiện từ ảnh. Không tạo vách/map mới hoặc phá hủy địa hình.

## Nhịp chiêu

| Thời gian | Hành động và hình ảnh |
|---|---|
| 0–0,25 s | Vào thế, hạ trọng tâm 4,5 cm, xoay thân nhẹ; ánh tụ lực tại đầu kiếm thật |
| 0,25–0,47 s | Chém thứ nhất; thân vệt xanh, mép trắng sáng |
| 0,47–0,56 s | Chuyển thế; vệt cũ lưu rồi tan |
| 0,56–0,78 s | Chém trả; vệt thứ hai |
| 0,78–0,88 s | Nén thế chuẩn bị chém cuối |
| 0,88–1,12 s | Chém thứ ba; ba đường vệt có dư ảnh ngắn |
| 1,01 s | Phóng một kiếm khí hình lưỡi liềm từ đầu kiếm |
| 1,01–1,29 s | Kiếm khí lao theo hướng khóa lúc cast, bị bia/vách đầu tiên chặn |
| 1,12–1,50 s | Thu kiếm, trả tay/chân về pose gốc; cho di chuyển lại ở 1,50 s |
| 1,29–1,54 s | Kiếm khí chém hụt tan dần; tiếp xúc thật có sao sáng/tia lửa |
| Đến 1,80 s | Dư quang/bụi/mảnh vụn hết, giải phóng tài nguyên |

Mốc va chạm phụ thuộc vị trí bia/vách, không ép chớp sáng đúng một thời điểm khi chém hụt. Chiêu cũ dài 1,3 s; bản này dài 1,8 s để có tụ lực, ba nhịp rõ, phóng khí và thu thế. Hồi chiêu cũ 1,5 s vẫn giữ, bắt đầu ở cast thành công; controller khóa thao tác pose 1,5 s.

## Pose và vũ khí

Hai GLB nam/nữ thật của dự án, nền clip `idle`, IK hai đoạn đang có; không yêu cầu clip mới. Tay phải giữ đúng gripPoint kiếm, tay trái hộ thế, chân trái tiến 14 cm/chân phải lùi 10 cm, thân xoay/đổ nhẹ. Root/collider/camera gameplay không dịch chuyển. Không kéo giãn xương để đạt điểm cầm.

Mô hình kiếm trong `weapons-village-models.js` giữ nguyên: scale 0,7, grip local Y=-0,12, gốc phần lưỡi Y=0,16, tip Y=1,62. Trong pose, các khoảng cách từ lòng bàn tay theo trục kiếm là 0,196 m và 1,218 m. Actor nhìn +Z; Core caster nhìn -Z qua child quay PI. Avatar nguyên thủy dùng tay phải đối xứng và pose tay nhẹ; thế chân/thân đầy đủ áp dụng cho GLB.

Vệt mới nhất lấy trực tiếp hai đầu lưỡi đang cầm. Các mẫu giữa hai frame theo cùng đường pose; release tại 1,01 s được kiểm tra với đầu kiếm thật của cả GLB. Node giải mã skeleton/animation nhưng stub texture; chưa phải chứng minh raster WebGL.

## Kỹ xảo và điện ảnh

- Ba băng vệt riêng: xanh rộng, mép trắng hẹp, đường sáng phụ ở Medium/High; shader alpha theo tuổi để lưu vệt 0,31 s.
- Một kiếm khí bay có ba lớp xanh–trắng và echo lệch nhẹ; tuyến tiến công rõ, không sinh thêm hit từ echo.
- Sao sáng tại tiếp xúc, tia xanh–trắng và ít tia vàng nhạt. Bụi bán trong suốt và mảnh vụn instanced chỉ ở va chạm môi trường.
- Mỗi cast dùng geometry/material được Core sở hữu, particle pool dùng chung. Không thêm bloom composer, renderer hoặc RAF vào game.
- Preview có camera toàn cảnh/bên hông và rung rất nhẹ tại impact; camera game giữ cơ chế hiện có. Âm tổng hợp thử trong preview mặc định tắt, không thêm âm chưa duyệt vào gameplay.

## Gameplay và va chạm

Giữ cooldown 1,5 s, range 3,6 m, radius cấu hình 3 m, forwardOffset 0,25 m. Radius cấu hình không trở thành đòn AoE: tiếp xúc được quyết định theo đường vũ khí/kiếm khí thật. Không thêm chi phí tài nguyên hoặc công thức damage mới.

Ba nhịp và kiếm khí dùng chung `hitIndex=0`, tối đa một lần ghi nhận cho mỗi mục tiêu trong cả cast. Mục tiêu đã trúng vẫn cản kiếm khí, không cho khí xuyên qua để cấp hit thứ hai cho bia sau. `target-query` chỉ liệt kê, luôn trả false; chỉ `hit-window` được xác nhận mới gọi hậu quả của host. Host hiện có chỉ ghi nhận luyện bia, không gây damage lên NPC hòa bình.

Substep tối đa 1/180 s kiểm tra đoạn palm→tip trong các cửa sổ chém, radius 0,055 m. Kiếm khí kiểm tra 15 đoạn song song dọc lưỡi liềm với radius 0,12 m, dừng ở vách/bia gần nhất; đỉnh khí kết thúc ở khoảng tiến 3,6 m. Dùng helper va chạm hiện có trong `bow-piercing.js` qua provider nạp trễ; không sửa module Cung. Vách sát người chặn các chém và lần phóng còn lại. Callback giữ lại sau lượt gọi hoặc sau hủy không thể cấp tiến trình.

Đổi map/vũ khí/avatar, mở UI khóa, chết, hủy hoặc pose bị ngắt đi qua lifecycle hiện có: xóa VFX/pose, trả grip, giữ cooldown. Bộ test có frame dài, không dựa vào setTimeout.

## Chất lượng và tích hợp

| Mức | Vệt / mỗi nhịp | Mẫu visual | Đoạn kiếm khí | Tia / contact | Mảnh vụn |
|---|---:|---:|---:|---:|---:|
| Low | 2 lớp | 90 Hz | 32 | 8 | 8 |
| Medium / High | 3 lớp | 180 Hz | 64 | 16 | 14 |

Logic hit và substep giống nhau ở ba mức. Chưa đo FPS/draw calls trên thiết bị thật.

- Effect: `SOURCE-CODE/js/vfx/sword-strike.js`, nạp trước `sword-skill-vfx.js`.
- Pose: `CHARACTERS/player-gltf.js`; controller: `SOURCE-CODE/js/weapons-village.js`.
- Icon: `ASSETS/ui/skills/sword/nhat-kiem-ice-white.png`; CSS: `SOURCE-CODE/css/sword-skill-icons.css`. Label, phím tắt và cooldown vẫn là DOM dễ đọc.
- Preview HTTP local: `SOURCE-CODE/nhat-kiem-preview.html`, thêm `?test` để bắt đầu tạm dừng.
- Gọi gameplay: trang bị Kiếm và dùng ô 1 / `VietVillageWeapons.cast(1)`.

Đọc `VALIDATION.md` để phân biệt phần đã kiểm tra với phần GPU/Alpha còn cần Claude chạy.
