# Chấn Địa cho Côn — tích hợp 17/10/2026

Gói `SKILL-THAM-CHIEU\Chan-Dia-Con.zip` (sha256 `aa0ff0e5…`, dựng trên `3ae6aae`) ghép vào nhánh `cap-nhat` sau Hộ Thân (`dd6c37c`, `eb88531`). Ảnh tham chiếu: [`chan-dia-reference.png`](chan-dia-reference.png). Thiết kế đầy đủ nằm trong gói (`THIET_KE_CHAN_DIA.md`).

## Ghép mã

`before/` của gói trùng đúng `3ae6aae`; cả bốn tệp gói sửa đều đã có thay đổi Hộ Thân nên được ghép ba chiều, không chép đè:

- `js/vfx/staff-skill-effects.js`, `js/vfx/staff-vfx-config.js`: ghép tự động; phần thay đổi trùng từng dòng với gói (cột khí sợi dọc, nứt lan từ tâm `uReveal`, tấm đá trồi `InstancedMesh` 16/28/40, đá văng/bụi lấy độ cao đất tại chỗ, vành sóng dùng chung hàm bán kính với vùng trúng, `slamHitWindow`/`testTarget`). Hộ Thân (phù văn, pháp trận, vỡ lá chắn) và Côn Quét giữ nguyên.
- `js/weapons-village.js`: thêm luật bận khi Chấn Địa đang tụ lực, `avatar-busy` cho Chấn Địa, và hủy chỉ handle Chấn Địa khi nhảy trước va chạm — đặt trước `guard.advance(dt)` của Hộ Thân.
- `js/app.js`: Chấn Địa (như Côn Quét) không cộng luyện bia lúc bấm, chỉ qua `onSkillHit`; `getState` giữ `uid`/`maxHp` của Hộ Thân và thêm `airborne`; `onSkillCancel` giữ `cancelSkillPose`.
- Mới: `tests/chan-dia.test.cjs` (thêm vào `test:vfx`), `chan-dia-con-preview.html`, `docs/chan-dia-reference.png`. Mã cache `20261017-chandia1`.

Thông số chiêu không đổi: `staff.chan-dia`, ô 3, 1,8 s, chạm đất 0,72 s, vùng trúng tới 1,5 s, hồi 3,6 s, bán kính 4,5 m.

## Điểm chạm của côn (đo trong game)

Đo đầu dưới côn (±1,4 trên trục côn, tỷ lệ thế giới 0,7) từng khung 17 ms trên GLB nam/nữ. Với đoạn gốc `slash` 1,45–3,25 s, đầu côn thấp nhất ở tuổi chiêu 0,80 s (nam) / 0,82 s (nữ) — trễ hơn mốc chạm 0,72 s. Đã dời đoạn thành **1,54–3,34 s** (vẫn 1,8 s; clip dài 6,58 s): khung thấp nhất nay ở 0,714 s (nam) / 0,731 s (nữ). Ở khung đó đầu côn còn cách đất 0,18 m (nam) / 0,28 m (nữ) do tư thế trong clip; tâm sóng là hình chiếu đầu côn xuống đất (lệch ngang ≤ 0,05 m). Không thêm mixer, không đổi clip.

## Vùng trúng và chiến đấu

Dự án chưa có HP/sát thương cho mục tiêu: HP chỉ có ở người chơi (`player-journey.takeDamage`, Hộ Thân hấp thụ). Bia tập `BIA_TAP_LANG_VIET_01` ghi `"damageEnabled": false`. Vì vậy `hit-window` (`kind: 'ground-wave'`) nối vào đường bia tập hiện có: `onSkillHit` → `VietVillageNPCs.onSkillUsed(event)` kiểm tra điều kiện rồi gọi `testTarget(id, chân bia, .25)` đồng bộ; mỗi bia một lần mỗi chiêu. Không thêm sát thương, choáng, hất tung hay mana.

## Kiểm thử

- `node --test tests/chan-dia.test.cjs tests/staff-skill-effects.test.cjs tests/weapons-village.test.cjs`: 38/38. `npm run test:vfx` 80/80; `player-journey/avatar/gltf` 52/52; `npm test` 442/442; `test:learning` 62/62; `build:hosting` 377 tệp (trang thử và PNG không lên Hosting) / `test:hosting` 12/12; Python 38/38.
- Game thật (trang UID giả `tests/ui-check`, Chrome headless GPU thật ANGLE D3D11 RTX 3090, khung thủ công 17 ms), nam và nữ: tụ lực 0,45 s, chạm đất ~0,72 s, sóng 1,10 s, tàn 1,65 s; bia trong tầm (2,1 m) trúng một lần ở 0,92 s, bia 7 m không trúng; low/medium/high cùng tâm và kết quả; đất phẳng, dốc cầu (tâm y 1,23), bậc đình, sát tường nhà; spam khi tụ lực → `busy`; nhảy khi tụ lực hủy Chấn Địa, giữ hồi chiêu và giữ lá chắn Hộ Thân; đổi vũ khí giữa sóng không còn trúng muộn; menu, mất focus, đổi MAP, đăng xuất dọn sạch; 6 lần ra chiêu không tăng geometry/texture/program; console chỉ có cảnh báo deprecation sẵn có của `three.min.js`.
- Trang thử (`XEM_CHAN_DIA` của gói, cổng 8770): nam/nữ, 3/3 bia trúng khi hết chiêu (tâm sóng theo đầu côn, nên bia xa cũng nằm trong tầm ở tư thế này), camera điện ảnh chỉ ở trang thử.

## Còn hạn chế

- Đầu côn chưa chạm hẳn đất (0,18–0,28 m) — cần clip/pose mới nếu muốn sát đất tuyệt đối.
- Bộ lấy độ cao một lớp: cạnh cầu, đá trồi/sóng tràn xuống mặt ao; sát tường, sóng bị tường cắt (không xuyên mái). NPC đứng trong sóng không bị ảnh hưởng (không có HP).
- Tấm đá trồi khá to; ở góc camera gần chúng chiếm nhiều tiền cảnh — cần duyệt mỹ thuật.
- Chưa đo FPS, chưa thử điện thoại/GPU di động thật, chưa thử đăng nhập Google thật.
