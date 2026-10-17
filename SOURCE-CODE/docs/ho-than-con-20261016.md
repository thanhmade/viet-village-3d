# Hộ Thân cho Côn — tích hợp 16/10/2026

Tham chiếu: ảnh Hộ Thân người dùng cung cấp; cầu khí ngọc trong, vòng vàng nghiêng, phù văn dọc và vòng trận mặt đất. Dùng nhân vật/Côn/animation có sẵn; không đổi trang phục theo người trong ảnh.

`staff.ho-than` giữ ô 2, VFX 3 s, hồi 5 s, active 0.25 ≤ tuổi chiêu < 2.65 s. Động tác `cast_a_spell` 1.95 → 2.65 s dài 0.7 s, rồi trở lại locomotion. Côn Quét và Chấn Địa giữ thông số.

`guard.maxHpRatio: 0.30` là lựa chọn cân bằng thử nghiệm mới. Với maxHp 100, dung lượng ban đầu 30. Chưa có chi phí mana. Không đọc dung lượng từ cường độ shader hay kích thước cầu.

## Luồng

1. `weapons-village.cast(2)` thành công mới tạo state từ `createStaffGuard`; cùng handle với core VFX, gắn UID và maxHp hiện tại.
2. `weapons-village.update(dt)` tiến đồng hồ combat và VFX trong vòng lặp sẵn có. Không tạo RAF/timer mới trong game.
3. `player-journey.takeDamage` gọi `mitigateDamage`; ứng dụng chuyển sang `weapons.absorbDamage`. Combat trừ dung lượng, trả sát thương dư cho HP.
4. Adapter đưa sự kiện hấp thụ có vị trí sang `core.hitShield`. Cạn dung lượng gọi `core.endShield(handle, 'depleted')`. VFX không quyết định lượng sát thương.
5. Hủy ở adapter xóa guard và VFX; `cancelSkillPose` chỉ hủy động tác kỹ năng đang thuộc avatar đó, giữ phản ứng bị đánh/defeat khác.

`createStaffGuard()` là state cục bộ thuần JS, không phụ thuộc Three.js. API: `start(skill,{maxHp,ownerId,handle})`, `advance(dt)`, `absorb(amount,ownerId)`, `cancel()`, snapshot `state`. `absorb` trả `{damage,absorbed,broken,handle}`. Hết hạn không hồi HP, không tick sát thương. UID khác không được hưởng bảo vệ.

Hook `mitigateDamage({amount,source,uid})` phải trả số hữu hạn 0…amount; kết quả không hợp lệ hoặc ngoại lệ sẽ giữ sát thương gốc. `onDamage` giữ hợp đồng cũ và chỉ gọi khi HP bị trừ. Dữ liệu tutorial, Firebase, EXP và phân quyền không thay đổi.

## Hiệu ứng

Hai mặt cầu shader Fresnel, ba vòng khí nghiêng, ba đại vòng phù văn tạo các dải kinh tuyến, pháp trận đồng tâm, motes dùng pool và tối đa bốn gợn va chạm đồng thời. Màu vòng nghiêng thiên vàng, phần giữa cầu giữ trong. Ký hiệu là nét hình học trang trí, không tự nhận là chữ/phù chú có nghĩa.

Viền cầu căn theo thân đang di chuyển/nhảy; pháp trận căn theo mặt đất và pháp tuyến tại chân. Hết hạn dùng noise dissolve; cạn dung lượng thêm lóe ngắn, giãn cầu và hạt tán. Không bloom hậu kỳ, không khóa camera game, không thêm texture tải ngoài, không tự tạo âm thanh. Camera orbit chỉ có trong trang preview.

Tài nguyên dùng lại theo manager; vật liệu từng lần cast được giải phóng khi kết thúc/hủy. Bật/tắt mức chất lượng giữ cơ chế hiện có. Trang `SOURCE-CODE/ho-than-con-preview.html` là sân thử độc lập dùng cùng core/config/guard/model; không phải bằng chứng đã chạy WebGL thành công.

## Kiểm tra

```sh
npm run test:vfx
node --test SOURCE-CODE/tests/player-journey.test.cjs SOURCE-CODE/tests/player-avatar.test.cjs SOURCE-CODE/tests/player-gltf.test.cjs
```

Đã kiểm tra absorption/overflow/expiry, UID, cooldown/spam, hủy khi đổi đồ/MAP/chết; 15/30/60/144 Hz cho guard; shared-resource cleanup; animation và socket trên GLB nam/nữ thật (Node thay bitmap decoder). WebGL/GPU, FPS, độ trong và pháp trận qua các bậc/cầu vẫn cần kiểm tra trên máy: trình duyệt tại môi trường thực hiện bị chặn socket, không được cấp quyền bổ sung. Chưa phát hành lên game chạy thật hoặc thêm cơ chế combat máy chủ/PvP/đồng bộ remote shield.

## Ghép vào cap-nhat 3ae6aae (17/10/2026)

Gói `Ho-Than-Con.zip` (sha256 `4269e94c…`) dựng trên `d1e2654`; nhánh đã có thêm Côn Quét theo đặc tả (`3ae6aae`). Không chạy `AP_DUNG_HO_THAN.cjs`: 15 tệp đích còn đúng bản nền nên lấy bản của gói, 4 tệp trùng với Côn Quét (`index.html`, `staff-vfx-config.js`, `staff-skill-effects.js`, `staff-skill-effects.test.cjs`) được ghép ba chiều — thay đổi so với bản hiện tại trùng khớp từng dòng với thay đổi của gói, giữ nguyên khối `sweep` của Côn Quét. Mã cache chung `20261017-hothan1`. Thông số Hộ Thân không khác gói: ô 2, VFX 3 s, bảo vệ 0,25 → 2,65 s, hồi 5 s, động tác 0,7 s, `guard.maxHpRatio` 0,30.

Thêm ngoài gói: `ENVIRONMENT/weather-lighting.js` không còn gọi `renderer.compileAsync`. Trên GPU có `KHR_parallel_shader_compile`, three r160 ném `TypeError … isReady` trong timer của chính nó và không bao giờ trả promise khi một vật liệu bị giải phóng lúc đang dò (hiệu ứng chiêu hết/vỡ/bị hủy đúng lúc làm nóng ánh sáng) — lỗi lộ ra khi thử Hộ Thân, làm treo việc biên dịch trước ánh sáng cả phiên. `compileClimateLightSet` dò bằng `renderer.compile` + `renderer.properties` và bỏ vật liệu không còn program; thêm ca kiểm thử trong `environment-performance.test.cjs`.

Kiểm thử: `npm run test:vfx` 70/70; `player-journey/avatar/gltf` 52/52; `npm test` 432/432; learning 62/62; hosting 12/12 (377 tệp, trang preview không lên Hosting); Python 38/38. Trình duyệt: Chrome headless trên GPU thật (ANGLE D3D11, NVIDIA RTX 3090), trang UID giả `tests/ui-check`, khung hình thủ công 17 ms — nam và nữ: tụ khí, bảo vệ 30, đòn 12 không trừ HP (còn 18), đòn 40 vỡ và chỉ trừ 10, hết hạn ở 2,65 s, chạy (`locomotion:run`) sau 0,7 s, cầu bám thân khi nhảy, spam/hồi chiêu, đổi vũ khí, chuyển MAP, chết, đăng xuất, mức đồ họa thấp, điện thoại 844×390 chạm nút; trang preview nam/nữ và camera giới thiệu. Chưa: điện thoại/GPU di động thật, đo FPS, đăng nhập Google thật, nguồn sát thương thật trong game (hiện chỉ có `takeDamage` từ mã).
