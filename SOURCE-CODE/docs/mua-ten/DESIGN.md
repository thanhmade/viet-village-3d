# Mưa Tên · Cung · Làng Việt 3D

Chiêu `bow.mua-ten`, ô 3, được tích hợp trên nền `271ecfe560f7be2f5d60d4c598fbff9b489c6e30` của `thanhmade/viet-village-3d`, nhánh `cap-nhat`.

## Từ ảnh đến chuyển động

Ảnh người dùng nằm ở `SOURCE-CODE/docs/mua-ten-reference.png`. Quan sát trực tiếp: nhân vật giương cung lên trời; vòng khí vàng–xanh ở trên; nhiều tên sáng giáng xuống vòng trận vàng trên mặt đất; điểm chạm có tia sáng, bụi và mảnh vụn. Bốn ô gợi tiến trình tư thế → gọi mưa tên → tên giáng xuống → bao phủ trận địa.

Ảnh tĩnh không xác định thời gian, số hit hay sát thương. Nhịp **4,8 giây**, góc cung **55°**, động tác kéo–nhả, cách phân bố và gia tốc rơi là thiết kế mới để chuyển ảnh thành gameplay. Giữ 12 tên của hiệu ứng cũ, hồi chiêu 5 s, tầm chọn tâm 10 m, bán kính vùng 3,8 m, tâm mặc định trước mặt 7 m. Không suy ra damage/mana từ hình.

## Nhịp chiêu

| Thời gian | Động tác và hình ảnh |
|---|---|
| 0–0,48 s | Nâng cung, tay kéo vào dây; vòng báo vùng hiện dần |
| 0,25–0,85 s | Tụ lực ở đầu tên thật, kéo dây đến 0,42 đơn vị |
| 0,85 s | Nhả một tên gọi phép theo hướng cung 55° lên trời |
| 0,85–1,45 s | Tên gọi phép đến vòng khí; vòng xoáy xanh phía trên trận mở dần |
| 1,60–3,14 s | Thả 12 tên cách nhau 0,14 s, từ cao 8,2 m; mỗi tên rơi tăng tốc trong 0,86 s |
| 2,46–4,00 s | Các mũi tên chạm mặt đất phẳng; bia hoặc mái che có thể bị chạm sớm hơn |
| 1,12–1,80 s | Hạ cung và trả nhân vật về điều khiển, vùng mưa vẫn đứng yên |
| 4,05–4,80 s | Vòng trận và dư quang tan; dọn tài nguyên |

Vòng trận chỉ báo vùng. Mười hai hit không phải sát thương tự động lên mọi đối tượng trong vòng. Tên đầu rơi ở tâm; 11 tên tiếp theo phân bố trong vùng theo góc vàng. Thời điểm phóng và tiếp xúc dùng đồng hồ của game, xử lý cả frame vượt nhiều mốc.

## Võ hiệp và kỹ thuật hình ảnh

- Vàng ấm cho tên và trận pháp; xanh lam cho khí xoắn, phân biệt rõ vật thể chính/phụ.
- Tụ sáng bám `bow.tip`, tên gọi phép nối từ đầu cung thật; vòng gọi phép ở trên người và xoáy khí phía trên vùng chọn.
- Đầu tên, thân tên, vệt kéo dài và khí xoắn là hình học 3D. Các lớp vệt chéo giữ khả năng nhìn từ nhiều góc.
- Tiếp xúc thật tạo sao sáng, hạt tia, bụi nâu nhẹ và vòng xung. Tên bị bia chặn có sao sáng, không tạo bụi đất.
- Cường độ rung nhỏ tại tiếp xúc; không thay camera gameplay bằng camera cắt cảnh. Preview có góc toàn cảnh và bên hông riêng.
- Icon mới: `ASSETS/ui/skills/bow/mua-ten-gold-blue.png`, nối vào ô 3 bằng CSS. Năm tên hướng xuống trong icon là ký hiệu UI; runtime vẫn có 12 tên. Chữ/tên phím/hồi chiêu vẫn là DOM.

