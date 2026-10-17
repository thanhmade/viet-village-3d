# Côn Quét cầm đầu côn — tích hợp 17/10/2026

Gói `SKILL-THAM-CHIEU\Con-Quet-Cam-Dau-Con.zip` (sha256 `0ba84db0…`, dựng trên `3ae6aae`) ghép sau Hộ Thân và Chấn Địa. Ảnh tham chiếu: [`con-quet-end-grip-reference.png`](con-quet-end-grip-reference.png). Thiết kế đầy đủ trong gói (`THIET_KE_CON_QUET.md`).

## Thay đổi

- Hai tay giữ gần cùng một đầu côn: tay phải x = +1,08, tay trái +0,62 trên côn (dài 2,8, scale 0,7); đầu quét x = −1,4 (`weapons-village-models.js`: `sweepTip` riêng; `tip` thường giữ cho Hộ Thân/Chấn Địa).
- `CHARACTERS/player-gltf.js`: IK hai đoạn cho tay và chân (giữ độ dài xương), hạ hông 7,5 cm, `bodyYaw` xoay nhóm hiển thị `player-facing-pose` theo cung ~160°, chân chuyển trụ luân phiên, chống xuyên đất bằng điểm đế chân; khôi phục pose/grip khi xong hoặc hủy. Collider và camera không xoay theo.
- `staff-sweep.js`: đường góc của cung dùng chung cho GLB và vùng trúng, cắt theo khoảng active (khung chậm không bỏ sót); `testTarget` chỉ nhận trong callback đồng bộ, bỏ ID rỗng, số không hợp lệ, caster, mục tiêu đã trúng; xung camera 0,035 qua `cameraShake.sweep`.
- `weapons-village.js`: `syncSweepGrip` trượt điểm cầm chỉ khi Côn Quét chạy, trả lại sau khi xong/hủy (giữ hủy-khi-nhảy của Chấn Địa và `guard.advance` của Hộ Thân).
- `staff-vfx-config.js` / `staff-skill-effects.js`: một dải khí trên đầu dài (+0,40 → −1,42), bỏ dải đối xứng ở đầu ngắn; filament 0,72; ngưỡng dịch chuyển tính từ điểm cầm mới.
- Thông số giữ nguyên: `staff.con-quet`, ô 1/J, 1,8 s, hồi 2,4 s, sweepRadius 2,1 m, wave 3,2 m. Không thêm sát thương; vùng trúng nối bia tập (dự án chưa có HP mục tiêu).
- Ghép ba chiều 5 tệp đã có Hộ Thân/Chấn Địa (khớp từng dòng với gói), lấy nguyên 3 tệp chưa đổi, chèn 3 dòng vào `weapons-village-models.js` (giữ kiểu xuống dòng). `staff-end-grip.test.cjs` đọc đoạn Hộ Thân/Chấn Địa từ cấu hình hiện hành và nạp `staff-guard.js`; đã thêm vào `test:vfx`. Mã cache `20261017-conquet2`.

## Kiểm thử

- Lệnh của gói (`player-gltf`, `staff-end-grip`, `staff-sweep`, `staff-skill-effects`, `weapons-village`): 60/60; Chấn Địa + Hộ Thân + avatar + journey 42/42; `test:vfx` 84/84; `npm test` 446/446; `test:learning` 62/62; `build:hosting` 377 tệp / `test:hosting` 12/12; Python 38/38.
- Game thật (UID giả, Chrome GPU thật ANGLE D3D11, khung 17 ms), nam và nữ: trong 0,15–1,45 s hai lòng bàn tay cách điểm cầm < 1 mm, đầu quét cách tay phải 1,736 m, thân xoay 2,795 rad, xương chân thấp nhất cao hơn đất 4–6 cm, collider không trôi; một dải khí + một lớp sáng; bia trước trúng ở 0,51 s (cung), bia sau lưng ở 1,12 s (sóng), bia 5 m không trúng; low/medium/high; dốc cầu, bậc đình, sát tường; điện thoại 844×390 chạm nút; spam → `busy`; menu, đổi vũ khí, đổi MAP, đăng xuất giữa chiêu hủy sạch, trả thân/grip; sau Côn Quét, Hộ Thân và Chấn Địa dùng grip thường (đầu côn Chấn Địa vẫn thấp nhất 0,181 m); 30 lần ra chiêu không tăng geometry/texture/program; console chỉ có cảnh báo deprecation sẵn có.
- Trang thử `con-quet-cam-dau-preview.html` (XEM_CON_QUET, cổng 8771): nam/nữ, 2/3 bia trúng (bia xa ngoài tầm).

## Còn hạn chế

- Sóng đất giữ mặt phẳng theo điểm nền nhân vật, chưa bám từng bậc/dốc.
- Chưa đo FPS, chưa thử điện thoại/GPU di động thật.
