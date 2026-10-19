# Kiếm Hoa — hệ Kiếm

## Nguồn và đối chiếu

- Ảnh người dùng `image(20261019-134837).png`, giữ nguyên trong `SOURCE-CODE/docs/kiem-hoa-reference.png`.
- Mã gốc: `thanhmade/viet-village-3d`, nhánh `cap-nhat`, commit `e963df859fb9341e1e21de249a1bc4acc1a13a32`.
- Engine kiểm tra trực tiếp: Three.js r160, `WeaponVFXCore`, controller vũ khí và hai GLB người chơi hiện hành.
- Quan sát từ ảnh: cánh kiếm khí nhọn xanh trắng có độ trong, các đường quét cong quanh người, ánh vàng mảnh, cánh nhỏ bay; dãy tư thế cao–ngang–thấp và hoa nhìn từ trên.
- Ảnh tĩnh không cho biết thời gian, sát thương, số vòng hoặc tên animation. Ba vòng, sáu cánh chính và timeline dưới đây là thiết kế triển khai, không phải số liệu đo từ ảnh. Chữ “giáo” trong caption không thay yêu cầu dùng Kiếm của người dùng.

## Nhịp động tác đã triển khai

| Thời gian | Nhân vật và kiếm | Kỹ xảo |
|---|---|---|
| 0–0,55 s | Hạ trọng tâm, vào tấn, dẫn kiếm, tay trái giữ thế | Dòng khí mảnh chuẩn bị |
| 0,55–1,12 s | Xoay trọn vòng thứ nhất, chém cao | Dải sáng bám lưỡi, hai cánh đầu mở |
| 1,12–1,69 s | Xoay vòng thứ hai, chém ngang | Hai cánh tiếp theo, điểm vàng nối dòng |
| 1,69–2,25 s | Xoay vòng thứ ba, đường kiếm hạ thấp | Sáu cánh đủ hình; mảnh kiếm khí bay |
| 2,25–2,65 s | Dừng ở thế kiếm, giữ tấn | Hoa nở rộ; vòng kiếm khí lan tới 3,8 m |
| 2,65–3,30 s | Thu kiếm, trả về tư thế thường | Rút năng lượng và tan cánh |
| 3,30–3,60 s | Được điều khiển trở lại | Dư quang cuối tan hết |

Tổng hiệu ứng **3,6 giây**, pose **3,3 giây**. Ba vòng quay có nhịp chậm–nhanh–chậm ở mỗi đường chém. Chân đổi trụ theo các bước nhấc ngắn; hông, ngực, tay và kiếm cùng xoay. Root gameplay, collider và hướng camera không quay theo nhóm hình ảnh. Không lấy clip `slash` chậm của GLB để giả chuyển động này.

Giữ ID `sword.kiem-hoa`, slot 2/phím 2, cooldown 3 s, range/radius 3,8 m. Cooldown chạy từ lúc cast thành công; khi cooldown đã hết mà pose còn bận, controller vẫn khóa phát chiêu tới 3,3 s. Không thêm tài nguyên, sát thương số, knockback hoặc khóa học tập mới.

## Tích hợp

`SwordFlower.sample(t)` dùng chung giữa pose giải IK trên xương gốc và đường kiếm cho va chạm/VFX. `startSwordStrike(skillId)` vẫn mặc định Nhất Kiếm để tương thích; Kiếm Hoa chọn timeline riêng. Tay giữ đúng `gripPoint` của mô hình kiếm ở scale 0,7. Hai GLB nam/nữ được hiệu chỉnh theo xương thật; không tạo model hoặc bone giả. Trong lúc chém, clip `idle` được giữ ở thời điểm bắt đầu chiêu (sau blend walk→idle) để gốc IK của chân không chạy theo bước dịch chân của clip; hết chiêu clip chạy tiếp.

VFX gồm ribbon ba lớp ở mỗi đường chém, sáu mặt cánh cong có UV/noise, sợi vàng, các dòng khí xoắn, vòng nở và cánh nhỏ bằng InstancedMesh. Shader instancing áp dụng ma trận từng cánh. Các dải bám điểm đầu/cuối lưỡi; không dùng video phẳng hoặc torus làm chiêu.

Game dùng renderer và vòng lặp hiện hữu. `WeaponVFXCore.update(dt)` quản lý vòng đời; không tạo RAF, renderer, damage manager hoặc listener input thứ hai trong game. Trang `kiem-hoa-preview.html` là sân xem thử độc lập.

## Đòn trúng và hủy

- Chém gần kiểm tra lưỡi kiếm; hoa nở mở kiểm tra hướng ra ngoài trên phạm vi hiện có. Substep cố định 1/180 s tránh bỏ sót khi frame trễ.
- `target-query.testTarget` chỉ thu ứng viên, luôn trả false. `hit-window` xác nhận từng mục tiêu; host hiện tại chỉ ghi nhận luyện bia. VFX không sửa HP hay phần thưởng.
- Mỗi cast/mục tiêu chỉ xác nhận một lần, kể cả trúng cả kiếm và hoa. `hitIndex` giữ 0; không nhân sát thương theo sáu cánh hay ba vòng.
- Vách chắn được kiểm tra trước mục tiêu. Mục tiêu ngoài tầm/khác tầng bị loại. Cánh trang trí thu ngắn theo vách.
- Chớp và rung nhẹ chỉ sinh khi có contact; sân trống vẫn có hoa và đường kiếm nhưng không có giả va chạm.
- Chuyển vũ khí, MAP, khóa game, mất focus, đổi avatar, hủy pose/chết đi qua cleanup của controller. Marker có cả ID để tránh nối nhầm chiêu. Hủy giữ cooldown và chặn các hit tương lai.
- Tài nguyên geometry/material được đăng ký cho core dispose; không rò InstancedMesh. Low giảm phân đoạn, số dải và mảnh, giữ nguyên hit/timeline.

## Icon

`ASSETS/ui/skills/sword/kiem-hoa-ice-gold.png` là icon raster tạo riêng bằng imagegen, kiếm thẳng giữa sáu cánh xanh trắng, viền vàng, nền tối, không chữ. CSS chọn `[data-skill-id="sword.kiem-hoa"]`; tên, phím và cooldown vẫn là DOM có thể đọc. Dùng cùng icon ở trang preview. Prompt lưu tại `ICON-PROMPT.md`.

## Âm thanh và camera

Game hiện chỉ nhận `impact.shake`; bản này nối rung rất nhẹ 0,012 tại contact, không cưỡng ép góc camera. Chưa thêm sound bank cho game. Checkbox âm thanh ở preview là tiếng thử tổng hợp sẵn của sân kiểm tra, không đại diện âm thanh sản xuất. Video xuất từ canvas Three.js thật, không phải video AI; tốc độ phát chậm trong đoạn đối chiếu được ghi rõ.

Xem `VALIDATION.md` để phân biệt phần đã chạy với kiểm tra GPU/Alpha còn phải thực hiện trên máy Claude.