## Nhân vật và vũ khí

Hai GLB nam/nữ thật dùng bộ xương sẵn có. IK hai xương giữ chiều dài xương; tay phải cầm cung, tay trái bám nock theo quy ước của hệ Cung hiện tại. Cung nghiêng lên; nock/đầu tên được đo trên model vũ khí gắn vào socket thật. Không có root motion, không di chuyển collider. Khóa di chuyển trong 1,8 s động tác; sau đó người chơi có thể rời vùng đã chọn.

Không thêm renderer, vòng requestAnimationFrame hoặc thư viện Three thứ hai vào game. `bow-rain.js` đăng ký với `WeaponVFXCore` và dùng `update(dt)` hiện có. Preview độc lập mới có renderer riêng.

## Va chạm và quyền quyết định của game

Tên gọi phép được kiểm tra từ bàn tay qua đầu tên đến vòng gọi phép: trần thấp chặn nó thì không mở mưa tên; hồi chiêu vẫn giữ. Mỗi tên rơi quét cả đoạn di chuyển với capsule mục tiêu; chọn tiếp xúc gần nhất, không phụ thuộc thứ tự liệt kê. Đầu tên dừng chính xác ở mặt địa hình hoặc AABB mái/tường trước đó. Biên vật cản hiện có của nhà/đình/cây đa tiếp tục được dùng.

`target-query` chỉ thu ứng viên, luôn trả false. `hit-window` mới cho phép host xác nhận một mục tiêu của từng tên. `handle + hitIndex` xác định nhịp; callback giữ lại sau sự kiện/hủy không còn hiệu lực. Vòng báo, tên gọi phép, bụi và tia không cấp tiến trình. Host hiện tại chỉ có tương tác luyện bia; không thêm sát thương NPC hòa bình, HP mới hay phần thưởng tự động.

Đổi vũ khí, suspend, chuyển map, hủy hoặc ngắt pose dùng vòng đời cũ; dừng mưa còn lại, trả pose, giải phóng geometry/material/buffer instance đúng một lần; giữ cooldown đã tiêu. Low/Medium/High giữ nguyên 12 tên và va chạm, chỉ giảm chi tiết xoáy/bụi/hạt.

## Cấu trúc và mở thử

| Mục đích | Đường dẫn từ gốc repo |
|---|---|
| Effect, timeline, quét va chạm | `SOURCE-CODE/js/vfx/bow-rain.js` |
| Cấu hình chiêu | `SOURCE-CODE/js/vfx/bow-skill-config.js` |
| Điều khiển/pose/socket | `SOURCE-CODE/js/weapons-village.js`, `SOURCE-CODE/js/player-avatar.js`, `CHARACTERS/player-gltf.js` |
| Icon và CSS | `ASSETS/ui/skills/bow/mua-ten-gold-blue.png`, `SOURCE-CODE/css/bow-skill-icons.css` |
| Preview có nhân vật thật | `SOURCE-CODE/mua-ten-cung-preview.html` |
| Hướng dẫn Claude | `SOURCE-CODE/docs/mua-ten/PROMPT-CLAUDE.md` |

Chạy HTTP từ gốc repo rồi mở preview; `?test` bắt đầu ở trạng thái tạm dừng để chụp mốc bằng nút +0,05 s. Có nam/nữ, ba mức chất lượng, sân trống, bia trong trận, mái che, trần thấp và bia ngoài trận. `window.muaTenPreview` cung cấp `cast`, `step`, `reset`, `events`, `visual`, `model`, `vfx` cho kiểm tra browser. Preview/ảnh tài liệu chỉ dùng local; build công khai chỉ lấy phụ thuộc gameplay.

Chi tiết kiểm chứng và giới hạn nằm trong `VALIDATION.md`. Chưa có ảnh GPU hay số FPS đo thực tế. Không coi icon tạo sinh hoặc test Node là ảnh chụp runtime.
